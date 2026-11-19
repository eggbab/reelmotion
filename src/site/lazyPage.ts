import { createElement, lazy } from 'react'
import type { ComponentType } from 'react'

/**
 * 따로 받는 쪽(약관·도움말 글처럼 큰 글이 든 쪽). 미리 받아 두면(preload) 기다리지 않고 바로 그린다 — 미리 그린 HTML 을
 * 이어받기 전(main.tsx)과 빌드 때 미리 그리기 전(entry-server.tsx)에 받아 둔다. 받아 두지 않았으면(다른 쪽에서 링크로 옮겨 올 때)
 * React 가 받는 동안 Suspense 의 자리(PageLoading)를 보인다.
 */
export type LazyPage<P extends object> = ComponentType<P> & { preload: () => Promise<void> }

export function lazyPage<P extends object>(load: () => Promise<ComponentType<P>>): LazyPage<P> {
  let loaded: ComponentType<P> | null = null
  let pending: Promise<void> | null = null
  const preload = () =>
    (pending ??= load().then(
      (component) => {
        loaded = component
      },
      (error: unknown) => {
        // 받지 못했으면(인터넷 끊김) 다음에 다시 받게 한다
        pending = null
        throw error
      },
    ))
  const Lazy = lazy(async () => {
    await preload()
    return { default: loaded! }
  })
  const Page = (props: P) => (loaded ? createElement(loaded, props) : createElement(Lazy, props))
  return Object.assign(Page, { preload })
}
