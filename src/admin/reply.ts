import type { Lang } from '../langs'

/** 관리자 화면의 「메일로 답하기」: 문의한 분의 언어로 된 제목과, 문의 앞부분을 인용한 답장을 메일 프로그램에서 연다. */
export const QUOTE_CHARS = 150

const SUBJECT: Record<Lang, string> = {
  en: 'Re: your message to ReelMotion (#{id})',
  ko: 'Re: ReelMotion 문의 (#{id})',
  ja: 'Re: ReelMotion へのお問い合わせ (#{id})',
}

export function replySubject(id: number, lang: string): string {
  return (SUBJECT[lang as Lang] ?? SUBJECT.en).replace('{id}', String(id))
}

/**
 * mailto 주소. 인용은 앞 150자까지 — 메일 프로그램(아웃룩 등)은 너무 긴 mailto 를 열지 못한다.
 * 메일 주소는 서버가 꼴을 확인했지만(빈칸·<>·줄바꿈 없음) ?·&·#·% 는 주소 안에 있을 수 있어 바꿔 적는다.
 */
export function replyLink(email: string, id: number, lang: string, body: string): string {
  const chars = [...body]
  const quote = chars.slice(0, QUOTE_CHARS).join('') + (chars.length > QUOTE_CHARS ? '…' : '')
  const quoted = quote
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n')
  const address = email.replace(/[?&#%]/g, (char) => encodeURIComponent(char))
  return `mailto:${address}?subject=${encodeURIComponent(replySubject(id, lang))}&body=${encodeURIComponent(`\n\n${quoted}`)}`
}
