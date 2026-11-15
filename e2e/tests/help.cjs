// 도움말의 커넥터 절을 세 언어 × 컴퓨터·휴대폰 폭으로 찍고, 가로로 넘치는지 본다
const { chromium, devices } = require('playwright')
const { BASE, OUT } = require('../env.cjs')
;(async () => {
  const browser = await chromium.launch()
  const out = []
  for (const [lang, path] of [['ko', '/ko/help'], ['en', '/help'], ['ja', '/ja/help']]) {
    for (const [name, options] of [['desk', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }], ['phone', { ...devices['iPhone 13'] }]]) {
      const context = await browser.newContext({ ...options, locale: lang === 'ko' ? 'ko-KR' : lang === 'ja' ? 'ja-JP' : 'en-US' })
      const page = await context.newPage()
      await page.goto(`${BASE}${path}#connect`, { waitUntil: 'networkidle' })
      await page.waitForFunction(() => document.querySelector('.legal__code')?.textContent.startsWith('http'))
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      const section = page.locator('#connect')
      const box = await section.boundingBox()
      const code = await page.locator('.legal__code').boundingBox()
      out.push(`${overflow <= 0 && code.x + code.width <= box.x + box.width + 1 ? 'PASS' : 'FAIL'} ${lang} ${name}: overflow ${overflow}, section ${Math.round(box.width)}px, address ${Math.round(code.width)}px`)
      await section.screenshot({ path: `${OUT}/help-${lang}-${name}.png` })
      await context.close()
    }
  }
  console.log(out.join('\n'))
  await browser.close()
})().catch((error) => { console.error(error); process.exit(1) })
