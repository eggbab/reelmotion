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
 * | ASSIST_URL | (없음) | 말로 고치기 AI(llama.cpp 서버) 주소, 예: http://assist:8080. 없으면 대화창이 「지금은 쓸 수 없어요」 |
 */
export type ServerConfig = AppConfig & { host: string; port: number; dataDir: string; google: GoogleConfig | null; assistUrl: string | null }

export function readConfig(env: Record<string, string | undefined>): ServerConfig {
  const siteOrigin = env.SITE_ORIGIN?.trim().replace(/\/+$/, '') || null
  if (siteOrigin && !/^https?:\/\/[a-z0-9.-]+(:\d+)?$/i.test(siteOrigin)) throw new Error(`SITE_ORIGIN 은 https://example.com 꼴이어야 합니다: ${siteOrigin}`)
  const clientId = env.GOOGLE_CLIENT_ID?.trim()
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim()
  const google = clientId && clientSecret && siteOrigin ? { clientId, clientSecret, redirectUri: `${siteOrigin}/api/auth/google/callback` } : null
  const flag = (value: string | undefined, fallback: boolean) => (value === undefined || value === '' ? fallback : value === '1' || value.toLowerCase() === 'true')
  return {
    host: env.APP_HOST || '0.0.0.0',
    port: Number(env.APP_PORT || 8787),
    dataDir: env.DATA_DIR || './data',
    siteOrigin,
    google,
    secureCookies: flag(env.COOKIE_SECURE, siteOrigin?.startsWith('https://') ?? false),
    devLogin: flag(env.AUTH_DEV, false),
    assistUrl: env.ASSIST_URL?.trim() || null,
  }
}
