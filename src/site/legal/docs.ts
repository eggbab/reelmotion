import type { Lang } from '../../langs'
import { PRIVACY } from './privacy'
import { REFUND } from './refund'
import { TERMS } from './terms'
import type { LegalDocs, LegalPageId } from './types'

// 쪽 제목·바닥글이 쓰는 작은 글은 heads.ts 에 있다(첫 화면이 이 큰 파일을 받지 않게). 예전 이름으로도 부를 수 있게 다시 내보낸다.
export { LEGAL_PAGES, LEGAL_UI, formatDate } from './heads'

export const LEGAL_DOCS: Record<LegalPageId, LegalDocs> = { terms: TERMS, privacy: PRIVACY, refund: REFUND }

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
