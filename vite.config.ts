import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

/**
 * 사이트에 실제로 들어간 공개 프로그램(화면 코드 + 받아쓰기 워커)의 이름·판·사용 허가 전문을 dist/licenses.txt 로 쓴다.
 * MIT·Apache 등은 사용 허가문을 함께 두라고 하고, MPL-2.0(Mediabunny)은 소스 코드가 있는 곳을 알리라고 한다.
 * 글꼴·모델·예시 영상은 /licenses 쪽에 적는다(src/site/legal/credits.ts).
 */
const bundledPackages = new Set<string>()

function packageDirOf(id: string): string | null {
  const clean = id.replace(/^\0/, '').split('?')[0]
  const at = clean.lastIndexOf('/node_modules/')
  if (at < 0) return null
  const parts = clean.slice(at + '/node_modules/'.length).split('/')
  const name = parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0]
  return `${clean.slice(0, at)}/node_modules/${name}`
}

function collectPackages(bundle: Record<string, { type: string; moduleIds?: string[] }>) {
  for (const file of Object.values(bundle)) {
    if (file.type !== 'chunk') continue
    for (const id of file.moduleIds ?? []) {
      const dir = packageDirOf(id)
      if (dir) bundledPackages.add(dir)
    }
  }
}

function noticeOf(dir: string): string {
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {
    name: string
    version: string
    license?: string | { type?: string }
    homepage?: string
    repository?: string | { url?: string }
  }
  const license = typeof pkg.license === 'string' ? pkg.license : (pkg.license?.type ?? 'see package')
  const repository = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url
  const where = (repository ?? pkg.homepage ?? '').replace(/^git\+/, '').replace(/\.git$/, '')
  const texts = readdirSync(dir)
    .filter((file) => /^(licen[cs]e|copying|notice)(\.|-|$)/i.test(file))
    .map((file) => readFileSync(join(dir, file), 'utf8').trim())
  const rule = '-'.repeat(72)
  return [rule, `${pkg.name} ${pkg.version} — ${license}`, where, rule, texts.join('\n\n') || `(${license}: no license file in the package)`].filter(Boolean).join('\n')
}

/** 화면 빌드와 워커 빌드 양쪽에서 모은다. 워커가 먼저 묶이므로 화면 빌드의 끝에서 파일을 쓴다. */
function thirdPartyNotices(write: boolean): Plugin {
  return {
    name: 'reelmotion:third-party-notices',
    apply: 'build',
    generateBundle(_options, bundle) {
      collectPackages(bundle as Record<string, { type: string; moduleIds?: string[] }>)
      if (!write || this.environment?.name !== 'client') return
      const dirs = [...bundledPackages].filter((dir) => existsSync(join(dir, 'package.json'))).sort((a, b) => a.localeCompare(b))
      const head = [
        'ReelMotion — third-party software notices',
        'The open-source packages bundled into this website, with their versions and full license texts.',
        'Fonts, speech models and sample videos are listed at /licenses.',
        '',
      ].join('\n')
      this.emitFile({ type: 'asset', fileName: 'licenses.txt', source: `${head}\n${dirs.map(noticeOf).join('\n\n')}\n` })
    },
  }
}

// 말소리 인식이 여러 CPU 를 함께 쓰려면 브라우저가 이 두 머리글을 요구한다(없어도 돌지만 훨씬 느리다).
// 운영 서버도 같은 머리글을 내보내야 한다.
const isolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
}

/** 이 빌드의 판 번호(만든 때). 브라우저 오류를 알릴 때 어느 판에서 났는지 적는다 — src/errors.ts. BUILD_ID 로 바꿔 줄 수 있다. */
const buildId = process.env.BUILD_ID || new Date().toISOString().slice(0, 16).replace(/\D/g, '')

export default defineConfig({
  plugins: [react(), thirdPartyNotices(true)],
  define: { __RM_BUILD__: JSON.stringify(buildId) },
  // 받아쓰기 서버(server/asr, Qwen3-ASR)를 같은 주소로 부른다. 서버가 꺼져 있으면 편집기는 브라우저 받아쓰기를 쓴다.
  // 앱 서버(server/app, 로그인·작업 저장)는 /api 의 나머지. 둘 다 꺼져 있어도 편집기는 돈다(계정 기능만 숨는다).
  server: {
    headers: isolationHeaders,
    proxy: { '/api/asr': { target: 'http://127.0.0.1:8008', changeOrigin: true }, '/api': { target: 'http://127.0.0.1:8787' } },
  },
  preview: { headers: isolationHeaders },
  worker: { format: 'es', plugins: () => [thirdPartyNotices(false)] },
  // 글꼴 조각을 CSS 안에 넣지 않는다(넣으면 첫 화면 CSS 가 1MB 를 넘는다).
  build: { assetsInlineLimit: 0 },
  test: { include: ['src/**/*.test.{ts,tsx}', 'server/app/**/*.test.ts'] },
})
