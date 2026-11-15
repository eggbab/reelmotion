/**
 * 한국어 어절에서 「이름 + 조사」를 알아보는 작은 규칙(사전 없이).
 * 조사는 앞 글자의 받침에 따라 꼴이 정해진다: 받침 뒤에는 은·이·을, 받침 없는 글자 뒤에는 는·가·를.
 * 그래서 「남는」(남 + 는: 받침 뒤의 는)은 이름+조사가 아니라 풀이말이고, 「물가」(물 + 가)는 조사가 붙은 말이 아니다.
 * 완전하지 않다 — 모르면 null(조사가 붙은 이름이 아님)을 돌려주고, 부르는 쪽은 그때 더 안전한 길을 고른다.
 */

/** 한글 음절에 받침이 있는가 */
export function hasBatchim(char: string): boolean {
  const code = char.charCodeAt(0) - 0xac00
  return code >= 0 && code <= 11171 && code % 28 !== 0
}

const HANGUL_SYLLABLE = /[가-힣]/

/** 「은」으로 끝나지만 꾸미는 말(같은·많은·남은…) */
const NOT_NOUN_EUN = new Set(
  '같은 많은 적은 좋은 작은 높은 낮은 넓은 좁은 깊은 짧은 젊은 늦은 싶은 않은 받은 먹은 남은 찾은 잡은 넣은 놓은 얻은 읽은 입은 볶은 삶은 익은 늙은 죽은 굵은 얇은 밝은 맑은 붉은 검은 옳은 괜찮은 귀찮은 수많은 똑같은 앉은 닫은 믿은 씻은 웃은 깎은 묶은 섞은 끓은 잃은 숨은 쌓은 낳은 닮은 젖은 식은 굳은 곧은 굶은'.split(' '),
)
/** 「이」로 끝나지만 조사가 붙은 것이 아닌 말(부사, 「이」로 끝나는 이름) */
const NOT_PARTICLE_I = new Set(
  '많이 같이 굳이 깨끗이 틈틈이 곰곰이 일일이 낱낱이 번번이 더욱이 일찍이 높이 깊이 길이 넓이 놀이 먹이 벌이 풀이 어린이 젊은이 늙은이 손잡이 떡볶이 종이 고양이 호랑이 원숭이 지팡이 곰팡이 엉덩이 목걸이 귀걸이 옷걸이 반드시 가까이 멀리 따로 서로'.split(' '),
)
/** 받침 없는 글자 뒤의 「가」로 끝나는 이름(조사가 아니다) */
const NOUN_GA = new Set('휴가 주가 유가 대가 화가 추가 고가 저가 시가 지가 뭔가 누군가 언젠가 어딘가 왠지 국가 평가 증가 작가 물가 원가 단가 인가 허가'.split(' '))
/** 「의」로 끝나는 이름 */
const NOUN_UI = new Set('회의 주의 정의 강의 동의 의의 편의 논의 합의 문의 건의 결의 예의 창의 거의 고의 호의 성의 수의 항의 협의 심의 토의 유의 임의 자의 타의 민의'.split(' '))
/** 받침 없는 글자 뒤의 「는」으로 끝나는 풀이말(가는·오는·만드는…) */
const VERB_NEUN = new Set(
  '가는 오는 보는 주는 쓰는 사는 아는 드는 나오는 들어가는 들어오는 나가는 다니는 모으는 만드는 지내는 보내는 배우는 가르치는 마시는 다루는 고르는 부르는 모르는 오르는 자라는 바라는 누리는 버리는 기다리는 달리는 올리는 내리는 늘리는 줄이는 높이는 보이는 쓰이는 끝나는 나누는 바꾸는 키우는 채우는 세우는 태우는 외우는 치우는 지우는 비우는 이루는 다가오는 돌아오는 올라가는 내려가는 지나가는 따르는 누르는 빠르는 흐르는 기르는 자르는 부리는 가리는 그리는 느끼는 즐기는 남기는 옮기는 넘기는 맡기는 챙기는 생기는 벌이는 끓이는 붙이는 먹이는 줄어드는 늘어나는 일어나는 태어나는 나타나는 뛰어나는 떠나는 만나는 끝내는 해내는 지켜보는 알아보는 찾아보는 살펴보는 돌보는'.split(' '),
)

