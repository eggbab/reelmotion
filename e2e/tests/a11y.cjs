// 접근성(axe-core, WCAG 2.1 A·AA + 권장 사항): 쪽마다 위반이 하나도 없는지. 2026-11-19 처음 쟀을 때 옅은 글씨 대비(3.3:1),
// 이름 없는 예시 영상 단추 8개, 보이는 글과 다른 단추 이름, 키보드로 못 미는 띠, 편집 화면의 본문·제목 없음이 나왔다.
// 웹 서버의 보안 규칙(CSP)이 검사 도구를 막으므로 이 시험만 규칙을 건너뛴다(bypassCSP) — 화면은 그대로다.
const { chromium } = require('playwright')
const { BASE } = require('../env.cjs')
const AXE = require.resolve('axe-core/axe.min.js')

/** [주소, 무엇을 한 뒤(편집기)] */
const PAGES = [
  ['/'], ['/ko'], ['/ja'], ['/help'], ['/ko/help'], ['/ja/help'], ['/terms'], ['/ko/privacy'], ['/ja/refund'], ['/licenses'],
  ['/ko/account'], ['/nope'], ['/app'], ['/ko/app', 'sample'], ['/ja/app', 'transcript'], ['/app', 'chat'], ['/ko/app', 'projects'],
]

;(async () => {
  const browser = await chromium.launch()
  const results = []
  const errors = []
  const ok = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`)

  async function audit(context, path, step) {
    const page = await context.newPage()
    page.on('pageerror', (e) => errors.push(`${path} pageerror ${String(e).slice(0, 160)}`))
    await page.goto(BASE + path, { waitUntil: 'networkidle' })
    if (step) {
      await page.locator('.samples button').nth(0).click()
      await page.waitForSelector('.block')
      if (step === 'sample') await page.locator('.block').first().click()
      if (step === 'transcript') await page.locator('.tabs button').nth(0).click()
      if (step === 'chat') await page.locator('.tabs button').nth(2).click()
      if (step === 'projects') await page.locator('.ed-projects').click()
    }
    // 소개 페이지의 한 문장은 스크롤하는 만큼 낱말이 밝아진다(일부러 둔 움직임) — 끝까지 내려 다 밝아진 뒤에 본다
    if (!step) {
      await page.evaluate(async () => {
        for (let y = 0; y <= document.body.scrollHeight; y += 400) {
          window.scrollTo(0, y)
          await new Promise((resolve) => setTimeout(resolve, 30))
        }
      })
    }
    await page.waitForTimeout(600)
    await page.addScriptTag({ path: AXE })
    const violations = await page.evaluate(async () => {
      const result = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } })
      return result.violations.map((v) => `${v.impact} ${v.id} ×${v.nodes.length}: ${v.nodes[0].target.join(' ')}`)
    })
    await page.close()
    return violations
  }

  for (const [label, options] of [
    ['computer', { viewport: { width: 1440, height: 900 } }],
    ['computer, reduced motion', { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }],
    ['phone', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }],
  ]) {
    const context = await browser.newContext({ ...options, locale: 'en-US', bypassCSP: true })
    for (const [path, step] of label === 'computer' ? PAGES : PAGES.filter(([path]) => ['/', '/ko', '/app'].includes(path) || path === '/ko/app')) {
      const found = await audit(context, path, step)
      ok(`${label}: ${path}${step ? ` (${step})` : ''} has no accessibility problems`, found.length === 0, found.join(' | '))
    }
    await context.close()
  }

  console.log(results.join('\n'))
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors')
  await browser.close()
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
