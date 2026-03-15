'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getRecord } from '@/lib/storage'
import type { Dish, HistoryRecord } from '@/lib/types'

function DishCard({ dish }: { dish: Dish }) {
  const [expanded, setExpanded] = useState(false)
  const detail = dish.detail

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 truncate">{dish.originalName}</p>
            <p className="text-base font-semibold text-gray-900 mt-0.5">{dish.briefCN}</p>
            {detail?.flavor && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-1">{detail.flavor}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {detail?.price && (
              <span className="text-orange-500 font-semibold text-sm">{detail.price}</span>
            )}
            <span className="text-gray-300 text-sm">{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
      </button>

      {expanded && detail && (
        <div className="px-4 pb-4 border-t border-gray-50">
          {detail.description && (
            <p className="text-sm text-gray-600 mt-3 leading-relaxed">{detail.description}</p>
          )}
          {detail.recommendation && (
            <div className="mt-3 bg-orange-50 rounded-xl p-3">
              <p className="text-xs text-orange-600 font-medium mb-1">推荐指数</p>
              <p className="text-sm text-gray-700">{detail.recommendation}</p>
            </div>
          )}
          {detail.ingredients && detail.ingredients.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-400 mb-2">食材</p>
              <div className="flex flex-wrap gap-1">
                {detail.ingredients.map((ing, i) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    {ing}
                  </span>
                ))}
              </div>
            </div>
          )}
          {detail.options && detail.options.length > 0 && (
            <div className="mt-3">
              {detail.options.map((opt, i) => (
                <div key={i} className="text-sm text-gray-600">
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
  const [id, setId] = useState('')

  useEffect(() => {
    params.then(p => {
      setId(p.id)
      const r = getRecord(p.id)
      setRecord(r)
    })
  }, [params])

  if (!record) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500">记录不存在</p>
          <button onClick={() => router.push('/')} className="mt-4 text-orange-500">
            返回首页
          </button>
        </div>
      </div>
    )
  }

  const dishes: Dish[] = record.dishes

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* 顶部 */}
      <div className="bg-white px-4 pt-12 pb-4 flex items-center gap-3 border-b border-gray-100 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-gray-400 text-xl p-1">‹</button>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">菜单翻译</h1>
          <p className="text-xs text-gray-400">共 {dishes.length} 道菜</p>
        </div>
      </div>

      {/* 菜品列表 */}
      <div className="flex-1 p-4 space-y-3">
        {dishes.map((dish, i) => (
          <DishCard key={i} dish={dish} />
        ))}
      </div>

      {/* 底部返回 */}
      <div className="p-4 bg-white border-t border-gray-100">
        <button
          onClick={() => router.push('/')}
          className="w-full py-3 bg-orange-500 text-white rounded-2xl font-medium text-base"
        >
          再拍一张
        </button>
      </div>
    </div>
  )
}
