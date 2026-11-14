import type { Lang } from '../i18n'
import type { PlanId } from './plans'

/**
 * 소개 페이지 글. 지어낸 후기·숫자·약속을 넣지 않는다.
 * 제품이 달라지면 여기 글도 고친다 — 특히 「내 영상은 어디로」(지금은 브라우저 안에서 처리)와
 * 「파일로 받기」(아직 없음)는 서버·내보내기가 생기면 사실과 달라진다.
 */
export type SiteCopy = {
  nav: { how: string; styles: string; pricing: string; faq: string; open: string; menu: string }
  hero: {
    /** 제목을 말하듯 끊은 조각. 형광펜이 조각을 차례로 짚는다. */
    title: string[]
    lead: string
    tryLabel: string
    tryPlaceholder: string
    tryDefault: string
    cta: string
    ctaNote: string
    wall: string[]
  }
  how: {
    title: string
    steps: { title: string; body: string }[]
    upload: { drop: string; file: string }
    listen: { caption: string; sample: string; seconds: string }
    fix: { before: string; wrong: string; right: string; after: string; note: string }
    pick: { caption: string }
  }
  statement: string
  styles: { title: string; body: string; open: string }
  pricing: {
    title: string
    body: string
    perMonth: string
    soon: string
    freeCta: string
    names: Record<PlanId, string>
    whoFor: Record<PlanId, string>
    maxMinutes: string
    exportsPerMonth: string
    watermark: string
    noWatermark: string
    included: string
    plannedNote: string
  }
  faq: { title: string; items: { q: string; a: string }[] }
  closing: { title: string; cta: string }
  footer: {
    business: string
    name: string
    representative: string
    registrationNumber: string
    mailOrderNumber: string
    address: string
    language: string
  }
}

