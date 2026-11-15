// 보는 도구(통과·실패를 가리지 않는다): 평범한 대본(src/motion/ordinary-scripts.ts)을 편집기에 넣어,
// 그래픽마다 다 나타난 순간의 미리보기를 찍는다 — 자동 배치가 실제 영상 위에서 어떻게 보이는지 눈으로 볼 때.
//   node e2e/tests/placement-shots.cjs ko-money:seoul ko-tips:clean en-tips:editorial ja-money:tokyo
//   (대본 이름:스타일. 스타일을 빼면 neon. 사진은 e2e/out/placement-shots/ 에)
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')
const { BASE, OUT, VIDEO, SDK, root, needMedia } = require('../env.cjs')
const { Client } = require(`${SDK}/client/index.js`)
const { StreamableHTTPClientTransport } = require(`${SDK}/client/streamableHttp.js`)
needMedia(VIDEO)

// 대본은 시험과 같은 파일에서 읽는다('이름':\n    "글", 꼴)
const source = fs.readFileSync(path.join(root, 'src', 'motion', 'ordinary-scripts.ts'), 'utf8')
const scripts = Object.fromEntries([...source.matchAll(/^ {2}'([a-z-]+)':\s*\n\s*("(?:[^"\\]|\\.)*"),?$/gm)].map((match) => [match[1], JSON.parse(match[2])]))
const picks = process.argv.slice(2)
if (picks.length === 0) {
  console.log(`대본 이름:스타일 을 적으세요. 대본: ${Object.keys(scripts).join(' ')}`)
  process.exit(0)
}

;(async () => {
  const browser = await chromium.launch()
  for (const pick of picks) {
    const [key, style = 'neon'] = pick.split(':')
    if (!scripts[key]) {
      console.log(`${key}: 그런 대본이 없습니다`)
      continue
    }
    // 문장마다 줄을 바꿔 넣는다(소수점은 나누지 않게, 마침표 뒤에 빈칸이 있을 때만)
    const script = scripts[key].replace(/([.!?])\s+/g, '$1\n').replace(/。\s*/g, '。\n').trim()
    const client = new Client({ name: 'placement-shots', version: '1.0.0' })
    await client.connect(new StreamableHTTPClientTransport(new URL(`${BASE}/mcp`)))
    const { structuredContent } = await client.callTool({ name: 'open_in_editor', arguments: { script, style } })
    await client.close()
    const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })).newPage()
    await page.goto(structuredContent.url, { waitUntil: 'networkidle' })
    await page.locator('.drop input[type=file]').setInputFiles(VIDEO)
    await page.waitForSelector('.block', { timeout: 30000 })
    await page.waitForTimeout(800)
    const blocks = await page.locator('.block').evaluateAll((items) => items.map((item) => item.getAttribute('aria-label')))
    let index = 0
    const seen = []
    for (const label of blocks) {
      const match = /^(\S+)\s.*?([\d.]+)–([\d.]+)s/.exec(label)
      if (!match || /^(자막|Captions|字幕)$/.test(match[1])) continue
      const [, kind, start, end] = match
      const at = Math.min(Number(end) - 0.6, Number(start) + Math.max(1.6, (Number(end) - Number(start)) * 0.8))
      await page.evaluate((time) => {
        document.querySelector('.ed-frame video').currentTime = time
      }, at)
      await page.waitForTimeout(650)
      await page.locator('.ed-frame').screenshot({ path: `${OUT}/${key}-${++index}-${kind}.png` })
      seen.push(`${kind} ${start}–${end}s`)
    }
    console.log(`${key} (${style}): ${seen.join(' | ') || '제목·자막 말고 그래픽 없음'}`)
    await page.context().close()
  }
  console.log(`사진: ${OUT}`)
  await browser.close()
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
