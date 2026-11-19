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
  /** 요금제 한도(결제를 붙인 뒤 켠다) */
  exportBlocked: { login: string; too_long: string; limit: string; loginButton: string; planButton: string }
  watermarkNote: string
  exportsLeft: string
  cancel: string
  close: string
  start: { title: string; body: string; pick: string; drop: string; samples: string; privacy: string; help: string; install: string }
  /** Claude·ChatGPT 커넥터가 만든 주소(?draft=)로 들어왔을 때 */
  draft: { title: string; body: string; gone: string; failed: string }
  /** 인터넷이 끊겼을 때 머리줄의 표시와 그 설명 */
  offline: string
  offlineHint: string
  tabs: { graphics: string; transcript: string; chat: string }
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
      /** 가로 영상에서 그래픽이 놓이는 쪽(src/faces/track.ts) */
      side: string
      left: string
      right: string
      sideHint: string
    }
  }
  lanes: string[]
  /** 타임라인 확대·축소 단추 이름과 눈금 줄 설명 */
  zoomIn: string
  zoomOut: string
  scrub: string
  /** 되돌리기·다시 하기 단추(src/editor/history.ts) */
  undo: string
  redo: string
  sampleNote: string
  /** 말로 고치기(assist.ts · server/app/assist.ts) */
  chat: {
    intro: string
    examples: string[]
    placeholder: string
    send: string
    thinking: string
    unavailable: string
    busy: string
    limited: string
    failed: string
    partial: string
    undo: string
    undone: string
    note: string
  }
  /** 「AI로 강조할 순간 찾기」(그래픽 탭 맨 위 — AiPicks.tsx) */
  aiPicks: {
    title: string
    body: string
    thin: string
    run: string
    running: string
    done: string
    none: string
    undo: string
    undone: string
    unavailable: string
    busy: string
    limited: string
    failed: string
  }
  /** 「내 작업」: 이 브라우저에 저장하고 다시 열기(projects.ts) */
  projects: {
    open: string
    title: string
    new: string
    recent: string
    all: string
    empty: string
    note: string
    current: string
    needsVideo: string
    noVideoSaved: string
    delete: string
    confirmDelete: string
    keep: string
    name: string
    saving: string
    saved: string
    savedNoVideo: string
    failed: string
    unavailable: string
    loading: string
    notFound: string
    reconnectTitle: string
    reconnectBody: string
    reconnectPick: string
    mismatch: string
  }
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
    exportBlocked: {
      login: 'Log in to export your video.',
      too_long: 'This video is longer than your plan allows. Shorten it or choose a bigger plan.',
      limit: 'You have used all of this month’s exports on your plan.',
      loginButton: 'Log in',
      planButton: 'See plans',
    },
    watermarkNote: 'Videos on the Free plan carry a small ReelMotion mark in the corner.',
    exportsLeft: 'You have {n} exports left this month.',
    cancel: 'Cancel',
    close: 'Close',
    start: {
      title: 'Add a video to start',
      body: 'Choose a video of someone talking. ReelMotion writes down the speech and places motion graphics on it.',
      pick: 'Choose a video',
      drop: 'or drop a file here',
      samples: 'Or try a sample clip',
      privacy: 'Your video stays in this browser.',
      help: 'How it works',
      install: 'Install as an app',
    },
    draft: {
      title: 'Your script is ready',
      body: 'Add your video and ReelMotion places the graphics for this script.',
      gone: 'This link has expired or does not exist. Ask Claude or ChatGPT to make a new one.',
      failed: 'Could not load the script for this link. Check your connection and reload the page.',
    },
    offline: 'Offline',
    offlineHint: 'No internet. The speech server, chat editing and account sync are paused; editing and export still work.',
    tabs: { graphics: 'Graphics', transcript: 'Transcript', chat: 'Chat' },
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
        side: 'Position',
        left: 'Left',
        right: 'Right',
        sideHint: 'Set automatically to the side that keeps the speaker’s face clear. What you choose here stays.',
      },
    },
    lanes: ['Titles', 'Names', 'Data', 'Captions'],
    zoomIn: 'Zoom in the timeline',
    zoomOut: 'Zoom out the timeline',
    scrub: 'Move through the video',
    undo: 'Undo',
    redo: 'Redo',
    sampleNote: 'Sample clips have no speech, so their script is typed.',
    chat: {
      intro: 'Say what you want to change.',
      examples: ["Change the title to 'Morning routine'", 'Make the number 50%', 'Switch to the Tokyo style'],
      placeholder: 'e.g. Show the name tag 2 seconds later',
      send: 'Send',
      thinking: 'Editing…',
      unavailable: 'Chat editing is unavailable right now. You can still edit on the Graphics tab.',
      busy: 'Lots of requests right now. Please try again in a moment.',
      limited: 'You can send 20 requests every 10 minutes. Please try again soon.',
      failed: 'I did not get that. Try saying it another way.',
      partial: 'Some changes could not be made.',
      undo: 'Undo',
      undone: 'Undone.',
      note: 'What you type and your project text are read by the AI on the ReelMotion server and not kept.',
    },
    aiPicks: {
      title: 'Find more moments with AI',
      body: 'Our server’s AI reads the script and adds titles, checklists and quotes. Graphics you already have stay as they are.',
      thin: 'This talk has no numbers, steps or names, so only a title and captions were made. AI can look for more moments to highlight.',
      run: 'Find with AI',
      running: 'Looking… this can take a few dozen seconds.',
      done: 'Added {n}.',
      none: 'No moments worth adding were found.',
      undo: 'Undo',
      undone: 'Undone.',
      unavailable: 'AI is unavailable right now. You can still add graphics yourself.',
      busy: 'Lots of requests right now. Please try again in a moment.',
      limited: 'You can use it 20 times every 10 minutes, together with chat editing. Please try again soon.',
      failed: 'Could not find any. Please try again in a moment.',
    },
    projects: {
      open: 'My projects',
      title: 'My projects',
      new: 'New project',
      recent: 'Recent projects',
      all: 'See all',
      empty: 'No saved projects yet. Add a video and your work is saved here as you go.',
      note: 'Projects and their videos are saved in this browser. Log in to keep projects in your account too (videos stay on each device). Clearing browser data — or a long time without visiting — can remove this browser’s copy, so export the videos you finish.',
      current: 'Open now',
      needsVideo: 'Choose the video again',
      noVideoSaved: 'The video was too large to keep in this browser — you will choose it again when you reopen.',
      delete: 'Delete',
      confirmDelete: 'Delete this project?',
      keep: 'Keep',
      name: 'Project name',
      saving: 'Saving…',
      saved: 'Saved in this browser',
      savedNoVideo: 'Saved · without the video',
      failed: 'Could not save',
      unavailable: 'This browser cannot save projects',
      loading: 'Opening your project…',
      notFound: 'That project is not in this browser. Projects open only in the browser that saved them.',
      reconnectTitle: 'Choose this project’s video again',
      reconnectBody: 'The video was too large to keep in this browser. Choose the same file to keep editing.',
      reconnectPick: 'Choose the video',
      mismatch: 'This file’s name or size differs from the original. If it is a different video, the timing may not match.',
    },
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
    exportBlocked: {
      login: '로그인하면 내보낼 수 있어요.',
      too_long: '이 영상은 지금 요금제가 받는 길이보다 길어요. 줄이거나 더 큰 요금제를 골라 주세요.',
      limit: '이번 달 내보내기를 다 썼어요.',
      loginButton: '로그인',
      planButton: '요금제 보기',
    },
    watermarkNote: '무료 요금제로 내보낸 영상에는 오른쪽 아래에 작은 ReelMotion 표시가 들어가요.',
    exportsLeft: '이번 달 내보내기가 {n}번 남았어요.',
    cancel: '그만두기',
    close: '닫기',
    start: {
      title: '영상을 넣어 시작하세요',
      body: '말하는 사람이 나오는 영상을 고르세요. ReelMotion이 말을 받아 적고 모션그래픽을 얹어요.',
      pick: '영상 고르기',
      drop: '또는 파일을 여기로 끌어 놓기',
      samples: '또는 예시 영상으로 해 보기',
      privacy: '영상은 이 브라우저 밖으로 나가지 않아요.',
      help: '쓰는 법 보기',
      install: '앱으로 설치',
    },
    draft: {
      title: '대본이 준비됐어요',
      body: '영상을 넣으면 이 대본으로 그래픽을 만들어요.',
      gone: '기한이 지났거나 없는 링크예요. Claude·ChatGPT 에서 다시 만들어 주세요.',
      failed: '이 링크의 대본을 불러오지 못했어요. 인터넷을 확인하고 페이지를 새로고침해 주세요.',
    },
    offline: '오프라인',
    offlineHint: '인터넷이 끊겼어요. 받아쓰기 서버·말로 고치기·계정 저장은 잠시 쉬고, 고치기와 내보내기는 그대로 돼요.',
    tabs: { graphics: '그래픽', transcript: '받아쓴 말', chat: '말로 고치기' },
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
        side: '위치',
        left: '왼쪽',
        right: '오른쪽',
        sideHint: '말하는 사람의 얼굴을 가리지 않는 쪽으로 저절로 정해져요. 여기서 고르면 그대로 둬요.',
      },
    },
    lanes: ['제목', '이름표', '데이터', '자막'],
    zoomIn: '타임라인 크게 보기',
    zoomOut: '타임라인 작게 보기',
    scrub: '영상 위치 옮기기',
    undo: '되돌리기',
    redo: '다시 하기',
    sampleNote: '예시 영상에는 말소리가 없어서 대본을 적어 두었어요.',
    chat: {
      intro: '고치고 싶은 것을 말로 적으세요.',
      examples: ["제목을 '아침 루틴'으로 바꿔 줘", '숫자를 50%로 바꿔 줘', '도쿄 스타일로 바꿔 줘'],
      placeholder: '예: 이름표를 2초 늦게 나오게 해 줘',
      send: '보내기',
      thinking: '고치는 중…',
      unavailable: '말로 고치기는 지금 쓸 수 없어요. 「그래픽」 탭에서 직접 고칠 수 있어요.',
      busy: '지금 요청이 많아요. 잠시 뒤 다시 보내 주세요.',
      limited: '10분에 20번까지 보낼 수 있어요. 잠시 뒤 다시 보내 주세요.',
      failed: '알아듣지 못했어요. 다르게 말해 주세요.',
      partial: '일부는 바꾸지 못했어요.',
      undo: '되돌리기',
      undone: '되돌렸어요.',
      note: '적은 말과 작업의 글은 ReelMotion 서버의 AI 가 읽고 남기지 않아요.',
    },
    aiPicks: {
      title: 'AI로 강조할 순간 찾기',
      body: '우리 서버의 AI가 대본을 읽고 제목·목록·인용을 더해요. 지금 있는 그래픽은 그대로 둬요.',
      thin: '숫자·순서·이름이 없는 이야기라 제목과 자막만 만들었어요. AI가 강조할 순간을 더 찾아 볼 수 있어요.',
      run: 'AI로 찾기',
      running: '찾는 중… 수십 초 걸릴 수 있어요.',
      done: '{n}개를 더했어요.',
      none: '더할 만한 순간을 찾지 못했어요.',
      undo: '되돌리기',
      undone: '되돌렸어요.',
      unavailable: 'AI를 지금 쓸 수 없어요. 그래픽은 직접 더할 수 있어요.',
      busy: '지금 요청이 많아요. 잠시 뒤 다시 눌러 주세요.',
      limited: '말로 고치기와 합쳐 10분에 20번까지 쓸 수 있어요. 잠시 뒤 다시 눌러 주세요.',
      failed: '찾지 못했어요. 잠시 뒤 다시 눌러 주세요.',
    },
    projects: {
      open: '내 작업',
      title: '내 작업',
      new: '새 작업',
      recent: '최근 작업',
      all: '모두 보기',
      empty: '아직 저장된 작업이 없어요. 영상을 넣으면 만드는 대로 여기에 저장돼요.',
      note: '작업과 영상은 이 브라우저에 저장돼요. 로그인하면 작업은 계정에도 저장돼요(영상은 각 기기에). 브라우저 데이터를 지우거나 오래 들어오지 않으면 이 브라우저의 것은 지워질 수 있으니, 다 만든 영상은 내보내 두세요.',
      current: '지금 작업',
      needsVideo: '영상 다시 고르기',
      noVideoSaved: '영상이 커서 이 브라우저에 함께 저장하지 못했어요. 다시 열 때 같은 영상을 골라 주세요.',
      delete: '지우기',
      confirmDelete: '이 작업을 지울까요?',
      keep: '그대로 두기',
      name: '작업 이름',
      saving: '저장 중…',
      saved: '이 브라우저에 저장됨',
      savedNoVideo: '저장됨 · 영상은 빼고',
      failed: '저장하지 못했어요',
      unavailable: '이 브라우저에서는 저장할 수 없어요',
      loading: '작업을 여는 중…',
      notFound: '이 브라우저에 없는 작업이에요. 작업은 저장한 브라우저에서만 열려요.',
      reconnectTitle: '이 작업의 영상을 다시 골라 주세요',
      reconnectBody: '영상이 커서 이 브라우저에 함께 저장하지 못했어요. 같은 파일을 고르면 이어서 편집할 수 있어요.',
      reconnectPick: '영상 고르기',
      mismatch: '처음 파일과 이름이나 크기가 달라요. 다른 영상이면 시간이 맞지 않을 수 있어요.',
    },
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
    exportBlocked: {
      login: 'ログインすると書き出せます。',
      too_long: 'この動画は今のプランで扱える長さを超えています。短くするか、上のプランを選んでください。',
      limit: '今月の書き出し回数を使い切りました。',
      loginButton: 'ログイン',
      planButton: 'プランを見る',
    },
    watermarkNote: '無料プランで書き出した動画には、右下に小さな ReelMotion の表示が入ります。',
    exportsLeft: '今月の書き出しはあと{n}回です。',
    cancel: 'やめる',
    close: '閉じる',
    start: {
      title: '動画を入れてはじめる',
      body: '人が話している動画を選んでください。ReelMotion が声を書き起こし、モーショングラフィックをのせます。',
      pick: '動画を選ぶ',
      drop: 'またはファイルをここにドロップ',
      samples: 'またはサンプル動画で試す',
      privacy: '動画はこのブラウザの外に出ません。',
      help: '使い方を見る',
      install: 'アプリとしてインストール',
    },
    draft: {
      title: '台本の準備ができました',
      body: '動画を入れると、この台本でグラフィックを作ります。',
      gone: '期限が切れたか、存在しないリンクです。Claude・ChatGPT でもう一度作ってください。',
      failed: 'このリンクの台本を読み込めませんでした。接続を確認して、ページを再読み込みしてください。',
    },
    offline: 'オフライン',
    offlineHint: 'インターネットにつながっていません。文字起こしサーバー・話して直す・アカウントへの保存は休止中です。編集と書き出しはそのまま使えます。',
    tabs: { graphics: 'グラフィック', transcript: '書き起こし', chat: '話して直す' },
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
        side: '位置',
        left: '左',
        right: '右',
        sideHint: '話している人の顔を隠さない側に自動で決まります。ここで選ぶと、そのままにします。',
      },
    },
    lanes: ['タイトル', '名前', 'データ', '字幕'],
    zoomIn: 'タイムラインを拡大',
    zoomOut: 'タイムラインを縮小',
    scrub: '動画の位置を動かす',
    undo: '元に戻す',
    redo: 'やり直す',
    sampleNote: 'サンプル動画には声がないため、台本を入力してあります。',
    chat: {
      intro: '直したいことを言葉で書いてください。',
      examples: ['タイトルを「朝のルーティン」にして', '数字を50%にして', '東京スタイルにして'],
      placeholder: '例: 名前テロップを2秒遅く出して',
      send: '送る',
      thinking: '直しています…',
      unavailable: '話して直す機能は今使えません。「グラフィック」タブで直接直せます。',
      busy: '今リクエストが混み合っています。少し待ってからもう一度送ってください。',
      limited: '10分に20回まで送れます。少し待ってからもう一度送ってください。',
      failed: 'わかりませんでした。別の言い方で書いてください。',
      partial: '一部は変更できませんでした。',
      undo: '元に戻す',
      undone: '元に戻しました。',
      note: '書いた言葉とプロジェクトの文字は ReelMotion サーバーの AI が読み、保存しません。',
    },
    aiPicks: {
      title: 'AIで見せ場を探す',
      body: '当社サーバーの AI が台本を読み、タイトル・チェックリスト・引用を追加します。今あるグラフィックはそのままです。',
      thin: '数字・順番・名前のない話なので、タイトルと字幕だけを作りました。AI で見せ場をさらに探せます。',
      run: 'AIで探す',
      running: '探しています… 数十秒かかることがあります。',
      done: '{n}個追加しました。',
      none: '追加できる見せ場は見つかりませんでした。',
      undo: '元に戻す',
      undone: '元に戻しました。',
      unavailable: 'AI は今使えません。グラフィックは自分で追加できます。',
      busy: 'リクエストが混み合っています。少し待ってからもう一度押してください。',
      limited: '「話して直す」と合わせて10分に20回まで使えます。少し待ってからもう一度押してください。',
      failed: '見つかりませんでした。少し待ってからもう一度押してください。',
    },
    projects: {
      open: 'マイプロジェクト',
      title: 'マイプロジェクト',
      new: '新しいプロジェクト',
      recent: '最近のプロジェクト',
      all: 'すべて見る',
      empty: 'まだ保存したプロジェクトはありません。動画を入れると、作るそばからここに保存されます。',
      note: 'プロジェクトと動画はこのブラウザに保存されます。ログインするとプロジェクトはアカウントにも保存されます(動画は各端末に)。ブラウザのデータを消したり長く開かなかったりするとこのブラウザの分は消えることがあるため、完成した動画は書き出しておいてください。',
      current: '編集中',
      needsVideo: '動画の選び直しが必要',
      noVideoSaved: '動画が大きいため、このブラウザに一緒に保存できませんでした。開き直すときに同じ動画を選んでください。',
      delete: '削除',
      confirmDelete: 'このプロジェクトを削除しますか?',
      keep: 'やめる',
      name: 'プロジェクト名',
      saving: '保存中…',
      saved: 'このブラウザに保存済み',
      savedNoVideo: '保存済み・動画は除く',
      failed: '保存できませんでした',
      unavailable: 'このブラウザでは保存できません',
      loading: 'プロジェクトを開いています…',
      notFound: 'このブラウザにないプロジェクトです。プロジェクトは保存したブラウザでのみ開けます。',
      reconnectTitle: 'このプロジェクトの動画をもう一度選んでください',
      reconnectBody: '動画が大きいため、このブラウザに一緒に保存できませんでした。同じファイルを選ぶと編集を続けられます。',
      reconnectPick: '動画を選ぶ',
      mismatch: '元のファイルと名前かサイズが違います。別の動画だと、タイミングが合わないことがあります。',
    },
  },
}

/** 예시 영상에 미리 적어 둔 대본. 여러 그래픽이 골고루 나오도록 썼다. */
export const SAMPLE_SCRIPTS: Record<Lang, string> = {
  en: "Three habits for better sleep.\nHi, I'm Mina Park, a sleep researcher.\nMost people fall asleep 37% faster.\nFirst, no screens after ten.\nSecond, wake up at the same time.",
  ko: '잠이 잘 오는 세 가지 습관.\n안녕하세요 저는 박미나입니다.\n대부분 37% 더 빨리 잠들어요.\n첫째, 10시 뒤엔 화면 끄기.\n둘째, 같은 시간에 일어나기.',
  ja: 'よく眠れる三つの習慣。\nこんにちは 私は田中です。\n多くの人が 37% 早く 眠れます。\nまず、10時以降は 画面を 見ない。\n次に、同じ 時間に 起きる。',
}
