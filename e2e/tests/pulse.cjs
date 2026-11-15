// 운영자가 보는 쓰임 숫자·브라우저 오류를 실제 화면에서: 편집기를 쓰면 관리자 화면의 숫자가 오르고(누가 했는지는 없이),
// 편집기에서 오류가 나면 관리자 화면에 모여 보이며, 두 카드가 컴퓨터·휴대폰 폭에서 넘치지 않는다.
const { chromium, devices } = require('playwright')
const { BASE, OUT } = require('../env.cjs')

;(async () => {
  const browser = await chromium.launch()
  const results = []
  const errors = []
  const ok = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`)
  const watch = (page, tag, ignore = /$^/) => {
    page.on('pageerror', (e) => !ignore.test(String(e)) && errors.push(`${tag} pageerror ${String(e).slice(0, 160)}`))
    page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && !ignore.test(m.text()) && errors.push(`${tag} console ${m.text().slice(0, 160)}`))
  }
  const devLogin = async (page, email, name) => {
    await page.goto(BASE + '/ko/account', { waitUntil: 'networkidle' })
    await page.waitForSelector('.account-dev')
    await page.locator('.account-dev input[type=email]').fill(email)
    await page.locator('.account-dev input:not([type=email])').fill(name)
    await page.locator('.account-dev button').click()
    await page.waitForSelector('.account-facts')
  }
  const until = async (page, test, ms = 15000) => {
    const end = Date.now() + ms
    while (Date.now() < end) {
      if (await test()) return true
      await page.waitForTimeout(300)
    }
    return false
  }

  // ── 1. 관리자: 지금 숫자 ──
  const admin = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR' })).newPage()
  watch(admin, 'admin')
  await devLogin(admin, 'vmelabs@outlook.com', '운영자')
  const pulse = () => admin.evaluate(async () => (await fetch('/api/admin/pulse', { cache: 'no-store' })).json())
  const errorList = () => admin.evaluate(async () => (await (await fetch('/api/admin/errors', { cache: 'no-store' })).json()).errors)
  const total = (data, event) => data.events.find((row) => row.event === event)?.total ?? 0
  const before = await pulse()
  ok('1 admin reads usage for the last 7 days', Array.isArray(before.days) && before.days.length === 7 && before.events.length >= 14, `days ${before.days?.length}, events ${before.events?.length}`)

  // ── 2. 방문자: 편집기 열기 → 예시 영상 → 내보내기 ──
  // 머리 없는 크롬은 서버가 자동 프로그램으로 보고 사람 숫자에서 뺀다(그게 맞다) — 방문자는 보통 크롬(리눅스)으로 흉내 낸다
  const PERSON = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
  const visitor = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR', acceptDownloads: true, userAgent: PERSON })).newPage()
  watch(visitor, 'visitor', /e2e-boom|Failed to fetch/)
  const sent = []
  visitor.on('request', (request) => {
    if (request.url().endsWith('/api/pulse')) sent.push(request.postData())
  })
  await visitor.goto(`${BASE}/ko/app`, { waitUntil: 'networkidle' })
  await visitor.locator('.samples button:not(.is-tall)').first().click()
  await visitor.waitForSelector('.block')
  await visitor.locator('.ed-export').click()
  await visitor.waitForSelector('#export-title')
  await visitor.waitForFunction(() => !/내보내는 중/.test(document.querySelector('#export-title')?.textContent ?? ''), null, { timeout: 180000 })
  ok('2 export finishes', (await visitor.locator('#export-title').innerText()) === '영상이 준비됐어요.')
  // 편집기는 이름만 보낸다(누구인지·무엇을 넣었는지는 없다)
  ok('2 the editor sends only event names', sent.length >= 4 && sent.every((body) => /^\{"event":"[a-z_]+"\}$/.test(body ?? '')), sent.join(' '))
  const counted = await until(admin, async () => {
    const after = await pulse()
    return ['editor_open', 'sample_opened', 'export_started', 'export_done'].every((event) => total(after, event) >= total(before, event) + 1)
  })
  const after = await pulse()
  ok('2 admin counts go up: editor, sample, export started and finished', counted, ['editor_open', 'sample_opened', 'export_started', 'export_done'].map((event) => `${event} ${total(before, event)}→${total(after, event)}`).join(', '))
  ok('2 exports by browser: this Chrome on Linux has a finished export', after.exports.some((row) => row.agent === 'chrome-linux' && row.done >= 1), JSON.stringify(after.exports))
  // 자동 프로그램(머리 없는 크롬)으로 연 편집기는 사람 숫자에 섞이지 않고 따로 센다
  const robot = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage()
  await robot.goto(`${BASE}/app`, { waitUntil: 'networkidle' })
  const bots = await until(admin, async () => (await pulse()).bots > after.bots)
  const later = await pulse()
  ok('2 a headless browser is counted apart, not as a person', bots && total(later, 'editor_open') === total(after, 'editor_open'), `bots ${after.bots}→${later.bots}`)
  await robot.context().close()
  // 다시 그려져도 편집기 열기는 한 번만 센다
  await visitor.locator('.ed-export').count()
  const opens = sent.filter((body) => body === '{"event":"editor_open"}').length
  ok('2 editor_open is sent once per visit', opens === 1, `sent ${opens}`)

  // ── 3. 편집기에서 오류가 나면 관리자에게 모인다 ──
  const marker = `e2e-boom-${Date.now()}`
  await visitor.goto(`${BASE}/ko/app?project=does-not-matter&script=private-words`, { waitUntil: 'networkidle' })
  await visitor.evaluate((text) => setTimeout(() => { throw new RangeError(text) }), marker)
  await visitor.evaluate((text) => setTimeout(() => { throw new RangeError(text) }), marker)
  const reported = await until(admin, async () => (await errorList()).some((error) => error.message.includes(marker)))
  const found = (await errorList()).find((error) => error.message.includes(marker))
  ok('3 a browser error reaches the admin, once even if it happens twice', reported && found?.count === 1, JSON.stringify(found))
  ok('3 the page address has no query (no project id, no script)', found?.page === '/ko/app' && !JSON.stringify(found).includes('private-words'), found?.page)
  ok('3 the error carries the browser kind and the build number', found?.agent === 'chrome-linux' && /^\d{12}$/.test(found?.version ?? ''), `${found?.agent} · ${found?.version}`)
  // 브라우저 잡음(끊긴 인터넷)은 알리지 않는다
  await visitor.evaluate(() => setTimeout(() => { throw new TypeError('Failed to fetch') }))
  await visitor.waitForTimeout(1500)
  ok('3 network noise is not reported', !(await errorList()).some((error) => error.message === 'TypeError: Failed to fetch'))

  // ── 4. 관리자 화면의 두 카드 ──
  await admin.goto(`${BASE}/ko/admin`, { waitUntil: 'networkidle' })
  await admin.waitForSelector('.admin-table')
  const main = await admin.locator('main').innerText()
  ok('4 usage card shows the table and the per-browser exports', main.includes('쓰임 (최근 7일)') && main.includes('브라우저별 내보내기') && main.includes('크롬 · 리눅스'), '')
  ok('4 errors card lists the error with where it happened', main.includes('브라우저 오류 (최근 30일)') && main.includes(marker))
  await admin.locator('.admin-errors details summary').first().click()
  ok('4 the stack opens', (await admin.locator('.admin-stack').first().innerText()).length > 10)
  await admin.screenshot({ path: `${OUT}/admin-pulse.png`, fullPage: true })
  const phone = await (await browser.newContext({ ...devices['iPhone 13'], locale: 'ko-KR' })).newPage()
  watch(phone, 'phone')
  await devLogin(phone, 'vmelabs@outlook.com', '운영자')
  await phone.goto(`${BASE}/ko/admin`, { waitUntil: 'networkidle' })
  await phone.waitForSelector('.admin-table')
  const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  ok('4 phone width: the page does not scroll sideways (only the tables do)', overflow <= 0, `overflow ${overflow}`)
  await phone.screenshot({ path: `${OUT}/admin-pulse-phone.png`, fullPage: true })

  // ── 5. 비우기 ──
  admin.once('dialog', (dialog) => dialog.accept())
  await admin.locator('.admin-errors ~ .account-actions button').click()
  ok('5 clearing empties the list', await until(admin, async () => (await errorList()).length === 0))

  console.log(results.join('\n'))
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors')
  await browser.close()
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
