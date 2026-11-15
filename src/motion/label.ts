import { looksBareNoun, markedNoun, stripParticle } from './korean'
import type { FoundNumber } from './numbers'
import { joinJapanese, scriptOf } from './text'

/**
 * 숫자 그래픽의 설명 글: 큰 숫자 아래에 「무엇의 숫자인지」를 짧게 적는다.
 * 예전에는 문장에서 숫자만 뺀 글을 썼는데, 한국어·일본어에서는 깨진 조각이 됐다
 * (「가격은 12만 9천 원인데 저는 만족합니다」 → 「가격은 9천 원인데 저는 만족합니다」).
 * 지금은 말마다 규칙을 따로 두고, 마땅한 말이 없으면 비운다 — 깨진 글을 화면에 올리지 않는다.
 * 사전 없이 하는 어림이라 완전하지 않다. 규칙을 바꿀 때는 label.test.ts 의 문장들로 확인한다.
 */

const SENTENCE_END = /[.!?…。！？~]+\s*$/
const hasDigit = (text: string) => /\d/.test(text)
const chars = (text: string) => [...text].length

/** 숫자가 든 마디의 앞·뒤(쉼표·쌍점에서 나눈다. 1,000 처럼 숫자 안의 쉼표는 나누지 않는다) */
function clauseOf(text: string, n: FoundNumber): { before: string; after: string } {
  const breaks = (i: number) => {
    const ch = text[i]
    if (!/[,;:，、；：—–]/.test(ch)) return false
    return !(ch === ',' && /\d/.test(text[i - 1] ?? '') && /\d/.test(text[i + 1] ?? ''))
  }
  let start = 0
  for (let i = n.index - 1; i >= 0; i--) {
    if (breaks(i)) {
      start = i + 1
      break
    }
  }
  const from = n.index + n.raw.length
  let end = text.length
  for (let i = from; i < text.length; i++) {
    if (breaks(i)) {
      end = i
      break
    }
  }
  return { before: text.slice(start, n.index), after: text.slice(from, end).replace(SENTENCE_END, '') }
}

/* ───────────── 한국어 ───────────── */

const KO_LEAD = new Set('그리고 그래서 하지만 그런데 그러나 다만 또 또한 이로써 그러면 그럼 근데 그러니까 즉 특히 사실 솔직히 참고로 그래도 게다가 결국 물론 아무튼 일단 왜냐하면 그렇지만 따라서 그러다 그런데도 덕분에'.split(' '))
const KO_TIME = /^(오늘|어제|내일|지금|요즘|이제|현재|최근|처음|이번|올해|작년|내년|아침|저녁|밤|낮|평소|예전|옛날|나중|당시|그때|이때)(은|는|에|에는|엔|도|부터|까지)?$/
const KO_PRONOUN = /^(저|나|제|내|우리|저희|너|당신|그|그녀|이것|그것|저것|이거|그거|여기|거기|저기|여러분)(은|는|이|가|도|의)?$/
/** 숫자 바로 앞에 와서 숫자를 꾸미는 말(약 3명, 하루 200명, 연 2.75%) — 이름을 찾을 때 건너뛴다 */
const KO_SKIP = new Set(
  '약 총 연 월 하루 하루에 매일 매달 매년 매주 최대 최소 무려 여전히 거의 대략 평균 딱 겨우 벌써 이미 아직 정말 진짜 고작 단 단돈 각각 모두 전부 다 꼭 좀 조금 바로 그냥 계속 다시 한 두 세 네 또 더 덜 각 매번 매회 한꺼번에 합쳐서 합쳐 자그마치 불과 족히 적어도 많아야 최고 최저 대부분 보통 주로 한달에 일주일에 한번에'.split(' '),
)
const KO_STOP_NOUN = new Set('때 중 것 수 등 쪽 번 개 명 지 그중 이중 전체 모두 각각 서로 정도 가량 이상 이하 미만 대부분 일부 나머지'.split(' '))
/** 「고」「며」로 끝나지만 잇는 말이 아닌 이름 */
const KO_NOUN_GO = new Set('최고 광고 창고 사고 재고 보고 경고 참고 신고 예고 권고 충고 냉장고 금고 차고 원고 피고 숙고 기고 회고 중고 정기고'.split(' '))
const KO_APPROX_AFTER = /^\s*(정도|가량|쯤|이상|이하|가까이|넘게|미만|씩)(?=\s|$)/
const KO_COPULA = /(입니다만|이었습니다|이었어요|이랍니다|이거든요|입니다|이에요|였습니다|였어요|인데요|예요|이죠|이야)$/

