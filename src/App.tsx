import { Suspense, lazy, useEffect, useRef } from 'react'
import { useLocation } from 'react-router'
import { LangProvider } from './lang'
import { ContactPage } from './site/contact/ContactPage'
import { LandingPage } from './site/LandingPage'
import { splitPages } from './site/lazyPages'
import { NotFoundPage } from './site/NotFoundPage'
import { PageLoading } from './site/PageLoading'
import { langOfPath, matchPage } from './site/routes'

// 편집기는 내보내기·받아쓰기 도구를 담고 있어 무겁다. 소개 페이지를 여는 사람은 내려받지 않게 따로 나눈다.
const EditorPage = lazy(() => import('./editor/EditorPage').then((module) => ({ default: module.EditorPage })))
// 관리자 화면도 운영자만 쓰므로 따로 나눈다. 내 계정도 들어오는 사람만 받는다(둘 다 미리 그리지 않는 쪽이라 이어받기가 없다).
const AdminPage = lazy(() => import('./admin/AdminPage').then((module) => ({ default: module.AdminPage })))
const AccountPage = lazy(() => import('./account/AccountPage').then((module) => ({ default: module.AccountPage })))
// 약관·도움말·라이선스는 글이 길어 그 쪽을 열 때만 받는다(src/site/lazyPages.ts — 미리 그린 HTML 을 이어받기 전에는 main.tsx 가 받아 둔다).
const { legal: LegalPage, licenses: LicensesPage } = splitPages

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
        <Suspense fallback={<PageLoading />}>
          <LicensesPage />
        </Suspense>
      ) : page === 'contact' ? (
        <ContactPage />
      ) : page === 'account' ? (
        <Suspense fallback={<PageLoading />}>
          <AccountPage />
        </Suspense>
      ) : page === 'admin' ? (
        <Suspense fallback={<div className="site" />}>
          <AdminPage />
        </Suspense>
      ) : (
        <Suspense fallback={<PageLoading />}>
          <LegalPage page={page} />
        </Suspense>
      )}
    </LangProvider>
  )
}
