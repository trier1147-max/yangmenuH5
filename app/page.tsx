'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { compressImage, validateImageFile } from '@/lib/imageUtils'
import { createStreamingRecord, updateRecord, getHistory, deleteRecord } from '@/lib/storage'
import { streamStart, streamUpdate, streamDone, streamError, streamReset } from '@/lib/streamingStore'
import type { Dish, HistoryRecord } from '@/lib/types'

type Stage = 'idle' | 'compressing' | 'recognizing' | 'done' | 'error'

const BG_ICONS = ['🍜', '🍕', '🥗', '🍣', '🍔', '🥩', '🍱', '🥘', '🍛', '🥐',
  '🍝', '🍲', '🌮', '🥟', '🍤', '🦞', '🍱', '🥗', '🍜', '🥩', '🍕', '🍣', '🍔', '🥘']
const BG_ROTATIONS = [-15, 20, -30, 10, 25, -20, 35, -10, 15, -25, 20, -35, 12, -18, 30, -8, -22, 28, -12, 18, 32, -28, 15, -20]

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

export default function HomePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [statusMsg, setStatusMsg] = useState('')
  const [partialCount, setPartialCount] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [showManual, setShowManual] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const [loadingStage, setLoadingStage] = useState(0)
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setHistory(getHistory().slice(0, 5))
  }, [])

  // Loading 动画阶段推进
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

  const processImage = useCallback(async (file: File) => {
    const validationError = validateImageFile(file)
    if (validationError) { setErrorMsg(validationError); setStage('error'); return }

    setStage('compressing')
    setStatusMsg('正在压缩图片...')
    setPartialCount(0)
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
    setPartialCount(0)
    streamReset()

    // 提前生成 recordId，跳转后继续用
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
                setPartialCount(dishes.length)
                // 等到至少一道菜有完整 detail 才跳转
                const hasComplete = dishes.some(
                  (d) => d.detail?.description || d.detail?.flavor || d.detail?.recommendation
                )
                if (hasComplete) {
                  if (!navigated) {
                    // 第一道完整菜品出现 → 创建占位记录，启动流，立即跳转
                    navigated = true
                    createStreamingRecord(recordId, thumbnail)
                    streamStart(recordId, dishes)
                    updateRecord(recordId, { dishes, dishCount: dishes.length })
                    setStage('done')
                    router.push(`/menu/${recordId}`)
                  } else {
                    // 后续菜品 → 更新 store 和 localStorage
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

      // 流结束 → 写入最终数据
      if (finalDishes.length > 0) {
        updateRecord(recordId, { dishes: finalDishes, dishCount: finalDishes.length, menuTooLong })
        streamDone(finalDishes)
      }

      if (!navigated) {
        // 极少情况：partial 从未触发但 done 有数据
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
    <div className="flex flex-col min-h-screen bg-[#FAFAFA] relative overflow-hidden">
      {/* 背景装饰：散落的食物 emoji */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {BG_ICONS.map((icon, i) => {
          const positions = [
            'top-[3%] left-[5%]', 'top-[3%] right-[12%]', 'top-[10%] left-[45%]', 'top-[16%] right-[3%]',
            'top-[18%] left-[15%]', 'top-[25%] right-[25%]', 'top-[30%] left-[2%]', 'top-[33%] right-[8%]',
            'top-[40%] left-[30%]', 'top-[42%] right-[35%]', 'top-[48%] left-[8%]', 'top-[50%] right-[5%]',
            'top-[55%] left-[40%]', 'top-[58%] right-[20%]', 'top-[63%] left-[12%]', 'top-[65%] right-[40%]',
            'top-[70%] left-[3%]', 'top-[72%] right-[10%]', 'top-[78%] left-[25%]', 'top-[80%] right-[30%]',
            'top-[85%] left-[8%]', 'top-[88%] right-[8%]', 'top-[93%] left-[35%]', 'top-[95%] right-[18%]',
          ]
          return (
            <span
              key={i}
              className={`absolute text-3xl opacity-[0.04] ${positions[i] || ''}`}
              style={{ transform: `rotate(${BG_ROTATIONS[i]}deg)` }}
            >
              {icon}
            </span>
          )
        })}
      </div>

      {/* 顶部暖色渐变 */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-orange-50/60 to-transparent pointer-events-none z-0" />

      {/* 顶部导航 */}
      <div className="relative z-10 px-4 pt-12 pb-2 flex items-center justify-center">
        <span className="text-base font-semibold text-gray-800">洋菜单</span>
      </div>

      <div className="relative z-10 flex-1 px-4 pb-6 overflow-y-auto">
        {/* Logo + 标题 */}
        <div className="flex items-center gap-3 mt-3 mb-1">
          <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white text-xl font-bold shadow-md flex-shrink-0">
            菜
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-orange-500 tracking-wider">洋菜单</span>
              <span className="text-sm text-gray-400 font-medium tracking-wide">YangMenu</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 ml-1 mb-6">你的AI点餐翻译官，帮你搞懂每道菜</p>

        {/* 核心操作区 */}
        {!isLoading && (
          <div className="flex flex-col items-center mb-5">
            {/* 使用次数 */}
            <div className="flex items-center gap-2 mb-5">
              <div className="bg-white/90 border border-black/[0.06] rounded-xl px-4 py-1.5 text-xs text-gray-500 shadow-sm">
                今日剩余 <span className="text-orange-500 font-semibold">1000</span>/1000 次
              </div>
            </div>

            {/* AI Orb 虚线圆环 + 玻璃球 */}
            <div className="relative mb-5">
              {/* 虚线外圆 */}
              <div className="w-[168px] h-[168px] rounded-full border-[2px] border-dashed border-orange-300/50 flex items-center justify-center">
                {/* 玻璃球 */}
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-[148px] h-[148px] rounded-full flex items-center justify-center
                    bg-white/70 backdrop-blur-md border border-white/50
                    shadow-[0_12px_40px_rgba(0,0,0,0.08),inset_0_0_0_1px_rgba(255,255,255,0.5)]
                    active:scale-95 transition-transform duration-200"
                >
                  {/* 橙色渐变内核 */}
                  <div className="w-[124px] h-[124px] rounded-full bg-gradient-to-br from-orange-400 to-orange-500
                    flex items-center justify-center
                    shadow-[inset_0_-6px_12px_rgba(0,0,0,0.1),0_8px_24px_rgba(255,152,0,0.45)]">
                    <svg className="w-14 h-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                    </svg>
                  </div>
                </button>
              </div>
            </div>

            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

            <p className="text-xl font-bold text-gray-800 mb-2 tracking-tight">拍照识菜</p>

            {/* 提示气泡 */}
            <div className="flex items-center gap-1.5 bg-white/70 backdrop-blur-md border border-white/50 rounded-full px-4 py-2 shadow-sm mb-6">
              <span className="text-gray-400 text-xs">ⓘ</span>
              <span className="text-xs text-gray-500 font-medium">建议长菜单分页拍摄，识别会更精</span>
            </div>

            {/* 相册 + 手动输入 */}
            <div className="flex gap-3 w-full mb-5">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 bg-white/70 backdrop-blur-md border border-black/[0.08] rounded-full py-3
                  flex items-center justify-center gap-1.5 text-sm text-gray-600 font-medium shadow-sm active:bg-white/90"
              >
                <span>🖼️</span> 相册选图
              </button>
              <button
                onClick={() => setShowManual(true)}
                className="flex-1 bg-white/70 backdrop-blur-md border border-black/[0.08] rounded-full py-3
                  flex items-center justify-center gap-1.5 text-sm text-gray-600 font-medium shadow-sm active:bg-white/90"
              >
                <span>✏️</span> 手动输入
              </button>
            </div>

            {/* 功能亮点标签 */}
            <div className="flex items-center justify-center gap-3">
              {[['🧠', 'AI 深度解读'], ['🌍', '支持所有语言'], ['⚡', '10秒出结果']].map(([icon, label]) => (
                <span key={label} className="text-xs text-gray-500 bg-white/70 backdrop-blur-sm border border-black/[0.06] rounded-2xl px-3 py-1.5 font-medium">
                  {icon} {label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {stage === 'error' && (
          <div className="mb-4 bg-red-50 border border-red-100 rounded-2xl p-4">
            <p className="text-red-500 text-sm">{errorMsg}</p>
            <button onClick={() => setStage('idle')} className="mt-2 text-orange-500 text-sm font-medium">重新尝试</button>
          </div>
        )}

        {/* 最近识别 */}
        {!isLoading && history.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-base font-semibold text-gray-800">最近识别</span>
              <button onClick={() => router.push('/history')} className="text-sm text-orange-500 font-medium">全部</button>
            </div>
            <div className="bg-white/70 backdrop-blur-md rounded-2xl overflow-hidden shadow-sm border border-black/[0.04]">
              {history.map((record, idx) => (
                <button
                  key={record.id}
                  onClick={() => router.push(`/menu/${record.id}`)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 text-left
                    ${idx < history.length - 1 ? 'border-b border-gray-100/80' : ''}`}
                >
                  {record.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={record.thumbnail} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0 text-xl">🍽️</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {record.dishes[0]?.briefCN || record.dishes[0]?.originalName || '菜单记录'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(record.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs bg-orange-50 text-orange-400 font-semibold px-2 py-0.5 rounded-full">
                      {record.dishCount}道菜
                    </span>
                    <button onClick={(e) => handleDelete(e, record.id)} className="text-gray-200 active:text-red-400 p-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                    <span className="text-gray-300">›</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Loading 毛玻璃遮罩 */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(255,251,247,0.5)', backdropFilter: 'blur(40px) saturate(150%)', WebkitBackdropFilter: 'blur(40px) saturate(150%)' }}>
          <div className="rounded-3xl px-8 py-8 w-72 flex flex-col items-center"
            style={{ backgroundColor: 'rgba(255,251,247,0.8)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', boxShadow: '0 16px 64px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(255,255,255,0.5)' }}>
            {/* AI 标签 */}
            <span className="self-start text-xs font-bold text-orange-500 bg-orange-50 px-3 py-1 rounded-full mb-5 tracking-wide">
              AI 识别中
            </span>
            {/* 动画 emoji */}
            <div className="relative w-32 h-28 flex items-center justify-center mb-5">
              <span className="text-[72px] animate-[breathe_2s_ease-in-out_infinite]">
                {stage === 'compressing' ? '🗜️' : currentStage.emoji}
              </span>
              <span className="absolute right-3 bottom-0 text-[44px] animate-[potSwing_1.9s_ease-in-out_infinite]">🍳</span>
              <span className="absolute top-3 right-4 text-lg animate-[floatSpark_1.8s_ease-in-out_infinite]">✨</span>
              <span className="absolute top-10 left-5 text-lg animate-[floatSpark_1.8s_ease-in-out_0.4s_infinite]">✨</span>
            </div>
            <p className="text-base font-medium text-gray-800 text-center leading-relaxed">
              {stage === 'compressing' ? '正在压缩图片...' : (statusMsg || currentStage.text)}
            </p>
            {partialCount > 0 && (
              <p className="text-orange-500 text-sm mt-2">已识别 {partialCount} 道菜...</p>
            )}
          </div>
        </div>
      )}

      {/* 手动输入弹框 */}
      {showManual && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6">
          <div className="bg-white w-full rounded-3xl p-6 max-w-sm">
            <h3 className="text-lg font-bold text-gray-900 text-center mb-4">输入菜名</h3>
            <textarea
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              placeholder="如：Beef Wellington, Caesar Salad"
              className="w-full border border-gray-200 bg-gray-50 rounded-2xl p-3 text-sm resize-none h-32 focus:outline-none focus:border-orange-400"
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-2 mb-4">每行或用逗号分隔一个菜名，最多40个</p>
            <div className="flex gap-3">
              <button onClick={() => setShowManual(false)} className="flex-1 py-3 bg-gray-100 rounded-full text-gray-600 text-sm font-medium">
                取消
              </button>
              <button onClick={handleManualSubmit} className="flex-1 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-full text-sm font-semibold">
                识别
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 底部导航 */}
      <div className="relative z-10 border-t border-gray-100 bg-white/80 backdrop-blur-sm flex">
        <button className="flex-1 py-3 flex flex-col items-center gap-0.5 text-orange-500">
          <span className="text-xl">🏠</span>
          <span className="text-xs font-medium">首页</span>
        </button>
        <button onClick={() => router.push('/history')} className="flex-1 py-3 flex flex-col items-center gap-0.5 text-gray-400">
          <span className="text-xl">📋</span>
          <span className="text-xs">历史</span>
        </button>
      </div>
    </div>
  )
}
