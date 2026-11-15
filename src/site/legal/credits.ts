import type { Lang } from '../../langs'

/**
 * 「오픈소스 라이선스」 쪽(/licenses)에 적는 것: 글꼴·받아쓰기 모델·예시 영상·주요 프로그램과 그 사용 허가.
 * 사이트에 들어간 모든 프로그램의 사용 허가 전문은 빌드할 때 /licenses.txt 로 만든다(vite.config.ts 의 thirdPartyNotices).
 * credits.test.ts 가 package.json 의 의존성이 모두 여기 있는지, 사용 허가가 설치된 판과 같은지 확인한다.
 */
export type Credit = { name: string; license: string; url: string; packages: string[] }

/** 영상에 들어가는 글꼴(모두 SIL Open Font License 1.1 — 상업 영상에 쓸 수 있다). */
export const FONT_CREDITS: (Credit & { copyright: string })[] = [
  { name: 'DM Sans', license: 'OFL-1.1', copyright: 'Copyright 2014 The DM Sans Project Authors', url: 'https://github.com/googlefonts/dm-fonts', packages: ['@fontsource-variable/dm-sans'] },
  {
    name: 'Instrument Serif',
    license: 'OFL-1.1',
    copyright: 'Copyright 2022 The Instrument Serif Project Authors',
    url: 'https://github.com/Instrument/instrument-serif',
    packages: ['@fontsource/instrument-serif'],
  },
  { name: 'Black Han Sans', license: 'OFL-1.1', copyright: 'Copyright 2015 The Black Han Sans Project Authors', url: 'https://github.com/zesstype/Black-Han-Sans', packages: ['@fontsource/black-han-sans'] },
  { name: 'Dela Gothic One', license: 'OFL-1.1', copyright: 'Copyright 2020 The Dela Gothic Project Authors', url: 'https://github.com/syakuzen/DelaGothic', packages: ['@fontsource/dela-gothic-one'] },
  {
    name: 'Pretendard JP',
    license: 'OFL-1.1',
    copyright: 'Copyright (c) 2021, Kil Hyung-jin, with Reserved Font Name Pretendard',
    url: 'https://github.com/orioncactus/pretendard',
    packages: ['pretendard-jp'],
  },
]

/** AI 모델: 받아쓰기와 말로 고치기. where: 회사 서버(server/asr · deploy/compose.yml 의 assist) 또는 이용자의 브라우저(src/speech/transcribe.ts). */
export const MODEL_CREDITS: (Credit & { by: string; where: 'server' | 'browser'; id: string })[] = [
  { name: 'Qwen3-ASR-0.6B', by: 'Qwen, Alibaba Cloud', license: 'Apache-2.0', where: 'server', id: 'Qwen/Qwen3-ASR-0.6B', url: 'https://huggingface.co/Qwen/Qwen3-ASR-0.6B', packages: [] },
  {
    name: 'Qwen3-ForcedAligner-0.6B',
    by: 'Qwen, Alibaba Cloud',
    license: 'Apache-2.0',
    where: 'server',
    id: 'Qwen/Qwen3-ForcedAligner-0.6B',
    url: 'https://huggingface.co/Qwen/Qwen3-ForcedAligner-0.6B',
    packages: [],
  },
  {
    name: 'Qwen3-4B-Instruct-2507',
    by: 'Qwen, Alibaba Cloud · llama.cpp',
    license: 'Apache-2.0',
    where: 'server',
    id: 'unsloth/Qwen3-4B-Instruct-2507-GGUF',
    url: 'https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507',
    packages: [],
  },
  { name: 'Whisper small', by: 'OpenAI', license: 'Apache-2.0', where: 'browser', id: 'onnx-community/whisper-small_timestamped', url: 'https://huggingface.co/openai/whisper-small', packages: [] },
  {
    name: 'Whisper large-v3-turbo',
    by: 'OpenAI',
    license: 'MIT',
    where: 'browser',
    id: 'onnx-community/whisper-large-v3-turbo_timestamped',
    url: 'https://huggingface.co/openai/whisper-large-v3-turbo',
    packages: [],
  },
]

