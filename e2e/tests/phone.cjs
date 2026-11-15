// 휴대폰(아이폰 13 크기, 터치)에서 편집기 전체를 실제 손짓으로: 배치 → 고르기 → 끌기 → 길이 → 화면 밀기 → 눈금·막대로 위치 →
// 긴 영상의 가로 밀기·확대/축소 → 세로 영상 → 말로 고치기 → 내보내기 → 내 작업. 손짓은 CDP 의 터치 입력으로 넣는다(브라우저의 밀기 판단까지 탄다).
const { chromium, devices } = require('playwright')
const { execFileSync } = require('node:child_process')
const { BASE, OUT, LONG, needMedia } = require('../env.cjs')
needMedia(LONG)
// AI 서버(assist) 없이 돌릴 때는 E2E_SKIP_CHAT=1
const SKIP_CHAT = process.env.E2E_SKIP_CHAT === '1'

;(async () => {
  const browser = await chromium.launch()
  const context = await browser.newContext({ ...devices['iPhone 13'], locale: 'ko-KR', acceptDownloads: true })
  const page = await context.newPage()
  const client = await context.newCDPSession(page)
  const results = []
  const errors = []
  const ok = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`)
  page.on('pageerror', (e) => errors.push(`pageerror ${String(e).slice(0, 200)}`))
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(`console ${m.text().slice(0, 200)}`))

  const touch = (type, x, y) => client.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: Math.round(x), y: Math.round(y) }] })
  const swipe = async (x1, y1, x2, y2, steps = 14) => {
    await touch('touchStart', x1, y1)
    await page.waitForTimeout(60)
    for (let i = 1; i <= steps; i++) {
      await touch('touchMove', x1 + ((x2 - x1) * i) / steps, y1 + ((y2 - y1) * i) / steps)
      await page.waitForTimeout(16)
    }
    await page.waitForTimeout(60)
    await touch('touchEnd')
    await page.waitForTimeout(250)
  }
  const tapAt = (x, y) => page.touchscreen.tap(x, y)
  const block = (name) => page.locator(`.block[aria-label^="${name} "]`).first()
  const times = async (name) => {
    const [, start, end] = /([\d.]+)–([\d.]+)s/.exec(await block(name).getAttribute('aria-label'))
    return { start: Number(start), end: Number(end) }
  }
  const center = async (locator) => {
    const box = await locator.boundingBox()
    return { x: box.x + box.width / 2, y: box.y + box.height / 2, box }
  }
  const scrollY = () => page.evaluate(() => Math.round(window.scrollY))
  const playTime = async () => Number(/^([\d.]+)s/.exec(await page.locator('.ed-time').innerText())[1])
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  const vw = page.viewportSize().width

  // ── 1. 시작 화면 ──
  await page.goto(BASE + '/ko/app', { waitUntil: 'networkidle' })
  ok('1 start: no sideways scroll', (await overflow()) <= 0)
  await page.locator('.samples').scrollIntoViewIfNeeded()
  await page.waitForFunction(() => [...document.querySelectorAll('.samples img')].slice(0, 2).every((img) => img.complete && img.naturalWidth > 0))
  ok('1 start: sample pictures load', true)
  await page.screenshot({ path: `${OUT}/1-start.png` })

  // ── 2. 가로 예시 영상 → 배치 ──
  await page.locator('.samples button:not(.is-tall)').first().tap()
  await page.waitForSelector('.block')
  await page.waitForFunction(() => document.querySelector('.ed-frame video')?.videoWidth > 0)
  await page.waitForTimeout(500)
  // 시작 화면을 아래로 내린 채 골랐어도 편집 화면은 맨 위부터
  ok('2 opens at the top (preview first)', (await scrollY()) === 0, `scrollY ${await scrollY()}`)
  const layout = await page.evaluate(() => {
    const top = (selector) => Math.round(document.querySelector(selector).getBoundingClientRect().top)
    const rect = (selector) => document.querySelector(selector).getBoundingClientRect()
    return { stage: top('.ed-stage'), timeline: top('.timeline'), panel: top('.ed-panel'), stageH: Math.round(rect('.ed-stage').height), timelineBottom: Math.round(rect('.timeline').bottom), vh: window.innerHeight }
  })
  ok('2 order: preview → timeline → panel', layout.stage < layout.timeline && layout.timeline < layout.panel, JSON.stringify(layout))
  ok('2 timeline is on the first screen right under the preview', layout.timeline >= layout.stage + layout.stageH - 1 && layout.timelineBottom <= layout.vh, `top ${layout.timeline} bottom ${layout.timelineBottom} of ${layout.vh}`)
  ok('2 no sideways scroll', (await overflow()) <= 0)
  const header = await page.evaluate(() => {
    const name = document.querySelector('.ed-name').getBoundingClientRect()
    const lang = document.querySelector('.ed-top .lang-picker').getBoundingClientRect()
    const right = Math.max(...[...document.querySelectorAll('.ed-top > *, .ed-top__side > *')].map((el) => el.getBoundingClientRect().right))
    return { name: Math.round(name.width), lang: `${Math.round(lang.width)}x${Math.round(lang.height)}`, right: Math.round(right) }
  })
  ok('2 header: room for the project name, all inside the screen', header.name >= 90 && header.right <= vw, JSON.stringify(header))
  const small = await page.evaluate(() =>
    [...document.querySelectorAll('.editor button, .editor select, .editor input:not([type=file]), .editor textarea, .editor a')]
      .filter((el) => el.offsetParent !== null)
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width > 0 && (r.height < 40 || r.width < 30))
      .map(({ el, r }) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} ${Math.round(r.width)}x${Math.round(r.height)}`),
  )
  // 확대·축소 단추(30x32)와 글 속 링크만 40px 보다 작아도 된다.
  const tooSmall = small.filter((item) => !/^button\. 30x32|^a\./.test(item) && !item.startsWith('button.timeline'))
  ok('2 touch targets are at least 40px tall', tooSmall.length === 0, tooSmall.slice(0, 6).join(', ') || small.join(', '))
  await page.screenshot({ path: `${OUT}/2-workspace.png` })

  // 미리보기는 붙어 있다
  await page.evaluate(() => window.scrollTo(0, 500))
  await page.waitForTimeout(200)
  const stuck = await page.evaluate(() => Math.round(document.querySelector('.ed-stage').getBoundingClientRect().top))
  ok('2 preview stays at the top while scrolling', stuck === 0, `top ${stuck}`)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(200)

  // ── 3. 누르면 고르고, 고른 것만 끌린다 ──
  const before = await times('이름표')
  let c = await center(block('이름표'))
  await swipe(c.x, c.y, c.x + 60, c.y)
  ok('3 dragging an unselected block does not move it', JSON.stringify(await times('이름표')) === JSON.stringify(before), JSON.stringify(await times('이름표')))
  await tapAt(c.x, c.y)
  await page.waitForTimeout(300)
  ok('3 tap selects', await block('이름표').evaluate((el) => el.classList.contains('is-selected')))
  ok('3 inspector shows the selected graphic', (await page.locator('.ed-panel .form').count()) === 1 && (await page.locator('.tabs button[aria-selected=true]').innerText()).includes('그래픽'))
  const pps = await page.evaluate(() => document.querySelector('.timeline__area').getBoundingClientRect().width / 10)
  c = await center(block('이름표'))
  await swipe(c.x, c.y, c.x + 56, c.y)
  const moved = await times('이름표')
  const expected = 56 / pps
  ok('3 dragging the selected block moves it', Math.abs(moved.start - before.start - expected) < 0.35 && Math.abs(moved.end - moved.start - (before.end - before.start)) < 0.11, `${before.start}→${moved.start} (expected +${expected.toFixed(1)})`)

  // ── 4. 세로로 밀면 화면이 밀리고 블록은 그대로 ──
  c = await center(block('이름표'))
  const y0 = await scrollY()
  await swipe(c.x, c.y, c.x + 4, c.y - 180)
  const y1 = await scrollY()
  ok('4 vertical swipe on a selected block scrolls the page', y1 - y0 > 80, `scrollY ${y0}→${y1}`)
  ok('4 and the block did not move', JSON.stringify(await times('이름표')) === JSON.stringify(moved), JSON.stringify(await times('이름표')))
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(250)

  // ── 5. 끝을 끌면 길이가 바뀐다 ──
  const b5 = (await center(block('이름표'))).box
  await swipe(b5.x + b5.width - 6, b5.y + b5.height / 2, b5.x + b5.width - 6 - 30, b5.y + b5.height / 2)
  const resized = await times('이름표')
  ok('5 dragging the end makes it shorter, start stays', Math.abs(resized.start - moved.start) < 0.05 && resized.end < moved.end - 0.3, `${JSON.stringify(moved)}→${JSON.stringify(resized)}`)

  // ── 6. 눈금 줄·막대로 영상 위치 ──
  const ruler = (await center(page.locator('.timeline__ruler'))).box
  await swipe(ruler.x + 20, ruler.y + ruler.height / 2, ruler.x + ruler.width * 0.6, ruler.y + ruler.height / 2)
  const t6 = await playTime()
  ok('6 dragging on the ruler moves through the video', Math.abs(t6 - 6) < 0.6, `time ${t6}`)
  const seek = (await center(page.locator('.ed-seek'))).box
  await tapAt(seek.x + seek.width * 0.25, seek.y + seek.height / 2)
  await page.waitForTimeout(300)
  const t6b = await playTime()
  ok('6 tapping the seek bar under the preview', Math.abs(t6b - 2.5) < 0.8, `time ${t6b}`)
  // 빈 줄을 누르면 고르기 풀림
  const area = (await center(page.locator('.timeline__area'))).box
  const lanes = await page.locator('.timeline__lane').count()
  await tapAt(area.x + area.width - 30, ruler.y + ruler.height + (area.height - ruler.height) / lanes / 2)
  await page.waitForTimeout(250)
  ok('6 tapping an empty lane clears the selection', (await page.locator('.block.is-selected').count()) === 0)
  await page.screenshot({ path: `${OUT}/6-after-gestures.png` })

  // ── 7. 내보내기(휴대폰 크기에서) ──
  await page.locator('.ed-export').tap()
  await page.waitForSelector('#export-title')
  await page.waitForFunction(() => !/내보내는 중/.test(document.querySelector('#export-title')?.textContent ?? ''), null, { timeout: 180000 })
  const exportTitle = await page.locator('#export-title').innerText()
  ok('7 export finishes', exportTitle === '영상이 준비됐어요.', exportTitle)
  const dialog = await page.locator('.dialog').boundingBox()
  ok('7 export window fits the screen', dialog.x >= 0 && dialog.x + dialog.width <= vw && dialog.height <= page.viewportSize().height, `${Math.round(dialog.width)}x${Math.round(dialog.height)}`)
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('.dialog a[download]').tap()])
  await download.saveAs(`${OUT}/phone-export.mp4`)
  const probe = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name,width,height', '-of', 'csv=p=0', `${OUT}/phone-export.mp4`], { encoding: 'utf8' }).trim()
  ok('7 exported file is a real video', /h264,1280,720/.test(probe), probe.replace(/\n/g, ' | '))
  await page.screenshot({ path: `${OUT}/7-export.png` })
  await page.locator('.dialog__close').tap()

  // ── 8. 내 작업 창 ──
  await page.locator('.ed-projects').tap()
  await page.waitForSelector('.dialog--projects')
  const projects = await page.locator('.dialog--projects').boundingBox()
  ok('8 projects window fits the screen', projects.x >= 0 && projects.x + projects.width <= vw, `${Math.round(projects.width)} wide`)
  await page.screenshot({ path: `${OUT}/8-projects.png` })
  await page.locator('.dialog__close').tap()

  // ── 9. 말로 고치기 ──
  if (!SKIP_CHAT) {
    await page.locator('.tabs button').nth(2).tap()
    await page.locator('.chat-input textarea').scrollIntoViewIfNeeded()
    const ready = await page.evaluate(() => fetch('/api/assist/health').then((r) => r.json()).then((b) => b.ready))
    if (ready) {
      await page.locator('.chat-input textarea').fill('네온 스타일을 볼드 스타일로 바꿔 줘')
      await page.locator('.chat-input button[type=submit]').tap()
      await page.waitForFunction(() => document.querySelectorAll('.chat-entry.is-assistant:not(.is-thinking), .chat-entry.is-error').length > 0, null, { timeout: 120000 })
      const reply = await page.locator('.chat-entry').last().innerText()
      ok('9 chat editing answers on the phone', (await page.locator('.chat-entry.is-assistant').count()) >= 1, reply.replace(/\n/g, ' ').slice(0, 60))
      await page.screenshot({ path: `${OUT}/9-chat.png` })
    } else ok('9 chat editing (AI still loading — skipped)', true)
  }

  // ── 10. 세로 예시 영상: 미리보기가 화면을 다 차지하지 않는다 ──
  await page.goto(BASE + '/ko/app', { waitUntil: 'networkidle' })
  await page.locator('.samples button.is-tall').first().scrollIntoViewIfNeeded()
  await page.locator('.samples button.is-tall').first().tap()
  await page.waitForSelector('.block')
  await page.waitForFunction(() => document.querySelector('.ed-frame video')?.videoWidth > 0)
  await page.waitForTimeout(400)
  ok('10 opens at the top', (await scrollY()) === 0, `scrollY ${await scrollY()}`)
  const tall = await page.evaluate(() => {
    const frame = document.querySelector('.ed-frame').getBoundingClientRect()
    const video = document.querySelector('.ed-frame video')
    const stage = document.querySelector('.ed-stage').getBoundingClientRect()
    return { box: frame.width / frame.height, video: video.videoWidth / video.videoHeight, stage: Math.round(stage.height), vh: window.innerHeight, timelineTop: Math.round(document.querySelector('.timeline').getBoundingClientRect().top) }
  })
  ok('10 vertical video keeps its shape', Math.abs(tall.box - tall.video) < 0.01, `${tall.box.toFixed(3)} vs ${tall.video.toFixed(3)}`)
  ok('10 preview leaves room below (timeline starts on the first screen)', tall.stage <= tall.vh * 0.68 && tall.timelineTop > 0 && tall.timelineTop < tall.vh - 60, JSON.stringify(tall))
  await page.screenshot({ path: `${OUT}/10-vertical.png` })

  // ── 11. 긴 영상(70초): 가로로 밀기, 확대·축소 ──
  await page.goto(BASE + '/ko/app', { waitUntil: 'networkidle' })
  await page.locator('.drop input[type=file]').setInputFiles(LONG)
  await page.waitForFunction(() => document.querySelector('.ed-frame video')?.duration > 60, null, { timeout: 60000 })
  ok('11 no graphics yet: timeline hidden, panel right under the preview', !(await page.locator('.timeline').isVisible()))
  await page.locator('.transcript-panel textarea').fill('안녕하세요 저는 김하늘입니다.\n오늘은 세 가지를 말씀드릴게요.\n첫째, 물을 자주 마시기.\n둘째, 일찍 자기.\n셋째, 매일 걷기.\n꾸준히 하면 석 달 만에 체력이 40% 좋아져요.')
  await page.getByRole('button', { name: /그래픽 만들기|그래픽 다시 만들기/ }).tap()
  await page.waitForSelector('.block')
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(400)
  const scroller = page.locator('.timeline__scroller')
  const widths = () => scroller.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth, left: Math.round(el.scrollLeft) }))
  const w0 = await widths()
  ok('11 long video: timeline is wider than the screen', w0.scroll > w0.client * 3, JSON.stringify(w0))
  // 빈 줄에서 가로로 밀기
  const sb = await scroller.boundingBox()
  const laneY = sb.y + sb.height - 30
  await swipe(sb.x + sb.width - 30, laneY, sb.x + 40, laneY)
  const w1 = await widths()
  ok('11 swiping sideways scrolls the timeline', w1.left > 100, JSON.stringify(w1))
  const pageY = await scrollY()
  // 고르지 않은 블록 위에서 밀어도 타임라인이 밀리고 블록은 그대로
  await scroller.evaluate((el) => (el.scrollLeft = 0))
  await page.waitForTimeout(200)
  const firstBlock = page.locator('.block').first()
  const label0 = await firstBlock.getAttribute('aria-label')
  const fb = await firstBlock.boundingBox()
  await swipe(Math.min(fb.x + fb.width / 2, sb.x + sb.width - 40), fb.y + fb.height / 2, sb.x + 20, fb.y + fb.height / 2)
  const w2 = await widths()
  ok('11 swiping on an unselected block scrolls instead of moving it', w2.left > 40 && (await firstBlock.getAttribute('aria-label')) === label0, `${JSON.stringify(w2)} ${label0}`)
  ok('11 page did not jump while scrolling the timeline', Math.abs((await scrollY()) - pageY) < 4)
  // 축소 → 화면에 꼭 맞게
  const zoomOut = page.locator('.timeline__zoom button').first()
  const zoomIn = page.locator('.timeline__zoom button').nth(1)
  for (let i = 0; i < 12 && !(await zoomOut.isDisabled()); i++) await zoomOut.tap()
  const w3 = await widths()
  ok('11 zoom out until it fits', w3.scroll <= w3.client + 1 && (await zoomOut.isDisabled()), JSON.stringify(w3))
  await zoomIn.tap()
  await zoomIn.tap()
  const w4 = await widths()
  ok('11 zoom in again', w4.scroll > w3.scroll * 1.8, JSON.stringify(w4))
  ok('11 no sideways scroll of the page', (await overflow()) <= 0)
  await page.screenshot({ path: `${OUT}/11-long.png` })

  console.log(results.join('\n'))
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors')
  await browser.close()
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
