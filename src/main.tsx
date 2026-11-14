import '@fontsource/black-han-sans/400.css'
import '@fontsource/do-hyeon/400.css'
import '@fontsource/jua/400.css'
import '@fontsource/noto-sans-kr/700.css'
import 'pretendard-jp/dist/web/variable/pretendardvariable-jp-dynamic-subset.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'
import './index.css'
import './site/site.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
