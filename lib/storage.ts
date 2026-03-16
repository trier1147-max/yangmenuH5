import type { HistoryRecord, Dish } from './types'

const HISTORY_KEY = 'yangmenu_history'
const MAX_HISTORY = 50

export function saveRecord(dishes: Dish[], thumbnail?: string, menuTooLong?: boolean): string {
  const id = Date.now().toString()
  const record: HistoryRecord = {
    id,
    thumbnail,
    dishes,
    createdAt: new Date().toISOString(),
    dishCount: dishes.length,
    menuTooLong,
  }
  const all = getHistory()
  const updated = [record, ...all].slice(0, MAX_HISTORY)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
  return id
}

/** 创建一个占位记录（流式识别开始时调用），返回 id */
export function createStreamingRecord(id: string, thumbnail?: string): void {
  const record: HistoryRecord = {
    id,
    thumbnail,
    dishes: [],
    createdAt: new Date().toISOString(),
    dishCount: 0,
  }
  const all = getHistory()
  const updated = [record, ...all].slice(0, MAX_HISTORY)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
}

/** 更新已有记录的部分字段 */
export function updateRecord(id: string, updates: Partial<HistoryRecord>): void {
  const all = getHistory()
  const idx = all.findIndex((r) => r.id === id)
  if (idx < 0) return
  all[idx] = { ...all[idx], ...updates }
  localStorage.setItem(HISTORY_KEY, JSON.stringify(all))
}

export function getHistory(): HistoryRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    return JSON.parse(raw) as HistoryRecord[]
  } catch {
    return []
  }
}

export function getRecord(id: string): HistoryRecord | null {
  const all = getHistory()
  return all.find(r => r.id === id) ?? null
}

export function deleteRecord(id: string): void {
  const all = getHistory()
  const updated = all.filter(r => r.id !== id)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY)
}

export function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}天前`
  return new Date(isoString).toLocaleDateString('zh-CN')
}
