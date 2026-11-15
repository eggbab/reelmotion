import { createHash, createPublicKey, randomBytes, verify as verifySignature } from 'node:crypto'
import type { JsonWebKey } from 'node:crypto'

/**
 * 구글 로그인(OpenID Connect, 서버가 코드를 받아 바꾸는 방식 + PKCE + state + nonce).
 * 쓰려면 Google Cloud 콘솔에서 「OAuth 클라이언트 ID(웹)」를 만들고, 승인된 리디렉션 URI 에
 * `{SITE_ORIGIN}/api/auth/google/callback` 을 넣은 뒤 GOOGLE_CLIENT_ID·GOOGLE_CLIENT_SECRET 을 준다(docs/operations.md).
 */
export type GoogleConfig = { clientId: string; clientSecret: string; redirectUri: string }
export type GoogleClaims = { sub: string; email: string; name: string }
export type Jwk = JsonWebKey & { kid?: string }

export interface GoogleClient {
  authUrl(input: { state: string; nonce: string; challenge: string }): string
  /** 받은 코드를 토큰으로 바꾸고, ID 토큰을 검사해 확인된 사용자를 돌려준다. */
  signIn(code: string, verifier: string, nonce: string): Promise<GoogleClaims>
}

export class LoginError extends Error {}

export function pkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString('base64url')
  return { verifier, challenge: createHash('sha256').update(verifier).digest('base64url') }
}

const ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com'])

function decodePart(part: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(Buffer.from(part, 'base64url').toString('utf8'))
    if (typeof value === 'object' && value !== null) return value as Record<string, unknown>
  } catch {
    // 아래에서 거절
  }
  throw new LoginError('malformed token')
}

/** ID 토큰(JWT) 검사: 서명(구글 공개 열쇠), 발급자, 받는 이(우리 클라이언트), 만료, nonce, 메일 확인. */
export function verifyIdToken(token: string, opts: { clientId: string; nonce: string; now: number; keys: Jwk[] }): GoogleClaims {
  const parts = token.split('.')
  if (parts.length !== 3) throw new LoginError('malformed token')
  const [head, body, signature] = parts
  const header = decodePart(head)
  if (header.alg !== 'RS256') throw new LoginError('unexpected alg')
  const jwk = opts.keys.find((key) => key.kid === header.kid)
  if (!jwk) throw new LoginError('unknown key')
  const valid = verifySignature('RSA-SHA256', Buffer.from(`${head}.${body}`), createPublicKey({ key: jwk, format: 'jwk' }), Buffer.from(signature, 'base64url'))
  if (!valid) throw new LoginError('bad signature')
  const claims = decodePart(body)
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
  if (!ISSUERS.has(String(claims.iss))) throw new LoginError('bad issuer')
  if (!audience.includes(opts.clientId)) throw new LoginError('bad audience')
  if (typeof claims.exp !== 'number' || claims.exp * 1000 <= opts.now) throw new LoginError('expired')
  if (claims.nonce !== opts.nonce) throw new LoginError('bad nonce')
  if (typeof claims.sub !== 'string' || claims.sub === '') throw new LoginError('no subject')
  if (claims.email_verified !== true || typeof claims.email !== 'string') throw new LoginError('email not verified')
  return { sub: claims.sub, email: claims.email.toLowerCase(), name: typeof claims.name === 'string' ? claims.name.slice(0, 100) : '' }
}

export function createGoogleClient(config: GoogleConfig, fetchImpl: typeof fetch = fetch, now: () => number = Date.now): GoogleClient {
  let cache: { keys: Jwk[]; at: number } | null = null
  const loadKeys = async (fresh: boolean): Promise<Jwk[]> => {
    if (!fresh && cache && now() - cache.at < 60 * 60 * 1000) return cache.keys
    const response = await fetchImpl('https://www.googleapis.com/oauth2/v3/certs')
    if (!response.ok) throw new LoginError(`jwks ${response.status}`)
    const { keys } = (await response.json()) as { keys: Jwk[] }
    cache = { keys, at: now() }
    return keys
  }
  return {
    authUrl({ state, nonce, challenge }) {
      const query = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        nonce,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        prompt: 'select_account',
      })
      return `https://accounts.google.com/o/oauth2/v2/auth?${query}`
    },
    async signIn(code, verifier, nonce) {
      const response = await fetchImpl('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: config.redirectUri,
          grant_type: 'authorization_code',
          code_verifier: verifier,
        }),
      })
      if (!response.ok) throw new LoginError(`token ${response.status}`)
      const { id_token: idToken } = (await response.json()) as { id_token?: unknown }
      if (typeof idToken !== 'string') throw new LoginError('no id_token')
      const check = (keys: Jwk[]) => verifyIdToken(idToken, { clientId: config.clientId, nonce, now: now(), keys })
      try {
        return check(await loadKeys(false))
      } catch (error) {
        // 구글이 열쇠를 바꿨으면 한 번 새로 받아 다시 본다.
        if (error instanceof LoginError && error.message === 'unknown key') return check(await loadKeys(true))
        throw error
      }
    },
  }
}
