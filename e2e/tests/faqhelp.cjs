// 자주 묻는 질문·도움말 쪽이 컴퓨터·휴대폰 폭에서 제대로 보이는지
const { chromium } = require('playwright')
const { BASE, OUT } = require('../env.cjs')
;(async () => {
  const browser = await chromium.launch()
  const results = []
  const errors = []
  const ok = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`)
  for (const [w, h, tag] of [[1440, 900, 'desk'], [390, 844, 'phone']]) {
    const context = await browser.newContext({ viewport: { width: w, height: h }, locale: 'ko-KR' })
    const page = await context.newPage()
    page.on('pageerror', (e) => errors.push(`${tag} pageerror ${String(e).slice(0, 160)}`))
    page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(`${tag} console ${m.text().slice(0, 160)}`))
    await page.goto(BASE + '/ko', { waitUntil: 'networkidle' })
    const faq = page.locator('#faq')
    await faq.scrollIntoViewIfNeeded()
    const items = faq.locator('details')
    ok(`${tag} faq has 8`, (await items.count()) === 8, String(await items.count()))
    for (const i of [5, 6, 7]) await items.nth(i).locator('summary').click()
    await page.waitForTimeout(300)
    await faq.screenshot({ path: `${OUT}/faq-${tag}.png` })
    await page.goto(BASE + '/ko/help', { waitUntil: 'networkidle' })
    const section = page.locator('.legal section', { hasText: '계정과 요금제' })
    await section.scrollIntoViewIfNeeded()
    ok(`${tag} help has account section`, (await section.count()) === 1)
    ok(`${tag} help links`, (await section.locator('a[href="/ko/account"]').count()) === 1 && (await section.locator('a[href="/ko#pricing"]').count()) === 1)
    await section.screenshot({ path: `${OUT}/help-${tag}.png` })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    ok(`${tag} help no sideways scroll`, overflow <= 0, String(overflow))
    await section.locator('a[href="/ko#pricing"]').click()
    await page.waitForURL((url) => url.pathname === '/ko' && url.hash === '#pricing')
    // 부드럽게 내려가므로 멈출 때까지 기다린다.
    let last = -1
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(150)
      const y = await page.evaluate(() => scrollY)
      if (y === last) break
      last = y
    }
    const top = await page.evaluate(() => document.getElementById('pricing').getBoundingClientRect().top)
    ok(`${tag} pricing link lands on pricing`, Math.abs(top) < 200, `top ${Math.round(top)}`)
    await context.close()
  }
  console.log(results.join('\n'))
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors')
  await browser.close()
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
