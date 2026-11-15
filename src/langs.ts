/** 화면 언어. 세계용이 기본이고, 한국어·일본어를 처음부터 함께 둔다. */
export type Lang = 'en' | 'ko' | 'ja'

export const LANGS: { id: Lang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'ko', label: '한국어' },
  { id: 'ja', label: '日本語' },
]

/** 브라우저가 원하는 언어 중 지원하는 첫 언어. 없으면 영어. */
export function detectLang(preferred: readonly string[]): Lang {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split('-')[0]
    if (base === 'en' || base === 'ko' || base === 'ja') return base
  }
  return 'en'
}

/** '{이름}' 자리에 값을 넣는다. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole))
}

/**
 * 방문자가 직접 고른 화면 언어를 기억하는 이름(localStorage). 언어 고르기에서 고를 때만 쓴다.
 * index.html 의 첫 화면 옮기기 스크립트도 같은 이름을 읽는다(langs.test.ts 가 확인한다).
 */
export const LANG_STORAGE_KEY = 'reelmotion.lang'

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
