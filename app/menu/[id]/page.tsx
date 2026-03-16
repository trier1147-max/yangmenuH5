'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getRecord } from '@/lib/storage'
import { getStreamingState, subscribeStreaming } from '@/lib/streamingStore'
import type { Dish, HistoryRecord } from '@/lib/types'
import {
  inferDishCategory,
  detectMenuCurrencySymbol,
  normalizeIngredients,
  normalizeOptionGroups,
  normalizeDishDetail,
  parsePriceNumber,
} from '@/lib/menuUtils'

// ── 类型 ────────────────────────────────────────────────────────────
interface MenuDish extends Dish {
  key: string
  category: string
  orderCount: number
  expanded: boolean
}

interface Category {
  key: string
  label: string
  count: number
}

interface OrderItem {
  key: string
  name: string
  price: string
  count: number
  scrollIndex: number
}

// ── 工具 ────────────────────────────────────────────────────────────
function getDishKey(dish: Dish, index: number): string {
  return `${String(dish.originalName ?? '').trim()}__${String(dish.briefCN ?? '').trim()}__${index}`
}

function buildCategories(dishes: MenuDish[]): Category[] {
  const counter: Record<string, number> = {}
  dishes.forEach((d) => { counter[d.category || '其他'] = (counter[d.category || '其他'] || 0) + 1 })
  const cats = Object.keys(counter)
    .sort((a, b) => counter[b] - counter[a])
    .map((label) => ({ key: label, label, count: counter[label] }))
  cats.unshift({ key: 'all', label: '全部', count: dishes.length })
  return cats
}

function filterByCategory(dishes: MenuDish[], cat: string): MenuDish[] {
  return cat === 'all' ? dishes : dishes.filter((d) => d.category === cat)
}

function computeOrderSummary(allDishes: MenuDish[]) {
  const selected = allDishes.filter((d) => d.orderCount > 0)
  const orderDishCount = selected.length
  const orderItemCount = selected.reduce((s, d) => s + d.orderCount, 0)
  let amount = 0, pricedCount = 0
  const orderListItems: OrderItem[] = []
  selected.forEach((dish) => {
    const priceNum = parsePriceNumber(String(dish.detail?.price || ''))
    if (Number.isFinite(priceNum)) { amount += priceNum * dish.orderCount; pricedCount += dish.orderCount }
    const idx = allDishes.findIndex((d) => d.key === dish.key)
    orderListItems.push({ key: dish.key, name: dish.originalName || dish.briefCN || '未命名', price: String(dish.detail?.price || '').trim() || '—', count: dish.orderCount, scrollIndex: idx >= 0 ? idx : 0 })
  })
  const symbol = detectMenuCurrencySymbol(selected)
  const orderAmountText = pricedCount > 0 ? `${symbol || '¥'}${amount.toFixed(2)}` : '待定'
  return { orderDishCount, orderItemCount, orderAmountText, orderListItems, showOrderBar: orderItemCount >= 1 }
}

/** 把原始 Dish[] 转换为带 key/category/order 的 MenuDish[] */
function convertDishes(
  rawDishes: Dish[],
  orderMap: Map<string, number>,
  expandedKeys: Set<string>,
  rawDetailMap: Map<string, Dish['detail']>,
  lazy = true
): MenuDish[] {
  const menuCurrencySymbol = detectMenuCurrencySymbol(rawDishes)
  return rawDishes.map((d, index) => {
    const key = getDishKey(d, index)
    const isExpanded = expandedKeys.has(key)
    const needFull = isExpanded || !lazy
    let detail = normalizeDishDetail(d.detail, menuCurrencySymbol)
    if (!needFull) {
      // 首屏懒加载：跳过食材和选项，记录原始 detail 供后续展开
      if (d.detail) rawDetailMap.set(key, d.detail)
      detail = { ...detail, ingredients: [], options: [] }
    }
    return { ...d, key, category: inferDishCategory(d), orderCount: orderMap.get(key) || 0, expanded: isExpanded, detail }
  })
}

