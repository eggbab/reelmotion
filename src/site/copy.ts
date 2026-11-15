import type { Lang } from '../langs'
import type { ThemeId } from '../motion/types'
import type { PlanId } from './plans'

/**
 * 소개 페이지 글. 지어낸 후기·고객·숫자를 넣지 않는다. 아직 없는 기능은 「곧 나와요」로만 적는다.
 * 제품이 달라지면 여기도 고친다 — 특히 개인정보 문장(「영상은 올라가지 않는다」「받아쓰기 서버에는 소리만 가고 남기지 않는다」)은
 * 편집기(src/editor)·받아쓰기 서버(server/asr)·개인정보처리방침이 실제로 그렇게 동작할 때만 사실이다.
 */
export type SiteCopy = {
  announce: { badge: string; text: string }
  nav: { product: string; styles: string; pricing: string; faq: string; start: string; language: string; menu: string; skip: string }
  hero: { before: string; words: string[]; after: string; body: string; cta: string; reel: string }
  make: { eyebrow: string; title: string; body: string; cols: { title: string; body: string }[]; tiles: string[] }
  steps: {
    eyebrow: string
    title1: string
    title2: string
    body: string
    steps: { name: string; hint: string }[]
    transcript: string
    picked: string
    exporting: string
    ready: string
    upload: string
  }
  styles: { title: string; all: string; prev: string; next: string; regions: Record<'global' | 'kr' | 'jp', string>; names: Record<ThemeId, string>; about: Record<ThemeId, string> }
  formats: { eyebrow: string; title: string; body: string; cta: string; shapes: string[] }
  lanes: { eyebrow: string; title: string; body: string; cta: string; lanes: string[] }
  statement: { eyebrow: string; text: string }
  chat: { badge: string; title: string; body: string; you: string; bot: string; input: string; cta: string }
  /** to: 누르면 가는 곳 — editor(편집기) · install(크롬·엣지는 설치 창, 아니면 도움말의 설치 순서) · null(아직 없음) */
  anywhere: { title: string; rows: { name: string; state: string; to: 'editor' | 'install' | null }[] }
  features: { title: string; body: string; items: { title: string; body: string }[] }
  pricing: {
    eyebrow: string
    title: string
    body: string
    perMonth: string
    soon: string
    cta: string
    /** 결제가 열린 유료 요금제의 단추 */
    choose: string
    names: Record<PlanId, string>
    whoFor: Record<PlanId, string>
    maxMinutes: string
    exports: string
    watermark: string
    noWatermark: string
    included: string
    note: string
  }
  faq: { title: string; items: { q: string; a: string }[] }
  footer: {
    title: string
    product: string
    company: string
    links: { editor: string; help: string; styles: string; pricing: string; faq: string }
    business: { name: string; representative: string; registration: string; mailOrder: string; address: string; hosting: string; contact: string }
    rights: string
  }
  floating: { label: string; placeholders: string[]; button: string }
}

