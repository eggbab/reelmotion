// 소개 페이지가 세 언어에서 끝까지 내려도 오류 없이 그려지는지(그림은 모두 우리 엔진이 영상 위에 그린다). 한국어 맨 위 화면을 한 장 찍는다.
const { chromium } = require('playwright')
const { BASE, OUT } = require('../env.cjs')
;(async () => {
  const browser = await chromium.launch()
  const results = []
  const ok = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`)
  for (const path of ['/', '/ko', '/ja']) {
    const errors = []
    const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })).newPage()
    page.on('pageerror', (e) => errors.push(`pageerror ${String(e).slice(0, 200)}`))
    page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(`console ${m.text().slice(0, 200)}`))
    const response = await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
    ok(`${path} opens`, response.status() === 200, String(response.status()))
    await page.waitForTimeout(2000)
    for (let y = 0; y < 9000; y += 900) {
      await page.mouse.wheel(0, 900)
      await page.waitForTimeout(250)
    }
    ok(`${path} has a main heading and the pricing section`, (await page.locator('h1').count()) >= 1 && (await page.locator('#pricing, [id*=pricing]').count()) >= 1)
    ok(`${path} no page errors while scrolling to the bottom`, errors.length === 0, errors.join(' || '))
    if (path === '/ko') {
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.waitForTimeout(1500)
      await page.screenshot({ path: `${OUT}/landing-ko.png` })
    }
    await page.context().close()
  }
  console.log(results.join('\n'))
  await browser.close()
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
