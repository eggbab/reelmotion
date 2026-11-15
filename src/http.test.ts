import { describe, expect, it } from 'vitest'
import { release } from './http'

describe('읽지 않을 응답 내려놓기', () => {
  it('본문을 버려 연결을 놓아준다', async () => {
    const response = new Response('{"error":"not_found"}', { status: 404 })
    release(response)
    await Promise.resolve()
    expect(response.bodyUsed).toBe(true)
  })

  it('이미 읽었거나 본문이 없거나 응답이 없으면 아무 일도 하지 않는다', async () => {
    const read = new Response('x')
    await read.text()
    expect(() => release(read)).not.toThrow()
    expect(() => release(new Response(null, { status: 204 }))).not.toThrow()
    expect(() => release(null)).not.toThrow()
    expect(() => release(undefined)).not.toThrow()
  })
})
