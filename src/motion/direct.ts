import { joinWords } from '../captions/segment'
import type { Word } from '../captions/types'
import { hasBatchim, looksBareNoun } from './korean'
import { itemLabel, statLabel } from './label'
import { findNumbers } from './numbers'
import { spellNumbers } from './spelled'
import type { FoundNumber } from './numbers'
import { clampText, fitText, fitTitle, formatNumber, joinJapanese, scriptOf } from './text'
import type { Graphic } from './types'

export type Sentence = { words: Word[]; text: string; start: number; end: number }

const SENTENCE_END = /[.!?。！？]$/
const GAP_SECONDS = 0.7

export function splitSentences(words: Word[]): Sentence[] {
  const sentences: Sentence[] = []
  let current: Word[] = []
  const flush = () => {
    if (current.length === 0) return
    sentences.push({
      words: current,
      text: joinWords(current),
      start: current[0].start,
      end: current[current.length - 1].end,
    })
    current = []
  }
  words.forEach((word, i) => {
    current.push(word)
    const next = words[i + 1]
    if (SENTENCE_END.test(word.text) || word.lineEnd || (next && next.start - word.end > GAP_SECONDS)) flush()
  })
  flush()
  return sentences
}

/* ───────────── 자기소개 → 이름 띠 ───────────── */

type Intro = { name: string; role: string }

