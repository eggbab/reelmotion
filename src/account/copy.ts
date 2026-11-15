import type { Lang } from '../langs'

export type AccountCopy = {
  title: string
  loginTitle: string
  loginBody: string
  google: string
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
}

export const ACCOUNT_COPY: Record<Lang, AccountCopy> = {
  en: {
    title: 'My account',
    loginTitle: 'Log in',
    loginBody: 'Log in to open your projects on any device. Your video files are never uploaded — only the project (script, graphics and style) is kept with your account.',
    google: 'Continue with Google',
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
  },
  ko: {
    title: '내 계정',
    loginTitle: '로그인',
    loginBody: '로그인하면 만든 작업을 어느 기기에서나 열 수 있어요. 영상 파일은 올리지 않고, 작업(대본·그래픽·스타일)만 계정에 저장돼요.',
    google: 'Google로 계속하기',
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
  },
  ja: {
    title: 'マイアカウント',
    loginTitle: 'ログイン',
    loginBody: 'ログインすると、作ったプロジェクトをどの端末でも開けます。動画ファイルはアップロードせず、プロジェクト(台本・グラフィックス・スタイル)だけをアカウントに保存します。',
    google: 'Google で続ける',
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
  },
}
