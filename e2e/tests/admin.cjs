// 관리자 화면을 실제 화면에서: 로그인 전 → 일반 회원(막힘) → 관리자(상태·숫자·사람·요금제 바꾸기·찾기·백업 내려받기·알림) → 휴대폰 폭.
const { chromium } = require('playwright')
const fs = require('node:fs')
const { BASE, OUT } = require('../env.cjs')
const MEMBER = `member-${Date.now()}@example.com`

;(async () => {
  const browser = await chromium.launch()
  const results = []
  const errors = []
  const ok = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`)
  const watch = (page, tag) => {
    page.on('pageerror', (e) => errors.push(`${tag} pageerror ${String(e).slice(0, 160)}`))
    page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(`${tag} console ${m.text().slice(0, 160)}`))
  }
  const devLogin = async (page, email, name) => {
    await page.goto(BASE + '/ko/account', { waitUntil: 'networkidle' })
    await page.waitForSelector('.account-dev')
    await page.locator('.account-dev input[type=email]').fill(email)
    await page.locator('.account-dev input:not([type=email])').fill(name)
    await page.locator('.account-dev button').click()
    await page.waitForSelector('.account-facts')
  }

  // 1. 로그인 전
  const guest = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR' })).newPage()
  watch(guest, 'guest')
  await guest.goto(BASE + '/ko/admin', { waitUntil: 'networkidle' })
  await guest.waitForSelector('.account-card')
  ok('1 guest sees login prompt', (await guest.locator('main').innerText()).includes('관리자 메일로 로그인하세요.'))
  ok('1 login link returns to admin', (await guest.locator('main a.btn-mint').getAttribute('href')) === '/ko/account?next=%2Fko%2Fadmin')
  ok('1 page is hidden from search', (await guest.locator('meta[name=robots]').getAttribute('content')) === 'noindex')

  // 2. 일반 회원
  const memberContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR' })
  const member = await memberContext.newPage()
  watch(member, 'member')
  await devLogin(member, MEMBER, '회원')
  ok('2 member has no admin link', (await member.locator('.account-actions a', { hasText: '관리자 화면' }).count()) === 0)
  await member.goto(BASE + '/ko/admin', { waitUntil: 'networkidle' })
  await member.waitForSelector('.account-note')
  ok('2 member is refused', (await member.locator('main').innerText()).includes('관리자만 볼 수 있어요.'))
  ok('2 member api refused', (await member.evaluate(() => fetch('/api/admin/overview').then((r) => r.status))) === 403)

  // 3. 관리자
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR', acceptDownloads: true })
  const admin = await adminContext.newPage()
  watch(admin, 'admin')
  await devLogin(admin, 'vmelabs@outlook.com', '운영자')
  const adminLink = admin.locator('.account-actions a', { hasText: '관리자 화면' })
  ok('3 admin link on account page', (await adminLink.count()) === 1)
  await adminLink.click()
  await admin.waitForSelector('.admin-checks li')
  const main = await admin.locator('main').innerText()
  ok('3 status shows five checks', (await admin.locator('.admin-checks li').count()) === 5, String(await admin.locator('.admin-checks li').count()))
  ok('3 all checks ok', (await admin.locator('.admin-pill.is-ok').count()) === 5)
  ok('3 numbers', /가입자\s*\n?\s*\d+/.test(main) && main.includes('이번 달 내보내기'))
  ok('3 settings pills', main.includes(process.env.E2E_ENFORCED === '1' ? '요금제 한도 켜짐' : '요금제 한도 꺼짐') && main.includes('카드 결제 연결 전') && main.includes('구글 로그인 꺼짐') && main.includes('Claude·ChatGPT 커넥터 켜짐'))
  ok('3 recent people include the member', (await admin.locator('.admin-people li', { hasText: MEMBER }).count()) === 1)
  ok('3 alerts card', main.includes('받는 곳: vmelabs@outlook.com') && main.includes('메일 보내기 설정 전'))
  ok('3 test mail disabled without mail account', await admin.locator('button', { hasText: '시험 메일 보내기' }).isDisabled())
  await admin.screenshot({ path: `${OUT}/admin-desk.png`, fullPage: true })

  // 4. 요금제 바꾸기
  const row = admin.locator('.admin-people li', { hasText: MEMBER })
  await row.locator('button', { hasText: '요금제 바꾸기' }).click()
  await row.locator('select').selectOption('creator')
  await row.locator('input[type=number]').fill('14')
  await row.locator('button', { hasText: '저장' }).click()
  await admin.waitForSelector('.account-note[role=status]')
  ok('4 saved message', (await admin.locator('.account-note[role=status]').innerText()) === `${MEMBER}: 크리에이터 요금제로 바꿨어요.`)
  await admin.waitForFunction((email) => [...document.querySelectorAll('.admin-people li')].some((li) => li.textContent.includes(email) && li.textContent.includes('크리에이터')), MEMBER)
  ok('4 list shows new plan', (await admin.locator('.admin-people li', { hasText: MEMBER }).innerText()).includes('크리에이터'))
  const memberMe = await member.evaluate(() => fetch('/api/me', { cache: 'no-store' }).then((r) => r.json()))
  ok('4 member really on creator', memberMe.user.plan === 'creator')
  // 잘못된 일수
  const row2 = admin.locator('.admin-people li', { hasText: MEMBER })
  await row2.locator('button', { hasText: '요금제 바꾸기' }).click()
  await row2.locator('select').selectOption('pro')
  await row2.locator('input[type=number]').fill('0')
  await row2.locator('button', { hasText: '저장' }).click()
  await admin.waitForTimeout(500)
  // 브라우저가 먼저 막는다(최솟값 1) — 서버로 보내지 않음
  ok('4 bad days blocked by the browser', await row2.locator('input[type=number]').evaluate((input) => input.validity.rangeUnderflow))
  const stillCreator = await member.evaluate(() => fetch('/api/me', { cache: 'no-store' }).then((r) => r.json()))
  ok('4 plan unchanged after blocked save', stillCreator.user.plan === 'creator')
  await row2.locator('button', { hasText: '그만두기' }).click()

  // 5. 찾기
  await admin.locator('.admin-search input').fill(MEMBER.slice(0, 12))
  await admin.locator('.admin-search button').click()
  await admin.waitForFunction(() => !document.querySelector('.account-hint')?.textContent.includes('최근 가입'))
  ok('5 search finds the member', (await admin.locator('.admin-people li').count()) >= 1 && (await admin.locator('.admin-people li', { hasText: MEMBER }).count()) === 1)
  await admin.locator('.admin-search input').fill('nobody-here-xyz')
  await admin.locator('.admin-search button').click()
  await admin.waitForFunction(() => document.querySelector('main').textContent.includes('찾는 사람이 없어요.'))
  ok('5 empty search message', true)

  // 6. 백업 내려받기
  const first = admin.locator('.admin-backups li').first()
  const name = await first.locator('span').innerText()
  const [download] = await Promise.all([admin.waitForEvent('download'), first.locator('a').click()])
  const file = `${OUT}/${download.suggestedFilename()}`
  await download.saveAs(file)
  ok('6 backup downloads', download.suggestedFilename() === name && fs.statSync(file).size > 10000, `${name} ${fs.statSync(file).size} bytes`)

  // 7. 휴대폰 폭
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR', storageState: await adminContext.storageState() })
  const mobile = await phone.newPage()
  watch(mobile, 'phone')
  await mobile.goto(BASE + '/ko/admin', { waitUntil: 'networkidle' })
  await mobile.waitForSelector('.admin-checks li')
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  ok('7 phone: no sideways scroll', overflow <= 0, String(overflow))
  await mobile.screenshot({ path: `${OUT}/admin-phone.png`, fullPage: true })
  // 영어 화면
  await mobile.goto(BASE + '/admin', { waitUntil: 'networkidle' })
  await mobile.waitForSelector('.admin-checks li')
  ok('7 english admin', (await mobile.locator('h1').innerText()) === 'Admin' && (await mobile.locator('main').innerText()).includes('Speech server'))

  console.log(results.join('\n'))
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors')
  await browser.close()
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
