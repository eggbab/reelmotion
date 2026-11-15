// 개발용: 공유 그림(public/og/{en,ko,ja}.jpg, 1200×630)과 홈 화면 아이콘(public/apple-touch-icon.png, 180×180)을 만든다.
// 그림은 우리 그래픽 엔진이 예시 영상 위에 실제로 그린 것이다(og.html · src/motion/og.ts). 문구를 바꾸면 다시 돌린다.
//   node scripts/og.mjs
// Playwright(크로미움)가 있어야 한다. 이 저장소의 의존성에는 넣지 않았다(설치할 때 브라우저를 내려받지 않게).
import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const root = fileURLToPath(new URL('..', import.meta.url))

const server = await createServer({ root, logLevel: 'error', server: { port: 5199, strictPort: true } })
await server.listen()
const browser = await chromium.launch()
try {
  await mkdir(new URL('../public/og/', import.meta.url), { recursive: true })
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
  for (const lang of ['en', 'ko', 'ja']) {
    await page.goto(`http://localhost:5199/og.html?lang=${lang}`)
    await page.waitForSelector('body[data-ready="1"]', { timeout: 60_000 })
    await page.locator('#og').screenshot({ path: fileURLToPath(new URL(`../public/og/${lang}.jpg`, import.meta.url)), type: 'jpeg', quality: 88 })
    console.log(`public/og/${lang}.jpg`)
  }
  // 아이폰 홈 화면 아이콘: 어두운 바탕 위에 favicon 과 같은 표시(모서리는 기기가 둥글린다).
  const icon = await browser.newPage({ viewport: { width: 180, height: 180 }, deviceScaleFactor: 1 })
  await icon.setContent(
    '<body style="margin:0;background:#0e0e13;display:grid;place-items:center;height:180px">' +
      '<svg width="120" height="120" viewBox="0 0 24 24"><rect x="1" y="3.5" width="22" height="17" rx="5.5" fill="#00ffdd"/><path d="M9.6 8.2v7.6l6.6-3.8z" fill="#0e0e13"/></svg></body>',
  )
  await icon.screenshot({ path: fileURLToPath(new URL('../public/apple-touch-icon.png', import.meta.url)) })
  console.log('public/apple-touch-icon.png')
} finally {
  await browser.close()
  await server.close()
}
