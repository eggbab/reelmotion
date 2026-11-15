import { copyFileSync, existsSync, renameSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { monthKey } from '../../src/site/entitlements'
import { PLANS } from '../../src/site/plans'
import { setPlan } from './admin-data'
import type { Db, UserRow } from './db'

const date = (ms: number | null) => (ms === null ? '-' : new Date(ms).toISOString().slice(0, 10))

/**
 * 관리 명령(운영 PC 에서): docker compose exec app node main.js admin <명령>
 *   users                         가입한 사람 수와 최근 50명(메일·요금제·끝나는 날)
 *   set-plan <메일> <요금제> [일수] 요금제 주기(결제를 붙이기 전, 계좌 이체 손님 등). free 면 끝나는 날 없음
 *   usage <메일>                   달마다 내보내기 수
 *   backup <파일>                  저장소를 한 파일로 복사(쓰는 중에도 안전 — VACUUM INTO). 같은 이름이 있으면 멈춘다
 *   restore <파일>                 백업으로 되돌리기 — 앱을 끈 뒤에만(restoreDatabase, main.ts 가 켜져 있으면 멈춘다)
 */
export function runAdmin(db: Db, args: string[], now: number): string {
  const [command, ...rest] = args
  const userByEmail = (email: string | undefined) => (email ? (db.prepare('select * from users where email = ?').get(email.toLowerCase()) as UserRow | undefined) : undefined)
  switch (command) {
    case 'users': {
      const { count } = db.prepare('select count(*) as count from users').get() as { count: number }
      const rows = db.prepare('select email, plan, plan_until, created_at from users order by created_at desc limit 50').all() as Pick<UserRow, 'email' | 'plan' | 'plan_until' | 'created_at'>[]
      return [`users: ${count}`, ...rows.map((row) => `${row.email}\t${row.plan}\tuntil ${date(row.plan_until)}\tjoined ${date(row.created_at)}`)].join('\n')
    }
    case 'set-plan': {
      const [email, plan, days] = rest
      const result = setPlan(db, email, plan, days === undefined ? undefined : Number(days), now)
      if (!result.ok && result.error === 'no_user') return `no user: ${email ?? ''}`
      if (!result.ok && result.error === 'bad_plan') return `plan must be one of: ${PLANS.map((item) => item.id).join(', ')}`
      if (!result.ok) return 'days must be a positive whole number'
      return `${result.user.email}: ${result.user.plan} until ${date(result.user.plan_until)}`
    }
    case 'usage': {
      const user = userByEmail(rest[0])
      if (!user) return `no user: ${rest[0] ?? ''}`
      const rows = db.prepare('select month, exports from usage where user_id = ? order by month desc limit 12').all(user.id) as { month: string; exports: number }[]
      return [`${user.email} (${user.plan}) — this month ${monthKey(now)}`, ...rows.map((row) => `${row.month}\t${row.exports} exports`)].join('\n')
    }
    case 'backup': {
      const file = rest[0]
      if (!file) return 'usage: backup <file>'
      if (existsSync(file)) return `already exists: ${file}`
      db.prepare('VACUUM INTO ?').run(file)
      return `backed up to ${file}`
    }
    default:
      return 'commands: users | set-plan <email> <plan> [days] | usage <email> | backup <file> | restore <file>'
  }
}

/**
 * 백업 파일로 되돌린다. 앱 서버를 끈 채로(저장소를 연 사람이 없을 때) 부른다 — docs/operations.md 「백업」.
 * 아무것도 지우지 않는다: 백업이 멀쩡한 ReelMotion 저장소인지 먼저 보고, 지금 저장소(와 -wal·-shm)는 이름을 바꿔 옆에 둔 뒤
 * 백업을 복사해 넣는다. 복사는 앱 사용자(node)로 하므로 되살린 파일을 앱이 그대로 쓸 수 있다.
 */
export function restoreDatabase(dataDir: string, file: string | undefined, now: number): string {
  if (!file) return 'usage: restore <backup file>'
  if (!existsSync(file)) return `no such file: ${file}`
  try {
    const backup = new DatabaseSync(file, { readOnly: true })
    try {
      const integrity = backup.prepare('PRAGMA integrity_check').get() as { integrity_check: string }
      if (integrity.integrity_check !== 'ok') return `damaged backup: ${file}`
      const users = backup.prepare("select count(*) as n from sqlite_master where type = 'table' and name = 'users'").get() as { n: number }
      if (users.n !== 1) return `not a ReelMotion backup: ${file}`
    } finally {
      backup.close()
    }
  } catch {
    return `cannot use ${file}: not a database`
  }
  const target = join(dataDir, 'reelmotion.db')
  const aside = `${target}.before-restore-${new Date(now).toISOString().replace(/[-:]/g, '').slice(0, 15)}`
  // 지금 저장소와 그 기록(-wal·-shm)을 같은 이름으로 함께 옮겨야 옮긴 쪽도 온전히 열린다.
  for (const suffix of ['', '-wal', '-shm']) if (existsSync(target + suffix)) renameSync(target + suffix, aside + suffix)
  copyFileSync(file, target)
  return `restored from ${file} (previous database kept as ${aside})`
}