const EN_NAME = /\b(?:[Ii]['’]m|[Ii] am|[Mm]y name is|[Mm]y name['’]s|[Tt]his is)\s+(\p{Lu}[\p{L}'-]+(?:\s+\p{Lu}[\p{L}'-]+)?)/u
const EN_ROLE = /,?\s*(?:and\s+)?(?:i'm|i’m|i am)?\s*(?:a|an)\s+([\p{L}\s-]{2,40}?)(?:[.,!?]|$)/iu

function enIntro(text: string): Intro | null {
  const match = text.match(EN_NAME)
  if (!match) return null
  const rest = text.slice((match.index ?? 0) + match[0].length)
  return { name: match[1].trim(), role: rest.match(EN_ROLE)?.[1]?.trim() ?? '' }
}

/** 한국 성씨의 첫 글자(흔한 것). 「…입니다」만으로는 이름인지 알 수 없어, 성으로 시작하는 2~4글자만 이름으로 본다. */
const KO_SURNAME = new Set([...'김이박최정강조윤장임한오서신권황안송류유전홍고문양손배백허남심노하곽성차주우구민진지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용'])
/** 성씨 글자로 시작하지만 이름이 아닌 흔한 말(직업·호칭·보통 말) */
const KO_NOT_NAME = new Set(
  '주부 유튜버 선생님 이사 조종사 기자 성우 배우 변호사 원장 강사 연구원 공무원 은행원 소방관 모델 마케터 기획자 고등학생 중학생 신입 인턴 주임 이모 고모 이번 이것 이거 여기 이제 오늘 정말 지금 우리 하나 이름 안녕 여러분 구독자 이상 이하 최고 한국 서울 주인공 고객 성공 전문가 정도 조금 이런 이렇게 한번 한편 모두 모든 이유 이후 이전 이미 이웃 유명 유일 전부 전체 정답 정보 정리 조건 조사 주제 주말 주로 지난 진짜 차이 하루 한국인 현재 강아지 고양이 기회 기본 기분 기억 남자 여자 남편 노력 문제 방법 배경 변화 서비스 선택 설명 성장 소개 손님 신청 안내 양쪽 여행 연습 영상 오래 원래 유지 인기 인생 임신 장점 전공 제목 제품 주문 지원 채널 천천히 추천 편집 하지만 한국어 현실 이야기 마지막 마음 마찬가지 문의 민원 반대 방송 방식 배달 백수 선배 선수 성격 성적 소식 소리 손해 송금 신랑 신부 신입생 심리 안전 양보 어른 엄마 여름 연락 연애 오후 오전 용기 우리나라 우선 유학 은퇴 이동 이득 이력서 이메일 이벤트 인사 인터뷰 임원 장사 전화 정신 정치 제안 조언 주식 주인 지식 진심 차례 천재 추억 편지 표현 하늘 한계 한숨 함께 허락 현장 홍보 황당'.split(
    ' ',
  ),
)
for (const word of '금요일 선물 장소 신제품 신상 한정판 연휴 명절 설날 추석 공지 유치원생 공대생 문과생 이과생 신입사원 편집자 설계사 한의사 임산부 주린이 장인 선장 기사 기관사 기술자 정비사 조리사 제빵사 안경사 변리사 노무사 마술사 배달원 유학생 전업주부 조교 조수 선임 연구자 연습생 지망생 지원자 전공자 전문의 원어민 여행자 여행가 연주자 연기자 방송인 이용자 소비자 주인장 정직원 임직원 구독 구매 주문서 소문 소원 소중 신기 신선 안심 유용 유익 정성 정직 조심 진행 최선 최신 최초 편리 한가 황금 성공적 인기템 추천템 꿀팁 한정 고민 고생 공감 공부 기대 기쁨 남다 노하우 도전 마감 명작 명품 모험 문화 민감 반전 배움 변신'.split(' ')) KO_NOT_NAME.add(word)
const KO_NAME_END = '(?:이라고 합니다|라고 합니다|이라고 해요|라고 해요|이라고 하는데요|라고 하는데요|입니다|이에요|예요|이고요|이구요)'
const KO_GREETING = /^(?:여러분[,\s]*)?(?:안녕하세요|안녕하십니까|반갑습니다|반가워요)(?:\s*여러분)?[,.!~\s]*/
const KO_SELF = /^(?:저는|전|제 이름은|제이름은|내 이름은)\s*/
/** 이름 앞의 꾸미는 말에서 하는 일을 짧게: 「카페를 운영하고 있는」 → 카페 운영, 「요리 유튜버」 → 그대로 */
function koRole(before: string): string {
  const text = before.replace(/[,\s]+$/, '').trim()
  if (!text) return ''
  const doing = text.match(/^(.+?)[을를]\s*(\S+?)(?:하고 있는|하고있는|하는)$/)
  if (doing && [...doing[1]].length <= 10) return `${doing[1]} ${doing[2]}`
  const asJob = text.match(/^(?:(.+?)에서\s*)?(.+?)(?:으로|로)\s*일하(?:고 있는|는)$/)
  if (asJob) return [asJob[1], asJob[2]].filter(Boolean).join(' ')
  const atPlace = text.match(/^(.+?)에서\s*일하(?:고 있는|는)$/)
  if (atPlace) return atPlace[1]
  const words = text.split(/\s+/)
  return words.length <= 3 && [...text].length <= 16 && words.every((word) => looksBareNoun(word)) ? text : ''
}

function koIntro(text: string): Intro | null {
  const sentence = text.replace(/[.!?~]+\s*$/, '').trim()
  const greeted = KO_GREETING.test(sentence)
  const body = sentence.replace(KO_GREETING, '')
  const self = KO_SELF.test(body)
  const rest = body.replace(KO_SELF, '')
  // 이름은 낱말 하나로 서 있어야 한다(「디자이너입니다」의 「이너」를 이름으로 읽지 않게)
  // 짧은 쪽부터 맞춘다(「이서연이라고」를 「이서연이 + 라고」로 읽지 않게)
  const match = rest.match(new RegExp(`(?:^|\\s)([가-힣]{2,4}?)(${KO_NAME_END})$`))
  if (!match) return null
  const [, name, ending] = match
  const explicit = /라고/.test(ending)
  if (!greeted && !self && !explicit) return null
  const lead = rest.slice(0, match.index ?? 0)
  // 「오늘의 주제는 ○○입니다」처럼 앞에 화제(…은·는)가 서 있으면 ○○은 이야깃거리지 이름이 아니다
  if (!explicit && lead.split(/\s+/).some((word) => /[가-힣][은는]$/.test(word) && !/(있는|하는|되는|같은|없는)$/.test(word))) return null
  if (!KO_SURNAME.has(name[0]) || KO_NOT_NAME.has(name)) return null
  // 받침 규칙: 「이라고·이에요」는 받침 있는 이름 뒤, 「라고·예요」는 받침 없는 이름 뒤에 온다
  const batchim = hasBatchim(name[name.length - 1])
  if (/^(이라고|이에요|이고요|이구요)/.test(ending) && !batchim) return null
  if (/^(라고|예요)/.test(ending) && batchim) return null
  return { name, role: koRole(lead) }
}

const JA_NOT_NAME = new Set('学生 会社員 主婦 医者 教師 先生 看護師 大学生 高校生 社会人 日本人 韓国人 初心者 素人 専門家 担当 代表 店長 社長 部長 課長 一人 自分 本当 最高 大丈夫 以上 今日 最後'.split(' '))
const JA_GREETING = /^(?:皆さん|みなさん)?[、,\s]*(?:こんにちは|こんばんは|おはようございます|はじめまして|どうも)[、。！!,\s]*/
const JA_SELF = /^(?:私は|僕は|わたしは|私の名前は|名前は)\s*/
function jaRole(before: string): string {
  const text = before.replace(/[、,\s]+$/, '').trim()
  const doing = text.match(/^(.+?)を(経営|運営|担当|開発|研究|勉強|制作|運用|販売)している$/)
  if (doing) return `${doing[1]}${doing[2]}`
  const at = text.match(/^(.+?)(?:で働いている|に勤めている|をしている)$/)
  if (at) return at[1]
  const of = text.match(/^(.+?)の$/)
  return of && [...of[1]].length <= 14 ? of[1] : ''
}

function jaIntro(text: string): Intro | null {
  const sentence = text.replace(/[。！!？?]+\s*$/, '').trim()
  const body = sentence.replace(JA_GREETING, '')
  const self = JA_SELF.test(body)
  const rest = body.replace(JA_SELF, '')
  const named = rest.match(/([\p{Script=Han}]{2,5}|[\p{Script=Katakana}ー・]{2,12})(?:と申します|といいます|と言います)$/u)
  if (named && !JA_NOT_NAME.has(named[1])) return { name: named[1], role: jaRole(rest.slice(0, named.index ?? 0)) }
  // 「私は田中です」: 내 이야기라고 밝힌 문장에서만
  const plain = self ? rest.match(/^([\p{Script=Han}]{1,4}[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]{0,4}?|[\p{Script=Katakana}ー・]{2,12})です$/u) : null
  if (plain && !JA_NOT_NAME.has(plain[1])) return { name: plain[1], role: '' }
  return null
}

function findIntro(text: string): Intro | null {
  const script = scriptOf(text)
  return script === 'ko' ? koIntro(text) : script === 'ja' ? jaIntro(text) : enIntro(text)
}

/* ───────────── 순서 말 → 목록 ───────────── */

// 「Next week」「Last year」는 순서 말이 아니다 — next·last 는 쉼표·쌍점이 따라올 때만.
const LIST_MARKERS: RegExp[] = [
  /^(?:and\s+|then\s+)?(?:first of all|first(?:ly)?|second(?:ly)?|third(?:ly)?|fourth|fifth|then|after that|finally|lastly|to start|start by|start with|begin by|begin with|number (?:one|two|three|four|five)|next(?=\s*[,:])|last(?=\s*[,:]))\b\s*[,:]?\s*/i,
  /^\d+[.)]\s*/,
  /^(?:그리고\s+)?(?:첫째|둘째|셋째|넷째|다섯째|첫 번째(?:는|로)?|두 번째(?:는|로)?|세 번째(?:는|로)?|네 번째(?:는|로)?|마지막으로|마지막은|끝으로|다음으로|그다음(?:에는|에|은|으로|엔)?|그 다음(?:에는|에|은|으로|엔)?|먼저|우선)\s*[,:]?\s*/,
  /^(?:そして)?(?:まずは|まず|最初に|次に|それから|続いて|最後に|一つ目(?:は)?|二つ目(?:は)?|三つ目(?:は)?|四つ目(?:は)?|第一に|第二に|第三に)\s*[、,:]?\s*/,
]

