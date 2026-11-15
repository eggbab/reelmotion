import type { Lang } from '../langs'
import type { Graphic, ThemeId } from '../motion/types'

export type EditorCopy = {
  home: string
  untitled: string
  export: string
  exporting: string
  exportDone: string
  download: string
  exportFailed: string
  exportUnsupported: string
  cancel: string
  close: string
  start: { title: string; body: string; pick: string; drop: string; samples: string; privacy: string }
  tabs: { graphics: string; transcript: string }
  style: string
  themes: Record<ThemeId, string>
  play: string
  pause: string
  transcript: {
    listen: string
    language: string
    auto: string
    engine: string
    engineServer: string
    engineServerStarting: string
    engineStandard: string
    enginePrecise: string
    serverNote: string
    uploading: string
    serverListening: string
    busy: string
    tooLong: string
    firstTime: string
    noSpeech: string
    decoding: string
    download: string
    listening: string
    done: string
    noAudio: string
    failed: string
    scriptLabel: string
    scriptHint: string
    estimated: string
    make: string
    remake: string
    remakeHint: string
  }
  graphics: {
    empty: string
    add: string
    remove: string
    kinds: Record<Graphic['kind'], string>
    start: string
    end: string
    fields: {
      text: string
      emphasis: string
      none: string
      name: string
      role: string
      value: string
      prefix: string
      suffix: string
      decimals: string
      label: string
      title: string
      unit: string
      items: string
      itemsHint: string
      barsHint: string
      x: string
      y: string
      author: string
      captionsHint: string
    }
  }
  lanes: string[]
  sampleNote: string
}

