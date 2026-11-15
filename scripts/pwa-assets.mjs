// 개발용: 앱으로 설치할 때 쓰는 그림을 만든다(public/manifest.webmanifest 가 가리킨다).
//   public/icons/icon-192.png · icon-512.png   둥근 어두운 바탕 + favicon 과 같은 표시
//   public/icons/maskable-512.png              가장자리가 잘려도 되게(안드로이드) 바탕을 꽉 채우고 표시는 가운데 작게
//   public/screenshots/wide.png(1280×720) · narrow.png(720×1280)  설치 창에 보이는 화면 — 실제 편집기에 예시 영상을 연 모습(영어)
// 편집기 모습을 바꾸면 다시 돌린다:  node scripts/pwa-assets.mjs
// Playwright(크로미움)가 있어야 한다. 이 저장소의 의존성에는 넣지 않았다(scripts/og.mjs 와 같다).
import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const root = fileURLToPath(new URL('..', import.meta.url))
const out = (file) => fileURLToPath(new URL(`../public/${file}`, import.meta.url))

const MARK = '<rect x="1" y="3.5" width="22" height="17" rx="5.5" fill="#00ffdd"/><path d="M9.6 8.2v7.6l6.6-3.8z" fill="#0e0e13"/>'
/** tile: 둥근 바탕(투명 위), full: 꽉 찬 바탕. mark 는 표시의 크기(한 변에 대한 비율). */
const iconHtml = (size, { full, mark }) =>
  `<body style="margin:0;width:${size}px;height:${size}px;display:grid;place-items:center;background:${full ? '#0e0e13' : 'transparent'}">` +
  `<div style="width:100%;height:100%;display:grid;place-items:center;background:#0e0e13;border-radius:${full ? 0 : 22.5}%">` +
  `<svg width="${size * mark}" height="${size * mark}" viewBox="0 0 24 24">${MARK}</svg></div></body>`

const server = await createServer({ root, logLevel: 'error', server: { port: 5198, strictPort: true } })
await server.listen()
const browser = await chromium.launch()
try {
  await mkdir(out('icons'), { recursive: true })
  await mkdir(out('screenshots'), { recursive: true })
  for (const [file, size, options] of [
    ['icons/icon-192.png', 192, { full: false, mark: 0.62 }],
    ['icons/icon-512.png', 512, { full: false, mark: 0.62 }],
    ['icons/maskable-512.png', 512, { full: true, mark: 0.5 }],
  ]) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 })
    await page.setContent(iconHtml(size, options))
    await page.screenshot({ path: out(file), omitBackground: true })
    await page.close()
    console.log(`public/${file}`)
  }

  // 설치 창의 화면 그림: 영어 편집기에 첫 예시 영상을 열고 제목 그래픽을 고른 모습
  for (const [file, viewport, scale, touch] of [
    ['screenshots/wide.png', { width: 1280, height: 720 }, 1, false],
    ['screenshots/narrow.png', { width: 360, height: 640 }, 2, true],
  ]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: scale, hasTouch: touch, isMobile: touch, locale: 'en-US' })
    const page = await context.newPage()
    await page.goto('http://localhost:5198/app', { waitUntil: 'networkidle' })
    await page.locator('.samples button:not(.is-tall)').first().click()
    await page.waitForSelector('.block')
    await page.waitForFunction(() => document.querySelector('.ed-frame video')?.readyState >= 2)
    // 그래픽이 다 나타난 장면(5초)으로 옮기고 글꼴이 다 뜨기를 기다린다
    await page.locator('.ed-seek').evaluate((input) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      setter.call(input, '5')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(1200)
    await page.screenshot({ path: out(file) })
    await context.close()
    console.log(`public/${file}`)
  }
} finally {
  await browser.close()
  await server.close()
}
