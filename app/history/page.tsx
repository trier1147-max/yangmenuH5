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

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10 pt-safe pb-0"
        style={{
          background: 'rgba(242,242,247,0.88)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          borderBottom: '0.5px solid var(--separator-thin)',
        }}>
        <div className="flex items-center justify-between px-4 pb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-8 h-8 rounded-full flex items-center justify-center pressable flex-shrink-0"
              style={{ background: 'var(--fill-secondary)' }}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}
                style={{ color: 'var(--label-secondary)' }}>
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <h1 className="text-[16px] font-semibold text-gray-900 tracking-tight">历史记录</h1>
          </div>
          {records.length > 0 && (
            <button onClick={() => setShowConfirm(true)}
              className="text-[14px] font-medium pressable px-3 py-1.5 rounded-full"
              style={{ background: 'var(--fill-secondary)', color: 'var(--label-secondary)' }}>
              清空
            </button>
          )}
        </div>
      </div>

      {/* ── List ── */}
      <div className="flex-1 px-4 py-3">
        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24
            animate-[fadeUp_0.45s_var(--spring-soft)_forwards]">
            <div className="w-20 h-20 rounded-[24px] flex items-center justify-center mb-5"
              style={{ background: 'var(--orange-soft)' }}>
              <span className="text-4xl">🍽️</span>
            </div>
            <p className="text-[17px] font-semibold text-gray-800 mb-1.5">暂无历史记录</p>
            <p className="text-[14px] mb-6" style={{ color: 'var(--label-tertiary)' }}>
              拍一张菜单，AI 帮你读懂每道菜
            </p>
            <button onClick={() => router.push('/')}
              className="px-7 py-3 text-white rounded-full text-[15px] font-semibold pressable"
              style={{
                background: 'linear-gradient(135deg, #FF8C2F, #FF6B00)',
                boxShadow: '0 4px 16px rgba(255,107,0,0.38)',
              }}>
              去识别菜单
            </button>
          </div>
        ) : (
          <div className="rounded-[18px] overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.92)', boxShadow: 'var(--shadow-sm)' }}>
            {records.map((record, idx) => (
              <div key={record.id}
                className="stagger-item relative"
                style={{ animationDelay: `${idx * 0.04}s` }}>
                {/* iOS-style inset separator */}
                {idx > 0 && (
                  <div className="absolute top-0 left-[72px] right-0 h-[0.5px]"
                    style={{ background: 'var(--separator-thin)' }} />
                )}
                <div className="flex items-center gap-3 px-4 py-3 active:bg-black/[0.04] transition-colors cursor-pointer"
                  onClick={() => router.push(`/menu/${record.id}`)}>
                  {/* Thumbnail */}
                  {record.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={record.thumbnail} alt=""
                      className="w-12 h-12 rounded-[12px] object-cover flex-shrink-0"
                      style={{ boxShadow: 'var(--shadow-xs)' }} />
                  ) : (
                    <div className="w-12 h-12 rounded-[12px] flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--orange-soft)' }}>
                      <span className="text-2xl">🍽️</span>
                    </div>
                  )}
                  {/* Text */}
                  <div className="flex-1 min-w-0 py-0.5">
                    <p className="text-[14px] font-semibold text-gray-900 truncate leading-snug tracking-tight">
                      {record.dishes[0]?.briefCN || record.dishes[0]?.originalName || '菜单记录'}
                    </p>
                    {record.dishes[1]?.briefCN && (
                      <p className="text-[12px] truncate mt-0.5" style={{ color: 'var(--label-tertiary)' }}>
                        {record.dishes[1].briefCN}…
                      </p>
                    )}
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--label-quaternary)' }}>
                      {formatDate(record.createdAt)}
                    </p>
                  </div>
                  {/* Meta + actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--orange-soft)', color: 'var(--orange)' }}>
                      {record.dishCount} 道
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(record.id) }}
                      className="p-1.5 -mr-0.5 pressable transition-colors"
                      style={{ color: 'var(--label-quaternary)' }}>
                      <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" strokeWidth={1.6}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none"
                      style={{ color: 'var(--label-quaternary)' }}>
                      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth={2.2}
                        strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Clear confirm sheet ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center animate-[fadeIn_0.18s_ease_forwards]"
          style={{ background: 'rgba(0,0,0,0.40)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
          onClick={() => setShowConfirm(false)}>
          <div className="w-full max-w-lg pb-safe animate-[slideUp_0.28s_var(--spring-soft)_forwards]"
            onClick={(e) => e.stopPropagation()}>
            {/* Action card */}
            <div className="mx-4 rounded-[18px] overflow-hidden mb-3"
              style={{ background: 'rgba(255,255,255,0.96)' }}>
              <div className="px-5 pt-5 pb-3 text-center"
                style={{ borderBottom: '0.5px solid var(--separator-thin)' }}>
                <p className="text-[13px] font-semibold text-gray-900 mb-1">清空历史记录</p>
                <p className="text-[12px]" style={{ color: 'var(--label-secondary)' }}>
                  确定要删除全部 {records.length} 条记录吗？此操作不可恢复。
                </p>
              </div>
              <button onClick={handleClear}
                className="w-full py-3.5 text-[16px] font-semibold pressable"
                style={{ color: '#FF3B30' }}>
                删除全部记录
              </button>
            </div>
            {/* Cancel card */}
            <div className="mx-4 rounded-[18px] overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.96)' }}>
              <button onClick={() => setShowConfirm(false)}
                className="w-full py-3.5 text-[16px] font-semibold pressable"
                style={{ color: 'var(--label-secondary)' }}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab bar ── */}
      <div className="flex pb-safe"
        style={{
          borderTop: '0.5px solid var(--separator-thin)',
          background: 'rgba(249,249,249,0.90)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        }}>
        <button onClick={() => router.push('/')} className="flex-1 pt-2.5 pb-1 flex flex-col items-center gap-0.5">
          <IconHome active={false} />
          <span className="text-[10px]" style={{ color: 'var(--label-tertiary)' }}>首页</span>
        </button>
        <button className="flex-1 pt-2.5 pb-1 flex flex-col items-center gap-0.5">
          <IconHistory active={true} />
          <span className="text-[10px] font-medium" style={{ color: 'var(--orange)' }}>历史</span>
          <div className="tab-active-dot" />
        </button>
      </div>
    </div>
  )
}
