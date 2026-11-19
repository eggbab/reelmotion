import { CONTACT_KINDS, MAX_BODY, MAX_EMAIL, charCount, isContactKind, isEmail } from '../../src/site/contact/rules'
import type { ContactKind } from '../../src/site/contact/rules'
import type { Db } from './db'

/**
 * 문의하기(/contact): 방문자가 남긴 질문·고장 신고·제안·요금제 문의를 받아 두고 운영자에게 알린다(관리자 화면의 「문의」 칸·알림 메일).
 * 받는 것: 종류, 내용, 답장 받을 메일(적었을 때만), 화면 언어, 어느 쪽에서 왔는지(물음표 뒤 제외). 계정·IP 는 함께 남기지 않는다
 * (남용 막기로 IP 를 메모리에 10분까지 — app.ts). 3년 두고 지운다(전자상거래법의 소비자 불만·분쟁 처리 기록).
 * 알림 메일에는 문의 내용과 메일 주소를 넣지 않는다(번호·종류만 — 장애 알림과 같은 원칙, watch.ts). 운영자는 관리자 화면에서 읽고 답한다.
 * 바꾸면 개인정보처리방침(src/site/legal/privacy.ts)도.
 */
export { CONTACT_KINDS, MAX_BODY, MAX_EMAIL }
export type { ContactKind }

/** 보낸 몸체의 크기 한도(글 2,000자가 모두 4바이트 글자여도 들어가게) */
export const MAX_CONTACT_BYTES = 16_000
export const KEEP_DAYS = 3 * 365
/** 한 곳(IP)에서 10분에, 그리고 모두 합쳐 하루에 받는 수 */
export const CONTACT_PER_VISITOR = 5
export const CONTACT_WINDOW = 10 * 60 * 1000
export const CONTACT_PER_DAY = 200
/** 알림 메일은 하루(24시간)에 이만큼까지 — 마지막 것에 그렇다고 적는다. 그 뒤 문의도 관리자 화면에는 다 있다. */
export const CONTACT_MAILS_PER_DAY = 20
const DAY = 24 * 60 * 60 * 1000

export type ContactMessage = { kind: ContactKind; body: string; email: string | null; lang: string; page: string }
export type ContactRow = ContactMessage & { id: number; createdAt: number; doneAt: number | null }

/**
 * 보낸 값을 읽는다. 틀리면 null, 사람이 아닌 것(숨긴 칸 website 를 채움)은 'bot' — 받은 척하고 버린다.
 * 내용의 줄바꿈은 두고 앞뒤 빈칸만 지운다.
 */
export function parseContact(raw: unknown): ContactMessage | 'bot' | null {
  if (typeof raw !== 'object' || raw === null) return null
  const value = raw as Record<string, unknown>
  if (typeof value.website === 'string' && value.website.trim() !== '') return 'bot'
  if (!isContactKind(value.kind)) return null
  if (typeof value.body !== 'string') return null
  // 줄바꿈·탭 말고 보이지 않는 조절 글자는 지운다
  const body = value.body
    .replace(/\r\n?/g, '\n')
    // oxlint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .trim()
  if (body === '' || charCount(body) > MAX_BODY) return null
  let email: string | null = null
  if (typeof value.email === 'string' && value.email.trim() !== '') {
    email = value.email.trim()
    if (!isEmail(email)) return null
  }
  const lang = value.lang === 'ko' || value.lang === 'ja' ? value.lang : 'en'
  const page = typeof value.page === 'string' && value.page.startsWith('/') ? value.page.split(/[?#]/)[0].slice(0, 200) : ''
  return { kind: value.kind, body, email, lang, page }
}

type Row = { id: number; created_at: number; kind: string; body: string; email: string | null; lang: string; page: string; done_at: number | null }
const toRow = (row: Row): ContactRow => ({ id: row.id, createdAt: row.created_at, kind: row.kind as ContactKind, body: row.body, email: row.email, lang: row.lang, page: row.page, doneAt: row.done_at })

export function createInbox({ db, now }: { db: Db; now: () => number }) {
  return {
    add(message: ContactMessage): number {
      const result = db
        .prepare('insert into contact_messages (created_at, kind, body, email, lang, page) values (?, ?, ?, ?, ?, ?)')
        .run(now(), message.kind, message.body, message.email, message.lang, message.page)
      return Number(result.lastInsertRowid)
    },
    /** 최근 것부터 */
    list(limit = 100): ContactRow[] {
      return (db.prepare('select * from contact_messages order by created_at desc, id desc limit ?').all(limit) as Row[]).map(toRow)
    },
    /** 답했다고 표시(또는 되돌리기). 없는 번호면 false */
    setDone(id: number, done: boolean): boolean {
      const result = db.prepare('update contact_messages set done_at = ? where id = ?').run(done ? now() : null, id)
      return Number(result.changes) > 0
    },
    open(): number {
      return (db.prepare('select count(*) as count from contact_messages where done_at is null').get() as { count: number }).count
    },
    /** 오늘(지난 24시간) 받은 수 — 모두 합친 하루 한도 */
    today(): number {
      return (db.prepare('select count(*) as count from contact_messages where created_at > ?').get(now() - DAY) as { count: number }).count
    },
    /** 지우기(관리자 — 잘못 온 것, 지워 달라는 요청). 없는 번호면 false */
    remove(id: number): boolean {
      return Number(db.prepare('delete from contact_messages where id = ?').run(id).changes) > 0
    },
    prune: () => pruneContacts(db, now()),
  }
}

/** 3년 지난 문의를 지운다(받을 때와 한 시간마다 — main.ts) */
export function pruneContacts(db: Db, now: number): number {
  return Number(db.prepare('delete from contact_messages where created_at < ?').run(now - KEEP_DAYS * DAY).changes)
}

const KIND_KO: Record<ContactKind, string> = { question: '질문', bug: '고장 신고', idea: '제안', billing: '요금제·결제' }

/**
 * 운영자에게 가는 알림 메일. 문의한 분의 정보(내용·메일 주소)는 넣지 않는다 — 메일은 바깥 메일 서비스를 거치기 때문.
 * last: 오늘 보내는 마지막 알림(CONTACT_MAILS_PER_DAY)
 */
export function contactAlert(options: { id: number; kind: ContactKind; hasEmail: boolean; adminUrl: string; last: boolean }): { subject: string; text: string } {
  const kind = KIND_KO[options.kind]
  return {
    subject: `[ReelMotion] 새 문의 #${options.id} · ${kind}`,
    text: [
      `새 문의가 왔어요(#${options.id} · ${kind} · 답장 받을 메일 ${options.hasEmail ? '있음' : '없음'}).`,
      `관리자 화면의 「문의」 칸에서 읽고 답해 주세요: ${options.adminUrl}`,
      '',
      '이 메일에는 문의한 분의 내용과 메일 주소를 넣지 않았어요.',
      ...(options.last ? ['', `오늘은 알림 메일을 ${CONTACT_MAILS_PER_DAY}통 보내서 더 보내지 않아요. 그 뒤에 오는 문의도 관리자 화면에는 모두 있어요.`] : []),
    ].join('\n'),
  }
}
