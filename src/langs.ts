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
