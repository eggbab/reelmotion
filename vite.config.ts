import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  // 글꼴 조각을 CSS 안에 넣지 않는다(넣으면 첫 화면 CSS 가 1MB 를 넘는다).
  build: { assetsInlineLimit: 0 },
  test: { include: ['src/**/*.test.ts'] },
})
