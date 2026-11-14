/** 화면 글자. 처음부터 세 언어로 둔다 — 알리는 순서는 한국 → 일본 → 영어권. */
export type Lang = 'ko' | 'ja' | 'en'

export const LANGS: { id: Lang; label: string }[] = [
  { id: 'ko', label: '한국어' },
  { id: 'ja', label: '日本語' },
  { id: 'en', label: 'English' },
]

type Messages = {
  tagline: string
  videoHeading: string
  pickVideo: string
  useSample: string
  videoError: string
  scriptHeading: string
  scriptHint: string
  timingNote: string
  styleHeading: string
  styleNames: Record<string, string>
  sampleScript: string
}

export const MESSAGES: Record<Lang, Messages> = {
  ko: {
    tagline: '영상에 한국 예능식 움직이는 자막을 얹습니다',
    videoHeading: '1. 영상',
    pickVideo: '영상 고르기',
    useSample: '예시 배경으로 보기',
    videoError: '이 브라우저에서 열 수 없는 영상입니다. 다른 파일을 골라 주세요.',
    scriptHeading: '2. 대본',
    scriptHint: '한 줄에 한 문장씩 적으면 줄이 바뀌는 곳에서 잠깐 쉽니다.',
    timingNote:
      '지금은 대본을 영상 길이에 맞춰 고르게 나눕니다. 말소리를 듣고 자동으로 맞추는 기능은 다음 단계입니다.',
    styleHeading: '3. 자막 디자인',
    styleNames: {
      'kr-yeneung': '예능 기본',
      'kr-talk': '핑크 수다',
      'kr-shout': '빨강 외침',
      'kr-info': '정보 박스',
    },
    sampleScript: '여러분 오늘은요\n진짜 대박 사건이 있었어요\n이게 말이 돼?\n끝까지 보면 알게 됩니다',
  },
  ja: {
    tagline: '動画に韓国バラエティ風の動くテロップをのせます',
    videoHeading: '1. 動画',
    pickVideo: '動画を選ぶ',
    useSample: 'サンプル背景で見る',
    videoError: 'このブラウザでは開けない動画です。別のファイルを選んでください。',
    scriptHeading: '2. 台本',
    scriptHint: '1行に1文ずつ書くと、改行のところで少し間を置きます。',
    timingNote:
      '今は台本を動画の長さに合わせて均等に割り当てます。音声を聞いて自動で合わせる機能は次の段階です。',
    styleHeading: '3. テロップデザイン',
    styleNames: {
      'kr-yeneung': 'バラエティ 基本',
      'kr-talk': 'ピンク トーク',
      'kr-shout': '赤 シャウト',
      'kr-info': '情報 ボックス',
    },
    sampleScript: 'みなさん 今日はですね\n本当に すごい ことが ありました\nこれ ありえる?\n最後まで 見れば わかります',
  },
  en: {
    tagline: 'Add Korean variety-show style animated captions to your video',
    videoHeading: '1. Video',
    pickVideo: 'Choose a video',
    useSample: 'Use the sample backdrop',
    videoError: 'This browser cannot open that video. Please choose another file.',
    scriptHeading: '2. Script',
    scriptHint: 'Write one sentence per line; captions pause briefly at each line break.',
    timingNote:
      'For now the script is spread evenly over the video length. Matching captions to the actual speech comes in the next step.',
    styleHeading: '3. Caption design',
    styleNames: {
      'kr-yeneung': 'Variety Basic',
      'kr-talk': 'Pink Chat',
      'kr-shout': 'Red Shout',
      'kr-info': 'Info Box',
    },
    sampleScript: 'Okay everyone, today\nsomething truly wild happened\nCan you believe this?\nWatch to the end to find out',
  },
}

export function detectLang(preferred: readonly string[]): Lang {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split('-')[0]
    if (base === 'ko' || base === 'ja' || base === 'en') return base
  }
  return 'en'
}
