import { effectivePlan } from './admin-data'
import type { Db, UserRow } from './db'

/**
 * 「내 정보 내려받기」(내 계정 — GET /api/me/export): 계정 정보·요금제·달마다 내보내기 수·로그인 기록(시각만)·계정에 저장한 작업 전부를
 * JSON 한 파일로. 작업은 하나에 1MB·500개까지라 한꺼번에 메모리에 모으지 않고 하나씩 읽어 흘려 보낸다.
 * 들어 있지 않은 것: 영상(서버에 없다), 로그인 유지 쿠키의 값(서버에도 해시만 있다), 문의(누가 보냈는지 남기지 않아 계정과 잇지 않는다).
 * 개인정보처리방침 「이용자의 권리」에 이 기능을 적었다 — 담는 것을 바꾸면 방침도.
 */
export function exportFileName(now: number): string {
  return `reelmotion-data-${new Date(now).toISOString().slice(0, 10)}.json`
}

const iso = (ms: number | null) => (ms === null ? null : new Date(ms).toISOString())

export function* accountExport(db: Db, user: UserRow, now: number): Generator<string> {
  const head = {
    format: 'reelmotion-account-export',
    version: 1,
    exportedAt: iso(now),
    account: {
      id: user.id,
      email: user.email,
      name: user.name,
      googleId: user.google_sub,
      createdAt: iso(user.created_at),
      plan: effectivePlan(user, now),
      planUntil: iso(user.plan_until),
    },
    usage: db.prepare('select month, exports from usage where user_id = ? order by month').all(user.id) as { month: string; exports: number }[],
    logins: (db.prepare('select created_at, expires_at from sessions where user_id = ? order by created_at').all(user.id) as { created_at: number; expires_at: number }[]).map((row) => ({
      createdAt: iso(row.created_at),
      expiresAt: iso(row.expires_at),
    })),
  }
  // 머리를 적고 마지막 「}」 앞에 작업 목록을 이어 붙인다
  yield `${JSON.stringify(head, null, 2).slice(0, -2)},\n  "projects": [`
  const ids = (db.prepare('select id from projects where user_id = ? order by updated_at desc, id').all(user.id) as { id: string }[]).map((row) => row.id)
  const read = db.prepare('select id, updated_at, data from projects where user_id = ? and id = ?')
  let written = 0
  for (const id of ids) {
    // 읽는 사이에 지운 작업은 건너뛴다
    const row = read.get(user.id, id) as { id: string; updated_at: number; data: string } | undefined
    if (!row) continue
    let data: unknown
    try {
      data = JSON.parse(row.data)
    } catch {
      data = row.data
    }
    const project = typeof data === 'object' && data !== null ? { ...(data as Record<string, unknown>), id: row.id, savedAt: iso(row.updated_at) } : { id: row.id, savedAt: iso(row.updated_at), data }
    yield `${written === 0 ? '\n    ' : ',\n    '}${JSON.stringify(project)}`
    written++
  }
  yield written === 0 ? ']\n}\n' : '\n  ]\n}\n'
}
