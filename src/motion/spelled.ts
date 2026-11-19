/**
 * 글로 적은 숫자를 숫자로 바꾼다(「thirty percent」→「30 percent」, 「삼십 분」→「30분」, 「三割」→「3割」).
 * 받아쓰기와 손으로 적은 대본에는 숫자를 글로 적는 일이 많아(영어의 작은 수, 한국어 고유어, 일본어 한자), 숫자로 적었을 때와
 * 같은 그래픽이 나오게 한다. 그 뒤는 numbers.ts 가 숫자로 적은 것과 똑같이 읽는다.
 *
 * 함부로 바꾸지 않는다 — 「Three habits for better sleep」「세 가지 습관」「三つの習慣」은 숫자 그래픽이 아니라 제목이다:
 *  - 퍼센트·돈·배수(rate): 2 이상이면 늘 바꾼다
 *  - 기간·나이·길이·무게(measure): 11 이상이면 늘, 10 이하는 첫 문장(제목 자리)이 아닐 때만
 *  - 사람·물건의 개수(count): 11 이상일 때만(「두 개」「three habits」는 그대로)
 *  - 1(one·한·一)과 시각(여섯 시·at seven·六時)과 서수(twenty-first·第三)는 바꾸지 않는다
 */
type Kind = 'rate' | 'measure' | 'count'

function worth(value: number, kind: Kind, opening: boolean): boolean {
  if (!(value >= 2)) return false
  if (kind === 'rate') return true
  if (kind === 'measure') return value >= 11 || !opening
  return value >= 11
}

/** 1만 미만은 쉼표 없이(「2024」가 해로 읽히게 — numbers.ts), 그 위로는 쉼표 */
const digits = (value: number) => (Number.isInteger(value) && value >= 10000 ? value.toLocaleString('en-US') : String(value))

/* ───────── 영어 ───────── */

const EN_ONES: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
}
const EN_TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 }
const EN_SCALES: Record<string, number> = { thousand: 1e3, million: 1e6, billion: 1e9 }
const EN_DIGIT_WORDS: Record<string, number> = { zero: 0, ...Object.fromEntries(Object.entries(EN_ONES).filter(([, value]) => value < 10)) }
const isNumberWord = (word: string) => word in EN_ONES || word in EN_TENS || word in EN_SCALES || word === 'hundred'

/** 숫자 뒤의 말 — 무엇의 수인가 */
const EN_UNITS: [RegExp, Kind][] = [
  [/^\s+(?:percent|per\s+cent|percentage\s+points?)\b/i, 'rate'],
  [/^\s+(?:dollars?|bucks|usd|euros?|yen)\b/i, 'rate'],
  [/^\s+times\s+(?:faster|slower|more|less|better|bigger|larger|higher|lower|longer|cheaper|as)\b/i, 'rate'],
  [/^[\s-]+(?:years?|months?|weeks?|days?|hours?|minutes?|seconds?|miles?|kilomet(?:er|re)s?|km|kilos?|kilograms?|kg|pounds?|lbs?|calories|feet|foot|met(?:er|re)s?)\b/i, 'measure'],
]
/** 수 뒤에 와도 「개수」가 아닌 낱말(s 로 끝나도) */
const EN_NOT_NOUN = new Set('was is has this its his us yes as does goes thus plus less unless across always sometimes perhaps towards besides whereas ones times'.split(' '))
const EN_IRREGULAR = new Set('people children men women feet teeth mice geese staff'.split(' '))

function enCount(rest: string): boolean {
  const word = rest.match(/^\s+([A-Za-z]+)\b/)?.[1]?.toLowerCase()
  if (!word) return false
  return EN_IRREGULAR.has(word) || (word.length >= 3 && word.endsWith('s') && !EN_NOT_NOUN.has(word) && !isNumberWord(word))
}

type Token = { word: string; start: number; end: number }