export const SITE_COPY: Record<Lang, SiteCopy> = {
  ko: {
    nav: { how: '쓰는 순서', styles: '자막 디자인', pricing: '요금', faq: '자주 묻는 질문', open: '영상 올려서 써 보기', menu: '메뉴' },
    hero: {
      title: ['말하는', '대로,', '예능', '자막이', '붙습니다'],
      lead: '영상을 올리면 말소리를 어절마다 받아 적어, 움직이는 예능 자막으로 영상 위에 얹습니다.',
      tryLabel: '여기에 적은 말이 옆 화면에서 자막으로 나옵니다',
      tryPlaceholder: '자막으로 볼 말을 적어 보세요',
      tryDefault: '이게 진짜 된다고?',
      cta: '영상 올려서 써 보기',
      ctaNote: '가입 없이 바로 열립니다. 지금은 영상 위에서 미리 보는 데까지 됩니다.',
      wall: ['잠깐만요', '대박 사건', '오늘의 꿀팁', '끝까지 보세요', '말도 안 돼', '여기서 반전', '진짜예요?', '바로 이겁니다', '다시 한 번', '일단 해 봐요', '세상에나', '정리해 드림'],
    },
    how: {
      title: '영상 하나가 자막을 입기까지',
      steps: [
        { title: '영상 올리기', body: '영상을 고르면 바로 화면에 뜹니다. 가입은 필요 없습니다.' },
        { title: '말소리 받아 적기', body: '말을 어절마다 나누고, 각 어절이 언제 나왔는지까지 받아 적습니다.' },
        { title: '틀린 글자 고치기', body: '잘못 들은 글자는 글 상자에서 바로 고칩니다. 고쳐도 말과 자막의 박자는 그대로입니다. 줄을 바꾸면 자막도 거기서 끊깁니다.' },
        { title: '디자인 고르기', body: '예능 기본, 핑크 수다, 빨강 외침, 정보 박스. 누르는 대로 영상 위에서 바뀝니다.' },
      ],
      upload: { drop: '영상 고르기', file: '내 영상.mp4' },
      listen: { caption: '어절마다 시작 시각을 적습니다', sample: '여러분 오늘은요 진짜 대박 사건이 있었어요', seconds: '{n}초' },
      fix: { before: '진짜', wrong: '데박', right: '대박', after: '사건이 있었어요', note: '글자만 바뀌고 시각은 그대로' },
      pick: { caption: '고른 디자인이 바로 입혀집니다' },
    },
    statement: 'ReelMotion 은 문장이 아니라 어절마다 시간을 받아 적습니다. 그래서 지금 말하는 바로 그 단어가 화면에서 튀어 오릅니다.',
    styles: { title: '자막 디자인 네 가지', body: '마음에 드는 것을 누르면 그 디자인으로 편집 화면이 열립니다.', open: '이 디자인으로 열기' },
    pricing: {
      title: '요금',
      body: '지금은 무료로 미리보기까지 쓸 수 있습니다. 파일로 내보내기와 유료 요금제는 만들고 있습니다.',
      perMonth: '원 / 월',
      soon: '준비 중',
      freeCta: '영상 올려서 써 보기',
      names: { free: '무료', creator: '크리에이터', pro: '프로' },
      whoFor: {
        free: '먼저 써 보려는 분',
        creator: '쇼츠를 꾸준히 올리는 분',
        pro: '긴 영상과 여러 채널을 다루는 분',
      },
      maxMinutes: '영상 하나 {n}분까지',
      exportsPerMonth: '한 달에 {n}개 내보내기',
      watermark: '내보낸 영상에 ReelMotion 표시',
      noWatermark: 'ReelMotion 표시 없음',
      included: '자막 디자인 전부, 말소리로 자막 만들기',
      plannedNote: '값은 부가세를 포함한 예정 값입니다. 내보내기 한도는 출시할 때 확정합니다.',
    },
    faq: {
      title: '자주 묻는 질문',
      items: [
        { q: '내 영상은 어디로 올라가나요?', a: '지금은 어디로도 올라가지 않습니다. 말소리 받아 적기가 이 브라우저 안에서 돌아가서 영상과 소리가 컴퓨터 밖으로 나가지 않습니다.' },
        { q: '자막을 입힌 영상을 파일로 받을 수 있나요?', a: '아직 안 됩니다. 지금은 영상 위에서 미리 보는 데까지 되고, 파일로 내보내기를 만들고 있습니다.' },
        { q: '받아 적은 글자가 틀리면 어떻게 하나요?', a: '글 상자에서 그 글자만 고치면 됩니다. 고쳐도 자막이 뜨는 시각은 바뀌지 않습니다.' },
        { q: '처음 누르면 왜 시간이 걸리나요?', a: '말소리를 받아 적는 데 필요한 파일을 처음 한 번 내려받기 때문입니다. 정확도 「보통」은 약 250MB, 「높음」은 약 760MB 입니다. 두 번째부터는 다시 받지 않습니다.' },
        { q: '어떤 언어로 쓸 수 있나요?', a: '화면은 한국어, 일본어, 영어로 바꿀 수 있습니다. 말하는 언어도 세 가지 중에서 고르거나 자동으로 둘 수 있습니다. 자막 디자인은 지금 한국 예능식 네 가지입니다.' },
      ],
    },
    closing: { title: '말은 이미 하셨으니, 자막은 맡기세요', cta: '영상 올려서 써 보기' },
    footer: {
      business: '사업자 정보',
      name: '상호',
      representative: '대표',
      registrationNumber: '사업자등록번호',
      mailOrderNumber: '통신판매업 신고번호',
      address: '주소',
      language: '언어',
    },
  },
  ja: {
    nav: { how: '使い方', styles: 'テロップデザイン', pricing: '料金', faq: 'よくある質問', open: '動画を入れて試す', menu: 'メニュー' },
    hero: {
      title: ['話した', 'とおりに、', 'バラエティ', 'テロップが', 'つきます'],
      lead: '動画を入れると、話し声を言葉ごとに書き起こし、動くバラエティ風テロップとして動画の上にのせます。',
      tryLabel: 'ここに書いた言葉が、となりの画面にテロップで出ます',
      tryPlaceholder: 'テロップにしたい言葉を書いてみてください',
      tryDefault: 'これ ほんとに できるの?',
      cta: '動画を入れて試す',
      ctaNote: '登録なしですぐ開きます。今は動画の上でプレビューするところまでできます。',
      wall: ['ちょっと 待って', 'まさかの 展開', '今日の コツ', '最後まで 見て', 'うそでしょ', 'ここで 逆転', 'ほんとに?', 'これです', 'もう 一回', 'まず やってみて', 'なんてこと', 'まとめます'],
    },
    how: {
      title: '動画にテロップがつくまで',
      steps: [
        { title: '動画を入れる', body: '動画を選ぶと、すぐ画面に出ます。登録はいりません。' },
        { title: '話し声を書き起こす', body: '言葉ごとに分けて、それぞれがいつ話されたかまで書き起こします。' },
        { title: '間違いを直す', body: '聞き間違えた文字はテキスト欄ですぐ直せます。直しても声とテロップのタイミングはそのままです。改行するとテロップもそこで切れます。' },
        { title: 'デザインを選ぶ', body: '4種類のデザインから。押すたびに動画の上で切り替わります。' },
      ],
      upload: { drop: '動画を選ぶ', file: '自分の動画.mp4' },
      listen: { caption: '言葉ごとに開始時刻を記録します', sample: 'みなさん 今日はですね 本当に すごい ことが ありました', seconds: '{n}秒' },
      fix: { before: '本当に', wrong: 'すこい', right: 'すごい', after: 'ことが ありました', note: '文字だけ変わり、時刻はそのまま' },
      pick: { caption: '選んだデザインがすぐ反映されます' },
    },
    statement: 'ReelMotion は文ではなく言葉ごとに時刻を書き起こします。だから今話しているその言葉が画面で跳ねます。',
    styles: { title: 'テロップデザイン 4種類', body: '気に入ったものを押すと、そのデザインで編集画面が開きます。', open: 'このデザインで開く' },
    pricing: {
      title: '料金',
      body: '今は無料でプレビューまで使えます。ファイルへの書き出しと有料プランは準備中です。',
      perMonth: 'ウォン / 月',
      soon: '準備中',
      freeCta: '動画を入れて試す',
      names: { free: '無料', creator: 'クリエイター', pro: 'プロ' },
      whoFor: {
        free: 'まず試してみたい方',
        creator: 'ショート動画を続けて投稿する方',
        pro: '長い動画や複数のチャンネルを扱う方',
      },
      maxMinutes: '動画1本 {n}分まで',
      exportsPerMonth: '月に{n}本まで書き出し',
      watermark: '書き出した動画に ReelMotion の表示',
      noWatermark: 'ReelMotion の表示なし',
      included: 'すべてのテロップデザイン、音声からのテロップ作成',
      plannedNote: '価格は税込みの予定額です。書き出しの上限は公開時に確定します。',
    },
    faq: {
      title: 'よくある質問',
      items: [
        { q: '動画はどこにアップロードされますか?', a: '今はどこにもアップロードされません。書き起こしはこのブラウザの中で動くので、動画と音声はパソコンの外に出ません。' },
        { q: 'テロップ入りの動画をファイルで受け取れますか?', a: 'まだできません。今は動画の上でプレビューするところまでで、ファイルへの書き出しを作っています。' },
        { q: '書き起こしが間違っていたら?', a: 'テキスト欄でその文字だけ直してください。直してもテロップが出る時刻は変わりません。' },
        { q: '最初に時間がかかるのはなぜ?', a: '書き起こしに必要なファイルを最初の一度だけダウンロードするためです。精度「標準」は約250MB、「高い」は約760MBです。二度目からはダウンロードしません。' },
        { q: 'どの言語で使えますか?', a: '画面は韓国語、日本語、英語に切り替えられます。話している言語も3つから選ぶか、自動にできます。テロップデザインは今のところ韓国バラエティ風の4種類です。' },
      ],
    },
    closing: { title: '話すのは済みました。テロップは任せてください', cta: '動画を入れて試す' },
    footer: {
      business: '事業者情報',
      name: '商号',
      representative: '代表',
      registrationNumber: '事業者登録番号',
      mailOrderNumber: '通信販売業届出番号',
      address: '住所',
      language: '言語',
    },
  },
  en: {
    nav: { how: 'How it works', styles: 'Caption designs', pricing: 'Pricing', faq: 'Questions', open: 'Try it with your video', menu: 'Menu' },
    hero: {
      title: ['Say', 'it,', 'and', 'the captions', 'pop'],
      lead: 'Add a video and ReelMotion writes down the speech word by word, then lays animated Korean variety-show captions over it.',
      tryLabel: 'What you type here plays as a caption on the screen beside it',
      tryPlaceholder: 'Type a line to see it as a caption',
      tryDefault: 'Wait, this really works?',
      cta: 'Try it with your video',
      ctaNote: 'Opens right away, no sign-up. For now it previews captions over your video.',
      wall: ['Hold on', 'Plot twist', "Today's tip", 'Watch to the end', 'No way', 'Here it comes', 'For real?', 'This is it', 'One more time', 'Just try it', 'Oh my', 'Quick recap'],
    },
    how: {
      title: 'From a video to captions',
      steps: [
        { title: 'Add a video', body: 'Choose a video and it shows up right away. No sign-up needed.' },
        { title: 'Write down the speech', body: 'The speech is split word by word, and the time each word was spoken is recorded.' },
        { title: 'Fix wrong words', body: 'Fix a misheard word right in the text box. The captions keep their timing. A line break also breaks the caption there.' },
        { title: 'Pick a design', body: 'Four designs. Each click changes the captions on the video.' },
      ],
      upload: { drop: 'Choose a video', file: 'my-video.mp4' },
      listen: { caption: 'A start time is recorded for every word', sample: 'Okay everyone, today something truly wild happened', seconds: '{n}s' },
      fix: { before: 'something truly', wrong: 'wide', right: 'wild', after: 'happened', note: 'Only the word changes; the time stays' },
      pick: { caption: 'The design you pick is applied at once' },
    },
    statement: 'ReelMotion records a time for every word, not every sentence. That is why the exact word being spoken is the one that pops on screen.',
    styles: { title: 'Four caption designs', body: 'Pick one and the editor opens with that design.', open: 'Open with this design' },
    pricing: {
      title: 'Pricing',
      body: 'For now you can use it free, up to previewing. Exporting to a file and the paid plans are being built.',
      perMonth: 'KRW / month',
      soon: 'Coming',
      freeCta: 'Try it with your video',
      names: { free: 'Free', creator: 'Creator', pro: 'Pro' },
      whoFor: {
        free: 'For trying it out first',
        creator: 'For people who post shorts regularly',
        pro: 'For longer videos and several channels',
      },
      maxMinutes: 'Videos up to {n} min each',
      exportsPerMonth: '{n} exports a month',
      watermark: 'ReelMotion mark on exported videos',
      noWatermark: 'No ReelMotion mark',
      included: 'Every caption design, captions from speech',
      plannedNote: 'Prices are planned amounts including VAT. Export limits will be confirmed at launch.',
    },
    faq: {
      title: 'Questions',
      items: [
        { q: 'Where does my video get uploaded?', a: 'Nowhere, for now. The speech is written down inside this browser, so your video and audio never leave your computer.' },
        { q: 'Can I download the captioned video as a file?', a: 'Not yet. For now you can preview captions over your video; exporting to a file is being built.' },
        { q: 'What if a word is wrong?', a: 'Fix just that word in the text box. The time the caption appears does not change.' },
        { q: 'Why does the first run take a while?', a: 'The files needed to write down speech are downloaded once. Standard accuracy is about 250MB and High is about 760MB. They are not downloaded again.' },
        { q: 'Which languages can I use?', a: 'The screen can be Korean, Japanese or English. The spoken language can be one of those three, or automatic. Caption designs are four Korean variety-show styles for now.' },
      ],
    },
    closing: { title: 'You have done the talking. Leave the captions to us', cta: 'Try it with your video' },
    footer: {
      business: 'Business information',
      name: 'Company',
      representative: 'Representative',
      registrationNumber: 'Business registration no.',
      mailOrderNumber: 'Mail-order business no.',
      address: 'Address',
      language: 'Language',
    },
  },
}
