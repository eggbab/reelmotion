// Claude·ChatGPT 커넥터를 끝에서 끝까지: 공식 MCP 클라이언트가 진짜 주소(/mcp, 웹 서버를 거쳐)로 붙어 계획을 보고 링크를 만든다 →
// 그 링크를 크롬에서 열어 「대본이 준비됐어요」 → 영상을 넣으면 그 대본·스타일로 그래픽 → 저장·새로고침, 예시 영상으로도, 없는 링크, 도움말의 주소.
const { chromium, devices } = require('playwright')
const { BASE, OUT, VIDEO, SDK, needMedia } = require('../env.cjs')
needMedia(VIDEO)
const { Client } = require(`${SDK}/client/index.js`)
const { StreamableHTTPClientTransport } = require(`${SDK}/client/streamableHttp.js`)
const KO = '안녕하세요 저는 박미나입니다.\n대부분 37% 더 빨리 잠들어요.\n첫째, 10시 뒤엔 화면 끄기. 둘째, 같은 시간에 일어나기.'

;(async () => {
  const results = []
  const errors = []
  const ok = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`)

  // ── 1. MCP 클라이언트(Claude·ChatGPT 가 하는 일) ──
  const client = new Client({ name: 'e2e-client', version: '1.0.0' })
  await client.connect(new StreamableHTTPClientTransport(new URL(`${BASE}/mcp`)))
  ok('1 client connects through the public address', client.getServerVersion().name === 'reelmotion', JSON.stringify(client.getServerVersion()))
  const tools = (await client.listTools()).tools.map((tool) => tool.name).sort()
  ok('1 three tools', tools.join(',') === 'list_styles,open_in_editor,plan_motion_graphics', tools.join(','))
  const styles = await client.callTool({ name: 'list_styles', arguments: {} })
  ok('1 list_styles', styles.structuredContent.styles.length === 6)
  const plan = await client.callTool({ name: 'plan_motion_graphics', arguments: { script: KO } })
  const kinds = plan.structuredContent.graphics.map((graphic) => graphic.kind)
  ok('1 plan has a name tag, a counter, a checklist and captions', ['lowerThird', 'stat', 'list', 'captions'].every((kind) => kinds.includes(kind)), plan.content[0].text.split('\n').slice(0, 3).join(' | '))
  const opened = await client.callTool({ name: 'open_in_editor', arguments: { script: KO, style: 'seoul' } })
  const url = opened.structuredContent.url
  ok('1 open_in_editor gives a short link to the Korean editor', url.startsWith(`${BASE}/ko/app?draft=d_`) && /draft=d_[0-9a-f]{32}$/.test(url), url)
  await client.close()
  const slash = new Client({ name: 'e2e-client', version: '1.0.0' })
  await slash.connect(new StreamableHTTPClientTransport(new URL(`${BASE}/mcp/`)))
  ok('1 address with a trailing slash also works', (await slash.listTools()).tools.length === 3)
  await slash.close()

  // ── 2. 그 링크를 브라우저에서 ──
  const browser = await chromium.launch()
  const watch = (page, tag) => {
    page.on('pageerror', (e) => errors.push(`${tag} pageerror ${String(e).slice(0, 200)}`))
    page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(`${tag} console ${m.text().slice(0, 200)}`))
    return page
  }
  const page = watch(await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' })).newPage(), 'desk')
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForSelector('.ed-draft')
  const banner = await page.locator('.ed-draft').innerText()
  ok('2 link opens the editor with the script waiting', banner.includes('대본이 준비됐어요') && banner.includes('박미나'), banner.replace(/\n/g, ' ').slice(0, 70))
  await page.screenshot({ path: `${OUT}/draft-start.png` })
  await page.locator('.drop input[type=file]').setInputFiles(VIDEO)
  await page.waitForSelector('.block', { timeout: 30000 })
  const labels = await page.locator('.block').evaluateAll((blocks) => blocks.map((block) => block.getAttribute('aria-label').split(' ')[0]))
  ok('2 adding a video makes the graphics from that script', ['이름표', '숫자', '목록', '자막'].every((kind) => labels.includes(kind)), labels.join(','))
  ok('2 the chosen style is on', (await page.locator('.swatch.is-on').innerText()).includes('서울'))
  ok('2 the script is in the transcript box', await page.locator('.tabs button').first().click().then(async () => (await page.locator('.transcript-panel textarea').inputValue()) === KO))
  const duration = await page.evaluate(() => document.querySelector('.ed-frame video').duration)
  const ends = await page.locator('.block').evaluateAll((blocks) => blocks.map((block) => Number(/–([\d.]+)s/.exec(block.getAttribute('aria-label'))[1])))
  ok('2 graphics are timed to the real video length', Math.max(...ends) <= duration + 0.11 && Math.max(...ends) > duration * 0.8, `video ${duration.toFixed(1)}s, last end ${Math.max(...ends)}s`)
  await page.waitForFunction(() => new URL(location.href).searchParams.get('project'), null, { timeout: 20000 })
  ok('2 saved as a project (address switches from the draft to the project)', !page.url().includes('draft='), page.url().replace(BASE, ''))
  await page.screenshot({ path: `${OUT}/draft-made.png` })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('.block')
  ok('2 reload keeps the project', (await page.locator('.block').count()) === labels.length)

  // ── 3. 같은 링크를 다른 사람이(예시 영상으로) ──
  const other = watch(await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR' })).newPage(), 'other')
  await other.goto(url, { waitUntil: 'networkidle' })
  await other.waitForSelector('.ed-draft')
  await other.locator('.samples button:not(.is-tall)').first().click()
  await other.waitForSelector('.block')
  const sampleLabels = await other.locator('.block').evaluateAll((blocks) => blocks.map((block) => block.getAttribute('aria-label').split(' ')[0]))
  ok('3 a sample clip also uses the waiting script', sampleLabels.includes('이름표') && (await other.locator('.ed-draft').count()) === 0, sampleLabels.join(','))

  // ── 4. 없는·지난 링크 ──
  const gone = watch(await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR' })).newPage(), 'gone')
  await gone.goto(`${BASE}/ko/app?draft=d_${'0'.repeat(32)}`, { waitUntil: 'networkidle' })
  await gone.waitForSelector('.ed-notice')
  ok('4 unknown link: clear message and a usable start screen', (await gone.locator('.ed-notice').innerText()).includes('기한이 지났거나 없는 링크') && (await gone.locator('.drop').count()) === 1 && (await gone.locator('.ed-draft').count()) === 0)
  await gone.goto(`${BASE}/ko/app?draft=../../etc/passwd`, { waitUntil: 'networkidle' })
  await gone.waitForSelector('.ed-notice')
  ok('4 malformed link is handled the same way', (await gone.locator('.ed-notice').innerText()).includes('기한이 지났거나 없는 링크'))
  // 서버에 닿지 못하면 「없는 링크」가 아니라 「불러오지 못했어요 — 새로고침」
  const flaky = watch(await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR' })).newPage(), 'flaky')
  let mode = 'abort'
  await flaky.route('**/api/drafts/**', (route) => (mode === 'abort' ? route.abort() : mode === '503' ? route.fulfill({ status: 503, body: 'down' }) : route.continue()))
  await flaky.goto(url, { waitUntil: 'networkidle' })
  await flaky.waitForSelector('.ed-notice')
  ok('4 server unreachable: says could not load (not expired)', (await flaky.locator('.ed-notice').innerText()).includes('불러오지 못했어요') && (await flaky.locator('.drop').count()) === 1)
  mode = '503'
  await flaky.reload({ waitUntil: 'networkidle' })
  await flaky.waitForSelector('.ed-notice')
  ok('4 server error (503): same message', (await flaky.locator('.ed-notice').innerText()).includes('불러오지 못했어요'))
  mode = 'ok'
  await flaky.reload({ waitUntil: 'networkidle' })
  await flaky.waitForSelector('.ed-draft')
  ok('4 reload once the server is back: the script is there', (await flaky.locator('.ed-draft').innerText()).includes('박미나') && (await flaky.locator('.ed-notice').count()) === 0)

  // ── 5. 소개 페이지 → 도움말의 커넥터 주소 ──
  await gone.goto(`${BASE}/ko`, { waitUntil: 'networkidle' })
  const row = gone.locator('.anywhere a[href="/ko/help#connect"]')
  ok('5 landing row links to the connector help', (await row.count()) === 1 && (await row.innerText()).includes('커넥터로 연결'))
  await gone.goto(`${BASE}/ko/help#connect`, { waitUntil: 'networkidle' })
  await gone.waitForFunction(() => document.querySelector('.legal__code')?.textContent.startsWith('http'))
  ok('5 help shows the full connector address', (await gone.locator('.legal__code').innerText()) === `${BASE}/mcp`, await gone.locator('.legal__code').innerText())
  await gone.locator('#connect').screenshot({ path: `${OUT}/help-connect.png` })

  // ── 6. 휴대폰에서 링크 열기 ──
  const phone = watch(await (await browser.newContext({ ...devices['iPhone 13'], locale: 'en-US' })).newPage(), 'phone')
  const again = new Client({ name: 'e2e-client', version: '1.0.0' })
  await again.connect(new StreamableHTTPClientTransport(new URL(`${BASE}/mcp`)))
  const second = await again.callTool({ name: 'open_in_editor', arguments: { script: 'Hi, I am Mina Park.\nMost people fall asleep 37% faster.' } })
  await again.close()
  ok('6 english script → english editor link, default style', /\/app\?draft=/.test(second.structuredContent.url) && !second.structuredContent.url.includes('/ko/') && second.structuredContent.style === 'neon', second.structuredContent.url.replace(BASE, ''))
  await phone.goto(second.structuredContent.url, { waitUntil: 'networkidle' })
  await phone.waitForSelector('.ed-draft')
  const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  ok('6 phone: banner fits', overflow <= 0 && (await phone.locator('.ed-draft').innerText()).includes('Your script is ready'), `overflow ${overflow}`)
  await phone.screenshot({ path: `${OUT}/draft-phone.png` })
  // 한국어 브라우저로 영어 링크를 열면 화면은 한국어로 옮겨 가고(첫 화면 옮기기), 대본은 그대로 따라온다
  const koPhone = watch(await (await browser.newContext({ ...devices['iPhone 13'], locale: 'ko-KR' })).newPage(), 'ko-phone')
  await koPhone.goto(second.structuredContent.url, { waitUntil: 'networkidle' })
  await koPhone.waitForSelector('.ed-draft')
  const koBanner = await koPhone.locator('.ed-draft').innerText()
  ok('6 korean browser + english link: korean screen, same script', new URL(koPhone.url()).pathname === '/ko/app' && koPhone.url().includes('draft=') && koBanner.includes('대본이 준비됐어요') && koBanner.includes('Mina Park'), koPhone.url().replace(BASE, ''))
  await koPhone.locator('.samples button:not(.is-tall)').first().click()
  await koPhone.waitForSelector('.block')
  const koLabels = await koPhone.locator('.block').evaluateAll((blocks) => blocks.map((block) => block.getAttribute('aria-label').split(' ')[0]))
  ok('6 korean browser: graphics still come from the english script', koLabels.includes('이름표') && koLabels.includes('숫자'), koLabels.join(','))

  console.log(results.join('\n'))
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors')
  await browser.close()
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
