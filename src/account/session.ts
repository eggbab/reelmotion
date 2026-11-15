import { useSyncExternalStore } from 'react'
import { fetchMe } from './api'
import type { Me } from './api'

/**
 * 로그인 상태를 화면 여기저기(머리·편집기·내 계정)가 함께 쓴다. 처음 쓸 때 한 번 /api/me 를 묻는다.
 * 미리 그린 HTML(서버)에서는 늘 loading — 그래서 화면을 이어받을 때 어긋나지 않고, 물은 뒤에 로그인 단추가 나타난다.
 */
export type SessionState = { status: 'loading' } | { status: 'off' } | { status: 'ready'; me: Me }

let state: SessionState = { status: 'loading' }
let started = false
const listeners = new Set<() => void>()

function set(next: SessionState) {
  state = next
  for (const listener of listeners) listener()
}

/** 다시 묻는다(로그인·로그아웃·탈퇴 뒤). */
export async function refreshSession(): Promise<void> {
  const me = await fetchMe()
  set(me ? { status: 'ready', me } : { status: 'off' })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!started) {
    started = true
    void refreshSession()
  }
  return () => listeners.delete(listener)
}

const SERVER_STATE: SessionState = { status: 'loading' }

export function useSession(): SessionState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE,
  )
}

/** 로그인한 사용자(없으면 null). */
export function currentUser(value: SessionState = state) {
  return value.status === 'ready' ? value.me.user : null
}

/** 로그인 상태를 아직 모르면 물어보고 기다린다(작업을 열 때 계정에서도 찾아보려고). */
export async function sessionReady(): Promise<SessionState> {
  if (state.status === 'loading') {
    started = true
    await refreshSession()
  }
  return state
}
