import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const root = new URL('../../', import.meta.url)
const read = (path: string) => readFileSync(new URL(path, root), 'utf8')

/** 웹 서버가 보내는 「실행해도 되는 것」 규칙(Content-Security-Policy, deploy/Caddyfile) */
function policy(): Record<string, string[]> {
  const line = read('deploy/Caddyfile').match(/Content-Security-Policy "([^"]+)"/)
  expect(line, 'Caddyfile 에 Content-Security-Policy 가 있다').not.toBeNull()
  return Object.fromEntries(
    line![1]
      .split(';')
      .map((part) => part.trim().split(/\s+/))
      .filter((parts) => parts[0])
      .map(([name, ...values]) => [name, values]),
  )
}

describe('실행해도 되는 것(CSP)', () => {
  it('쪽마다 들어가는 언어 옮기기 스크립트의 해시가 규칙에 있다(index.html 을 고치면 새 값을 Caddyfile 에)', () => {
    const inline = [...read('index.html').matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1])
    expect(inline.length).toBe(1)
    const hash = `'sha256-${createHash('sha256').update(inline[0]).digest('base64')}'`
    expect(policy()['script-src'], `Caddyfile 의 script-src 에 ${hash}`).toContain(hash)
  })

  it('바깥 주소는 브라우저 받아쓰기 모델 파일을 주는 Hugging Face 뿐이다(개인정보처리방침과 같게)', () => {
    const outside = Object.values(policy())
      .flat()
      .filter((value) => /^https?:/.test(value))
    expect(outside.every((value) => /^https:\/\/(\*\.)?(huggingface\.co|hf\.co)$/.test(value)), outside.join(' ')).toBe(true)
  })

  it('끼워 넣기 막기·https·스크립트 아닌 것', () => {
    const rules = policy()
    expect(rules['frame-ancestors']).toEqual(["'none'"])
    expect(rules['object-src']).toEqual(["'none'"])
    expect(rules['script-src']).not.toContain("'unsafe-inline'")
    expect(rules['script-src']).not.toContain("'unsafe-eval'")
    const caddy = read('deploy/Caddyfile')
    expect(caddy).toContain('X-Frame-Options "DENY"')
    expect(caddy).toMatch(/Strict-Transport-Security "max-age=\d+"/)
  })
})
