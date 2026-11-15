import { createContext, useContext, useEffect, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { saveLang } from './langs'
import type { Lang } from './langs'
import { pagePath } from './site/routes'
import type { PageId } from './site/routes'

type LangContextValue = { lang: Lang; setLang: (lang: Lang) => void }

const LangContext = createContext<LangContextValue | null>(null)

/**
 * 화면 언어는 주소가 정한다(/ 영어 · /ko 한국어 · /ja 일본어 — src/site/routes.ts). 그래서 미리 그린 HTML 과
 * 브라우저가 그리는 화면이 같다. 언어를 고르면 그 선택을 기억하고 같은 쪽의 그 언어 주소로 옮긴다.
 * 기억한 언어는 첫 화면·편집기로 들어올 때 index.html 의 스크립트가 쓴다.
 */
export function LangProvider({ lang, page, children }: { lang: Lang; page: PageId; children: ReactNode }) {
  const navigate = useNavigate()
  const { search } = useLocation()

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo<LangContextValue>(
    () => ({
      lang,
      setLang: (next) => {
        saveLang(next)
        // 편집기는 열린 작업(?project=)을 그대로 둔 채 언어만 바꾼다.
        if (next !== lang) navigate(pagePath(page, next) + (page === 'app' ? search : ''))
      },
    }),
    [lang, page, navigate, search],
  )
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useLang(): LangContextValue {
  const value = useContext(LangContext)
  if (!value) throw new Error('LangProvider 밖에서 useLang 을 불렀습니다')
  return value
}
