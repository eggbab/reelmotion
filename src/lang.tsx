import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { detectLang } from './langs'
import type { Lang } from './langs'

const STORAGE_KEY = 'reelmotion.lang'

type LangContextValue = { lang: Lang; setLang: (lang: Lang) => void }

const LangContext = createContext<LangContextValue | null>(null)

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'ko' || saved === 'ja') return saved
  } catch {
    // 저장소를 못 쓰는 브라우저(사생활 보호 창 등)에서는 브라우저 언어를 따른다.
  }
  return detectLang(navigator.languages)
}

/** 화면 언어를 소개 페이지와 편집 화면이 함께 쓴다. 고른 언어는 이 브라우저에 기억한다. */
export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo<LangContextValue>(
    () => ({
      lang,
      setLang: (next) => {
        setLangState(next)
        try {
          localStorage.setItem(STORAGE_KEY, next)
        } catch {
          // 기억하지 못해도 이번 방문에는 바뀐다.
        }
      },
    }),
    [lang],
  )
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useLang(): LangContextValue {
  const value = useContext(LangContext)
  if (!value) throw new Error('LangProvider 밖에서 useLang 을 불렀습니다')
  return value
}