/** 낱말 하나(붙임표로 이은 것은 쪼갠다): 숫자 말들과, 뒤에 붙은 단위(twelve-hour 의 hour)가 있으면 그 앞까지 */
function numberParts(token: Token): { parts: string[]; end: number; tail: boolean } | null {
  const parts = token.word.split('-')
  let count = 0
  while (count < parts.length && (isNumberWord(parts[count]) || (count === 0 && parts[0] === 'a'))) count++
  if (count === 0) return null
  if (count === parts.length) return { parts, end: token.end, tail: false }
  // 남은 조각이 단위면(twelve-hour, five-minute) 숫자는 그 앞까지
  const rest = parts.slice(count).join('-')
  if (!EN_UNITS.some(([pattern, kind]) => kind === 'measure' && pattern.test(`-${rest}`))) return null
  return { parts: parts.slice(0, count), end: token.start + parts.slice(0, count).join('-').length, tail: true }
}

function spellEnglish(text: string, opening: boolean): string {
  const tokens: Token[] = [...text.matchAll(/[A-Za-z]+(?:-[A-Za-z]+)*/g)].map((match) => ({ word: match[0].toLowerCase(), start: match.index ?? 0, end: (match.index ?? 0) + match[0].length }))
  const edits: { start: number; end: number; text: string }[] = []
  let i = 0
  while (i < tokens.length) {
    const run = readRun(text, tokens, i)
    if (!run) {
      i++
      continue
    }
    const before = text.slice(0, tokens[i].start)
    const previous = tokens[i - 1]
    // 앞이 숫자거나 숫자 말이면(twenty twenty-four · 5 thousand), 뒤가 숫자 말인데 이어지지 않으면(five thirty) 바꾸지 않는다
    const joinedBefore = previous !== undefined && isNumberWord(previous.word.split('-').pop() ?? '') && /^\s*$/.test(text.slice(previous.end, tokens[i].start))
    const next = tokens[run.next]
    const joinedAfter = !run.tail && next !== undefined && isNumberWord(next.word.split('-')[0]) && /^\s*$/.test(text.slice(run.end, next.start))
    if (!/\d\s*$/.test(before) && !joinedBefore && !joinedAfter) {
      const rest = text.slice(run.end)
      const kind = EN_UNITS.find(([pattern]) => pattern.test(rest))?.[1] ?? (enCount(rest) ? 'count' : null)
      if (kind && worth(run.value, kind, opening)) {
        const shown = run.scale ? `${digits(run.value / EN_SCALES[run.scale])} ${run.scale}` : digits(run.value)
        edits.push({ start: tokens[i].start, end: run.end, text: shown })
      }
    }
    i = Math.max(run.next, i + 1)
  }
  return applyEdits(text, edits)
}

/** tokens[i] 부터 이어지는 수 하나를 읽는다(one hundred and twenty · twenty-five thousand · two point five · a hundred) */
function readRun(text: string, tokens: Token[], i: number): { value: number; end: number; next: number; scale: string | null; tail: boolean } | null {
  /** tokens[k] 앞의 글(낱말 사이) */
  const textBetween = (k: number) => (k > 0 ? text.slice(tokens[k - 1].end, tokens[k].start) : '')
  let total = 0
  let current = 0
  let last: 'none' | 'a' | 'one' | 'teen' | 'ten' | 'hundred' | 'scale' | 'and' = 'none'
  let end = -1
  let scale: string | null = null
  let k = i
  let tail = false
  const words: string[] = []
  outer: while (k < tokens.length) {
    // 낱말 사이는 빈칸만(쉼표·마침표를 넘어 잇지 않는다)
    if (k > i && !/^\s+$/.test(textBetween(k))) break
    const token = tokens[k]
    const parts = numberParts(token)
    if (token.word === 'and' && (last === 'hundred' || last === 'scale') && k + 1 < tokens.length && numberParts(tokens[k + 1])) {
      last = 'and'
      k++
      continue
    }
    if (token.word === 'point' && last !== 'none' && last !== 'a' && last !== 'and' && tokens[k + 1]?.word in EN_DIGIT_WORDS) {
      let fraction = ''
      let m = k + 1
      while (m < tokens.length && tokens[m].word in EN_DIGIT_WORDS && /^\s+$/.test(textBetween(m))) {
        fraction += String(EN_DIGIT_WORDS[tokens[m].word])
        m++
      }
      current += Number(`0.${fraction}`)
      end = tokens[m - 1].end
      k = m
      break
    }
    if (!parts) break
    for (const word of parts.parts) {
      words.push(word)
      if (word === 'a') {
        if (last !== 'none' || !(tokens[k + 1]?.word === 'hundred' || tokens[k + 1]?.word in EN_SCALES)) break outer
        current = 1
        last = 'a'
      } else if (word in EN_ONES && EN_ONES[word] < 10) {
        if (!['none', 'ten', 'hundred', 'scale', 'and'].includes(last)) break outer
        current += EN_ONES[word]
        last = 'one'
      } else if (word in EN_ONES) {
        if (!['none', 'hundred', 'scale', 'and'].includes(last)) break outer
        current += EN_ONES[word]
        last = 'teen'
      } else if (word in EN_TENS) {
        if (!['none', 'hundred', 'scale', 'and'].includes(last)) break outer
        current += EN_TENS[word]
        last = 'ten'
      } else if (word === 'hundred') {
        if (!['a', 'one', 'teen'].includes(last)) break outer
        current = (current || 1) * 100
        last = 'hundred'
      } else {
        if (!['a', 'one', 'teen', 'ten', 'hundred'].includes(last)) break outer
        total += current * EN_SCALES[word]
        current = 0
        last = 'scale'
        scale = word
      }
    }
    if (last !== 'scale') scale = null
    end = parts.end
    k++
    if (parts.tail) {
      tail = true
      break
    }
  }
  if (end < 0 || last === 'a' || last === 'and' || words.length === 0) return null
  return { value: total + current, end, next: k, scale, tail }
}

