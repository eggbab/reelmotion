import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchDraft } from './api'

const ID = 'd_0123456789abcdef0123456789abcdef'

function stub(reply: () => Response | Promise<Response>) {
  const calls: string[] = []
  vi.stubGlobal('fetch', async (url: string) => {
    calls.push(String(url))
    return reply()
  })
  return calls
}

afterEach(() => vi.unstubAllGlobals())

describe('커넥터 초안 받기(?draft=)', () => {
  it('있으면 대본과 스타일을 준다. 모르는 스타일은 기본(neon)으로', async () => {
    const calls = stub(() => Response.json({ draft: { script: 'Hi, I am Mina.', theme: 'seoul', lang: 'en' } }))
    expect(await fetchDraft(ID)).toEqual({ status: 'ready', script: 'Hi, I am Mina.', theme: 'seoul' })
    expect(calls).toEqual([`/api/drafts/${ID}`])
    stub(() => Response.json({ draft: { script: 'Hi', theme: 'retro' } }))
    expect(await fetchDraft(ID)).toEqual({ status: 'ready', script: 'Hi', theme: 'neon' })
  })

  it('없거나 기한이 지났으면(404) gone — 번호 꼴이 아니면 서버에 묻지도 않는다', async () => {
    const calls = stub(() => Response.json({ error: 'not_found' }, { status: 404 }))
    expect(await fetchDraft(ID)).toEqual({ status: 'gone' })
    expect(await fetchDraft('../../etc/passwd')).toEqual({ status: 'gone' })
    expect(calls).toEqual([`/api/drafts/${ID}`])
  })

  it('서버에 닿지 못했거나 서버가 탈이 났으면 failed — 링크가 없어진 것이 아니다(다시 열면 된다)', async () => {
    stub(() => {
      throw new TypeError('Failed to fetch')
    })
    expect(await fetchDraft(ID)).toEqual({ status: 'failed' })
    for (const status of [500, 502, 503, 429]) {
      stub(() => new Response('oops', { status }))
      expect(await fetchDraft(ID), String(status)).toEqual({ status: 'failed' })
    }
    // 서버가 엉뚱한 것을 돌려줘도(글이 아닌 답) failed
    stub(() => new Response('<html>', { status: 200, headers: { 'content-type': 'text/html' } }))
    expect(await fetchDraft(ID)).toEqual({ status: 'failed' })
  })

  it('답은 왔는데 쓸 수 없는 초안(빈 대본·너무 긴 대본)은 gone', async () => {
    stub(() => Response.json({ draft: { script: '   ', theme: 'neon' } }))
    expect(await fetchDraft(ID)).toEqual({ status: 'gone' })
    stub(() => Response.json({ draft: { script: 'a'.repeat(6001), theme: 'neon' } }))
    expect(await fetchDraft(ID)).toEqual({ status: 'gone' })
    stub(() => Response.json({}))
    expect(await fetchDraft(ID)).toEqual({ status: 'gone' })
  })
})
