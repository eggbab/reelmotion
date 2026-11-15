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

  it('사이트 주소 꼴이 틀리면 멈춘다', () => {
    expect(() => readConfig({ SITE_ORIGIN: 'x.test/path' })).toThrow()
  })
})
