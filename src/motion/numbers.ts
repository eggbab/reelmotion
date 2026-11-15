import { stripParticle } from './korean'

/** 문장에서 찾은 숫자 하나 */
export type FoundNumber = {
  value: number
  prefix: string
  suffix: string
  decimals: number
  /** 원문에서 숫자가 차지한 부분(단위까지: 「12만 9천 원」, 「349 dollars」) */
  raw: string
  index: number
  /** 숫자 바로 앞 낱말(조사·문장 부호를 뗀 것). 막대 이름표로 쓴다 */
  before: string
  /** 숫자(단위 포함) 바로 뒤에 빈칸 하나 두고 이어지는 낱말. 사이에 쉼표 등이 있으면 비운다 */
  after: string
}

const NUMBER = /([$€£¥₩])?\s?(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)/g

/** 한국어·일본어의 큰 단위 */
const BIG: Record<string, number> = { 조: 1e12, 억: 1e8, 만: 1e4, 천: 1e3, 兆: 1e12, 億: 1e8, 万: 1e4, 千: 1e3 }

// 숫자 바로 뒤에 붙는 세는 말. 긴 것부터 적는다(개월이 개보다 먼저). 화면에 그대로 붙여 보여 준다.
const KO_UNITS =
  '킬로미터 킬로그램 센티미터 퍼센트 칼로리 킬로 미터 그램 리터 개월 년간 주년 개국 인분 스푼 번째 단계 가지 달러 유로 시간 마리 원 명 개 부 건 대 장 권 회 번 점 위 등 층 잔 병 편 곳 컵 평 년 분 초 일 주 살 세 배 끼 쪽 인'.split(' ')
const JA_UNITS =
  'パーセント ポイント リットル メートル グラム ページ キロ ドル 種類 ヶ月 か月 カ月 ケ月 週間 時間 円 人 個 点 年 分 秒 日 回 倍 位 階 冊 杯 本 枚 台 匹 歳 才 件 割 度 名 社 店 校 曲 話 品'.split(' ')
const LATIN_UNITS = ['kcal', 'kg', 'km', 'cm', 'mm', 'ml', 'GB', 'MB', 'TB', 'fps', 'mph', 'x', '×', 'k', 'K', 'M', 'B']
/** 큰 단위 뒤에(빈칸 하나까지 두고) 올 수 있는 세는 말: 3만 명, 12만 원, 25万円 */
const AFTER_BIG_KO = /^\s?(원|명|개|부|건|대|장|권|회|번|가구|달러|마리|곳|편)/
const AFTER_BIG_JA = /^(円|人|個|件|台|部|冊|回|ドル|名|社)/

const WORD_UNITS: [RegExp, string][] = [
  [/^\s*percentage points?\b/i, '%p'],
  [/^\s*(?:percent|per cent)\b/i, '%'],
  [/^\s*million\b/i, 'M'],
  [/^\s*billion\b/i, 'B'],
  [/^\s*thousand\b/i, 'K'],
  [/^\s*times\b/i, 'x'],
]
/** 말로 적은 돈 단위 → 기호(pounds 는 무게일 수 있어 뺐다) */
const CURRENCY_WORDS: [RegExp, string][] = [
  [/^\s+(?:dollars?|bucks|usd)\b/i, '$'],
  [/^\s+euros?\b/i, '€'],
  [/^\s+yen\b/i, '¥'],
]

const PERCENT: [RegExp, string][] = [
  [/^\s?[%％]\s?(?:포인트|ポイント|[pP](?![A-Za-z]))/, '%p'],
  [/^\s?퍼센트\s?포인트/, '%p'],
  [/^\s?[%％]대/, '%대'],
  [/^\s?[%％]台/, '%台'],
  [/^\s?[%％]/, '%'],
  [/^\s?(?:퍼센트|프로(?![가-힣]))/, '%'],
  [/^\s?パーセント/, '%'],
]

