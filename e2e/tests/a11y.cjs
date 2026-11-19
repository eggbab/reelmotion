// 접근성(axe-core, WCAG 2.1 A·AA + 권장 사항): 쪽마다 위반이 하나도 없는지. 2026-11-19 처음 쟀을 때 옅은 글씨 대비(3.3:1),
// 이름 없는 예시 영상 단추 8개, 보이는 글과 다른 단추 이름, 키보드로 못 미는 띠, 편집 화면의 본문·제목 없음이 나왔다.
// 웹 서버의 보안 규칙(CSP)이 검사 도구를 막으므로 이 시험만 규칙을 건너뛴다(bypassCSP) — 화면은 그대로다.
const { chromium } = require('playwright')
const { BASE } = require('../env.cjs')
const AXE = require.resolve('axe-core/axe.min.js')

/** [주소, 무엇을 한 뒤(편집기 · 문의하기의 빈칸 오류)] */
const PAGES = [
  ['/'], ['/ko'], ['/ja'], ['/help'], ['/ko/help'], ['/ja/help'], ['/terms'], ['/ko/privacy'], ['/ja/refund'], ['/licenses'],
  ['/contact'], ['/ko/contact', 'empty'], ['/ja/contact'],
  ['/ko/account'], ['/nope'], ['/app'], ['/ko/app', 'sample'], ['/ja/app', 'transcript'], ['/app', 'chat'], ['/ko/app', 'projects'],
]
/** 휴대폰에서도 보는 쪽(머리줄이 좁아지는 쪽 포함) */
const PHONE_PAGES = ['/', '/ko', '/app', '/ko/app', '/ja/contact']

;(async () => {
  const browser = await chromium.launch()
  const results = []
  const errors = []
  const ok = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`)

  async function audit(context, path, step) {
    const page = await context.newPage()
    page.on('pageerror', (e) => errors.push(`${path} pageerror ${String(e).slice(0, 160)}`))
    await page.goto(BASE + path, { waitUntil: 'networkidle' })
    if (step === 'empty') {
      // 빈 채로 보내 오류 안내와 「틀린 칸」 표시가 나온 상태
      await page.locator('.contact-form button[type=submit]').click()
      await page.waitForSelector('.contact-form [role=alert]')
    } else if (step) {
      await page.locator('.samples button').nth(0).click()
      await page.waitForSelector('.block')
      if (step === 'sample') await page.locator('.block').first().click()
      if (step === 'transcript') await page.locator('.tabs button').nth(0).click()
      if (step === 'chat') await page.locator('.tabs button').nth(2).click()
      if (step === 'projects') await page.locator('.ed-projects').click()
    }
    // 소개 페이지의 한 문장은 스크롤하는 만큼 낱말이 밝아진다(일부러 둔 움직임) — 끝까지 내려 다 밝아진 뒤에 본다
    if (!step || step === 'empty') {
      await page.evaluate(async () => {
        for (let y = 0; y <= document.body.scrollHeight; y += 400) {
          window.scrollTo(0, y)
          await new Promise((resolve) => setTimeout(resolve, 30))
        }
      })
      // 스크롤에 따라 밝아지는 움직임이 끝까지 따라올 때까지(빠르게 내리면 가끔 덜 밝은 채로 재서 대비 문제로 잡혔다)
      await page
        .waitForFunction(() => [...document.querySelectorAll('.statement__text span')].every((span) => getComputedStyle(span).opacity === '1'), null, { timeout: 5000 })
        .catch(() => null)
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
    for (const [path, step] of label === 'computer' ? PAGES : PAGES.filter(([path]) => PHONE_PAGES.includes(path))) {
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
