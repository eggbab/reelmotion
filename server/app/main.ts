import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { serve } from '@hono/node-server'
import { createApp } from './app'
import { readConfig } from './config'
import { openDb } from './db'
import { createGoogleClient } from './google'
import { sweep } from './sessions'

// 앱 서버 시작: 설정 읽기 → 저장소 열기(판 올리기) → 듣기. 접속 기록은 남기지 않는다(개인정보처리방침).
const config = readConfig(process.env)
mkdirSync(config.dataDir, { recursive: true })
const db = openDb(join(config.dataDir, 'reelmotion.db'))
sweep(db, Date.now())
setInterval(() => sweep(db, Date.now()), 60 * 60 * 1000).unref()

const app = createApp({ db, google: config.google ? createGoogleClient(config.google) : null, config })
serve({ fetch: app.fetch, hostname: config.host, port: config.port }, ({ port }) => {
  console.log(`reelmotion app on :${port} · google login ${config.google ? 'on' : 'off'}${config.devLogin ? ' · DEV LOGIN ON (시험용 — 운영에서 끌 것)' : ''}`)
})

const stop = () => {
  db.close()
  process.exit(0)
}
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
