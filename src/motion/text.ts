/**
 * 글 다듬기 가운데 화면(캔버스) 없이 되는 것. 자동 배치(direct.ts)가 쓰는데, 그 규칙은 앱 서버의 커넥터도 쓰므로
 * 브라우저 전용 코드(paint.ts)와 떼어 둔다.
 */

/** 그래픽 안에 들어갈 수 없을 만큼 긴 글은 줄여서 끝에 … 을 붙인다 */
export function clampText(text: string, max: number): string {
  const chars = [...text.trim()]
  return chars.length > max ? `${chars.slice(0, max - 1).join('').trimEnd()}…` : text.trim()
}

export type Script = 'en' | 'ko' | 'ja'

const KANA = /[\p{Script=Hiragana}\p{Script=Katakana}]/u
const HANGUL = /\p{Script=Hangul}/u
const HAN = /\p{Script=Han}/u

/** 글자를 보고 어느 말인지 어림한다: 가나가 있으면 일본어, 한글이 있으면 한국어, 한자만 있으면 일본어, 아니면 영어 */
export function scriptOf(text: string): Script {
  if (KANA.test(text)) return 'ja'
  if (HANGUL.test(text)) return 'ko'
  if (HAN.test(text)) return 'ja'
  return 'en'
}

const SPACED = /\s/

/** 긴 글을 max 글자 안으로 줄인다. 띄어 쓰는 말은 낱말 사이에서 자르고 … 을 붙인다(낱말 가운데서 자르지 않는다). */
export function fitText(text: string, max: number): string {
  const trimmed = text.trim()
  const all = [...trimmed]
  if (all.length <= max) return trimmed
  const head = all.slice(0, max - 1).join('')
  // 잘린 곳이 낱말 가운데면 앞 낱말 끝으로 물러난다(너무 많이 물러나면 그대로 자른다)
  if (SPACED.test(trimmed) && !SPACED.test(all[max - 1])) {
    const space = head.lastIndexOf(' ')
    if (space >= Math.floor(max * 0.5)) return `${head.slice(0, space).replace(/[,;:，、\s]+$/, '')}…`
  }
  return `${head.trimEnd().replace(/[,;:，、]+$/, '')}…`
}

/** 제목으로 쓸 글: 길면 쉼표 같은 마디에서 끊고(… 없이), 마디가 없으면 낱말 사이에서 끊어 … 을 붙인다 */
export function fitTitle(text: string, max: number): string {
  const trimmed = text.trim()
  if ([...trimmed].length <= max) return trimmed
  const head = [...trimmed].slice(0, max).join('')
  const breakAt = Math.max(head.lastIndexOf(','), head.lastIndexOf('，'), head.lastIndexOf('、'), head.lastIndexOf(';'), head.lastIndexOf(' — '), head.lastIndexOf(' – '))
  if (breakAt >= 12) return head.slice(0, breakAt).trim()
  return fitText(trimmed, max)
}

/** 숫자를 화면에 적는 꼴: 세 자리마다 쉼표, 정한 자릿수의 소수 */
export function formatNumber(value: number, decimals: number): string {
  const fixed = value.toFixed(decimals)
  const [whole, part] = fixed.split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return part ? `${grouped}.${part}` : grouped
}

const JA_CHAR = '\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}ー々'
const JA_GAP = new RegExp(`(?<=[${JA_CHAR}、。「」])\\s+(?=[${JA_CHAR}0-9「」])|(?<=[0-9%])\\s+(?=[${JA_CHAR}])`, 'gu')

/**
 * 일본어 글에서 낱말 사이의 빈칸을 없앤다. 일본어 대본은 자막이 끊길 자리를 빈칸으로 적곤 하는데(「多くの人が 37% 早く」),
 * 그래픽의 글에는 그 빈칸이 어색하다. 영어·한국어 글은 그대로 둔다.
 */
export function joinJapanese(text: string): string {
  return scriptOf(text) === 'ja' ? text.replace(JA_GAP, '') : text
}
