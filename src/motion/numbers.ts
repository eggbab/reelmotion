/** 문장에서 찾은 숫자 하나 */
export type FoundNumber = {
  value: number
  prefix: string
  suffix: string
  decimals: number
  /** 원문에서 숫자가 차지한 부분 */
  raw: string
  index: number
  /** 숫자 바로 앞 낱말(조사·문장 부호를 뗀 것). 막대 이름표로 쓴다 */
  before: string
}

const WORD_UNITS: [RegExp, string][] = [
  [/^\s*(percent|per cent)\b/i, '%'],
  [/^\s*million\b/i, 'M'],
  [/^\s*billion\b/i, 'B'],
  [/^\s*thousand\b/i, 'K'],
  [/^\s*times\b/i, 'x'],
]

const SYMBOL_UNIT = /^(%|x|×|k|K|M|B|만원|억원|천원|원|만|억|천|万|億|円|倍|배|명|人|개|個|점|点)/

const NUMBER = /([$€£¥₩])?\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)/g

const particle = /(은|는|이|가|을|를|의|도|에서|에|は|が|の|を|も)$/

export function findNumbers(text: string): FoundNumber[] {
  const found: FoundNumber[] = []
  for (const match of text.matchAll(NUMBER)) {
    const [whole, currency = '', digits] = match
    const index = match.index ?? 0
    const after = text.slice(index + whole.length)
    let suffix = ''
    let used = 0
    const symbol = after.match(SYMBOL_UNIT)
    if (symbol) {
      suffix = symbol[1] === '×' ? 'x' : symbol[1]
      used = symbol[0].length
    } else {
      for (const [pattern, unit] of WORD_UNITS) {
        const word = after.match(pattern)
        if (word) {
          suffix = unit
          used = word[0].length
          break
        }
      }
    }
    if (suffix === '명' || suffix === '人' || suffix === '개' || suffix === '個' || suffix === '점' || suffix === '点') suffix = ''
    const value = Number(digits.replace(/,/g, ''))
    const looksLikeYear = !currency && !suffix && /^(19|20)\d{2}$/.test(digits)
    if (!Number.isFinite(value) || looksLikeYear) continue
    const decimals = digits.includes('.') ? digits.split('.')[1].length : 0
    const head = text.slice(0, index).trim().split(/\s+/)
    const before = (head[head.length - 1] ?? '').replace(/[,.:;!?、。]+$/, '').replace(particle, '')
    found.push({ value, prefix: currency, suffix, decimals, raw: text.slice(index, index + whole.length + used), index, before })
  }
  return found
}
