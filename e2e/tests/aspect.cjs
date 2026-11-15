// 미리보기 상자의 비율이 영상 비율과 같은지(다르면 그래픽이 영상과 어긋난다): 여러 창 크기 × 가로·세로 영상
const { chromium } = require('playwright')
const { BASE } = require('../env.cjs')
;(async () => {
  const browser = await chromium.launch()
  for (const [w, h, touch] of [[1440, 900, false], [1280, 1000, false], [1100, 1100, false], [390, 844, true], [844, 390, true]]) {
    const page = await (await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, locale: 'ko-KR' })).newPage()
    await page.goto(`${BASE}/ko/app`, { waitUntil: 'networkidle' })
    for (const which of ['wide', 'tall']) {
      await page.goto(`${BASE}/ko/app`, { waitUntil: 'networkidle' })
      const button = which === 'tall' ? page.locator('.samples button.is-tall').first() : page.locator('.samples button:not(.is-tall)').first()
      if ((await button.count()) === 0) continue
      await button.click()
      await page.waitForFunction(() => document.querySelector('.ed-frame video')?.videoWidth > 0)
      await page.waitForTimeout(300)
      const m = await page.evaluate(() => {
        const frame = document.querySelector('.ed-frame').getBoundingClientRect()
        const video = document.querySelector('.ed-frame video')
        return { box: frame.width / frame.height, video: video.videoWidth / video.videoHeight, w: Math.round(frame.width), h: Math.round(frame.height) }
      })
      const okay = Math.abs(m.box - m.video) < 0.01
      console.log(`${okay ? 'PASS' : 'FAIL'} ${w}x${h} ${which}: box ${m.w}x${m.h} (${m.box.toFixed(3)}) video ${m.video.toFixed(3)}`)
    }
    await page.close()
  }
  await browser.close()
})().catch((e) => { console.error(e); process.exit(1) })
