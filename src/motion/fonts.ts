import '@fontsource-variable/dm-sans'
import 'pretendard-jp/dist/web/variable/pretendardvariable-jp-dynamic-subset.css'
import type { Graphic, Theme } from './types'

/**
 * 스타일에만 쓰는 제목 글꼴의 선언(@font-face)은 그 글꼴로 그릴 때 불러온다. 처음부터 넣으면 글꼴 선언이 첫 화면의 스타일 파일을
 * 키워(압축해서 87KB 가운데 약 45KB — 서울·도쿄 글꼴은 글자 묶음이 많다) 휴대폰에서 첫 글자가 늦게 뜬다(2026-11-19).
 * 글자 파일은 원래도 그 글자를 그릴 때만 내려온다. DM Sans·Pretendard 는 사이트 글에도 써서 그대로 둔다.
 */
const DISPLAY_FONTS: Record<string, () => Promise<unknown>> = {
  'Instrument Serif': () => Promise.all([import('@fontsource/instrument-serif/400.css'), import('@fontsource/instrument-serif/400-italic.css')]),
  'Black Han Sans': () => import('@fontsource/black-han-sans/400.css'),
  'Dela Gothic One': () => import('@fontsource/dela-gothic-one/400.css'),
}
const declared = new Map<string, Promise<unknown>>()

/** 이 글꼴 줄(「'Black Han Sans', 'Pretendard JP Variable', sans-serif」 등)에 든 제목 글꼴의 선언을 불러온다 */
function declare(specs: string[]): Promise<unknown> {
  const families = Object.keys(DISPLAY_FONTS).filter((family) => specs.some((spec) => spec.includes(family)))
  return Promise.all(
    families.map((family) => {
      let promise = declared.get(family)
      if (!promise) {
        promise = DISPLAY_FONTS[family]().catch(() => null)
        declared.set(family, promise)
      }
      return promise
    }),
  )
}

/** 그래픽에 들어 있는 글자 전부(숫자는 0~9 를 다 넣는다 — 세면서 바뀌므로) */
export function textsOf(graphics: Graphic[]): string {
  const parts: string[] = ['0123456789,.%$€£¥₩+-–—…“”']
  for (const g of graphics) {
    switch (g.kind) {
      case 'title':
        parts.push(g.text, g.text.toUpperCase())
        break
      case 'lowerThird':
        parts.push(g.name, g.role, g.name.toUpperCase(), g.role.toUpperCase())
        break
      case 'stat':
        parts.push(g.prefix, g.suffix, g.label, g.label.toUpperCase())
        break
      case 'bars':
        parts.push(g.title, g.unit, ...g.items.map((item) => item.label), g.title.toUpperCase(), ...g.items.map((item) => item.label.toUpperCase()))
        break
      case 'list':
        parts.push(g.title, ...g.items, g.title.toUpperCase(), ...g.items.map((item) => item.toUpperCase()))
        break
      case 'callout':
        parts.push(g.text, g.text.toUpperCase())
        break
      case 'quote':
        parts.push(g.text, g.author)
        break
      case 'captions':
        parts.push(...g.words.map((word) => `${word.text} ${word.text.toUpperCase()}`))
        break
    }
  }
  return [...new Set(parts.join(' '))].join('')
}

const loaded = new Map<string, Promise<unknown>>()

/**
 * 캔버스는 글꼴이 내려오기 전에 그리면 다른 글꼴로 그린다. 한·일 글꼴은 글자 묶음별로 나뉘어 있어서
 * 실제로 그릴 글자를 넘겨야 그 조각이 내려온다. 같은 요청은 한 번만 보낸다.
 */
export function loadFontsFor(theme: Theme, text: string): Promise<unknown> {
  const specs = [
    `${theme.displayItalic ? 'italic ' : ''}${theme.displayWeight} 20px ${theme.display}`,
    `${theme.strongWeight} 20px ${theme.font}`,
    `${theme.bodyWeight} 20px ${theme.font}`,
    `${theme.caption.weight} 20px ${theme.caption.font}`,
    "400 20px 'Instrument Serif', serif",
  ]
  return declare(specs).then(() =>
    Promise.all(
      specs.map((spec) => {
        const key = `${spec}|${text}`
        let promise = loaded.get(key)
        if (!promise) {
          promise = document.fonts.load(spec, text).catch(() => null)
          loaded.set(key, promise)
        }
        return promise
      }),
    ),
  )
}

export function loadFontsForGraphics(theme: Theme, graphics: Graphic[]): Promise<unknown> {
  return loadFontsFor(theme, textsOf(graphics))
}
