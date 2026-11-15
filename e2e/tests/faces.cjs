// 그래픽이 얼굴을 가리지 않게(src/faces): 실제 크롬에서 예시 영상의 얼굴을 찾아(브라우저 안 UltraFace) 그래픽의 쪽을 정하는지.
//  1. 사람이 오른쪽에 앉은 영상(podcast-a): 오른쪽에 놓이던 숫자가 왼쪽으로, 왼쪽의 제목·이름표·목록은 그대로 — 그리는 그림도 왼쪽
//  2. 「위치」에서 오른쪽으로 바꾸면 그대로(다시 옮기지 않는다)
//  3. 사람이 가운데인 영상(explainer): 숫자는 오른쪽 그대로
//  4. 세로 영상(shorts-a): 얼굴을 찾지 않고(파일도 받지 않는다) 「위치」 칸이 없다
//  5. 한국어 화면의 「위치」 이름
const { chromium } = require('playwright')
const { BASE, OUT } = require('../env.cjs')

/** 예시 영상 단추의 차례(src/media/clips.ts 의 CLIPS 차례) */
const SAMPLE = { explainer: 0, 'shorts-a': 2, 'podcast-a': 4 }

;(async () => {
  const browser = await chromium.launch()
  const results = []
  const errors = []
  const ok = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`)
  const watch = (page, tag) => {
    page.on('pageerror', (e) => errors.push(`${tag} pageerror ${String(e).slice(0, 160)}`))
    page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(`${tag} console ${m.text().slice(0, 160)}`))
  }

  async function openSample(page, clip, path = '/app') {
    const asked = []
    page.on('request', (request) => /faces\.worker|ultraface|ort-wasm-simd-threaded-/.test(request.url()) && asked.push(request.url().split('/').pop()))
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
    await page.locator('.samples button').nth(SAMPLE[clip]).click()
    await page.waitForSelector('.block')
    return asked
  }

  /** 그래픽 종류(타임라인 블록 이름의 앞)를 골라 「위치」 칸의 값. 칸이 없으면 null */
  async function sideOf(page, kind) {
    await page.locator(`.block[aria-label^="${kind}"]`).first().click()
    const field = page.locator('[data-testid=graphic-side]')
    return (await field.count()) > 0 ? field.inputValue() : null
  }

  /** 얼굴 찾기가 끝나 숫자의 쪽이 바뀔 때까지(최대 30초) */
  async function waitSide(page, kind, want) {
    const until = Date.now() + 30000
    let side = null
    while (Date.now() < until) {
      side = await sideOf(page, kind)
      if (side === want) return side
      await page.waitForTimeout(400)
    }
    return side
  }

  /** 그래픽 판(영상 위 캔버스)의 위쪽 60%에 그려진 점들의 가로 가운데(0~1). 자막·이름표(아래쪽)는 빼고 숫자만 본다 */
  async function inkCenter(page, time) {
    await page.evaluate((t) => {
      const video = document.querySelector('video')
      video.pause()
      video.currentTime = t
    }, time)
    await page.waitForTimeout(700)
    return page.evaluate(() => {
      const canvas = document.querySelector('.ed-frame canvas')
      const { width, height } = canvas
      const data = canvas.getContext('2d').getImageData(0, 0, width, Math.round(height * 0.6)).data
      let sum = 0
      let count = 0
      for (let i = 3; i < data.length; i += 4 * 3) {
        if (data[i] > 40) {
          sum += ((i - 3) / 4) % width
          count++
        }
      }
      return count === 0 ? null : sum / count / width
    })
  }

  // ── 1. 사람이 오른쪽(podcast-a) ──
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' })).newPage()
  watch(page, 'podcast-a')
  const started = Date.now()
  const asked = await openSample(page, 'podcast-a')
  const statSide = await waitSide(page, 'Counter', 'left')
  ok('1 face on the right: the counter moves left', statSide === 'left', `${statSide} after ${((Date.now() - started) / 1000).toFixed(1)}s`)
  const others = [await sideOf(page, 'Title'), await sideOf(page, 'Name tag'), await sideOf(page, 'Checklist')]
  ok('1 title, name tag and checklist stay on the left', others.every((side) => side === 'left'), others.join(','))
  ok('1 captions have no position choice', (await sideOf(page, 'Captions')) === null)
  ok('1 face model, runtime and worker come from this site', ['faces.worker', 'ultraface-rfb-320', 'ort-wasm-simd-threaded-'].every((name) => asked.some((file) => file.startsWith(name))), asked.join(' '))
  const counter = await page.locator('.block[aria-label^="Counter"]').first().getAttribute('aria-label')
  const counterAt = Number(/(\d+\.\d)–/.exec(counter)[1]) + 0.9
  const leftInk = await inkCenter(page, counterAt)
  ok('1 the counter is drawn on the left half', leftInk !== null && leftInk < 0.45, `ink centre ${leftInk?.toFixed(2)}`)
  await page.locator('.ed-frame').screenshot({ path: `${OUT}/podcast-a-left.png` })

  // ── 2. 사람이 고르면 그대로 ──
  await page.locator('.block[aria-label^="Counter"]').first().click()
  await page.locator('[data-testid=graphic-side]').selectOption('right')
  await page.waitForTimeout(1500)
  ok('2 choosing right keeps it right', (await sideOf(page, 'Counter')) === 'right')
  const rightInk = await inkCenter(page, counterAt)
  ok('2 the counter is drawn on the right half', rightInk !== null && rightInk > 0.55, `ink centre ${rightInk?.toFixed(2)}`)
  const hint = await page.locator('[data-testid=graphic-side]').locator('xpath=..').locator('small').innerText()
  ok('2 the hint says it is set automatically', /keeps the speaker’s face clear/.test(hint), hint)

  // ── 3. 사람이 가운데(explainer) ──
  const middle = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' })).newPage()
  watch(middle, 'explainer')
  await openSample(middle, 'explainer')
  // 얼굴 찾기가 끝나면(편집기가 .ed-frame 에 data-faces="done") 쪽이 정해진다 — 끝날 때까지 기다린 뒤 본다
  await middle.waitForSelector('.ed-frame[data-faces=done]', { timeout: 30000 })
  ok('3 face in the middle: the counter stays right', (await sideOf(middle, 'Counter')) === 'right')

  // ── 4. 세로 영상 ──
  const tall = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' })).newPage()
  watch(tall, 'shorts-a')
  const tallAsked = await openSample(tall, 'shorts-a')
  await tall.waitForTimeout(3000)
  ok('4 portrait video: no position choice', (await sideOf(tall, 'Counter')) === null && (await tall.locator('.ed-frame[data-faces]').count()) === 0)
  ok('4 portrait video: face files are not downloaded', tallAsked.length === 0, tallAsked.join(' '))

  // ── 5. 한국어 ──
  const ko = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR' })).newPage()
  watch(ko, 'ko')
  await openSample(ko, 'podcast-a', '/ko/app')
  const koSide = await waitSide(ko, '숫자', 'left')
  const label = await ko.locator('[data-testid=graphic-side]').locator('xpath=..').locator('span').first().innerText()
  const options = await ko.locator('[data-testid=graphic-side] option').allInnerTexts()
  ok('5 Korean: 위치 · 왼쪽/오른쪽', koSide === 'left' && label === '위치' && options.join(',') === '왼쪽,오른쪽', `${koSide} ${label} ${options}`)

  console.log(results.join('\n'))
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors')
  await browser.close()
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
