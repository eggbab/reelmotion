// 되돌리기·다시 하기(src/editor/history.ts): 실제 화면에서 고친 것마다 한 번에 되돌아가고 다시 하기로 앞으로 가는지.
//  1. 처음(아무것도 안 고침)에는 두 단추가 꺼져 있다 — 저절로 한 일(그래픽 자동 만들기·얼굴 피하기)은 되돌리기에 들지 않는다
//  2. 숫자 고치기 → 되돌리기 단추 → 다시 하기 단추
//  3. 글자를 여러 번 쳐도 한 번에 되돌아간다(Ctrl+Z)
//  4. Delete 키로 지운 그래픽이 Ctrl+Z 로 돌아온다, Ctrl+Shift+Z 로 다시 지워진다
//  5. 타임라인에서 끈 것은 한 번에 제자리로
//  6. 스타일 바꾸기 되돌리기
//  7. 글 칸 안의 Ctrl+Z 는 그 칸의 글자 되돌리기(편집기 되돌리기가 아님)
//  8. 한국어 이름
const { chromium } = require('playwright')
const { BASE, OUT } = require('../env.cjs')

;(async () => {
  const browser = await chromium.launch()
  const results = []
  const errors = []
  const ok = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`)
  const watch = (page, tag) => {
    page.on('pageerror', (e) => errors.push(`${tag} pageerror ${String(e).slice(0, 160)}`))
    page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(`${tag} console ${m.text().slice(0, 160)}`))
  }

  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' })).newPage()
  watch(page, 'editor')
  await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' })
  // 사람이 가운데인 예시 영상(얼굴 피하기가 쪽을 정해도 옮기지 않는다)
  await page.locator('.samples button').nth(0).click()
  await page.waitForSelector('.block')
  await page.waitForSelector('.ed-frame[data-faces=done]', { timeout: 30000 })
  const undoButton = page.getByRole('button', { name: 'Undo', exact: true })
  const redoButton = page.getByRole('button', { name: 'Redo', exact: true })
  const blocks = () => page.locator('.block').evaluateAll((items) => items.map((item) => item.getAttribute('aria-label')))
  /** 그래픽 칸: 이름(span)이 꼭 같은 칸의 입력(글 칸은 칸 이름에 글이 섞여 getByLabel 로는 못 찾는다) */
  const fieldOf = (name) => page.locator('.form label.field').filter({ has: page.locator('xpath=./span', { hasText: new RegExp(`^${name}$`) }) }).locator('input, textarea').first()
  /** 글 칸에서 나와(편집기 단축키가 듣게) 미리보기 아래 빈 곳을 누른다 */
  const leaveField = async () => {
    await page.locator('.ed-time').click()
  }

  // ── 1 ──
  ok('1 nothing to undo before you change anything', (await undoButton.isDisabled()) && (await redoButton.isDisabled()))

  // ── 2. 숫자 ──
  await page.locator('.block[aria-label^="Counter"]').first().click()
  const number = fieldOf('Number')
  const original = await number.inputValue()
  await number.fill('99')
  await leaveField()
  ok('2 a change turns on Undo', !(await undoButton.isDisabled()) && (await redoButton.isDisabled()))
  await undoButton.click()
  ok('2 Undo puts the number back', (await number.inputValue()) === original, `${original} → ${await number.inputValue()}`)
  ok('2 then Redo is on', !(await redoButton.isDisabled()))
  await redoButton.click()
  ok('2 Redo brings the change back', (await number.inputValue()) === '99')

  // ── 3. 여러 글자 ──
  await page.locator('.block[aria-label^="Title"]').first().click()
  const text = fieldOf('Text')
  const title = await text.inputValue()
  await text.press('End')
  await text.pressSequentially(' today', { delay: 60 })
  ok('3 typed six letters', (await text.inputValue()) === `${title} today`)
  await leaveField()
  await page.keyboard.press('Control+z')
  ok('3 one Ctrl+Z undoes the whole word', (await fieldOf('Text').inputValue()) === title, await fieldOf('Text').inputValue())
  await page.keyboard.press('Control+Shift+z')
  ok('3 Ctrl+Shift+Z redoes it', (await fieldOf('Text').inputValue()) === `${title} today`)

  // ── 4. 지우기 ──
  const before = await blocks()
  await page.locator('.block[aria-label^="Checklist"]').first().click()
  await page.keyboard.press('Delete')
  const afterDelete = await blocks()
  ok('4 Delete removes the checklist', afterDelete.length === before.length - 1 && !afterDelete.some((label) => label.startsWith('Checklist')))
  await page.keyboard.press('Control+z')
  ok('4 Ctrl+Z brings it back', JSON.stringify(await blocks()) === JSON.stringify(before))
  await page.keyboard.press('Control+y')
  ok('4 Ctrl+Y removes it again', (await blocks()).length === before.length - 1)
  await page.keyboard.press('Control+z')

  // ── 5. 타임라인 끌기 ──
  const block = page.locator('.block[aria-label^="Counter"]').first()
  const labelBefore = await block.getAttribute('aria-label')
  const box = await block.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  for (let i = 1; i <= 12; i++) await page.mouse.move(box.x + box.width / 2 + i * 12, box.y + box.height / 2)
  await page.mouse.up()
  const labelMoved = await block.getAttribute('aria-label')
  ok('5 dragging moves the counter', labelMoved !== labelBefore, `${labelBefore} → ${labelMoved}`)
  await undoButton.click()
  ok('5 one Undo puts it back where it was', (await page.locator('.block[aria-label^="Counter"]').first().getAttribute('aria-label')) === labelBefore)

  // ── 6. 스타일 ──
  const pressed = () => page.locator('.swatch[aria-pressed=true]').innerText()
  const style = await pressed()
  await page.locator('.swatch', { hasText: 'Tokyo' }).click()
  ok('6 style changes to Tokyo', (await pressed()).includes('Tokyo'))
  await undoButton.click()
  ok('6 Undo brings the old style back', (await pressed()) === style, await pressed())

  // ── 7. 글 칸 안의 Ctrl+Z ──
  const steps = await page.locator('.ed-history button').evaluateAll((items) => items.map((item) => item.disabled))
  await page.locator('.block[aria-label^="Title"]').first().click()
  const field = fieldOf('Text')
  await field.click()
  await field.press('End')
  await field.pressSequentially('!', { delay: 30 })
  await field.press('Control+z')
  const graphicsCount = (await blocks()).length
  ok('7 Ctrl+Z inside a text box does not undo other edits', graphicsCount === before.length && (await pressed()) === style, `${graphicsCount} blocks, steps before ${steps}`)

  // ── 8. 한국어 ──
  const ko = await (await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR', hasTouch: true, isMobile: true })).newPage()
  watch(ko, 'ko')
  await ko.goto(`${BASE}/ko/app`, { waitUntil: 'networkidle' })
  await ko.locator('.samples button').nth(0).click()
  await ko.waitForSelector('.block')
  const names = await ko.locator('.ed-history button').evaluateAll((items) => items.map((item) => item.getAttribute('aria-label')))
  const sizes = await ko.locator('.ed-history button').evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().height)))
  const overflow = await ko.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  ok('8 Korean names, big enough to tap, the row fits a phone', names.join(',') === '되돌리기,다시 하기' && sizes.every((size) => size >= 40) && overflow <= 0, `${names} ${sizes} overflow ${overflow}`)
  await ko.locator('.ed-controls').screenshot({ path: `${OUT}/controls-ko-phone.png` })

  console.log(results.join('\n'))
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors')
  await browser.close()
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
