import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// 말소리 인식이 여러 CPU 를 함께 쓰려면 브라우저가 이 두 머리글을 요구한다(없어도 돌지만 훨씬 느리다).
// 운영 서버도 같은 머리글을 내보내야 한다.
const isolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
}

export default defineConfig({
  plugins: [react()],
  // 받아쓰기 서버(server/asr, Qwen3-ASR)를 같은 주소로 부른다. 서버가 꺼져 있으면 편집기는 브라우저 받아쓰기를 쓴다.
  server: { headers: isolationHeaders, proxy: { '/api/asr': { target: 'http://127.0.0.1:8008', changeOrigin: true } } },
  preview: { headers: isolationHeaders },
  worker: { format: 'es' },
  // 글꼴 조각을 CSS 안에 넣지 않는다(넣으면 첫 화면 CSS 가 1MB 를 넘는다).
  build: { assetsInlineLimit: 0 },
  test: { include: ['src/**/*.test.ts'] },
})
