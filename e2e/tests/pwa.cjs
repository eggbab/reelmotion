// 앱으로 설치·오프라인을 실제 브라우저에서. 같은 브라우저 자료(프로필)를 이어 쓰며 세 단계로 돌린다:
//   node e2e/tests/pwa.cjs first    설치 조건 → 편집기를 열면 화면 파일을 받아 둠 → 인터넷 끊고 편집기·작업·내보내기·다른 쪽
//   node e2e/tests/pwa.cjs update   새로 배포한 뒤(다시 빌드해 띄운 다음): 새 화면이 바로 보이고, 창을 닫았다 열면 새 판이 넘겨받고 옛 캐시가 지워짐
//   node e2e/tests/pwa.cjs kill     SW_DISABLE=1 로 배포한 뒤: 등록이 풀리고 캐시가 지워짐
const { chromium } = require('playwright')
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const { BASE, OUT, VIDEO, needMedia } = require('../env.cjs')
const phase = process.argv[2] || 'first'
// 세 단계가 같은 브라우저 자료를 이어 쓴다. first 는 늘 새 자료로 시작한다.
const PROFILE = `${OUT}/profile`
if (phase === 'first') {
  needMedia(VIDEO)
  fs.rmSync(PROFILE, { recursive: true, force: true })
}
const STATE = `${OUT}/state.json`

