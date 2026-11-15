// 커넥터의 남용 막기와 끄는 스위치를 실제 스택(웹 서버를 거쳐)에서.
//   node e2e/tests/connect-limits.cjs                 한 곳에서 1분에 20개까지, 다른 곳은 그대로(첫 줄에 초안 번호를 찍는다)
//   node e2e/tests/connect-limits.cjs off <초안 번호>   CONNECTOR=0 으로 다시 띄운 뒤: 커넥터는 503, 전에 만든 링크는 열림
const { BASE, SDK } = require('../env.cjs')
const { Client } = require(`${SDK}/client/index.js`)
const { StreamableHTTPClientTransport } = require(`${SDK}/client/streamableHttp.js`)
const MODE = process.argv[2] || 'limits'
const connect = async (visitor) => {
  const client = new Client({ name: 'limits', version: '1.0.0' })
  await client.connect(new StreamableHTTPClientTransport(new URL(`${BASE}/mcp`), { requestInit: { headers: { 'x-forwarded-for': visitor } } }))
  return client
}
;(async () => {
  const out = []
  const ok = (name, cond, extra = '') => out.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`)
  if (MODE === 'limits') {
    const a = await connect('203.0.113.7')
    let made = 0
    let last = null
    for (let i = 0; i < 21; i++) {
      last = await a.callTool({ name: 'open_in_editor', arguments: { script: 'Hi, I am Mina Park.' } })
      if (!last.isError) made++
    }
    ok('one caller: 20 links a minute, the 21st is refused', made === 20 && last.isError === true, `${made} made · ${last.content[0].text}`)
    ok('reading tools still work for that caller', !(await a.callTool({ name: 'plan_motion_graphics', arguments: { script: 'Hi, I am Mina Park.' } })).isError)
    const b = await connect('203.0.113.8')
    const other = await b.callTool({ name: 'open_in_editor', arguments: { script: 'Hi, I am Mina Park.' } })
    ok('another caller is not affected', !other.isError, other.structuredContent?.url?.replace(BASE, ''))
    console.log(other.structuredContent.url.split('draft=')[1])
    await a.close()
    await b.close()
  }
  if (MODE === 'off') {
    const id = process.argv[3]
    const post = await fetch(`${BASE}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) })
    const body = await post.text()
    ok('switched off: the connector answers 503 with a plain message', post.status === 503 && /turned off/.test(body), `${post.status} ${body.slice(0, 120)}`)
    ok('switched off: GET is 503 too', (await fetch(`${BASE}/mcp`)).status === 503)
    let failed = false
    try {
      await connect('203.0.113.9')
    } catch {
      failed = true
    }
    ok('switched off: a client cannot connect', failed)
    const draft = await fetch(`${BASE}/api/drafts/${id}`)
    ok('switched off: a link made earlier still opens', draft.status === 200, String(draft.status))
    ok('switched off: the rest of the site works', (await fetch(`${BASE}/api/health`)).status === 200 && (await fetch(`${BASE}/ko/app`)).status === 200)
  }
  console.log(out.join('\n'))
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
