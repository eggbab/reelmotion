import { generateKeyPairSync, sign } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { LoginError, createGoogleClient, verifyIdToken } from './google'
import type { Jwk } from './google'

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const jwk: Jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' }
const NOW = 1_800_000_000_000

function jwt(payload: Record<string, unknown>, header: Record<string, unknown> = { alg: 'RS256', kid: 'k1', typ: 'JWT' }): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const body = `${encode(header)}.${encode(payload)}`
  return `${body}.${sign('RSA-SHA256', Buffer.from(body), privateKey).toString('base64url')}`
}

const good = { iss: 'https://accounts.google.com', aud: 'client-1', sub: 'g-123', email: 'Mina@Example.com', email_verified: true, name: 'Mina', nonce: 'n1', exp: NOW / 1000 + 600 }
const opts = { clientId: 'client-1', nonce: 'n1', now: NOW, keys: [jwk] }

describe('verifyIdToken (구글 ID 토큰 검사)', () => {
  it('바른 토큰이면 사용자(메일은 소문자로)', () => {
    expect(verifyIdToken(jwt(good), opts)).toEqual({ sub: 'g-123', email: 'mina@example.com', name: 'Mina' })
  })

  it('받는 이·발급자·만료·nonce·메일 확인·서명이 틀리면 거절', () => {
    const cases: Record<string, string> = {
      audience: jwt({ ...good, aud: 'other' }),
      issuer: jwt({ ...good, iss: 'https://evil.example' }),
      expired: jwt({ ...good, exp: NOW / 1000 - 1 }),
      nonce: jwt({ ...good, nonce: 'other' }),
      unverified: jwt({ ...good, email_verified: false }),
      tampered: jwt(good).replace(/\.[^.]+\./, `.${Buffer.from(JSON.stringify({ ...good, sub: 'attacker' })).toString('base64url')}.`),
      unknownKey: jwt(good, { alg: 'RS256', kid: 'nope' }),
      noneAlg: jwt(good, { alg: 'none', kid: 'k1' }),
      garbage: 'a.b.c',
    }
    for (const [name, token] of Object.entries(cases)) expect(() => verifyIdToken(token, opts), name).toThrow(LoginError)
  })
})

describe('createGoogleClient', () => {
  it('로그인 주소에 PKCE·state·nonce 를 싣는다', () => {
    const url = new URL(createGoogleClient({ clientId: 'client-1', clientSecret: 's', redirectUri: 'https://x.test/api/auth/google/callback' }).authUrl({ state: 'st', nonce: 'no', challenge: 'ch' }))
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ client_id: 'client-1', state: 'st', nonce: 'no', code_challenge: 'ch', code_challenge_method: 'S256', scope: 'openid email profile' })
  })

  it('코드를 토큰으로 바꾸고 검사한다(열쇠가 바뀌면 다시 받는다)', async () => {
    let certs = 0
    const sent: Record<string, string>[] = []
    const fakeFetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/token')) {
        sent.push(Object.fromEntries(new URLSearchParams(String(init?.body))))
        return Response.json({ id_token: jwt(good) })
      }
      certs += 1
      return Response.json({ keys: certs === 1 ? [{ ...jwk, kid: 'old' }] : [jwk] })
    }) as typeof fetch
    const client = createGoogleClient({ clientId: 'client-1', clientSecret: 'secret', redirectUri: 'https://x.test/cb' }, fakeFetch, () => NOW)
    await expect(client.signIn('code-1', 'verifier-1', 'n1')).resolves.toEqual({ sub: 'g-123', email: 'mina@example.com', name: 'Mina' })
    expect(certs).toBe(2)
    expect(sent[0]).toMatchObject({ code: 'code-1', code_verifier: 'verifier-1', grant_type: 'authorization_code', client_secret: 'secret' })
  })
})
