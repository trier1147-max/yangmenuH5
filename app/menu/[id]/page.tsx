'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getRecord } from '@/lib/storage'
import type { Dish, HistoryRecord } from '@/lib/types'
import {
  inferDishCategory,
  detectMenuCurrencySymbol,
  normalizeIngredients,
  normalizeOptionGroups,
  applyCurrencySymbol,
  normalizePrice,
  parsePriceNumber,
  normalizeDishDetail,
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
  dishes.forEach((d) => {
    const label = d.category || '其他'
    counter[label] = (counter[label] || 0) + 1
  })
  const cats = Object.keys(counter)
    .sort((a, b) => counter[b] - counter[a])
    .map((label) => ({ key: label, label, count: counter[label] }))
  cats.unshift({ key: 'all', label: '全部', count: dishes.length })
  return cats
}

function filterByCategory(dishes: MenuDish[], cat: string): MenuDish[] {
  if (cat === 'all') return dishes
  return dishes.filter((d) => d.category === cat)
}

// ── 点单汇总计算 ─────────────────────────────────────────────────────
function computeOrderSummary(allDishes: MenuDish[]) {
  const selected = allDishes.filter((d) => d.orderCount > 0)
  const orderDishCount = selected.length
  const orderItemCount = selected.reduce((s, d) => s + d.orderCount, 0)
  let amount = 0
  let pricedCount = 0
  const orderListItems: OrderItem[] = []
  selected.forEach((dish) => {
    const priceNum = parsePriceNumber(String(dish.detail?.price || ''))
    if (Number.isFinite(priceNum)) { amount += priceNum * dish.orderCount; pricedCount += dish.orderCount }
    const idx = allDishes.findIndex((d) => d.key === dish.key)
    orderListItems.push({
      key: dish.key,
      name: dish.originalName || dish.briefCN || '未命名',
      price: String(dish.detail?.price || '').trim() || '—',
      count: dish.orderCount,
      scrollIndex: idx >= 0 ? idx : 0,
    })
  })
  const symbol = detectMenuCurrencySymbol(selected)
  const orderAmountText = pricedCount > 0 ? `${symbol || '¥'}${amount.toFixed(2)}` : '待定'
  return { orderDishCount, orderItemCount, orderAmountText, orderListItems, showOrderBar: orderItemCount >= 1 }
}

