import type { Lang } from '../langs'
import type { PulseEvent } from '../pulseEvents'

/** 관리자 화면(/admin) 글. 운영자가 보는 곳이라 짧게. */
export type AdminCopy = {
  title: string
  description: string
  loading: string
  off: string
  needLogin: string
  loginButton: string
  forbidden: string
  failed: string
  retry: string
  status: string
  checkedAt: string
  notChecked: string
  ok: string
  problem: string
  since: string
  checks: Record<'web' | 'asr' | 'assist' | 'disk' | 'backup', string>
  numbers: string
  users: string
  newThisMonth: string
  plans: string
  exportsThisMonth: string
  settings: string
  limitsOn: string
  limitsOff: string
  billingOn: string
  billingOff: string
  googleOn: string
  googleOff: string
  connectorOn: string
  connectorOff: string
  people: string
  search: string
  searchButton: string
  recent: string
  noResults: string
  email: string
  name: string
  plan: string
  joined: string
  exports: string
  projects: string
  until: string
  change: string
  days: string
  save: string
  cancel: string
  saved: string
  planErrors: Record<'no_user' | 'bad_plan' | 'bad_days' | 'failed', string>
  backups: string
  backupsBody: string
  noBackups: string
  download: string
  alerts: string
  alertsTo: string
  mailOn: string
  mailOff: string
  testMail: string
  testSent: string
  testNotSetUp: string
  testFailed: string
  account: string
  notice: string
  noticeBody: string
  noticeOn: string
  noticeLevel: string
  levelInfo: string
  levelWarning: string
  noticeLangs: Record<'ko' | 'en' | 'ja', string>
  noticeHint: string
  noticeSave: string
  noticeSaved: string
  noticeErrors: Record<'empty' | 'too_long' | 'failed', string>
  noticeUpdated: string
  /** 쓰임 숫자(최근 7일) — 누가 했는지는 없다 */
  pulse: {
    title: string
    note: string
    what: string
    total: string
    bots: string
    empty: string
    exportsTitle: string
    browser: string
    started: string
    done: string
    failed: string
    unsupported: string
    events: Record<PulseEvent, string>
    families: Record<'chrome' | 'safari' | 'firefox' | 'edge' | 'samsung' | 'opera' | 'whale' | 'inapp' | 'other', string>
    systems: Record<'windows' | 'mac' | 'ios' | 'android' | 'chromeos' | 'linux' | 'other', string>
    connector: string
    bot: string
    unknown: string
  }
  /** 브라우저 오류(최근 30일) */
  errors: { title: string; note: string; empty: string; count: string; last: string; version: string; stack: string; clear: string; cleared: string }
}

