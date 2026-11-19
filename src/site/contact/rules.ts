/**
 * 문의하기의 규칙 — 쪽(ContactPage)과 서버(server/app/inbox.ts)가 함께 쓴다.
 */
export const CONTACT_KINDS = ['question', 'bug', 'idea', 'billing'] as const
export type ContactKind = (typeof CONTACT_KINDS)[number]

/** 내용은 2,000자(글자 단위 — 그림 글자 하나도 한 자)까지 */
export const MAX_BODY = 2000
export const MAX_EMAIL = 200

const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:".]+(\.[^\s@<>()[\]\\,;:".]+)+$/

/** 메일 주소 꼴인지(보낼 수 있는 주소인지는 답장을 보내 봐야 안다). 빈칸·줄바꿈이 든 것은 받지 않는다 */
export const isEmail = (value: string) => value.length <= MAX_EMAIL && EMAIL.test(value)

export const isContactKind = (value: unknown): value is ContactKind => CONTACT_KINDS.includes(value as ContactKind)

/** 글자 수(보이는 글자 하나 = 1) */
export const charCount = (text: string) => [...text].length
