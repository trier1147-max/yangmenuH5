'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getHistory, deleteRecord, clearHistory, formatRelativeTime } from '@/lib/storage'
import type { HistoryRecord } from '@/lib/types'

export default function HistoryPage() {
  const router = useRouter()
  const [records, setRecords] = useState<HistoryRecord[]>([])

  useEffect(() => {
    setRecords(getHistory())
  }, [])

  const handleDelete = (id: string) => {
    deleteRecord(id)
    setRecords(getHistory())
  }

  const handleClear = () => {
    if (confirm('确定清空所有历史记录吗？')) {
      clearHistory()
      setRecords([])
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* 顶部 */}
      <div className="bg-white px-4 pt-12 pb-4 flex items-center justify-between border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 text-xl p-1">‹</button>
          <h1 className="text-lg font-semibold text-gray-900">历史记录</h1>
        </div>
        {records.length > 0 && (
          <button onClick={handleClear} className="text-sm text-red-400">
            清空
          </button>
        )}
      </div>

      {/* 列表 */}
      <div className="flex-1 p-4">
        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <span className="text-5xl mb-4">🍽️</span>
            <p className="text-base">暂无历史记录</p>
            <button onClick={() => router.push('/')} className="mt-4 text-orange-500 text-sm">
              去识别菜单
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {records.map(record => (
              <div key={record.id} className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm">
                <button
                  onClick={() => router.push(`/menu/${record.id}`)}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  {record.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={record.thumbnail} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0 text-2xl">🍽️</div>
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {record.dishes[0]?.originalName || '菜单记录'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {record.dishCount}道菜 · {formatRelativeTime(record.createdAt)}
                    </p>
                    {record.dishes[1] && (
                      <p className="text-xs text-gray-400 truncate">{record.dishes[1].briefCN}</p>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => handleDelete(record.id)}
                  className="text-gray-300 text-xl p-2 flex-shrink-0"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部导航 */}
      <div className="border-t border-gray-100 bg-white flex">
        <button
          onClick={() => router.push('/')}
          className="flex-1 py-3 flex flex-col items-center gap-1 text-gray-400"
        >
          <span className="text-xl">🏠</span>
          <span className="text-xs">首页</span>
        </button>
        <button className="flex-1 py-3 flex flex-col items-center gap-1 text-orange-500">
          <span className="text-xl">📋</span>
          <span className="text-xs">历史</span>
        </button>
      </div>
    </div>
  )
}
