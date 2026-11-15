import { existsSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { autoBackup } from './backup'
import { openDb } from './db'

const DAY = 86_400_000
// 2026-11-15 10:00 서울(01:00 UTC)
const NOW = Date.UTC(2026, 10, 15, 1)

function setup() {
  const dataDir = mkdtempSync(join(tmpdir(), 'rm-auto-'))
  const db = openDb(join(dataDir, 'reelmotion.db'))
  db.prepare('insert into users (id, google_sub, email, name, created_at) values (?, null, ?, ?, ?)').run('u1', 'mina@example.com', 'Mina', NOW)
  return { db, dir: join(dataDir, 'backups') }
}

describe('자동 백업', () => {
  it('하루에 하나(서울 날짜 이름), 이미 있으면 다시 만들지 않는다', () => {
    const { db, dir } = setup()
    expect(autoBackup(db, dir, NOW, 7)).toEqual({ created: 'reelmotion-20261115.db', removed: [] })
    expect(autoBackup(db, dir, NOW + 3 * 60 * 60 * 1000, 7)).toEqual({ created: null, removed: [] })
    const copy = openDb(join(dir, 'reelmotion-20261115.db'))
    expect(copy.prepare('select email from users').all()).toEqual([{ email: 'mina@example.com' }])
    copy.close()
    // 서울 자정이 지나면 다음 날 것
    expect(autoBackup(db, dir, Date.UTC(2026, 10, 15, 15, 30), 7).created).toBe('reelmotion-20261116.db')
  })

  it('정한 날수보다 오래된 백업만 지우고, 이름 꼴이 다른 파일은 건드리지 않는다', () => {
    const { db, dir } = setup()
    autoBackup(db, dir, NOW - 9 * DAY, 7)
    autoBackup(db, dir, NOW - 7 * DAY, 7)
    autoBackup(db, dir, NOW - 6 * DAY, 7)
    writeFileSync(join(dir, 'keep-me.db'), 'x')
    writeFileSync(join(dir, 'reelmotion-2026.db'), 'x')
    const result = autoBackup(db, dir, NOW, 7)
    expect(result).toEqual({ created: 'reelmotion-20261115.db', removed: ['reelmotion-20261106.db', 'reelmotion-20261108.db'] })
    expect(readdirSync(dir).sort()).toEqual(['keep-me.db', 'reelmotion-2026.db', 'reelmotion-20261109.db', 'reelmotion-20261115.db'])
  })

  it('0일이면 만들지 않는다(끔)', () => {
    const { db, dir } = setup()
    expect(autoBackup(db, dir, NOW, 0)).toEqual({ created: null, removed: [] })
    expect(existsSync(dir)).toBe(false)
  })
})
