import '@fontsource-variable/dm-sans'
import 'pretendard-jp/dist/web/variable/pretendardvariable-jp-dynamic-subset.css'
import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { AppRoutes } from './App.tsx'
import './index.css'
import './site/site.css'
import { watchInstall } from './pwa/install'
import { renderKey } from './site/routes'

// 「앱으로 설치」 사건은 화면보다 먼저 올 수 있어 여기서부터 듣는다(src/pwa/install.ts).
watchInstall()

const root = document.getElementById('root')!
const app = (
  <StrictMode>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </StrictMode>
)

// 빌드 때 미리 그린 쪽(scripts/prerender.mjs)이 지금 주소와 같은 화면이면 그 HTML 을 이어받고,
// 아니면(편집기 껍데기, 개발 서버) 처음부터 그린다.
if (root.dataset.page && root.dataset.page === renderKey(location.pathname)) hydrateRoot(root, app)
else createRoot(root).render(app)
