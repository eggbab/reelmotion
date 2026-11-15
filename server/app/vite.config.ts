import { defineConfig } from 'vite'

// 앱 서버를 파일 하나(dist-app/main.js)로 묶는다. 화면 코드와 함께 쓰는 부분(작업 형식·주소 규칙, src/)도 함께 들어간다.
//   npx vite build --config server/app/vite.config.ts   (저장소 맨 위에서)
export default defineConfig({
  // 사이트의 public/(영상·그림)은 서버에 필요 없다.
  publicDir: false,
  build: {
    ssr: 'server/app/main.ts',
    outDir: 'dist-app',
    emptyOutDir: true,
    target: 'node22',
    rolldownOptions: { output: { entryFileNames: 'main.js' } },
  },
  ssr: { noExternal: true, target: 'node' },
})
