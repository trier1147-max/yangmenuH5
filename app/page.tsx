'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { compressImage, validateImageFile } from '@/lib/imageUtils'
import { saveRecord, getHistory, formatRelativeTime } from '@/lib/storage'
import type { Dish, HistoryRecord } from '@/lib/types'

type Stage = 'idle' | 'compressing' | 'recognizing' | 'done' | 'error'

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
    setHistory(getHistory().slice(0, 3))
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

      if (!res.ok || !res.body) {
        throw new Error('网络请求失败')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let finalDishes: Dish[] = []

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

      if (finalDishes.length === 0) {
        throw new Error('未识别到有效菜品，请重试')
      }

      const recordId = saveRecord(finalDishes, thumbnail)
      setHistory(getHistory().slice(0, 3))
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

  const isLoading = stage === 'compressing' || stage === 'recognizing'

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* 顶部 */}
      <div className="bg-white px-4 pt-12 pb-6 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">洋菜单</h1>
        <p className="text-sm text-gray-500 mt-1">拍照识别外文菜单，用AI读懂每一道菜</p>
      </div>

      <div className="flex-1 px-4 py-6">
        {/* 主操作区 */}
        {!isLoading && stage !== 'done' && (
          <div className="space-y-3">
            {/* 拍照 */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="w-full bg-orange-500 text-white rounded-2xl py-4 flex items-center justify-center gap-3 text-lg font-medium active:bg-orange-600 transition-colors"
            >
              <span className="text-2xl">📷</span>
              拍摄菜单
            </button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* 从相册选择 */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-gray-50 border border-gray-200 text-gray-700 rounded-2xl py-4 flex items-center justify-center gap-3 text-lg font-medium active:bg-gray-100 transition-colors"
            >
              <span className="text-2xl">🖼️</span>
              从相册选择
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* 手动输入 */}
            <button
              onClick={() => setShowManual(true)}
              className="w-full bg-gray-50 border border-gray-200 text-gray-700 rounded-2xl py-3 flex items-center justify-center gap-2 text-base font-medium active:bg-gray-100 transition-colors"
            >
              <span className="text-xl">✏️</span>
              手动输入菜名
            </button>
          </div>
        )}

        {/* 手动输入弹框 */}
        {showManual && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
            <div className="bg-white w-full rounded-t-3xl p-6">
              <h3 className="text-lg font-semibold mb-3">输入菜名</h3>
              <p className="text-sm text-gray-500 mb-3">每行或用逗号分隔一个菜名</p>
              <textarea
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                placeholder="如：Beef Wellington, Caesar Salad"
                className="w-full border border-gray-200 rounded-xl p-3 text-base resize-none h-32 focus:outline-none focus:border-orange-400"
                autoFocus
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowManual(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600"
                >
                  取消
                </button>
                <button
                  onClick={handleManualSubmit}
                  className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-medium"
                >
                  识别
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 识别中 */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mb-6" />
            <p className="text-gray-600 text-base">{statusMsg || '正在处理...'}</p>
            {partialDishes.length > 0 && (
              <p className="text-orange-500 text-sm mt-2">已识别 {partialDishes.length} 道菜...</p>
            )}
          </div>
        )}

        {/* 错误 */}
        {stage === 'error' && (
          <div className="mt-4 bg-red-50 border border-red-100 rounded-2xl p-4">
            <p className="text-red-600 text-sm">{errorMsg}</p>
            <button
              onClick={() => setStage('idle')}
              className="mt-3 text-orange-500 text-sm font-medium"
            >
              重新尝试
            </button>
          </div>
        )}

        {/* 最近记录 */}
        {stage === 'idle' && history.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-800">最近记录</h2>
              <button
                onClick={() => router.push('/history')}
                className="text-sm text-orange-500"
              >
                查看全部
              </button>
            </div>
            <div className="space-y-2">
              {history.map(record => (
                <button
                  key={record.id}
                  onClick={() => router.push(`/menu/${record.id}`)}
                  className="w-full flex items-center gap-3 bg-gray-50 rounded-xl p-3 active:bg-gray-100 text-left"
                >
                  {record.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={record.thumbnail} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0 text-xl">🍽️</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {record.dishes[0]?.originalName || '菜单记录'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {record.dishCount}道菜 · {formatRelativeTime(record.createdAt)}
                    </p>
                  </div>
                  <span className="text-gray-300 text-lg">›</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 底部导航 */}
      <div className="border-t border-gray-100 bg-white flex">
        <button className="flex-1 py-3 flex flex-col items-center gap-1 text-orange-500">
          <span className="text-xl">🏠</span>
          <span className="text-xs">首页</span>
        </button>
        <button
          onClick={() => router.push('/history')}
          className="flex-1 py-3 flex flex-col items-center gap-1 text-gray-400"
        >
          <span className="text-xl">📋</span>
          <span className="text-xs">历史</span>
        </button>
      </div>
    </div>
  )
}
