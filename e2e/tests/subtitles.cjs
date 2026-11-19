// 자막 파일(SRT·VTT, src/captions/subtitles.ts): 실제 화면에서 내려받아 파일 꼴과 글이 맞는지.
//  1. 받아쓴 말 탭 아래 「Subtitle file」의 SRT — 번호·시각·글, 화면 자막과 같은 곳(문장 끝)에서 나뉨, 파일 이름
//  2. VTT — 머리 줄 WEBVTT, 시각은 마침표
//  3. 일본어는 빈칸 없이, 한국어 화면의 이름
//  4. 영상만 넣고 아직 말이 없으면 단추가 없다
const fs = require('node:fs')
const { chromium } = require('playwright')
const { BASE, OUT, VIDEO, needMedia } = require('../env.cjs')
needMedia(VIDEO)

;(async () => {
  const browser = await chromium.launch()
  const results = []
  const errors = []
  const ok = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`)
  const watch = (page, tag) => {
    page.on('pageerror', (e) => errors.push(`${tag} pageerror ${String(e).slice(0, 160)}`))
    page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(`${tag} console ${m.text().slice(0, 160)}`))
  }
  const save = async (page, label) => {
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('.subtitle-files button', { hasText: label }).click()])
    const path = `${OUT}/${download.suggestedFilename()}`
    await download.saveAs(path)
    return { name: download.suggestedFilename(), text: fs.readFileSync(path, 'utf8') }
  }

  // ── 1·2. 영어 예시 영상 ──
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US', acceptDownloads: true })).newPage()
  watch(page, 'en')
  await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' })
  await page.locator('.samples button').nth(0).click()
  await page.waitForSelector('.block')
  await page.getByRole('tab', { name: 'Transcript' }).click()
  await page.locator('.ed-name').fill('Sleep tips')
  const srt = await save(page, 'SRT')
  const blocks = srt.text.replace(/^\uFEFF/, '').trim().split('\n\n')
  ok('1 SRT file named after the project', srt.name === 'Sleep tips.srt', srt.name)
  ok('1 SRT starts with a byte-order mark (old Windows players keep Korean·Japanese)', srt.text.startsWith('\uFEFF'))
  ok('1 numbered cues with comma milliseconds', blocks.every((block, i) => new RegExp(`^${i + 1}\\n\\d\\d:\\d\\d:\\d\\d,\\d{3} --> \\d\\d:\\d\\d:\\d\\d,\\d{3}\\n.+$`).test(block)), blocks.slice(0, 2).join(' | '))
  ok('1 first cue is the first sentence', blocks[0].split('\n')[2] === 'Three habits for better sleep.', blocks[0])
  const vtt = await save(page, 'VTT')
  ok('2 VTT has the WEBVTT header and dot milliseconds', vtt.name === 'Sleep tips.vtt' && /^WEBVTT\n\n\d\d:\d\d:\d\d\.\d{3} --> /.test(vtt.text), vtt.text.slice(0, 60))
  ok('2 same cues as the SRT', vtt.text.trim().split('\n\n').length - 1 === blocks.length)

  // ── 3. 일본어 ──
  const ja = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ja-JP', acceptDownloads: true })).newPage()
  watch(ja, 'ja')
  await ja.goto(`${BASE}/ja/app`, { waitUntil: 'networkidle' })
  await ja.locator('.samples button').nth(0).click()
  await ja.waitForSelector('.block')
  await ja.getByRole('tab', { name: '書き起こし' }).click()
  const jaLabel = await ja.locator('.subtitle-files > span').innerText()
  const jaSrt = await save(ja, 'SRT')
  const firstJa = jaSrt.text.replace(/^\uFEFF/, '').split('\n')[2]
  ok('3 Japanese cue text has no spaces between words, label in Japanese', jaLabel === '字幕ファイル' && firstJa === 'よく眠れる三つの習慣。', `${jaLabel} ${firstJa}`)

  // ── 4. 말이 없으면 단추가 없다 ──
  const empty = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR' })).newPage()
  watch(empty, 'ko')
  await empty.goto(`${BASE}/ko/app`, { waitUntil: 'networkidle' })
  await empty.locator('.drop input[type=file]').setInputFiles(VIDEO)
  await empty.waitForSelector('.transcript-panel textarea')
  ok('4 no subtitle buttons before there are words', (await empty.locator('.subtitle-files').count()) === 0)
  await empty.locator('.transcript-panel textarea').fill('안녕하세요. 오늘은 잠 이야기예요.')
  ok('4 buttons appear with words, Korean label', (await empty.locator('.subtitle-files > span').innerText()) === '자막 파일')
  await empty.locator('.subtitle-files').screenshot({ path: `${OUT}/subtitle-files-ko.png` })

  console.log(results.join('\n'))
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors')
  await browser.close()
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