/* ───────── 한국어 ───────── */

const KO_NATIVE_ONES: Record<string, number> = { 한: 1, 두: 2, 세: 3, 네: 4, 다섯: 5, 여섯: 6, 일곱: 7, 여덟: 8, 아홉: 9 }
const KO_NATIVE_TENS: Record<string, number> = { 열: 10, 스물: 20, 스무: 20, 서른: 30, 마흔: 40, 쉰: 50, 예순: 60, 일흔: 70, 여든: 80, 아흔: 90 }
/** 고유어 수 + 빈칸 + 세는 말(「세 배」「열두 시간」「서른 살」「석 달」) */
const KO_NATIVE = /(^|[^가-힣\d.,])((?:열|스물|서른|마흔|쉰|예순|일흔|여든|아흔)?(?:한|두|세|네|다섯|여섯|일곱|여덟|아홉)|열|스무|스물|서른|마흔|쉰|예순|일흔|여든|아흔|석|넉) ([가-힣]+)/g
/** 고유어 수 뒤의 세는 말(긴 것부터). 달·해는 숫자로 적을 때의 말(개월·년)로 바꿔 적는다 */
const KO_NATIVE_COUNTERS: [string, Kind, string?][] = [
  ['시간', 'measure'], ['주일', 'measure'], ['달', 'measure', '개월'], ['해', 'measure', '년'], ['살', 'measure'], ['배', 'rate'],
  ['사람', 'count'], ['군데', 'count'], ['가지', 'count'], ['마리', 'count'], ['명', 'count'], ['개', 'count'], ['곳', 'count'], ['권', 'count'],
  ['잔', 'count'], ['병', 'count'], ['번', 'count'], ['분', 'count'], ['장', 'count'], ['대', 'count'], ['편', 'count'], ['주', 'measure'],
]
const KO_SINO_DIGIT: Record<string, number> = { 일: 1, 이: 2, 삼: 3, 사: 4, 오: 5, 육: 6, 칠: 7, 팔: 8, 구: 9 }
const KO_SINO_SMALL: Record<string, number> = { 십: 10, 백: 100, 천: 1000 }
const KO_SINO_BIG: Record<string, number> = { 만: 1e4, 억: 1e8, 조: 1e12 }
/** 한자어 수(빈칸을 둔 큰 단위 묶음까지 — 「삼억 오천만」) + 빈칸 하나까지 + 세는 말 */
const KO_SINO = /(^|[^가-힣\d.,])([일이삼사오육칠팔구십백천만억조]+(?: [일이삼사오육칠팔구십백천만억조]*[만억조])*) ?([가-힣]+)/g
const KO_SINO_COUNTERS: [string, Kind][] = [
  ['퍼센트', 'rate'], ['프로', 'rate'], ['달러', 'rate'], ['유로', 'rate'], ['원', 'rate'], ['엔', 'rate'], ['배', 'rate'],
  ['킬로그램', 'measure'], ['킬로미터', 'measure'], ['칼로리', 'measure'], ['킬로', 'measure'], ['미터', 'measure'], ['그램', 'measure'], ['리터', 'measure'],
  ['개월', 'measure'], ['주일', 'measure'], ['시간', 'measure'], ['년', 'measure'], ['주', 'measure'], ['일', 'measure'], ['분', 'measure'], ['초', 'measure'], ['세', 'measure'],
  ['개국', 'count'], ['인분', 'count'], ['가지', 'count'], ['마리', 'count'], ['명', 'count'], ['개', 'count'], ['곳', 'count'], ['권', 'count'], ['잔', 'count'],
  ['병', 'count'], ['번', 'count'], ['회', 'count'], ['건', 'count'], ['대', 'count'], ['장', 'count'], ['편', 'count'], ['쪽', 'count'], ['점', 'count'], ['층', 'count'], ['평', 'count'],
]

