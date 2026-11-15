import { Suspense, lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { LangProvider } from './lang'
import { LandingPage } from './site/LandingPage'

// 편집기는 내보내기·받아쓰기 도구를 담고 있어 무겁다. 소개 페이지를 여는 사람은 내려받지 않게 따로 나눈다.
const EditorPage = lazy(() => import('./editor/EditorPage').then((module) => ({ default: module.EditorPage })))

/** 주소: `/` 소개 페이지 · `/app` 편집기. 모르는 주소는 소개 페이지로 보낸다(없는 주소 화면은 아직 없다). */
export function App() {
  return (
    <LangProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/app"
            element={
              <Suspense fallback={<div className="editor" />}>
                <EditorPage />
              </Suspense>
            }
          />
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </BrowserRouter>
    </LangProvider>
  )
}
