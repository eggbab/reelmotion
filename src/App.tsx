import { Suspense, lazy, useEffect, useRef } from 'react'
import { useLocation } from 'react-router'
import { AccountPage } from './account/AccountPage'
import { LangProvider } from './lang'
import { LandingPage } from './site/LandingPage'
import { LegalPage } from './site/legal/LegalPage'
import { LicensesPage } from './site/legal/LicensesPage'
import { NotFoundPage } from './site/NotFoundPage'
import { langOfPath, matchPage } from './site/routes'

// 편집기는 내보내기·받아쓰기 도구를 담고 있어 무겁다. 소개 페이지를 여는 사람은 내려받지 않게 따로 나눈다.
const EditorPage = lazy(() => import('./editor/EditorPage').then((module) => ({ default: module.EditorPage })))

/** 쪽을 옮기면 맨 위에서 시작한다(# 이 붙은 주소는 그 구역으로). 처음 열 때는 브라우저가 되살린 위치를 그대로 둔다. */
function useScrollToTop(pathname: string, hash: string) {
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (!hash) window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname, hash])
}

/**
 * 주소에 따라 쪽을 고른다(src/site/routes.ts). 브라우저(main.tsx)와 빌드 때 미리 그리기(entry-server.tsx)가 함께 쓴다.
 * 언어는 주소 앞말이 정하므로 두 곳에서 같은 화면이 나온다.
 */
export function AppRoutes() {
  const { pathname, hash } = useLocation()
  useScrollToTop(pathname, hash)
  const match = matchPage(pathname)
  if (!match) {
    return (
      <LangProvider lang={langOfPath(pathname)} page="home">
        <NotFoundPage />
      </LangProvider>
    )
  }
  const { page, lang } = match
  return (
    <LangProvider lang={lang} page={page}>
      {page === 'app' ? (
        <Suspense fallback={<div className="editor" />}>
          <EditorPage />
        </Suspense>
      ) : page === 'home' ? (
        <LandingPage />
      ) : page === 'licenses' ? (
        <LicensesPage />
      ) : page === 'account' ? (
        <AccountPage />
      ) : (
        <LegalPage page={page} />
      )}
    </LangProvider>
  )
}
