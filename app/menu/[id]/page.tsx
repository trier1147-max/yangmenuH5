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

// ── Types ────────────────────────────────────────────────────────────
interface MenuDish extends Dish {
  key: string
  category: string
  orderCount: number
  expanded: boolean
}
interface Category { key: string; label: string; count: number }
interface OrderItem { key: string; name: string; price: string; count: number; scrollIndex: number }

// ── Helpers ──────────────────────────────────────────────────────────
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
  return { orderDishCount: selected.length, orderItemCount, orderAmountText, orderListItems, showOrderBar: orderItemCount >= 1 }
}

// ── DishCard ─────────────────────────────────────────────────────────
function DishCard({ dish, index, isNew, onToggle, onAdd, onDecrease }: {
  dish: MenuDish; index: number; isNew: boolean
  onToggle: (i: number) => void
  onAdd: (key: string, e: React.MouseEvent) => void
  onDecrease: (key: string, e: React.MouseEvent) => void
}) {
  const detail = dish.detail
  const hasOrder = dish.orderCount > 0

  return (
    <div
      id={`dish-${index}`}
      className={`rounded-[18px] overflow-hidden mb-2 ${isNew ? 'animate-[fadeSlideIn_0.40s_var(--spring-soft)_forwards]' : ''}`}
      style={{
        background: 'rgba(255,255,255,0.92)',
        border: hasOrder ? '0.5px solid rgba(255,107,0,0.22)' : '0.5px solid rgba(255,255,255,0.65)',
        boxShadow: hasOrder
          ? '0 2px 12px rgba(255,107,0,0.10), 0 1px 3px rgba(0,0,0,0.04)'
          : 'var(--shadow-xs)',
        transition: 'box-shadow 0.20s ease, border-color 0.20s ease',
      }}
    >
      {/* Top: name, price, category */}
      <div className="px-4 pt-3.5 pb-2 cursor-pointer active:opacity-75 transition-opacity"
        onClick={() => onToggle(index)}>
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-gray-900 leading-snug tracking-tight">
              {dish.originalName}
            </p>
            <p className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--label-secondary)' }}>
              {dish.briefCN}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0 pt-0.5">
            {detail?.price && (
              <span className="text-[14px] font-bold" style={{ color: 'var(--orange)' }}>{detail.price}</span>
            )}
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: 'var(--orange-soft)', color: 'var(--orange)' }}>
              {dish.category}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom: expand toggle + stepper */}
      <div className="px-4 pb-3 flex items-center justify-between">
        <button className="flex items-center gap-1.5 py-1 -ml-0.5" onClick={() => onToggle(index)}>
          <svg
            className="w-3 h-3 transition-transform duration-250"
            style={{
              transform: dish.expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              color: 'var(--label-tertiary)',
            }}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[12px]" style={{ color: 'var(--label-tertiary)' }}>
            {dish.expanded ? '收起' : '菜品介绍'}
          </span>
        </button>

        {/* Stepper */}
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => onDecrease(dish.key, e)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[16px] font-medium pressable"
            style={{
              background: hasOrder ? 'var(--orange-soft)' : 'var(--fill-tertiary)',
              color: hasOrder ? 'var(--orange)' : 'var(--label-quaternary)',
            }}>
            −
          </button>
          <span className="w-6 text-center text-[14px] font-bold"
            style={{ color: hasOrder ? 'var(--orange)' : 'var(--label-quaternary)' }}>
            {dish.orderCount}
          </span>
          <button
            onClick={(e) => onAdd(dish.key, e)}
            className="w-7 h-7 rounded-full text-white flex items-center justify-center text-[16px] font-medium pressable"
            style={{
              background: 'var(--orange)',
              boxShadow: '0 2px 8px rgba(255,107,0,0.32)',
            }}>
            +
          </button>
        </div>
      </div>

      {/* Expandable detail — CSS grid height transition */}
      <div className={`dish-expand-grid ${dish.expanded ? 'expanded' : ''}`}>
        <div className="dish-expand-inner">
          {detail && (
            <div className="px-4 pt-3 pb-4 space-y-3"
              style={{ borderTop: '0.5px solid var(--separator-thin)' }}>
              {(detail.introduction || detail.description) && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-1"
                    style={{ color: 'var(--label-tertiary)' }}>菜品介绍</p>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'var(--label-secondary)' }}>
                    {detail.introduction || detail.description}
                  </p>
                </div>
              )}
              {detail.flavor && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-1"
                    style={{ color: 'var(--label-tertiary)' }}>风味口感</p>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'var(--label-secondary)' }}>
                    {detail.flavor}
                  </p>
                </div>
              )}
              {detail.ingredients && detail.ingredients.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-2"
                    style={{ color: 'var(--label-tertiary)' }}>核心食材</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.ingredients.map((ing, i) => (
                      <span key={i} className="text-[12px] px-2.5 py-0.5 rounded-full"
                        style={{ background: 'var(--fill-tertiary)', color: 'var(--label-secondary)' }}>
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {detail.recommendation && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-1"
                    style={{ color: 'var(--label-tertiary)' }}>推荐理由</p>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'var(--label-secondary)' }}>
                    {detail.recommendation}
                  </p>
                </div>
              )}
              {detail.options && detail.options.length > 0 && (
                <div className="space-y-1">
                  {detail.options.map((opt, i) => (
                    <p key={i} className="text-[13px]" style={{ color: 'var(--label-secondary)' }}>
                      <span style={{ color: 'var(--label-tertiary)' }}>{opt.group}（{opt.rule}）：</span>
                      {opt.choices.join(' / ')}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────
function DishSkeleton() {
  return (
    <div className="rounded-[18px] p-4 mb-2 animate-pulse"
      style={{ background: 'rgba(255,255,255,0.80)', boxShadow: 'var(--shadow-xs)' }}>
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 space-y-2">
          <div className="h-[15px] rounded-full w-3/4" style={{ background: 'var(--fill-secondary)' }} />
          <div className="h-[11px] rounded-full w-1/2" style={{ background: 'var(--fill-tertiary)' }} />
        </div>
        <div className="h-[14px] rounded-full w-10" style={{ background: 'var(--orange-softer)' }} />
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────
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
  const [streamErrMsg, setStreamErrMsg] = useState('')
  const [newDishKeys, setNewDishKeys] = useState<Set<string>>(new Set())

  const orderMapRef = useRef<Map<string, number>>(new Map())
  const rawDetailMapRef = useRef<Map<string, Dish['detail']>>(new Map())
  const expandedKeysRef = useRef<Set<string>>(new Set())
  const prevDishCountRef = useRef(0)

  const orderSummary = computeOrderSummary(allDishes)
  const visibleDishes = filterByCategory(allDishes, activeCategory)

  const applyDishes = useCallback((rawDishes: Dish[]) => {
    setAllDishes((prev) => {
      const menuCurrencySymbol = detectMenuCurrencySymbol(rawDishes)
      const updated = rawDishes.map((d, index) => {
        const key = getDishKey(d, index)
        const existing = prev.find((p) => p.key === key)
        const isExpanded = existing?.expanded ?? expandedKeysRef.current.has(key)
        const detail = normalizeDishDetail(d.detail, menuCurrencySymbol)

        if (isExpanded) {
          detail.ingredients = normalizeIngredients(d.detail?.ingredients)
          detail.options = normalizeOptionGroups(d.detail?.options)
        } else {
          if (d.detail) rawDetailMapRef.current.set(key, d.detail)
          detail.ingredients = []
          detail.options = []
        }

        if (existing) return { ...existing, detail }

        return { ...d, key, category: inferDishCategory(d), orderCount: orderMapRef.current.get(key) || 0, expanded: false, detail }
      })

      const newKeys = new Set(updated.slice(prev.length).map((d) => d.key))
      if (newKeys.size > 0) {
        setNewDishKeys((old) => new Set([...old, ...newKeys]))
        setTimeout(() => setNewDishKeys((old) => {
          const next = new Set(old)
          newKeys.forEach((k) => next.delete(k))
          return next
        }), 700)
      }

      setCategories(buildCategories(updated))
      return updated
    })
  }, [])

  const completeOnly = (dishes: Dish[]) =>
    dishes.filter((d) => d.detail?.description || d.detail?.flavor || d.detail?.recommendation)

  useEffect(() => {
    params.then((p) => {
      const id = p.id
      setRecordId(id)
      const s = getStreamingState()
      if (s.status === 'streaming' && s.recordId === id) {
        setIsStreaming(true)
        applyDishes(completeOnly(s.dishes))
        prevDishCountRef.current = s.dishes.length
      } else if (s.status === 'done' && s.recordId === id && s.dishes.length > 0) {
        applyDishes(s.dishes)
      } else {
        const r = getRecord(id)
        setRecord(r)
        if (r) applyDishes(r.dishes)
      }
    })
  }, [params, applyDishes])

  useEffect(() => {
    if (!recordId) return
    const unsub = subscribeStreaming(() => {
      const s = getStreamingState()
      if (s.recordId !== recordId) return
      if (s.status === 'streaming') {
        applyDishes(completeOnly(s.dishes))
        prevDishCountRef.current = s.dishes.length
      } else if (s.status === 'done') {
        applyDishes(s.dishes)
        setIsStreaming(false)
        const r = getRecord(recordId)
        if (r) setRecord(r)
      } else if (s.status === 'error') {
        setIsStreaming(false)
        setStreamErrMsg(s.error || '识别出错')
      }
    })
    const s = getStreamingState()
    if (s.recordId === recordId && s.status === 'streaming') setIsStreaming(true)
    return unsub
  }, [recordId, applyDishes])

  useEffect(() => {
    if (!scrollToId) return
    const el = document.getElementById(scrollToId)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const t = setTimeout(() => setScrollToId(''), 600)
    return () => clearTimeout(t)
  }, [scrollToId])

  const handleToggle = useCallback((index: number) => {
    setAllDishes((prev) => {
      const dish = prev[index]
      if (!dish) return prev
      const key = dish.key
      const nextExpanded = !dish.expanded
      if (nextExpanded) {
        expandedKeysRef.current.add(key)
        const rawDetail = rawDetailMapRef.current.get(key)
        if (rawDetail && !dish.detail?.ingredients?.length) {
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

  const finalRecord = record ?? (recordId ? getRecord(recordId) : null)

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#F2F2F7' }}>

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 pt-safe pb-0"
        style={{
          background: 'rgba(242,242,247,0.88)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          borderBottom: '0.5px solid var(--separator-thin)',
        }}>
        <div className="flex items-center gap-3 px-4 pb-3">
          <button onClick={() => router.back()}
            className="w-8 h-8 rounded-full flex items-center justify-center pressable flex-shrink-0"
            style={{ background: 'var(--fill-secondary)' }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}
              style={{ color: 'var(--label-secondary)' }}>
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[16px] font-semibold text-gray-900 tracking-tight">菜单翻译</h1>
              {isStreaming && (
                <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ color: 'var(--orange)', background: 'var(--orange-soft)' }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block"
                    style={{ background: 'var(--orange)' }} />
                  识别中
                </span>
              )}
            </div>
            <p className="text-[12px]" style={{ color: 'var(--label-tertiary)' }}>
              {isStreaming ? `已识别 ${allDishes.length} 道` : `共 ${allDishes.length} 道菜`}
            </p>
          </div>
        </div>

        {/* Category tabs — horizontally scrollable */}
        {categories.length > 1 && (
          <div className="px-4 pb-2.5">
            {!categoryExpanded ? (
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none"
                style={{ scrollbarWidth: 'none' }}>
                {categories.slice(0, 6).map((cat) => (
                  <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
                    className="flex-shrink-0 text-[12px] px-3 py-1.5 rounded-full font-medium pressable transition-all duration-150"
                    style={activeCategory === cat.key ? {
                      background: 'var(--orange)',
                      color: 'white',
                      boxShadow: '0 2px 8px rgba(255,107,0,0.32)',
                    } : {
                      background: 'var(--fill-secondary)',
                      color: 'var(--label-secondary)',
                    }}>
                    {cat.label}({cat.count})
                  </button>
                ))}
                {categories.length > 6 && (
                  <button onClick={() => setCategoryExpanded(true)}
                    className="flex-shrink-0 text-[12px] px-3 py-1.5 rounded-full pressable"
                    style={{ background: 'var(--fill-secondary)', color: 'var(--label-secondary)' }}>
                    更多 ▾
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
                    className="text-[12px] px-3 py-1.5 rounded-full font-medium pressable transition-all duration-150"
                    style={activeCategory === cat.key ? {
                      background: 'var(--orange)',
                      color: 'white',
                      boxShadow: '0 2px 8px rgba(255,107,0,0.32)',
                    } : {
                      background: 'var(--fill-secondary)',
                      color: 'var(--label-secondary)',
                    }}>
                    {cat.label}({cat.count})
                  </button>
                ))}
                <button onClick={() => setCategoryExpanded(false)}
                  className="text-[12px] px-3 py-1.5 rounded-full pressable"
                  style={{ background: 'var(--fill-secondary)', color: 'var(--label-secondary)' }}>
                  收起 ▴
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 px-4 pt-3 pb-32">

        {streamErrMsg && (
          <div className="mb-3 px-4 py-3 rounded-[14px] flex items-start gap-2 animate-[fadeSlideIn_0.3s_ease_forwards]"
            style={{ background: 'rgba(255,196,0,0.10)', border: '0.5px solid rgba(255,196,0,0.22)' }}>
            <span className="flex-shrink-0 text-[14px]">⚠️</span>
            <p className="text-[12px]" style={{ color: '#7A5E00' }}>{streamErrMsg}，已展示部分菜品。</p>
          </div>
        )}

        {finalRecord?.menuTooLong && !isStreaming && (
          <div className="mb-3 px-4 py-3 rounded-[14px] flex items-start gap-2 animate-[fadeSlideIn_0.3s_ease_forwards]"
            style={{ background: 'rgba(255,196,0,0.10)', border: '0.5px solid rgba(255,196,0,0.22)' }}>
            <span className="flex-shrink-0 text-[14px]">⚠️</span>
            <p className="text-[12px] leading-relaxed" style={{ color: '#7A5E00' }}>
              菜单内容较多，仅展示了部分菜品。建议分页拍摄以获得完整识别。
            </p>
          </div>
        )}

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

        {isStreaming && allDishes.length < 3 && (
          <><DishSkeleton /><DishSkeleton /><DishSkeleton /></>
        )}

        {isStreaming && allDishes.length > 0 && (
          <div className="flex items-center gap-2 py-3 px-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="loading-dot w-1.5 h-1.5 rounded-full"
                style={{ background: 'var(--orange)' }} />
            ))}
            <span className="text-[12px]" style={{ color: 'var(--label-tertiary)' }}>
              正在识别更多菜品...
            </span>
          </div>
        )}

        {!isStreaming && allDishes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24">
            <span className="text-5xl mb-4">🍽️</span>
            <p className="text-[14px]" style={{ color: 'var(--label-tertiary)' }}>暂无菜品信息</p>
          </div>
        )}
      </div>

      {/* ── Order bar ── */}
      {orderSummary.showOrderBar ? (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-30
          animate-[barSlideUp_0.36s_var(--spring-soft)_forwards]">
          <div className="mx-4 mb-5 rounded-[20px] overflow-hidden"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)' }}>
            <div className="flex items-stretch" style={{ background: '#1C1C1E' }}>
              {/* Cart icon + summary */}
              <button className="flex-1 px-4 py-3.5 text-left flex items-center gap-3"
                onClick={() => setOrderDetailVisible(!orderDetailVisible)}>
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-[12px] flex items-center justify-center"
                    style={{ background: 'var(--orange)' }}>
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth={1.8}>
                      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M3 6h18" strokeLinecap="round" />
                      <path d="M16 10a4 4 0 01-8 0" strokeLinecap="round" />
                    </svg>
                  </div>
                  {/* badge */}
                  <div className="absolute -top-1 -right-1 w-4.5 h-4.5 min-w-[18px] px-1 rounded-full
                    flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: '#FF3B30', fontSize: 10 }}>
                    {orderSummary.orderItemCount}
                  </div>
                </div>
                <div>
                  <p className="text-white text-[14px] font-semibold leading-none mb-0.5">
                    {orderSummary.orderAmountText}
                  </p>
                  <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {orderSummary.orderDishCount} 道菜 · 点击查看详情
                  </p>
                </div>
              </button>
              <button onClick={() => router.push('/')}
                className="px-5 text-white text-[13px] font-semibold active:opacity-80 transition-opacity flex-shrink-0 flex flex-col items-center justify-center gap-0.5"
                style={{ background: 'rgba(255,255,255,0.10)', borderLeft: '0.5px solid rgba(255,255,255,0.08)' }}>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span>再拍</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-30">
          <div className="px-4 pb-safe pt-2"
            style={{ background: 'linear-gradient(to top, #F2F2F7 50%, transparent)' }}>
            <button onClick={() => router.push('/')}
              className="w-full py-3.5 text-white rounded-[16px] font-semibold text-[16px] pressable"
              style={{
                background: 'linear-gradient(135deg, #FF8C2F, #FF6B00)',
                boxShadow: '0 4px 20px rgba(255,107,0,0.40)',
              }}>
              再拍一张
            </button>
          </div>
        </div>
      )}

      {/* ── Order detail bottom sheet ── */}
      {orderDetailVisible && (
        <div className="fixed inset-0 z-40 flex items-end animate-[fadeIn_0.18s_ease_forwards]"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
          onClick={() => setOrderDetailVisible(false)}>
          <div className="w-full max-w-md mx-auto rounded-t-[28px] max-h-[70vh] flex flex-col
            animate-[slideUp_0.30s_var(--spring-soft)_forwards]"
            style={{ background: 'rgba(242,242,247,0.97)' }}
            onClick={(e) => e.stopPropagation()}>
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 rounded-full" style={{ background: 'var(--separator-opaque)' }} />
            </div>
            <div className="flex items-center justify-between px-5 pt-2 pb-3.5"
              style={{ borderBottom: '0.5px solid var(--separator-thin)' }}>
              <p className="text-[16px] font-semibold text-gray-900">将要点的菜</p>
              <button onClick={() => setOrderDetailVisible(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center pressable"
                style={{ background: 'var(--fill-secondary)' }}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                  style={{ color: 'var(--label-secondary)' }}>
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 pb-safe">
              {orderSummary.orderListItems.map((item, idx) => (
                <div key={item.key}
                  className="relative flex items-center px-5 py-3.5 active:bg-black/[0.04] cursor-pointer"
                  onClick={() => handleOrderItemTap(item)}>
                  {idx > 0 && (
                    <div className="absolute top-0 left-5 right-5 h-[0.5px]"
                      style={{ background: 'var(--separator-thin)' }} />
                  )}
                  <p className="flex-1 text-[14px] font-medium text-gray-800 truncate">{item.name}</p>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3"
                    onClick={(e) => e.stopPropagation()}>
                    <span className="text-[13px] mr-1" style={{ color: 'var(--label-tertiary)' }}>{item.price}</span>
                    <button onClick={(e) => handleDecrease(item.key, e)}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[14px] font-medium pressable"
                      style={{ background: 'var(--orange-soft)', color: 'var(--orange)' }}>−</button>
                    <span className="w-5 text-center text-[14px] font-bold" style={{ color: 'var(--orange)' }}>
                      {item.count}
                    </span>
                    <button onClick={(e) => handleAdd(item.key, e)}
                      className="w-6 h-6 rounded-full text-white flex items-center justify-center text-[14px] font-medium pressable"
                      style={{ background: 'var(--orange)' }}>+</button>
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
