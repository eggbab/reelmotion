/**
 * 바닥글에 적는 사업자 정보. 사용자 지시(2026-11-14): 마트마트 서비스와 같은 사업자.
 * 값은 2026-11-14 martmart.kr 바닥글에서 확인했다. 문의 메일과 도메인은 사용자가 나중에 정한다.
 */
export const BUSINESS = {
  name: '브이미랩스',
  representative: '김우진',
  registrationNumber: '475-05-03832',
  mailOrderNumber: '제 2026-인천연수구-1309호',
  address: '인천광역시 연수구 옥련동 청룡로50번길 2',
  /** 호스팅서비스 제공자(전자상거래법 시행령 표시 사항). 운영 서버가 운영자 자신의 PC 라 운영자 자신이다(마트마트·AllMails 와 같다). */
  hosting: '브이미랩스',
  /**
   * 문의 메일. 사용자가 나중에 정한다(2026-11-14 「도메인이랑 메일은 나중에 할게」) — 지어내지 않는다.
   * 비어 있으면 약관·정책의 문의 자리에 「정식 공개 전에 적습니다」가 보이고, 빌드할 때 경고가 나온다(scripts/prerender.mjs).
   */
  contactEmail: null as string | null,
} as const
