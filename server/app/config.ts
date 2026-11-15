import type { AppConfig } from './app'
import type { GoogleConfig } from './google'

/**
 * 앱 서버 설정(환경 변수). 비밀값(GOOGLE_CLIENT_SECRET)은 저장소·로그에 남기지 않는다 — deploy/.env(git 에 넣지 않음)로만 준다.
 * | 이름 | 기본 | 뜻 |
 * | APP_HOST / APP_PORT | 0.0.0.0 / 8787 | 듣는 곳 |
 * | DATA_DIR | ./data | SQLite 파일(reelmotion.db)을 두는 폴더 |
 * | SITE_ORIGIN | (없음) | https://도메인. 구글 로그인 돌아오는 주소와 다른 사이트 요청 막기에 쓴다 |
 * | GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET | (없음) | 둘 다 있고 SITE_ORIGIN 이 있으면 구글 로그인을 켠다 |
 * | COOKIE_SECURE | SITE_ORIGIN 이 https 면 1 | 로그인 쿠키에 Secure |
 * | AUTH_DEV | 0 | 1 이면 개발·시험용 가짜 로그인(운영에서 켜지 않는다) |
 * | ENFORCE_PLANS | 0 | 1 이면 요금제 한도(길이·횟수·워터마크)를 지킨다. 결제를 붙이는 날 켠다 |
 * | ASSIST_URL | (없음) | 말로 고치기 AI(llama.cpp 서버) 주소, 예: http://assist:8080. 없으면 대화창이 「지금은 쓸 수 없어요」 |
 * | BACKUP_DAYS | 7 | 자동 백업(DATA_DIR/backups, 하루 하나)을 며칠 남길지. 0 이면 끔. 개인정보처리방침에 「백업은 30일이 지나면 지운다」고 적어 30을 넘지 못한다 |
 */
export type ServerConfig = AppConfig & { host: string; port: number; dataDir: string; google: GoogleConfig | null; assistUrl: string | null; backupDays: number }

export const MAX_BACKUP_DAYS = 30

export function readConfig(env: Record<string, string | undefined>): ServerConfig {
  const siteOrigin = env.SITE_ORIGIN?.trim().replace(/\/+$/, '') || null
  if (siteOrigin && !/^https?:\/\/[a-z0-9.-]+(:\d+)?$/i.test(siteOrigin)) throw new Error(`SITE_ORIGIN 은 https://example.com 꼴이어야 합니다: ${siteOrigin}`)
  const clientId = env.GOOGLE_CLIENT_ID?.trim()
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim()
  const google = clientId && clientSecret && siteOrigin ? { clientId, clientSecret, redirectUri: `${siteOrigin}/api/auth/google/callback` } : null
  const flag = (value: string | undefined, fallback: boolean) => (value === undefined || value === '' ? fallback : value === '1' || value.toLowerCase() === 'true')
  const backupDays = env.BACKUP_DAYS === undefined || env.BACKUP_DAYS.trim() === '' ? 7 : Number(env.BACKUP_DAYS)
  if (!Number.isInteger(backupDays) || backupDays < 0 || backupDays > MAX_BACKUP_DAYS) throw new Error(`BACKUP_DAYS 는 0~${MAX_BACKUP_DAYS} 사이의 정수여야 합니다: ${env.BACKUP_DAYS}`)
  return {
    host: env.APP_HOST || '0.0.0.0',
    port: Number(env.APP_PORT || 8787),
    dataDir: env.DATA_DIR || './data',
    siteOrigin,
    google,
    secureCookies: flag(env.COOKIE_SECURE, siteOrigin?.startsWith('https://') ?? false),
    devLogin: flag(env.AUTH_DEV, false),
    assistUrl: env.ASSIST_URL?.trim() || null,
    enforcePlans: flag(env.ENFORCE_PLANS, false),
    backupDays,
  }
}
