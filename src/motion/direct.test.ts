import { describe, expect, it } from 'vitest'
import { scriptToWords } from '../captions/segment'
import { direct, splitSentences } from './direct'
import type { Graphic } from './types'

const timed = (script: string, seconds = 20) => scriptToWords(script, seconds)
const kinds = (graphics: Graphic[]) => graphics.map((g) => g.kind)
const byKind = <K extends Graphic['kind']>(graphics: Graphic[], kind: K) =>
  graphics.filter((g): g is Extract<Graphic, { kind: K }> => g.kind === kind)

describe('splitSentences', () => {
  it('문장 부호와 줄바꿈에서 나눈다', () => {
    const words = timed('Hello there. How are you?\nFine thanks')
    expect(splitSentences(words).map((s) => s.text)).toEqual(['Hello there.', 'How are you?', 'Fine thanks'])
  })
})

describe('direct', () => {
  it('말 전체에 자막을 깔고, 첫 문장으로 제목을 만든다', () => {
    const graphics = direct(timed('Three habits that changed my mornings.\nLet me show you.'))
    expect(kinds(graphics)).toContain('captions')
    const [title] = byKind(graphics, 'title')
    expect(title.text).toBe('Three habits that changed my mornings.')
    expect(title.end - title.start).toBeGreaterThanOrEqual(2.4)
  })

  it('자기소개에서 이름 띠를 만든다', () => {
    const [lower] = byKind(direct(timed("Hi, I'm Mina Park, a product designer.\nToday we talk color.")), 'lowerThird')
    expect(lower).toMatchObject({ name: 'Mina Park', role: 'product designer' })
    const [ko] = byKind(direct(timed('안녕하세요 저는 김하늘입니다.\n오늘은 색 이야기를 해요.')), 'lowerThird')
    expect(ko.name).toBe('김하늘')
    const [ja] = byKind(direct(timed('こんにちは 私は田中です。\n今日は色の話です。')), 'lowerThird')
    expect(ja.name).toBe('田中')
  })

  it('자연스러운 자기소개도 알아본다(…이서연이라고 합니다 · …と申します), 하는 일은 짧게', () => {
    const lower = (script: string) => byKind(direct(timed(script, 12)), 'lowerThird')[0]
    expect(lower('안녕하세요, 카페를 운영하고 있는 이서연이라고 합니다.\n오늘은 가게 이야기를 해요.')).toMatchObject({ name: '이서연', role: '카페 운영' })
    expect(lower('안녕하세요 요리 유튜버 박미나입니다.\n오늘은 볶음밥이에요.')).toMatchObject({ name: '박미나', role: '요리 유튜버' })
    expect(lower('저는 프로덕트 디자이너 김하늘입니다.\n색 이야기를 해요.')).toMatchObject({ name: '김하늘', role: '프로덕트 디자이너' })
    expect(lower('こんにちは、パン屋を経営している田中美咲と申します。\n今日はお店の話です。')).toMatchObject({ name: '田中美咲', role: 'パン屋経営' })
    expect(lower("Hi, my name is Daniel Kim and I'm a product designer at a small startup.\nLet's talk color.")).toMatchObject({ name: 'Daniel Kim', role: 'product designer at a small startup' })
  })

  it('직업·흔한 낱말을 이름으로 잘못 알지 않는다', () => {
    for (const script of ['저는 대학생입니다.\n오늘은 공부 이야기예요.', '저는 프로덕트 디자이너입니다.\n색 이야기를 해요.', '안녕하세요 유튜버입니다.\n시작할게요.', '私は学生です。\n今日は勉強の話です。', '오늘은 정말 좋은 날입니다.\n시작할게요.']) {
      expect(byKind(direct(timed(script, 10)), 'lowerThird'), script).toHaveLength(0)
    }
  })

  it('숫자 하나는 큰 숫자로, 여러 개는 막대 차트로 만든다', () => {
    const graphics = direct(timed('Intro line here.\nOur revenue grew 42% last year.\nApple 30%, Banana 50%, Cherry 20%.', 30))
    const [stat] = byKind(graphics, 'stat')
    expect(stat).toMatchObject({ value: 42, suffix: '%' })
    expect(stat.label).toBe('Our revenue grew last year')
    const [bars] = byKind(graphics, 'bars')
    expect(bars.items.map((item) => item.label)).toEqual(['Apple', 'Banana', 'Cherry'])
    expect(bars.unit).toBe('%')
  })

  it('단위가 다른 숫자끼리는 차트로 묶지 않고, 가장 눈에 띄는 숫자 하나를 고른다', () => {
    const graphics = direct(timed('Out of 1,400 people polled before the 2010 election, support grew by 8% since 2008.', 12))
    expect(byKind(graphics, 'bars')).toHaveLength(0)
    expect(byKind(graphics, 'stat')[0]).toMatchObject({ value: 8, suffix: '%' })
  })

  it('숫자 뒤에 이름이 오는 영어 문장은 뒤 낱말을 막대 이름표로 쓴다 — 쉼표·and 로 나란히 놓였을 때만', () => {
    const [bars] = byKind(direct(timed('Intro here.\nWe sold 30 apples, 50 bananas and 20 cherries.', 14)), 'bars')
    expect(bars.items.map((item) => item.label)).toEqual(['apples', 'bananas', 'cherries'])
    // 나란히 놓이지 않은 숫자(70 runs in 41 balls …)는 차트가 아니라 숫자 하나
    const cricket = direct(timed('Intro here.\nHe made 70 runs in just 41 balls by hitting 11 fours and 2 sixes.', 14))
    expect(byKind(cricket, 'bars')).toHaveLength(0)
    expect(byKind(cricket, 'stat')[0]).toMatchObject({ value: 70, label: 'runs' })
    // 단위가 다른 것(40 miles · 3 years)도 묶지 않는다
    const lanes = direct(timed('Intro here.\nThe plan adds 40 miles of protected lanes over the next 3 years.', 14))
    expect(byKind(lanes, 'bars')).toHaveLength(0)
    expect(byKind(lanes, 'stat')[0]).toMatchObject({ value: 40, label: 'miles of protected lanes' })
  })

  it('이름표가 뜻 없는 낱말(때·중 등)뿐이면 차트 대신 숫자 하나로 만든다', () => {
    const graphics = direct(timed('제목 문장입니다.\n집에 충돌했을 때 3명이 안에 있었지만 그들 중 1명도 다치지 않았다.', 12))
    expect(byKind(graphics, 'bars')).toHaveLength(0)
    const [stat] = byKind(graphics, 'stat')
    expect(stat).toMatchObject({ value: 3, suffix: '명' })
    expect(stat.label).toBe('집에 충돌했을 때')
  })

  it('일본어 숫자 설명은 숫자가 세는 것(7000の島々 → 島々)', () => {
    const graphics = direct(timed('日本には約7000の島々があり、その最大は本州です。', 10))
    expect(byKind(graphics, 'stat')[0]).toMatchObject({ value: 7000, label: '島々' })
  })

  it('숫자 설명에 깨진 문장을 쓰지 않는다(평범한 대본에서 잰 문장들)', () => {
    const stat = (script: string) => byKind(direct(timed(`머리말입니다.\n${script}`, 14)), 'stat')[0]
    expect(stat('가격은 12만 9천 원인데 저는 만족합니다.')).toMatchObject({ value: 12.9, suffix: '만 원', decimals: 1, label: '가격' })
    expect(stat('배터리는 한 번 충전하면 8시간 정도 가고요.')).toMatchObject({ value: 8, suffix: '시간', label: '배터리' })
    expect(stat('한국은행이 기준금리를 0.25%포인트 내렸습니다.')).toMatchObject({ value: 0.25, suffix: '%p', label: '한국은행이 기준금리를 내렸습니다' })
    // 여러 숫자 가운데 사람 수(200명)를 기간(1년)보다 먼저
    expect(stat('처음 1년은 정말 힘들었는데 지금은 단골손님이 하루 200명 정도 오세요.')).toMatchObject({ value: 200, suffix: '명', label: '단골손님' })
    const en = byKind(direct(timed("Intro line.\nFor 349 dollars, I think it's worth it.", 10)), 'stat')[0]
    expect(en).toMatchObject({ value: 349, prefix: '$', suffix: '', label: '' })
  })

  it('「A에서 B로」「from A to B」는 바뀐 것으로 보여 준다(앞 숫자만 크게 띄우지 않는다)', () => {
    const stat = (script: string) => byKind(direct(timed(`Intro line here.\n${script}`, 12)), 'stat')[0]
    expect(stat('I cut my subscriptions from 9 down to 3.')).toMatchObject({ value: 3, prefix: '9 → ', suffix: '', label: 'I cut my subscriptions' })
    expect(stat('매출이 100만 원에서 500만 원으로 늘었어요.')).toMatchObject({ value: 500, prefix: '100 → ', suffix: '만 원', label: '매출' })
    expect(stat('체중을 80kg에서 65kg으로 줄였어요.')).toMatchObject({ value: 65, prefix: '80 → ', suffix: 'kg', label: '체중' })
    expect(stat('体重は80kgから65kgになりました。')).toMatchObject({ value: 65, prefix: '80 → ', suffix: 'kg', label: '体重' })
    expect(stat('Conversion went from 3% to 12% in a month.')).toMatchObject({ value: 12, prefix: '3 → ', suffix: '%' })
    // 값이 큰 수는 자릿수 쉼표를 넣는다
    expect(stat('구독자가 1,200명에서 15,000명으로 늘었어요.')).toMatchObject({ value: 15000, prefix: '1,200 → ', suffix: '명', label: '구독자' })
  })

  it('한 문장에 「…는 이렇게 말했습니다」와 따옴표가 함께 있으면 따옴표 속 말이 인용이다', () => {
    const [quote] = byKind(direct(timed('はじめに。\nイチローはこう言いました。「小さいことを積み重ねるのが道」。今日一日だけ、続けてみましょう。', 14)), 'quote')
    expect(quote).toMatchObject({ text: '小さいことを積み重ねるのが道', author: 'イチロー' })
  })

  it('첫 문장을 숫자·목록이 썼으면 둘째 문장을 제목으로 끌어오지 않는다(자기소개 뒤는 끌어온다)', () => {
    const cooking = direct(timed('오늘은 5분 만에 만드는 계란 볶음밥이에요.\n팬에 기름 두르고 파를 먼저 볶아 주세요.\n계란 두 개를 풀어서 넣어요.', 12))
    expect(byKind(cooking, 'title')).toHaveLength(0)
    const intro = direct(timed("Hi, I'm Mina Park, a product designer.\nToday we talk color.", 10))
    expect(byKind(intro, 'title')[0].text).toBe('Today we talk color.')
  })

  it('인사 뒤의 「○○입니다」가 이야깃거리일 때는 이름으로 읽지 않는다', () => {
    for (const script of ['안녕하세요 오늘은 금요일입니다.\n시작할게요.', '안녕하세요 오늘의 주제는 선물입니다.\n시작할게요.', '안녕하세요 이번 영상은 신제품입니다.\n시작할게요.', '저는 한의사입니다.\n시작할게요.', '저는 유학생이에요.\n시작할게요.']) {
      expect(byKind(direct(timed(script, 10)), 'lowerThird'), script).toHaveLength(0)
    }
  })

  it('한국어·일본어도 같은 단위가 쉼표로 나란히 놓이면 차트로 만든다', () => {
    const [ko] = byKind(direct(timed('머리말입니다.\n월세랑 고정비로 120만 원, 생활비 80만 원, 그리고 저축은 85만 원씩 자동이체 하세요.', 14)), 'bars')
    expect(ko.unit).toBe('만 원')
    expect(ko.items).toEqual([
      { label: '고정비', value: 120 },
      { label: '생활비', value: 80 },
      { label: '저축', value: 85 },
    ])
    const [ja] = byKind(direct(timed('はじめに。\n家賃と固定費で11万円、生活費は6万円、貯金は毎月8万円を先に分けます。', 14)), 'bars')
    expect(ja.unit).toBe('万円')
    expect(ja.items.map((item) => item.label)).toEqual(['家賃と固定費', '生活費', '貯金'])
    // 나란히 놓이지 않은 같은 단위(월급 300만 원 … 1,000만 원 모으는)는 차트가 아니다
    const money = direct(timed('머리말입니다.\n월급 300만 원 받는 직장인이 1년에 1,000만 원 모으는 방법 알려드릴게요.', 14))
    expect(byKind(money, 'bars')).toHaveLength(0)
    expect(byKind(money, 'stat')[0]).toMatchObject({ value: 300, suffix: '만 원', label: '월급' })
  })

  it('첫째·둘째처럼 이어지는 말을 목록으로 만든다', () => {
    const graphics = direct(timed('Here is my routine.\nFirst, drink water.\nSecond, stretch for five minutes.\nThird, plan the day.', 24))
    const [list] = byKind(graphics, 'list')
    expect(list.items).toEqual(['drink water', 'stretch for five minutes', 'plan the day'])
    expect(list.itemTimes).toHaveLength(3)
    const ko = byKind(direct(timed('제 아침 루틴이에요.\n첫째, 물 마시기.\n둘째, 스트레칭.', 18)), 'list')[0]
    expect(ko.items).toEqual(['물 마시기', '스트레칭'])
  })

  it('순서를 알리는 말(먼저·그다음·마지막으로 / Start by·Then·And finally / まず·次に·最後に)도 목록으로 만든다', () => {
    const ko = byKind(direct(timed('시험 기간에 꼭 지켜야 할 게 있어요.\n먼저 계획을 너무 빡빡하게 세우지 마세요.\n그다음에 오십 분 공부하고 십 분은 꼭 쉬세요.\n마지막으로 잠은 최소 여섯 시간은 자야 해요.', 20)), 'list')[0]
    expect(ko.items).toEqual(['계획을 너무 빡빡하게 세우지 마세요', '오십 분 공부하고 십 분은 꼭 쉬세요', '잠은 최소 여섯 시간은 자야 해요'])
    expect(ko.title).toBe('시험 기간에 꼭 지켜야 할 게 있어요')
    const en = direct(timed('If you want to learn a language faster, stop memorizing word lists.\nStart by listening to real conversations every day.\nThen try to speak, even if you make mistakes.\nAnd finally, write a few sentences before bed.', 20))
    expect(byKind(en, 'list')[0].items).toEqual(['listening to real conversations every day', 'try to speak, even if you make mistakes', 'write a few sentences before bed'])
    // 머리글로 쓰기에 긴 앞 문장은 목록에 욱여넣지 않고 제목으로 쓴다(쉼표에서 끊어서)
    expect(byKind(en, 'list')[0].title).toBe('')
    expect(byKind(en, 'title')[0].text).toBe('If you want to learn a language faster')
    const ja = byKind(direct(timed('資格試験に一発で受かるコツを話します。\nまず、過去問から始めてください。\n次に、間違えた問題だけをノートにまとめます。\n最後に、試験の一週間前は新しいことをやらないでください。', 20)), 'list')[0]
    expect(ja.items).toHaveLength(3)
    expect(ja.items[0]).toBe('過去問から始めてください')
  })

  it('「Next week」「Last year」처럼 순서 말이 아닌 것은 목록으로 만들지 않는다', () => {
    const graphics = direct(timed('We changed a lot.\nLast year we moved to a new office.\nNext week we launch the app.', 12))
    expect(byKind(graphics, 'list')).toHaveLength(0)
  })

  it('따옴표가 없어도 누가 한 말인지 알리는 문장이면 인용으로 만든다', () => {
    const ko = byKind(direct(timed('성공한 사람들은 재능이 뛰어난 게 아니에요.\n스티브 잡스는 이렇게 말했죠.\n계속 갈망하고 우직하게 나아가라.\n오늘 하루만 더 해 보세요.', 16)), 'quote')[0]
    expect(ko).toMatchObject({ text: '계속 갈망하고 우직하게 나아가라', author: '스티브 잡스' })
    const en = byKind(direct(timed('Nobody is coming to save you.\nAs Maya Angelou said, nothing will work unless you do.\nSo start today.', 12)), 'quote')[0]
    expect(en).toMatchObject({ text: 'nothing will work unless you do', author: 'Maya Angelou' })
    const ja = byKind(direct(timed('成功する人は才能があるわけではありません。\nイチローはこう言いました。\n「小さいことを積み重ねるのが、とんでもないところへ行くただひとつの道」。', 14)), 'quote')[0]
    expect(ja).toMatchObject({ text: '小さいことを積み重ねるのが、とんでもないところへ行くただひとつの道', author: 'イチロー' })
    const saying = byKind(direct(timed('오늘은 짧게 말할게요.\n시작이 반이라는 말이 있죠.\n일단 해 보세요.', 10)), 'quote')[0]
    expect(saying).toMatchObject({ text: '시작이 반', author: '' })
    // 「He said …」처럼 누구인지 모르는 말은 인용으로 만들지 않는다
    expect(byKind(direct(timed('We talked for an hour.\nHe said it would be fine by tomorrow.', 8)), 'quote')).toHaveLength(0)
  })

  it('긴 첫 문장을 제목으로 쓸 때 낱말 가운데서 자르지 않는다', () => {
    const long = "So I've been using this standing desk for about three months now and it changed how I work every single day."
    const [title] = byKind(direct(timed(`${long}\nLet me explain.`, 12)), 'title')
    expect([...title.text].length).toBeLessThanOrEqual(60)
    expect(title.text.endsWith('…')).toBe(true)
    // … 앞은 원문의 낱말이 끝나는 곳이다
    const kept = title.text.slice(0, -1)
    expect(long.startsWith(kept)).toBe(true)
    expect(long[kept.length]).toBe(' ')
  })

  it('숫자가 든 문장은 바로 뒤에 목록이 와도 목록 머리글로 쓰지 않는다', () => {
    const graphics = direct(timed('Big intro.\nMost people sleep 37% faster.\nFirst, no screens.\nSecond, same wake time.', 20))
    expect(byKind(graphics, 'stat')).toHaveLength(1)
    expect(byKind(graphics, 'list')[0].title).toBe('')
  })

  it('따옴표 속 말은 인용으로 만든다', () => {
    const [quote] = byKind(direct(timed('My mentor said "done is better than perfect" and it stuck.', 10)), 'quote')
    expect(quote.text).toBe('done is better than perfect')
  })

  it('일본어 대본을 낱말마다 띄어 적어도(자막 끊는 자리) 그래픽의 글은 붙여 적는다', () => {
    const graphics = direct(timed('よく眠れる三つの習慣。\nこんにちは 私は田中です。\n多くの人が 37% 早く 眠れます。\nまず、10時以降は 画面を 見ない。\n次に、同じ 時間に 起きる。', 14))
    expect(byKind(graphics, 'stat')[0].label).toBe('多くの人が早く眠れます')
    expect(byKind(graphics, 'list')[0].items).toEqual(['10時以降は画面を見ない', '同じ時間に起きる'])
    expect(byKind(graphics, 'lowerThird')[0].name).toBe('田中')
    // 한국어·영어의 빈칸은 그대로다
    expect(byKind(direct(timed('제 아침 루틴이에요.\n첫째, 물 마시기.\n둘째, 스트레칭 하기.', 12)), 'list')[0].items).toEqual(['물 마시기', '스트레칭 하기'])
  })

  it('화면 가운데 그래픽은 서로 겹치지 않는다', () => {
    const graphics = direct(timed('Big news today.\nWe grew 40%.\nAnd 3x more users.\nFirst, focus.\nSecond, ship.', 12))
    const center = graphics.filter((g) => ['title', 'stat', 'bars', 'list', 'quote'].includes(g.kind)).sort((a, b) => a.start - b.start)
    for (let i = 1; i < center.length; i++) expect(center[i].start).toBeGreaterThanOrEqual(center[i - 1].end - 1e-9)
    for (const g of graphics) expect(g.end).toBeGreaterThan(g.start)
  })

  it('말이 없으면 아무것도 만들지 않는다', () => {
    expect(direct([])).toEqual([])
  })
})
