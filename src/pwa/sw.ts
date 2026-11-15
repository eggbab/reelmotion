/// <reference lib="webworker" />
import { SHELLS, cacheName, isOurCache, pageKey, routeOf, shellFor } from './routes'

/**
 * 서비스 워커: 편집기를 인터넷 없이도 열 수 있게 화면 파일을 브라우저에 둔다. 규칙은 routes.ts(시험이 있다).
 * 빌드할 때 scripts/prerender.mjs 가 맨 앞에 판 이름(__RM_VERSION__)과 미리 받을 파일(__RM_PRECACHE__)을 붙인다.
 * 새 판은 옛 판을 쓰는 창이 모두 닫힌 뒤에 넘겨받는다(skipWaiting 을 부르지 않는다) — 열려 있는 화면이 쓰던 파일을 중간에 지우지 않게.
 * 쪽(HTML)은 네트워크 먼저라 그 전에도 새로 배포한 화면이 보인다. 끄는 법: SW_DISABLE=1 로 빌드(docs/operations.md).
 */
declare const self: ServiceWorkerGlobalScope & { __RM_VERSION__?: string; __RM_PRECACHE__?: string[] }

const CACHE = cacheName(self.__RM_VERSION__ ?? 'dev')
const PRECACHE = self.__RM_PRECACHE__ ?? []
/** 네트워크가 이보다 오래 대답이 없고 캐시에 그 쪽이 있으면 캐시의 것을 먼저 보인다(신호가 아주 약할 때). */
const SLOW_MS = 4000

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      // 하나라도 못 받으면 설치를 그만두고 다음에 다시 한다(반쯤 받은 채로 쓰지 않게).
      await Promise.all(
        [...SHELLS, ...PRECACHE].map(async (url) => {
          const response = await fetch(url, { cache: 'no-cache' })
          if (response.status !== 200) throw new Error(`${url} ${response.status}`)
          await cache.put(url, response)
        }),
      )
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) if (isOurCache(name) && name !== CACHE) await caches.delete(name)
      // 처음 설치한 때에는 열려 있는 화면도 바로 맡는다(다시 열지 않아도 인터넷 없이 쓸 수 있게).
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const route = routeOf(event.request, self.location.origin)
  if (route === 'asset') event.respondWith(asset(event))
  else if (route === 'page') event.respondWith(page(event))
})

/** 이름에 내용 지문이 든 파일: 캐시 먼저, 없으면 받아서 넣는다(다 받은 것만). */
async function asset(event: FetchEvent): Promise<Response> {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(event.request.url, { ignoreVary: true })
  if (cached) return cached
  const response = await fetch(event.request)
  if (response.status === 200) event.waitUntil(cache.put(event.request.url, response.clone()))
  return response
}

/** 쪽: 네트워크 먼저(받으면 캐시도 새것으로). 인터넷이 없으면 캐시의 그 쪽, 없으면 같은 언어의 편집기 껍데기. */
async function page(event: FetchEvent): Promise<Response> {
  const cache = await caches.open(CACHE)
  const key = pageKey(event.request.url)
  const saved = async () => (await cache.match(key, { ignoreVary: true })) ?? (await cache.match(shellFor(event.request.url), { ignoreVary: true }))
  const network = fetch(event.request).then((response) => {
    if (response.status === 200) event.waitUntil(cache.put(key, response.clone()))
    return response
  })
  const slow = new Promise<Response | undefined>((resolve) => setTimeout(() => void saved().then(resolve), SLOW_MS))
  try {
    return (await Promise.race([network, slow])) ?? (await network)
  } catch (error) {
    const fallback = await saved()
    if (fallback) return fallback
    throw error
  }
}
