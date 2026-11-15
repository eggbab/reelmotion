import { randomBytes } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { z } from 'zod'
import { MAX_SCRIPT, MAX_SECONDS, describePlan, draftPath, guessLang, isDraftId, planFromScript } from '../../src/connect/plan'
import type { Lang } from '../../src/langs'
import { THEMES } from '../../src/motion/themes'
import type { ThemeId } from '../../src/motion/types'
import { SITE_COPY } from '../../src/site/copy'
import { createRateLimiter } from './assist'

/**
 * Claude·ChatGPT 커넥터: MCP 서버(/api/mcp — 바깥 주소는 /mcp, deploy/Caddyfile). 로그인 없이 누구나 붙을 수 있다.
 * 영상은 다루지 않는다 — 대본(글)만 받아 편집기와 같은 규칙으로 그래픽 계획을 내놓고, 편집기에서 열 짧은 주소를 만든다.
 *  - list_styles · plan_motion_graphics: 읽기만(아무것도 저장하지 않는다)
 *  - open_in_editor: 대본·스타일을 초안으로 7일 두고 그 주소를 돌려준다 — 개인정보처리방침에 「7일 뒤 지운다, 백업에 넣지 않는다」고 적었다.
 *    그래서 초안은 계정 저장소(reelmotion.db — 날마다 백업)와 다른 파일(drafts.db)에 둔다. 누구 것인지는 적지 않는다.
 * 쿠키·계정을 보지 않으므로 다른 사이트가 불러도 할 수 있는 일이 같다(그래서 Origin 확인에서 뺐다 — app.ts).
 * 남용 막기(초안 만들기에만 — 읽기만 하는 도구는 저장하는 것이 없다):
 *  - 부르는 곳(IP)마다 1분에 20개. Claude·ChatGPT 는 회사 서버 몇 곳에서 부르므로 사람마다 나누지는 못하지만,
 *    한 곳에서 몰아 부르는 것이 모두의 몫을 다 쓰지는 못하게 한다. IP 는 메모리에서 1분 뒤 사라진다(저장·기록하지 않음).
 *  - 모두 합쳐 1분에 60개, 표는 20,000개까지(차면 가장 오래된 것부터 지운다 — 링크가 7일보다 일찍 닫힐 수 있다), 요청 본문 64KB.
 *  - 그래도 안 되면 끈다: CONNECTOR=0(config.ts) — 커넥터는 503, 이미 만든 링크는 기한까지 열린다.
 * 요청마다 서버를 새로 만든다(상태 없음 — 공식 SDK 가 권하는 방식).
 */
export const DRAFT_DAYS = 7
export const MAX_DRAFTS = 20_000
export const DRAFTS_PER_MINUTE = 60
export const DRAFTS_PER_VISITOR = 20
const DAY = 86_400_000
const MAX_BODY = 64 * 1024

const LANGS = ['en', 'ko', 'ja'] as const
const STYLE_IDS = THEMES.map((theme) => theme.id) as [ThemeId, ...ThemeId[]]

const INSTRUCTIONS = [
  'ReelMotion places motion graphics (titles, name tags, counters, charts, checklists, quotes and captions) on talking videos.',
  'These tools work with the script text only. The video itself is added and edited in the user’s browser at the link from open_in_editor and is never uploaded, so do not ask the user to send a video here.',
  'Typical flow: call plan_motion_graphics with what is said in the video to preview the graphics the editor will place, adjust the script with the user if they want different graphics, then call open_in_editor and give the user the link. In the editor they add their video, fix anything, and export an MP4.',
  'How graphics are chosen: a self-introduction becomes a name tag, one number becomes a counter, several numbers become a chart, “First… Second…” becomes a checklist, quoted words become a quote, the first sentence becomes the title, and the whole script becomes captions.',
  'Supported spoken languages: English, Korean and Japanese.',
].join(' ')

const scriptField = z
  .string()
  .max(MAX_SCRIPT)
  .describe(`What is said in the video, in the speaker’s words (script or transcript), up to ${MAX_SCRIPT} characters. Put each sentence on its own line.`)
const languageField = z.enum(LANGS).optional().describe('Language spoken in the video: en, ko or ja. Detected from the script when omitted.')

