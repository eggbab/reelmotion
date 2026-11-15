import { describe, expect, it } from 'vitest'
import { readConfig } from './config'

describe('앱 서버 설정', () => {
  it('구글 로그인은 아이디·비밀값·사이트 주소가 모두 있을 때만 켠다', () => {
    expect(readConfig({ GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 's' }).google).toBeNull()
    expect(readConfig({ GOOGLE_CLIENT_ID: 'id', SITE_ORIGIN: 'https://x.test' }).google).toBeNull()
    expect(readConfig({ GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 's', SITE_ORIGIN: 'https://x.test/' }).google).toEqual({
      clientId: 'id',
      clientSecret: 's',
      redirectUri: 'https://x.test/api/auth/google/callback',
    })
  })

  it('쿠키 Secure 는 https 사이트면 기본으로 켜고, 가짜 로그인은 기본으로 끈다', () => {
    expect(readConfig({ SITE_ORIGIN: 'https://x.test' })).toMatchObject({ secureCookies: true, devLogin: false })
    expect(readConfig({})).toMatchObject({ secureCookies: false, devLogin: false, port: 8787 })
    expect(readConfig({ AUTH_DEV: '1', COOKIE_SECURE: '0', SITE_ORIGIN: 'https://x.test' })).toMatchObject({ secureCookies: false, devLogin: true })
  })

  it('요금제 한도는 기본으로 끄고(베타), 1 일 때만 켠다', () => {
    expect(readConfig({}).enforcePlans).toBe(false)
    expect(readConfig({ ENFORCE_PLANS: '0' }).enforcePlans).toBe(false)
    expect(readConfig({ ENFORCE_PLANS: '1' }).enforcePlans).toBe(true)
  })

  it('자동 백업은 기본 7일, 0 이면 끄고, 30일(개인정보처리방침)을 넘거나 틀린 값이면 멈춘다', () => {
    expect(readConfig({}).backupDays).toBe(7)
    expect(readConfig({ BACKUP_DAYS: '0' }).backupDays).toBe(0)
    expect(readConfig({ BACKUP_DAYS: '14' }).backupDays).toBe(14)
    expect(() => readConfig({ BACKUP_DAYS: 'week' })).toThrow()
    expect(() => readConfig({ BACKUP_DAYS: '31' })).toThrow()
  })

  it('장애 알림은 기본으로 문의 메일(vmelabs@outlook.com)로, 보내는 메일 계정은 있을 때만', () => {
    const base = readConfig({})
    expect(base.alertEmail).toBe('vmelabs@outlook.com')
    expect(base.smtp).toBeNull()
    expect(base.diskMinBytes).toBe(2e9)
    expect(readConfig({ ALERT_EMAIL: 'ops@example.com' }).alertEmail).toBe('ops@example.com')
    expect(readConfig({ SMTP_HOST: 'smtp.gmail.com', SMTP_USER: 'me@gmail.com', SMTP_PASS: 'app-password' }).smtp).toEqual({
      host: 'smtp.gmail.com',
      port: 587,
      user: 'me@gmail.com',
      pass: 'app-password',
      from: 'me@gmail.com',
    })
    expect(readConfig({ SMTP_HOST: 'smtp.example.com', SMTP_PORT: '465', SMTP_FROM: 'ReelMotion <alerts@example.com>' }).smtp).toMatchObject({ port: 465, user: null, from: 'ReelMotion <alerts@example.com>' })
    // 보내는 주소를 알 수 없으면 멈춘다
    expect(() => readConfig({ SMTP_HOST: 'smtp.example.com' })).toThrow()
    expect(readConfig({ WEB_URL: 'http://web', ASR_URL: 'http://asr:8008', DISK_MIN_GB: '5' })).toMatchObject({ webUrl: 'http://web', asrUrl: 'http://asr:8008', diskMinBytes: 5e9 })
    // 확인 간격: 기본 5분, 10초보다 짧게는 못 한다
    expect(readConfig({}).watchMs).toBe(300_000)
    expect(readConfig({ WATCH_SECONDS: '20' }).watchMs).toBe(20_000)
    expect(readConfig({ WATCH_SECONDS: '1' }).watchMs).toBe(10_000)
  })

  it('관리자는 기본으로 문의 메일(vmelabs@outlook.com), 쉼표로 여럿, 소문자로', () => {
    expect(readConfig({}).adminEmails).toEqual(['vmelabs@outlook.com'])
    expect(readConfig({ ADMIN_EMAILS: ' Boss@Example.com , ops@example.com,' }).adminEmails).toEqual(['boss@example.com', 'ops@example.com'])
  })

  it('사이트 주소 꼴이 틀리면 멈춘다', () => {
    expect(() => readConfig({ SITE_ORIGIN: 'x.test/path' })).toThrow()
  })
})