/** 브라우저로 내려가는 주요 프로그램. MPL-2.0 인 Mediabunny 는 사용 허가에 따라 소스 코드가 있는 곳을 알린다. */
export const PROGRAM_CREDITS: (Credit & { source?: string })[] = [
  { name: 'React', license: 'MIT', url: 'https://react.dev', packages: ['react', 'react-dom'] },
  { name: 'React Router', license: 'MIT', url: 'https://reactrouter.com', packages: ['react-router'] },
  { name: 'Motion', license: 'MIT', url: 'https://motion.dev', packages: ['motion'] },
  { name: 'Lucide', license: 'ISC', url: 'https://lucide.dev', packages: ['lucide-react'] },
  { name: 'Mediabunny', license: 'MPL-2.0', url: 'https://mediabunny.dev', source: 'https://github.com/Vanilagy/mediabunny', packages: ['mediabunny'] },
  { name: 'Transformers.js', license: 'Apache-2.0', url: 'https://github.com/huggingface/transformers.js', packages: ['@huggingface/transformers'] },
  { name: 'ONNX Runtime Web', license: 'MIT', url: 'https://github.com/microsoft/onnxruntime', packages: ['onnxruntime-web'] },
]

export const VIDEO_LICENSE = { name: 'Mixkit Stock Video Free License', url: 'https://mixkit.co/license/#videoFree' }

export const LICENSES_UI: Record<
  Lang,
  { title: string; description: string; intro: string; fonts: string; models: string; videos: string; videosBody: string; programs: string; full: string; fullBody: string; server: string; browser: string; source: string }
> = {
  ko: {
    title: '오픈소스 라이선스',
    description: 'ReelMotion 이 쓰는 글꼴, 받아쓰기 모델, 예시 영상, 공개 프로그램과 그 사용 허가입니다.',
    intro: 'ReelMotion 은 아래 글꼴·모델·영상·공개 프로그램을 각 사용 허가에 따라 씁니다. 만든 분들께 감사드립니다.',
    fonts: '글꼴',
    models: 'AI 모델(받아쓰기·말로 고치기)',
    videos: '예시 영상',
    videosBody: '소개 페이지와 편집기의 예시 영상 8개는 Mixkit 의 영상으로, 상업 이용이 가능하고 출처 표시가 필요 없는 사용 허가입니다. 원본 번호:',
    programs: '공개 프로그램',
    full: '사용 허가 전문',
    fullBody: '이 사이트에 들어 있는 모든 공개 프로그램의 이름·판·사용 허가 전문은 아래 파일에 있습니다.',
    server: '회사 서버',
    browser: '이용자의 브라우저',
    source: '소스 코드',
  },
  en: {
    title: 'Open-source licenses',
    description: 'The fonts, speech models, sample videos and open-source software ReelMotion uses, and their licenses.',
    intro: 'ReelMotion uses the fonts, models, videos and open-source software below under their licenses. Thank you to everyone who made them.',
    fonts: 'Fonts',
    models: 'AI models (speech and chat editing)',
    videos: 'Sample videos',
    videosBody: 'The eight sample clips on this site and in the editor come from Mixkit, under a license that allows commercial use without attribution. Original clip numbers:',
    programs: 'Open-source software',
    full: 'Full license texts',
    fullBody: 'The name, version and full license text of every open-source package bundled into this site are in the file below.',
    server: 'our server',
    browser: 'your browser',
    source: 'Source code',
  },
  ja: {
    title: 'オープンソースライセンス',
    description: 'ReelMotion が使うフォント、文字起こしモデル、サンプル動画、オープンソースソフトウェアとそのライセンスです。',
    intro: 'ReelMotion は、下記のフォント・モデル・動画・オープンソースソフトウェアを、それぞれのライセンスに従って使っています。作ってくださった皆さんに感謝します。',
    fonts: 'フォント',
    models: 'AI モデル(文字起こし・話して直す)',
    videos: 'サンプル動画',
    videosBody: 'このサイトとエディターの8本のサンプル動画は Mixkit のもので、商用利用ができ、クレジット表記が不要なライセンスです。元の番号:',
    programs: 'オープンソースソフトウェア',
    full: 'ライセンス全文',
    fullBody: 'このサイトに含まれるすべてのオープンソースパッケージの名前・バージョン・ライセンス全文は、下のファイルにあります。',
    server: '当社サーバー',
    browser: '利用者のブラウザ',
    source: 'ソースコード',
  },
}