const text = (value: string) => ({ content: [{ type: 'text' as const, text: value }] })
const failure = (value: string) => ({ ...text(value), isError: true })
const PLAN_ERRORS = {
  empty: 'The script is empty. Pass what is said in the video.',
  too_long: `The script is too long. Keep it under ${MAX_SCRIPT} characters, or split the video.`,
  bad_seconds: `video_seconds must be between 1 and ${MAX_SECONDS}.`,
}

export type Draft = { script: string; theme: ThemeId; lang: Lang; expiresAt: number }

export type DraftStore = DatabaseSync

/** 초안을 두는 곳(운영: DATA_DIR/drafts.db — 백업하지 않는다, 시험: ':memory:') */
export function openDraftStore(path: string): DraftStore {
  const db = new DatabaseSync(path)
  db.exec('PRAGMA busy_timeout = 3000')
  if (path !== ':memory:') db.exec('PRAGMA journal_mode = WAL')
  db.exec('create table if not exists drafts (id text primary key, lang text not null, theme text not null, script text not null, created_at integer not null)')
  db.exec('create index if not exists drafts_created on drafts(created_at)')
  return db
}

export function createConnector({ db, now, siteOrigin, enabled = true }: { db: DraftStore; now: () => number; siteOrigin: string | null; enabled?: boolean }) {
  const limiter = createRateLimiter(DRAFTS_PER_MINUTE, 60_000, now)
  const visitors = createRateLimiter(DRAFTS_PER_VISITOR, 60_000, now)

  const saveDraft = (lang: Lang, theme: ThemeId, script: string): { id: string; expiresAt: number } => {
    const created = now()
    db.prepare('delete from drafts where created_at <= ?').run(created - DRAFT_DAYS * DAY)
    const id = `d_${randomBytes(16).toString('hex')}`
    db.prepare('insert into drafts (id, lang, theme, script, created_at) values (?, ?, ?, ?, ?)').run(id, lang, theme, script, created)
    // 표가 차면 가장 오래된 것부터 지운다
    db.prepare('delete from drafts where id in (select id from drafts order by created_at desc, id desc limit -1 offset ?)').run(MAX_DRAFTS)
    return { id, expiresAt: created + DRAFT_DAYS * DAY }
  }

  const readDraft = (id: unknown): Draft | null => {
    if (!isDraftId(id)) return null
    const row = db.prepare('select lang, theme, script, created_at from drafts where id = ?').get(id) as { lang: Lang; theme: ThemeId; script: string; created_at: number } | undefined
    if (!row || row.created_at <= now() - DRAFT_DAYS * DAY) return null
    return { script: row.script, theme: row.theme, lang: row.lang, expiresAt: row.created_at + DRAFT_DAYS * DAY }
  }

  const build = (origin: string, visitor: string) => {
    const server = new McpServer({ name: 'reelmotion', title: 'ReelMotion', version: '1.0.0' }, { instructions: INSTRUCTIONS })

    server.registerTool(
      'list_styles',
      {
        title: 'List style packs',
        description: 'Lists ReelMotion’s six style packs (the look of every graphic: fonts, colors and motion) so the user can pick one for open_in_editor. Seoul suits Korean text and Tokyo suits Japanese text.',
        outputSchema: { styles: z.array(z.object({ id: z.string(), name: z.string(), about: z.string(), made_for: z.string() })) },
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      async () => {
        const copy = SITE_COPY.en.styles
        const styles = THEMES.map((theme) => ({ id: theme.id, name: copy.names[theme.id], about: copy.about[theme.id], made_for: copy.regions[theme.region] }))
        return { ...text(styles.map((style) => `${style.id} — ${style.name}: ${style.about} (${style.made_for})`).join('\n')), structuredContent: { styles } }
      },
    )

    server.registerTool(
      'plan_motion_graphics',
      {
        title: 'Plan motion graphics from a script',
        description:
          'Previews the motion graphics ReelMotion will place for a talking video, from the script alone: which graphic appears when (title, name tag, counter, chart, checklist, quote, captions). Nothing is saved. Times are estimated from the script unless video_seconds is given; the editor re-times everything to the real video.',
        inputSchema: {
          script: scriptField,
          language: languageField,
          video_seconds: z.number().min(1).max(MAX_SECONDS).optional().describe('Length of the video in seconds, if known. Estimated from the script when omitted.'),
        },
        outputSchema: {
          language: z.enum(LANGS),
          seconds: z.number(),
          estimated: z.boolean().describe('True when the length was estimated from the script.'),
          graphics: z.array(z.object({ kind: z.string(), start: z.number(), end: z.number() }).passthrough()),
        },
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      async ({ script, language, video_seconds }) => {
        const plan = planFromScript(script, { language, seconds: video_seconds })
        if (!plan.ok) return failure(PLAN_ERRORS[plan.error])
        const head = `${plan.graphics.length} graphics over ${plan.seconds}s${plan.estimated ? ' (length estimated from the script)' : ''}:`
        return { ...text(`${head}\n${describePlan(plan)}`), structuredContent: { language: plan.language, seconds: plan.seconds, estimated: plan.estimated, graphics: plan.graphics } }
      },
    )

    server.registerTool(
      'open_in_editor',
      {
        title: 'Open the script in the ReelMotion editor',
        description: `Creates a link that opens the ReelMotion editor with this script and style ready. The user opens it, adds their video (it stays in their browser), and the graphics are placed and can be edited and exported as MP4. The link works for ${DRAFT_DAYS} days; the script is kept on ReelMotion’s server for that long and then deleted.`,
        inputSchema: {
          script: scriptField,
          language: languageField,
          style: z.enum(STYLE_IDS).optional().describe('Style pack id from list_styles. Defaults to neon.'),
        },
        outputSchema: { url: z.string(), expires_at: z.string().describe('When the link stops working (ISO 8601).'), language: z.enum(LANGS), style: z.enum(STYLE_IDS) },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
      },
      async ({ script, language, style }) => {
        const plan = planFromScript(script, { language })
        if (!plan.ok) return failure(PLAN_ERRORS[plan.error])
        // 한 곳의 몫을 먼저 본다 — 거기서 막힌 요청은 모두의 몫을 쓰지 않는다
        if (!visitors.hit(visitor) || !limiter.hit('drafts')) return failure('ReelMotion is making too many links right now. Please try again in a minute.')
        const lang = language ?? guessLang(script)
        const theme = style ?? 'neon'
        const draft = saveDraft(lang, theme, script)
        const url = `${origin}${draftPath(lang, draft.id)}`
        const expires = new Date(draft.expiresAt).toISOString()
        return {
          ...text(`Open in the ReelMotion editor: ${url}\nThe user adds their video there (it is not uploaded), then edits and exports. The link works until ${expires.slice(0, 10)}.`),
          structuredContent: { url, expires_at: expires, language: lang, style: theme },
        }
      },
    )
    return server
  }

  return {
    readDraft,
    /**
     * MCP 요청 하나를 처리한다. POST 만 받는다 — 상태 없는 서버라 이어 둘 흐름(GET)도 닫을 세션(DELETE)도 없다.
     * (GET 을 SDK 에 넘기면 끝나지 않는 흐름을 열어 둔다.) 브라우저로 열어 본 사람에게는 안내를 준다.
     * visitor: 부르는 곳(웹 서버가 알려 준 IP) — 초안 만들기 한도를 세는 데만 쓴다.
     */
    async handle(request: Request, visitor = 'unknown'): Promise<Response> {
      const origin = siteOrigin ?? new URL(request.url).origin
      if (!enabled) {
        return Response.json({ jsonrpc: '2.0', error: { code: -32000, message: 'The ReelMotion connector is turned off for now. Please try again later.' }, id: null }, { status: 503 })
      }
      if (request.method !== 'POST') {
        return Response.json(
          { jsonrpc: '2.0', error: { code: -32000, message: `This is the ReelMotion MCP server. Add this address as a connector in Claude or ChatGPT; it only accepts POST. How to: ${origin}/help#connect` }, id: null },
          { status: 405, headers: { allow: 'POST' } },
        )
      }
      const server = build(origin, visitor)
      const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true, maxRequestBodySize: MAX_BODY })
      await server.connect(transport)
      try {
        return await transport.handleRequest(request)
      } finally {
        void server.close().catch(() => undefined)
      }
    },
  }
}
