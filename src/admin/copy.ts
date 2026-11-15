import type { Lang } from '../langs'

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
  },
}