export const EDITOR_COPY: Record<Lang, EditorCopy> = {
  en: {
    home: 'ReelMotion home',
    untitled: 'Untitled video',
    export: 'Export',
    exporting: 'Exporting… {n}%',
    exportDone: 'Your video is ready.',
    download: 'Download {ext}',
    exportFailed: 'The export stopped. Please try again.',
    exportUnsupported: 'This browser cannot make video files. Please use a recent Chrome, Edge or Safari on a computer.',
    cancel: 'Cancel',
    close: 'Close',
    start: {
      title: 'Add a video to start',
      body: 'Choose a video of someone talking. ReelMotion writes down the speech and places motion graphics on it.',
      pick: 'Choose a video',
      drop: 'or drop a file here',
      samples: 'Or try a sample clip',
      privacy: 'Your video stays in this browser.',
    },
    tabs: { graphics: 'Graphics', transcript: 'Transcript' },
    style: 'Style',
    themes: { clean: 'Clean', neon: 'Neon', bold: 'Bold', editorial: 'Editorial', seoul: 'Seoul', tokyo: 'Tokyo' },
    play: 'Play',
    pause: 'Pause',
    transcript: {
      listen: 'Transcribe speech',
      language: 'Spoken language',
      auto: 'Auto',
      engine: 'Transcribe with',
      engineServer: 'ReelMotion server (Qwen3-ASR)',
      engineServerStarting: 'ReelMotion server — starting…',
      engineStandard: 'This browser — fast',
      enginePrecise: 'This browser — accurate (slow)',
      serverNote: 'Only the sound is sent to the ReelMotion speech server to be written down, and it is not kept. Your video stays here.',
      uploading: 'Sending the sound…',
      serverListening: 'The server is listening…',
      busy: 'The speech server is busy. Try again in a moment, or transcribe in this browser.',
      tooLong: 'The speech server takes up to {min} minutes of audio. Transcribe in this browser instead.',
      firstTime: 'The first time downloads about {mb} MB. Your video never leaves this browser.',
      noSpeech: 'No speech was found. You can type the script below instead.',
      decoding: 'Reading the audio…',
      download: 'Downloading what is needed {n}%',
      listening: 'Listening… this can take about as long as the video.',
      done: '{n} words written down.',
      noAudio: 'This video has no sound. Type the script below instead.',
      failed: 'Transcription stopped. Please try again.',
      scriptLabel: 'What is said',
      scriptHint: 'Fix any word here — the timing stays. A new line starts a new caption.',
      estimated: 'These words were typed, not heard, so their timing is spread evenly over the video.',
      make: 'Make graphics',
      remake: 'Make graphics again',
      remakeHint: 'This replaces the current graphics.',
    },
    graphics: {
      empty: 'No graphics yet. Write down the speech and press “Make graphics”, or add one yourself.',
      add: 'Add',
      remove: 'Delete',
      kinds: { title: 'Title', lowerThird: 'Name tag', stat: 'Counter', bars: 'Chart', list: 'Checklist', callout: 'Pointer', quote: 'Quote', captions: 'Captions' },
      start: 'Starts (s)',
      end: 'Ends (s)',
      fields: {
        text: 'Text',
        emphasis: 'Highlighted word',
        none: 'None',
        name: 'Name',
        role: 'Role',
        value: 'Number',
        prefix: 'Before',
        suffix: 'After',
        decimals: 'Decimals',
        label: 'Label',
        title: 'Heading',
        unit: 'Unit',
        items: 'Items',
        itemsHint: 'One per line',
        barsHint: 'One per line: label, number',
        x: 'Across (%)',
        y: 'Down (%)',
        author: 'Who said it',
        captionsHint: 'Captions follow the transcript. Edit the words in the Transcript tab.',
      },
    },
    lanes: ['Titles', 'Names', 'Data', 'Captions'],
    sampleNote: 'Sample clips have no speech, so their script is typed.',
  },
  ko: {
    home: 'ReelMotion 처음으로',
    untitled: '제목 없는 영상',
    export: '내보내기',
    exporting: '내보내는 중… {n}%',
    exportDone: '영상이 준비됐어요.',
    download: '{ext} 내려받기',
    exportFailed: '내보내기가 멈췄어요. 다시 눌러 주세요.',
    exportUnsupported: '이 브라우저에서는 영상 파일을 만들 수 없어요. 컴퓨터의 최신 크롬·엣지·사파리에서 열어 주세요.',
    cancel: '그만두기',
    close: '닫기',
    start: {
      title: '영상을 넣어 시작하세요',
      body: '말하는 사람이 나오는 영상을 고르세요. ReelMotion이 말을 받아 적고 모션그래픽을 얹어요.',
      pick: '영상 고르기',
      drop: '또는 파일을 여기로 끌어 놓기',
      samples: '또는 예시 영상으로 해 보기',
      privacy: '영상은 이 브라우저 밖으로 나가지 않아요.',
    },
    tabs: { graphics: '그래픽', transcript: '받아쓴 말' },
    style: '스타일',
    themes: { clean: '클린', neon: '네온', bold: '볼드', editorial: '에디토리얼', seoul: '서울', tokyo: '도쿄' },
    play: '재생',
    pause: '멈춤',
    transcript: {
      listen: '말 받아쓰기',
      language: '말하는 언어',
      auto: '자동',
      engine: '받아쓰는 곳',
      engineServer: 'ReelMotion 서버 (Qwen3-ASR)',
      engineServerStarting: 'ReelMotion 서버 — 준비 중…',
      engineStandard: '이 브라우저 — 빠르게',
      enginePrecise: '이 브라우저 — 정확하게(느림)',
      serverNote: '소리만 ReelMotion 받아쓰기 서버로 보내 받아 적고, 서버에 남기지 않아요. 영상은 보내지 않아요.',
      uploading: '소리를 보내는 중…',
      serverListening: '서버가 듣는 중…',
      busy: '받아쓰기 서버가 바빠요. 잠시 뒤 다시 누르거나 이 브라우저에서 받아 적어 주세요.',
      tooLong: '받아쓰기 서버는 소리 {min}분까지 받아요. 이 브라우저에서 받아 적어 주세요.',
      firstTime: '처음 한 번 약 {mb}MB를 내려받아요. 영상은 이 브라우저 밖으로 나가지 않아요.',
      noSpeech: '말소리를 찾지 못했어요. 아래에 대본을 직접 적어도 돼요.',
      decoding: '소리를 읽는 중…',
      download: '필요한 파일을 내려받는 중 {n}%',
      listening: '듣는 중… 영상 길이만큼 걸릴 수 있어요.',
      done: '낱말 {n}개를 받아 적었어요.',
      noAudio: '이 영상에는 소리가 없어요. 아래에 대본을 적어 주세요.',
      failed: '받아쓰기가 멈췄어요. 다시 눌러 주세요.',
      scriptLabel: '말한 내용',
      scriptHint: '틀린 낱말은 여기서 고치세요 — 시간은 그대로예요. 줄을 바꾸면 자막도 거기서 끊겨요.',
      estimated: '들은 게 아니라 적은 말이라서, 시간은 영상 길이에 고르게 나눴어요.',
      make: '그래픽 만들기',
      remake: '그래픽 다시 만들기',
      remakeHint: '지금 있는 그래픽을 바꿔요.',
    },
    graphics: {
      empty: '아직 그래픽이 없어요. 말을 받아 적고 「그래픽 만들기」를 누르거나 직접 더해 보세요.',
      add: '더하기',
      remove: '지우기',
      kinds: { title: '제목', lowerThird: '이름표', stat: '숫자', bars: '차트', list: '목록', callout: '가리키기', quote: '인용', captions: '자막' },
      start: '시작(초)',
      end: '끝(초)',
      fields: {
        text: '글',
        emphasis: '강조할 낱말',
        none: '없음',
        name: '이름',
        role: '하는 일',
        value: '숫자',
        prefix: '앞에 붙일 것',
        suffix: '뒤에 붙일 것',
        decimals: '소수 자리',
        label: '설명',
        title: '머리글',
        unit: '단위',
        items: '항목',
        itemsHint: '한 줄에 하나씩',
        barsHint: '한 줄에 하나씩: 이름, 숫자',
        x: '가로(%)',
        y: '세로(%)',
        author: '말한 사람',
        captionsHint: '자막은 받아쓴 말을 따라가요. 낱말은 「받아쓴 말」 탭에서 고치세요.',
      },
    },
    lanes: ['제목', '이름표', '데이터', '자막'],
    sampleNote: '예시 영상에는 말소리가 없어서 대본을 적어 두었어요.',
  },
  ja: {
    home: 'ReelMotion ホーム',
    untitled: '無題の動画',
    export: '書き出し',
    exporting: '書き出し中… {n}%',
    exportDone: '動画の準備ができました。',
    download: '{ext} をダウンロード',
    exportFailed: '書き出しが止まりました。もう一度お試しください。',
    exportUnsupported: 'このブラウザでは動画ファイルを作れません。パソコンの最新の Chrome・Edge・Safari で開いてください。',
    cancel: 'やめる',
    close: '閉じる',
    start: {
      title: '動画を入れてはじめる',
      body: '人が話している動画を選んでください。ReelMotion が声を書き起こし、モーショングラフィックをのせます。',
      pick: '動画を選ぶ',
      drop: 'またはファイルをここにドロップ',
      samples: 'またはサンプル動画で試す',
      privacy: '動画はこのブラウザの外に出ません。',
    },
    tabs: { graphics: 'グラフィック', transcript: '書き起こし' },
    style: 'スタイル',
    themes: { clean: 'クリーン', neon: 'ネオン', bold: 'ボールド', editorial: 'エディトリアル', seoul: 'ソウル', tokyo: '東京' },
    play: '再生',
    pause: '一時停止',
    transcript: {
      listen: '声を書き起こす',
      language: '話している言語',
      auto: '自動',
      engine: '書き起こす場所',
      engineServer: 'ReelMotion サーバー(Qwen3-ASR)',
      engineServerStarting: 'ReelMotion サーバー — 準備中…',
      engineStandard: 'このブラウザ — 速い',
      enginePrecise: 'このブラウザ — 正確(遅い)',
      serverNote: '音声だけを ReelMotion の書き起こしサーバーに送り、サーバーには残しません。動画は送りません。',
      uploading: '音声を送っています…',
      serverListening: 'サーバーが聞き取り中…',
      busy: '書き起こしサーバーが混み合っています。少し待つか、このブラウザで書き起こしてください。',
      tooLong: '書き起こしサーバーは音声 {min} 分までです。このブラウザで書き起こしてください。',
      firstTime: '初回のみ約 {mb}MB をダウンロードします。動画はこのブラウザの外に出ません。',
      noSpeech: '話し声が見つかりませんでした。下に台本を入力してもかまいません。',
      decoding: '音声を読み込み中…',
      download: '必要なファイルをダウンロード中 {n}%',
      listening: '聞き取り中… 動画の長さくらいかかることがあります。',
      done: '{n}語を書き起こしました。',
      noAudio: 'この動画には音声がありません。下に台本を入力してください。',
      failed: '書き起こしが止まりました。もう一度お試しください。',
      scriptLabel: '話した内容',
      scriptHint: '間違った言葉はここで直せます — タイミングはそのまま。改行すると字幕もそこで切れます。',
      estimated: '聞き取ったのではなく入力した言葉なので、時間は動画の長さに均等に割り当てています。',
      make: 'グラフィックを作る',
      remake: 'グラフィックを作り直す',
      remakeHint: 'いまのグラフィックを置き換えます。',
    },
    graphics: {
      empty: 'まだグラフィックがありません。声を書き起こして「グラフィックを作る」を押すか、自分で追加してください。',
      add: '追加',
      remove: '削除',
      kinds: { title: 'タイトル', lowerThird: '名前', stat: '数字', bars: 'グラフ', list: 'リスト', callout: '指し示し', quote: '引用', captions: '字幕' },
      start: '開始(秒)',
      end: '終了(秒)',
      fields: {
        text: 'テキスト',
        emphasis: '強調する言葉',
        none: 'なし',
        name: '名前',
        role: '肩書き',
        value: '数字',
        prefix: '前につける',
        suffix: '後につける',
        decimals: '小数の桁',
        label: '説明',
        title: '見出し',
        unit: '単位',
        items: '項目',
        itemsHint: '1行に1つ',
        barsHint: '1行に1つ: 名前, 数字',
        x: '横(%)',
        y: '縦(%)',
        author: '話した人',
        captionsHint: '字幕は書き起こしに合わせて動きます。言葉は「書き起こし」タブで直してください。',
      },
    },
    lanes: ['タイトル', '名前', 'データ', '字幕'],
    sampleNote: 'サンプル動画には声がないため、台本を入力してあります。',
  },
}

/** 예시 영상에 미리 적어 둔 대본. 여러 그래픽이 골고루 나오도록 썼다. */
export const SAMPLE_SCRIPTS: Record<Lang, string> = {
  en: "Three habits for better sleep.\nHi, I'm Mina Park, a sleep researcher.\nMost people fall asleep 37% faster.\nFirst, no screens after ten.\nSecond, wake up at the same time.",
  ko: '잠이 잘 오는 세 가지 습관.\n안녕하세요 저는 박미나입니다.\n대부분 37% 더 빨리 잠들어요.\n첫째, 10시 뒤엔 화면 끄기.\n둘째, 같은 시간에 일어나기.',
  ja: 'よく眠れる三つの習慣。\nこんにちは 私は田中です。\n多くの人が 37% 早く 眠れます。\nまず、10時以降は 画面を 見ない。\n次に、同じ 時間に 起きる。',
}
