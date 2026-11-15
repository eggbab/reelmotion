import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { serve } from '@hono/node-server'
import { createApp } from './app'
import { createLlamaModel } from './assist'
import { restoreDatabase, runAdmin } from './admin'
import { autoBackup } from './backup'
import { readConfig } from './config'
import { openDraftStore } from './connect'
import { openDb } from './db'
import { createGoogleClient } from './google'
import { sweep } from './sessions'
import { createChecks, createSmtpMailer, createWatchdog, smtpTransport } from './watch'

// 앱 서버 시작: 설정 읽기 → 저장소 열기(판 올리기) → 듣기. 접속 기록은 남기지 않는다(개인정보처리방침).
// 관리 명령: node main.js admin <명령> (admin.ts)
const config = readConfig(process.env)
mkdirSync(config.dataDir, { recursive: true })
// 장애 알림 메일(watch.ts): 보내는 계정(SMTP)과 받는 곳(기본 vmelabs@outlook.com)이 다 있을 때만. 없으면 앱 기록에만.
const mailer = config.smtp && config.alertEmail ? createSmtpMailer(smtpTransport(config.smtp), config.smtp.from, config.alertEmail) : null
if (process.argv[2] === 'admin' && process.argv[3] === 'test-alert') {
  if (!mailer) {
    console.log(`mail is not set up: alerts for ${config.alertEmail ?? '(nobody)'} only go to the app log. Set SMTP_HOST, SMTP_USER and SMTP_PASS in deploy/.env`)
    process.exit(1)
  }
  try {
    await mailer.send('[ReelMotion] 시험 메일', 'ReelMotion 장애 알림이 이 주소로 옵니다. 이 메일에는 답하지 않아도 됩니다.')
    console.log(`sent a test mail to ${config.alertEmail}`)
    process.exit(0)
  } catch (error) {
    console.log(`could not send: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}
// 되돌리기(admin restore)는 저장소를 열기 전에, 앱 서버가 꺼져 있을 때만 — 켜진 서버는 옮겨 둔 옛 파일에 계속 쓰기 때문.
if (process.argv[2] === 'admin' && process.argv[3] === 'restore') {
  const running = await fetch(`http://127.0.0.1:${config.port}/api/health`, { signal: AbortSignal.timeout(2000) }).then(
    () => true,
    () => false,
  )
  console.log(running ? 'the app server is running: stop it first (docker compose stop app), then restore with docker compose run' : restoreDatabase(config.dataDir, process.argv[4], Date.now()))
  process.exit(running ? 1 : 0)
}
const db = openDb(join(config.dataDir, 'reelmotion.db'))
if (process.argv[2] === 'admin') {
  console.log(runAdmin(db, process.argv.slice(3), Date.now()))
  db.close()
  process.exit(0)
}
sweep(db, Date.now())
setInterval(() => sweep(db, Date.now()), 60 * 60 * 1000).unref()

// 자동 백업: 한 시간마다 확인해 서울 날짜로 하루 하나를 만들고 오래된 것은 지운다(backup.ts). 기록에는 파일 이름만 남긴다.
const backup = () => {
  try {
    const { created, removed } = autoBackup(db, join(config.dataDir, 'backups'), Date.now(), config.backupDays)
    if (created || removed.length > 0) console.log(`backup: ${created ?? 'kept'}${removed.length > 0 ? ` · removed ${removed.join(', ')}` : ''}`)
  } catch (error) {
    console.error('backup failed:', error instanceof Error ? error.message : error)
  }
}
backup()
setInterval(backup, 60 * 60 * 1000).unref()

const assist = config.assistUrl ? createLlamaModel(config.assistUrl) : null
// 장애 확인: 5분마다(WATCH_SECONDS). 세 번 잇달아(15분) 문제면 메일, 풀리면 다시 메일.
const watch = createWatchdog({
  run: createChecks({ webUrl: config.webUrl, asrUrl: config.asrUrl, assist, dataDir: config.dataDir, backupDays: config.backupDays, diskMinBytes: config.diskMinBytes, now: Date.now }),
  mailer,
  now: Date.now,
  log: (line) => console.log(line),
  siteOrigin: config.siteOrigin,
})
const check = () => void watch.tick().catch((error: unknown) => console.error('watch failed:', error instanceof Error ? error.message : error))
check()
setInterval(check, config.watchMs).unref()

const app = createApp({
  db,
  // 커넥터 초안(7일 뒤 지움)은 백업에 들어가지 않게 다른 파일에 둔다.
  drafts: openDraftStore(join(config.dataDir, 'drafts.db')),
  google: config.google ? createGoogleClient(config.google) : null,
  config,
  assist,
  watch,
  admin: {
    emails: config.adminEmails,
    backupDir: config.backupDays > 0 ? join(config.dataDir, 'backups') : null,
    alerts: {
      email: config.alertEmail,
      mail: mailer !== null,
      test: mailer ? () => mailer.send('[ReelMotion] 시험 메일', '관리자 화면에서 보낸 시험 메일입니다. ReelMotion 장애 알림이 이 주소로 옵니다.') : null,
    },
  },
})
serve({ fetch: app.fetch, hostname: config.host, port: config.port }, ({ port }) => {
  console.log(`reelmotion app on :${port} · google login ${config.google ? 'on' : 'off'} · assist ${config.assistUrl ? 'on' : 'off'} · plans ${config.enforcePlans ? 'enforced' : 'beta (free)'} · billing not connected · backups ${config.backupDays > 0 ? `${config.backupDays} days` : 'off'} · alerts → ${config.alertEmail ?? '(nobody)'} (${mailer ? 'mail' : 'log only'}) · admin ${config.adminEmails.join(', ') || '(nobody)'} · connector ${config.connector === false ? 'OFF' : 'on'}${config.devLogin ? ' · DEV LOGIN ON (시험용 — 운영에서 끌 것)' : ''}`)
})

const stop = () => {
  db.close()
  process.exit(0)
}
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
