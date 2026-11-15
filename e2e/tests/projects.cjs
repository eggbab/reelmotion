// 「내 작업」: 영상을 넣으면 이 브라우저에 저장 → 새로고침·뒤로 가기·언어 바꾸기에도 같은 작업 → 목록·이름 바꾸기·지우기 → 영상 다시 고르기
const { chromium } = require('playwright')
const { BASE, OUT, VIDEO, needMedia } = require('../env.cjs')
needMedia(VIDEO)
;(async () => {
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror ' + String(e).slice(0, 300)))
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push('console ' + m.text().slice(0, 300)))
  const results = []
  const ok = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`)
  const status = () => page.evaluate(() => document.querySelector('.ed-save')?.textContent ?? '')
  const projectParam = () => new URL(page.url()).searchParams.get('project')
  const waitSaved = (text = 'Saved in this browser') => page.waitForFunction((t) => document.querySelector('.ed-save')?.textContent === t, text, { timeout: 20000 })

  // 1) 빈 시작 화면
  await page.goto(BASE + '/app', { waitUntil: 'networkidle' })
  ok('start: no recent yet', (await page.locator('.ed-start .projects').count()) === 0)

  // 2) 영상 넣기 → 바로 저장, 주소에 id
  await page.locator('.drop input[type=file]').setInputFiles(VIDEO)
  await page.waitForFunction(() => document.querySelector('.ed-frame video')?.readyState >= 1)
  await waitSaved()
  const id = projectParam()
  ok('file saved + url has id', !!id && (await status()) === 'Saved in this browser', `id=${id} status=${await status()}`)

  // 3) 대본 적고 그래픽 만들기
  await page.locator('.transcript-panel textarea').fill('Hi, I am Mina Park, a sleep researcher.\nMost people fall asleep 37% faster.\nFirst, no screens. Second, same wake time.')
  await page.getByRole('button', { name: 'Make graphics' }).click()
  await page.waitForTimeout(300)
  const blocksBefore = await page.locator('.block').count()
  await page.locator('.ed-name').fill('Sleep talk')
  await page.waitForTimeout(1500)
  await waitSaved()
  ok('graphics made + renamed', blocksBefore > 2, `blocks=${blocksBefore}`)

  // 4) 새로고침 → 그대로
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForFunction(() => document.querySelector('.ed-frame video')?.readyState >= 1, null, { timeout: 15000 })
  const blocksAfter = await page.locator('.block').count()
  const nameAfter = await page.locator('.ed-name').inputValue()
  ok('reload restores project', blocksAfter === blocksBefore && nameAfter === 'Sleep talk' && projectParam() === id, `blocks ${blocksAfter} name ${nameAfter} status ${await status()}`)
  await page.screenshot({ path: `${OUT}/reopened.png` })

  // 5) 내 작업 창
  await page.getByRole('button', { name: 'My projects' }).click()
  await page.waitForSelector('.dialog--projects .project')
  const cards = await page.locator('.dialog--projects .project').count()
  const badge = await page.locator('.dialog--projects .project__badge').first().textContent()
  ok('dialog lists project with current badge', cards === 1 && badge === 'Open now', `cards ${cards} badge ${badge}`)
  await page.screenshot({ path: `${OUT}/dialog.png` })

  // 6) 새 작업 → 시작 화면에 최근 작업
  await page.getByRole('button', { name: 'New project' }).click()
  await page.waitForSelector('.ed-start')
  await page.waitForSelector('.ed-start .project')
  ok('new project → start with recent', projectParam() === null && (await page.locator('.ed-start .project').count()) === 1)
  await page.screenshot({ path: `${OUT}/start-recent.png` })

  // 7) 예시 영상: 둘러보기만 하면 저장 안 함, 고치면 저장
  await page.locator('.samples button').first().click()
  await page.waitForFunction(() => document.querySelector('.ed-frame video')?.readyState >= 1)
  await page.waitForTimeout(1500)
  ok('sample not saved until edited', projectParam() === null && (await page.locator('.ed-save').count()) === 0)
  await page.locator('.swatch').nth(2).click()
  await waitSaved()
  const sampleId = projectParam()
  ok('sample saved after edit', !!sampleId && sampleId !== id, `sampleId=${sampleId}`)

  // 8) 목록에서 다른 작업 열기
  await page.getByRole('button', { name: 'My projects' }).click()
  await page.waitForSelector('.dialog--projects .project')
  ok('dialog shows 2', (await page.locator('.dialog--projects .project').count()) === 2)
  await page.locator('.dialog--projects .project__open', { hasText: 'Sleep talk' }).click()
  await page.waitForFunction((want) => new URL(location.href).searchParams.get('project') === want && document.querySelector('.ed-frame video')?.readyState >= 1, id, { timeout: 15000 })
  const opened = await page.waitForFunction(() => document.querySelector('.ed-name')?.value === 'Sleep talk', null, { timeout: 10000 }).then(() => true, () => false)
  ok('open other project from list', opened, await page.locator('.ed-name').inputValue())

  // 9) 뒤로 가기 → 예시 작업
  await page.goBack()
  await page.waitForFunction((want) => new URL(location.href).searchParams.get('project') === want && document.querySelector('.ed-frame video')?.readyState >= 1, sampleId, { timeout: 15000 })
  ok('back button reopens previous project', true)

  // 10) 지금 작업(예시) 지우기 → 새 작업, 목록 1개
  await page.getByRole('button', { name: 'My projects' }).click()
  await page.waitForSelector('.dialog--projects .project.is-current')
  await page.locator('.dialog--projects .project.is-current .project__delete').click({ force: true })
  await page.locator('.dialog--projects .btn-danger').click()
  await page.waitForSelector('.ed-start')
  await page.waitForTimeout(500)
  ok('delete current → new start, 1 left', projectParam() === null && (await page.locator('.ed-start .project').count()) === 1)

  // 11) 영상이 저장 안 된 작업(큰 영상 흉내): media 를 지우고 hasMedia=false → 다시 고르기
  await page.evaluate(async (pid) => {
    const db = await new Promise((resolve, reject) => { const r = indexedDB.open('reelmotion'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) })
    await new Promise((resolve, reject) => {
      const tx = db.transaction(['projects', 'media'], 'readwrite')
      tx.objectStore('media').delete(pid)
      const store = tx.objectStore('projects')
      const get = store.get(pid)
      get.onsuccess = () => store.put({ ...get.result, hasMedia: false })
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  }, id)
  await page.goto(BASE + '/app?project=' + id, { waitUntil: 'networkidle' })
  await page.waitForSelector('.reconnect')
  const reconnectText = await page.locator('.reconnect').innerText()
  ok('reconnect panel shown', /Choose this project’s video again/.test(reconnectText) && (await page.locator('.ed-export').isDisabled()), reconnectText.replace(/\n/g, ' | ').slice(0, 160))
  await page.screenshot({ path: `${OUT}/reconnect.png` })
  await page.locator('.reconnect input[type=file]').setInputFiles(VIDEO)
  await page.waitForFunction(() => document.querySelector('.ed-frame video')?.readyState >= 1, null, { timeout: 15000 })
  await waitSaved()
  const mediaBack = await page.evaluate(async (pid) => {
    const db = await new Promise((resolve) => { const r = indexedDB.open('reelmotion'); r.onsuccess = () => resolve(r.result) })
    const value = await new Promise((resolve) => { const g = db.transaction('media').objectStore('media').get(pid); g.onsuccess = () => resolve(g.result) })
    db.close()
    return value?.blob?.size ?? 0
  }, id)
  ok('reconnected video saved again', mediaBack > 0 && (await page.locator('.block').count()) === blocksBefore, `media bytes ${mediaBack}`)

  // 12) 없는 작업 주소
  await page.goto(BASE + '/app?project=nope', { waitUntil: 'networkidle' })
  await page.waitForSelector('.ed-notice')
  ok('unknown project → notice, url cleaned', projectParam() === null, await page.locator('.ed-notice').innerText())

  // 13) 언어 바꿔도 같은 작업
  await page.goto(BASE + '/app?project=' + id, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => document.querySelector('.ed-frame video')?.readyState >= 1, null, { timeout: 15000 })
  await page.locator('.ed-top .lang-picker select').selectOption('ko')
  await page.waitForURL('**/ko/app?project=' + id, { waitUntil: 'commit' })
  await page.waitForTimeout(800)
  ok('language switch keeps project', (await page.locator('.ed-name').inputValue()) === 'Sleep talk' && (await page.getByRole('button', { name: '내 작업' }).count()) === 1)
  await page.screenshot({ path: `${OUT}/korean.png` })

  ok('no console errors', errors.length === 0, errors.join(' || '))
  console.log(results.join('\n'))
  await browser.close()
})()
