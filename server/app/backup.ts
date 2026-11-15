import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import type { Db } from './db'

/**
 * 자동 백업: 앱 서버가 한 시간마다 불러, 서울 날짜로 하루에 하나(`backups/reelmotion-YYYYMMDD.db`)를 만들고
 * keepDays 일이 지난 것(오늘을 포함해 keepDays 날보다 오래된 것)은 지운다. 0 이면 끔(BACKUP_DAYS — config.ts).
 * 개인정보처리방침의 「백업은 30일이 지나면 지운다」 안에 들도록 기본은 7일. 지우는 것은 이 이름 꼴의 파일뿐이다.
 * 같은 PC 안의 백업이라 디스크가 망가지면 함께 잃는다 — 가끔 하나를 꺼내 다른 곳에 둔다(docs/operations.md 「백업」).
 */
const NAME = /^reelmotion-(\d{8})\.db$/
const DAY = 86_400_000
const SEOUL = 9 * 60 * 60 * 1000

function seoulDay(now: number): string {
  const date = new Date(now + SEOUL)
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`
}

export function autoBackup(db: Db, dir: string, now: number, keepDays: number): { created: string | null; removed: string[] } {
  if (keepDays <= 0) return { created: null, removed: [] }
  mkdirSync(dir, { recursive: true })
  const today = `reelmotion-${seoulDay(now)}.db`
  let created: string | null = null
  if (!existsSync(join(dir, today))) {
    // 다른 이름으로 다 쓴 뒤 바꾼다 — 쓰다 멈춘 파일이 오늘 백업으로 남지 않게.
    const partial = join(dir, `${today}.partial`)
    rmSync(partial, { force: true })
    db.prepare('VACUUM INTO ?').run(partial)
    renameSync(partial, join(dir, today))
    created = today
  }
  const oldest = seoulDay(now - (keepDays - 1) * DAY)
  const removed = readdirSync(dir)
    .filter((name) => {
      const day = NAME.exec(name)?.[1]
      return day !== undefined && day < oldest
    })
    .sort()
  for (const name of removed) rmSync(join(dir, name))
  return { created, removed }
}