type Group = { value: number; big: string }

/** 큰 단위(만·억·조 / 万·億·兆)로 나뉜 묶음들로 읽는다. 단위 순서가 틀리면 null(「천천」「만만」) */
function readGroups(text: string, digit: Record<string, number>, small: Record<string, number>, big: Record<string, number>): Group[] | null {
  const groups: Group[] = []
  let group = 0
  let pending = -1
  let smallest = Infinity
  let bigLast = Infinity
  for (const char of text.replace(/\s+/g, '')) {
    if (char in digit) {
      if (pending >= 0) return null
      pending = digit[char]
    } else if (char in small) {
      if (small[char] >= smallest) return null
      group += (pending >= 0 ? pending : 1) * small[char]
      pending = -1
      smallest = small[char]
    } else if (char in big) {
      if (big[char] >= bigLast) return null
      const value = group + (pending >= 0 ? pending : 0)
      groups.push({ value: value === 0 ? 1 : value, big: char })
      group = 0
      pending = -1
      smallest = Infinity
      bigLast = big[char]
    } else return null
  }
  const rest = group + (pending >= 0 ? pending : 0)
  if (rest > 0) groups.push({ value: rest, big: '' })
  return groups.length > 0 ? groups : null
}

const totalOf = (groups: Group[], big: Record<string, number>) => groups.reduce((sum, group) => sum + group.value * (group.big ? big[group.big] : 1), 0)

function spellKorean(text: string, opening: boolean): string {
  let out = text.replace(KO_NATIVE, (whole, lead: string, numeral: string, word: string) => {
    const counter = KO_NATIVE_COUNTERS.find(([name]) => word.startsWith(name))
    if (!counter) return whole
    const [name, kind, written] = counter
    let value: number
    if (numeral === '석' || numeral === '넉') {
      if (name !== '달') return whole
      value = numeral === '석' ? 3 : 4
    } else {
      const ten = Object.keys(KO_NATIVE_TENS).find((item) => numeral.startsWith(item))
      value = (ten ? KO_NATIVE_TENS[ten] : 0) + (KO_NATIVE_ONES[ten ? numeral.slice(ten.length) : numeral] ?? 0)
    }
    if (!worth(value, kind, opening)) return whole
    return `${lead}${value}${written ?? name}${word.slice(name.length)}`
  })
  out = out.replace(KO_SINO, (whole, lead: string, numeral: string, word: string) => {
    if (!/[십백천만억조]/.test(numeral)) return whole
    const counter = KO_SINO_COUNTERS.find(([name]) => word.startsWith(name))
    if (!counter) return whole
    const groups = readGroups(numeral, KO_SINO_DIGIT, KO_SINO_SMALL, KO_SINO_BIG)
    if (!groups) return whole
    // 앞에 숫자가 없는 「만·천·백」은 돈·사람 앞에서만(「만 원」「백 명」 — 「만 해도」 같은 말과 헷갈리지 않게)
    if (/^[십백천만억조]$/.test(numeral) && !['원', '달러', '명', '번'].includes(counter[0])) return whole
    const value = totalOf(groups, KO_SINO_BIG)
    if (!worth(value, counter[1], opening)) return whole
    const shown = groups.map((group) => `${group.value}${group.big}`).join(' ')
    return `${lead}${shown}${groups[groups.length - 1].big ? ' ' : ''}${word}`
  })
  return out
}

