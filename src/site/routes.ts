import { LANGS } from '../langs'
import type { Lang } from '../langs'

/**
 * 사이트의 쪽. 언어는 주소에 들어 있다: 영어는 앞말 없이(`/`, `/terms`), 한국어·일본어는 `/ko`·`/ja` 를 앞에 붙인다.
 * home·help·contact·terms·privacy·refund·licenses 는 빌드할 때 HTML 을 미리 그려 둔다(검색·AI 가 읽는다).
 * app(편집기)·account(내 계정)·admin(관리자 화면)은 사람마다 다르므로 빈 껍데기만 두고 브라우저가 그린다.
 */
export type PageId = 'home' | 'help' | 'contact' | 'terms' | 'privacy' | 'refund' | 'licenses' | 'app' | 'account' | 'admin'

const PAGE_IDS: readonly PageId[] = ['home', 'help', 'contact', 'terms', 'privacy', 'refund', 'licenses', 'app', 'account', 'admin']

/** 미리 그려 두는(내용이 HTML 에 들어 있는) 쪽 */
export const PRERENDERED_PAGES: readonly PageId[] = ['home', 'help', 'contact', 'terms', 'privacy', 'refund', 'licenses']

export type PageMatch = { page: PageId; lang: Lang }

export function pagePath(page: PageId, lang: Lang): string {
  const base = lang === 'en' ? '' : `/${lang}`
  return page === 'home' ? base || '/' : `${base}/${page}`
}

/** 끝의 `/` 와 `/index.html` 을 떼어 낸 주소. 빈 주소는 `/`. */
export function normalizePath(pathname: string): string {
  const trimmed = pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

function splitLang(pathname: string): { lang: Lang; rest: string[] } {
  const parts = normalizePath(pathname).split('/').filter(Boolean)
  if (parts[0] === 'ko' || parts[0] === 'ja') return { lang: parts[0], rest: parts.slice(1) }
  return { lang: 'en', rest: parts }
}

export function matchPage(pathname: string): PageMatch | null {
  const { lang, rest } = splitLang(pathname)
  if (rest.length === 0) return { page: 'home', lang }
  const [slug] = rest
  if (rest.length === 1 && slug !== 'home' && (PAGE_IDS as readonly string[]).includes(slug)) return { page: slug as PageId, lang }
  return null
}

/** 없는 주소의 언어. 주소 규칙과 같게 `/ko/…` 는 한국어, `/ja/…` 는 일본어, 나머지는 영어. */
export function langOfPath(pathname: string): Lang {
  return splitLang(pathname).lang
}

/**
 * 미리 그린 HTML 과 브라우저가 그릴 화면이 같은지 비교하는 열쇠. 미리 그린 파일의 `#root` 에 `data-page` 로 적고,
 * 브라우저는 지금 주소의 열쇠가 같을 때만 그 HTML 을 이어받는다(hydrate). 없는 주소는 언어별 404 하나로 본다.
 */
export function renderKey(pathname: string): string {
  const match = matchPage(pathname)
  return match ? pagePath(match.page, match.lang) : `404:${langOfPath(pathname)}`
}

/**
 * 로그인 뒤 돌아갈 곳: 우리 사이트 안의 주소(`/` 로 시작)만. `//다른곳`·역슬래시·공백이나 보이지 않는 글자가 든 주소는
 * 기본값으로 바꾼다 — 브라우저가 주소 속 탭·줄바꿈을 지워 `/\t/다른곳` 이 `//다른곳` 이 되기 때문(서버와 편집기가 함께 쓴다).
 */
export function safeNext(value: unknown, fallback = '/app'): string {
  if (typeof value !== 'string' || value.length > 500 || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code <= 0x20 || code === 0x7f) return fallback
  }
  return value
}

/** 모든 쪽 × 모든 언어 */
export const SITE_PAGES: readonly (PageMatch & { path: string })[] = PAGE_IDS.flatMap((page) =>
  LANGS.map(({ id: lang }) => ({ page, lang, path: pagePath(page, lang) })),
)
