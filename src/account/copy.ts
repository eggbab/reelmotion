import type { Lang } from '../langs'

export type AccountCopy = {
  title: string
  loginTitle: string
  loginBody: string
  google: string
  /** 로그인 단추 아래: 약관·방침에 동의하는 것으로 본다({terms}·{privacy} 자리에 링크) */
  consent: string
  notReady: string
  off: string
  failed: string
  cancelled: string
  devTitle: string
  devEmail: string
  devName: string
  devButton: string
  profile: string
  name: string
  email: string
  joined: string
  plan: string
  planBeta: string
  planUntil: string
  openEditor: string
  logout: string
  /** 내 정보 내려받기(GET /api/me/export) */
  data: string
  dataBody: string
  dataButton: string
  danger: string
  dangerBody: string
  deleteButton: string
  deleteConfirm: string
  deleted: string
  loginButton: string
  account: string
  loading: string
  synced: string
  syncFailed: string
  syncStale: string
  /** 요금제·사용량·결제 */
  usage: string
  usageBeta: string
  current: string
  choose: string
  billingSoon: string
  checkoutFailed: string
  checkoutDone: string
  manage: string
  refundLink: string
  backToWork: string
  backToEditor: string
}

export const ACCOUNT_COPY: Record<Lang, AccountCopy> = {
  en: {
    title: 'My account',
    loginTitle: 'Log in',
    loginBody: 'Log in to open your projects on any device. Your video files are never uploaded — only the project (script, graphics and style) is kept with your account.',
    google: 'Continue with Google',
    consent: 'By continuing with Google, you agree to the {terms} and the {privacy}. You can use the editor without logging in.',
    notReady: 'Login is not open yet. For now your projects are saved in this browser without an account.',
    off: 'Accounts are unavailable right now. The editor works without logging in.',
    failed: 'We could not log you in. Please try again.',
    cancelled: 'You cancelled the login.',
    devTitle: 'Test login (development only)',
    devEmail: 'Email',
    devName: 'Name',
    devButton: 'Log in',
    profile: 'Profile',
    name: 'Name',
    email: 'Email',
    joined: 'Joined',
    plan: 'Plan',
    planBeta: 'Every feature is free during the beta.',
    planUntil: 'until {date}',
    openEditor: 'Open the editor',
    logout: 'Log out',
    data: 'Your data',
    dataBody: 'Download your account details, plan, monthly export counts, login times and the projects kept in your account as one file (JSON). Videos are not on our servers, so they are not included.',
    dataButton: 'Download my data',
    danger: 'Delete account',
    dangerBody: 'Deleting your account removes it and the projects kept with it right away. This cannot be undone. Projects saved in this browser stay here.',
    deleteButton: 'Delete my account',
    deleteConfirm: 'Are you sure? Press again to delete.',
    deleted: 'Your account has been deleted. Thank you for trying ReelMotion.',
    loginButton: 'Log in',
    account: 'My account',
    loading: 'Loading…',
    synced: 'Saved in this browser and your account',
    syncFailed: 'Saved in this browser · not in your account yet',
    syncStale: 'A newer version from another device is in your account — reopen it from My projects',
    usage: 'Exports this month: {used} of {limit}',
    usageBeta: 'Exports this month: {used} · no limits during the beta',
    current: 'Your plan',
    choose: 'Switch to {plan}',
    billingSoon: 'Card payments open soon.',
    checkoutFailed: 'We could not open the payment page. Please try again.',
    checkoutDone: 'Thank you. Your new plan shows up here once the payment is confirmed — refresh in a moment if it has not changed yet.',
    manage: 'To cancel a paid plan or ask for a refund, see the refund policy.',
    refundLink: 'Refund policy',
    backToWork: 'After you log in, you will go back to your project.',
    backToEditor: 'Back to your project',
  },
  ko: {
    title: '내 계정',
    loginTitle: '로그인',
    loginBody: '로그인하면 만든 작업을 어느 기기에서나 열 수 있어요. 영상 파일은 올리지 않고, 작업(대본·그래픽·스타일)만 계정에 저장돼요.',
    google: 'Google로 계속하기',
    consent: 'Google로 계속하면 {terms}과 {privacy}에 동의하는 것으로 봐요. 로그인하지 않아도 편집기는 쓸 수 있어요.',
    notReady: '로그인은 준비 중이에요. 지금은 로그인 없이 이 브라우저에 저장돼요.',
    off: '지금은 계정 기능을 쓸 수 없어요. 편집기는 로그인 없이 쓸 수 있어요.',
    failed: '로그인하지 못했어요. 다시 시도해 주세요.',
    cancelled: '로그인을 취소했어요.',
    devTitle: '시험용 로그인(개발 전용)',
    devEmail: '메일',
    devName: '이름',
    devButton: '들어가기',
    profile: '계정 정보',
    name: '이름',
    email: '메일',
    joined: '가입한 날',
    plan: '요금제',
    planBeta: '베타 기간에는 모든 기능을 무료로 써요.',
    planUntil: '{date}까지',
    openEditor: '편집기 열기',
    logout: '로그아웃',
    data: '내 정보',
    dataBody: '계정 정보, 요금제, 달마다 내보낸 횟수, 로그인 기록(시각), 계정에 저장한 작업을 한 파일(JSON)로 내려받아요. 영상은 서버에 없어서 들어 있지 않아요.',
    dataButton: '내 정보 내려받기',
    danger: '탈퇴',
    dangerBody: '탈퇴하면 계정과 계정에 저장된 작업이 바로 지워지고 되돌릴 수 없어요. 이 브라우저에 저장된 작업은 남아요.',
    deleteButton: '탈퇴하기',
    deleteConfirm: '정말 탈퇴할까요? 한 번 더 누르면 지워져요.',
    deleted: '탈퇴했어요. 그동안 ReelMotion 을 써 주셔서 고마워요.',
    loginButton: '로그인',
    account: '내 계정',
    loading: '불러오는 중…',
    synced: '이 브라우저와 계정에 저장됨',
    syncFailed: '이 브라우저에 저장됨 · 계정에는 아직',
    syncStale: '다른 기기에서 더 나중에 고친 판이 계정에 있어요 — 「내 작업」에서 다시 여세요',
    usage: '이번 달 내보내기 {used}/{limit}번',
    usageBeta: '이번 달 내보내기 {used}번 · 베타 동안은 한도 없음',
    current: '지금 요금제',
    choose: '{plan} 요금제로 바꾸기',
    billingSoon: '카드 결제는 곧 열려요.',
    checkoutFailed: '결제 화면을 열지 못했어요. 다시 시도해 주세요.',
    checkoutDone: '고마워요. 결제가 확인되면 바뀐 요금제가 여기 보여요. 아직 그대로면 잠시 뒤 새로 고침해 주세요.',
    manage: '유료 요금제를 해지하거나 환불받으려면 환불 정책을 보세요.',
    refundLink: '환불 정책',
    backToWork: '로그인하면 하던 작업으로 돌아가요.',
    backToEditor: '하던 작업으로 돌아가기',
  },
  ja: {
    title: 'マイアカウント',
    loginTitle: 'ログイン',
    loginBody: 'ログインすると、作ったプロジェクトをどの端末でも開けます。動画ファイルはアップロードせず、プロジェクト(台本・グラフィックス・スタイル)だけをアカウントに保存します。',
    google: 'Google で続ける',
    consent: 'Google で続けると、{terms}と{privacy}に同意したものとみなします。ログインしなくてもエディターは使えます。',
    notReady: 'ログインは準備中です。今はログインなしでこのブラウザに保存されます。',
    off: '今はアカウント機能を使えません。エディターはログインなしで使えます。',
    failed: 'ログインできませんでした。もう一度お試しください。',
    cancelled: 'ログインをキャンセルしました。',
    devTitle: 'テスト用ログイン(開発専用)',
    devEmail: 'メール',
    devName: '名前',
    devButton: 'ログイン',
    profile: 'アカウント情報',
    name: '名前',
    email: 'メール',
    joined: '登録日',
    plan: 'プラン',
    planBeta: 'ベータ期間中はすべての機能を無料で使えます。',
    planUntil: '{date}まで',
    openEditor: 'エディターを開く',
    logout: 'ログアウト',
    data: 'あなたのデータ',
    dataBody: 'アカウント情報、プラン、月ごとの書き出し回数、ログインの記録(時刻)、アカウントに保存したプロジェクトを1つのファイル(JSON)でダウンロードします。動画はサーバーにないため含まれません。',
    dataButton: 'データをダウンロード',
    danger: '退会',
    dangerBody: '退会すると、アカウントとアカウントに保存したプロジェクトがすぐに削除され、元に戻せません。このブラウザに保存したプロジェクトは残ります。',
    deleteButton: '退会する',
    deleteConfirm: '本当に退会しますか? もう一度押すと削除されます。',
    deleted: '退会しました。ReelMotion を使っていただき、ありがとうございました。',
    loginButton: 'ログイン',
    account: 'マイアカウント',
    loading: '読み込み中…',
    synced: 'このブラウザとアカウントに保存済み',
    syncFailed: 'このブラウザに保存済み・アカウントにはまだ',
    syncStale: 'ほかの端末でより新しく直した版がアカウントにあります — 「マイプロジェクト」から開き直してください',
    usage: '今月の書き出し {used}/{limit}回',
    usageBeta: '今月の書き出し {used}回・ベータ期間中は上限なし',
    current: '現在のプラン',
    choose: '{plan}プランにする',
    billingSoon: 'カード決済はまもなく始まります。',
    checkoutFailed: '決済画面を開けませんでした。もう一度お試しください。',
    checkoutDone: 'ありがとうございます。決済が確認されると、新しいプランがここに表示されます。まだ変わっていなければ、少ししてから再読み込みしてください。',
    manage: '有料プランの解約や返金については、返金ポリシーをご覧ください。',
    refundLink: '返金ポリシー',
    backToWork: 'ログインすると、作業中のプロジェクトに戻ります。',
    backToEditor: '作業に戻る',
  },
}
