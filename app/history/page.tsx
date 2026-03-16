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
    <div className="flex flex-col min-h-screen" style={{ background: '#F2F2F7' }}>

      {/* Header */}
      <div className="px-4 pt-14 pb-3 flex items-center justify-between sticky top-0 z-10"
        style={{
          background: 'rgba(242,242,247,0.88)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderBottom: '1px solid rgba(0,0,0,0.05)',
        }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 text-lg pressable"
            style={{ background: 'rgba(0,0,0,0.06)' }}
          >
            ‹
          </button>
          <h1 className="text-[15px] font-semibold text-gray-900 tracking-tight">历史记录</h1>
        </div>
        {records.length > 0 && (
          <button onClick={() => setShowConfirm(true)}
            className="text-sm text-gray-400 px-3 py-1.5 rounded-full pressable"
            style={{ background: 'rgba(0,0,0,0.05)' }}>
            清空
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 px-4 py-3">
        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400 animate-[fadeUp_0.5s_var(--spring-soft)_forwards]">
            <span className="text-6xl mb-5">🍽️</span>
            <p className="text-base text-gray-400 font-medium">暂无历史记录</p>
            <p className="text-sm text-gray-300 mt-1 mb-5">拍一张菜单开始吧</p>
            <button onClick={() => router.push('/')}
              className="px-6 py-2.5 text-white rounded-full text-sm font-semibold pressable"
              style={{ background: 'linear-gradient(135deg, #FF8C2F, #FF6B00)', boxShadow: '0 4px 16px rgba(255,107,0,0.35)' }}>
              去识别菜单
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {records.map((record, idx) => (
              <div key={record.id}
                className="stagger-item flex items-center gap-3 rounded-[20px] px-4 py-3"
                style={{
                  animationDelay: `${idx * 0.05}s`,
                  background: 'rgba(255,255,255,0.88)',
                  boxShadow: 'var(--shadow-sm)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.7)',
                }}>
                <button
                  onClick={() => router.push(`/menu/${record.id}`)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  {record.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={record.thumbnail} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
                      style={{ background: 'rgba(255,107,0,0.08)' }}>
                      🍽️
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-gray-800 truncate tracking-tight">
                      {record.dishes[0]?.briefCN || record.dishes[0]?.originalName || '菜单记录'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(record.createdAt)}</p>
                    {record.dishes[1]?.briefCN && (
                      <p className="text-xs text-gray-300 truncate mt-0.5">{record.dishes[1].briefCN}...</p>
                    )}
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0"
                    style={{ background: 'rgba(255,107,0,0.08)', color: 'var(--orange)' }}>
                    {record.dishCount}道菜
                  </span>
                </button>
                <button
                  onClick={() => handleDelete(record.id)}
                  className="text-gray-300 active:text-red-400 p-1 flex-shrink-0 transition-colors pressable"
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

      {/* Confirm dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-8 animate-[fadeIn_0.2s_ease_forwards]"
          style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full rounded-[24px] p-6 animate-[scaleIn_0.3s_var(--spring)_forwards]"
            style={{ background: 'white', maxWidth: '320px', boxShadow: 'var(--shadow-lg)' }}>
            <h3 className="text-base font-semibold text-gray-900 mb-2 tracking-tight">清空历史记录</h3>
            <p className="text-sm text-gray-500 mb-5 leading-relaxed">
              确定要删除全部 {records.length} 条记录吗？此操作不可恢复。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-full text-gray-600 text-sm font-medium pressable"
                style={{ background: '#F2F2F7' }}
              >
                取消
              </button>
              <button
                onClick={handleClear}
                className="flex-1 py-2.5 text-white rounded-full text-sm font-semibold pressable"
                style={{ background: '#FF3B30', boxShadow: '0 4px 12px rgba(255,59,48,0.35)' }}
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex" style={{
        borderTop: '1px solid rgba(0,0,0,0.06)',
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}>
        <button onClick={() => router.push('/')} className="flex-1 py-2.5 flex flex-col items-center gap-0.5 text-gray-400">
          <span className="text-xl">🏠</span>
          <span className="text-xs">首页</span>
        </button>
        <button className="flex-1 py-2.5 flex flex-col items-center gap-0.5" style={{ color: 'var(--orange)' }}>
          <span className="text-xl">📋</span>
          <span className="text-xs font-medium">历史</span>
          <div className="tab-active-dot" />
        </button>
      </div>
    </div>
  )
}
