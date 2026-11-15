import { createHash, randomBytes } from 'node:crypto'
import type { Db, UserRow } from './db'

/** 로그인 유지: 30일, 하루에 한 번 늘린다. 쿠키에는 무작위 토큰, 저장소에는 그 해시만 둔다(저장소가 새어도 쿠키를 만들 수 없게). */
export const SESSION_COOKIE = 'rm_session'
export const SESSION_DAYS = 30
const DAY = 24 * 60 * 60 * 1000

export const newToken = () => randomBytes(32).toString('base64url')
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

export function createSession(db: Db, userId: string, now: number): string {
  const token = newToken()
  db.prepare('insert into sessions (token_hash, user_id, created_at, expires_at) values (?, ?, ?, ?)').run(hashToken(token), userId, now, now + SESSION_DAYS * DAY)
  return token
}

/** 토큰의 사용자. 끝났으면 지우고 null. 남은 기간이 29일보다 짧으면 30일로 늘린다(하루에 한 번만 쓴다). */
export function sessionUser(db: Db, token: string, now: number): UserRow | null {
  const hash = hashToken(token)
  const row = db.prepare('select user_id, expires_at from sessions where token_hash = ?').get(hash) as { user_id: string; expires_at: number } | undefined
  if (!row) return null
  if (row.expires_at <= now) {
    db.prepare('delete from sessions where token_hash = ?').run(hash)
    return null
  }
  if (row.expires_at - now < (SESSION_DAYS - 1) * DAY) db.prepare('update sessions set expires_at = ? where token_hash = ?').run(now + SESSION_DAYS * DAY, hash)
  return (db.prepare('select * from users where id = ?').get(row.user_id) as UserRow | undefined) ?? null
}

export function deleteSession(db: Db, token: string) {
  db.prepare('delete from sessions where token_hash = ?').run(hashToken(token))
}

/** 끝난 세션과 10분 넘은 로그인 요청을 치운다(서버가 뜰 때와 한 시간마다). */
export function sweep(db: Db, now: number) {
  db.prepare('delete from sessions where expires_at <= ?').run(now)
  db.prepare('delete from oauth_states where created_at <= ?').run(now - 10 * 60 * 1000)
}
