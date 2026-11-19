// 문의하기를 실제 화면에서: 바닥글·편집기 링크 → 쪽(미리 그린 양식) → 빈칸·틀린 메일·너무 긴 글 막기 → 보내기 → 고맙다는 칸
// → 로그인했으면 계정 메일을 미리 적음 → 자동 프로그램(숨긴 칸)은 받은 척만 → 한도·서버 없음·끊김 안내 → 관리자 화면에서 보기·답함·지우기.
// 휴대폰 폭에서 옆으로 밀리지 않아야 하고, 화면을 이어받을 때 오류가 없어야 한다.
const { chromium } = require('playwright')
const { BASE, OUT } = require('../env.cjs')

const TOKEN = `e2e-${Date.now().toString(36)}`

;(async () => {
  const browser = await chromium.launch()
  const results = []
  const errors = []
  const ok = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`)
  const watch = (page, tag) => {
    page.on('pageerror', (e) => errors.push(`${tag} pageerror ${String(e).slice(0, 160)}`))
    page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(`${tag} console ${m.text().slice(0, 200)}`))
  }
  const login = async (page, email, name) => {
    await page.goto(BASE + '/ko/account', { waitUntil: 'networkidle' })
    await page.waitForSelector('.account-dev')
    await page.locator('.account-dev input[type=email]').fill(email)
    await page.locator('.account-dev input:not([type=email])').fill(name)
    await page.locator('.account-dev button').click()
    await page.waitForSelector('.account-facts')
  }
  const send = (page) =>
    Promise.all([page.waitForResponse((response) => response.url().endsWith('/api/contact') && response.request().method() === 'POST'), page.locator('.contact-form button[type=submit]').click()])

  // 1. 미리 그린 HTML 에 양식이 들어 있다(검색·AI 가 읽는다)
  const raw = await (await fetch(BASE + '/ko/contact')).text()
  ok('1 prerendered form in html', raw.includes('class="contact-form"') && raw.includes('<title>문의하기 — ReelMotion</title>') && raw.includes('name="website"'))
  const rawJa = await (await fetch(BASE + '/ja/contact')).text()
  ok('1 japanese page', rawJa.includes('<title>お問い合わせ — ReelMotion</title>'))

  // 2. 소개 페이지 바닥글 → 문의하기(쪽을 옮겨도 어느 쪽에서 왔는지 안다)
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR' })
  const page = await context.newPage()
  watch(page, 'ko')
  await page.goto(BASE + '/ko', { waitUntil: 'networkidle' })
  await page.locator('.site-footer a', { hasText: '문의하기' }).click()
  await page.waitForSelector('.contact-form')
  ok('2 footer link opens /ko/contact', new URL(page.url()).pathname === '/ko/contact')

  // 3. 막기: 빈칸 · 틀린 메일 · 너무 긴 글
  await send(page).catch(() => null)
  ok('3 empty refused', (await page.locator('.contact-form [role=alert]').innerText()) === '내용을 적어 주세요.' && (await page.locator('.contact-form textarea').getAttribute('aria-invalid')) === 'true')
  await page.locator('.contact-form textarea').fill('x'.repeat(2001))
  ok('3 counter turns red over 2,000', (await page.locator('.contact-count').innerText()) === '2,001 / 2,000자' && (await page.locator('.contact-count').evaluate((el) => el.classList.contains('is-over'))))
  await page.locator('.contact-form button[type=submit]').click()
  ok('3 too long refused', (await page.locator('.contact-form [role=alert]').innerText()) === '2,000자까지 적을 수 있어요.')
  await page.locator('.contact-form textarea').fill(`내보내기가 99%에서 멈춰요 ${TOKEN}-ko\n두 번째 줄`)
  await page.locator('.contact-form input[type=email]').fill('not an email')
  await page.locator('.contact-form button[type=submit]').click()
  ok('3 bad email refused', (await page.locator('.contact-form [role=alert]').innerText()) === '메일 주소를 다시 확인해 주세요.' && (await page.locator('.contact-form input[type=email]').getAttribute('aria-invalid')) === 'true')

  // 4. 고장 신고를 고르면 도움말이 바뀌고, 보내면 고맙다는 칸이 나온다
  await page.locator('.contact-kind', { hasText: '고장 신고' }).click()
  ok('4 bug hint', (await page.locator('.contact-form .contact-hint').first().innerText()).includes('쓰는 기기와 브라우저'))
  await page.locator('.contact-form input[type=email]').fill('mina@example.com')
  await page.locator('.contact-form').screenshot({ path: `${OUT}/contact-form-ko.png` })
  const [sent] = await send(page)
  ok('4 server accepted', sent.status() === 200)
  await page.waitForSelector('.contact-sent')
  ok('4 thanks panel', (await page.locator('.contact-sent h2').innerText()) === '보냈어요. 고마워요!' && (await page.locator('.contact-sent').innerText()).includes('mina@example.com'))
  ok('4 focus moved to the panel', await page.evaluate(() => document.activeElement?.classList.contains('contact-sent')))
  await page.screenshot({ path: `${OUT}/contact-sent-ko.png` })
  await page.locator('.contact-sent button').click()
  ok('4 send another keeps kind and email', (await page.locator('.contact-kind input[value=bug]').isChecked()) && (await page.locator('.contact-form input[type=email]').inputValue()) === 'mina@example.com' && (await page.locator('.contact-form textarea').inputValue()) === '')

  // 5. 숨긴 칸을 채운 자동 프로그램 → 받은 척(관리자 화면에는 없어야 한다 — 8에서)
  await page.locator('.contact-form textarea').fill(`스팸 ${TOKEN}-bot`)
  await page.locator('input[name=website]').evaluate((input) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    setter.call(input, 'http://spam.example')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  const [bot] = await send(page)
  ok('5 bot gets a normal answer', bot.status() === 200 && (await page.locator('.contact-sent').count()) === 1)

  // 6. 한도·서버 없음·끊김 — 응답을 바꿔서 본다(보낸 글은 그대로 남는다)
  const failing = await context.newPage()
  watch(failing, 'failing')
  await failing.goto(BASE + '/contact', { waitUntil: 'networkidle' })
  await failing.locator('.contact-form textarea').fill('Hello')
  const cases = [
    [429, 'Too many messages in a short time. Please try again in about 10 minutes.'],
    [503, 'Messages can’t be sent from here right now. Please email us at vmelabs@outlook.com.'],
    ['abort', 'Your message wasn’t sent. Try again in a moment, or email us at vmelabs@outlook.com.'],
  ]
  for (const [answer, expected] of cases) {
    await failing.unroute('**/api/contact')
    await failing.route('**/api/contact', (route) => (answer === 'abort' ? route.abort() : route.fulfill({ status: answer, contentType: 'application/json', body: '{}' })))
    await failing.locator('.contact-form button[type=submit]').click()
    await failing.waitForSelector('.contact-form [role=alert]')
    await failing.waitForTimeout(100)
    const text = await failing.locator('.contact-form [role=alert]').innerText()
    ok(`6 ${answer} message`, text === expected, text)
  }
  ok('6 message kept after failures', (await failing.locator('.contact-form textarea').inputValue()) === 'Hello')
  ok('6 mail link in the message', (await failing.locator('.contact-form [role=alert] a').getAttribute('href')) === 'mailto:vmelabs@outlook.com')
  await failing.close()

  // 7. 편집기 첫 화면 → 문의하기(고장 신고가 편집기 이야기인지 안다) · ?kind=bug · 로그인했으면 계정 메일
  const editor = await context.newPage()
  watch(editor, 'editor')
  await login(editor, 'jun@example.com', '준')
  await editor.goto(BASE + '/ko/app', { waitUntil: 'networkidle' })
  await editor.locator('.ed-start a', { hasText: '문의하기' }).click()
  await editor.waitForSelector('.contact-form')
  await editor.waitForFunction(() => document.querySelector('.contact-form input[type=email]')?.value === 'jun@example.com', null, { timeout: 5000 }).catch(() => null)
  ok('7 account email filled in', (await editor.locator('.contact-form input[type=email]').inputValue()) === 'jun@example.com')
  await editor.locator('.contact-form textarea').fill(`편집기에서 보냄 ${TOKEN}-editor`)
  await send(editor)
  await editor.waitForSelector('.contact-sent')
  await editor.goto(BASE + '/contact?kind=bug', { waitUntil: 'networkidle' })
  await editor.waitForTimeout(300)
  ok('7 ?kind=bug picks bug report', (await editor.locator('.contact-kind input[value=bug]').isChecked()) && (await editor.locator('.contact-form .contact-hint').first().innerText()).includes('which device and browser'))
  await editor.close()

  // 8. 관리자 화면: 보기 · 메일로 답하기 · 답함 표시 · 지우기 · #messages 로 오면 그 칸으로
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR' })
  const admin = await adminContext.newPage()
  watch(admin, 'admin')
  admin.on('dialog', (dialog) => void dialog.accept())
  await login(admin, 'vmelabs@outlook.com', '운영자')
  await admin.goto(BASE + '/ko/admin#messages', { waitUntil: 'networkidle' })
  await admin.waitForSelector('#messages')
  await admin.waitForTimeout(300)
  const top = await admin.locator('#messages').evaluate((el) => el.getBoundingClientRect().top)
  ok('8 #messages scrolls to the card', top >= -2 && top < 200, `top ${Math.round(top)}`)
  const item = (suffix) => admin.locator('.admin-messages li', { hasText: `${TOKEN}-${suffix}` })
  ok('8 message from the landing page', (await item('ko').count()) === 1)
  const koText = await item('ko').innerText()
  ok('8 kind, page and email shown', koText.includes('고장 신고') && koText.includes('/ko') && koText.includes('mina@example.com') && koText.includes('한국어'), koText.replace(/\n/g, ' | ').slice(0, 200))
  ok('8 line breaks kept', (await item('ko').locator('.admin-messages__body').innerText()).includes('\n두 번째 줄'))
  ok('8 editor message knows it came from the editor', (await item('editor').innerText()).includes('/ko/app'))
  ok('8 bot message not stored', (await item('bot').count()) === 0)
  const mailto = await item('ko').locator('a', { hasText: '메일로 답하기' }).getAttribute('href')
  const url = new URL(mailto)
  ok('8 reply link', mailto.startsWith('mailto:mina@example.com?') && url.searchParams.get('subject').startsWith('Re: ReelMotion 문의 (#') && url.searchParams.get('body').includes(`> 내보내기가 99%에서 멈춰요 ${TOKEN}-ko`))
  await admin.locator('#messages').screenshot({ path: `${OUT}/admin-messages.png` })
  const openBefore = await admin.locator('.admin-messages__count').innerText()
  await item('ko').locator('button', { hasText: '답함으로 표시' }).click()
  await admin.waitForTimeout(300)
  ok('8 answered message hides', (await item('ko').count()) === 0 && (await admin.locator('.admin-messages__count').innerText()) !== openBefore)
  await admin.locator('#messages .admin-check input').check()
  ok('8 show answered', (await item('ko').count()) === 1 && (await item('ko').innerText()).includes('답함'))
  await admin.reload({ waitUntil: 'networkidle' })
  await admin.waitForSelector('#messages')
  ok('8 answered survives reload', (await item('ko').count()) === 0)
  await item('editor').locator('button', { hasText: '지우기' }).click()
  await admin.waitForTimeout(300)
  ok('8 deleted', (await item('editor').count()) === 0 && (await admin.locator('#messages [role=status]').innerText()) === '지웠어요.')
  await admin.reload({ waitUntil: 'networkidle' })
  await admin.waitForSelector('#messages')
  ok('8 deleted for good', (await item('editor').count()) === 0)

  // 9. 휴대폰 폭: 옆으로 밀리지 않고 고르기 칸을 누를 수 있다
  const phone = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ja-JP' })).newPage()
  watch(phone, 'phone')
  await phone.goto(BASE + '/ja/contact', { waitUntil: 'networkidle' })
  await phone.waitForSelector('.contact-form')
  ok('9 no sideways scroll at 390px', await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
  await phone.locator('.contact-kind', { hasText: '提案' }).tap()
  ok('9 tap picks a kind', await phone.locator('.contact-kind input[value=idea]').isChecked())
  const size = await phone.locator('.contact-kind span').first().boundingBox()
  ok('9 kind buttons are big enough to tap', size.height >= 44, `${Math.round(size.height)}px`)
  await phone.screenshot({ path: `${OUT}/contact-phone-ja.png`, fullPage: true })

  // 10. 좁은 휴대폰의 머리줄: 로고가 한 줄이고(전에는 360px 에서 「ReelMoti / on」), 단추들이 화면 안에 있고, 지구본으로 언어를 바꾼다
  for (const width of [320, 360]) {
    const narrow = await (await browser.newContext({ viewport: { width, height: 700 }, isMobile: true, hasTouch: true })).newPage()
    watch(narrow, `narrow-${width}`)
    for (const path of ['/contact', '/ko/contact', '/ja/contact']) {
      await narrow.goto(BASE + path, { waitUntil: 'networkidle' })
      await narrow.waitForTimeout(300)
      const header = await narrow.evaluate(() => {
        const box = (selector) => document.querySelector(selector)?.getBoundingClientRect()
        const logo = box('.nav__logo')
        const right = Math.max(...['.nav .lang-picker', '.nav .account-link', '.nav .account-avatar', '.nav__menu summary'].map((selector) => box(selector)?.right ?? 0))
        return { logoHeight: Math.round(logo.height), right: Math.round(right) }
      })
      ok(`10 ${width}px ${path} logo on one line, buttons inside`, header.logoHeight < 30 && header.right <= width - 12, JSON.stringify(header))
    }
    if (width === 320) {
      await narrow.locator('.nav .lang-picker select').selectOption('en')
      await narrow.waitForURL('**/contact')
      ok('10 globe changes the language', new URL(narrow.url()).pathname === '/contact')
    }
    await narrow.close()
  }

  console.log(results.join('\n'))
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors')
  await browser.close()
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
