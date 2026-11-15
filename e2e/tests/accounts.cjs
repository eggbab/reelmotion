// 계정(시험용 가짜 로그인 AUTH_DEV=1): 로그인 → 작업이 계정에 저장 → 다른 브라우저에서 열림 → 로그아웃·탈퇴
const { chromium } = require('playwright')
const { BASE, OUT, VIDEO, needMedia } = require('../env.cjs')
needMedia(VIDEO)
;(async () => {
  const browser = await chromium.launch()
  const results = []
  const ok = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`)
  const errors = []
  const device = async (label) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' })
    const page = await context.newPage()
    page.on('pageerror', (e) => errors.push(`${label} pageerror ${String(e).slice(0, 200)}`))
    page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(`${label} console ${m.text().slice(0, 200)}`))
    return { context, page }
  }
  const devLogin = async (page, email, name) => {
    await page.goto(BASE + '/account', { waitUntil: 'networkidle' })
    await page.waitForSelector('.account-dev')
    await page.locator('.account-dev input[type=email]').fill(email)
    await page.locator('.account-dev input:not([type=email])').fill(name)
    await page.locator('.account-dev button').click()
    await page.waitForSelector('.account-facts')
  }
  const saved = (page, text) => page.waitForFunction((t) => document.querySelector('.ed-save')?.textContent === t, text, { timeout: 25000 })

  // 기기 1: 로그인 → 머리에 동그라미 → 편집기에서 만들기 → 계정에도 저장
  const one = await device('d1')
  await devLogin(one.page, 'mina@example.com', 'Mina')
  ok('account page shows profile', (await one.page.locator('.account-facts').innerText()).includes('mina@example.com'))
  ok('header avatar', (await one.page.locator('.site-header .account-avatar').innerText()) === 'M')
  await one.page.screenshot({ path: `${OUT}/account.png` })
  await one.page.goto(BASE + '/app', { waitUntil: 'networkidle' })
  await one.page.locator('.drop input[type=file]').setInputFiles(VIDEO)
  await one.page.waitForFunction(() => document.querySelector('.ed-frame video')?.readyState >= 1)
  await one.page.locator('.transcript-panel textarea').fill('Hi, I am Mina Park.\nMost people fall asleep 37% faster.')
  await one.page.getByRole('button', { name: 'Make graphics' }).click()
  await one.page.locator('.ed-name').fill('Synced talk')
  await saved(one.page, 'Saved in this browser and your account')
  const id = new URL(one.page.url()).searchParams.get('project')
  const blocks = await one.page.locator('.block').count()
  ok('device 1 saved to account', !!id && blocks > 1, `id ${id} blocks ${blocks}`)
  await one.page.screenshot({ path: `${OUT}/editor-synced.png` })

  // 기기 2: 같은 계정 → 목록에 계정 작업(영상 다시 고르기) → 열기 → 영상 고르기 → 이어서 편집
  const two = await device('d2')
  await devLogin(two.page, 'mina@example.com', 'Mina')
  await two.page.goto(BASE + '/app', { waitUntil: 'networkidle' })
  await two.page.waitForSelector('.ed-start .project')
  const card = two.page.locator('.ed-start .project', { hasText: 'Synced talk' })
  ok('device 2 sees account project', (await card.count()) === 1 && /Choose the video again/.test(await card.innerText()))
  await card.locator('.project__open').click()
  await two.page.waitForSelector('.reconnect')
  ok('device 2 opens with reconnect', (await two.page.locator('.block').count()) === blocks)
  await two.page.locator('.reconnect input[type=file]').setInputFiles(VIDEO)
  await two.page.waitForFunction(() => document.querySelector('.ed-frame video')?.readyState >= 1, null, { timeout: 15000 })
  await two.page.locator('.ed-name').fill('Synced talk v2')
  await saved(two.page, 'Saved in this browser and your account')
  ok('device 2 edit saved', true)

  // 기기 1: 다시 열면 기기 2 에서 고친 판
  await one.page.goto(BASE + '/app?project=' + id, { waitUntil: 'networkidle' })
  await one.page.waitForFunction(() => document.querySelector('.ed-name')?.value === 'Synced talk v2', null, { timeout: 15000 }).catch(() => {})
  ok('device 1 gets newer version', (await one.page.locator('.ed-name').inputValue()) === 'Synced talk v2', await one.page.locator('.ed-name').inputValue())
  ok('device 1 keeps its video', (await one.page.locator('.ed-frame video').count()) === 1)

  // 공용 컴퓨터: 기기 1 에서 로그아웃 → 다른 사람 로그인 → 그 사람 계정으로 올라가지 않는다
  await one.page.goto(BASE + '/account', { waitUntil: 'networkidle' })
  await one.page.waitForSelector('.account-facts')
  await one.page.getByRole('button', { name: 'Log out' }).click()
  await one.page.waitForSelector('.account-dev')
  ok('logout shows login again', (await one.page.locator('.site-header .account-link').innerText()) === 'Log in')
  await devLogin(one.page, 'other@example.com', 'Other')
  await one.page.goto(BASE + '/app', { waitUntil: 'networkidle' })
  await one.page.waitForTimeout(1500)
  const otherProjects = await one.page.evaluate(async () => (await (await fetch('/api/projects')).json()).projects.length)
  ok("another person's login does not receive Mina's project", otherProjects === 0, `other has ${otherProjects}`)

  // 기기 2 에서 탈퇴 → 계정 작업도 사라짐
  await two.page.goto(BASE + '/account', { waitUntil: 'networkidle' })
  await two.page.waitForSelector('.account-facts')
  await two.page.getByRole('button', { name: 'Delete my account' }).click()
  await two.page.getByRole('button', { name: 'Are you sure? Press again to delete.' }).click()
  await two.page.waitForSelector('.account-dev')
  const deletedNote = await two.page.locator('.account-note').first().innerText()
  ok('account deleted', /deleted/.test(deletedNote), deletedNote)
  const relogin = await two.context.newPage()
  await devLogin(relogin, 'mina@example.com', 'Mina')
  const after = await relogin.evaluate(async () => (await (await fetch('/api/projects')).json()).projects.length)
  ok('deleted account starts empty', after === 0, `projects ${after}`)

  ok('no console errors', errors.length === 0, errors.join(' || '))
  console.log(results.join('\n'))
  await browser.close()
})()