/** 숫자에 바로 붙어도 세는 말이 아닌 것(조사·잇는 말): 90을, 120に, 7000の → 단위 없는 숫자 */
const KO_PARTICLE = /^(은|는|이|가|을|를|의|도|에|로|으로|과|와|만|보다|부터|까지|처럼|씩|쯤|밖에|조차|마저|라고|이라고|라는|이라는|입니다|이에요|예요|이다|이고|이며|이면|이죠|이야|인\s|나\s|다\.?$|요\.?$)/
const JA_PARTICLE = /^(は|が|を|に|の|で|と|も|へ|や|から|まで|より|だ|です|でした|くらい|ぐらい|ほど|以上|以下)/
const CJK = /[\p{Script=Hangul}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u

const toNumber = (digits: string) => Number(digits.replace(/,/g, ''))

/** 큰 단위가 이어진 수를 읽는다: 12만 9천 → 129,000 (만 단위로 12.9), 3억 5천만 → 3.5억, 1億2000万 → 1.2億 */
function readBig(n: number, tail: string): { total: number; unit: string; used: number } | null {
  const head = tail.match(/^(조|억|천만|만|천|兆|億|千万|万|千)/)
  if (!head) return null
  let used = head[0].length
  let total: number
  let unit: string
  const more = (pattern: RegExp, scale: number) => {
    const m = tail.slice(used).match(pattern)
    if (!m) return false
    total += toNumber(m[1]) * scale
    used += m[0].length
    return true
  }
  switch (head[0]) {
    case '조':
    case '兆':
      unit = head[0]
      total = n * 1e12
      void more(head[0] === '조' ? /^\s?(\d[\d,]*)억/ : /^(\d[\d,]*)億/, 1e8)
      break
    case '억':
      unit = '억'
      total = n * 1e8
      // 「1억 2천」은 흔히 1억 2천만을 뜻한다
      void (more(/^\s?(\d[\d,]*)천만/, 1e7) || more(/^\s?(\d[\d,]*)만/, 1e4) || more(/^\s?(\d[\d,]*)천(?!\s?만)/, 1e7))
      break
    case '億':
      unit = '億'
      total = n * 1e8
      void (more(/^(\d[\d,]*)千万/, 1e7) || more(/^(\d[\d,]*)万/, 1e4))
      break
    case '천만':
      unit = '만'
      total = n * 1e7
      break
    case '千万':
      unit = '万'
      total = n * 1e7
      break
    case '만':
      unit = '만'
      total = n * 1e4
      void more(/^\s?(\d[\d,]*)천(?!\s?만)/, 1e3)
      break
    case '万':
      unit = '万'
      total = n * 1e4
      void more(/^(\d[\d,]*)千/, 1e3)
      break
    default:
      unit = head[0]
      total = n * 1e3
  }
  return { total, unit, used }
}

/** 보여 줄 자릿수: 정수면 0, 아니면 소수 둘째 자리까지 필요한 만큼 */
function neededDecimals(value: number): number {
  const rounded = Math.round(value * 100) / 100
  if (Number.isInteger(rounded)) return 0
  return Number.isInteger(Math.round(rounded * 100) / 10) ? 1 : 2
}

export function findNumbers(text: string): FoundNumber[] {
  const found: FoundNumber[] = []
  let consumed = 0
  for (const match of text.matchAll(NUMBER)) {
    const [whole, currency = '', digits] = match
    const index = match.index ?? 0
    // 앞 숫자의 일부(12만 9천 의 9)거나, 이름에 붙은 숫자(MP3·H264)면 건너뛴다
    if (index < consumed) continue
    const digitsAt = index + whole.length - digits.length
    if (/[A-Za-z]/.test(text[digitsAt - 1] ?? '')) continue

    const tail = text.slice(index + whole.length)
    let value = toNumber(digits)
    let decimals = digits.includes('.') ? digits.split('.')[1].length : 0
    let prefix = currency
    let suffix = ''
    let used = 0

    const big = readBig(value, tail)
    const percent = big ? undefined : PERCENT.find(([pattern]) => pattern.test(tail))
    if (big) {
      value = big.total / BIG[big.unit]
      decimals = neededDecimals(value)
      value = Math.round(value * 100) / 100
      used = big.used
      const japanese = '兆億万千'.includes(big.unit)
      const small = tail.slice(used).match(japanese ? AFTER_BIG_JA : AFTER_BIG_KO)
      suffix = small ? `${big.unit}${japanese ? '' : ' '}${small[1]}` : big.unit
      if (small) used += small[0].length
    } else if (percent) {
      suffix = percent[1]
      used = tail.match(percent[0])![0].length
    } else {
      const unit = [...KO_UNITS, ...JA_UNITS].find((item) => tail.startsWith(item)) ?? LATIN_UNITS.find((item) => tail.startsWith(item) && !/[A-Za-z]/.test(tail[item.length] ?? ''))
      if (unit) {
        suffix = unit === '×' ? 'x' : unit
        used = unit.length
      } else {
        for (const [pattern, symbol] of WORD_UNITS) {
          const word = tail.match(pattern)
          if (word) {
            suffix = symbol
            used = word[0].length
            break
          }
        }
      }
      // 세는 말도 조사도 아닌 글자가 바로 붙어 있으면 시각·날짜·번호다(10시, 3월, 2호선, 5G, 4th) — 숫자 그래픽으로 만들지 않는다
      if (!suffix) {
        const next = tail[0] ?? ''
        if (/[A-Za-z]/.test(next)) continue
        if (CJK.test(next) && !KO_PARTICLE.test(tail) && !JA_PARTICLE.test(tail)) continue
      }
    }
    // 말로 적은 돈 단위(349 dollars, 85 million dollar)
    if (!prefix) {
      for (const [pattern, symbol] of CURRENCY_WORDS) {
        const word = tail.slice(used).match(pattern)
        if (word) {
          prefix = symbol
          used += word[0].length
          break
        }
      }
    }

    // 숫자가 시작하는 곳(돈 기호가 있으면 기호부터). 정규식은 앞의 빈칸 하나까지 물기 때문에 따로 센다.
    const at = currency ? index : digitsAt
    const headText = text.slice(0, at)
    const looksLikeYear = !prefix && (suffix === '' || suffix === '년' || suffix === '年') && /^(19|20)\d{2}$/.test(digits)
    // 3월 15일, 6시 30분, 3月10日, 6時30分 — 날짜와 시각
    const dateOrTime = (suffix === '일' && /\d+월\s*$/.test(headText)) || (suffix === '분' && /\d+시\s*$/.test(headText)) || (suffix === '日' && /\d+月$/.test(headText)) || (suffix === '分' && /\d+時$/.test(headText))
    consumed = index + whole.length + used
    if (!Number.isFinite(value) || looksLikeYear || dateOrTime) continue

    const head = headText.trim().split(/\s+/)
    const before = stripParticle((head[head.length - 1] ?? '').replace(/[,.:;!?、。]+$/, '')).replace(/(は|が|の|を|も)$/, '')
    const rest = text.slice(consumed)
    const after = rest.match(/^\s+(\p{L}[\p{L}'’-]*)/u)?.[1] ?? ''
    found.push({ value, prefix, suffix, decimals, raw: text.slice(at, consumed), index: at, before, after })
  }
  return found
}
