import { defineConfig } from 'vite'

// 서비스 워커를 파일 하나(dist/sw.js)로 묶는다. 화면 빌드 뒤에 돌린다(dist 를 비우지 않는다).
//   npx vite build --config src/pwa/vite.config.ts   (저장소 맨 위에서 — npm run build 에 들어 있다)
// 그 뒤 scripts/prerender.mjs 가 맨 앞에 판 이름과 미리 받을 파일 목록을 붙인다.
export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    target: 'es2022',
    rolldownOptions: { input: 'src/pwa/sw.ts', output: { format: 'iife', entryFileNames: 'sw.js' } },
  },
})
