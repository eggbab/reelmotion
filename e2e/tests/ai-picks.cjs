// 「AI로 강조할 순간 찾기」를 실제 화면에서, 우리 서버의 실제 AI(assist)로: 숫자·순서·이름이 없는 이야기를 넣으면 규칙은 제목·자막만 →
// 카드가 그 까닭을 말하고 → 누르면 AI 가 고른 그래픽이 그 문장을 말하는 때에 더해지고 → 되돌리기. AI 가 꺼져 있거나 한도면 카드가 그렇게 말한다.
const { chromium } = require('playwright')
const { BASE, OUT, VIDEO, needMedia } = require('../env.cjs')
needMedia(VIDEO)

const VLOG = [
  'Good morning everyone.',
  'Today I am taking you along for a day in my life as a nurse.',
  'I start my shift at seven, so I am up by five thirty.',
  'Coffee first, always.',
  'Then it is a long shift on the ward.',
  'Honestly, every day is a little different, and I love that.',
].join('\n')

;(async () => {
  const browser = await chromium.launch()
  const results = []
  const errors = []
  const ok = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`)
  const watch = (page, tag) => {
    page.on('pageerror', (e) => errors.push(`${tag} pageerror ${String(e).slice(0, 160)}`))
    page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(`${tag} console ${m.text().slice(0, 160)}`))
  }
  const blocks = (page) => page.locator('.block').evaluateAll((items) => items.map((item) => item.getAttribute('aria-label')))

  /** 영상을 넣고 대본을 적은 뒤 「그래픽 만들기」 */
  async function prepare(page) {
    await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' })
    await page.locator('.drop input[type=file]').setInputFiles(VIDEO)
    await page.waitForSelector('.transcript-panel textarea')
    await page.locator('.transcript-panel textarea').fill(VLOG)
    await page.getByRole('button', { name: 'Make graphics' }).click()
    await page.waitForSelector('.block')
  }

  // ── 1. 규칙은 제목·자막만 → 카드가 까닭을 말한다 ──
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' })).newPage()
  watch(page, 'editor')
  await prepare(page)
  const before = await blocks(page)
  ok('1 rules alone make only a title and captions', before.length === 2 && before.every((label) => /^(Title|Captions) /.test(label)), before.join(' | '))
  await page.waitForSelector('.ai-picks')
  ok('1 the AI card says why and offers to look for more', (await page.locator('.ai-picks').innerText()).includes('has no numbers, steps or names') && (await page.locator('.ai-picks.is-thin').count()) === 1)
  await page.locator('.ai-picks').screenshot({ path: `${OUT}/card-thin.png` })

  // ── 2. 누르면 AI 가 고른 그래픽이 더해진다 ──
  const started = Date.now()
  await page.locator('.ai-picks__run').click()
  ok('2 while it runs the button waits and the status says so', await page.locator('.ai-picks__run').isDisabled() && (await page.locator('.ai-picks__status').innerText()).startsWith('Looking'))
  await page.waitForFunction(() => /^(Added|No moments)/.test(document.querySelector('.ai-picks__status')?.textContent ?? ''), null, { timeout: 180_000 })
  const status = await page.locator('.ai-picks__status').innerText()
  const after = await blocks(page)
  const added = after.filter((label) => !before.includes(label))
  ok('2 the AI added graphics', /^Added \d+\./.test(status) && after.length > before.length, `${((Date.now() - started) / 1000).toFixed(1)}s · ${status} · ${added.join(' | ')}`)
  // 더한 그래픽은 그 문장을 말하는 때에(그래픽끼리 가운데 자리가 겹치지 않는다)
  const times = after.map((label) => ({ kind: label.split(' ')[0], start: Number(/([\d.]+)–/.exec(label)[1]), end: Number(/–([\d.]+)s/.exec(label)[1]) }))
  const center = times.filter((item) => ['Title', 'Counter', 'Chart', 'Checklist', 'Quote'].includes(item.kind)).sort((a, b) => a.start - b.start)
  ok('2 centre graphics do not overlap and stay inside the video', center.every((item, i) => i === 0 || item.start >= center[i - 1].end - 0.05) && times.every((item) => item.end <= 24.4), JSON.stringify(center))
  await page.screenshot({ path: `${OUT}/after-ai.png` })
  await page.locator('.ai-picks').screenshot({ path: `${OUT}/card-done.png` })

  // ── 3. 되돌리기 ──
  await page.locator('.ai-picks .chat-undo').click()
  const undone = await blocks(page)
  ok('3 undo brings back exactly what was there', JSON.stringify(undone) === JSON.stringify(before) && (await page.locator('.ai-picks__status').innerText()) === 'Undone.', undone.join(' | '))

  // ── 4. 손으로 고치면 되돌리기는 감춘다(고친 것을 덮지 않게) ──
  await page.locator('.ai-picks__run').click()
  await page.waitForFunction(() => /^(Added|No moments)/.test(document.querySelector('.ai-picks__status')?.textContent ?? ''), null, { timeout: 180_000 })
  if ((await page.locator('.ai-picks .chat-undo').count()) === 1) {
    await page.locator('.add .pill').first().click()
    ok('4 after a manual change the undo button goes away', (await page.locator('.ai-picks .chat-undo').count()) === 0)
  } else {
    ok('4 after a manual change the undo button goes away', true, 'second run added nothing — skipped')
  }

  // ── 5. AI 가 꺼져 있으면 카드를 보이지 않고, 한도에 걸리면 그렇게 말한다 ──
  const off = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' })).newPage()
  watch(off, 'off')
  await off.route('**/api/assist/health', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"ready":false}' }))
  await prepare(off)
  await off.waitForTimeout(800)
  ok('5 no card when the AI server is not ready', (await off.locator('.ai-picks').count()) === 0)
  const limited = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' })).newPage()
  watch(limited, 'limited')
  await limited.route('**/api/assist/highlights', (route) => route.fulfill({ status: 429, contentType: 'application/json', body: '{"error":"rate_limited"}' }))
  await prepare(limited)
  await limited.waitForSelector('.ai-picks')
  await limited.locator('.ai-picks__run').click()
  await limited.waitForFunction(() => /20 times/.test(document.querySelector('.ai-picks__status')?.textContent ?? ''))
  ok('5 rate limit: a plain message, the button works again', (await limited.locator('.ai-picks__status.is-error').count()) === 1 && !(await limited.locator('.ai-picks__run').isDisabled()))

  // ── 6. 한국어 화면 ──
  const ko = await (await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR', hasTouch: true, isMobile: true })).newPage()
  watch(ko, 'ko')
  await ko.goto(`${BASE}/ko/app`, { waitUntil: 'networkidle' })
  await ko.locator('.drop input[type=file]').setInputFiles(VIDEO)
  await ko.waitForSelector('.transcript-panel textarea')
  await ko.locator('.transcript-panel textarea').fill('오늘은 아침 여섯 시에 일어났어요.\n요즘 미라클 모닝 도전 중이거든요.\n일어나자마자 물 한 잔 마시고 스트레칭부터 해요.\n그리고 삼십 분 정도 책을 읽어요.\n이렇게 하니까 하루가 훨씬 길게 느껴져요.')
  await ko.getByRole('button', { name: '그래픽 만들기' }).click()
  await ko.waitForSelector('.ai-picks')
  const overflow = await ko.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  ok('6 Korean card at phone width fits', (await ko.locator('.ai-picks h3').innerText()).includes('AI로 강조할 순간 찾기') && overflow <= 0, `overflow ${overflow}`)
  await ko.locator('.ai-picks').screenshot({ path: `${OUT}/card-ko-phone.png` })

  console.log(results.join('\n'))
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors')
  await browser.close()
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
