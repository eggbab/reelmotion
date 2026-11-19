// 빌드한 사이트(dist)에 쪽마다 미리 그린 HTML 을 쓴다. `npm run build` 의 마지막 단계.
//   1) vite build              → dist/index.html(틀)과 화면 코드
//   2) vite build --ssr        → dist-ssr/entry-server.js(같은 화면을 서버에서 그리는 코드)
//   3) node scripts/prerender.mjs → dist/ko/terms/index.html … 404.html, robots.txt, llms.txt, (도메인을 알면) sitemap.xml
// 도메인은 아직 정하지 않았다. 정하면 SITE_ORIGIN=https://도메인 npm run build (Docker: --build-arg SITE_ORIGIN=…).
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const dist = join(root, 'dist')
const entry = await import(pathToFileURL(join(root, 'dist-ssr', 'entry-server.js')).href)

const rawOrigin = (process.env.SITE_ORIGIN ?? '').trim().replace(/\/+$/, '')
if (rawOrigin && !/^https?:\/\/[a-z0-9.-]+(:\d+)?$/i.test(rawOrigin)) {
  throw new Error(`SITE_ORIGIN 은 https://example.com 꼴이어야 합니다(경로 없이): ${rawOrigin}`)
}
const origin = rawOrigin || null

const template = await readFile(join(dist, 'index.html'), 'utf8')
const write = async (file, text) => {
  const path = join(dist, file)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, text)
}

const plan = entry.prerenderPlan()
const assets = await readdir(join(dist, 'assets'))
// 약관·도움말·라이선스는 따로 받는 쪽이라(src/site/lazyPages.ts) 그리기 전에 받아 둔다 — 안 그러면 빈 자리만 그려진다
await entry.preloadAllPages()
for (const item of plan) {
  // 미리 그리지 않는 쪽(편집기 껍데기)에는 「여는 중」 한 줄과 편집기 코드 미리 받기(src/seo/template.ts)
  const html = item.key === null ? entry.shellHtml(item.target) : entry.render(item.url)
  // 약관·도움말은 따로 받는 글을 미리 받게 하지 않는다 — 휴대폰 조건에서 스타일 파일과 대역을 다퉈 첫 글자가 0.15초 늦었다(2026-11-19)
  const hints = item.key === null ? entry.shellHints(item.target, assets) : ''
  const head = hints ? `${entry.headTags(item.target, origin)}\n    ${hints}` : entry.headTags(item.target, origin)
  await write(item.file, entry.fillTemplate(template, { lang: item.lang, head, html, key: item.key }))
}
// 첫 화면 스크립트에 약관·도움말 글 전체가 다시 들어갔으면 멈춘다(src/site/lazyPages.ts — 소개 페이지를 여는 모든 사람이 더 받게 된다)
const firstScript = entry.entryScript(template)
const leaked = firstScript ? entry.leakedSplitText(await readFile(join(dist, 'assets', firstScript), 'utf8')) : []
if (leaked.length > 0) throw new Error(`첫 화면 스크립트(${firstScript})에 따로 받아야 할 글이 들어 있습니다: ${leaked.join(', ')} — 글 전체 대신 src/site/legal/heads.ts 를 쓰세요`)
await write('robots.txt', entry.robotsTxt(origin))
await write('llms.txt', entry.llmsTxt(origin))
if (origin) await write('sitemap.xml', entry.sitemapXml(origin))

// 서비스 워커(dist/sw.js — src/pwa/sw.ts 를 묶은 것): 맨 앞에 판 이름과 미리 받을 파일을 붙인다.
// 판 이름은 그 파일들과 편집기 껍데기의 내용에서 나오므로, 무엇이든 바뀌면 방문자의 브라우저가 새 판을 받는다.
// SW_DISABLE=1 이면 스스로 캐시를 지우고 등록을 푸는 판으로 바꾼다(문제가 생겼을 때 — docs/operations.md).
const workerBody = await readFile(join(dist, 'sw.js'), 'utf8')
let worker = '꺼짐(SW_DISABLE=1)'
if (process.env.SW_DISABLE === '1') {
  await write('sw.js', entry.KILL_SWITCH)
} else {
  const precache = entry.precacheList(await readdir(join(dist, 'assets')))
  const hash = createHash('sha256').update(JSON.stringify(precache)).update(workerBody.replace(/^self\.__RM_VERSION__=.*\n/, ''))
  for (const shell of entry.SHELLS) hash.update(await readFile(join(dist, shell.slice(1), 'index.html'), 'utf8'))
  const version = hash.digest('hex').slice(0, 12)
  await write('sw.js', entry.stampWorker(workerBody, version, precache))
  worker = `판 ${version}, 미리 받을 파일 ${precache.length}개`
}

console.log(`미리 그린 HTML ${plan.length}개${origin ? ` · 도메인 ${origin}` : ''} · 서비스 워커 ${worker}`)
if (!origin) {
  console.warn('⚠ SITE_ORIGIN 이 비어 있어 바른 주소(canonical)·언어별 주소(hreflang)·공유 그림(og:image)·sitemap.xml 을 넣지 않았습니다. 도메인을 정하면 SITE_ORIGIN=https://… 로 다시 빌드하세요.')
}
if (!entry.BUSINESS.contactEmail) {
  console.warn('⚠ 문의 메일이 비어 있어 약관·정책의 문의 자리에 「정식 공개 전에 적습니다」가 보입니다(src/site/business.ts 의 contactEmail).')
}
