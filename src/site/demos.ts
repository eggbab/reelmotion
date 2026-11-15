import { scriptToWords } from '../captions/segment'
import type { ClipId } from '../media/clips'
import type { Lang } from '../langs'
import type { Graphic, ThemeId } from '../motion/types'

/**
 * 소개 페이지에서 실제 영상 위에 돌아가는 예시 구성. 그리는 코드는 제품(편집 화면·내보내기)과 같다.
 * 글은 언어마다 따로 둔다. 숫자·이름은 예시이고 실제 사람이나 통계가 아니다.
 */
type DemoText = {
  sleepTitle: string
  sleepName: string
  sleepRole: string
  sleepStat: string
  sleepListTitle: string
  sleepList: string[]
  sleepCaptions: string
  shortsTitle: string
  shortsStat: string
  shortsCaptions: string
  podName: string
  podRole: string
  podQuote: string
  podCaptions: string
  studioTitle: string
  studioBarsTitle: string
  studioBars: string[]
  studioCaptions: string
  classTitle: string
  classListTitle: string
  classList: string[]
  growName: string
  growRole: string
  growStat: string
  vlogCaptions: string
  vlogCallout: string
  storyQuote: string
  storyName: string
}

const TEXT: Record<Lang, DemoText> = {
  en: {
    sleepTitle: 'Three habits for better sleep',
    sleepName: 'Dr. Mina Park',
    sleepRole: 'Sleep researcher',
    sleepStat: 'fall asleep faster',
    sleepListTitle: 'Tonight, try this',
    sleepList: ['No screens after 10', 'Same wake-up time', 'Cool, dark room'],
    sleepCaptions: 'Most people fall asleep faster with just three small changes',
    shortsTitle: 'I tried the 5 AM club for a month',
    shortsStat: 'more done before noon',
    shortsCaptions: 'Okay so here is what actually happened',
    podName: 'Daniel Reyes',
    podRole: 'Host, Small Rooms podcast',
    podQuote: 'Start before you feel ready',
    podCaptions: 'Honestly the best advice I ever got was simple',
    studioTitle: 'Where my views come from',
    studioBarsTitle: 'Views by platform',
    studioBars: ['YouTube', 'Shorts', 'TikTok'],
    studioCaptions: 'Shorts brought in almost a third of everything',
    classTitle: 'How to write a strong essay',
    classListTitle: 'Three rules',
    classList: ['One clear claim', 'Evidence for every point', 'Cut what does not help'],
    growName: 'Sara Kim',
    growRole: 'Founder, Loop Studio',
    growStat: 'revenue growth this year',
    vlogCaptions: 'Wait you have to see this new setup',
    vlogCallout: 'New mic',
    storyQuote: 'Every song starts as a mistake',
    storyName: 'Marcus Lee',
  },
  ko: {
    sleepTitle: '잠이 잘 오는 세 가지 습관',
    sleepName: '박미나 박사',
    sleepRole: '수면 연구자',
    sleepStat: '더 빨리 잠들어요',
    sleepListTitle: '오늘 밤 해 보세요',
    sleepList: ['10시 뒤엔 화면 끄기', '같은 시간에 일어나기', '서늘하고 어두운 방'],
    sleepCaptions: '작은 습관 세 가지만 바꿔도 훨씬 빨리 잠들어요',
    shortsTitle: '한 달 동안 새벽 5시에 일어나 봤다',
    shortsStat: '오전에 끝낸 일',
    shortsCaptions: '그래서 실제로 무슨 일이 있었냐면요',
    podName: '정다니엘',
    podRole: '진행자 · 작은 방 팟캐스트',
    podQuote: '준비됐다고 느끼기 전에 시작하세요',
    podCaptions: '솔직히 제가 들은 최고의 조언은 단순했어요',
    studioTitle: '내 조회수는 어디서 올까',
    studioBarsTitle: '플랫폼별 조회수',
    studioBars: ['유튜브', '쇼츠', '틱톡'],
    studioCaptions: '쇼츠가 전체의 거의 3분의 1이었어요',
    classTitle: '좋은 글을 쓰는 방법',
    classListTitle: '세 가지 규칙',
    classList: ['주장은 하나만 분명하게', '모든 말에 근거를', '도움 안 되는 문장은 지우기'],
    growName: '김사라',
    growRole: '대표 · 루프 스튜디오',
    growStat: '올해 매출 성장',
    vlogCaptions: '잠깐만요 새로 바꾼 장비 좀 보세요',
    vlogCallout: '새 마이크',
    storyQuote: '모든 노래는 실수에서 시작돼요',
    storyName: '이마커스',
  },
  ja: {
    sleepTitle: 'よく眠れる三つの習慣',
    sleepName: 'パク・ミナ 博士',
    sleepRole: '睡眠研究者',
    sleepStat: '早く眠れるように',
    sleepListTitle: '今夜やってみよう',
    sleepList: ['10時以降は画面を見ない', '起きる時間をそろえる', '涼しく暗い部屋'],
    sleepCaptions: '小さな習慣を 三つ 変えるだけで ずっと 早く 眠れます',
    shortsTitle: '1か月 朝5時に起きてみた',
    shortsStat: '午前中に終わった仕事',
    shortsCaptions: 'それで 実際に 何が 起きたかと いうと',
    podName: 'ダニエル・レイエス',
    podRole: 'ポッドキャスト ホスト',
    podQuote: '準備ができたと思う前に始めよう',
    podCaptions: '正直 一番の アドバイスは シンプル でした',
    studioTitle: '再生数はどこから来る?',
    studioBarsTitle: 'プラットフォーム別 再生数',
    studioBars: ['YouTube', 'ショート', 'TikTok'],
    studioCaptions: 'ショートが 全体の ほぼ 3分の1 でした',
    classTitle: '良い文章の書き方',
    classListTitle: '三つのルール',
    classList: ['主張は一つだけ', 'すべてに根拠を', '役に立たない文は消す'],
    growName: 'キム・サラ',
    growRole: '代表・ループスタジオ',
    growStat: '今年の売上成長',
    vlogCaptions: 'ちょっと 新しい 機材を 見てください',
    vlogCallout: '新しいマイク',
    storyQuote: 'すべての歌は失敗から始まる',
    storyName: 'マーカス・リー',
  },
}

