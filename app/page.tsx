'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { compressImage, validateImageFile } from '@/lib/imageUtils'
import { createStreamingRecord, updateRecord, getHistory, deleteRecord } from '@/lib/storage'
import { streamStart, streamUpdate, streamDone, streamError, streamReset } from '@/lib/streamingStore'
import type { Dish, HistoryRecord } from '@/lib/types'

type Stage = 'idle' | 'compressing' | 'recognizing' | 'done' | 'error'

const LOADING_STAGES = [
  { emoji: '👨‍🍳', text: '正在识别图片文字...' },
  { emoji: '📖', text: 'AI正在翻译菜单...' },
  { emoji: '🍽️', text: '马上就好，请稍候...' },
]

function formatDate(isoString: string): string {
  const d = new Date(isoString)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hour}:${min}`
}

// ── SVG Tab Icons ────────────────────────────────────────────
function IconHome({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"
        fill={active ? 'var(--orange)' : 'none'}
        stroke={active ? 'var(--orange)' : 'rgba(60,60,67,0.40)'}
        strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9 21V12h6v9" stroke={active ? 'rgba(255,255,255,0.9)' : 'rgba(60,60,67,0.40)'}
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconHistory({ active }: { active: boolean }) {
  const c = active ? 'var(--orange)' : 'rgba(60,60,67,0.40)'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.5" />
      <path d="M12 7v5l3.5 2" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function HomePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [statusMsg, setStatusMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [showManual, setShowManual] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const [loadingStage, setLoadingStage] = useState(0)
  const [kbHeight, setKbHeight] = useState(0)
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setHistory(getHistory().slice(0, 5))
  }, [])

  useEffect(() => {
    if (stage === 'recognizing') {
      setLoadingStage(0)
      loadingTimerRef.current = setTimeout(() => setLoadingStage(1), 4000)
      const t2 = setTimeout(() => setLoadingStage(2), 12000)
      return () => {
        if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current)
        clearTimeout(t2)
      }
    } else {
      setLoadingStage(0)
    }
  }, [stage])

  // 监听键盘高度，让 sheet 随键盘上移
  useEffect(() => {
    if (!showManual) { setKbHeight(0); return }

    // sheet 动画结束后再 focus，避免键盘与动画抢位
    const focusTimer = setTimeout(() => textareaRef.current?.focus(), 320)

    const onResize = () => {
      const vv = window.visualViewport
      if (!vv) return
      setKbHeight(Math.max(0, window.innerHeight - vv.height - vv.offsetTop))
    }
    window.visualViewport?.addEventListener('resize', onResize)
    window.visualViewport?.addEventListener('scroll', onResize)
    return () => {
      clearTimeout(focusTimer)
      window.visualViewport?.removeEventListener('resize', onResize)
      window.visualViewport?.removeEventListener('scroll', onResize)
      setKbHeight(0)
    }
  }, [showManual])

  const processImage = useCallback(async (file: File) => {
    const validationError = validateImageFile(file)
    if (validationError) { setErrorMsg(validationError); setStage('error'); return }

    setStage('compressing')
    setStatusMsg('正在压缩图片...')
    setErrorMsg('')

    let base64 = '', thumbnail = ''
    try {
      const result = await compressImage(file)
      base64 = result.base64
      thumbnail = result.thumbnail
    } catch {
      setErrorMsg('图片处理失败，请重试'); setStage('error'); return
    }

    setStage('recognizing')
    await recognize(base64, [], thumbnail)
  }, [])

  const recognize = async (imageBase64: string, dishNames: string[], thumbnail?: string) => {
    setStage('recognizing')
    streamReset()

    const recordId = Date.now().toString()
    let navigated = false

    try {
      const res = await fetch('/api/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, dishNames }),
      })
      if (!res.ok || !res.body) throw new Error('网络请求失败')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = '', finalDishes: Dish[] = [], menuTooLong = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        let eventType = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) { eventType = line.slice(7).trim() }
          else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (eventType === 'status') {
                setStatusMsg(data.message || '')
              } else if (eventType === 'partial') {
                const dishes: Dish[] = data.dishes || []
                const hasComplete = dishes.some(
                  (d) => d.detail?.description || d.detail?.flavor || d.detail?.recommendation
                )
                if (hasComplete) {
                  if (!navigated) {
                    navigated = true
                    createStreamingRecord(recordId, thumbnail)
                    streamStart(recordId, dishes)
                    updateRecord(recordId, { dishes, dishCount: dishes.length })
                    setStage('done')
                    router.push(`/menu/${recordId}`)
                  } else {
                    streamUpdate(dishes)
                    updateRecord(recordId, { dishes, dishCount: dishes.length })
                  }
                }
              } else if (eventType === 'done') {
                finalDishes = data.dishes || []
                menuTooLong = !!data.menuTooLong
              } else if (eventType === 'error') {
                throw new Error(data.message || '识别失败')
              }
            } catch (e) { if (eventType === 'error') throw e }
            eventType = ''
          }
        }
      }

      if (finalDishes.length === 0 && !navigated) {
        throw new Error('未识别到有效菜品，请重试')
      }

      if (finalDishes.length > 0) {
        updateRecord(recordId, { dishes: finalDishes, dishCount: finalDishes.length, menuTooLong })
        streamDone(finalDishes)
      }

      if (!navigated) {
        createStreamingRecord(recordId, thumbnail)
        updateRecord(recordId, { dishes: finalDishes, dishCount: finalDishes.length, menuTooLong })
        streamDone(finalDishes)
        setStage('done')
        router.push(`/menu/${recordId}`)
      }

      setHistory(getHistory().slice(0, 5))
    } catch (e) {
      const err = e as Error
      if (navigated) {
        streamError(err.message || '识别失败，请重试')
      } else {
        setErrorMsg(err.message || '识别失败，请重试')
        setStage('error')
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processImage(file)
    e.target.value = ''
  }

  const handleManualSubmit = async () => {
    const names = manualInput.split(/[,，;；、\n]+/).map(s => s.trim()).filter(Boolean)
    if (names.length === 0) return
    setShowManual(false)
    setManualInput('')
    await recognize('', names)
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteRecord(id)
    setHistory(getHistory().slice(0, 5))
  }

  const isLoading = stage === 'compressing' || stage === 'recognizing'
  const currentStage = LOADING_STAGES[loadingStage]

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#F2F2F7' }}>

      {/* Subtle ambient gradient — top only */}
      <div className="fixed top-0 left-0 right-0 h-96 pointer-events-none z-0"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,107,0,0.08) 0%, transparent 100%)' }} />

      {/* Main scroll area */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="px-5 pt-safe pb-4">

          {/* ── Header: Logo + Brand ── */}
          <div className="flex items-center gap-3 mb-1 animate-[fadeUp_0.4s_var(--spring-soft)_forwards]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.jpg" alt="洋菜单"
              className="w-12 h-12 rounded-[14px] object-cover flex-shrink-0"
              style={{ boxShadow: '0 2px 12px rgba(255,107,0,0.20), 0 1px 3px rgba(0,0,0,0.08)' }}
            />
            <div>
              <h1 className="text-[22px] font-black tracking-tight leading-none"
                style={{ color: 'var(--orange)' }}>
                洋菜单
              </h1>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--label-secondary)' }}>
                AI 驱动的菜单翻译助手
              </p>
            </div>
          </div>

          {!isLoading && (
            <>
              {/* ── AI Orb ── */}
              <div className="flex flex-col items-center mt-8 mb-7">

                {/* Ambient glow behind orb */}
                <div className="relative flex items-center justify-center mb-5
                  animate-[scaleIn_0.5s_var(--spring)_0.05s_forwards] opacity-0">
                  {/* Outer soft glow ring */}
                  <div className="absolute w-[188px] h-[188px] rounded-full animate-[orbGlow_4s_ease-in-out_infinite]"
                    style={{ background: 'radial-gradient(circle, rgba(255,107,0,0.14) 0%, transparent 70%)' }} />

                  {/* Glass shell */}
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="pressable-lg relative w-[160px] h-[160px] rounded-full flex items-center justify-center"
                    style={{
                      background: 'rgba(255,255,255,0.72)',
                      backdropFilter: 'blur(28px) saturate(200%)',
                      WebkitBackdropFilter: 'blur(28px) saturate(200%)',
                      border: '0.5px solid rgba(255,255,255,0.70)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.90)',
                      transition: 'transform 0.14s var(--spring-soft), box-shadow 0.14s ease',
                    }}
                  >
                    {/* Orange core */}
                    <div className="w-[124px] h-[124px] rounded-full flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(150deg, #FF9A3C 0%, #FF6B00 55%, #E55A00 100%)',
                        boxShadow: '0 6px 24px rgba(255,107,0,0.50), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -4px 12px rgba(0,0,0,0.10)',
                      }}>
                      <svg className="w-[52px] h-[52px] text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" strokeWidth={1.35}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                      </svg>
                    </div>

                    {/* Glass highlight arc */}
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-8 rounded-full pointer-events-none"
                      style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, transparent 100%)' }} />
                  </button>
                </div>

                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

                {/* Label */}
                <p className="text-[20px] font-bold tracking-tight text-gray-900 mb-1.5
                  animate-[fadeUp_0.45s_var(--spring-soft)_0.12s_forwards] opacity-0">
                  拍照识菜
                </p>
                <p className="text-[13px] text-center mb-5 animate-[fadeUp_0.45s_var(--spring-soft)_0.16s_forwards] opacity-0"
                  style={{ color: 'var(--label-secondary)' }}>
                  长菜单建议分页拍摄，识别更精准
                </p>

                {/* Secondary action buttons */}
                <div className="flex gap-2.5 w-full animate-[fadeUp_0.45s_var(--spring-soft)_0.20s_forwards] opacity-0">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="pressable flex-1 flex items-center justify-center gap-2 py-3 rounded-[14px]"
                    style={{
                      background: 'rgba(255,255,255,0.80)',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      border: '0.5px solid rgba(255,255,255,0.60)',
                      boxShadow: 'var(--shadow-sm)',
                    }}>
                    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                      <rect x="3" y="3" width="18" height="18" rx="4" />
                      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
                      <path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-[14px] font-medium" style={{ color: 'var(--label-secondary)' }}>相册选图</span>
                  </button>
                  <button
                    onClick={() => setShowManual(true)}
                    className="pressable flex-1 flex items-center justify-center gap-2 py-3 rounded-[14px]"
                    style={{
                      background: 'rgba(255,255,255,0.80)',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      border: '0.5px solid rgba(255,255,255,0.60)',
                      boxShadow: 'var(--shadow-sm)',
                    }}>
                    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                      <path d="M12 20h9" strokeLinecap="round" />
                      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-[14px] font-medium" style={{ color: 'var(--label-secondary)' }}>手动输入</span>
                  </button>
                </div>
              </div>

              {/* ── Feature pills ── */}
              <div className="flex items-center justify-center gap-2 mb-7
                animate-[fadeUp_0.45s_var(--spring-soft)_0.24s_forwards] opacity-0">
                {[
                  { icon: '🧠', label: 'AI 深度解读' },
                  { icon: '🌍', label: '支持所有语言' },
                  { icon: '⚡', label: '极速出结果' },
                ].map(({ icon, label }) => (
                  <div key={label}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{
                      background: 'rgba(255,255,255,0.65)',
                      border: '0.5px solid rgba(255,255,255,0.60)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                    }}>
                    <span className="text-[13px]">{icon}</span>
                    <span className="text-[11px] font-medium" style={{ color: 'var(--label-secondary)' }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* ── Error ── */}
              {stage === 'error' && (
                <div className="mb-5 px-4 py-3.5 rounded-[16px] animate-[fadeSlideIn_0.3s_var(--spring-soft)_forwards]"
                  style={{ background: 'rgba(255,59,48,0.08)', border: '0.5px solid rgba(255,59,48,0.20)' }}>
                  <p className="text-[14px] text-red-500">{errorMsg}</p>
                  <button onClick={() => setStage('idle')}
                    className="mt-1.5 text-[13px] font-semibold"
                    style={{ color: 'var(--orange)' }}>
                    重新尝试
                  </button>
                </div>
              )}

              {/* ── Recent scans ── */}
              {history.length > 0 && (
                <div className="animate-[fadeUp_0.45s_var(--spring-soft)_0.28s_forwards] opacity-0">
                  <div className="flex items-center justify-between mb-2.5 px-0.5">
                    <span className="text-[17px] font-semibold text-gray-900 tracking-tight">最近识别</span>
                    <button onClick={() => router.push('/history')}
                      className="text-[14px] font-medium pressable"
                      style={{ color: 'var(--orange)' }}>
                      查看全部
                    </button>
                  </div>

                  {/* iOS grouped list */}
                  <div className="rounded-[16px] overflow-hidden"
                    style={{
                      background: 'rgba(255,255,255,0.88)',
                      boxShadow: 'var(--shadow-sm)',
                      border: '0.5px solid rgba(255,255,255,0.60)',
                    }}>
                    {history.map((record, idx) => (
                      <div key={record.id}
                        className="stagger-item relative"
                        style={{ animationDelay: `${0.28 + idx * 0.05}s` }}>
                        {/* separator */}
                        {idx > 0 && (
                          <div className="absolute top-0 left-[68px] right-0 h-[0.5px]"
                            style={{ background: 'var(--separator-thin)' }} />
                        )}
                        <div className="flex items-center gap-3 px-4 py-3 active:bg-black/[0.04] transition-colors"
                          onClick={() => router.push(`/menu/${record.id}`)}>
                          {record.thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={record.thumbnail} alt=""
                              className="w-11 h-11 rounded-[10px] object-cover flex-shrink-0"
                              style={{ boxShadow: 'var(--shadow-xs)' }} />
                          ) : (
                            <div className="w-11 h-11 rounded-[10px] flex items-center justify-center flex-shrink-0"
                              style={{ background: 'var(--orange-soft)' }}>
                              <span className="text-xl">🍽️</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-semibold text-gray-900 truncate leading-snug">
                              {record.dishes[0]?.briefCN || record.dishes[0]?.originalName || '菜单记录'}
                            </p>
                            <p className="text-[12px] mt-0.5" style={{ color: 'var(--label-tertiary)' }}>
                              {formatDate(record.createdAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: 'var(--orange-soft)', color: 'var(--orange)' }}>
                              {record.dishCount} 道
                            </span>
                            <button
                              onClick={(e) => handleDelete(e, record.id)}
                              className="p-1.5 -mr-1 transition-colors pressable"
                              style={{ color: 'var(--label-quaternary)' }}>
                              <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor" strokeWidth={1.6}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                              </svg>
                            </button>
                            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none"
                              style={{ color: 'var(--label-quaternary)' }}>
                              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Loading overlay ── */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            background: 'rgba(242,242,247,0.55)',
            backdropFilter: 'blur(48px) saturate(180%)',
            WebkitBackdropFilter: 'blur(48px) saturate(180%)',
          }}>
          <div className="w-[280px] rounded-[28px] px-7 py-7 flex flex-col items-center
            animate-[scaleIn_0.35s_var(--spring)_forwards]"
            style={{
              background: 'rgba(255,255,255,0.90)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              boxShadow: 'var(--shadow-lg)',
              border: '0.5px solid rgba(255,255,255,0.80)',
            }}>
            {/* AI badge */}
            <div className="self-start flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-5"
              style={{ background: 'var(--orange-soft)' }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--orange)' }} />
              <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: 'var(--orange)' }}>
                AI 识别中
              </span>
            </div>
            {/* Animated emoji scene */}
            <div className="relative w-28 h-24 flex items-center justify-center mb-5">
              <span className="text-[64px] animate-[breathe_2.2s_ease-in-out_infinite]">
                {stage === 'compressing' ? '🗜️' : currentStage.emoji}
              </span>
              <span className="absolute right-1 bottom-0 text-[38px] animate-[potSwing_2s_ease-in-out_infinite]">🍳</span>
              <span className="absolute top-2 right-3 text-base animate-[floatSpark_1.9s_ease-in-out_infinite]">✨</span>
              <span className="absolute top-9 left-4 text-base animate-[floatSpark_1.9s_ease-in-out_0.45s_infinite]">✨</span>
            </div>
            <p className="text-[15px] font-medium text-gray-800 text-center leading-snug mb-4">
              {stage === 'compressing' ? '正在压缩图片...' : (statusMsg || currentStage.text)}
            </p>
            {/* Dots */}
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="loading-dot w-2 h-2 rounded-full"
                  style={{ background: 'var(--orange)' }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Manual input sheet ── */}
      {showManual && (
        <div className="fixed inset-0 z-50 flex items-end justify-center animate-[fadeIn_0.18s_ease_forwards]"
          style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
          onClick={() => setShowManual(false)}>
          <div
            className="w-full max-w-lg rounded-t-[28px] px-5 pt-5 animate-[slideUp_0.32s_var(--spring-soft)_forwards]"
            style={{
              background: 'rgba(242,242,247,0.97)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              paddingBottom: kbHeight > 0 ? `${kbHeight + 16}px` : 'max(1.5rem, env(safe-area-inset-bottom))',
              transition: 'padding-bottom 0.25s ease',
            }}
            onClick={(e) => e.stopPropagation()}>
            {/* Handle */}
            <div className="w-9 h-1 rounded-full mx-auto mb-5" style={{ background: 'var(--separator-opaque)' }} />
            <h3 className="text-[17px] font-semibold text-gray-900 mb-4 tracking-tight">输入菜名</h3>
            <textarea
              ref={textareaRef}
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              placeholder="如：Beef Wellington, Caesar Salad"
              className="w-full rounded-[14px] px-4 py-3 text-[14px] resize-none h-28 focus:outline-none"
              style={{
                background: 'rgba(255,255,255,0.90)',
                border: '0.5px solid rgba(0,0,0,0.08)',
                color: 'var(--label)',
              }}
            />
            <p className="text-[12px] mt-2 mb-5" style={{ color: 'var(--label-tertiary)' }}>
              每行或用逗号分隔一个菜名，最多 40 个
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowManual(false)}
                className="flex-1 py-3 rounded-[14px] text-[15px] font-medium pressable"
                style={{ background: 'rgba(120,120,128,0.16)', color: 'var(--label-secondary)' }}>
                取消
              </button>
              <button onClick={handleManualSubmit}
                className="flex-1 py-3 text-white rounded-[14px] text-[15px] font-semibold pressable"
                style={{
                  background: 'linear-gradient(135deg, #FF8C2F, #FF6B00)',
                  boxShadow: '0 4px 16px rgba(255,107,0,0.38)',
                }}>
                开始识别
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab bar ── */}
      <div className="relative z-10 flex pb-safe"
        style={{
          borderTop: '0.5px solid var(--separator-thin)',
          background: 'rgba(249,249,249,0.90)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        }}>
        <button className="flex-1 pt-2.5 pb-1 flex flex-col items-center gap-0.5">
          <IconHome active={true} />
          <span className="text-[10px] font-medium" style={{ color: 'var(--orange)' }}>首页</span>
          <div className="tab-active-dot" />
        </button>
        <button onClick={() => router.push('/history')} className="flex-1 pt-2.5 pb-1 flex flex-col items-center gap-0.5">
          <IconHistory active={false} />
          <span className="text-[10px]" style={{ color: 'var(--label-tertiary)' }}>历史</span>
        </button>
      </div>
    </div>
  )
}
