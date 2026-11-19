import { langOfPath, normalizePath, pagePath } from '../site/routes'

/**
 * 서비스 워커(sw.ts)의 판단을 화면 없이 시험할 수 있게 따로 둔다. 서비스 워커는 편집기를 인터넷 없이도 열려고 둔다:
 *  - 쪽 이동(HTML): 네트워크 먼저 — 새로 배포한 것이 늘 먼저 보인다. 인터넷이 없을 때만 캐시의 쪽(없으면 편집기 껍데기)을 준다.
 *  - /assets/ 의 파일(이름에 내용 지문이 있어 바뀌지 않는다): 캐시 먼저.
 *  - 나머지(API·영상·큰 wasm·다른 사이트)는 손대지 않는다.
 */
export type Route = 'pass' | 'asset' | 'page'

export function routeOf(request: { method: string; url: string; mode: string }, origin: string): Route {
  if (request.method !== 'GET') return 'pass'
  const url = new URL(request.url)
  if (url.origin !== origin) return 'pass'
  const path = url.pathname
  if (path.startsWith('/api/') || path.startsWith('/media/') || path === '/mcp' || path === '/mcp/') return 'pass'
  // 받아쓰기 실행 파일(wasm, 14~27MB)은 브라우저의 보통 캐시에 맡긴다(두 번 저장하지 않게).
  if (path.startsWith('/assets/')) return path.endsWith('.wasm') ? 'pass' : 'asset'
  // 쪽 이동 가운데 파일(licenses.txt, sitemap.xml …)이 아닌 것만
  if (request.mode === 'navigate' && !path.slice(path.lastIndexOf('/') + 1).includes('.')) return 'page'
  return 'pass'
}

/** 쪽을 캐시에 넣는 열쇠: 물음표 뒤와 끝의 / 를 뗀 주소(?project=… 가 달라도 같은 쪽이다) */
export function pageKey(url: string): string {
  return normalizePath(new URL(url).pathname)
}

/** 인터넷이 없고 그 쪽이 캐시에 없을 때 대신 줄 편집기 껍데기(같은 언어). 화면 코드가 주소를 보고 맞는 쪽을 그린다(main.tsx). */
export function shellFor(url: string): string {
  return pagePath('app', langOfPath(new URL(url).pathname))
}

/** 처음 설치할 때 받아 두는 편집기 껍데기(언어별) */
export const SHELLS = [pagePath('app', 'en'), pagePath('app', 'ko'), pagePath('app', 'ja')]

/**
 * 빌드 결과(dist/assets 의 파일 이름)에서 미리 받아 둘 것: 화면 코드와 스타일만(약 1.6MB).
 * 글꼴 조각·받아쓰기 워커·관리자 화면은 쓸 때 받아 캐시에 넣는다. scripts/prerender.mjs 가 부른다.
 */
export function precacheList(assetFiles: string[]): string[] {
  return assetFiles
    // 내보내기(exportVideo — 영상 처리 라이브러리)는 편집기가 따로 받는 파일이지만 인터넷 없이도 내보내야 하므로 함께
    .filter((name) => /^(index|EditorPage|exportVideo)-[\w-]+\.(js|css)$/.test(name))
    .sort()
    .map((name) => `/assets/${name}`)
}

const PREFIX = 'reelmotion-'

export function cacheName(version: string): string {
  return `${PREFIX}${version}`
}

/** 옛 판을 지울 때 우리 캐시만 지운다(브라우저 안 받아쓰기 모델의 캐시는 그대로 둔다). */
export function isOurCache(name: string): boolean {
  return name.startsWith(PREFIX)
}

const STAMP = /^self\.__RM_VERSION__=.*\n/

/** scripts/prerender.mjs 가 dist/sw.js 맨 앞에 붙이는 머리(판 이름·미리 받을 파일). 이미 붙어 있으면 바꾼다. */
export function stampWorker(body: string, version: string, precache: string[]): string {
  return `self.__RM_VERSION__=${JSON.stringify(version)};self.__RM_PRECACHE__=${JSON.stringify(precache)};\n${body.replace(STAMP, '')}`
}

/**
 * 서비스 워커를 끄는 판(SW_DISABLE=1 로 빌드하면 dist/sw.js 가 이것이 된다 — docs/operations.md).
 * 방문자의 브라우저가 이것을 받으면 우리 캐시를 지우고 등록을 푼다. 요청은 가로채지 않는다.
 */
export const KILL_SWITCH = `// ReelMotion: 서비스 워커 끄기(SW_DISABLE=1)
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) if (name.startsWith('${PREFIX}')) await caches.delete(name)
      await self.registration.unregister()
    })(),
  )
})
`
