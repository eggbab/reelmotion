import { LANG_STORAGE_KEY } from './langs'
import type { Lang } from './langs'

/** 고른 화면 언어를 이 브라우저에 기억한다(langs.ts 는 서버도 함께 쓰므로 브라우저 저장소는 여기에만 둔다). */
export function savedLang(): Lang | null {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY)
    return saved === 'en' || saved === 'ko' || saved === 'ja' ? saved : null
  } catch {
    // 저장소를 못 쓰는 브라우저(사생활 보호 창 등)
    return null
  }
}

export function saveLang(lang: Lang): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang)
  } catch {
    // 기억하지 못해도 이번 방문에는 바뀐다.
  }
}
