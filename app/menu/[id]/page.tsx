'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getRecord } from '@/lib/storage'
import type { Dish, HistoryRecord } from '@/lib/types'

function DishCard({ dish, index }: { dish: Dish; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const detail = dish.detail

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full p-4 text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span className="text-xs text-gray-300 font-medium mt-1 w-4 flex-shrink-0">{index + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 truncate">{dish.originalName}</p>
              <p className="text-base font-semibold text-gray-900 mt-0.5">{dish.briefCN}</p>
              {detail?.flavor && (
                <p className="text-sm text-gray-400 mt-1 line-clamp-1">{detail.flavor}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {detail?.price && (
              <span className="text-orange-500 font-semibold text-sm">{detail.price}</span>
            )}
            <span className="text-gray-300 text-xs">{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
      </button>

      {expanded && detail && (
        <div className="px-4 pb-4 border-t border-gray-50 ml-7">
          {detail.description && (
            <p className="text-sm text-gray-600 mt-3 leading-relaxed">{detail.description}</p>
          )}
          {detail.recommendation && (
            <div className="mt-3 bg-orange-50 rounded-xl p-3">
              <p className="text-xs text-orange-500 font-medium mb-1">✦ 推荐理由</p>
              <p className="text-sm text-gray-700 leading-relaxed">{detail.recommendation}</p>
            </div>
          )}
          {detail.ingredients && detail.ingredients.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-400 mb-2">主要食材</p>
              <div className="flex flex-wrap gap-1.5">
                {detail.ingredients.map((ing, i) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">
                    {ing}
                  </span>
                ))}
              </div>
            </div>
          )}
          {detail.options && detail.options.length > 0 && (
            <div className="mt-3 space-y-1">
              {detail.options.map((opt, i) => (
                <div key={i} className="text-sm text-gray-500">
                  <span className="text-gray-400">{opt.group}（{opt.rule}）：</span>
                  {opt.choices.join(' / ')}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function MenuPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [record, setRecord] = useState<HistoryRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    params.then(p => {
      const r = getRecord(p.id)
      setRecord(r)
      setLoading(false)
    })
  }, [params])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FFF8F3]">
        <div className="w-8 h-8 border-3 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!record) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FFF8F3]">
        <span className="text-5xl mb-4">🍽️</span>
        <p className="text-gray-500 mb-4">记录不存在</p>
        <button onClick={() => router.push('/')} className="text-orange-500 text-sm font-medium">
          返回首页
        </button>
      </div>
    )
  }

  const dishes: Dish[] = record.dishes

  return (
    <div className="flex flex-col min-h-screen bg-[#FFF8F3]">
      {/* 顶部 */}
      <div className="bg-white px-4 pt-12 pb-4 flex items-center gap-3 border-b border-gray-100 sticky top-0 z-10">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-lg"
        >
          ‹
        </button>
        <div>
          <h1 className="text-base font-semibold text-gray-900">菜单翻译</h1>
          <p className="text-xs text-gray-400">共 {dishes.length} 道菜</p>
        </div>
      </div>

      {/* 菜单过长提示 */}
      {record.menuTooLong && (
        <div className="mx-4 mt-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-start gap-2">
          <span className="text-amber-400 text-base flex-shrink-0">⚠️</span>
          <p className="text-xs text-amber-700 leading-relaxed">
            菜单内容较多，仅展示了前部分菜品。建议分页拍摄以获得完整识别。
          </p>
        </div>
      )}

      {/* 菜品列表 */}
      <div className="flex-1 px-4 py-3 space-y-2">
        {dishes.map((dish, i) => (
          <DishCard key={i} dish={dish} index={i} />
        ))}
        <div className="h-2" />
      </div>

      {/* 底部按钮 */}
      <div className="px-4 py-4 bg-white border-t border-gray-100">
        <button
          onClick={() => router.push('/')}
          className="w-full py-3.5 bg-orange-500 text-white rounded-2xl font-medium text-base shadow-sm active:bg-orange-600"
        >
          再拍一张
        </button>
      </div>
    </div>
  )
}
