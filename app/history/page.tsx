'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getHistory, deleteRecord, clearHistory } from '@/lib/storage'
import type { HistoryRecord } from '@/lib/types'

function formatDate(isoString: string): string {
  const d = new Date(isoString)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hour}:${min}`
}

export default function HistoryPage() {
  const router = useRouter()
  const [records, setRecords] = useState<HistoryRecord[]>([])
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    setRecords(getHistory())
  }, [])

  const handleDelete = (id: string) => {
    deleteRecord(id)
    setRecords(getHistory())
  }

  const handleClear = () => {
    clearHistory()
    setRecords([])
    setShowConfirm(false)
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FFF8F3]">
      {/* 顶部 */}
      <div className="bg-white px-4 pt-12 pb-4 flex items-center justify-between border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-lg"
          >
            ‹
          </button>
          <h1 className="text-base font-semibold text-gray-900">历史记录</h1>
        </div>
        {records.length > 0 && (
          <button onClick={() => setShowConfirm(true)} className="text-sm text-gray-400">
            清空
          </button>
        )}
      </div>

      {/* 列表 */}
      <div className="flex-1 px-4 py-3">
        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <span className="text-5xl mb-4">🍽️</span>
            <p className="text-base text-gray-400">暂无历史记录</p>
            <button onClick={() => router.push('/')} className="mt-4 text-orange-500 text-sm font-medium">
              去识别菜单
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {records.map(record => (
              <div key={record.id} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm">
                <button
                  onClick={() => router.push(`/menu/${record.id}`)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
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
                    {record.dishes[1]?.briefCN && (
                      <p className="text-xs text-gray-300 truncate mt-0.5">{record.dishes[1].briefCN}...</p>
                    )}
                  </div>
                  <span className="text-xs bg-orange-50 text-orange-400 font-medium px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                    {record.dishCount}道菜
                  </span>
                </button>
                <button
                  onClick={() => handleDelete(record.id)}
                  className="text-gray-300 active:text-red-400 p-1 flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 清空确认弹框 */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-8">
          <div className="bg-white rounded-2xl p-6 w-full">
            <h3 className="text-base font-semibold text-gray-900 mb-2">清空历史记录</h3>
            <p className="text-sm text-gray-500 mb-5">确定要删除全部 {records.length} 条记录吗？此操作不可恢复。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm"
              >
                取消
              </button>
              <button
                onClick={handleClear}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium"
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 底部导航 */}
      <div className="border-t border-gray-100 bg-white flex">
        <button onClick={() => router.push('/')} className="flex-1 py-3 flex flex-col items-center gap-0.5 text-gray-400">
          <span className="text-xl">🏠</span>
          <span className="text-xs">首页</span>
        </button>
        <button className="flex-1 py-3 flex flex-col items-center gap-0.5 text-orange-500">
          <span className="text-xl">📋</span>
          <span className="text-xs">历史</span>
        </button>
      </div>
    </div>
  )
}
