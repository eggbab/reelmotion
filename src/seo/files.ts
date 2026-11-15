import { LANGS } from '../langs'
import { SITE_COPY } from '../site/copy'
import { LICENSES_UI } from '../site/legal/credits'
import { LEGAL_DOCS } from '../site/legal/docs'
import { HELP } from '../site/legal/help'
import { pageMeta } from '../site/meta'
import { PLANS, formatWon } from '../site/plans'
import { PRERENDERED_PAGES, pagePath } from '../site/routes'
import { absoluteUrl, escapeHtml } from './head'

/** 사이트 지도: 미리 그린 쪽(내용이 HTML 에 있는 쪽)만, 언어별 주소를 서로 이어서. 절대 주소가 필요해 도메인을 알 때만 만든다. */
export function sitemapXml(origin: string): string {
  const urls = PRERENDERED_PAGES.flatMap((page) =>
    LANGS.map(({ id }) => {
      const alternates = [...LANGS.map((other) => [other.id, pagePath(page, other.id)]), ['x-default', pagePath(page, 'en')]]
        .map(([hreflang, path]) => `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${escapeHtml(absoluteUrl(origin, path))}" />`)
        .join('\n')
      return `  <url>\n    <loc>${escapeHtml(absoluteUrl(origin, pagePath(page, id)))}</loc>\n${alternates}\n  </url>`
    }),
  )
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`
}

/** 모든 로봇(검색·AI)에 열어 둔다. 받아쓰기 API 만 막는다. */
export function robotsTxt(origin: string | null): string {
  const lines = ['User-agent: *', 'Allow: /', 'Disallow: /api/']
  if (origin) lines.push('', `Sitemap: ${absoluteUrl(origin, '/sitemap.xml')}`)
  return `${lines.join('\n')}\n`
}

/**
 * AI 가 사이트를 한 번에 읽는 요약(llms.txt 제안 형식). 영어 소개 글(SITE_COPY.en)에서 만들어 사이트와 내용이 어긋나지 않는다.
 * 도메인을 모르면 주소를 / 로 시작하는 상대 주소로 적는다.
 */
export function llmsTxt(origin: string | null): string {
  const copy = SITE_COPY.en
  const link = (path: string) => (origin ? absoluteUrl(origin, path) : path)
  const plans = PLANS.map((plan) => {
    const name = copy.pricing.names[plan.id]
    const price = plan.monthlyWon === 0 ? 'free' : `KRW ${formatWon(plan.monthlyWon)} a month (planned)`
    return `- ${name}: ${price} — videos up to ${plan.maxMinutes} min, ${plan.exportsPerMonth} exports a month, ${plan.watermark ? 'with a ReelMotion watermark' : 'no watermark'}`
  })
  return [
    '# ReelMotion',
    '',
    `> ${pageMeta('home', 'en').description}`,
    '',
    copy.hero.body,
    '',
    '## Pages',
    '',
    `- [Home](${link('/')}): what ReelMotion does, styles, pricing and FAQ`,
    `- [Editor](${link(pagePath('app', 'en'))}): add a talking video, transcribe it, place graphics and export an MP4 in the browser`,
    `- [${HELP.en.title}](${link(pagePath('help', 'en'))}): ${HELP.en.description}`,
    ...(['terms', 'privacy', 'refund'] as const).map((page) => `- [${LEGAL_DOCS[page].en.title}](${link(pagePath(page, 'en'))}): ${LEGAL_DOCS[page].en.description}`),
    `- [${LICENSES_UI.en.title}](${link(pagePath('licenses', 'en'))}): ${LICENSES_UI.en.description}`,
    `- The same pages in Korean start with ${link('/ko')} and in Japanese with ${link('/ja')}`,
    '',
    '## Features',
    '',
    ...copy.features.items.map((item) => `- ${item.title}: ${item.body}`),
    '',
    '## Pricing',
    '',
    copy.pricing.body,
    '',
    ...plans,
    '',
    '## FAQ',
    '',
    ...copy.faq.items.flatMap((item) => [`### ${item.q}`, '', item.a, '']),
  ].join('\n')
}
