// 요금제 한도(ENFORCE_PLANS=1)를 실제 화면에서: 로그인 막힘 → 로그인 후 그 작업으로 → 무료 워터마크 → 취소는 안 셈 →
// 한 달 3번 다 쓰면 막힘 → 요금제 보기 → 관리 명령으로 크리에이터 → 워터마크 없음 → 1분 넘는 영상은 무료에서 막힘.
const { chromium } = require('playwright')
const { execFileSync } = require('node:child_process')
const { BASE, OUT, LONG, APP_CONTAINER, needMedia } = require('../env.cjs')
needMedia(LONG)
const EMAIL = `plan-${Date.now()}@example.com`
const admin = (...args) =>
  execFileSync('docker', ['exec', APP_CONTAINER, 'node', '--disable-warning=ExperimentalWarning', 'main.js', 'admin', ...args], { encoding: 'utf8' }).trim()

;(async () => {
  const browser = await chromium.launch()
  const results = []
  const errors = []
  const ok = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`)
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR', acceptDownloads: true })
  const page = await context.newPage()
  page.on('pageerror', (e) => errors.push(`pageerror ${String(e).slice(0, 200)}`))
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(`console ${m.text().slice(0, 200)}`))
  const me = () => page.evaluate(() => fetch('/api/me', { cache: 'no-store' }).then((r) => r.json()))
  const title = () => page.locator('#export-title').innerText()
  const exportNow = async () => {
    await page.locator('.ed-export').click()
    await page.waitForSelector('#export-title')
    await page.waitForFunction(() => !/내보내는 중/.test(document.querySelector('#export-title')?.textContent ?? ''), null, { timeout: 180000 })
    return title()
  }
  const closeDialog = () => page.locator('.dialog__close').click()

  // 1. 로그인하지 않고 내보내기 → 막힘(로그인)
  await page.goto(BASE + '/ko/app', { waitUntil: 'networkidle' })
  await page.locator('.samples button').first().click()
  await page.waitForSelector('.block')
  await page.locator('.ed-name').fill('한도 시험')
  await page.waitForFunction(() => new URL(location.href).searchParams.get('project'), null, { timeout: 15000 })
  const workUrl = page.url()
  ok('1 anonymous export is blocked (login)', (await exportNow()) === '로그인하면 내보낼 수 있어요.')
  const loginHref = await page.locator('.dialog a.btn-mint').getAttribute('href')
  ok('1 login link keeps the work address', loginHref.startsWith('/ko/account?next=') && decodeURIComponent(loginHref).endsWith(new URL(workUrl).search), loginHref)
  await page.screenshot({ path: `${OUT}/1-blocked-login.png` })

  // 2. 로그인 → 하던 작업으로 돌아옴
  await page.locator('.dialog a.btn-mint').click()
  await page.waitForSelector('.account-dev')
  ok('2 login card says you will go back', (await page.locator('.account-card').first().innerText()).includes('로그인하면 하던 작업으로 돌아가요.'))
  await page.screenshot({ path: `${OUT}/2-login-card.png` })
  await page.locator('.account-dev input[type=email]').fill(EMAIL)
  await page.locator('.account-dev input:not([type=email])').fill('한도')
  await page.locator('.account-dev button').click()
  await page.waitForURL((url) => url.pathname === '/ko/app', { timeout: 15000 })
  ok('2 back in the same work after login', page.url() === workUrl, page.url())
  await page.waitForSelector('.block')
  ok('2 work reopened with its name', (await page.locator('.ed-name').inputValue()) === '한도 시험')

  // 3. 무료: 워터마크 + 남은 횟수
  const t3 = await exportNow()
  const body3 = await page.locator('.dialog').innerText()
  ok('3 free export done', t3 === '영상이 준비됐어요.', t3)
  ok('3 watermark note shown', body3.includes('오른쪽 아래에 작은 ReelMotion 표시'))
  ok('3 exports left 2', body3.includes('이번 달 내보내기가 2번 남았어요.'))
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('.dialog a[download]').click()])
  await download.saveAs(`${OUT}/free.mp4`)
  await page.screenshot({ path: `${OUT}/3-done-free.png` })
  await closeDialog()
  await page.waitForTimeout(800)
  ok('3 server counted 1', (await me()).usage.exports === 1)

  // 4. 내보내다 그만두면 세지 않는다
  await page.locator('.ed-export').click()
  await page.waitForFunction(() => /내보내는 중… [1-9]/.test(document.querySelector('#export-title')?.textContent ?? ''), null, { timeout: 30000 })
  await page.locator('.dialog .btn-outline').click()
  await page.waitForTimeout(1500)
  ok('4 cancelled export closes the dialog', (await page.locator('.dialog').count()) === 0)
  ok('4 cancelled export not counted', (await me()).usage.exports === 1)

  // 5. 두 번 더(3/3) → 네 번째는 막힘(한도) → 요금제 보기 → 내 계정의 요금제 칸
  for (const left of [1, 0]) {
    await exportNow()
    ok(`5 exports left ${left}`, (await page.locator('.dialog').innerText()).includes(`이번 달 내보내기가 ${left}번 남았어요.`))
    await closeDialog()
    await page.waitForTimeout(600)
  }
  ok('5 fourth export blocked (limit)', (await exportNow()) === '이번 달 내보내기를 다 썼어요.')
  await page.screenshot({ path: `${OUT}/5-blocked-limit.png` })
  await page.locator('.dialog a.btn-mint').click()
  await page.waitForSelector('#plans .account-plans')
  await page.waitForTimeout(500)
  const plansTop = await page.evaluate(() => document.getElementById('plans').getBoundingClientRect().top)
  ok('5 plans card scrolled into view', plansTop >= 0 && plansTop < 200, `top ${Math.round(plansTop)}`)
  const plansText = await page.locator('#plans').innerText()
  ok('5 usage 3/3 shown', plansText.includes('이번 달 내보내기 3/3번'), plansText.split('\n').slice(0, 4).join(' | '))
  ok('5 paid plans say coming soon', (plansText.match(/곧 나와요/g) ?? []).length === 2 && plansText.includes('카드 결제는 곧 열려요.'))
  ok('5 back-to-work button', (await page.locator('.account-actions a.btn-mint').innerText()) === '하던 작업으로 돌아가기')
  await page.screenshot({ path: `${OUT}/5-account-plans.png`, fullPage: true })

  // 6. 관리 명령으로 크리에이터 30일 → 워터마크 없음, 남은 횟수 26
  const setPlan = admin('set-plan', EMAIL, 'creator', '30')
  ok('6 admin set-plan', /creator until \d{4}-\d{2}-\d{2}/.test(setPlan), setPlan)
  await page.locator('.account-actions a.btn-mint').click()
  await page.waitForURL((url) => url.pathname === '/ko/app')
  await page.waitForSelector('.block')
  const t6 = await exportNow()
  const body6 = await page.locator('.dialog').innerText()
  ok('6 creator export done', t6 === '영상이 준비됐어요.', t6)
  ok('6 no watermark note', !body6.includes('ReelMotion 표시'))
  ok('6 exports left 26', body6.includes('이번 달 내보내기가 26번 남았어요.'))
  const [download2] = await Promise.all([page.waitForEvent('download'), page.locator('.dialog a[download]').click()])
  await download2.saveAs(`${OUT}/creator.mp4`)
  await closeDialog()
  await page.waitForTimeout(600)
  ok('6 admin usage', admin('usage', EMAIL).includes('\t4 exports'), admin('usage', EMAIL).split('\n').slice(-1)[0])

  // 7. 무료로 되돌리고 70초 영상 → 막힘(길이)
  admin('set-plan', EMAIL, 'free')
  await page.goto(BASE + '/ko/app', { waitUntil: 'networkidle' })
  await page.locator('.ed-start .drop input[type=file], .drop input[type=file]').first().setInputFiles(LONG)
  await page.waitForFunction(() => document.querySelector('.ed-frame video')?.readyState >= 1, null, { timeout: 30000 })
  await page.waitForTimeout(800)
  ok('7 long video blocked on free (too long)', (await exportNow()).startsWith('이 영상은 지금 요금제가 받는 길이보다 길어요.'))
  ok('7 plans button', (await page.locator('.dialog a.btn-mint').innerText()) === '요금제 보기')
  await page.screenshot({ path: `${OUT}/7-blocked-long.png` })

  // 8. 소개 페이지 요금표는 그대로 「곧 나와요」, 내 계정 ?plan= 은 그 요금제를 표시
  await page.goto(BASE + '/ko/account?plan=pro', { waitUntil: 'networkidle' })
  await page.waitForSelector('#plans .account-plans')
  ok('8 ?plan=pro is highlighted', (await page.locator('.account-plans li.is-chosen').innerText()).includes('프로'))
  await page.goto(BASE + '/ko#pricing', { waitUntil: 'networkidle' })
  ok('8 landing paid plans still coming soon', (await page.locator('.plans .tag').count()) === 2 && (await page.locator('.plans a[href*="/account?plan="]').count()) === 0)

  // 9. 영어·일본어·휴대폰 화면의 요금제 칸
  for (const [path, file] of [['/account', 'en'], ['/ja/account', 'ja']]) {
    await page.goto(BASE + path + '#plans', { waitUntil: 'networkidle' })
    await page.waitForSelector('#plans .account-plans')
    await page.screenshot({ path: `${OUT}/9-${file}.png`, fullPage: true })
  }
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, locale: 'ko-KR', storageState: await context.storageState() })
  const mobile = await phone.newPage()
  await mobile.goto(BASE + '/ko/account#plans', { waitUntil: 'networkidle' })
  await mobile.waitForSelector('#plans .account-plans')
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  ok('9 phone: no sideways scroll', overflow <= 0, `overflow ${overflow}`)
  await mobile.screenshot({ path: `${OUT}/9-phone.png`, fullPage: true })

  console.log(results.join('\n'))
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors')
  await browser.close()
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
