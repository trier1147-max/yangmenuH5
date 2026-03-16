'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { compressImage, validateImageFile } from '@/lib/imageUtils'
import { saveRecord, getHistory, deleteRecord } from '@/lib/storage'
import type { Dish, HistoryRecord } from '@/lib/types'

type Stage = 'idle' | 'compressing' | 'recognizing' | 'done' | 'error'

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
  const [partialDishes, setPartialDishes] = useState<Dish[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [showManual, setShowManual] = useState(false)
  const [manualInput, setManualInput] = useState('')

  useEffect(() => {
    setHistory(getHistory().slice(0, 5))
  }, [])

  const processImage = useCallback(async (file: File) => {
    const validationError = validateImageFile(file)
    if (validationError) {
      setErrorMsg(validationError)
      setStage('error')
      return
    }

    setStage('compressing')
    setStatusMsg('正在压缩图片...')
    setPartialDishes([])
    setErrorMsg('')

    let base64 = ''
    let thumbnail = ''
    try {
      const result = await compressImage(file)
      base64 = result.base64
      thumbnail = result.thumbnail
    } catch {
      setErrorMsg('图片处理失败，请重试')
      setStage('error')
      return
    }

    setStage('recognizing')
    await recognize(base64, [], thumbnail)
  }, [])

  const recognize = async (imageBase64: string, dishNames: string[], thumbnail?: string) => {
    setStage('recognizing')
    setPartialDishes([])

    try {
      const res = await fetch('/api/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, dishNames }),
      })

      if (!res.ok || !res.body) throw new Error('网络请求失败')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let finalDishes: Dish[] = []
      let menuTooLong = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })

        const lines = buf.split('\n')
        buf = lines.pop() ?? ''

        let eventType = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (eventType === 'status') {
                setStatusMsg(data.message || '')
              } else if (eventType === 'partial') {
                setPartialDishes(data.dishes || [])
              } else if (eventType === 'done') {
                finalDishes = data.dishes || []
                menuTooLong = !!data.menuTooLong
                setPartialDishes(finalDishes)
              } else if (eventType === 'error') {
                throw new Error(data.message || '识别失败')
              }
            } catch (e) {
              if (eventType === 'error') throw e
            }
            eventType = ''
          }
        }
      }

      if (finalDishes.length === 0) throw new Error('未识别到有效菜品，请重试')

      const recordId = saveRecord(finalDishes, thumbnail, menuTooLong)
      setHistory(getHistory().slice(0, 5))
      setStage('done')
      router.push(`/menu/${recordId}`)
    } catch (e) {
      const err = e as Error
      setErrorMsg(err.message || '识别失败，请重试')
      setStage('error')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processImage(file)
    e.target.value = ''
  }

  const handleManualSubmit = async () => {
    const names = manualInput
      .split(/[,，;；、\n]+/)
      .map(s => s.trim())
      .filter(Boolean)
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

  return (
    <div className="flex flex-col min-h-screen bg-[#FFF8F3]">
      {/* 顶部导航 */}
      <div className="px-4 pt-12 pb-2 flex items-center justify-center relative">
        <span className="text-base font-semibold text-gray-800">洋菜单</span>
        <div className="absolute right-4 flex items-center gap-3 text-gray-400 text-sm">
          <span className="tracking-widest">•••</span>
          <span>⊙</span>
        </div>
      </div>

      <div className="flex-1 px-4 pb-6 overflow-y-auto">
        {/* Logo + 标题 */}
        <div className="flex items-center gap-2 mt-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white text-base font-bold shadow-sm flex-shrink-0">
            菜
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-gray-900">洋菜单</span>
              <span className="text-sm text-gray-400">YangMenu</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mb-5">你的AI点餐翻译官，帮你搞懂每道菜</p>

        {/* 使用次数 */}
        <div className="flex justify-center mb-6">
          <div className="bg-white border border-gray-100 rounded-full px-5 py-1.5 text-xs text-gray-500 shadow-sm">
            今日剩余 <span className="text-orange-500 font-semibold">1000</span>/1000 次
          </div>
        </div>

        {/* 主拍照按钮区 */}
        {!isLoading && (
          <div className="flex flex-col items-center mb-6">
            {/* 橙色大圆按钮 */}
            <div className="relative mb-4">
              <div className="absolute inset-0 rounded-full bg-orange-200 scale-[1.15] opacity-50 blur-lg" />
              <div className="absolute inset-0 rounded-full bg-orange-100 scale-[1.3] opacity-30 blur-2xl" />
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="relative w-36 h-36 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-xl active:scale-95 transition-transform"
              >
                <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                </svg>
              </button>
            </div>
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

            <p className="text-lg font-semibold text-gray-800 mb-2">拍照识菜</p>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <span className="text-orange-400 font-bold">ⓘ</span>
              建议长菜单分页拍摄，识别会更精
            </p>
          </div>
        )}

        {/* 识别中 */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="relative w-36 h-36 mb-4">
              <div className="absolute inset-0 rounded-full bg-orange-200 opacity-40 blur-lg" />
              <div className="absolute inset-0 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin rounded-full" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-xl">
                  <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                  </svg>
                </div>
              </div>
            </div>
            <p className="text-gray-700 text-base font-medium">{statusMsg || '正在处理...'}</p>
            {partialDishes.length > 0 && (
              <p className="text-orange-500 text-sm mt-1">已识别 {partialDishes.length} 道菜...</p>
            )}
          </div>
        )}

        {/* 错误提示 */}
        {stage === 'error' && (
          <div className="mb-4 bg-red-50 border border-red-100 rounded-2xl p-4">
            <p className="text-red-500 text-sm">{errorMsg}</p>
            <button onClick={() => setStage('idle')} className="mt-2 text-orange-500 text-sm font-medium">
              重新尝试
            </button>
          </div>
        )}

        {/* 相册 + 手动输入 */}
        {!isLoading && (
          <div className="flex gap-3 mb-5">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 bg-white border border-gray-100 rounded-full py-3 flex items-center justify-center gap-1.5 text-sm text-gray-600 font-medium shadow-sm active:bg-gray-50"
            >
              <span>🖼️</span> 相册选图
            </button>
            <button
              onClick={() => setShowManual(true)}
              className="flex-1 bg-white border border-gray-100 rounded-full py-3 flex items-center justify-center gap-1.5 text-sm text-gray-600 font-medium shadow-sm active:bg-gray-50"
            >
              <span>✏️</span> 手动输入
            </button>
          </div>
        )}

        {/* 特性标签 */}
        {!isLoading && (
          <div className="flex items-center gap-4 mb-6">
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
              AI 深度解读
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              支持所有语言
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
              10秒出结果
            </span>
          </div>
        )}

        {/* 最近识别 */}
        {history.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-base font-semibold text-gray-800">最近识别</span>
              <button onClick={() => router.push('/history')} className="text-sm text-orange-500 font-medium">
                全部
              </button>
            </div>
            <div className="space-y-2">
              {history.map(record => (
                <button
                  key={record.id}
                  onClick={() => router.push(`/menu/${record.id}`)}
                  className="w-full flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm active:bg-gray-50 text-left"
                >
                  {record.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={record.thumbnail} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0 text-2xl">🍽️</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {record.dishes[0]?.briefCN || record.dishes[0]?.originalName || '菜单记录'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(record.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs bg-orange-50 text-orange-400 font-medium px-2 py-0.5 rounded-full whitespace-nowrap">
                      {record.dishCount}道菜
                    </span>
                    <button
                      onClick={(e) => handleDelete(e, record.id)}
                      className="text-gray-300 active:text-red-400 p-1"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                    <span className="text-gray-300 text-lg">›</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 手动输入弹框 */}
      {showManual && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6">
            <h3 className="text-lg font-semibold mb-1">输入菜名</h3>
            <p className="text-xs text-gray-400 mb-3">每行或用逗号分隔一个菜名</p>
            <textarea
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              placeholder="如：Beef Wellington, Caesar Salad"
              className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none h-28 focus:outline-none focus:border-orange-400"
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowManual(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 text-sm">
                取消
              </button>
              <button onClick={handleManualSubmit} className="flex-1 py-3 bg-orange-500 text-white rounded-xl text-sm font-medium">
                识别
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 底部导航 */}
      <div className="border-t border-gray-100 bg-white flex">
        <button className="flex-1 py-3 flex flex-col items-center gap-0.5 text-orange-500">
          <span className="text-xl">🏠</span>
          <span className="text-xs">首页</span>
        </button>
        <button onClick={() => router.push('/history')} className="flex-1 py-3 flex flex-col items-center gap-0.5 text-gray-400">
          <span className="text-xl">📋</span>
          <span className="text-xs">历史</span>
        </button>
      </div>
    </div>
  )
}