function stripMarker(text: string): string | null {
  for (const marker of LIST_MARKERS) {
    if (marker.test(text)) return text.replace(marker, '').replace(/[.!?。！？]+$/, '').trim()
  }
  return null
}

/* ───────────── 인용 ───────────── */

const QUOTE = /["“「『]([^"”」』]{4,120})["”」』]/
/** 따옴표 없이 누가 한 말인지 알리는 문장: As Maya Angelou said, … */
const SAID_EN = /^(?:[Aa]nd\s+|[Bb]ut\s+|[Ss]o\s+)?(?:[Aa]s\s+)?((?:\p{Lu}[\p{L}.'’-]*)(?:\s+\p{Lu}[\p{L}.'’-]*){0,2})\s+(?:once\s+|famously\s+|always\s+)?(?:said|says|wrote|put it)[,:]?\s+(?:that\s+)?(.{8,140}?)[.!?]*$/u
const NOT_AUTHOR = /^(?:I|He|She|They|We|You|It|The|This|That|My|Our|Someone|Everyone|People|Nobody|Mom|Dad|As|And|But|So)$/
/** 다음 문장이 그 사람의 말: 스티브 잡스는 이렇게 말했죠. / イチローはこう言いました。 */
const SAYS_NEXT_KO = /^(.{2,14}?)(?:은|는|이|가)\s*(?:이렇게|이런 말을|이런 말씀을)\s*(?:말했|얘기했|이야기했|말씀하셨|썼|남겼)/
const SAYS_NEXT_JA = /^(.{2,14}?)(?:は|が)(?:こう|このように|こんなふうに)(?:言いました|言っています|語りました|述べました|言った|語った)/
/** 누구의 말인지 없는 말: 시작이 반이라는 말이 있죠. */
const SAYING_KO = /^(.{4,60}?)(?:이라는|라는)\s*(?:말|속담|명언|격언)이\s*있/
const SAYING_JA = /^(.{4,60}?)という(?:言葉|ことわざ|名言)があります/

const unquote = (text: string) =>
  text
    .replace(/[.!?。！？]+\s*$/, '')
    .replace(/^["“「『]\s*/, '')
    .replace(/\s*["”」』]$/, '')
    .trim()

const CENTER: Graphic['kind'][] = ['title', 'stat', 'bars', 'list', 'quote']

/* ───────────── 숫자 ───────────── */

const MONEY_OR_RATE = /^(?:%|%p|%대|%台|x|배|倍|割|M|B|K)$|^[조억만천兆億万千]|(?:원|円|달러|ドル|유로)$/
const COUNT_UNIT = /^(?:명|개|회|번|건|점|위|등|곳|가지|마리|편|권|잔|병|人|個|件|点|位|回|名|社|店|冊|本|枚|台|匹)$/

/** 단위가 섞인 문장에서 하나만 고를 때: 돈·퍼센트·배수 → 사람·개수 → 나머지(기간 등) 순서로, 같으면 먼저 나온 것 */
function pickNumber(numbers: FoundNumber[]): FoundNumber {
  const tier = (n: FoundNumber) => (n.prefix || MONEY_OR_RATE.test(n.suffix) ? 0 : COUNT_UNIT.test(n.suffix) || (!n.suffix && n.after) ? 1 : 2)
  return [...numbers].sort((a, b) => tier(a) - tier(b))[0]
}

/**
 * 「from 9 down to 3」「100만 원에서 500만 원으로」「80kgから65kgに」: 앞 숫자에서 뒤 숫자로 바뀌었다는 말.
 * 앞 숫자만 크게 띄우면 뜻이 뒤집히므로 「9 → 3」으로 보여 준다. 단위가 같거나 앞 숫자에 단위가 없을 때만.
 */
function findChange(text: string, numbers: FoundNumber[]): { from: FoundNumber; to: FoundNumber } | null {
  for (let i = 0; i < numbers.length - 1; i++) {
    const from = numbers[i]
    const to = numbers[i + 1]
    if (from.suffix !== to.suffix && from.suffix !== '') continue
    if (from.prefix !== to.prefix && from.prefix !== '') continue
    const head = text.slice(0, from.index)
    const gap = text.slice(from.index + from.raw.length, to.index)
    const tail = text.slice(to.index + to.raw.length)
    const english = /\bfrom\s*(?:about\s+|around\s+|just\s+)?$/i.test(head) && /^\s*(?:all the way\s+)?(?:down\s+|up\s+)?to\s+(?:just\s+|only\s+|about\s+|over\s+|around\s+)?$/i.test(gap)
    const korean = /^\s?(?:에서|부터)\s*$/.test(gap) && /^\s?(?:으로|로|까지|이 됐|가 됐|이 되|가 되)/.test(tail)
    const japanese = /^(?:から|より)$/.test(gap) && /^(?:に|へ|まで|となり)/.test(tail)
    if (english || korean || japanese) return { from, to }
  }
  return null
}

/** 숫자들이 쉼표·and·그리고·、로 나란히 놓였는가(「30 apples, 50 bananas and 20 cherries」). 나란히 놓인 것만 차트로 견줄 수 있다. */
function parallel(text: string, numbers: FoundNumber[]): boolean {
  for (let i = 0; i < numbers.length - 1; i++) {
    const gap = text.slice(numbers[i].index + numbers[i].raw.length, numbers[i + 1].index)
    if ([...gap].length > 28) return false
    if (!/[,，、;]|\b(?:and|vs\.?|versus)\b|&|그리고|및|\S(?:와|과|랑|하고)\s|[とや]/i.test(gap)) return false
  }
  return true
}

const tidy = (text: string) =>
  text
    .replace(/\s+([,.!?。、])/g, '$1')
    .replace(/[,\s]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[,.\s]+/, '')
    .trim()

/** 띄어 쓰지 않는 말(한국어·일본어 글자)은 같은 폭에 절반쯤만 들어간다 */
const widthLimit = (text: string, latin: number, cjk: number) => (scriptOf(text) === 'en' ? latin : cjk)

/**
 * 받아 적은 말(어절과 시간)에서 모션그래픽을 고른다.
 * 규칙 기반이다: 자기소개 → 이름 띠, 숫자 하나 → 큰 숫자, 나란히 놓인 같은 단위의 숫자 → 막대 차트,
 * 첫째·둘째(먼저·그다음) → 목록, 따옴표나 「…는 이렇게 말했죠」 → 인용, 첫 문장 → 제목, 말 전체 → 자막.
 * 화면에 깨진 글을 올리지 않는다: 숫자의 설명은 label.ts 가 고르고, 마땅한 말이 없으면 비운다.
 * 규칙을 바꾸면 평범한 대본 24개로 다시 잰다(ordinary.test.ts — 달라진 결과를 보고 좋아졌는지 판단한다).
 */
export function direct(words: Word[]): Graphic[] {
  if (words.length === 0) return []
  const sentences = splitSentences(words)
  const graphics: Graphic[] = []
  let serial = 0
  const id = () => `g${++serial}`
  const used = new Set<number>()
  const last = words[words.length - 1].end

  graphics.push({ id: id(), kind: 'captions', start: words[0].start, end: last, words })

  const introAt = new Set<number>()
  sentences.forEach((sentence, i) => {
    const intro = findIntro(sentence.text)
    if (intro) {
      graphics.push({ id: id(), kind: 'lowerThird', start: sentence.start, end: Math.min(last, Math.max(sentence.end, sentence.start + 3.6)), ...intro })
      used.add(i)
      introAt.add(i)
    }
  })

  // 목록: 표시가 붙은 문장이 둘 이상 이어지면
  for (let i = 0; i < sentences.length; i++) {
    const items: { text: string; at: number }[] = []
    let j = i
    while (j < sentences.length) {
      const item = stripMarker(sentences[j].text)
      if (item === null) break
      items.push({ text: fitText(joinJapanese(item), widthLimit(item, 56, 28)), at: sentences[j].start })
      j++
    }
    if (items.length >= 2) {
      const prev = i > 0 ? sentences[i - 1] : null
      // 앞 문장이 숫자·인용·자기소개를 담고 있으면 그 그래픽을 살리고, 목록 머리글로 쓰지 않는다.
      // 머리글 자리에 들어가지 않는 긴 문장은 욱여넣지 않는다(그 문장은 제목으로 쓰일 수 있다).
      const leadText = prev ? joinJapanese(tidy(prev.text.replace(/[.:!?。]+$/, ''))) : ''
      const lead = prev && !used.has(i - 1) && findNumbers(prev.text).length === 0 && !QUOTE.test(prev.text) && [...leadText].length <= widthLimit(leadText, 48, 24) ? prev : null
      graphics.push({
        id: id(),
        kind: 'list',
        start: Math.max(0, items[0].at - 0.5),
        end: Math.min(last + 1.5, sentences[j - 1].end + 1.6),
        title: lead ? leadText : '',
        items: items.map((item) => item.text),
        itemTimes: items.map((item) => item.at),
      })
      if (lead) used.add(i - 1)
      for (let k = i; k < j; k++) used.add(k)
      i = j - 1
    }
  }

  const addQuote = (text: string, author: string, from: Sentence) => {
    graphics.push({ id: id(), kind: 'quote', start: from.start, end: Math.max(from.end + 0.8, from.start + 3.2), text: fitText(joinJapanese(text), widthLimit(text, 120, 64)), author: joinJapanese(author) })
  }
  // 「…는 이렇게 말했죠.」 다음 문장이 그 사람의 말이다
  sentences.forEach((sentence, i) => {
    if (used.has(i)) return
    const says = sentence.text.match(SAYS_NEXT_KO) ?? sentence.text.match(SAYS_NEXT_JA)
    if (!says) return
    // 같은 문장에 따옴표가 있으면 그 속의 말이 인용이다(일본어는 「。「」로 이어 적어 한 문장이 되곤 한다)
    const inline = sentence.text.match(QUOTE)
    if (inline) {
      addQuote(inline[1].trim(), says[1].trim(), sentence)
      used.add(i)
      return
    }
    const next = sentences[i + 1]
    if (!next || used.has(i + 1)) return
    const said = unquote(next.text)
    if ([...said].length < 4) return
    addQuote(said, says[1].trim(), next)
    used.add(i)
    used.add(i + 1)
  })

  sentences.forEach((sentence, i) => {
    if (used.has(i)) return
    const quote = sentence.text.match(QUOTE)
    if (quote) {
      addQuote(quote[1].trim(), '', sentence)
      used.add(i)
      return
    }
    const said = sentence.text.match(SAID_EN)
    if (said && !NOT_AUTHOR.test(said[1].split(/\s+/)[0])) {
      addQuote(said[2].trim(), said[1].trim(), sentence)
      used.add(i)
      return
    }
    const saying = sentence.text.match(SAYING_KO) ?? sentence.text.match(SAYING_JA)
    if (saying) {
      addQuote(unquote(saying[1]), '', sentence)
      used.add(i)
      return
    }
    // 글로 적은 수도 숫자로 읽는다(spelled.ts — 「thirty percent」「삼십 분」「三割」). 첫 문장(제목 자리)의 작은 기간은 그대로 둔다.
    const text = spellNumbers(sentence.text, i === 0 || (i === 1 && introAt.has(0)))
    const numbers = findNumbers(text)
    if (numbers.length === 0) return
    const change = findChange(text, numbers)
    if (change) {
      const { from, to } = change
      graphics.push({
        id: id(),
        kind: 'stat',
        start: sentence.start,
        end: Math.max(sentence.end + 0.8, sentence.start + 3),
        value: to.value,
        prefix: `${from.prefix}${formatNumber(from.value, from.decimals)} → ${to.prefix === from.prefix ? '' : to.prefix}`,
        suffix: to.suffix,
        decimals: to.decimals,
        label: statLabel(text, from),
      })
      used.add(i)
      return
    }
    // 같은 단위끼리 묶어 가장 큰 묶음이 둘 이상이면 차트를 생각해 본다
    const groups = new Map<string, FoundNumber[]>()
    for (const n of numbers) groups.set(`${n.prefix}|${n.suffix}`, [...(groups.get(`${n.prefix}|${n.suffix}`) ?? []), n])
    const biggest = [...groups.values()].sort((a, b) => b.length - a.length)[0]
    const labeled = biggest.map((n) => ({ n, label: itemLabel(text, n) })).filter((item) => item.label !== '')
    const distinct = new Set(labeled.map((item) => item.label)).size === labeled.length
    // 이름표가 붙은 숫자가 둘 이상이고, 쉼표·and 로 나란히 놓였을 때만 차트로 만든다
    // (「3명이 … 그들 중 1명」「40 miles … over 3 years」는 견줄 수 있는 숫자가 아니다).
    if (labeled.length >= 2 && distinct && parallel(text, biggest)) {
      graphics.push({
        id: id(),
        kind: 'bars',
        start: sentence.start,
        end: Math.max(sentence.end + 1, sentence.start + 3.6),
        title: '',
        unit: biggest[0].suffix,
        items: labeled.slice(0, 5).map(({ n, label }) => ({ label: clampText(label, 14), value: n.value })),
      })
    } else {
      const n = pickNumber(numbers)
      graphics.push({
        id: id(),
        kind: 'stat',
        start: sentence.start,
        end: Math.max(sentence.end + 0.8, sentence.start + 3),
        value: n.value,
        prefix: n.prefix,
        suffix: n.suffix,
        decimals: n.decimals,
        label: statLabel(text, n),
      })
    }
    used.add(i)
  })

  // 제목: 첫 문장. 첫 문장이 자기소개였으면 그다음 문장(「오늘은 색 이야기를 해요」).
  // 첫 문장을 숫자·목록이 썼을 때는 둘째 문장을 끌어오지 않는다 — 그저 이어지는 말이 큰 제목이 되면 어색하다.
  const titleIndex = !used.has(0) ? 0 : introAt.has(0) && sentences.length > 1 && !used.has(1) ? 1 : undefined
  if (titleIndex !== undefined) {
    const sentence = sentences[titleIndex]
    const text = fitTitle(joinJapanese(sentence.text), widthLimit(sentence.text, 60, 30))
    const tokens = text.split(/\s+/)
    let emphasis = 0
    tokens.forEach((token, k) => {
      if (token.replace(/[^\p{L}\p{N}]/gu, '').length > tokens[emphasis].replace(/[^\p{L}\p{N}]/gu, '').length) emphasis = k
    })
    graphics.push({
      id: id(),
      kind: 'title',
      start: sentence.start,
      end: Math.min(last + 0.5, Math.max(sentence.start + 2.4, Math.min(sentence.end + 0.6, sentence.start + 4.5))),
      text,
      emphasis: tokens.length > 1 ? emphasis : undefined,
    })
  }

  return resolveOverlaps(graphics)
}

/** 화면 가운데를 쓰는 그래픽이 겹치면 앞의 것을 뒤의 것이 시작하기 전에 끝낸다 */
export function resolveOverlaps(graphics: Graphic[]): Graphic[] {
  const center = graphics.filter((g) => CENTER.includes(g.kind)).sort((a, b) => a.start - b.start)
  for (let i = 0; i < center.length - 1; i++) {
    const current = center[i]
    const next = center[i + 1]
    if (current.end > next.start) {
      if (next.start - current.start >= 1) current.end = next.start
      else next.start = current.end
    }
  }
  return graphics.filter((g) => g.end - g.start > 0.4).sort((a, b) => a.start - b.start)
}
