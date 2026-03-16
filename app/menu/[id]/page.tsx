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

// ── DishCard ─────────────────────────────────────────────────────────
function DishCard({ dish, index, isNew, onToggle, onAdd, onDecrease }: {
  dish: MenuDish; index: number; isNew: boolean
  onToggle: (index: number) => void
  onAdd: (key: string, e: React.MouseEvent) => void
  onDecrease: (key: string, e: React.MouseEvent) => void
}) {
  const detail = dish.detail
  const hasOrder = dish.orderCount > 0

  return (
    <div
      id={`dish-${index}`}
      className={`rounded-[20px] overflow-hidden mb-2.5 ${isNew ? 'animate-[fadeSlideIn_0.45s_var(--spring-soft)_forwards]' : ''}`}
      style={{
        background: 'rgba(255,255,255,0.90)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: hasOrder
          ? '0 4px 20px rgba(255,107,0,0.12), 0 1px 4px rgba(0,0,0,0.04)'
          : 'var(--shadow-sm)',
        border: hasOrder ? '1px solid rgba(255,107,0,0.18)' : '1px solid rgba(255,255,255,0.7)',
        transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
      }}
    >
      {/* Header row */}
      <div className="p-4 cursor-pointer active:opacity-80 transition-opacity" onClick={() => onToggle(index)}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[15px] text-gray-800 font-semibold leading-tight flex-1 min-w-0 tracking-tight">
                {dish.originalName}
              </p>
              {detail?.price && (
                <span className="font-bold text-sm flex-shrink-0" style={{ color: 'var(--orange)' }}>
                  {detail.price}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <p className="text-xs text-gray-400 flex-1 min-w-0 truncate">{dish.briefCN}</p>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: 'rgba(255,107,0,0.08)', color: 'var(--orange)' }}>
                {dish.category}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action row */}
      <div className="px-4 pb-3.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => onToggle(index)}>
          <span className={`text-gray-300 text-[10px] transition-transform duration-300 ${dish.expanded ? 'rotate-180' : ''}`}>▼</span>
          <span className="text-xs text-gray-400">{dish.expanded ? '收起介绍' : '查看菜品介绍'}</span>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={(e) => onDecrease(dish.key, e)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-base font-medium transition-all duration-150"
            style={{
              background: hasOrder ? 'rgba(255,107,0,0.12)' : '#F2F2F7',
              color: hasOrder ? 'var(--orange)' : '#C7C7CC',
            }}>
            −
          </button>
          <span className="w-7 text-center text-sm font-bold transition-colors"
            style={{ color: hasOrder ? 'var(--orange)' : '#C7C7CC' }}>
            {dish.orderCount}
          </span>
          <button onClick={(e) => onAdd(dish.key, e)}
            className="w-7 h-7 rounded-full text-white flex items-center justify-center text-base font-medium active:opacity-80 transition-opacity pressable"
            style={{ background: 'var(--orange)', boxShadow: '0 2px 8px rgba(255,107,0,0.35)' }}>
            +
          </button>
        </div>
      </div>

      {/* Expandable detail — CSS grid height trick */}
      <div className={`dish-expand-grid ${dish.expanded ? 'expanded' : ''}`}>
        <div className="dish-expand-inner">
          {detail && (
            <div className="px-4 pb-4 pt-3 space-y-3"
              style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
              {(detail.introduction || detail.description) && (
                <div>
                  <p className="text-[11px] text-gray-400 font-semibold mb-1 uppercase tracking-wide">菜品介绍</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{detail.introduction || detail.description}</p>
                </div>
              )}
              {detail.flavor && (
                <div>
                  <p className="text-[11px] text-gray-400 font-semibold mb-1 uppercase tracking-wide">风味口感</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{detail.flavor}</p>
                </div>
              )}
              {detail.ingredients && detail.ingredients.length > 0 && (
                <div>
                  <p className="text-[11px] text-gray-400 font-semibold mb-1.5 uppercase tracking-wide">核心食材</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.ingredients.map((ing, i) => (
                      <span key={i} className="text-xs text-gray-500 px-2.5 py-1 rounded-full"
                        style={{ background: '#F2F2F7' }}>
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {detail.recommendation && (
                <div>
                  <p className="text-[11px] text-gray-400 font-semibold mb-1 uppercase tracking-wide">推荐理由</p>
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
      </div>
    </div>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────
function DishSkeleton() {
  return (
    <div className="rounded-[20px] p-4 mb-2.5 animate-pulse"
      style={{ background: 'rgba(255,255,255,0.7)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 space-y-2.5">
          <div className="h-4 rounded-full w-3/4" style={{ background: 'rgba(0,0,0,0.06)' }} />
          <div className="h-3 rounded-full w-1/2" style={{ background: 'rgba(0,0,0,0.04)' }} />
        </div>
        <div className="h-4 rounded-full w-12" style={{ background: 'rgba(255,107,0,0.08)' }} />
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────
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

        if (existing) {
          return { ...existing, detail }
        }

        return {
          ...d, key,
          category: inferDishCategory(d),
          orderCount: orderMapRef.current.get(key) || 0,
          expanded: false,
          detail,
        }
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

      const streamState = getStreamingState()
      if (streamState.status === 'streaming' && streamState.recordId === id) {
        setIsStreaming(true)
        applyDishes(completeOnly(streamState.dishes))
        prevDishCountRef.current = streamState.dishes.length
      } else if (streamState.status === 'done' && streamState.recordId === id && streamState.dishes.length > 0) {
        applyDishes(streamState.dishes)
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
    if (s.recordId === recordId && s.status === 'streaming') {
      setIsStreaming(true)
    }

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

      {/* Sticky header */}
      <div className="px-4 pt-14 pb-3 flex items-center gap-3 sticky top-0 z-20"
        style={{
          background: 'rgba(242,242,247,0.85)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderBottom: '1px solid rgba(0,0,0,0.05)',
        }}>
        <button onClick={() => router.back()}
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 text-lg flex-shrink-0 pressable"
          style={{ background: 'rgba(0,0,0,0.06)' }}>
          ‹
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-[15px] font-semibold text-gray-900 tracking-tight">菜单翻译</h1>
            {isStreaming && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ color: 'var(--orange)', background: 'rgba(255,107,0,0.08)' }}>
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

      {/* Category tabs */}
      {categories.length > 1 && (
        <div className="px-4 py-2.5 sticky top-[72px] z-10"
          style={{
            background: 'rgba(242,242,247,0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(0,0,0,0.04)',
          }}>
          {!categoryExpanded ? (
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5 flex-1 overflow-hidden">
                {categories.slice(0, 5).map((cat) => (
                  <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
                    className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-all duration-200 pressable"
                    style={activeCategory === cat.key ? {
                      background: 'var(--orange)',
                      color: 'white',
                      boxShadow: '0 2px 8px rgba(255,107,0,0.35)',
                    } : {
                      background: 'rgba(0,0,0,0.06)',
                      color: '#6B6B6B',
                    }}>
                    {cat.label}（{cat.count}）
                  </button>
                ))}
              </div>
              {categories.length > 5 && (
                <button onClick={() => setCategoryExpanded(true)}
                  className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full pressable"
                  style={{ background: 'rgba(0,0,0,0.06)', color: '#6B6B6B' }}>
                  展开 ▾
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
                  className="text-xs px-3 py-1.5 rounded-full font-medium transition-all duration-200 pressable"
                  style={activeCategory === cat.key ? {
                    background: 'var(--orange)',
                    color: 'white',
                    boxShadow: '0 2px 8px rgba(255,107,0,0.35)',
                  } : {
                    background: 'rgba(0,0,0,0.06)',
                    color: '#6B6B6B',
                  }}>
                  {cat.label}（{cat.count}）
                </button>
              ))}
              <button onClick={() => setCategoryExpanded(false)}
                className="text-xs px-3 py-1.5 rounded-full pressable"
                style={{ background: 'rgba(0,0,0,0.06)', color: '#6B6B6B' }}>
                收起 ▴
              </button>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 px-4 pt-3 pb-32">

        {streamErrMsg && (
          <div className="mb-3 rounded-2xl px-4 py-3 flex items-start gap-2 animate-[fadeSlideIn_0.3s_ease_forwards]"
            style={{ background: 'rgba(255,196,0,0.1)', border: '1px solid rgba(255,196,0,0.2)' }}>
            <span className="flex-shrink-0">⚠️</span>
            <p className="text-xs text-amber-700">{streamErrMsg}，已展示部分菜品。</p>
          </div>
        )}

        {finalRecord?.menuTooLong && !isStreaming && (
          <div className="mb-3 rounded-2xl px-4 py-3 flex items-start gap-2 animate-[fadeSlideIn_0.3s_ease_forwards]"
            style={{ background: 'rgba(255,196,0,0.1)', border: '1px solid rgba(255,196,0,0.2)' }}>
            <span className="flex-shrink-0">⚠️</span>
            <p className="text-xs text-amber-700 leading-relaxed">菜单内容较多，仅展示了部分菜品。建议分页拍摄以获得完整识别。</p>
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
          <>
            <DishSkeleton />
            <DishSkeleton />
            <DishSkeleton />
          </>
        )}

        {isStreaming && allDishes.length > 0 && (
          <div className="flex items-center gap-2 py-3 px-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="loading-dot w-1.5 h-1.5 rounded-full"
                style={{ background: 'var(--orange)' }} />
            ))}
            <span className="text-xs text-gray-400">正在识别更多菜品...</span>
          </div>
        )}

        {!isStreaming && allDishes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24">
            <span className="text-5xl mb-4">🍽️</span>
            <p className="text-gray-400 text-sm">暂无菜品信息</p>
          </div>
        )}
        <div className="h-2" />
      </div>

      {/* Order bar */}
      {orderSummary.showOrderBar ? (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-30 animate-[barSlideUp_0.4s_var(--spring-soft)_forwards]">
          <div className="mx-4 mb-5 rounded-[20px] overflow-hidden" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.20)' }}>
            <div className="flex items-stretch" style={{ background: '#1C1C1E' }}>
              <button className="flex-1 px-4 py-3.5 text-left" onClick={() => setOrderDetailVisible(!orderDetailVisible)}>
                <p className="text-white text-sm font-semibold tracking-tight">点单汇总</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {orderSummary.orderDishCount} 道 · {orderSummary.orderItemCount} 份 · {orderSummary.orderAmountText}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">点击查看已点菜品</p>
              </button>
              <button onClick={() => router.push('/')}
                className="px-4 text-white text-sm font-semibold active:opacity-80 transition-opacity flex-shrink-0 flex flex-col items-center justify-center"
                style={{ background: 'var(--orange)' }}>
                再拍<br />一张
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-30">
          <div className="px-4 pb-6 pt-3" style={{ background: 'linear-gradient(to top, #F2F2F7 60%, transparent)' }}>
            <button onClick={() => router.push('/')}
              className="w-full py-3.5 text-white rounded-[16px] font-semibold text-base active:opacity-80 transition-opacity pressable"
              style={{ background: 'linear-gradient(135deg, #FF8C2F, #FF6B00)', boxShadow: '0 4px 20px rgba(255,107,0,0.4)' }}>
              再拍一张
            </button>
          </div>
        </div>
      )}

      {/* Order detail panel */}
      {orderDetailVisible && (
        <div className="fixed inset-0 z-40 flex items-end animate-[fadeIn_0.2s_ease_forwards]"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setOrderDetailVisible(false)}>
          <div className="w-full max-w-md mx-auto rounded-t-[28px] max-h-[70vh] flex flex-col animate-[slideUp_0.35s_var(--spring-soft)_forwards]"
            style={{ background: 'white' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3"
              style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <p className="text-base font-semibold text-gray-900">将要点的菜</p>
              <button onClick={() => setOrderDetailVisible(false)}
                className="text-sm text-gray-400 px-2 py-1 rounded-full active:bg-gray-100">
                关闭
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {orderSummary.orderListItems.map((item) => (
                <div key={item.key}
                  className="flex items-center px-5 py-3.5 active:bg-gray-50 cursor-pointer"
                  style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}
                  onClick={() => handleOrderItemTap(item)}>
                  <p className="flex-1 text-sm text-gray-800 font-medium truncate">{item.name}</p>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-3" onClick={(e) => e.stopPropagation()}>
                    <span className="text-sm text-gray-400 mr-2">{item.price}</span>
                    <button onClick={(e) => handleDecrease(item.key, e)}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium pressable"
                      style={{ background: 'rgba(255,107,0,0.1)', color: 'var(--orange)' }}>
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-bold" style={{ color: 'var(--orange)' }}>{item.count}</span>
                    <button onClick={(e) => handleAdd(item.key, e)}
                      className="w-6 h-6 rounded-full text-white flex items-center justify-center text-sm font-medium pressable"
                      style={{ background: 'var(--orange)' }}>
                      +
                    </button>
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
