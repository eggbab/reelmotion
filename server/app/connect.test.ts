import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { describe, expect, it } from 'vitest'
import { createApp } from './app'
import { DRAFTS_PER_MINUTE, DRAFTS_PER_VISITOR, DRAFT_DAYS, MAX_DRAFTS, openDraftStore } from './connect'
import { openDb } from './db'

const ORIGIN = 'https://reelmotion.test'
const DAY = 86_400_000
const EN = 'Hi, I am Mina Park.\nMost people fall asleep 37% faster.\nFirst, no screens after ten. Second, wake up at the same time.'
const KO = '안녕하세요 저는 박미나입니다.\n대부분 37% 더 빨리 잠들어요.'

type ToolResult = { isError?: boolean; content: { type: string; text: string }[]; structuredContent?: Record<string, unknown> }

const CONFIG = { siteOrigin: ORIGIN, secureCookies: true, devLogin: false }
const MCP_HEADERS = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' }

/** 공식 MCP 클라이언트로 앱 서버에 붙는다(Claude·ChatGPT 의 서버처럼 Origin·쿠키 없이). visitor: 부르는 곳의 주소(웹 서버가 알려 주는 값) */
function setup() {
  const main = openDb(':memory:')
  // 초안은 계정 저장소와 다른 곳에 둔다(백업에 들어가지 않게)
  const db = openDraftStore(':memory:')
  let now = Date.UTC(2026, 10, 15, 3)
  const app = createApp({ db: main, drafts: db, google: null, config: CONFIG, now: () => now })
  const connect = async (visitor?: string) => {
    const client = new Client({ name: 'test-client', version: '1.0.0' })
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${ORIGIN}/api/mcp`), {
        fetch: async (url, init) => {
          const headers = new Headers(init?.headers)
          if (visitor) headers.set('x-forwarded-for', visitor)
          return app.request(String(url), { ...init, headers })
        },
      }),
    )
    return client
  }
  const call = async (client: Client, name: string, args: Record<string, unknown> = {}) => (await client.callTool({ name, arguments: args })) as ToolResult
  const drafts = () => (db.prepare('select count(*) as n from drafts').get() as { n: number }).n
  return { db, main, app, connect, call, drafts, advance: (ms: number) => (now += ms) }
}

describe('커넥터(MCP 서버)', () => {
  it('공식 클라이언트가 붙고, 서버 이름·쓰는 법 안내·도구 셋을 받는다', async () => {
    const { connect } = setup()
    const client = await connect()
    expect(client.getServerVersion()).toMatchObject({ name: 'reelmotion', title: 'ReelMotion' })
    expect(client.getInstructions()).toContain('never uploaded')
    const { tools } = await client.listTools()
    expect(tools.map((tool) => tool.name).sort()).toEqual(['list_styles', 'open_in_editor', 'plan_motion_graphics'])
    const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool]))
    // 읽기만 하는 도구와 초안을 만드는 도구를 사실대로 알린다
    expect(byName.list_styles.annotations).toMatchObject({ readOnlyHint: true })
    expect(byName.plan_motion_graphics.annotations).toMatchObject({ readOnlyHint: true })
    expect(byName.open_in_editor.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false })
    expect(byName.plan_motion_graphics.inputSchema.required).toEqual(['script'])
    for (const tool of tools) expect(tool.description?.length ?? 0, tool.name).toBeGreaterThan(40)
  })

  it('list_styles: 스타일 여섯', async () => {
    const { connect, call } = setup()
    const result = await call(await connect(), 'list_styles')
    const styles = result.structuredContent?.styles as { id: string; name: string; about: string }[]
    expect(styles.map((style) => style.id)).toEqual(['clean', 'neon', 'bold', 'editorial', 'seoul', 'tokyo'])
    expect(result.content[0].text).toContain('seoul')
  })

  it('plan_motion_graphics: 대본에서 계획을 돌려주고 아무것도 저장하지 않는다', async () => {
    const { connect, call, drafts } = setup()
    const result = await call(await connect(), 'plan_motion_graphics', { script: EN })
    expect(result.isError).toBeFalsy()
    expect(result.structuredContent).toMatchObject({ language: 'en', estimated: true })
    const graphics = result.structuredContent?.graphics as { kind: string }[]
    expect(graphics.map((graphic) => graphic.kind)).toEqual(expect.arrayContaining(['lowerThird', 'stat', 'list', 'captions']))
    expect(result.content[0].text).toMatch(/Name tag: Mina Park/)
    expect(drafts()).toBe(0)
    const timed = await call(await connect(), 'plan_motion_graphics', { script: EN, video_seconds: 40 })
    expect(timed.structuredContent).toMatchObject({ seconds: 40, estimated: false })
  })

  it('open_in_editor: 초안을 7일 두고, 그 언어의 편집기 주소를 준다', async () => {
    const { main, app, connect, call, drafts, advance } = setup()
    // 계정 저장소(날마다 백업)에는 초안 표가 없다
    expect(main.prepare("select count(*) as n from sqlite_master where name = 'drafts'").get()).toEqual({ n: 0 })
    const result = await call(await connect(), 'open_in_editor', { script: KO, style: 'seoul' })
    expect(result.isError).toBeFalsy()
    const url = String(result.structuredContent?.url)
    expect(url).toMatch(/^https:\/\/reelmotion\.test\/ko\/app\?draft=d_[0-9a-f]{32}$/)
    expect(result.structuredContent).toMatchObject({ language: 'ko', style: 'seoul', expires_at: '2026-11-22T03:00:00.000Z' })
    expect(result.content[0].text).toContain(url)
    expect(drafts()).toBe(1)
    const id = new URL(url).searchParams.get('draft')
    const read = await app.request(`/api/drafts/${id}`)
    expect(read.status).toBe(200)
    expect(await read.json()).toEqual({ draft: { script: KO, theme: 'seoul', lang: 'ko', expiresAt: Date.UTC(2026, 10, 22, 3) } })
    // 7일이 지나면 없다
    advance(DRAFT_DAYS * DAY + 1)
    expect((await app.request(`/api/drafts/${id}`)).status).toBe(404)
    expect((await app.request('/api/drafts/not-an-id')).status).toBe(404)
    // 다음 초안을 만들 때 지난 것을 지운다
    await call(await connect(), 'open_in_editor', { script: EN })
    expect(drafts()).toBe(1)
  })

  it('틀린 입력은 까닭을 알려 주고 아무것도 만들지 않는다', async () => {
    const { connect, call, drafts } = setup()
    const client = await connect()
    const empty = await call(client, 'plan_motion_graphics', { script: '   ' })
    expect(empty.isError).toBe(true)
    expect(empty.content[0].text).toMatch(/script is empty/i)
    for (const args of [{ script: 'a'.repeat(6001) }, { script: EN, style: 'retro' }, { script: EN, language: 'fr' }, {}]) {
      const outcome = await call(client, 'open_in_editor', args).then(
        (result) => (result.isError ? 'error' : 'ok'),
        () => 'error',
      )
      expect(outcome, JSON.stringify(args).slice(0, 40)).toBe('error')
    }
    expect(drafts()).toBe(0)
  })

  it('남용 막기: 한 곳에서는 1분에 정한 수까지, 모두 합쳐서도 정한 수까지만 초안을 만든다', async () => {
    const { connect, call, drafts, advance } = setup()
    const first = await connect('203.0.113.1')
    for (let i = 0; i < DRAFTS_PER_VISITOR; i++) expect((await call(first, 'open_in_editor', { script: EN })).isError).toBeFalsy()
    const over = await call(first, 'open_in_editor', { script: EN })
    expect(over.isError).toBe(true)
    expect(over.content[0].text).toMatch(/try again in a minute/i)
    expect(drafts()).toBe(DRAFTS_PER_VISITOR)
    // 읽기만 하는 도구는 그대로 쓴다
    expect((await call(first, 'plan_motion_graphics', { script: EN })).isError).toBeFalsy()
    // 다른 곳에서 부르는 사람은 그대로 만든다. 막힌 요청은 모두의 몫을 쓰지 않는다 — 모두 합쳐 꼭 정한 수까지 된다
    let made = DRAFTS_PER_VISITOR
    for (let visitor = 2; made < DRAFTS_PER_MINUTE; visitor++) {
      const client = await connect(`203.0.113.${visitor}`)
      for (let i = 0; i < DRAFTS_PER_VISITOR && made < DRAFTS_PER_MINUTE; i++, made++) expect((await call(client, 'open_in_editor', { script: EN })).isError, `초안 ${made + 1}`).toBeFalsy()
    }
    expect(drafts()).toBe(DRAFTS_PER_MINUTE)
    const fresh = await connect('203.0.113.99')
    expect((await call(fresh, 'open_in_editor', { script: EN })).isError).toBe(true)
    // 1분이 지나면 다시 된다
    advance(61_000)
    expect((await call(first, 'open_in_editor', { script: EN })).isError).toBeFalsy()
    expect((await call(fresh, 'open_in_editor', { script: EN })).isError).toBeFalsy()
  })

  it('표가 차면 가장 오래된 초안부터 지운다', async () => {
    const { db, app, connect, call, drafts } = setup()
    const insert = db.prepare('insert into drafts (id, lang, theme, script, created_at) values (?, ?, ?, ?, ?)')
    const id = (i: number) => `d_${String(i).padStart(32, '0')}`
    db.exec('BEGIN')
    for (let i = 0; i < MAX_DRAFTS; i++) insert.run(id(i), 'en', 'neon', 'x', Date.UTC(2026, 10, 15, 2) + i)
    db.exec('COMMIT')
    expect((await app.request(`/api/drafts/${id(0)}`)).status).toBe(200)
    expect((await call(await connect(), 'open_in_editor', { script: EN })).isError).toBeFalsy()
    expect(drafts()).toBe(MAX_DRAFTS)
    expect((await app.request(`/api/drafts/${id(0)}`)).status).toBe(404)
    expect((await app.request(`/api/drafts/${id(1)}`)).status).toBe(200)
  })

  it('끄는 스위치: 커넥터를 끄면 503 으로 알리고, 이미 만든 링크는 기한까지 열린다', async () => {
    const { db, main, connect, call } = setup()
    const made = await call(await connect(), 'open_in_editor', { script: KO })
    const id = new URL(String(made.structuredContent?.url)).searchParams.get('draft')
    const off = createApp({ db: main, drafts: db, google: null, config: { ...CONFIG, connector: false }, now: () => Date.UTC(2026, 10, 15, 4) })
    const post = await off.request('/api/mcp', { method: 'POST', headers: MCP_HEADERS, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) })
    expect(post.status).toBe(503)
    expect(JSON.stringify(await post.json())).toMatch(/turned off/i)
    expect((await off.request('/api/mcp')).status).toBe(503)
    expect((await off.request(`/api/drafts/${id}`)).status).toBe(200)
  })

  it('MCP 가 아닌 요청: GET 은 안내(405), 다른 사이트의 브라우저가 읽을 수 있게 열어 주지 않는다', async () => {
    const { app } = setup()
    const get = await app.request('/api/mcp')
    expect(get.status).toBe(405)
    expect(get.headers.get('allow')).toBe('POST')
    expect(JSON.stringify(await get.json())).toContain('https://reelmotion.test/help#connect')
    // 흐름을 열어 달라는 GET(MCP 클라이언트)과 DELETE 도 같다 — 열어 둔 채 남는 연결이 없다
    expect((await app.request('/api/mcp', { headers: { accept: 'text/event-stream' } })).status).toBe(405)
    expect((await app.request('/api/mcp', { method: 'DELETE', headers: { origin: 'https://reelmotion.test' } })).status).toBe(405)
    const post = await app.request('/api/mcp', {
      method: 'POST',
      headers: { ...MCP_HEADERS, origin: 'https://evil.example' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    })
    expect(post.headers.get('access-control-allow-origin')).toBeNull()
    // 큰 본문은 받지 않는다
    const big = await app.request('/api/mcp', {
      method: 'POST',
      headers: MCP_HEADERS,
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'plan_motion_graphics', arguments: { script: 'a'.repeat(200_000) } } }),
    })
    expect(big.status).toBe(413)
  })
})