export type Demo = { clip: ClipId; theme: ThemeId; graphics: Graphic[] }

const captions = (id: string, text: string, start: number, end: number): Graphic => ({
  id,
  kind: 'captions',
  start,
  end,
  words: scriptToWords(text, end - start).map((word) => ({ ...word, start: word.start + start, end: word.end + start })),
})

export type DemoId = 'sleep' | 'shorts' | 'podcast' | 'studio' | 'classroom' | 'growth' | 'vlog' | 'story'

export function demo(id: DemoId, lang: Lang, theme?: ThemeId): Demo {
  const x = TEXT[lang]
  switch (id) {
    case 'sleep':
      return {
        clip: 'explainer',
        theme: theme ?? 'neon',
        graphics: [
          { id: 'a', kind: 'title', start: 0.2, end: 3.3, text: x.sleepTitle, emphasis: lang === 'en' ? 3 : undefined },
          { id: 'b', kind: 'lowerThird', start: 0.8, end: 4.4, name: x.sleepName, role: x.sleepRole },
          { id: 'c', kind: 'stat', start: 3.5, end: 6.6, value: 37, prefix: '', suffix: '%', decimals: 0, label: x.sleepStat },
          { id: 'd', kind: 'list', start: 6.7, end: 9.9, title: x.sleepListTitle, items: x.sleepList, itemTimes: [7.1, 7.8, 8.5] },
          captions('e', x.sleepCaptions, 4.6, 9.4),
        ],
      }
    case 'shorts':
      return {
        clip: 'shorts-a',
        theme: theme ?? (lang === 'ko' ? 'seoul' : lang === 'ja' ? 'tokyo' : 'bold'),
        graphics: [
          { id: 'a', kind: 'title', start: 0.2, end: 3.6, text: x.shortsTitle, emphasis: lang === 'en' ? 4 : undefined },
          { id: 'b', kind: 'stat', start: 3.8, end: 7, value: 2.5, prefix: '', suffix: 'x', decimals: 1, label: x.shortsStat },
          captions('c', x.shortsCaptions, 6.8, 9.8),
        ],
      }
    case 'podcast':
      return {
        clip: 'podcast-a',
        theme: theme ?? 'clean',
        graphics: [
          { id: 'a', kind: 'lowerThird', start: 0.4, end: 4.2, name: x.podName, role: x.podRole },
          captions('b', x.podCaptions, 0.6, 4.4),
          { id: 'c', kind: 'quote', start: 4.8, end: 9.6, text: x.podQuote, author: x.podName },
        ],
      }
    case 'studio':
      return {
        clip: 'studio',
        theme: theme ?? 'bold',
        graphics: [
          { id: 'a', kind: 'title', start: 0.2, end: 3.4, text: x.studioTitle, emphasis: lang === 'en' ? 3 : undefined },
          {
            id: 'b',
            kind: 'bars',
            start: 3.6,
            end: 9.6,
            title: x.studioBarsTitle,
            unit: '%',
            items: x.studioBars.map((label, i) => ({ label, value: [58, 31, 11][i] })),
          },
          captions('c', x.studioCaptions, 5.2, 9.4),
        ],
      }
    case 'classroom':
      return {
        clip: 'teacher',
        theme: theme ?? 'editorial',
        graphics: [
          { id: 'a', kind: 'title', start: 0.2, end: 3.6, text: x.classTitle, emphasis: lang === 'en' ? 5 : undefined },
          // 선생님이 가운데·왼쪽에 서 있어 목록은 오른쪽에(편집기의 얼굴 피하기와 같은 판단 — src/faces/track.ts)
          { id: 'b', kind: 'list', start: 3.8, end: 9.8, title: x.classListTitle, items: x.classList, itemTimes: [4.3, 5.4, 6.5], side: 'right' },
        ],
      }
    case 'growth':
      return {
        clip: 'podcast-b',
        theme: theme ?? 'neon',
        graphics: [
          { id: 'a', kind: 'lowerThird', start: 0.4, end: 4.6, name: x.growName, role: x.growRole },
          // 사람이 오른쪽에 앉아 있어 숫자는 왼쪽에(편집기의 얼굴 피하기와 같은 판단)
          { id: 'b', kind: 'stat', start: 4.4, end: 9.6, value: 182, prefix: '', suffix: '%', decimals: 0, label: x.growStat, side: 'left' },
        ],
      }
    case 'vlog':
      return {
        clip: 'shorts-b',
        theme: theme ?? 'neon',
        graphics: [
          captions('a', x.vlogCaptions, 0.3, 4.6),
          { id: 'b', kind: 'callout', start: 4.8, end: 9.6, text: x.vlogCallout, x: 0.32, y: 0.62 },
        ],
      }
    case 'story':
      return {
        clip: 'podcast-c',
        theme: theme ?? 'editorial',
        graphics: [{ id: 'a', kind: 'quote', start: 0.6, end: 9.4, text: x.storyQuote, author: x.storyName }],
      }
  }
}