export const ADMIN_COPY: Record<Lang, AdminCopy> = {
  ko: {
    title: '관리자 화면',
    description: 'ReelMotion 운영: 서버 상태, 가입자, 요금제, 백업, 알림.',
    loading: '불러오는 중…',
    off: '지금은 앱 서버에 닿지 않아요.',
    needLogin: '관리자 메일로 로그인하세요.',
    loginButton: '로그인',
    forbidden: '관리자만 볼 수 있어요.',
    failed: '불러오지 못했어요.',
    retry: '다시 불러오기',
    status: '서버 상태',
    checkedAt: '{time}에 확인',
    notChecked: '아직 확인하지 않았어요(앱 서버가 막 켜졌어요).',
    ok: '정상',
    problem: '문제',
    since: '{time}부터',
    checks: { web: '웹사이트', asr: '받아쓰기 서버', assist: '말로 고치기 AI', disk: '저장 공간', backup: '자동 백업' },
    numbers: '숫자',
    users: '가입자',
    newThisMonth: '이번 달 새로 {n}명',
    plans: '요금제',
    exportsThisMonth: '이번 달 내보내기',
    settings: '설정',
    limitsOn: '요금제 한도 켜짐',
    limitsOff: '요금제 한도 꺼짐(베타 — 모두 무료)',
    billingOn: '카드 결제 연결됨',
    billingOff: '카드 결제 연결 전',
    googleOn: '구글 로그인 켜짐',
    googleOff: '구글 로그인 꺼짐(도메인·OAuth 설정 전)',
    connectorOn: 'Claude·ChatGPT 커넥터 켜짐',
    connectorOff: 'Claude·ChatGPT 커넥터 꺼짐(CONNECTOR=0)',
    people: '사람',
    search: '메일이나 이름',
    searchButton: '찾기',
    recent: '최근 가입 20명',
    noResults: '찾는 사람이 없어요.',
    email: '메일',
    name: '이름',
    plan: '요금제',
    joined: '가입',
    exports: '이번 달 내보내기',
    projects: '작업',
    until: '{date}까지',
    change: '요금제 바꾸기',
    days: '일',
    save: '저장',
    cancel: '그만두기',
    saved: '{email}: {plan} 요금제로 바꿨어요.',
    planErrors: {
      no_user: '그 메일로 가입한 사람이 없어요.',
      bad_plan: '요금제가 올바르지 않아요.',
      bad_days: '일수는 1 이상의 정수로 적어 주세요.',
      failed: '바꾸지 못했어요. 다시 시도해 주세요.',
    },
    backups: '백업',
    backupsBody: '서버가 하루에 하나 만들고 7일 동안 둬요. 매주 하나를 내려받아 다른 곳에 두고, 내려받은 백업은 30일이 지나면 지우세요(개인정보처리방침).',
    noBackups: '아직 백업이 없어요.',
    download: '내려받기',
    alerts: '장애 알림',
    alertsTo: '받는 곳: {email}',
    mailOn: '메일 보내기 설정됨',
    mailOff: '메일 보내기 설정 전 — 알림은 앱 기록에만 남아요. 운영 안내의 「장애 알림」대로 보내는 메일 계정을 넣으세요.',
    testMail: '시험 메일 보내기',
    testSent: '{email} 주소로 보냈어요. 받은편지함과 스팸함을 보세요.',
    testNotSetUp: '보내는 메일 계정이 없어 보낼 수 없어요.',
    testFailed: '보내지 못했어요: {message}',
    account: '관리자 화면',
    notice: '공지',
    noticeBody: '사이트 맨 위와 편집기 위에 보여요. 사람마다 닫을 수 있고, 다시 저장하면 닫았던 사람에게도 다시 보여요.',
    noticeOn: '공지 보이기',
    noticeLevel: '모양',
    levelInfo: '알림',
    levelWarning: '주의(노란색)',
    noticeLangs: { ko: '한국어', en: 'English', ja: '日本語' },
    noticeHint: '언어마다 300자까지. 비워 둔 언어에는 영어 → 한국어 → 일본어 순으로 적힌 글이 보여요.',
    noticeSave: '공지 저장',
    noticeSaved: '저장했어요.',
    noticeErrors: { empty: '공지를 보이려면 한 언어 이상 글을 적어 주세요.', too_long: '언어마다 300자까지 적을 수 있어요.', failed: '저장하지 못했어요. 다시 시도해 주세요.' },
    noticeUpdated: '마지막 저장: {time}',
    pulse: {
      title: '쓰임 (최근 7일)',
      note: '누가 했는지는 남기지 않고, 날짜마다 횟수만 세요. 날짜는 서울 시간이에요.',
      what: '무엇',
      total: '합계',
      bots: '검색 로봇 같은 자동 프로그램 {n}번은 뺐어요.',
      empty: '아직 기록이 없어요.',
      exportsTitle: '브라우저별 내보내기',
      browser: '브라우저',
      started: '시작',
      done: '끝',
      failed: '실패',
      unsupported: '못 함',
      events: {
        editor_open: '편집기 열기',
        video_added: '영상 넣기',
        sample_opened: '예시 영상 열기',
        draft_opened: '커넥터 링크로 열기',
        transcribe_ok: '받아쓰기 됨',
        transcribe_failed: '받아쓰기 실패',
        graphics_made: '그래픽 만들기',
        export_started: '내보내기 시작',
        export_done: '내보내기 끝',
        export_failed: '내보내기 실패',
        export_unsupported: '내보내기 못 하는 브라우저',
        chat_edit: '말로 고치기',
        ai_highlights: 'AI로 강조할 순간 찾기',
        connector_plan: '커넥터: 계획 보기',
        connector_link: '커넥터: 링크 만들기',
      },
      families: { chrome: '크롬', safari: '사파리', firefox: '파이어폭스', edge: '엣지', samsung: '삼성 인터넷', opera: '오페라', whale: '웨일', inapp: '앱 안 브라우저', other: '그 밖' },
      systems: { windows: '윈도우', mac: '맥', ios: '아이폰·아이패드', android: '안드로이드', chromeos: '크롬북', linux: '리눅스', other: '그 밖' },
      connector: 'Claude·ChatGPT',
      bot: '자동 프로그램',
      unknown: '알 수 없음',
    },
    errors: {
      title: '브라우저 오류 (최근 30일)',
      note: '편집기가 이용자의 브라우저에서 고장 났을 때의 오류예요. 누구인지는 남기지 않아요.',
      empty: '오류가 없어요.',
      count: '{n}번',
      last: '마지막 {time}',
      version: '판 {v}',
      stack: '어디서 났는지 보기',
      clear: '모두 지우기',
      cleared: '지웠어요.',
    },
  },
  en: {
    title: 'Admin',
    description: 'Running ReelMotion: server status, members, plans, backups and alerts.',
    loading: 'Loading…',
    off: 'The app server cannot be reached right now.',
    needLogin: 'Log in with an admin email.',
    loginButton: 'Log in',
    forbidden: 'Only admins can see this page.',
    failed: 'Could not load.',
    retry: 'Try again',
    status: 'Server status',
    checkedAt: 'Checked at {time}',
    notChecked: 'Not checked yet (the app server just started).',
    ok: 'OK',
    problem: 'Problem',
    since: 'since {time}',
    checks: { web: 'Website', asr: 'Speech server', assist: 'Chat editing AI', disk: 'Disk space', backup: 'Automatic backups' },
    numbers: 'Numbers',
    users: 'Members',
    newThisMonth: '{n} new this month',
    plans: 'Plans',
    exportsThisMonth: 'Exports this month',
    settings: 'Settings',
    limitsOn: 'Plan limits on',
    limitsOff: 'Plan limits off (beta — everything free)',
    billingOn: 'Card payments connected',
    billingOff: 'Card payments not connected yet',
    googleOn: 'Google login on',
    googleOff: 'Google login off (domain and OAuth not set up)',
    connectorOn: 'Claude and ChatGPT connector on',
    connectorOff: 'Claude and ChatGPT connector off (CONNECTOR=0)',
    people: 'People',
    search: 'Email or name',
    searchButton: 'Search',
    recent: 'Latest 20 sign-ups',
    noResults: 'No one found.',
    email: 'Email',
    name: 'Name',
    plan: 'Plan',
    joined: 'Joined',
    exports: 'Exports this month',
    projects: 'Projects',
    until: 'until {date}',
    change: 'Change plan',
    days: 'days',
    save: 'Save',
    cancel: 'Cancel',
    saved: '{email} is now on {plan}.',
    planErrors: {
      no_user: 'No one has signed up with that email.',
      bad_plan: 'That plan is not valid.',
      bad_days: 'Enter the number of days as a whole number of 1 or more.',
      failed: 'Could not change the plan. Please try again.',
    },
    backups: 'Backups',
    backupsBody: 'The server makes one a day and keeps it for 7 days. Download one every week and keep it somewhere else; delete downloaded backups after 30 days (privacy policy).',
    noBackups: 'No backups yet.',
    download: 'Download',
    alerts: 'Outage alerts',
    alertsTo: 'Sent to: {email}',
    mailOn: 'Sending mail is set up',
    mailOff: 'Sending mail is not set up — alerts only go to the app log. Add a sending mail account as described in “Outage alerts” in the operations guide.',
    testMail: 'Send a test mail',
    testSent: 'Sent to {email}. Check the inbox and the spam folder.',
    testNotSetUp: 'There is no sending mail account, so nothing can be sent.',
    testFailed: 'Could not send: {message}',
    account: 'Admin',
    notice: 'Notice',
    noticeBody: 'Shown at the top of the site and the editor. Each visitor can dismiss it; saving again shows it again to everyone.',
    noticeOn: 'Show the notice',
    noticeLevel: 'Style',
    levelInfo: 'Info',
    levelWarning: 'Warning (yellow)',
    noticeLangs: { ko: '한국어', en: 'English', ja: '日本語' },
    noticeHint: 'Up to 300 characters per language. A language left empty shows the English, Korean or Japanese text, in that order.',
    noticeSave: 'Save notice',
    noticeSaved: 'Saved.',
    noticeErrors: { empty: 'Write the notice in at least one language to show it.', too_long: 'Each language can have up to 300 characters.', failed: 'Could not save. Please try again.' },
    noticeUpdated: 'Last saved: {time}',
    pulse: {
      title: 'Usage (last 7 days)',
      note: 'Counts per day only, with no record of who. Days are in Seoul time.',
      what: 'What',
      total: 'Total',
      bots: '{n} from automated programs such as search crawlers are left out.',
      empty: 'Nothing recorded yet.',
      exportsTitle: 'Exports by browser',
      browser: 'Browser',
      started: 'Started',
      done: 'Finished',
      failed: 'Failed',
      unsupported: 'Not supported',
      events: {
        editor_open: 'Editor opened',
        video_added: 'Video added',
        sample_opened: 'Sample opened',
        draft_opened: 'Opened from a connector link',
        transcribe_ok: 'Transcribed',
        transcribe_failed: 'Transcription failed',
        graphics_made: 'Graphics made',
        export_started: 'Export started',
        export_done: 'Export finished',
        export_failed: 'Export failed',
        export_unsupported: 'Export not supported',
        chat_edit: 'Chat edits',
        ai_highlights: 'AI moment finder',
        connector_plan: 'Connector: plans',
        connector_link: 'Connector: links',
      },
      families: { chrome: 'Chrome', safari: 'Safari', firefox: 'Firefox', edge: 'Edge', samsung: 'Samsung Internet', opera: 'Opera', whale: 'Whale', inapp: 'In-app browser', other: 'Other' },
      systems: { windows: 'Windows', mac: 'Mac', ios: 'iPhone & iPad', android: 'Android', chromeos: 'Chromebook', linux: 'Linux', other: 'Other' },
      connector: 'Claude & ChatGPT',
      bot: 'Automated program',
      unknown: 'Unknown',
    },
    errors: {
      title: 'Browser errors (last 30 days)',
      note: 'Errors from when the editor broke in someone’s browser. There is no record of who.',
      empty: 'No errors.',
      count: '{n} times',
      last: 'last {time}',
      version: 'build {v}',
      stack: 'Show where it happened',
      clear: 'Clear all',
      cleared: 'Cleared.',
    },
  },
  ja: {
    title: '管理画面',
    description: 'ReelMotion の運営: サーバーの状態、会員、プラン、バックアップ、アラート。',
    loading: '読み込み中…',
    off: '今はアプリサーバーにつながりません。',
    needLogin: '管理者のメールでログインしてください。',
    loginButton: 'ログイン',
    forbidden: '管理者だけが見られます。',
    failed: '読み込めませんでした。',
    retry: 'もう一度読み込む',
    status: 'サーバーの状態',
    checkedAt: '{time}に確認',
    notChecked: 'まだ確認していません(アプリサーバーが起動したばかりです)。',
    ok: '正常',
    problem: '問題あり',
    since: '{time}から',
    checks: { web: 'ウェブサイト', asr: '文字起こしサーバー', assist: '話して直す AI', disk: 'ディスク容量', backup: '自動バックアップ' },
    numbers: '数字',
    users: '会員',
    newThisMonth: '今月の新規 {n}人',
    plans: 'プラン',
    exportsThisMonth: '今月の書き出し',
    settings: '設定',
    limitsOn: 'プランの上限 オン',
    limitsOff: 'プランの上限 オフ(ベータ — すべて無料)',
    billingOn: 'カード決済 接続済み',
    billingOff: 'カード決済 未接続',
    googleOn: 'Google ログイン オン',
    googleOff: 'Google ログイン オフ(ドメイン・OAuth 未設定)',
    connectorOn: 'Claude・ChatGPT コネクター オン',
    connectorOff: 'Claude・ChatGPT コネクター オフ(CONNECTOR=0)',
    people: '会員を探す',
    search: 'メールまたは名前',
    searchButton: '探す',
    recent: '最近の登録 20人',
    noResults: '見つかりませんでした。',
    email: 'メール',
    name: '名前',
    plan: 'プラン',
    joined: '登録',
    exports: '今月の書き出し',
    projects: 'プロジェクト',
    until: '{date}まで',
    change: 'プランを変える',
    days: '日',
    save: '保存',
    cancel: 'やめる',
    saved: '{email} を{plan}にしました。',
    planErrors: {
      no_user: 'そのメールで登録した人はいません。',
      bad_plan: 'プランが正しくありません。',
      bad_days: '日数は1以上の整数で入力してください。',
      failed: '変更できませんでした。もう一度お試しください。',
    },
    backups: 'バックアップ',
    backupsBody: 'サーバーが1日に1つ作り、7日間残します。毎週1つダウンロードして別の場所に置き、ダウンロードしたバックアップは30日を過ぎたら削除してください(プライバシーポリシー)。',
    noBackups: 'まだバックアップがありません。',
    download: 'ダウンロード',
    alerts: '障害アラート',
    alertsTo: '送り先: {email}',
    mailOn: 'メール送信 設定済み',
    mailOff: 'メール送信 未設定 — アラートはアプリの記録にだけ残ります。運用ガイドの「障害アラート」に従って送信用のメールアカウントを入れてください。',
    testMail: 'テストメールを送る',
    testSent: '{email} に送りました。受信トレイと迷惑メールフォルダを確認してください。',
    testNotSetUp: '送信用のメールアカウントがないため送れません。',
    testFailed: '送れませんでした: {message}',
    account: '管理画面',
    notice: 'お知らせ',
    noticeBody: 'サイトとエディターの一番上に表示されます。見た人はそれぞれ閉じられ、保存し直すと閉じた人にも再び表示されます。',
    noticeOn: 'お知らせを表示する',
    noticeLevel: '見た目',
    levelInfo: 'お知らせ',
    levelWarning: '注意(黄色)',
    noticeLangs: { ko: '한국어', en: 'English', ja: '日本語' },
    noticeHint: '言語ごとに300文字まで。空の言語には、英語 → 韓国語 → 日本語の順で書かれた文が表示されます。',
    noticeSave: 'お知らせを保存',
    noticeSaved: '保存しました。',
    noticeErrors: { empty: 'お知らせを表示するには、1つ以上の言語で文を書いてください。', too_long: '言語ごとに300文字まで書けます。', failed: '保存できませんでした。もう一度お試しください。' },
    noticeUpdated: '最後の保存: {time}',
    pulse: {
      title: '利用状況(直近7日)',
      note: '誰が行ったかは記録せず、日ごとの回数だけを数えます。日付はソウル時間です。',
      what: '内容',
      total: '合計',
      bots: '検索ロボットなどの自動プログラム {n} 回は除いています。',
      empty: 'まだ記録がありません。',
      exportsTitle: 'ブラウザ別の書き出し',
      browser: 'ブラウザ',
      started: '開始',
      done: '完了',
      failed: '失敗',
      unsupported: '非対応',
      events: {
        editor_open: 'エディターを開いた',
        video_added: '動画を追加',
        sample_opened: 'サンプルを開いた',
        draft_opened: 'コネクターのリンクから開いた',
        transcribe_ok: '文字起こし成功',
        transcribe_failed: '文字起こし失敗',
        graphics_made: 'グラフィック作成',
        export_started: '書き出し開始',
        export_done: '書き出し完了',
        export_failed: '書き出し失敗',
        export_unsupported: '書き出し非対応',
        chat_edit: '話して直す',
        ai_highlights: 'AIで見せ場を探す',
        connector_plan: 'コネクター: 計画',
        connector_link: 'コネクター: リンク',
      },
      families: { chrome: 'Chrome', safari: 'Safari', firefox: 'Firefox', edge: 'Edge', samsung: 'Samsung Internet', opera: 'Opera', whale: 'Whale', inapp: 'アプリ内ブラウザ', other: 'その他' },
      systems: { windows: 'Windows', mac: 'Mac', ios: 'iPhone・iPad', android: 'Android', chromeos: 'Chromebook', linux: 'Linux', other: 'その他' },
      connector: 'Claude・ChatGPT',
      bot: '自動プログラム',
      unknown: '不明',
    },
    errors: {
      title: 'ブラウザのエラー(直近30日)',
      note: '利用者のブラウザでエディターが壊れたときのエラーです。誰かは記録しません。',
      empty: 'エラーはありません。',
      count: '{n}回',
      last: '最後 {time}',
      version: 'ビルド {v}',
      stack: '発生箇所を見る',
      clear: 'すべて消す',
      cleared: '消しました。',
    },
  },
}