;(async () => {
  const launch = () => chromium.launchPersistentContext(PROFILE, { viewport: { width: 1440, height: 900 }, locale: 'ko-KR', acceptDownloads: true })
  let context = await launch()
  const results = []
  const errors = []
  const ok = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`)
  const watch = (page) => {
    page.on('pageerror', (e) => errors.push(`pageerror ${String(e).slice(0, 200)}`))
    page.on('console', (m) => m.type() === 'error' && !/Failed to load resource|net::ERR_INTERNET_DISCONNECTED|ERR_FAILED/.test(m.text()) && errors.push(`console ${m.text().slice(0, 200)}`))
    return page
  }
  const cachesOf = (page) => page.evaluate(async () => Promise.all((await caches.keys()).filter((name) => name.startsWith('reelmotion-')).map(async (name) => ({ name, keys: (await (await caches.open(name)).keys()).map((r) => new URL(r.url).pathname) }))))
  // page.waitForFunction 은 async 함수가 돌려준 Promise 를 바로 참으로 본다 — 기다릴 일은 evaluate 로 직접 되풀이해 본다.
  const until = async (page, fn, timeout = 30000) => {
    const end = Date.now() + timeout
    while (Date.now() < end) {
      if (await page.evaluate(fn)) return true
      await page.waitForTimeout(250)
    }
    return false
  }
  const canonicalOf = (page) => page.evaluate(() => document.querySelector('link[rel=canonical]')?.href ?? null)
  const mainScript = (page) => page.evaluate(() => [...document.scripts].map((s) => s.src).find((src) => /\/assets\/index-/.test(src)) ?? null)
  const swState = (page) =>
    page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration()
      return registration ? { active: registration.active?.state ?? null, waiting: !!registration.waiting, installing: !!registration.installing, controlled: !!navigator.serviceWorker.controller } : null
    })

  if (phase === 'first') {
    let page = watch(await context.newPage())
    // ── 1. 소개 페이지: 설치 정보, 그리고 편집기 파일을 미리 받지 않는다 ──
    await page.goto(BASE + '/ko', { waitUntil: 'networkidle' })
    const cdp = await context.newCDPSession(page)
    const manifest = await cdp.send('Page.getAppManifest')
    const parsed = JSON.parse(manifest.data || '{}')
    ok('1 manifest loads without errors', manifest.url.endsWith('/manifest.webmanifest') && manifest.errors.length === 0, JSON.stringify(manifest.errors).slice(0, 160))
    ok('1 manifest: standalone app starting at the editor', parsed.display === 'standalone' && parsed.start_url === '/app' && parsed.id === '/app')
    const install = await cdp.send('Page.getInstallabilityErrors')
    ok('1 browser finds no installability problems', install.installabilityErrors.length === 0, JSON.stringify(install.installabilityErrors).slice(0, 200))
    const pictures = await page.evaluate(async (list) => Promise.all(list.map(async (src) => {
      const response = await fetch(src)
      const bitmap = await createImageBitmap(await response.blob())
      return `${src} ${bitmap.width}x${bitmap.height}`
    })), [...parsed.icons, ...parsed.screenshots].map((item) => item.src))
    ok('1 icons and screenshots are real pictures', pictures.join(' ').includes('/icons/icon-192.png 192x192') && pictures.join(' ').includes('/icons/maskable-512.png 512x512') && pictures.join(' ').includes('/screenshots/wide.png 1280x720'), pictures.join(', '))
    await page.waitForTimeout(1500)
    ok('1 landing page does not register the service worker', (await swState(page)) === null)
    const rows = await page.locator('.anywhere a[href="/ko/help#install"]').count()
    ok('1 landing has two install rows', rows === 2, String(rows))
    await page.locator('.anywhere').scrollIntoViewIfNeeded()
    await page.locator('.anywhere').screenshot({ path: `${OUT}/anywhere.png` })

    // ── 2. 편집기를 열면 화면 파일을 받아 둔다 ──
    await page.goto(BASE + '/ko/app', { waitUntil: 'networkidle' })
    await page.evaluate(() => navigator.serviceWorker.ready)
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 20000 })
    const stored = await cachesOf(page)
    ok('2 editor registers the service worker and it takes control', stored.length === 1 && (await swState(page)).controlled, JSON.stringify(await swState(page)))
    const keys = stored[0]?.keys ?? []
    ok('2 editor shells for three languages and the screen code are stored', ['/app', '/ko/app', '/ja/app'].every((key) => keys.includes(key)) && keys.filter((key) => /^\/assets\/(index|EditorPage)-/.test(key)).length >= 4, keys.filter((k) => !k.includes('woff')).join(' '))

    // ── 3. 작업 하나 만들기(넣은 영상까지 이 브라우저에 저장) ──
    await page.locator('.drop input[type=file]').setInputFiles(VIDEO)
    await page.waitForFunction(() => document.querySelector('.ed-frame video')?.readyState >= 1)
    await page.locator('.transcript-panel textarea').fill('Hi, I am Mina Park.\nMost people fall asleep 37% faster.')
    await page.getByRole('button', { name: /그래픽 만들기|그래픽 다시 만들기/ }).click()
    await page.waitForSelector('.block')
    await page.locator('.ed-name').fill('오프라인 시험')
    await page.waitForFunction(() => new URL(location.href).searchParams.get('project'))
    await page.waitForFunction(() => /저장됨/.test(document.querySelector('.ed-save')?.textContent ?? ''), null, { timeout: 30000 })
    const projectUrl = page.url()
    const blocks = await page.locator('.block').count()

    // ── 4. 브라우저를 껐다가, 인터넷이 없는 채로 다시 연다 ──
    // (같은 실행에서 끊으면 시험 도구의 「끊김 흉내」가 새로 그린 화면의 navigator.onLine 까지는 바꾸지 못한다 — 실제 끊김과 같게 새로 켠다)
    await context.close()
    context = await launch()
    await context.setOffline(true)
    page = watch(await context.newPage())
    await page.goto(projectUrl, { waitUntil: 'load' })
    await page.waitForSelector('.block', { timeout: 30000 })
    ok('4 offline: the saved project reopens with its video and graphics', (await page.locator('.block').count()) === blocks && (await page.locator('.ed-frame video').count()) === 1 && (await page.locator('.ed-name').inputValue()) === '오프라인 시험')
    ok('4 offline: still isolated (fast transcription and export keep working)', await page.evaluate(() => crossOriginIsolated === true))
    ok('4 offline: header shows the offline badge', (await page.locator('.ed-offline').count()) === 1)
    await page.screenshot({ path: `${OUT}/offline-editor.png` })
    await page.locator('.ed-export').click()
    await page.waitForSelector('#export-title')
    await page.waitForFunction(() => !/내보내는 중/.test(document.querySelector('#export-title')?.textContent ?? ''), null, { timeout: 240000 })
    ok('4 offline: export finishes', (await page.locator('#export-title').innerText()) === '영상이 준비됐어요.', await page.locator('#export-title').innerText())
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('.dialog a[download]').click()])
    await download.saveAs(`${OUT}/offline-export.mp4`)
    const probe = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name', '-of', 'csv=p=0', `${OUT}/offline-export.mp4`], { encoding: 'utf8' }).trim().replace(/\n/g, '+')
    ok('4 offline: exported file has video and sound', /h264/.test(probe) && /aac/.test(probe), probe)
    await page.locator('.dialog__close').click()

    await page.goto(BASE + '/ko/app', { waitUntil: 'load' })
    await page.waitForSelector('.ed-start')
    await page.waitForTimeout(600)
    ok('4 offline: start screen opens, samples hidden, recent project listed', (await page.locator('.samples').count()) === 0 && (await page.locator('.ed-start .project', { hasText: '오프라인 시험' }).count()) === 1)
    await page.screenshot({ path: `${OUT}/offline-start.png` })
    await page.goto(BASE + '/ko/help', { waitUntil: 'load' })
    await page.waitForSelector('h1')
    ok('4 offline: a page never visited before still renders (help)', (await page.locator('h1').innerText()) === '도움말' && (await page.locator('#install').count()) === 1)
    await page.goto(BASE + '/ja/terms', { waitUntil: 'load' })
    await page.waitForSelector('h1')
    ok('4 offline: Japanese terms render', (await page.locator('h1').innerText()) === '利用規約')
    await page.goto(BASE + '/app', { waitUntil: 'load' })
    await page.waitForURL((url) => url.pathname === '/ko/app', { timeout: 10000 }).catch(() => null)
    ok('4 offline: the app start address goes to the saved language', new URL(page.url()).pathname === '/ko/app', page.url())

    // ── 5. 다시 이어지면 ──
    await context.setOffline(false)
    await page.goto(projectUrl, { waitUntil: 'networkidle' })
    await page.waitForSelector('.block')
    const me = await page.evaluate(() => fetch('/api/me', { cache: 'no-store' }).then((r) => r.json()))
    ok('5 online again: API answers are not intercepted', me && typeof me.login === 'object')
    ok('5 online again: offline badge gone', (await page.locator('.ed-offline').count()) === 0)
    fs.writeFileSync(STATE, JSON.stringify({ projectUrl, cache: stored[0].name, script: await mainScript(page), canonical: await canonicalOf(page) }))
  }

  if (phase === 'update') {
    const before = JSON.parse(fs.readFileSync(STATE, 'utf8'))
    const page = watch(await context.newPage())
    await page.goto(before.projectUrl, { waitUntil: 'networkidle' })
    await page.waitForSelector('.block')
    const script = await mainScript(page)
    const canonical = await canonicalOf(page)
    ok('1 after a new deploy the new page loads right away', (script !== before.script || canonical !== before.canonical) && script !== null, `${before.script?.split('/').pop()} → ${script?.split('/').pop()} · canonical ${before.canonical} → ${canonical}`)
    ok('1 the project is still there', (await page.locator('.ed-name').inputValue()) === '오프라인 시험')
    await until(page, async () => (await navigator.serviceWorker.getRegistration())?.waiting != null)
    const mid = await swState(page)
    const midCaches = (await cachesOf(page)).map((cache) => cache.name)
    ok('1 new version waits while this window is open (old files are kept)', mid.waiting === true && midCaches.includes(before.cache) && midCaches.length === 2, `${JSON.stringify(mid)} ${midCaches.join(',')}`)
    // 창을 모두 닫았다가 다시 연다
    const blank = await context.newPage()
    await page.close()
    for (const other of context.pages()) if (other !== blank) await other.close()
    await blank.waitForTimeout(1500)
    const next = watch(await context.newPage())
    await next.goto(before.projectUrl, { waitUntil: 'networkidle' })
    await next.waitForSelector('.block')
    await until(next, async () => (await caches.keys()).filter((name) => name.startsWith('reelmotion-')).length === 1)
    const after = (await cachesOf(next)).map((cache) => cache.name)
    ok('2 after reopening, the new version took over and the old cache is gone', after.length === 1 && after[0] !== before.cache, after.join(','))
    await context.setOffline(true)
    await next.reload({ waitUntil: 'load' })
    await next.waitForSelector('.block', { timeout: 30000 })
    ok('2 offline works with the new version', (await mainScript(next)) === script && (await canonicalOf(next)) === canonical && (await next.locator('.ed-offline').count()) === 1)
    await context.setOffline(false)
    fs.writeFileSync(STATE, JSON.stringify({ ...before, cache: after[0], script, canonical }))
  }

  if (phase === 'kill') {
    const before = JSON.parse(fs.readFileSync(STATE, 'utf8'))
    const page = watch(await context.newPage())
    await page.goto(before.projectUrl, { waitUntil: 'networkidle' })
    await page.waitForSelector('.block')
    // 끄는 판은 바로 넘겨받아(skipWaiting) 캐시를 지우고 등록을 푼다
    await until(page, async () => (await caches.keys()).filter((name) => name.startsWith('reelmotion-')).length === 0)
    await page.waitForTimeout(1000)
    const left = (await cachesOf(page)).map((cache) => cache.name)
    ok('kill switch: our caches are deleted', left.length === 0, left.join(','))
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForSelector('.block')
    await page.waitForTimeout(1500)
    const state = await swState(page)
    ok('kill switch: the page works and is no longer controlled', state === null || state.controlled === false, JSON.stringify(state))
    ok('kill switch: the project (IndexedDB) is untouched', (await page.locator('.ed-name').inputValue()) === '오프라인 시험')
  }

  console.log(results.join('\n'))
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors')
  await context.close()
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