const koClean = (word: string) => word.replace(/[,.!?…'"“”‘’()]+$/, '')

function koConnective(word: string): boolean {
  const w = koClean(word)
  if (/(면서|지만|는데|은데|인데|어서|아서|해서|니까|다가|거나|고서)$/.test(w)) return true
  return /(고|며)$/.test(w) && w.length >= 2 && !KO_NOUN_GO.has(w)
}

/** 숫자 앞의 낱말들: 잇는 말·다른 숫자 뒤만 남기고, 앞의 이음말·때·나를 가리키는 말을 뺀다 */
function koBeforeWords(before: string, keepTrail = false): string[] {
  let words = before.trim().split(/\s+/).filter(Boolean)
  for (let i = words.length - 2; i >= 0; i--) {
    if (koConnective(words[i])) {
      words = words.slice(i + 1)
      break
    }
  }
  for (let i = words.length - 1; i >= 0; i--) {
    if (hasDigit(words[i])) {
      words = words.slice(i + 1)
      break
    }
  }
  while (words.length > 0 && (KO_LEAD.has(koClean(words[0])) || KO_TIME.test(koClean(words[0])) || KO_PRONOUN.test(koClean(words[0])))) words.shift()
  if (!keepTrail) while (words.length > 0 && KO_SKIP.has(koClean(words[words.length - 1]))) words.pop()
  return words
}

/** 풀이말이 「○○입니다·○○이에요」일 때의 ○○(앞에 꾸미는 이름이 하나 있으면 함께) */
function koPredicateNoun(sentence: string, from = 0): string {
  const text = sentence.replace(SENTENCE_END, '').trim()
  const copula = text.match(KO_COPULA)
  if (!copula) return ''
  const body = text.slice(0, text.length - copula[0].length)
  if (body.length <= from) return ''
  const words = body.slice(from).trim().split(/\s+/).filter(Boolean)
  const last = words[words.length - 1] ?? ''
  if (chars(last) < 2 || hasDigit(last) || KO_STOP_NOUN.has(last)) return ''
  const prev = words[words.length - 2]
  return prev && looksBareNoun(prev) && !KO_SKIP.has(prev) ? `${prev} ${last}` : last
}

/** 숫자 뒤의 「의 ○○」: 3개의 계정 → 계정, 3명의 작은 회사예요 → 작은 회사 */
function koNounAfter(after: string): string {
  const rest = after.replace(KO_APPROX_AFTER, '')
  if (!rest.startsWith('의')) return ''
  const words = rest.slice(1).trim().split(/\s+/).filter(Boolean).slice(0, 3)
  const picked: string[] = []
  for (const word of words) {
    const w = koClean(word)
    const marked = markedNoun(w)
    const copula = w.match(KO_COPULA)
    if (marked !== null) return [...picked, marked].join(' ')
    if (copula && w.length > copula[0].length) return [...picked, w.slice(0, w.length - copula[0].length)].join(' ')
    if (hasDigit(w)) return ''
    picked.push(w)
    if (looksBareNoun(w) && picked.length === words.length) return picked.join(' ')
  }
  return ''
}

/** 낱말 하나가 이름이면 그 이름(조사를 뗀 것), 아니면 '' */
function koNounOf(word: string, particles: 'topic' | 'any'): string {
  const w = koClean(word)
  if (hasDigit(w)) return ''
  const marked = markedNoun(w)
  if (marked !== null) return KO_STOP_NOUN.has(marked) || KO_TIME.test(marked) || KO_PRONOUN.test(marked) ? '' : marked
  const bare = particles === 'any' ? stripParticle(w) : w
  if (!looksBareNoun(bare) || KO_STOP_NOUN.has(bare) || KO_SKIP.has(bare) || KO_TIME.test(bare) || KO_PRONOUN.test(bare)) return ''
  return bare
}

const fitWords = (words: string[], max: number) => {
  const kept = [...words]
  while (kept.length > 1 && chars(kept.join(' ')) > max) kept.shift()
  const joined = kept.join(' ')
  return chars(joined) <= max ? joined : ''
}

function koStatLabel(sentence: string, n: FoundNumber): string {
  const { before, after } = clauseOf(sentence, n)
  const next = sentence[n.index + n.raw.length] ?? ''
  const afterText = after.replace(KO_APPROX_AFTER, '').trim()

  // 퍼센트·배수가 풀이말을 꾸밀 때(37% 더 빨리, 42% 늘었어요): 숫자만 빼도 말이 된다
  if (['%', '%p', '배', 'x'].includes(n.suffix) && (next === '' || /\s/.test(next)) && afterText) {
    const whole = `${koBeforeWords(before, true).join(' ')} ${afterText}`.trim()
    if (!hasDigit(whole) && chars(whole) <= 20 && whole.includes(' ')) return whole
  }

  const words = koBeforeWords(before)
  const last = words[words.length - 1]
  if (last) {
    const noun = koNounOf(last, 'topic')
    if (noun) return noun
  }

  // 숫자가 주어일 때(15만 원은 비상금입니다 · 80%가 재구매합니다): 풀이말이 설명이다
  const subject = /^(은|는|이|가)(?=\s|$)/.test(after)
  if (subject) {
    const noun = koPredicateNoun(sentence, n.index + n.raw.length)
    if (noun) return noun
    const rest = sentence.slice(n.index + n.raw.length + 1).replace(SENTENCE_END, '').trim()
    if (rest && !hasDigit(rest) && chars(rest) <= 12 && !/[,，]/.test(rest)) return rest
  }

  const counted = koNounAfter(after)
  if (counted) return counted

  // 앞말이 「배터리는 한 번 충전하면」처럼 화제로 시작하면 화제만
  const first = words[0] ? koClean(words[0]) : ''
  if (words.length > 1 && /[은는]$/.test(first)) {
    const topic = koNounOf(first, 'topic')
    if (topic) return topic
  }
  if (words.length > 0) {
    const phrase = fitWords(words.map((word, i) => (i === words.length - 1 ? koClean(word) : word)), 18)
    if (phrase && !KO_STOP_NOUN.has(phrase)) return words.length === 1 ? stripParticle(phrase) : phrase
  }
  return subject ? '' : koPredicateNoun(sentence, n.index + n.raw.length)
}

function koItemLabel(sentence: string, n: FoundNumber): string {
  const words = koBeforeWords(clauseOf(sentence, n).before)
  const last = words[words.length - 1]
  return last ? koNounOf(last, 'any') : ''
}

/* ───────────── 일본어 ───────────── */

type Token = { text: string; word: boolean }
let segmenter: Intl.Segmenter | null = null
function jaTokens(text: string): Token[] {
  segmenter ??= new Intl.Segmenter('ja', { granularity: 'word' })
  return [...segmenter.segment(text)].filter((part) => part.segment.trim() !== '').map((part) => ({ text: part.segment, word: part.isWordLike === true }))
}

const JA_PARTICLE = new Set('は が を に で と も へ や の から まで より って には では とは にも でも とも'.split(' '))
const JA_LEAD = /^(これだけで|それだけで|これで|それで|そして|しかし|ただし|ただ|一方で|一方|でも|また|さらに|つまり|実は|正直|ちなみに|なお|なので|だから|すると|そのため|そのうち|このうち|今では|今は|今日は|最近は|現在は|現在|最初は|まずは|まず)[、,]?/
const JA_TRAIL = /(約|およそ|ほぼ|毎日|毎月|毎年|毎週|年間|月間|月に|年に|週に|一日に|一日|1日|最大|最低|最高|合計|平均|わずか|たった|もう|すでに|なんと|実に|計|月|年)$/
const JA_APPROX_AFTER = new Set('くらい ぐらい ほど 程度 以上 以下 近く 余り 前後'.split(' '))
const JA_STOP = new Set('これ それ あれ ここ そこ こう そう いる ある する なる です ます した して ください 私 僕 俺 今 今日 最近 現在 時 中 こと もの ため よう うち'.split(' '))
const JA_COPULA = /(でしょう|でした|である|です|だ)$/
const HAS_KANJI_KATA = /[\p{Script=Han}\p{Script=Katakana}A-Za-z々ー]/u

/** 이름의 조각으로 볼 수 있는 낱말인가(한자·가타카나·영문이 들었거나, 세 글자 이상의 히라가나 이름) */
function jaNounPiece(token: Token | undefined): boolean {
  if (!token || !token.word || JA_PARTICLE.has(token.text) || JA_STOP.has(token.text) || hasDigit(token.text)) return false
  if (HAS_KANJI_KATA.test(token.text)) return !/[にでとへ]$/.test(token.text) || chars(token.text) === 1
  return chars(token.text) >= 3 || ['さん', 'たち', 'ちゃん', 'くん', 'さま'].includes(token.text)
}

/** tokens[end] 에서 왼쪽으로 이어지는 이름 덩어리(物価の上昇率 · 家賃と固定費 · 政策金利) */
function jaNounEndingAt(tokens: Token[], end: number): string {
  if (!jaNounPiece(tokens[end])) return ''
  let start = end
  for (;;) {
    if (jaNounPiece(tokens[start - 1])) start -= 1
    else if (['の', 'と', '・'].includes(tokens[start - 1]?.text ?? '') && jaNounPiece(tokens[start - 2])) start -= 2
    else break
  }
  let parts = tokens.slice(start, end + 1)
  while (chars(parts.map((token) => token.text).join('')) > 12 && parts.length > 1) parts = parts.slice(1)
  while (parts.length > 0 && ['の', 'と', '・'].includes(parts[0].text)) parts = parts.slice(1)
  return parts.map((token) => token.text).join('')
}

/** 앞말에서 앞의 이음말과, 숫자를 꾸미는 끝말(約·毎月)을 뗀다. 다른 숫자가 있으면 그 뒤만 */
function jaBefore(before: string, keepTrail = false): string {
  let text = before.trim().replace(/^.*\d[^\s、,]*/u, '')
  for (let previous = ''; previous !== text; ) {
    previous = text
    text = text.replace(JA_LEAD, '')
  }
  if (!keepTrail) {
    for (let previous = ''; previous !== text; ) {
      previous = text
      text = text.replace(JA_TRAIL, '')
    }
  }
  return text
}

function jaAdjacentNoun(before: string, particles: string[]): string {
  const tokens = jaTokens(before)
  const last = tokens[tokens.length - 1]
  if (!last) return ''
  if (particles.includes(last.text)) return jaNounEndingAt(tokens, tokens.length - 2)
  return jaNounEndingAt(tokens, tokens.length - 1)
}

function jaPredicateNoun(sentence: string, from: number): string {
  const text = sentence.replace(SENTENCE_END, '').trim()
  const copula = text.match(JA_COPULA)
  if (!copula) return ''
  const body = text.slice(from, text.length - copula[0].length)
  const tokens = jaTokens(body)
  return jaNounEndingAt(tokens, tokens.length - 1)
}

function jaStatLabel(sentence: string, n: FoundNumber): string {
  const { before, after } = clauseOf(sentence, n)
  const afterTokens = jaTokens(after)
  const first = afterTokens[0]?.text ?? ''

  // 퍼센트·배수가 풀이말을 꾸밀 때(0.25%引き上げました): 숫자만 빼도 말이 된다
  if (['%', '%p', '倍', '割'].includes(n.suffix) && first && !JA_PARTICLE.has(first) && !JA_APPROX_AFTER.has(first) && !/^(です|だ|でし)/.test(first)) {
    const whole = `${jaBefore(before, true)}${after.trim()}`
    if (!hasDigit(whole) && chars(whole) <= 22 && chars(whole) > chars(after.trim())) return whole
  }

  const head = jaBefore(before)
  const adjacent = jaAdjacentNoun(head, ['は', 'が', 'を', 'も', 'の'])
  if (adjacent) return adjacent

  // 숫자가 주어일 때(80%がリピーターです)
  if (first === 'は' || first === 'が') {
    const noun = jaPredicateNoun(sentence, n.index + n.raw.length + 1)
    if (noun) return noun
  }

  // 숫자 뒤의 「の○○」(7000の島々 · 200人くらいのお客さん)
  let at = 0
  while (JA_APPROX_AFTER.has(afterTokens[at]?.text ?? '')) at += 1
  if (afterTokens[at]?.text === 'の') {
    // 「の」 뒤만 본다(앞의 くらい·ほど 까지 이어 붙이지 않게)
    const rest = afterTokens.slice(at + 1)
    let end = 0
    while (jaNounPiece(rest[end + 1])) end += 1
    const noun = jaNounEndingAt(rest, end)
    if (noun) return noun
  }

  // 앞말의 화제(バッテリーは一回の充電で → バッテリー)
  const tokens = jaTokens(head)
  const topicAt = tokens.findIndex((token, i) => token.text === 'は' && i > 0)
  if (topicAt > 0) {
    const topic = jaNounEndingAt(tokens, topicAt - 1)
    if (topic) return topic
  }
  const phrase = head.replace(/(には|では|とは|からは|までは|は|が|を|に|で|と|も|へ|の)+$/u, '')
  if (phrase && !hasDigit(phrase) && chars(phrase) <= 14 && !JA_STOP.has(phrase)) return phrase
  return jaPredicateNoun(sentence, n.index + n.raw.length)
}

function jaItemLabel(sentence: string, n: FoundNumber): string {
  return jaAdjacentNoun(jaBefore(clauseOf(sentence, n).before), ['は', 'が', 'を', 'も', 'の', 'で', 'に', 'と', 'や'])
}

/* ───────────── 영어 ───────────── */

const EN_FILLER =
  /^(?:and|but|so|well|now|then|also|plus|honestly|basically|actually|literally|okay|ok|yes|yeah|look|listen|see|here's how|here’s how|here is how|this is how|that's how|that’s how|that's why|that’s why|which is why|it turns out|turns out|i think|i mean|you know|in fact|the truth is)[,\s]+/i
/** 숫자 바로 앞에 와도 설명에서 빼는 낱말(by 8% → 8%), 설명 끝에 홀로 남으면 떼는 낱말 */
const EN_TRAIL = new Set('a an the of in on at by to for from with about over under than just only nearly almost around roughly up down per is are was were be been it its and or but that which who as into onto off out some'.split(' '))
/** 뒤 구절을 여기서 끊는다 */
const EN_BREAK = new Set('in on at by for from to into over with during since per than and but or which that while when because so as until before after through within across'.split(' '))
/** 숫자 뒤 첫 낱말이 이것이면 숫자가 「세는 것」이 아니라 꾸미는 말이다(37% faster, 42% last year) */
const EN_ADVERBIAL = new Set(
  [...EN_BREAK, ...'faster slower more less fewer higher lower better worse bigger smaller longer shorter cheaper quicker earlier later off ago last next this every each is are was were will would can could has have had do does did not i we you they he she it'.split(' ')],
)
const EN_PRONOUN = new Set('i we you they he she it my our your their his her its me us them'.split(' '))

const enWords = (text: string) =>
  text
    .replace(SENTENCE_END, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
const enKey = (word: string) => word.toLowerCase().replace(/[^a-z'’]/g, '')

function enStripFiller(text: string): string {
  let out = text.trim()
  for (let previous = ''; previous !== out; ) {
    previous = out
    out = out.replace(EN_FILLER, '')
  }
  return out
}

function enTrimTrail(words: string[]): string[] {
  const kept = [...words]
  while (kept.length > 0 && EN_TRAIL.has(enKey(kept[kept.length - 1]))) kept.pop()
  return kept
}

function enStatLabel(sentence: string, n: FoundNumber): string {
  const { before, after } = clauseOf(sentence, n)
  const afterWords = enWords(after)
  const beforeWords = enTrimTrail(enWords(before))
  const first = afterWords[0] ? enKey(afterWords[0]) : ''

  // 숫자가 세는 것이 뒤에 올 때(5 nights a week · 40 miles of protected lanes · 20% of every paycheck)
  if (first && (first === 'of' || !EN_ADVERBIAL.has(first))) {
    const picked: string[] = []
    for (const word of afterWords) {
      const key = enKey(word)
      if (picked.length > 0 && EN_BREAK.has(key)) break
      if (picked.length >= 4 || hasDigit(word)) break
      picked.push(word)
    }
    const phrase = enTrimTrail(picked).join(' ')
    if (phrase && !hasDigit(phrase) && (first !== 'of' || picked.length > 1)) return phrase
  }

  // 숫자가 꾸미는 말일 때(Our revenue grew 42% last year): 숫자만 빼도 말이 된다
  const whole = enTrimTrail(enWords(enStripFiller([...beforeWords, ...afterWords].join(' ')))).join(' ')
  if (whole && !hasDigit(whole) && whole.includes(' ') && whole.length <= 36) return whole

  // 그러면 다른 숫자가 남거나 너무 길 때: 앞말만
  const head = enTrimTrail(enWords(enStripFiller(beforeWords.join(' ')))).slice(-5)
  if (head.length > 0 && !hasDigit(head.join(' ')) && head.some((word) => !EN_PRONOUN.has(enKey(word)) && !EN_TRAIL.has(enKey(word)))) return head.join(' ')
  return ''
}

function enItemLabel(_sentence: string, n: FoundNumber): string {
  const ok = (word: string) => word !== '' && !hasDigit(word) && !EN_TRAIL.has(enKey(word)) && !EN_ADVERBIAL.has(enKey(word)) && !EN_PRONOUN.has(enKey(word))
  // 「Apple 30%」처럼 이름이 앞에 오면 앞 낱말, 「30 apples」처럼 단위 없는 숫자 뒤에 오면 뒤 낱말
  if (n.after && !n.suffix && !n.prefix && ok(n.after)) return n.after
  return ok(n.before) ? n.before : ''
}

/* ───────────── 고르기 ───────────── */

const tidy = (text: string) =>
  text
    .replace(/\s+([,.!?。、])/g, '$1')
    .replace(/[,\s]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[,.\s]+/, '')
    .trim()

/** 숫자 그래픽의 설명 글. 마땅한 말이 없으면 '' */
export function statLabel(sentence: string, n: FoundNumber): string {
  const script = scriptOf(sentence)
  const label = script === 'ko' ? koStatLabel(sentence, n) : script === 'ja' ? jaStatLabel(sentence, n) : enStatLabel(sentence, n)
  return joinJapanese(tidy(label))
}

/** 막대 하나의 이름표(짧은 이름). 마땅한 말이 없으면 '' */
export function itemLabel(sentence: string, n: FoundNumber): string {
  const script = scriptOf(sentence)
  const label = script === 'ko' ? koItemLabel(sentence, n) : script === 'ja' ? jaItemLabel(sentence, n) : enItemLabel(sentence, n)
  return joinJapanese(tidy(label))
}