export const SITE_COPY: Record<Lang, SiteCopy> = {
  en: {
    announce: { badge: 'BETA', text: 'ReelMotion is in public beta — every feature is free while we build.' },
    nav: { product: 'Product', styles: 'Styles', pricing: 'Pricing', faq: 'FAQ', start: 'Start creating', language: 'Language', menu: 'Menu', skip: 'Skip to content' },
    hero: {
      before: 'Animate your ',
      words: ['shorts.', 'podcasts.', 'lessons.', 'reels.', 'demos.'],
      after: '',
      body: 'ReelMotion listens to your video and adds titles, numbers, charts, name tags and captions — timed to every word you say.',
      cta: 'Start creating',
      reel: 'A talking video with a title, a name tag, a counter and a checklist appearing as she speaks',
    },
    make: {
      eyebrow: 'WHAT YOU CAN MAKE',
      title: 'Every graphic your video needs',
      body: 'From a single recording to titles, numbers and captions — placed where you say them.',
      cols: [
        { title: 'Titles & captions', body: 'A kinetic title opens your video and word-by-word captions follow your voice.' },
        { title: 'Numbers & charts', body: 'Say “42%” and a counter rolls up. Say three numbers and they become a chart.' },
        { title: 'Names & lists', body: 'Introduce yourself and a name tag slides in. Say “first, second” and a checklist builds.' },
      ],
      tiles: ['Title', 'Name tag', 'Counter', 'Chart', 'Checklist'],
    },
    steps: {
      eyebrow: 'FROM VOICE TO GRAPHICS',
      title1: 'One recording,',
      title2: 'from voice to motion',
      body: 'Drop in a talking video and ReelMotion carries it through transcript, graphics and style to a finished file. Everything you see here is drawn by the editor.',
      steps: [
        { name: 'Upload', hint: 'Any talking video' },
        { name: 'Transcribe', hint: 'Every word, with its time' },
        { name: 'Direct', hint: 'Graphics from what you say' },
        { name: 'Style', hint: 'Six looks, one click' },
        { name: 'Export', hint: 'MP4 in your browser' },
      ],
      transcript: 'TRANSCRIPT',
      picked: 'Picked from your words',
      exporting: 'Exporting',
      ready: 'Ready to download',
      upload: 'my-video.mp4',
    },
    styles: {
      title: 'Style packs',
      all: 'Try every style',
      prev: 'Previous style',
      next: 'Next style',
      regions: { global: 'Global', kr: 'Korea', jp: 'Japan' },
      names: { clean: 'Clean', neon: 'Neon', bold: 'Bold', editorial: 'Editorial', seoul: 'Seoul variety', tokyo: 'Tokyo telop' },
      about: {
        clean: 'Crisp white cards for explainers and courses',
        neon: 'Glass and light for tech and creator channels',
        bold: 'Loud yellow blocks that stop the scroll',
        editorial: 'Serif titles for stories and interviews',
        seoul: 'Thick outlines and pops from Korean variety shows',
        tokyo: 'Layered telop outlines from Japanese TV',
      },
    },
    formats: {
      eyebrow: 'EVERY FORMAT',
      title: 'Made for every screen',
      body: 'Vertical shorts and wide videos — the graphics resize themselves to fit.',
      cta: 'Try it with your video',
      shapes: ['9:16', '16:9'],
    },
    lanes: {
      eyebrow: 'TIMELINE',
      title: 'Every graphic, in its place',
      body: 'Each graphic sits on the timeline next to the words that made it. Change a word or a number and it updates.',
      cta: 'Open the editor',
      lanes: ['Titles', 'Data', 'Captions'],
    },
    statement: {
      eyebrow: 'WHY WE BUILT IT',
      text: 'We built this for people who explain things on camera — so the numbers you say, the names you mention and the points you make show up on screen the moment you say them, without a week in an editing app.',
    },
    chat: {
      badge: 'New',
      title: 'Edit by chatting',
      body: 'Ask for a change in plain words — “change the title”, “show the name tag two seconds later”, “switch to the Tokyo style” — and watch it happen. An open AI model on our own server does the edits.',
      you: 'Make the number 50% and keep it on screen longer',
      bot: 'Done! The number is now 50% and stays on screen longer.',
      input: 'Ask for a change…',
      cta: 'Try it in the editor',
    },
    anywhere: {
      title: 'Available wherever you create.',
      rows: [
        { name: 'Web editor', state: 'Open', to: 'editor' },
        { name: 'Mac & Windows app', state: 'Install from your browser', to: 'install' },
        { name: 'iPhone & Android', state: 'Add to your home screen', to: 'install' },
        { name: 'Claude & ChatGPT', state: 'Coming soon', to: null },
      ],
    },
    features: {
      title: 'Designed to create',
      body: 'Everything between your recording and a finished video, in one place.',
      items: [
        { title: 'Auto-directed', body: 'Graphics are picked from what you say: names, numbers, lists and quotes.' },
        { title: 'Word-level timing', body: 'Every word gets its own start time, so captions and counters land on the beat.' },
        { title: 'Six style packs', body: 'Clean, Neon, Bold and Editorial, plus Seoul variety and Tokyo telop.' },
        { title: 'Edit anything', body: 'Fix a misheard word, change a number or a name — the timing stays put.' },
        { title: 'Any shape', body: 'Vertical and wide videos. Graphics resize themselves.' },
        { title: 'Your video stays with you', body: 'Videos are never uploaded. Only the sound goes to our speech server, and it is not kept.' },
      ],
    },
    pricing: {
      eyebrow: 'PRICING',
      title: 'Start free',
      body: 'Every feature is free during the beta. Paid plans open when billing does.',
      perMonth: 'KRW / month',
      soon: 'Coming soon',
      cta: 'Start creating',
      choose: 'Get {plan}',
      names: { free: 'Free', creator: 'Creator', pro: 'Pro' },
      whoFor: { free: 'For trying it out', creator: 'For weekly creators', pro: 'For long videos and teams' },
      maxMinutes: 'Videos up to {n} min',
      exports: '{n} exports a month',
      watermark: 'ReelMotion watermark',
      noWatermark: 'No watermark',
      included: 'Every graphic and style pack',
      note: 'Planned prices in KRW, VAT included. Limits apply once paid plans open.',
    },
    faq: {
      title: 'Frequently asked questions',
      items: [
        { q: 'What does ReelMotion do?', a: 'You add a video of someone talking. ReelMotion writes down what is said, word by word, and places motion graphics — titles, name tags, counters, charts, checklists, quotes and captions — at the moment each thing is said. You can fix any word or number, change the style and export an MP4.' },
        { q: 'Does my video get uploaded?', a: 'No. The video never leaves your computer, and exporting happens in your browser. To write down the speech, only the sound is sent to the ReelMotion speech server, transcribed, and not kept. If you prefer, you can transcribe entirely inside your browser instead. Your projects are saved in this browser, and in your account if you log in — never your video file.' },
        { q: 'Which languages does it understand?', a: 'English, Korean and Japanese — for speech, for the graphics it picks and for this site. The Seoul and Tokyo style packs are made for Korean and Japanese text.' },
        { q: 'Can I use what I make commercially?', a: 'Yes. What you export is yours, and every font in the style packs is licensed for commercial video.' },
        { q: 'What do I need to run it?', a: 'A recent desktop browser such as Chrome, Edge or Safari. If you choose to transcribe inside your browser, the first time downloads about 250 MB once.' },
        { q: 'Do I need an account?', a: 'No. During the beta you can use the editor without logging in, and your projects are saved in this browser. Log in with Google to keep them in your account and open them on your other devices. You can delete your account at any time in My account.' },
        { q: 'How does chat editing work?', a: 'Type what you want to change, such as “make the title shorter” or “switch to the Tokyo style”, and an AI model running on ReelMotion’s own server turns it into edits. Each change is checked before it is applied, and you can undo the last one. What you type is not kept or used for training.' },
        { q: 'What happens to the Free plan when paid plans open?', a: 'Everything is free during the beta. When paid plans open, the Free plan stays free but gets the length and export limits shown in the pricing above, and videos exported on it carry a small ReelMotion mark in the corner. Creator and Pro raise the limits and remove the mark. Exports you cancel or that fail are never counted.' },
      ],
    },
    footer: {
      title: 'Your voice, in motion.',
      product: 'PRODUCT',
      company: 'COMPANY',
      links: { editor: 'Editor', help: 'Help', styles: 'Style packs', pricing: 'Pricing', faq: 'FAQ' },
      business: { name: 'Company', representative: 'Representative', registration: 'Business registration', mailOrder: 'Mail-order registration', address: 'Address', hosting: 'Hosting provider', contact: 'Contact' },
      rights: '© 2026 브이미랩스. All rights reserved.',
    },
    floating: { label: 'Type a line to turn into graphics', placeholders: ['TYPE A LINE YOU WILL SAY', 'TRY: WE GREW 42% THIS YEAR', 'TRY: FIRST, PLAN. SECOND, SHIP.'], button: 'Try it' },
  },
  ko: {
    announce: { badge: 'BETA', text: 'ReelMotion 공개 베타 — 만드는 동안 모든 기능이 무료예요.' },
    nav: { product: '제품', styles: '스타일', pricing: '요금', faq: '자주 묻는 질문', start: '시작하기', language: '언어', menu: '메뉴', skip: '본문으로 건너뛰기' },
    hero: {
      before: '',
      words: ['쇼츠', '팟캐스트', '강의', '릴스', '제품 영상'],
      after: '에 모션을.',
      body: 'ReelMotion이 영상 속 말을 듣고, 말하는 순간에 맞춰 제목·숫자·차트·이름표·자막을 얹습니다.',
      cta: '지금 시작하기',
      reel: '말하는 영상 위로 제목, 이름표, 숫자, 체크리스트가 말에 맞춰 나타나는 화면',
    },
    make: {
      eyebrow: '만들 수 있는 것',
      title: '영상에 필요한 그래픽을 한 번에',
      body: '녹화 한 번이면 제목·숫자·자막이 말한 자리에 놓여요.',
      cols: [
        { title: '제목과 자막', body: '움직이는 제목으로 영상을 열고, 낱말마다 자막이 목소리를 따라가요.' },
        { title: '숫자와 차트', body: '“42%”라고 말하면 숫자가 올라가고, 숫자 셋을 말하면 차트가 돼요.' },
        { title: '이름표와 목록', body: '자기소개를 하면 이름표가 들어오고, “첫째, 둘째”라고 하면 목록이 쌓여요.' },
      ],
      tiles: ['제목', '이름표', '숫자', '차트', '목록'],
    },
    steps: {
      eyebrow: '목소리에서 그래픽까지',
      title1: '녹화 한 번으로,',
      title2: '목소리가 모션이 되기까지',
      body: '말하는 영상을 넣으면 받아쓰기·그래픽·스타일을 거쳐 완성 파일까지 이어져요. 여기 보이는 그래픽은 모두 편집기가 그린 거예요.',
      steps: [
        { name: '올리기', hint: '말하는 영상이면 무엇이든' },
        { name: '받아쓰기', hint: '낱말마다 시간까지' },
        { name: '연출', hint: '말에서 그래픽을 골라요' },
        { name: '스타일', hint: '여섯 가지 느낌, 한 번에' },
        { name: '내보내기', hint: '브라우저에서 MP4로' },
      ],
      transcript: '받아쓴 말',
      picked: '말에서 고른 그래픽',
      exporting: '내보내는 중',
      ready: '내려받을 준비 완료',
      upload: '내 영상.mp4',
    },
    styles: {
      title: '스타일 묶음',
      all: '모든 스타일 써 보기',
      prev: '이전 스타일',
      next: '다음 스타일',
      regions: { global: '글로벌', kr: '한국', jp: '일본' },
      names: { clean: '클린', neon: '네온', bold: '볼드', editorial: '에디토리얼', seoul: '서울 예능', tokyo: '도쿄 텔롭' },
      about: {
        clean: '설명 영상과 강의에 맞는 깔끔한 흰 카드',
        neon: '테크·크리에이터 채널을 위한 유리와 빛',
        bold: '스크롤을 멈추게 하는 노란 블록',
        editorial: '이야기와 인터뷰를 위한 세리프 제목',
        seoul: '한국 예능의 두꺼운 테두리와 톡 튀는 글자',
        tokyo: '일본 방송의 겹겹이 두른 텔롭',
      },
    },
    formats: {
      eyebrow: '모든 화면',
      title: '어떤 화면에도 맞게',
      body: '세로 쇼츠도 가로 영상도 — 그래픽이 알아서 크기를 맞춰요.',
      cta: '내 영상으로 써 보기',
      shapes: ['9:16', '16:9'],
    },
    lanes: {
      eyebrow: '타임라인',
      title: '모든 그래픽을 제자리에',
      body: '그래픽은 그것을 만든 말 바로 옆, 타임라인 위에 놓여요. 낱말이나 숫자를 고치면 그래픽도 바뀌어요.',
      cta: '편집기 열기',
      lanes: ['제목', '데이터', '자막'],
    },
    statement: {
      eyebrow: '왜 만들었나',
      text: '카메라 앞에서 설명하는 사람들을 위해 만들었어요. 말한 숫자, 언급한 이름, 짚은 요점이 편집 프로그램에서 일주일을 보내지 않아도 말하는 바로 그 순간 화면에 나타나도록.',
    },
    chat: {
      badge: '새 기능',
      title: '말로 고치는 편집',
      body: '“제목 바꿔 줘”, “이름표를 2초 늦게”, “도쿄 스타일로” 처럼 평소 말로 부탁하면 바로 바뀌어요. 우리 서버의 오픈 AI 모델이 고쳐요.',
      you: '숫자를 50%로 바꾸고 화면에 더 오래 보여 줘',
      bot: '바꿨어요! 숫자를 50%로 바꾸고 더 오래 보이게 했어요.',
      input: '바꾸고 싶은 걸 말해 보세요…',
      cta: '편집기에서 해 보기',
    },
    anywhere: {
      title: '어디서 만들든 쓸 수 있어요.',
      rows: [
        { name: '웹 편집기', state: '열기', to: 'editor' },
        { name: '맥 · 윈도우 앱', state: '브라우저에서 설치', to: 'install' },
        { name: '아이폰 · 안드로이드', state: '홈 화면에 추가', to: 'install' },
        { name: 'Claude · ChatGPT', state: '곧 나와요', to: null },
      ],
    },
    features: {
      title: '만드는 일에만 집중하세요',
      body: '녹화부터 완성 영상까지, 필요한 건 모두 한곳에.',
      items: [
        { title: '자동 연출', body: '이름·숫자·목록·인용처럼 말한 내용에서 그래픽을 골라요.' },
        { title: '낱말 단위 타이밍', body: '낱말마다 시작 시간이 있어 자막과 숫자가 박자에 맞게 떠요.' },
        { title: '스타일 여섯 가지', body: '클린·네온·볼드·에디토리얼, 그리고 서울 예능과 도쿄 텔롭.' },
        { title: '무엇이든 고치기', body: '잘못 들은 낱말, 숫자, 이름을 고쳐도 타이밍은 그대로예요.' },
        { title: '어떤 비율이든', body: '세로 영상도 가로 영상도. 그래픽이 알아서 맞춰요.' },
        { title: '영상은 내 컴퓨터에', body: '영상은 올라가지 않아요. 받아쓰기 서버에는 소리만 가고, 남기지 않아요.' },
      ],
    },
    pricing: {
      eyebrow: '요금',
      title: '무료로 시작하세요',
      body: '베타 동안은 모든 기능이 무료예요. 유료 요금제는 결제가 열리면 시작해요.',
      perMonth: '원 / 월',
      soon: '곧 나와요',
      cta: '지금 시작하기',
      choose: '{plan} 시작하기',
      names: { free: '무료', creator: '크리에이터', pro: '프로' },
      whoFor: { free: '먼저 써 보려는 분', creator: '매주 올리는 크리에이터', pro: '긴 영상과 팀' },
      maxMinutes: '영상 하나 {n}분까지',
      exports: '한 달 {n}개 내보내기',
      watermark: 'ReelMotion 워터마크',
      noWatermark: '워터마크 없음',
      included: '모든 그래픽과 스타일',
      note: '부가세를 포함한 예정 가격이에요. 한도는 유료 요금제가 열린 뒤 적용돼요.',
    },
    faq: {
      title: '자주 묻는 질문',
      items: [
        { q: 'ReelMotion은 무엇을 하나요?', a: '말하는 영상을 넣으면 말을 낱말 단위로 받아 적고, 그 말을 하는 순간에 맞춰 제목·이름표·숫자·차트·목록·인용·자막 같은 모션그래픽을 놓아요. 낱말이나 숫자를 고치고 스타일을 바꾼 뒤 MP4로 내보낼 수 있어요.' },
        { q: '제 영상이 어딘가로 올라가나요?', a: '아니요. 영상은 내 컴퓨터를 떠나지 않고, 내보내기도 브라우저 안에서 해요. 말을 받아 적을 때만 소리를 ReelMotion 받아쓰기 서버로 보내고, 받아 적은 뒤 남기지 않아요. 원하면 브라우저 안에서만 받아 적을 수도 있어요. 작업은 이 브라우저에, 로그인하면 계정에도 저장돼요. 영상 파일은 올리지 않아요.' },
        { q: '어떤 언어를 알아듣나요?', a: '영어·한국어·일본어예요. 받아쓰기, 그래픽 고르기, 이 사이트 모두요. 서울 예능과 도쿄 텔롭 스타일은 한국어와 일본어 글자에 맞춰 만들었어요.' },
        { q: '만든 영상을 상업적으로 써도 되나요?', a: '네. 내보낸 영상은 내 것이고, 스타일에 쓰인 글꼴은 모두 상업 영상에 쓸 수 있는 라이선스예요.' },
        { q: '무엇이 필요한가요?', a: '크롬·엣지·사파리 같은 최신 데스크톱 브라우저면 돼요. 브라우저 안에서 받아 적기를 고르면 처음 한 번 약 250MB를 내려받아요.' },
        { q: '계정이 있어야 하나요?', a: '아니요. 베타 동안은 로그인하지 않아도 편집기를 쓸 수 있고, 작업은 이 브라우저에 저장돼요. 구글로 로그인하면 작업이 계정에도 저장돼 다른 기기에서도 열려요. 탈퇴는 「내 계정」에서 언제든 할 수 있어요.' },
        { q: '말로 고치기는 어떻게 하나요?', a: '「제목을 짧게」, 「도쿄 스타일로 바꿔 줘」처럼 바꾸고 싶은 것을 적으면 ReelMotion 서버에서 돌아가는 AI가 고치기로 바꿔요. 고치기는 적용하기 전에 검사하고, 마지막 고치기는 되돌릴 수 있어요. 적은 말은 남기지 않고 학습에도 쓰지 않아요.' },
        { q: '유료 요금제가 열리면 무료 요금제는 어떻게 되나요?', a: '베타 동안은 모든 기능이 무료예요. 유료 요금제가 열려도 무료 요금제는 계속 무료지만, 위 요금 안내의 길이·횟수 한도가 생기고 내보낸 영상 모서리에 작은 ReelMotion 표시가 들어가요. 크리에이터와 프로는 한도가 크고 표시가 없어요. 그만두거나 실패한 내보내기는 세지 않아요.' },
      ],
    },
    footer: {
      title: '목소리를, 모션으로.',
      product: '제품',
      company: '회사',
      links: { editor: '편집기', help: '도움말', styles: '스타일 묶음', pricing: '요금', faq: '자주 묻는 질문' },
      business: { name: '상호', representative: '대표', registration: '사업자등록번호', mailOrder: '통신판매업 신고번호', address: '주소', hosting: '호스팅 제공자', contact: '문의' },
      rights: '© 2026 브이미랩스. 모든 권리 보유.',
    },
    floating: { label: '그래픽으로 바꿀 말을 적어 보세요', placeholders: ['말할 문장을 적어 보세요', '예: 올해 매출이 42% 늘었어요', '예: 첫째, 계획. 둘째, 출시.'], button: '써 보기' },
  },
  ja: {
    announce: { badge: 'BETA', text: 'ReelMotion パブリックベータ — 開発中はすべての機能が無料です。' },
    nav: { product: '製品', styles: 'スタイル', pricing: '料金', faq: 'よくある質問', start: 'はじめる', language: '言語', menu: 'メニュー', skip: '本文へ移動' },
    hero: {
      before: '',
      words: ['ショート', 'ポッドキャスト', '講義', 'リール', '製品動画'],
      after: 'にモーションを。',
      body: 'ReelMotion が動画の声を聞き取り、話した瞬間にタイトル・数字・グラフ・名前・字幕をのせます。',
      cta: 'いますぐはじめる',
      reel: '話す動画の上に、タイトル・名前・数字・チェックリストが声に合わせて現れる画面',
    },
    make: {
      eyebrow: 'つくれるもの',
      title: '動画に必要なグラフィックを一度に',
      body: '録画ひとつで、タイトル・数字・字幕が話したところに置かれます。',
      cols: [
        { title: 'タイトルと字幕', body: '動くタイトルで始まり、言葉ごとの字幕が声についていきます。' },
        { title: '数字とグラフ', body: '「42%」と言えば数字がカウントアップ。数字を三つ言えばグラフに。' },
        { title: '名前とリスト', body: '自己紹介すると名前が入り、「まず、次に」でリストが積み上がります。' },
      ],
      tiles: ['タイトル', '名前', '数字', 'グラフ', 'リスト'],
    },
    steps: {
      eyebrow: '声からグラフィックへ',
      title1: '録画ひとつで、',
      title2: '声がモーションになるまで',
      body: '話す動画を入れると、書き起こし・グラフィック・スタイルを経て完成ファイルまで。ここに見えるグラフィックはすべてエディターが描いています。',
      steps: [
        { name: 'アップロード', hint: '話す動画なら何でも' },
        { name: '書き起こし', hint: '言葉ごとに時間まで' },
        { name: '演出', hint: '話からグラフィックを選ぶ' },
        { name: 'スタイル', hint: '六つの雰囲気をワンクリック' },
        { name: '書き出し', hint: 'ブラウザで MP4 に' },
      ],
      transcript: '書き起こし',
      picked: '言葉から選んだグラフィック',
      exporting: '書き出し中',
      ready: 'ダウンロードの準備完了',
      upload: '自分の動画.mp4',
    },
    styles: {
      title: 'スタイルパック',
      all: 'すべてのスタイルを試す',
      prev: '前のスタイル',
      next: '次のスタイル',
      regions: { global: 'グローバル', kr: '韓国', jp: '日本' },
      names: { clean: 'クリーン', neon: 'ネオン', bold: 'ボールド', editorial: 'エディトリアル', seoul: 'ソウル バラエティ', tokyo: '東京 テロップ' },
      about: {
        clean: '解説動画や講座に合うすっきりした白いカード',
        neon: 'テック系・クリエイター向けのガラスと光',
        bold: 'スクロールを止める黄色いブロック',
        editorial: '物語やインタビューのためのセリフ体タイトル',
        seoul: '韓国バラエティの太い縁取りと弾む文字',
        tokyo: '日本のテレビの重ねた縁取りテロップ',
      },
    },
    formats: {
      eyebrow: 'あらゆる画面',
      title: 'どの画面にもぴったり',
      body: '縦のショートも横の動画も — グラフィックが自動でサイズを合わせます。',
      cta: '自分の動画で試す',
      shapes: ['9:16', '16:9'],
    },
    lanes: {
      eyebrow: 'タイムライン',
      title: 'すべてのグラフィックを、あるべき場所に',
      body: 'グラフィックは、それを生んだ言葉のすぐ隣のタイムラインに置かれます。言葉や数字を直すと更新されます。',
      cta: 'エディターを開く',
      lanes: ['タイトル', 'データ', '字幕'],
    },
    statement: {
      eyebrow: 'つくった理由',
      text: 'カメラの前で説明する人のためにつくりました。話した数字、触れた名前、伝えたい要点が、編集アプリで一週間かけなくても、話したその瞬間に画面に現れるように。',
    },
    chat: {
      badge: '新機能',
      title: '話しかけて編集',
      body: '「タイトルを変えて」「名前テロップを2秒遅く」「東京スタイルに」と普段の言葉で頼めば、すぐに変わります。編集するのは当社サーバーのオープンな AI モデルです。',
      you: '数字を50%にして、もう少し長く表示して',
      bot: '変更しました!数字を50%にして、長めに表示します。',
      input: '変えたいことを伝えてください…',
      cta: 'エディターで試す',
    },
    anywhere: {
      title: 'どこで作っても使えます。',
      rows: [
        { name: 'ウェブ エディター', state: '開く', to: 'editor' },
        { name: 'Mac・Windows アプリ', state: 'ブラウザからインストール', to: 'install' },
        { name: 'iPhone・Android', state: 'ホーム画面に追加', to: 'install' },
        { name: 'Claude・ChatGPT', state: '近日公開', to: null },
      ],
    },
    features: {
      title: 'つくることだけに集中',
      body: '録画から完成動画まで、必要なものはすべてここに。',
      items: [
        { title: '自動演出', body: '名前・数字・リスト・引用など、話した内容からグラフィックを選びます。' },
        { title: '言葉ごとのタイミング', body: '言葉ごとに開始時刻があるので、字幕も数字もリズムに合います。' },
        { title: '六つのスタイル', body: 'クリーン・ネオン・ボールド・エディトリアル、そしてソウルと東京。' },
        { title: '何でも直せる', body: '聞き間違い、数字、名前を直してもタイミングはそのまま。' },
        { title: 'どの比率でも', body: '縦の動画も横の動画も。グラフィックが自動で合わせます。' },
        { title: '動画は手元に', body: '動画はアップロードされません。書き起こしサーバーに送るのは音声だけで、残しません。' },
      ],
    },
    pricing: {
      eyebrow: '料金',
      title: '無料ではじめる',
      body: 'ベータ期間中はすべての機能が無料です。有料プランは決済の開始とともに始まります。',
      perMonth: 'ウォン / 月',
      soon: '近日公開',
      cta: 'いますぐはじめる',
      choose: '{plan}をはじめる',
      names: { free: '無料', creator: 'クリエイター', pro: 'プロ' },
      whoFor: { free: 'まず試したい方', creator: '毎週投稿するクリエイター', pro: '長い動画とチーム' },
      maxMinutes: '動画1本 {n}分まで',
      exports: '月 {n}本の書き出し',
      watermark: 'ReelMotion のウォーターマーク',
      noWatermark: 'ウォーターマークなし',
      included: 'すべてのグラフィックとスタイル',
      note: '税込みの予定価格(韓国ウォン)です。上限は有料プラン開始後に適用されます。',
    },
    faq: {
      title: 'よくある質問',
      items: [
        { q: 'ReelMotion は何をしますか?', a: '話す動画を入れると、言葉ごとに書き起こし、その言葉を話した瞬間にタイトル・名前・数字・グラフ・リスト・引用・字幕などのモーショングラフィックを置きます。言葉や数字を直し、スタイルを変えて MP4 で書き出せます。' },
        { q: '動画はどこかにアップロードされますか?', a: 'いいえ。動画はパソコンの外に出ず、書き出しもブラウザの中で行います。書き起こしのときだけ音声を ReelMotion の書き起こしサーバーに送り、書き起こした後は残しません。ブラウザの中だけで書き起こすこともできます。プロジェクトはこのブラウザに、ログインするとアカウントにも保存されます。動画ファイルはアップロードしません。' },
        { q: 'どの言語に対応していますか?', a: '英語・韓国語・日本語です。書き起こし、グラフィックの選択、このサイトのすべてで。ソウルと東京のスタイルは韓国語と日本語の文字に合わせて作りました。' },
        { q: '作った動画を商用で使えますか?', a: 'はい。書き出した動画はあなたのものです。スタイルに使われているフォントはすべて商用動画に使えるライセンスです。' },
        { q: '何が必要ですか?', a: 'Chrome・Edge・Safari などの最新のデスクトップブラウザ。ブラウザの中で書き起こす場合は、最初に一度だけ約 250MB をダウンロードします。' },
        { q: 'アカウントは必要ですか?', a: 'いいえ。ベータ期間中はログインしなくてもエディターを使え、プロジェクトはこのブラウザに保存されます。Google でログインすると、プロジェクトがアカウントにも保存され、ほかの端末でも開けます。退会は「マイアカウント」でいつでもできます。' },
        { q: '話して直すはどう使いますか?', a: '「タイトルを短く」「東京スタイルにして」のように直したいことを書くと、ReelMotion のサーバーで動く AI が変更に変えます。変更は反映する前に確認され、最後の変更は元に戻せます。書いた言葉は残さず、学習にも使いません。' },
        { q: '有料プランが始まったら、無料プランはどうなりますか?', a: 'ベータ期間中はすべての機能が無料です。有料プランが始まっても無料プランは無料のままですが、上の料金案内にある長さ・回数の上限が付き、書き出した動画の隅に小さな ReelMotion の表示が入ります。クリエイターとプロは上限が大きく、表示もありません。途中でやめた書き出しや失敗した書き出しは数えません。' },
      ],
    },
    footer: {
      title: '声を、モーションに。',
      product: '製品',
      company: '会社',
      links: { editor: 'エディター', help: 'ヘルプ', styles: 'スタイルパック', pricing: '料金', faq: 'よくある質問' },
      business: { name: '商号', representative: '代表', registration: '事業者登録番号', mailOrder: '通信販売業届出番号', address: '住所', hosting: 'ホスティング事業者', contact: 'お問い合わせ' },
      rights: '© 2026 브이미랩스. All rights reserved.',
    },
    floating: { label: 'グラフィックにしたい言葉を入力', placeholders: ['話す文章を入力してください', '例: 今年の売上は42%伸びました', '例: まず計画。次にリリース。'], button: '試す' },
  },
}