// ── 菜品卡片 ─────────────────────────────────────────────────────────
function DishCard({
  dish,
  index,
  onToggle,
  onAdd,
  onDecrease,
}: {
  dish: MenuDish
  index: number
  onToggle: (index: number) => void
  onAdd: (key: string, e: React.MouseEvent) => void
  onDecrease: (key: string, e: React.MouseEvent) => void
}) {
  const detail = dish.detail

  return (
    <div
      id={`dish-${index}`}
      className="bg-white rounded-2xl shadow-sm overflow-hidden mb-2"
    >
      {/* 卡片头部 — 点击展开/收起 */}
      <div
        className="p-4 cursor-pointer active:bg-gray-50"
        onClick={() => onToggle(index)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-gray-800 font-medium leading-tight flex-1 min-w-0">{dish.originalName}</p>
              {detail?.price && (
                <span className="text-orange-500 font-semibold text-sm flex-shrink-0">{detail.price}</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-gray-500 flex-1 min-w-0 truncate">{dish.briefCN}</p>
              <span className="text-xs bg-orange-50 text-orange-400 px-2 py-0.5 rounded-full flex-shrink-0 font-medium">
                {dish.category}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 卡片底部：展开提示 + +/- 点单 */}
      <div className="px-4 pb-3 flex items-center justify-between">
        <div
          className="flex items-center gap-1.5 cursor-pointer"
          onClick={() => onToggle(index)}
        >
          <span className={`text-gray-400 text-xs transition-transform duration-200 ${dish.expanded ? 'rotate-180' : ''}`}>▼</span>
          <span className="text-xs text-gray-400">点击查看菜品介绍</span>
        </div>
        {/* +/- 选择器 */}
        <div
          className="flex items-center gap-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => onDecrease(dish.key, e)}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-base font-medium transition-colors
              ${dish.orderCount > 0 ? 'bg-orange-100 text-orange-500 active:bg-orange-200' : 'bg-gray-100 text-gray-300'}`}
          >
            −
          </button>
          <span className={`w-7 text-center text-sm font-semibold ${dish.orderCount > 0 ? 'text-orange-500' : 'text-gray-300'}`}>
            {dish.orderCount}
          </span>
          <button
            onClick={(e) => onAdd(dish.key, e)}
            className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center text-base font-medium active:bg-orange-600"
          >
            +
          </button>
        </div>
      </div>

      {/* 展开内容 */}
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
                  <span className="text-gray-400">{opt.group}（{opt.rule}）：</span>
                  {opt.choices.join(' / ')}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── 主页面 ───────────────────────────────────────────────────────────
export default function MenuPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [record, setRecord] = useState<HistoryRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [allDishes, setAllDishes] = useState<MenuDish[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [categoryExpanded, setCategoryExpanded] = useState(false)
  const [orderDetailVisible, setOrderDetailVisible] = useState(false)
  const [scrollToId, setScrollToId] = useState('')
  const orderMapRef = useRef<Map<string, number>>(new Map())
  const rawDetailMapRef = useRef<Map<string, Dish['detail']>>(new Map())
  const expandedKeysRef = useRef<Set<string>>(new Set())

  // 计算订单汇总
  const orderSummary = computeOrderSummary(allDishes)
  const visibleDishes = filterByCategory(allDishes, activeCategory)

  // 初始化菜品列表
  const initDishes = useCallback((dishes: Dish[]) => {
    const menuCurrencySymbol = detectMenuCurrencySymbol(dishes)
    const menuDishes: MenuDish[] = dishes.map((d, index) => {
      const key = getDishKey(d, index)
      const normalizedDetail = normalizeDishDetail(d.detail, menuCurrencySymbol)
      // 首屏不计算 ingredients/options，首次展开时再算
      const lightDetail = {
        ...normalizedDetail,
        ingredients: [],
        options: [],
      }
      if (d.detail) rawDetailMapRef.current.set(key, d.detail)
      return {
        ...d,
        key,
        category: inferDishCategory(d),
        orderCount: orderMapRef.current.get(key) || 0,
        expanded: expandedKeysRef.current.has(key),
        detail: lightDetail,
      }
    })
    setAllDishes(menuDishes)
    setCategories(buildCategories(menuDishes))
  }, [])

  useEffect(() => {
    params.then((p) => {
      const r = getRecord(p.id)
      setRecord(r)
      if (r) initDishes(r.dishes)
      setLoading(false)
    })
  }, [params, initDishes])

  // 滚动到指定菜品
  useEffect(() => {
    if (!scrollToId) return
    const el = document.getElementById(scrollToId)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const t = setTimeout(() => setScrollToId(''), 600)
    return () => clearTimeout(t)
  }, [scrollToId])

  // 展开/收起菜品
  const handleToggle = useCallback((index: number) => {
    setAllDishes((prev) => {
      const dish = prev[index]
      if (!dish) return prev
      const key = dish.key
      const nextExpanded = !dish.expanded
      if (nextExpanded) {
        expandedKeysRef.current.add(key)
        // 首次展开时计算 ingredients/options
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

  // +/- 点单
  const handleAdd = useCallback((key: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const count = (orderMapRef.current.get(key) || 0) + 1
    orderMapRef.current.set(key, count)
    setAllDishes((prev) => prev.map((d) => d.key === key ? { ...d, orderCount: count } : d))
  }, [])

  const handleDecrease = useCallback((key: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const current = orderMapRef.current.get(key) || 0
    const next = Math.max(0, current - 1)
    if (next === 0) orderMapRef.current.delete(key)
    else orderMapRef.current.set(key, next)
    setAllDishes((prev) => prev.map((d) => d.key === key ? { ...d, orderCount: next } : d))
  }, [])

  // 分类切换
  const handleCategoryTap = (key: string) => {
    if (key === activeCategory) return
    setActiveCategory(key)
  }

  // 点单清单 - 点菜名定位
  const handleOrderItemTap = (item: OrderItem) => {
    setOrderDetailVisible(false)
    setActiveCategory('all')
    setTimeout(() => setScrollToId(`dish-${item.scrollIndex}`), 80)
  }

  // 推荐卡点击定位
  const handleRecommendationTap = (dishIndex: number) => {
    setActiveCategory('all')
    setTimeout(() => setScrollToId(`dish-${dishIndex}`), 80)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FFF8F3]">
        <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!record) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FFF8F3]">
        <span className="text-5xl mb-4">🍽️</span>
        <p className="text-gray-500 mb-4">记录不存在</p>
        <button onClick={() => router.push('/')} className="text-orange-500 text-sm font-medium">返回首页</button>
      </div>
    )
  }

  const collapsedCategories = categories.slice(0, 5) // 全部 + 前4个

  return (
    <div className="flex flex-col min-h-screen bg-[#FFF8F3]">
      {/* 顶部 */}
      <div className="bg-white px-4 pt-12 pb-3 flex items-center gap-3 border-b border-gray-100 sticky top-0 z-20">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-lg flex-shrink-0"
        >
          ‹
        </button>
        <div>
          <h1 className="text-base font-semibold text-gray-900">菜单翻译</h1>
          <p className="text-xs text-gray-400">共 {allDishes.length} 道菜</p>
        </div>
      </div>

      {/* 分类标签栏 */}
      {categories.length > 1 && (
        <div className="bg-white px-4 py-2.5 border-b border-gray-50 sticky top-[72px] z-10">
          {!categoryExpanded ? (
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5 flex-1 overflow-hidden">
                {collapsedCategories.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => handleCategoryTap(cat.key)}
                    className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors
                      ${activeCategory === cat.key
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-500 active:bg-gray-200'
                      }`}
                  >
                    {cat.label}（{cat.count}）
                  </button>
                ))}
              </div>
              {categories.length > 5 && (
                <button
                  onClick={() => setCategoryExpanded(true)}
                  className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-500 flex items-center gap-0.5"
                >
                  展开 ▾
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => handleCategoryTap(cat.key)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors
                    ${activeCategory === cat.key
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-500 active:bg-gray-200'
                    }`}
                >
                  {cat.label}（{cat.count}）
                </button>
              ))}
              <button
                onClick={() => setCategoryExpanded(false)}
                className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-500 flex items-center gap-0.5"
              >
                收起 ▴
              </button>
            </div>
          )}
        </div>
      )}

      {/* 菜单过长提示 */}
      {record.menuTooLong && (
        <div className="mx-4 mt-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-start gap-2">
          <span className="text-amber-400 flex-shrink-0">⚠️</span>
          <p className="text-xs text-amber-700 leading-relaxed">
            菜单内容较多，仅展示了部分菜品。建议分页拍摄以获得完整识别。
          </p>
        </div>
      )}

      {/* 菜品列表 */}
      <div className="flex-1 px-4 pt-3 pb-32">
        {visibleDishes.map((dish, i) => {
          const realIndex = allDishes.findIndex((d) => d.key === dish.key)
          return (
            <DishCard
              key={dish.key}
              dish={dish}
              index={realIndex}
              onToggle={handleToggle}
              onAdd={handleAdd}
              onDecrease={handleDecrease}
            />
          )
        })}

        {/* 推荐卡 */}
        {record.recommendations && record.recommendations.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4 mt-2">
            <p className="text-sm font-semibold text-gray-800 mb-3">⭐ 本次推荐</p>
            <div className="space-y-3">
              {record.recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="cursor-pointer active:opacity-70"
                  onClick={() => handleRecommendationTap(rec.dishIndex)}
                >
                  <p className="text-sm font-medium text-orange-500">{rec.dishName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{rec.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 点单汇总栏（固定底部，有点单时显示） */}
      {orderSummary.showOrderBar ? (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-30">
          <div className="mx-4 mb-4 bg-gray-900 rounded-2xl overflow-hidden shadow-xl">
            <div className="flex items-stretch">
              <button
                className="flex-1 px-4 py-3.5 text-left"
                onClick={() => setOrderDetailVisible(!orderDetailVisible)}
              >
                <p className="text-white text-sm font-semibold">点单汇总</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  菜品 {orderSummary.orderDishCount} 道 · 份数 {orderSummary.orderItemCount} · {orderSummary.orderAmountText}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">点击可查看已点菜品</p>
              </button>
              <button
                onClick={() => router.push('/')}
                className="bg-orange-500 px-4 text-white text-sm font-medium active:bg-orange-600 flex-shrink-0"
              >
                再拍<br />一张
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-30">
          <div className="px-4 pb-6 pt-2 bg-gradient-to-t from-[#FFF8F3] to-transparent">
            <button
              onClick={() => router.push('/')}
              className="w-full py-3.5 bg-orange-500 text-white rounded-2xl font-medium text-base shadow-sm active:bg-orange-600"
            >
              再拍一张
            </button>
          </div>
        </div>
      )}

      {/* 点单清单浮层 */}
      {orderDetailVisible && (
        <div
          className="fixed inset-0 z-40 bg-black/50 flex items-end"
          onClick={() => setOrderDetailVisible(false)}
        >
          <div
            className="w-full max-w-md mx-auto bg-white rounded-t-3xl max-h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <p className="text-base font-semibold text-gray-900">将要点的菜</p>
              <button onClick={() => setOrderDetailVisible(false)} className="text-sm text-gray-400 px-2 py-1">关闭</button>
            </div>
            <div className="overflow-y-auto flex-1">
              {orderSummary.orderListItems.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center px-5 py-3 border-b border-gray-50 active:bg-gray-50 cursor-pointer"
                  onClick={() => handleOrderItemTap(item)}
                >
                  <p className="flex-1 text-sm text-gray-800 font-medium truncate">{item.name}</p>
                  <div
                    className="flex items-center gap-1 flex-shrink-0 ml-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-sm text-gray-400 mr-2">{item.price}</span>
                    <button
                      onClick={(e) => handleDecrease(item.key, e)}
                      className="w-6 h-6 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center text-sm font-medium"
                    >−</button>
                    <span className="w-6 text-center text-sm font-semibold text-orange-500">{item.count}</span>
                    <button
                      onClick={(e) => handleAdd(item.key, e)}
                      className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-medium"
                    >+</button>
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
