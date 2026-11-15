import type { Lang } from '../../langs'
import { PRIVACY } from './privacy'
import { REFUND } from './refund'
import { TERMS } from './terms'
import type { LegalDocs, LegalPageId } from './types'

export const LEGAL_DOCS: Record<LegalPageId, LegalDocs> = { terms: TERMS, privacy: PRIVACY, refund: REFUND }

export const LEGAL_PAGES: readonly LegalPageId[] = ['terms', 'privacy', 'refund']

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

/** 개인정보 침해 신고·상담 기관(같은 사업자의 AllMails 개인정보처리방침과 같다). */
export const AGENCIES: { name: Record<Lang, string>; site: string; phone: Record<Lang, string> }[] = [
  {
    name: { ko: '개인정보침해신고센터', en: 'Personal Information Infringement Report Center (KISA)', ja: '個人情報侵害申告センター(KISA)' },
    site: 'privacy.kisa.or.kr',
    phone: { ko: '국번 없이 118', en: '118 (within Korea)', ja: '118(韓国国内)' },
  },
  {
    name: { ko: '개인정보분쟁조정위원회', en: 'Personal Information Dispute Mediation Committee', ja: '個人情報紛争調停委員会' },
    site: 'www.kopico.go.kr',
    phone: { ko: '1833-6972', en: '1833-6972', ja: '1833-6972' },
  },
  {
    name: { ko: '대검찰청', en: 'Supreme Prosecutors’ Office', ja: '大検察庁' },
    site: 'www.spo.go.kr',
    phone: { ko: '국번 없이 1301', en: '1301 (within Korea)', ja: '1301(韓国国内)' },
  },
  {
    name: { ko: '경찰청', en: 'Korean National Police Agency', ja: '警察庁' },
    site: 'ecrm.police.go.kr',
    phone: { ko: '국번 없이 182', en: '182 (within Korea)', ja: '182(韓国国内)' },
  },
]

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** 'YYYY-MM-DD' 를 그 언어의 날짜 글로. 시간대에 따라 하루가 밀리지 않게 직접 나눈다. */
export function formatDate(iso: string, lang: Lang): string {
  const [year, month, day] = iso.split('-').map(Number)
  if (lang === 'ko') return `${year}년 ${month}월 ${day}일`
  if (lang === 'ja') return `${year}年${month}月${day}日`
  return `${MONTHS[month - 1]} ${day}, ${year}`
}