// ── 菜品卡片 ─────────────────────────────────────────────────────────
function DishCard({ dish, index, isNew, onToggle, onAdd, onDecrease }: {
  dish: MenuDish; index: number; isNew: boolean
  onToggle: (index: number) => void
  onAdd: (key: string, e: React.MouseEvent) => void
  onDecrease: (key: string, e: React.MouseEvent) => void
}) {
  const detail = dish.detail
  return (
    <div
      id={`dish-${index}`}
      className={`bg-white rounded-2xl shadow-sm overflow-hidden mb-2 transition-all duration-500
        ${isNew ? 'animate-[fadeSlideIn_0.4s_ease_forwards]' : ''}`}
    >
      <div className="p-4 cursor-pointer active:bg-gray-50" onClick={() => onToggle(index)}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-gray-800 font-medium leading-tight flex-1 min-w-0">{dish.originalName}</p>
              {detail?.price && <span className="text-orange-500 font-semibold text-sm flex-shrink-0">{detail.price}</span>}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-gray-500 flex-1 min-w-0 truncate">{dish.briefCN}</p>
              <span className="text-xs bg-orange-50 text-orange-400 px-2 py-0.5 rounded-full flex-shrink-0 font-medium">{dish.category}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => onToggle(index)}>
          <span className={`text-gray-400 text-xs transition-transform duration-200 ${dish.expanded ? 'rotate-180' : ''}`}>▼</span>
          <span className="text-xs text-gray-400">点击查看菜品介绍</span>
        </div>
        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
          <button onClick={(e) => onDecrease(dish.key, e)}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-base font-medium transition-colors
              ${dish.orderCount > 0 ? 'bg-orange-100 text-orange-500 active:bg-orange-200' : 'bg-gray-100 text-gray-300'}`}>−</button>
          <span className={`w-7 text-center text-sm font-semibold ${dish.orderCount > 0 ? 'text-orange-500' : 'text-gray-300'}`}>{dish.orderCount}</span>
          <button onClick={(e) => onAdd(dish.key, e)}
            className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center text-base font-medium active:bg-orange-600">+</button>
        </div>
      </div>

      {dish.expanded && detail && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-3">
          {(detail.introduction || detail.description) && (
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1">🍽️ 菜品介绍</p>
              <p className="text-sm text-gray-600 leading-relaxed">{detail.introduction || detail.description}</p>
            </div>
          )}
          {detail.flavor && (
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1">👅 风味口感</p>
              <p className="text-sm text-gray-600 leading-relaxed">{detail.flavor}</p>
            </div>
          )}
          {detail.ingredients && detail.ingredients.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1.5">🥘 核心食材</p>
              <div className="flex flex-wrap gap-1.5">
                {detail.ingredients.map((ing, i) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">{ing}</span>
                ))}
              </div>
            </div>
          )}
          {detail.recommendation && (
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1">💡 推荐</p>
              <p className="text-sm text-gray-600 leading-relaxed">{detail.recommendation}</p>
            </div>
          )}
          {detail.options && detail.options.length > 0 && (
            <div className="space-y-1">
              {detail.options.map((opt, i) => (
                <p key={i} className="text-sm text-gray-500">
                  <span className="text-gray-400">{opt.group}（{opt.rule}）：</span>{opt.choices.join(' / ')}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── 骨架屏 ────────────────────────────────────────────────────────────
function DishSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 mb-2 animate-pulse">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-100 rounded w-3/4" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
        <div className="h-4 bg-orange-50 rounded w-12" />
      </div>
    </div>
  )
}

// ── 主页面 ───────────────────────────────────────────────────────────
export default function MenuPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [recordId, setRecordId] = useState('')
  const [record, setRecord] = useState<HistoryRecord | null>(null)
  const [allDishes, setAllDishes] = useState<MenuDish[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [categoryExpanded, setCategoryExpanded] = useState(false)
  const [orderDetailVisible, setOrderDetailVisible] = useState(false)
  const [scrollToId, setScrollToId] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamError, setStreamError] = useState('')
  const [newDishKeys, setNewDishKeys] = useState<Set<string>>(new Set())

  const orderMapRef = useRef<Map<string, number>>(new Map())
  const rawDetailMapRef = useRef<Map<string, Dish['detail']>>(new Map())
  const expandedKeysRef = useRef<Set<string>>(new Set())
  const prevDishCountRef = useRef(0)

  const orderSummary = computeOrderSummary(allDishes)
  const visibleDishes = filterByCategory(allDishes, activeCategory)

  // 更新 allDishes（合并新菜品，保留展开状态和点单数量）
  const applyDishes = useCallback((rawDishes: Dish[]) => {
    setAllDishes((prev) => {
      const menuCurrencySymbol = detectMenuCurrencySymbol(rawDishes)
      const updated = rawDishes.map((d, index) => {
        const key = getDishKey(d, index)
        const existing = prev.find((p) => p.key === key)
        if (existing) return existing // 已有菜品保持原样（保留展开状态）

        // 新菜品
        const detail = normalizeDishDetail(d.detail, menuCurrencySymbol)
        if (d.detail) rawDetailMapRef.current.set(key, d.detail)
        detail.ingredients = []
        detail.options = []
        return {
          ...d, key,
          category: inferDishCategory(d),
          orderCount: orderMapRef.current.get(key) || 0,
          expanded: false,
          detail,
        }
      })

      // 标记新出现的菜品 key，用于入场动画
      const newKeys = new Set(updated.slice(prev.length).map((d) => d.key))
      if (newKeys.size > 0) {
        setNewDishKeys((old) => new Set([...old, ...newKeys]))
        setTimeout(() => setNewDishKeys((old) => {
          const next = new Set(old)
          newKeys.forEach((k) => next.delete(k))
          return next
        }), 600)
      }

      setCategories(buildCategories(updated))
      return updated
    })
  }, [])

  // 初始化：从 store 或 localStorage 加载
  useEffect(() => {
    params.then((p) => {
      const id = p.id
      setRecordId(id)

      const streamState = getStreamingState()
      if (streamState.status === 'streaming' && streamState.recordId === id) {
        // 正在流式传输：用 store 的菜品初始化
        setIsStreaming(true)
        applyDishes(streamState.dishes)
        prevDishCountRef.current = streamState.dishes.length
      } else if (streamState.status === 'done' && streamState.recordId === id && streamState.dishes.length > 0) {
        applyDishes(streamState.dishes)
      } else {
        // 从 localStorage 加载（历史记录入口）
        const r = getRecord(id)
        setRecord(r)
        if (r) applyDishes(r.dishes)
      }
    })
  }, [params, applyDishes])

  // 订阅 streamingStore，实时更新菜品
  useEffect(() => {
    if (!recordId) return

    const unsub = subscribeStreaming(() => {
      const s = getStreamingState()
      if (s.recordId !== recordId) return

      if (s.status === 'streaming') {
        applyDishes(s.dishes)
        prevDishCountRef.current = s.dishes.length
      } else if (s.status === 'done') {
        applyDishes(s.dishes)
        setIsStreaming(false)
        // 更新 record（包含 menuTooLong 等）
        const r = getRecord(recordId)
        if (r) setRecord(r)
      } else if (s.status === 'error') {
        setIsStreaming(false)
        setStreamError(s.error || '识别出错')
      }
    })

    // 检查初始状态是否已是 streaming
    const s = getStreamingState()
    if (s.recordId === recordId && s.status === 'streaming') {
      setIsStreaming(true)
    }

    return unsub
  }, [recordId, applyDishes])

  // 滚动定位
  useEffect(() => {
    if (!scrollToId) return
    const el = document.getElementById(scrollToId)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const t = setTimeout(() => setScrollToId(''), 600)
    return () => clearTimeout(t)
  }, [scrollToId])

  // 展开/收起
  const handleToggle = useCallback((index: number) => {
    setAllDishes((prev) => {
      const dish = prev[index]
      if (!dish) return prev
      const key = dish.key
      const nextExpanded = !dish.expanded
      if (nextExpanded) {
        expandedKeysRef.current.add(key)
        const rawDetail = rawDetailMapRef.current.get(key)
        if (rawDetail && (!dish.detail?.ingredients?.length)) {
          const menuCurrencySymbol = detectMenuCurrencySymbol(prev)
          const fullDetail = normalizeDishDetail(rawDetail, menuCurrencySymbol)
          fullDetail.ingredients = normalizeIngredients(rawDetail.ingredients)
          fullDetail.options = normalizeOptionGroups(rawDetail.options)
          rawDetailMapRef.current.delete(key)
          const updated = [...prev]
          updated[index] = { ...dish, expanded: true, detail: fullDetail }
          return updated
        }
      } else {
        expandedKeysRef.current.delete(key)
      }
      const updated = [...prev]
      updated[index] = { ...dish, expanded: nextExpanded }
      return updated
    })
  }, [])

  // 点单
  const handleAdd = useCallback((key: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const count = (orderMapRef.current.get(key) || 0) + 1
    orderMapRef.current.set(key, count)
    setAllDishes((prev) => prev.map((d) => d.key === key ? { ...d, orderCount: count } : d))
  }, [])

  const handleDecrease = useCallback((key: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = Math.max(0, (orderMapRef.current.get(key) || 0) - 1)
    if (next === 0) orderMapRef.current.delete(key); else orderMapRef.current.set(key, next)
    setAllDishes((prev) => prev.map((d) => d.key === key ? { ...d, orderCount: next } : d))
  }, [])

  const handleOrderItemTap = (item: OrderItem) => {
    setOrderDetailVisible(false)
    setActiveCategory('all')
    setTimeout(() => setScrollToId(`dish-${item.scrollIndex}`), 80)
  }

  // 从 localStorage 加载的 record（for menuTooLong 等元数据）
  const finalRecord = record ?? (recordId ? getRecord(recordId) : null)

  return (
    <div className="flex flex-col min-h-screen bg-[#FFF8F3]">
      {/* 顶部 */}
      <div className="bg-white px-4 pt-12 pb-3 flex items-center gap-3 border-b border-gray-100 sticky top-0 z-20">
        <button onClick={() => router.back()}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-lg flex-shrink-0">‹</button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-gray-900">菜单翻译</h1>
            {isStreaming && (
              <span className="flex items-center gap-1 text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse inline-block" />
                识别中
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400">
            {isStreaming ? `已识别 ${allDishes.length} 道菜...` : `共 ${allDishes.length} 道菜`}
          </p>
        </div>
      </div>

      {/* 分类标签栏 */}
      {categories.length > 1 && (
        <div className="bg-white px-4 py-2.5 border-b border-gray-50 sticky top-[72px] z-10">
          {!categoryExpanded ? (
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5 flex-1 overflow-hidden">
                {categories.slice(0, 5).map((cat) => (
                  <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
                    className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors
                      ${activeCategory === cat.key ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500 active:bg-gray-200'}`}>
                    {cat.label}（{cat.count}）
                  </button>
                ))}
              </div>
              {categories.length > 5 && (
                <button onClick={() => setCategoryExpanded(true)}
                  className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-500">展开 ▾</button>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors
                    ${activeCategory === cat.key ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500 active:bg-gray-200'}`}>
                  {cat.label}（{cat.count}）
                </button>
              ))}
              <button onClick={() => setCategoryExpanded(false)}
                className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-500">收起 ▴</button>
            </div>
          )}
        </div>
      )}

      {/* 内容区 */}
      <div className="flex-1 px-4 pt-3 pb-32">

        {/* 流式错误提示 */}
        {streamError && (
          <div className="mb-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-start gap-2">
            <span className="text-amber-400 flex-shrink-0">⚠️</span>
            <p className="text-xs text-amber-700">{streamError}，已展示部分菜品。</p>
          </div>
        )}

        {/* 菜单过长提示 */}
        {finalRecord?.menuTooLong && !isStreaming && (
          <div className="mb-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-start gap-2">
            <span className="text-amber-400 flex-shrink-0">⚠️</span>
            <p className="text-xs text-amber-700 leading-relaxed">菜单内容较多，仅展示了部分菜品。建议分页拍摄以获得完整识别。</p>
          </div>
        )}

        {/* 菜品列表 */}
        {visibleDishes.map((dish) => {
          const realIndex = allDishes.findIndex((d) => d.key === dish.key)
          return (
            <DishCard
              key={dish.key}
              dish={dish}
              index={realIndex}
              isNew={newDishKeys.has(dish.key)}
              onToggle={handleToggle}
              onAdd={handleAdd}
              onDecrease={handleDecrease}
            />
          )
        })}

        {/* 流式骨架屏：识别中且菜品还少时显示 */}
        {isStreaming && allDishes.length < 3 && (
          <>
            <DishSkeleton />
            <DishSkeleton />
            <DishSkeleton />
          </>
        )}

        {/* 识别中提示条 */}
        {isStreaming && allDishes.length > 0 && (
          <div className="flex items-center gap-2 py-3 px-1">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <span className="text-xs text-gray-400">正在识别更多菜品...</span>
          </div>
        )}

        {/* 空状态（历史记录入口，无菜品） */}
        {!isStreaming && allDishes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24">
            <span className="text-5xl mb-4">🍽️</span>
            <p className="text-gray-400 text-sm">暂无菜品信息</p>
          </div>
        )}
        <div className="h-2" />
      </div>

      {/* 点单汇总栏 */}
      {orderSummary.showOrderBar ? (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-30">
          <div className="mx-4 mb-4 bg-gray-900 rounded-2xl overflow-hidden shadow-xl">
            <div className="flex items-stretch">
              <button className="flex-1 px-4 py-3.5 text-left" onClick={() => setOrderDetailVisible(!orderDetailVisible)}>
                <p className="text-white text-sm font-semibold">点单汇总</p>
                <p className="text-gray-400 text-xs mt-0.5">菜品 {orderSummary.orderDishCount} 道 · 份数 {orderSummary.orderItemCount} · {orderSummary.orderAmountText}</p>
                <p className="text-gray-500 text-xs mt-0.5">点击可查看已点菜品</p>
              </button>
              <button onClick={() => router.push('/')}
                className="bg-orange-500 px-4 text-white text-sm font-medium active:bg-orange-600 flex-shrink-0">
                再拍<br />一张
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-30">
          <div className="px-4 pb-6 pt-2 bg-gradient-to-t from-[#FFF8F3] to-transparent">
            <button onClick={() => router.push('/')}
              className="w-full py-3.5 bg-orange-500 text-white rounded-2xl font-medium text-base shadow-sm active:bg-orange-600">
              再拍一张
            </button>
          </div>
        </div>
      )}

      {/* 点单清单浮层 */}
      {orderDetailVisible && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-end" onClick={() => setOrderDetailVisible(false)}>
          <div className="w-full max-w-md mx-auto bg-white rounded-t-3xl max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <p className="text-base font-semibold text-gray-900">将要点的菜</p>
              <button onClick={() => setOrderDetailVisible(false)} className="text-sm text-gray-400 px-2 py-1">关闭</button>
            </div>
            <div className="overflow-y-auto flex-1">
              {orderSummary.orderListItems.map((item) => (
                <div key={item.key} className="flex items-center px-5 py-3 border-b border-gray-50 active:bg-gray-50 cursor-pointer" onClick={() => handleOrderItemTap(item)}>
                  <p className="flex-1 text-sm text-gray-800 font-medium truncate">{item.name}</p>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-3" onClick={(e) => e.stopPropagation()}>
                    <span className="text-sm text-gray-400 mr-2">{item.price}</span>
                    <button onClick={(e) => handleDecrease(item.key, e)} className="w-6 h-6 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center text-sm font-medium">−</button>
                    <span className="w-6 text-center text-sm font-semibold text-orange-500">{item.count}</span>
                    <button onClick={(e) => handleAdd(item.key, e)} className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-medium">+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
