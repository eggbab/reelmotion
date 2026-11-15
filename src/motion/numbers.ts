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
  /** 숫자(단위 포함) 바로 뒤에 빈칸 하나 두고 이어지는 낱말. 사이에 쉼표 등이 있으면 비운다 */
  after: string
}

const WORD_UNITS: [RegExp, string][] = [
  [/^\s*(percent|per cent)\b/i, '%'],
  [/^\s*million\b/i, 'M'],
  [/^\s*billion\b/i, 'B'],
  [/^\s*thousand\b/i, 'K'],
  [/^\s*times\b/i, 'x'],
]

// 긴 것부터 적는다(만원이 만보다, 개월이 개보다 먼저). 한·일 세는 말(명·년·人…)도 화면에 그대로 붙여 보여 준다.
const SYMBOL_UNIT = /^(%|x|×|k|K|M|B|만원|억원|천원|원|만|억|천|万|億|円|倍|배|년간|년|개월|시간|분|초|일|주|살|세|회|번|명|개|점|ヶ月|か月|時間|人|個|点|年|分|秒|日|回|kg|km|cm)/

const NUMBER = /([$€£¥₩])?\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)/g

const particle = /(은|는|이|가|을|를|의|도|에서|에|は|が|の|を|も)$/

export function findNumbers(text: string): FoundNumber[] {
  const found: FoundNumber[] = []
  for (const match of text.matchAll(NUMBER)) {
    const [whole, currency = '', digits] = match
    const index = match.index ?? 0
    const tail = text.slice(index + whole.length)
    let suffix = ''
    let used = 0
    const symbol = tail.match(SYMBOL_UNIT)
    if (symbol) {
      suffix = symbol[1] === '×' ? 'x' : symbol[1]
      used = symbol[0].length
    } else {
      for (const [pattern, unit] of WORD_UNITS) {
        const word = tail.match(pattern)
        if (word) {
          suffix = unit
          used = word[0].length
          break
        }
      }
    }
    const value = Number(digits.replace(/,/g, ''))
    const looksLikeYear = !currency && (suffix === '' || suffix === '년' || suffix === '年') && /^(19|20)\d{2}$/.test(digits)
    if (!Number.isFinite(value) || looksLikeYear) continue
    const decimals = digits.includes('.') ? digits.split('.')[1].length : 0
    const head = text.slice(0, index).trim().split(/\s+/)
    const before = (head[head.length - 1] ?? '').replace(/[,.:;!?、。]+$/, '').replace(particle, '')
    const rest = text.slice(index + whole.length + used)
    const after = rest.match(/^\s+(\p{L}[\p{L}'’-]*)/u)?.[1] ?? ''
    found.push({ value, prefix: currency, suffix, decimals, raw: text.slice(index, index + whole.length + used), index, before, after })
  }
  return found
}
