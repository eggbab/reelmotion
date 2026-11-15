// 빌드한 사이트(dist)에 쪽마다 미리 그린 HTML 을 쓴다. `npm run build` 의 마지막 단계.
//   1) vite build              → dist/index.html(틀)과 화면 코드
//   2) vite build --ssr        → dist-ssr/entry-server.js(같은 화면을 서버에서 그리는 코드)
//   3) node scripts/prerender.mjs → dist/ko/terms/index.html … 404.html, robots.txt, llms.txt, (도메인을 알면) sitemap.xml
// 도메인은 아직 정하지 않았다. 정하면 SITE_ORIGIN=https://도메인 npm run build (Docker: --build-arg SITE_ORIGIN=…).
import { mkdir, readFile, writeFile } from 'node:fs/promises'
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
for (const item of plan) {
  const html = item.key === null ? '' : entry.render(item.url)
  await write(item.file, entry.fillTemplate(template, { lang: item.lang, head: entry.headTags(item.target, origin), html, key: item.key }))
}
await write('robots.txt', entry.robotsTxt(origin))
await write('llms.txt', entry.llmsTxt(origin))
if (origin) await write('sitemap.xml', entry.sitemapXml(origin))

console.log(`미리 그린 HTML ${plan.length}개${origin ? ` · 도메인 ${origin}` : ''}`)
if (!origin) {
  console.warn('⚠ SITE_ORIGIN 이 비어 있어 바른 주소(canonical)·언어별 주소(hreflang)·공유 그림(og:image)·sitemap.xml 을 넣지 않았습니다. 도메인을 정하면 SITE_ORIGIN=https://… 로 다시 빌드하세요.')
}
if (!entry.BUSINESS.contactEmail) {
  console.warn('⚠ 문의 메일이 비어 있어 약관·정책의 문의 자리에 「정식 공개 전에 적습니다」가 보입니다(src/site/business.ts 의 contactEmail).')
}
