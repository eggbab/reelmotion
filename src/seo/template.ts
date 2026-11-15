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
  const root = page.key === null ? '<div id="root"></div>' : `<div id="root" data-page="${page.key}">${page.html}</div>`
  return replaceOnce(out, '<div id="root"></div>', root)
}
