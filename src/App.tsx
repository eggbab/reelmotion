import { BrowserRouter, Route, Routes } from 'react-router'
import { EditorPage } from './editor/EditorPage'
import { LangProvider } from './lang'
import { LandingPage } from './site/LandingPage'

/** 주소: `/` 소개 페이지 · `/app` 편집 화면. 모르는 주소는 소개 페이지로 보낸다(없는 주소 화면은 아직 없다). */
export function App() {
  return (
    <LangProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/app" element={<EditorPage />} />
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </BrowserRouter>
    </LangProvider>
  )
}
