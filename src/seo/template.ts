import { LANGS } from '../langs'
import type { Lang } from '../langs'
import { PRERENDERED_PAGES, SITE_PAGES } from '../site/routes'
import type { HeadTarget } from './head'

/** 미리 그릴 파일 하나. key 가 null 이면 화면은 그리지 않고(편집기 껍데기) 머리 정보만 넣는다. */
export type PrerenderItem = { file: string; url: string; lang: Lang; target: HeadTarget; key: string | null }

/** 모든 쪽(쪽 다섯 × 언어 셋)과 언어별 404. /ko → ko/index.html 처럼 주소마다 폴더 하나. */
export function prerenderPlan(): PrerenderItem[] {
  const pages = SITE_PAGES.map(({ page, lang, path }) => ({
    file: path === '/' ? 'index.html' : `${path.slice(1)}/index.html`,
    url: path,
    lang,
    target: { kind: 'page', page, lang } as const,
    key: PRERENDERED_PAGES.includes(page) ? path : null,
  }))
  // 404 는 그 언어 앞말 아래 있는 없는 주소 하나로 그린다(/ko/404 → NotFound, 한국어).
  const missing = LANGS.map(({ id: lang }) => ({
    file: lang === 'en' ? '404.html' : `${lang}/404.html`,
    url: lang === 'en' ? '/404' : `/${lang}/404`,
    lang,
    target: { kind: '404', lang } as const,
    key: `404:${lang}`,
  }))
  return [...pages, ...missing]
}

function replaceOnce(source: string, find: string, replacement: string): string {
  const at = source.indexOf(find)
  if (at < 0) throw new Error(`index.html 에서 「${find}」 를 찾지 못했습니다(틀이 바뀌었으면 src/seo/template.ts 도 고친다)`)
  return source.slice(0, at) + replacement + source.slice(at + find.length)
}

/** 빌드한 index.html 틀에 언어·머리 정보·미리 그린 화면을 넣는다. */
export function fillTemplate(template: string, page: { lang: Lang; head: string; html: string; key: string | null }): string {
  let out = replaceOnce(template, '<html lang="en">', `<html lang="${page.lang}">`)
  out = replaceOnce(out, '<title>ReelMotion</title>', page.head)
  const root = page.key === null ? `<div id="root">${page.html}</div>` : `<div id="root" data-page="${page.key}">${page.html}</div>`
  return replaceOnce(out, '<div id="root"></div>', root)
}

/** 편집기 껍데기에 미리 그려 두는 한 줄 — 편집기 코드(압축 약 430KB)를 받는 동안 빈 화면 대신 보인다. 브라우저가 처음부터 그리며 바꾼다 */
const EDITOR_LOADING: Record<Lang, string> = { en: 'Opening the editor…', ko: '편집기를 여는 중…', ja: 'エディターを開いています…' }

/** 화면을 미리 그리지 않는 쪽(key 가 null)에 넣을 것. 편집기만 「여는 중」, 계정·관리자는 비운다 */
export function shellHtml(target: HeadTarget): string {
  if (target.kind !== 'page' || target.page !== 'app') return ''
  return `<div class="editor"><p class="ed-loading" role="status">${EDITOR_LOADING[target.lang]}</p></div>`
}

/**
 * 편집기 껍데기의 머리에 넣는 미리 받기: 편집기 코드와 스타일을 처음부터 함께 받게 한다. 넣지 않으면 기본 코드를 받아 실행한 뒤에야
 * 편집기 코드를 받기 시작한다(차례로). assets: dist/assets 의 파일 이름들
 */
/**
 * 첫 화면 스크립트에 들어가면 안 되는 긴 글의 표시(개인정보처리방침·약관·도움말·라이선스에만 있는 글).
 * 누가 바닥글·쪽 제목 같은 곳에서 글 전체(LEGAL_DOCS·HELP·credits·관리자 화면 글 ADMIN_COPY)를 다시 가져다 쓰면 빌드가 멈춘다(scripts/prerender.mjs) —
 * 그러면 소개 페이지를 여는 모든 사람이 약 40KB 를 더 받는다(2026-11-19 나눔, src/site/lazyPages.ts).
 */
export const SPLIT_MARKERS = ['권익침해 구제방법', '이 약관은 대한민국 법을 따릅니다', '말하는 영상 하나로 모션그래픽 영상을 만드는 순서', 'SIL Open Font License', '편집기가 이용자의 브라우저에서 고장 났을 때']

export function leakedSplitText(script: string): string[] {
  return SPLIT_MARKERS.filter((marker) => script.includes(marker))
}

/** index.html 이 처음 부르는 스크립트(assets 안의 파일 이름) */
export function entryScript(html: string): string | null {
  return /<script type="module"[^>]*\ssrc="\/assets\/([^"]+\.js)"/.exec(html)?.[1] ?? null
}

export function shellHints(target: HeadTarget, assets: string[]): string {
  if (target.kind !== 'page' || target.page !== 'app') return ''
  const script = assets.find((name) => /^EditorPage-[\w-]+\.js$/.test(name))
  const style = assets.find((name) => /^EditorPage-[\w-]+\.css$/.test(name))
  return [
    script && `<link rel="modulepreload" crossorigin href="/assets/${script}" />`,
    style && `<link rel="preload" as="style" crossorigin href="/assets/${style}" />`,
  ]
    .filter(Boolean)
    .join('\n    ')
}
