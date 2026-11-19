import type { Lang } from '../langs'

/** 관리자 화면의 제목·설명(탭 제목 — src/site/meta.ts). 나머지 글(copy.ts)은 관리자 화면을 열 때만 받는다. */
export const ADMIN_HEAD: Record<Lang, { title: string; description: string }> = {
  ko: {
    title: '관리자 화면',
    description: 'ReelMotion 운영: 서버 상태, 가입자, 요금제, 백업, 알림.',
  },
  en: {
    title: 'Admin',
    description: 'Running ReelMotion: server status, members, plans, backups and alerts.',
  },
  ja: {
    title: '管理画面',
    description: 'ReelMotion の運営: サーバーの状態、会員、プラン、バックアップ、アラート。',
  },
}
