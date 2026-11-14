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
  speechButton: string
  speechLanguage: string
  speechAuto: string
  speechQuality: string
  speechStandard: string
  speechPrecise: string
  speechFirstTime: string
  speechNeedsVideo: string
  speechDecoding: string
  speechDownload: string
  speechListening: string
  speechDone: string
  speechNoAudio: string
  speechEmpty: string
  speechFailed: string
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
    scriptHint: '틀린 글자는 여기서 바로 고치세요. 줄을 바꾸면 자막도 거기서 끊깁니다.',
    timingNote: '말소리를 듣고 만든 자막이 아니라서, 지금은 대본을 영상 길이에 고르게 나눠 보여 줍니다.',
    speechButton: '말소리로 자막 만들기',
    speechLanguage: '말하는 언어',
    speechAuto: '자동',
    speechQuality: '정확도',
    speechStandard: '보통 (빠름)',
    speechPrecise: '높음 (느림, 큰 내려받기)',
    speechFirstTime: '처음 한 번만 약 {megabytes}MB 를 내려받습니다. 영상과 소리는 이 컴퓨터 밖으로 나가지 않습니다.',
    speechNeedsVideo: '내 영상을 고르면 쓸 수 있습니다.',
    speechDecoding: '영상에서 소리를 꺼내는 중…',
    speechDownload: '준비물을 내려받는 중 {percent}%',
    speechListening: '말소리를 듣고 있습니다. 영상 길이만큼 걸릴 수 있습니다…',
    speechDone: '어절 {count}개를 받아 적었습니다.',
    speechNoAudio: '이 영상에서 소리를 찾지 못했습니다.',
    speechEmpty: '말소리를 찾지 못했습니다.',
    speechFailed: '자막을 만들지 못했습니다. 다시 눌러 주세요.',
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
    scriptHint: '間違った文字はここで直せます。改行するとテロップもそこで切れます。',
    timingNote: '音声から作ったテロップではないため、今は台本を動画の長さに均等に割り当てています。',
    speechButton: '音声からテロップを作る',
    speechLanguage: '話している言語',
    speechAuto: '自動',
    speechQuality: '精度',
    speechStandard: '標準 (速い)',
    speechPrecise: '高い (遅い、大きなダウンロード)',
    speechFirstTime: '初回のみ約{megabytes}MBをダウンロードします。動画と音声はこのパソコンの外に出ません。',
    speechNeedsVideo: '自分の動画を選ぶと使えます。',
    speechDecoding: '動画から音声を取り出しています…',
    speechDownload: '必要なファイルをダウンロード中 {percent}%',
    speechListening: '音声を聞いています。動画の長さくらいかかることがあります…',
    speechDone: '{count}語を書き起こしました。',
    speechNoAudio: 'この動画から音声が見つかりませんでした。',
    speechEmpty: '話し声が見つかりませんでした。',
    speechFailed: 'テロップを作れませんでした。もう一度押してください。',
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
    scriptHint: 'Fix any wrong words right here. A line break also breaks the caption there.',
    timingNote: 'These captions were not made from the speech, so the script is spread evenly over the video length.',
    speechButton: 'Make captions from speech',
    speechLanguage: 'Spoken language',
    speechAuto: 'Auto',
    speechQuality: 'Accuracy',
    speechStandard: 'Standard (fast)',
    speechPrecise: 'High (slow, large download)',
    speechFirstTime: 'Downloads about {megabytes}MB the first time only. Your video and audio never leave this computer.',
    speechNeedsVideo: 'Choose your own video to use this.',
    speechDecoding: 'Extracting audio from the video…',
    speechDownload: 'Downloading what is needed {percent}%',
    speechListening: 'Listening to the speech. This can take about as long as the video…',
    speechDone: 'Transcribed {count} words.',
    speechNoAudio: 'No audio was found in this video.',
    speechEmpty: 'No speech was found.',
    speechFailed: 'Could not make captions. Please try again.',
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

/** '{이름}' 자리에 값을 넣는다. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole))
}