/* ───────── 일본어 ───────── */

const JA_DIGIT: Record<string, number> = { 〇: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 }
const JA_SMALL: Record<string, number> = { 十: 10, 百: 100, 千: 1000 }
const JA_BIG: Record<string, number> = { 万: 1e4, 億: 1e8, 兆: 1e12 }
const JA_COUNTERS: [string, Kind][] = [
  ['パーセント', 'rate'], ['ドル', 'rate'], ['ユーロ', 'rate'], ['％', 'rate'], ['%', 'rate'], ['割', 'rate'], ['倍', 'rate'], ['円', 'rate'],
  ['リットル', 'measure'], ['メートル', 'measure'], ['カロリー', 'measure'], ['グラム', 'measure'], ['キロ', 'measure'],
  ['か月', 'measure'], ['ヶ月', 'measure'], ['カ月', 'measure'], ['ケ月', 'measure'], ['箇月', 'measure'], ['年間', 'measure'], ['週間', 'measure'], ['日間', 'measure'],
  ['時間', 'measure'], ['分間', 'measure'], ['年', 'measure'], ['日', 'measure'], ['分', 'measure'], ['秒', 'measure'], ['歳', 'measure'], ['才', 'measure'],
  ['か国', 'count'], ['カ国', 'count'], ['ヶ国', 'count'], ['人', 'count'], ['個', 'count'], ['件', 'count'], ['回', 'count'], ['冊', 'count'], ['杯', 'count'],
  ['本', 'count'], ['枚', 'count'], ['台', 'count'], ['匹', 'count'], ['社', 'count'], ['店', 'count'], ['名', 'count'], ['代', 'count'],
]
/** 수로 시작하지만 수가 아닌 말 */
const JA_IDIOMS = ['十二分', '三日月', '三日坊主', '十人十色', '八百屋', '八百長', '四六時中', '一石二鳥', '二人三脚', '十中八九', '一日中']

function spellJapanese(text: string, opening: boolean): string {
  return text.replace(/[〇一二三四五六七八九十百千万億兆]+/g, (numeral, offset: number) => {
    // 서수(第三)·숫자에 붙은 큰 단위(25万円 · 1億2000万 — 숫자로 적은 것은 numbers.ts 가 읽는다)
    if (text[offset - 1] === '第' || /[\d.,]/.test(text[offset - 1] ?? '')) return numeral
    const rest = text.slice(offset + numeral.length)
    if (JA_IDIOMS.some((idiom) => text.startsWith(idiom, offset))) return numeral
    const counter = JA_COUNTERS.find(([name]) => rest.startsWith(name))
    if (!counter) return numeral
    // 「十分」は「じゅうぶん(足りる)」が多い — 時間の言い方が続くときだけ 10 分と読む
    if (numeral === '十' && counter[0] === '分' && !/^分(?:くらい|ぐらい|ほど|程度|間|後|前|以上|以内|おき|ごと)/.test(rest)) return numeral
    const groups = readGroups(numeral, JA_DIGIT, JA_SMALL, JA_BIG)
    if (!groups) return numeral
    const value = totalOf(groups, JA_BIG)
    if (!worth(value, counter[1], opening)) return numeral
    return groups.map((group) => `${group.value}${group.big}`).join('')
  })
}

/* ───────── 함께 ───────── */

function applyEdits(text: string, edits: { start: number; end: number; text: string }[]): string {
  let out = text
  for (const edit of [...edits].sort((a, b) => b.start - a.start)) out = out.slice(0, edit.start) + edit.text + out.slice(edit.end)
  return out
}

/** 문장 하나의 글로 적은 수를 숫자로. opening: 첫 문장(제목 자리)인가 — 작은 기간은 그대로 둔다 */
export function spellNumbers(text: string, opening = false): string {
  const english = spellEnglish(text, opening)
  return spellJapanese(spellKorean(english, opening), opening)
}
