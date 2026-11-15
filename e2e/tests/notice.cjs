// 공지를 실제 화면에서: 관리자가 쓰기 → 방문자 소개 페이지 띠·편집기 위에 보임(언어별, 빈 언어는 영어로) → 닫기(다시 와도 안 보임)
// → 관리자가 다시 저장하면 다시 보임 → 끄면 베타 안내로 돌아옴. 화면을 이어받을 때 오류가 없어야 한다.
const { chromium } = require('playwright')
const { BASE, OUT } = require('../env.cjs')
const KO = '11월 20일 새벽 2시부터 3시까지 점검이 있어요.'
const EN = 'Maintenance on Nov 20, 2–3 AM (KST).'

;(async () => {
  const browser = await chromium.launch()
  const results = []
  const errors = []
  const ok = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`)
  const watch = (page, tag) => {
    page.on('pageerror', (e) => errors.push(`${tag} pageerror ${String(e).slice(0, 160)}`))
    page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(`${tag} console ${m.text().slice(0, 200)}`))
  }

  // 관리자: 공지 쓰기
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR' })
  const admin = await adminContext.newPage()
  watch(admin, 'admin')
  await admin.goto(BASE + '/ko/account', { waitUntil: 'networkidle' })
  await admin.waitForSelector('.account-dev')
  await admin.locator('.account-dev input[type=email]').fill('vmelabs@outlook.com')
  await admin.locator('.account-dev input:not([type=email])').fill('운영자')
  await admin.locator('.account-dev button').click()
  await admin.waitForSelector('.account-facts')
  await admin.goto(BASE + '/ko/admin', { waitUntil: 'networkidle' })
  await admin.waitForSelector('.admin-notice')
  const save = async () => {
    // 저장 요청의 응답을 기다린 뒤 알림 글을 읽는다(앞의 글과 같을 수 있어서)
    await Promise.all([
      admin.waitForResponse((response) => response.url().endsWith('/api/admin/notice') && response.request().method() === 'PUT'),
      admin.locator('.admin-notice button[type=submit]').click(),
    ])
    await admin.waitForTimeout(200)
    return admin.locator('.admin-notice .account-note').innerText()
  }
  // 빈 채로 켜면 막힘(앞선 시험의 글이 남아 있을 수 있어 비운다)
  for (let i = 0; i < 3; i++) await admin.locator('.admin-field textarea').nth(i).fill('')
  await admin.locator('.admin-check input').check()
  ok('1 empty notice refused', (await save()) === '공지를 보이려면 한 언어 이상 글을 적어 주세요.')
  await admin.locator('.admin-levels input[value=warning]').check()
  await admin.locator('.admin-field textarea').nth(0).fill(KO)
  await admin.locator('.admin-field textarea').nth(1).fill(EN)
  ok('1 notice saved', (await save()) === '저장했어요.')
  await admin.locator('.admin-notice').screenshot({ path: `${OUT}/admin-notice.png` })

  // 방문자: 소개 페이지·편집기·언어별
  const visitorContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR' })
  const visitor = await visitorContext.newPage()
  watch(visitor, 'visitor')
  await visitor.goto(BASE + '/ko', { waitUntil: 'networkidle' })
  await visitor.waitForSelector('.site-header .notice')
  ok('2 landing shows the notice instead of beta strip', (await visitor.locator('.site-header .notice').innerText()).includes(KO) && (await visitor.locator('.site-header .announce__badge').count()) === 0)
  ok('2 warning style', await visitor.locator('.site-header .notice').evaluate((el) => el.classList.contains('is-warning')))
  await visitor.screenshot({ path: `${OUT}/landing-notice.png` })
  await visitor.goto(BASE + '/terms', { waitUntil: 'networkidle' })
  await visitor.waitForSelector('.site-header .notice')
  ok('2 english page shows english text', (await visitor.locator('.site-header .notice').innerText()).includes(EN))
  await visitor.goto(BASE + '/ja/help', { waitUntil: 'networkidle' })
  await visitor.waitForSelector('.site-header .notice')
  ok('2 japanese page falls back to english', (await visitor.locator('.site-header .notice').innerText()).includes(EN))
  await visitor.goto(BASE + '/ko/app', { waitUntil: 'networkidle' })
  await visitor.waitForSelector('.editor > .notice')
  ok('2 editor shows notice above the top bar', (await visitor.locator('.editor > .notice').innerText()).includes(KO))
  await visitor.screenshot({ path: `${OUT}/editor-notice.png` })

  // 닫기 → 다시 와도 안 보임(편집기·소개 페이지 모두)
  await visitor.locator('.editor > .notice .notice__close').click()
  ok('3 closed in editor', (await visitor.locator('.notice').count()) === 0)
  await visitor.goto(BASE + '/ko', { waitUntil: 'networkidle' })
  await visitor.waitForTimeout(800)
  ok('3 stays closed on landing (beta strip back)', (await visitor.locator('.site-header .notice').count()) === 0 && (await visitor.locator('.site-header .announce__badge').count()) === 1)

  // 관리자가 다시 저장 → 다시 보임
  ok('4 saved again', (await save()) === '저장했어요.')
  await visitor.reload({ waitUntil: 'networkidle' })
  await visitor.waitForSelector('.site-header .notice', { timeout: 5000 }).catch(() => null)
  ok('4 shown again after re-save', (await visitor.locator('.site-header .notice').count()) === 1)

  // 휴대폰 폭
  const phone = await (await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR' })).newPage()
  watch(phone, 'phone')
  await phone.goto(BASE + '/ko', { waitUntil: 'networkidle' })
  await phone.waitForSelector('.site-header .notice')
  const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  const closeBox = await phone.locator('.site-header .notice__close').boundingBox()
  ok('5 phone: no sideways scroll, close button inside', overflow <= 0 && closeBox.x + closeBox.width <= 390, `overflow ${overflow}`)
  await phone.screenshot({ path: `${OUT}/phone-notice.png` })

  // 끄기 → 베타 안내로
  await admin.locator('.admin-check input').uncheck()
  ok('6 turned off', (await save()) === '저장했어요.')
  const fresh = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR' })).newPage()
  watch(fresh, 'fresh')
  await fresh.goto(BASE + '/ko', { waitUntil: 'networkidle' })
  await fresh.waitForTimeout(800)
  ok('6 no notice when off', (await fresh.locator('.notice').count()) === 0 && (await fresh.locator('.site-header .announce__badge').count()) === 1)

  console.log(results.join('\n'))
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors')
  await browser.close()
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