const TRAILING_PUNCT = /[,.!?…'"“”‘’()[\]]+$/

/**
 * 어절이 「이름 + 조사(은·는·이·가·을·를·의)」이면 이름을 돌려준다. 아니면 null.
 * GDP는·AI가 처럼 영문·숫자 뒤의 조사도 뗀다.
 */
export function markedNoun(word: string): string | null {
  const w = word.replace(TRAILING_PUNCT, '')
  if (w.length < 2) return null
  const last = w[w.length - 1]
  const stem = w.slice(0, -1)
  const prev = stem[stem.length - 1]
  if (!'은는이가을를의'.includes(last)) return null
  if (!HANGUL_SYLLABLE.test(prev)) return /[A-Za-z0-9%]$/.test(stem) ? stem : null
  switch (last) {
    case '은':
      return hasBatchim(prev) && !NOT_NOUN_EUN.has(w) ? stem : null
    case '을':
      return hasBatchim(prev) ? stem : null
    case '이':
      return hasBatchim(prev) && !NOT_PARTICLE_I.has(w) ? stem : null
    case '는':
      if (hasBatchim(prev)) return null
      if (/(하|되|어지|아지|해지|여지|시키|드리)는$/.test(w) || VERB_NEUN.has(w)) return null
      // 한국에서는·집에는: 곳·때를 가리키는 말이라 「무엇의 숫자」가 아니다
      if (/(에서|에게|에|으로|로|부터|까지)는$/.test(w)) return null
      return stem
    case '를':
      return hasBatchim(prev) ? null : stem
    case '가':
      return hasBatchim(prev) || NOUN_GA.has(w) ? null : stem
    case '의':
      return NOUN_UI.has(w) ? null : stem
    default:
      return null
  }
}

/** 막대 이름표에서 떼는 조사(로·에·도·와·과·랑·만 까지). 붙어 있지 않으면 그대로 돌려준다. */
export function stripParticle(word: string): string {
  const w = word.replace(TRAILING_PUNCT, '')
  const marked = markedNoun(w)
  if (marked !== null) return marked
  const m = w.match(/^(.{1,}?)(으로|이랑|에서|에게|하고|로|에|도|와|과|랑|만|씩)$/)
  if (!m) return w
  const [, stem, particle] = m
  const prev = stem[stem.length - 1]
  if (!HANGUL_SYLLABLE.test(prev)) return stem
  // 받침 규칙: 으로·과·이랑은 받침 뒤, 로·와·랑은 받침 없는 글자(로는 ㄹ 받침도) 뒤
  if ((particle === '으로' || particle === '과' || particle === '이랑') && !hasBatchim(prev)) return w
  if ((particle === '와' || particle === '랑') && hasBatchim(prev)) return w
  if (particle === '로' && hasBatchim(prev) && (prev.charCodeAt(0) - 0xac00) % 28 !== 8) return w
  // 「과」「로」로 끝나는 이름(결과·성과, 도로·프로)은 그대로 둔다
  if (particle === '과' && /(결과|성과|학과|경과|통과|안과|전과|공과|인과|교과|일과|불과|한과)$/.test(w)) return w
  if (particle === '로' && /(도로|피로|세로|가로|바로|새로|따로|서로|대로|미로|프로|제로|위로|별로|스스로|함부로|제대로|그대로|차로|회로|수로|활로|진로|기로)$/.test(w)) return w
  // 「도」「만」「에」「씩」으로 끝나는 이름(온도·속도·제도, 불만·비만, 무게·가게)은 그대로 둔다
  if (particle === '도' && /(온도|속도|제도|지도|태도|각도|밀도|습도|강도|빈도|한도|연도|년도|농도|용도|의도|시도|구도|반도|정도|인도|수도|진도|난이도|만족도|완성도)$/.test(w)) return w
  if (particle === '만' && /(불만|비만|자만|교만|태만|충만|낭만|수만|기만)$/.test(w)) return w
  if (particle === '에' || particle === '씩') return stem.length >= 1 ? stem : w
  return stem.length >= 1 ? stem : w
}

/** 문장을 끝맺거나 잇는 풀이말의 끝(…합니다·…하면·…지만) */
const VERB_END =
  /(습니다|니다|어요|아요|해요|예요|에요|세요|네요|군요|는데요|거든요|잖아요|이다|한다|된다|있다|없다|했다|됐다|였다|이었다|하면|되면|으면|이면|면서|지만|는데|은데|인데|어서|아서|해서|니까|다가|거나|려고|도록|하고|되고|이고|하며|되며|이며|해도|어도|아도|하는|되는|있는|없는|같은|하던|되던|했던|됐던|었던|았던)$/

/**
 * 조사도 풀이말 끝도 아닌 맨 이름처럼 보이는가(월급·직원·생활비). 두 글자 이상만.
 * 「남는」(받침 뒤의 는)·「모은」(받침 없는 글자 뒤의 은)은 풀이말로 본다.
 */
export function looksBareNoun(word: string): boolean {
  const w = word.replace(TRAILING_PUNCT, '')
  if (w.length < 2 || /\d/.test(w)) return false
  if (!/^[가-힣A-Za-z·&-]+$/.test(w)) return false
  if (markedNoun(w) !== null) return false
  if (VERB_END.test(w)) return false
  const last = w[w.length - 1]
  const prev = w[w.length - 2]
  if (HANGUL_SYLLABLE.test(prev)) {
    if (last === '는' && hasBatchim(prev)) return false
    if (last === '은' && !hasBatchim(prev)) return false
    if (last === '을' && !hasBatchim(prev) && w !== '가을' && w !== '마을' && w !== '노을') return false
  }
  return true
}
