import { describe, expect, it } from 'vitest'
import { llmsTxt, robotsTxt, sitemapXml } from './files'
import { headTags } from './head'
import { fillTemplate, prerenderPlan } from './template'

const ORIGIN = 'https://reelmotion.test'

describe('headTags', () => {
  it('주소(도메인)를 알면 바른 주소·언어별 주소·공유 그림을 절대 주소로 적는다', () => {
    const head = headTags({ kind: 'page', page: 'home', lang: 'ko' }, ORIGIN)
    expect(head).toContain('<title>ReelMotion — 말하는 영상에 모션그래픽을 자동으로</title>')
    expect(head).toContain('<link rel="canonical" href="https://reelmotion.test/ko" />')
    expect(head).toContain('<link rel="alternate" hreflang="en" href="https://reelmotion.test/" />')
    expect(head).toContain('<link rel="alternate" hreflang="ja" href="https://reelmotion.test/ja" />')
    expect(head).toContain('<link rel="alternate" hreflang="x-default" href="https://reelmotion.test/" />')
    expect(head).toContain('<meta property="og:locale" content="ko_KR" />')
    expect(head).toContain('<meta property="og:image" content="https://reelmotion.test/og/ko.jpg" />')
    expect(head).toContain('<meta property="og:url" content="https://reelmotion.test/ko" />')
    expect(head).toContain('"@type":"WebApplication"')
  })

  it('주소를 모르면 절대 주소가 필요한 것은 빼고, 나머지는 적는다', () => {
    const head = headTags({ kind: 'page', page: 'terms', lang: 'en' }, null)
    expect(head).toContain('<title>Terms of Service — ReelMotion</title>')
    expect(head).toContain('<meta name="description"')
    expect(head).toContain('<meta property="og:title" content="Terms of Service — ReelMotion" />')
    expect(head).not.toContain('canonical')
    expect(head).not.toContain('hreflang')
    expect(head).not.toContain('og:image')
    expect(head).not.toContain('og:url')
    expect(head).not.toContain('application/ld+json')
  })

  it('관리자 화면과 내 계정은 검색에 넣지 않는다', () => {
    expect(headTags({ kind: 'page', page: 'admin', lang: 'ko' }, ORIGIN)).toContain('<meta name="robots" content="noindex" />')
    expect(headTags({ kind: 'page', page: 'account', lang: 'en' }, ORIGIN)).toContain('<meta name="robots" content="noindex" />')
  })

  it('없는 쪽은 검색에 넣지 않는다', () => {
    const head = headTags({ kind: '404', lang: 'ja' }, ORIGIN)
    expect(head).toContain('<meta name="robots" content="noindex" />')
    expect(head).toContain('ページが見つかりません')
    expect(head).not.toContain('canonical')
  })

  it('따옴표·꺾쇠를 바꿔 쓴다', () => {
    const head = headTags({ kind: 'page', page: 'home', lang: 'en' }, 'https://x.test/"><script>')
    expect(head).not.toContain('"><script>')
  })
})

describe('sitemap / robots / llms', () => {
  it('사이트 지도에는 미리 그린 쪽 여섯 × 언어 셋과 서로의 언어별 주소가 들어간다', () => {
    const xml = sitemapXml(ORIGIN)
    expect(xml.match(/<url>/g)).toHaveLength(18)
    expect(xml).toContain('<loc>https://reelmotion.test/ko/help</loc>')
    expect(xml).toContain('<loc>https://reelmotion.test/licenses</loc>')
    expect(xml).toContain('<loc>https://reelmotion.test/ja/privacy</loc>')
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="ko" href="https://reelmotion.test/ko/privacy" />')
    expect(xml).not.toContain('/app')
  })

  it('robots.txt 는 주소를 알 때만 사이트 지도를 알려 준다', () => {
    expect(robotsTxt(ORIGIN)).toContain('Sitemap: https://reelmotion.test/sitemap.xml')
    expect(robotsTxt(null)).not.toContain('Sitemap')
    expect(robotsTxt(null)).toContain('Disallow: /api/')
  })

  it('llms.txt 는 제품 설명·쪽 목록·요금·질문을 담는다', () => {
    const text = llmsTxt(ORIGIN)
    expect(text.startsWith('# ReelMotion\n')).toBe(true)
    expect(text).toContain('[Editor](https://reelmotion.test/app)')
    expect(text).toContain('14,900')
    expect(text).toContain('Does my video get uploaded?')
    expect(text).toContain('[Help](https://reelmotion.test/help)')
    expect(text).toContain('[Open-source licenses](https://reelmotion.test/licenses)')
    expect(llmsTxt(null)).toContain('[Editor](/app)')
    // AI 가 커넥터를 찾을 수 있게 MCP 주소와 도구를 적는다
    expect(text).toContain('## Connector (MCP)')
    expect(text).toContain('https://reelmotion.test/mcp')
    expect(text).toContain('plan_motion_graphics')
    expect(llmsTxt(null)).toContain('/mcp')
  })
})

describe('fillTemplate / prerenderPlan', () => {
  const template = '<!doctype html>\n<html lang="en">\n  <head>\n    <title>ReelMotion</title>\n  </head>\n  <body>\n    <div id="root"></div>\n  </body>\n</html>\n'

  it('언어·머리 정보·미리 그린 화면을 넣는다', () => {
    const out = fillTemplate(template, { lang: 'ja', head: '<title>T</title>', html: '<main>x</main>', key: '/ja' })
    expect(out).toContain('<html lang="ja">')
    expect(out).toContain('<title>T</title>')
    expect(out).toContain('<div id="root" data-page="/ja"><main>x</main></div>')
  })

  it('편집기 껍데기는 화면 없이, 열쇠도 없이 둔다', () => {
    const out = fillTemplate(template, { lang: 'ko', head: '<title>T</title>', html: '', key: null })
    expect(out).toContain('<div id="root"></div>')
  })

  it('틀이 바뀌어 넣을 자리를 못 찾으면 멈춘다', () => {
    expect(() => fillTemplate('<html>', { lang: 'en', head: '', html: '', key: '/' })).toThrow()
  })

  it('파일 목록: 쪽 27개 + 404 셋', () => {
    const plan = prerenderPlan()
    expect(plan).toHaveLength(30)
    expect(plan.find((item) => item.file === 'ko/account/index.html')?.key).toBeNull()
    expect(plan.find((item) => item.file === 'ko/admin/index.html')?.key).toBeNull()
    const files = plan.map((item) => item.file)
    expect(files).toContain('index.html')
    expect(files).toContain('ko/terms/index.html')
    expect(files).toContain('ja/app/index.html')
    expect(files).toContain('404.html')
    expect(files).toContain('ko/404.html')
    expect(plan.find((item) => item.file === 'ja/app/index.html')?.key).toBeNull()
    expect(plan.find((item) => item.file === 'ko/404.html')?.key).toBe('404:ko')
  })
})
