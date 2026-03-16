/**
 * 模块级流式状态 —— 跨页面共享，不随组件卸载而销毁。
 * 首页发起 SSE → 第一道菜到来时跳转菜单页 → 流继续后台读取 → 菜单页订阅更新。
 */
import type { Dish } from './types'

export type StreamStatus = 'idle' | 'streaming' | 'done' | 'error'

interface StreamingState {
  status: StreamStatus
  recordId: string | null
  dishes: Dish[]
  error: string | null
}

let _state: StreamingState = {
  status: 'idle',
  recordId: null,
  dishes: [],
  error: null,
}

const _listeners = new Set<() => void>()

export function getStreamingState(): StreamingState {
  return _state
}

export function subscribeStreaming(fn: () => void): () => void {
  _listeners.add(fn)
  return () => { _listeners.delete(fn) }
}

function _notify() {
  _listeners.forEach((fn) => fn())
}

export function streamStart(recordId: string, initialDishes: Dish[]) {
  _state = { status: 'streaming', recordId, dishes: initialDishes, error: null }
  _notify()
}

export function streamUpdate(dishes: Dish[]) {
  if (_state.status !== 'streaming') return
  _state = { ..._state, dishes }
  _notify()
}

export function streamDone(dishes: Dish[]) {
  _state = { ..._state, status: 'done', dishes }
  _notify()
}

export function streamError(error: string) {
  _state = { ..._state, status: 'error', error }
  _notify()
}

export function streamReset() {
  _state = { status: 'idle', recordId: null, dishes: [], error: null }
}
