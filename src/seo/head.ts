import { LANGS } from '../langs'
import type { Lang } from '../langs'
import { BUSINESS } from '../site/business'
import { NOT_FOUND, pageMeta } from '../site/meta'
import { pagePath } from '../site/routes'
import type { PageId } from '../site/routes'

/** 미리 그리는 HTML 의 <head> 에 넣을 것. 쪽 하나, 또는 언어별 404. */
export type HeadTarget = { kind: 'page'; page: PageId; lang: Lang } | { kind: '404'; lang: Lang }

const OG_LOCALE: Record<Lang, string> = { en: 'en_US', ko: 'ko_KR', ja: 'ja_JP' }

/** 공유 그림(1200×630). scripts/og.mjs 가 우리 그래픽 엔진으로 만든다. */
export const OG_IMAGE = { width: 1200, height: 630, path: (lang: Lang) => `/og/${lang}.jpg` }

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
}

/** 도메인 + 주소. 도메인 끝의 / 는 뗀다. */
export function absoluteUrl(origin: string, path: string): string {
  return `${origin.replace(/\/+$/, '')}${path}`
}

/**
 * 검색·공유용 머리 정보. 도메인(origin)을 모르면 절대 주소가 꼭 필요한 것(바른 주소, 언어별 주소, 공유 그림, 주소)은 뺀다.
 * 도메인은 아직 정하지 않았다(사용자 결정 대기) — 정하면 빌드할 때 SITE_ORIGIN 으로 넘긴다.
 */
export function headTags(target: HeadTarget, origin: string | null): string {
  const { lang } = target
  const meta = target.kind === 'page' ? pageMeta(target.page, lang) : NOT_FOUND[lang]
  const tag = (name: string, attrs: Record<string, string>) =>
    `<${name} ${Object.entries(attrs)
      .map(([key, value]) => `${key}="${escapeHtml(value)}"`)
      .join(' ')} />`
  const lines = [`<title>${escapeHtml(meta.title)}</title>`, tag('meta', { name: 'description', content: meta.description })]

  // 없는 쪽과 내 계정(사람마다 다름)은 검색에 넣지 않는다.
  if (target.kind === '404' || target.page === 'account') lines.push(tag('meta', { name: 'robots', content: 'noindex' }))

  if (origin && target.kind === 'page') {
    lines.push(tag('link', { rel: 'canonical', href: absoluteUrl(origin, pagePath(target.page, lang)) }))
    for (const { id } of LANGS) lines.push(tag('link', { rel: 'alternate', hreflang: id, href: absoluteUrl(origin, pagePath(target.page, id)) }))
    lines.push(tag('link', { rel: 'alternate', hreflang: 'x-default', href: absoluteUrl(origin, pagePath(target.page, 'en')) }))
  }

  lines.push(
    tag('meta', { property: 'og:type', content: 'website' }),
    tag('meta', { property: 'og:site_name', content: 'ReelMotion' }),
    tag('meta', { property: 'og:title', content: meta.title }),
    tag('meta', { property: 'og:description', content: meta.description }),
    tag('meta', { property: 'og:locale', content: OG_LOCALE[lang] }),
    ...LANGS.filter(({ id }) => id !== lang).map(({ id }) => tag('meta', { property: 'og:locale:alternate', content: OG_LOCALE[id] })),
  )
  if (origin) {
    if (target.kind === 'page') lines.push(tag('meta', { property: 'og:url', content: absoluteUrl(origin, pagePath(target.page, lang)) }))
    lines.push(
      tag('meta', { property: 'og:image', content: absoluteUrl(origin, OG_IMAGE.path(lang)) }),
      tag('meta', { property: 'og:image:width', content: String(OG_IMAGE.width) }),
      tag('meta', { property: 'og:image:height', content: String(OG_IMAGE.height) }),
      tag('meta', { property: 'og:image:alt', content: pageMeta('home', lang).title }),
    )
  }
  lines.push(tag('meta', { name: 'twitter:card', content: origin ? 'summary_large_image' : 'summary' }))

  if (origin && target.kind === 'page' && target.page === 'home') {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'ReelMotion',
      url: absoluteUrl(origin, pagePath('home', lang)),
      description: meta.description,
      inLanguage: lang,
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Web browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
      publisher: { '@type': 'Organization', name: BUSINESS.name },
    }
    // </script> 로 끊기지 않게 < 를 바꿔 쓴다.
    lines.push(`<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`)
  }
  return lines.join('\n    ')
}
