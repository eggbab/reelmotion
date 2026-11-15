import '@fontsource-variable/dm-sans'
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
