import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { serve } from '@hono/node-server'
import { createApp } from './app'
import { createLlamaModel } from './assist'
import { restoreDatabase, runAdmin } from './admin'
import { readConfig } from './config'
import { openDb } from './db'
import { createGoogleClient } from './google'
import { sweep } from './sessions'

// 앱 서버 시작: 설정 읽기 → 저장소 열기(판 올리기) → 듣기. 접속 기록은 남기지 않는다(개인정보처리방침).
// 관리 명령: node main.js admin <명령> (admin.ts)
const config = readConfig(process.env)
mkdirSync(config.dataDir, { recursive: true })
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

const app = createApp({ db, google: config.google ? createGoogleClient(config.google) : null, config, assist: config.assistUrl ? createLlamaModel(config.assistUrl) : null })
serve({ fetch: app.fetch, hostname: config.host, port: config.port }, ({ port }) => {
  console.log(`reelmotion app on :${port} · google login ${config.google ? 'on' : 'off'} · assist ${config.assistUrl ? 'on' : 'off'} · plans ${config.enforcePlans ? 'enforced' : 'beta (free)'} · billing not connected${config.devLogin ? ' · DEV LOGIN ON (시험용 — 운영에서 끌 것)' : ''}`)
})

const stop = () => {
  db.close()
  process.exit(0)
}
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
