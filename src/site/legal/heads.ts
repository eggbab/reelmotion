import type { Lang } from '../../langs'
import { REFUND_PENALTY_PERCENT as FEE, REFUND_WINDOW_DAYS as WINDOW } from './refund-math'
import type { LegalPageId } from './types'

/**
 * 약관·정책·도움말·라이선스 쪽의 제목과 설명(탭 제목·검색 결과·바닥글 링크)과 그 쪽들이 함께 쓰는 작은 글.
 * 모든 쪽이 처음부터 받는 작은 파일이다 — 글 전체(privacy.ts·terms.ts·refund.ts·help.ts·credits.ts)는 그 쪽을 열 때만 받는다
 * (App.tsx 의 lazyPage). 그래서 바닥글·쪽 제목(meta.ts)·문의하기는 글 전체가 아니라 여기서 가져다 쓴다.
 * 글 파일은 제목·설명을 여기서 가져다 펼친다(`...DOC_HEADS.privacy.ko`).
 */
export type DocHead = { title: string; description: string }
export type DocId = LegalPageId | 'help' | 'licenses'

export const DOC_HEADS: Record<DocId, Record<Lang, DocHead>> = {
  help: {
    ko: {
      title: '도움말',
      description: 'ReelMotion 쓰는 법 — 영상 넣기, 말 받아쓰기, 그래픽 만들기와 고치기, 스타일, MP4 내보내기, 내 작업 저장.',
    },
    en: {
      title: 'Help',
      description: 'How to use ReelMotion — add a video, transcribe it, make and edit graphics, pick a style, export an MP4 and keep your projects.',
    },
    ja: {
      title: 'ヘルプ',
      description: 'ReelMotion の使い方 — 動画を入れる、声を書き起こす、グラフィックスを作って直す、スタイル、MP4 の書き出し、マイプロジェクト。',
    },
  },
  terms: {
    ko: {
      title: '이용약관',
      description: 'ReelMotion 이용약관 — 서비스 내용, 영상과 결과물의 권리, 금지 행위, 이용 한도, 약관 변경, 책임의 한계를 정합니다.',
    },
    en: {
      title: 'Terms of Service',
      description: 'ReelMotion Terms of Service — what the service does, who owns your videos, what is not allowed, usage limits, changes and limits of liability.',
    },
    ja: {
      title: '利用規約',
      description: 'ReelMotion 利用規約 — サービスの内容、動画と作成物の権利、禁止事項、利用上限、規約の変更、責任の範囲を定めます。',
    },
  },
  privacy: {
    ko: {
      title: '개인정보처리방침',
      description: 'ReelMotion 개인정보처리방침 — 영상은 올리지 않고, 받아 적은 소리는 저장하지 않으며, 접속 기록을 남기지 않습니다. 처리하는 정보와 보유 기간, 이용자의 권리를 안내합니다.',
    },
    en: {
      title: 'Privacy Policy',
      description: 'ReelMotion Privacy Policy — videos are never uploaded, the sound we transcribe is not kept, and we keep no access logs. What we process, for how long, and your rights.',
    },
    ja: {
      title: 'プライバシーポリシー',
      description: 'ReelMotion プライバシーポリシー — 動画はアップロードせず、文字起こしした音声は保存せず、アクセス記録も残しません。扱う情報、保存期間、利用者の権利をご案内します。',
    },
  },
  refund: {
    ko: {
      title: '환불 규정',
      description: `ReelMotion 유료 요금제의 환불 기준 — 결제한 날부터 ${WINDOW}일 안에는 전액, 그 뒤에는 쓴 기간과 위약금 ${FEE}%를 빼고 돌려 드립니다.`,
    },
    en: {
      title: 'Refund Policy',
      description: `Refunds for ReelMotion paid plans — a full refund within ${WINDOW} days of payment; after that, the used period and a ${FEE}% fee are deducted.`,
    },
    ja: {
      title: '返金ポリシー',
      description: `ReelMotion 有料プランの返金基準 — お支払いから${WINDOW}日以内は全額、その後は利用期間と違約金${FEE}%を差し引いて返金します。`,
    },
  },
  licenses: {
    ko: {
      title: '오픈소스 라이선스',
      description: 'ReelMotion 이 쓰는 글꼴, AI 모델, 예시 영상, 공개 프로그램과 그 사용 허가입니다.',
    },
    en: {
      title: 'Open-source licenses',
      description: 'The fonts, AI models, sample videos and open-source software ReelMotion uses, and their licenses.',
    },
    ja: {
      title: 'オープンソースライセンス',
      description: 'ReelMotion が使うフォント、AI モデル、サンプル動画、オープンソースソフトウェアとそのライセンスです。',
    },
  },
}

export const LEGAL_PAGES: readonly LegalPageId[] = ['terms', 'privacy', 'refund']

export const HELP_EYEBROW: Record<Lang, string> = { ko: '쓰는 법', en: 'HOW IT WORKS', ja: '使い方' }

/** account·pricing 은 글 속 {account}·{pricing} 링크의 글자 */
export const LEGAL_UI: Record<Lang, { eyebrow: string; effective: string; translation: string; original: string; contactPending: string; account: string; pricing: string }> = {
  ko: {
    eyebrow: '약관과 정책',
    effective: '시행일',
    translation: '',
    original: '',
    contactPending: '문의 메일(정식 공개 전에 이 자리에 적습니다)',
    account: '내 계정',
    pricing: '요금 안내',
  },
  en: {
    eyebrow: 'LEGAL',
    effective: 'Effective',
    translation: 'This is a translation of the Korean original. If they differ, the Korean original applies.',
    original: 'Read the Korean original',
    contactPending: 'our contact email (listed here before launch)',
    account: 'My account',
    pricing: 'pricing',
  },
  ja: {
    eyebrow: '規約とポリシー',
    effective: '施行日',
    translation: 'これは韓国語原文の翻訳です。内容が異なる場合は、韓国語の原文に従います。',
    original: '韓国語の原文を読む',
    contactPending: 'お問い合わせ用メール(正式公開前にここに記載します)',
    account: 'マイアカウント',
    pricing: '料金案内',
  },
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** 'YYYY-MM-DD' 를 그 언어의 날짜 글로. 시간대에 따라 하루가 밀리지 않게 직접 나눈다. */
export function formatDate(iso: string, lang: Lang): string {
  const [year, month, day] = iso.split('-').map(Number)
  if (lang === 'ko') return `${year}년 ${month}월 ${day}일`
  if (lang === 'ja') return `${year}年${month}月${day}日`
  return `${MONTHS[month - 1]} ${day}, ${year}`
}
