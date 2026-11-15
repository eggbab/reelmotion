import { MAX_OPS, validateOps } from '../../src/editor/assist'
import type { AssistOp, AssistState } from '../../src/editor/assist'
import type { Lang } from '../../src/langs'
import { THEMES } from '../../src/motion/themes'

/**
 * 「말로 고치기」의 AI: 우리 서버의 오픈 모델(llama.cpp 서버 + Qwen3-4B-Instruct-2507, Apache-2.0 — deploy/compose.yml 의 assist).
 * 지시와 작업 요약(그래픽 글·시간·스타일·대본)을 보내고, 정해진 JSON 꼴(RESPONSE_SCHEMA)로만 답하게 한 뒤 검사한다.
 * 보낸 글은 저장하지 않고 학습에 쓰지 않는다(개인정보처리방침). 유료 AI 서비스는 쓰지 않는다(사용자 결정).
 */
export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export interface AssistModel {
  ready(): Promise<boolean>
  complete(messages: ChatMessage[], schema: object): Promise<string>
}

export function createLlamaModel(baseUrl: string, fetchImpl: typeof fetch = fetch): AssistModel {
  const base = baseUrl.replace(/\/+$/, '')
  return {
    async ready() {
      try {
        return (await fetchImpl(`${base}/health`, { signal: AbortSignal.timeout(3000) })).ok
      } catch {
        return false
      }
    },
    async complete(messages, schema) {
      const response = await fetchImpl(`${base}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // CPU 로 돌 때를 생각해 넉넉히(그래픽 카드에서는 몇 초).
        signal: AbortSignal.timeout(180_000),
        body: JSON.stringify({ messages, temperature: 0.2, max_tokens: 700, response_format: { type: 'json_schema', json_schema: { name: 'edits', schema } } }),
      })
      if (!response.ok) throw new Error(`assist ${response.status}`)
      const body = (await response.json()) as { choices?: { message?: { content?: unknown } }[] }
      const content = body.choices?.[0]?.message?.content
      if (typeof content !== 'string') throw new Error('assist: no content')
      return content
    },
  }
}

const KINDS = ['title', 'lowerThird', 'stat', 'bars', 'list', 'callout', 'quote', 'captions']
const THEME_IDS = THEMES.map((theme) => theme.id)

/** 답의 꼴. llama.cpp 가 이 꼴 밖의 글자를 내지 못하게 막는다(문법 제약). */
export const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    ops: {
      type: 'array',
      maxItems: MAX_OPS,
      items: {
        type: 'object',
        properties: {
          op: { type: 'string', enum: ['update', 'add', 'remove', 'theme', 'replace'] },
          id: { type: 'string' },
          kind: { type: 'string', enum: KINDS },
          start: { type: 'number' },
          end: { type: 'number' },
          fields: { type: 'object' },
          theme: { type: 'string', enum: THEME_IDS },
          find: { type: 'string' },
          replace: { type: 'string' },
        },
        required: ['op'],
        additionalProperties: false,
      },
    },
  },
  required: ['reply', 'ops'],
  additionalProperties: false,
}

const LANGUAGE: Record<Lang, string> = { en: 'English', ko: 'Korean', ja: 'Japanese' }
/** 사이트 글과 같은 말투: 한국어는 해요체, 일본어는 です・ます. */
const TONE: Record<Lang, string> = { en: '', ko: ' (해요체, for example "바꿨어요", never "변경했습니다")', ja: ' (です・ます調, for example "変更しました")' }

export function systemPrompt(lang: Lang): string {
  return `You are the editing assistant inside ReelMotion, a video editor that places motion graphics on a talking video.
You receive the current project and one instruction from the user. Respond with JSON only:
{"reply": "<one short sentence in ${LANGUAGE[lang]} saying what you changed>", "ops": [<operations>]}

Operations:
- {"op":"update","id":"<graphic id>","fields":{...}} change fields of one graphic (you can also change "start" and "end" in seconds)
- {"op":"add","kind":"<kind>","start":<seconds>,"end":<seconds>,"fields":{...}} add a new graphic
- {"op":"remove","id":"<graphic id>"} delete a graphic
- {"op":"theme","theme":"<style>"} change the style of every graphic
- {"op":"replace","find":"<exact text from the transcript>","replace":"<new text>"} fix words in the transcript (captions follow it)

Graphic kinds and their fields:
- title: text
- lowerThird (name tag): name, role
- stat (counter): value (a number), prefix, suffix (like "%" or "x"), decimals, label
- bars (bar chart): title, unit, items [{"label": "...", "value": 12}]
- list (checklist): title, items ["...", "..."]
- callout (pointer): text, x, y (position on the screen from 0 to 1)
- quote: text, author
- captions: only start and end; the words come from the transcript

Styles: clean (plain white), neon (glowing colors), bold (thick and colorful), editorial (magazine, serif), seoul (Korean variety-show captions), tokyo (Japanese TV telop).

Rules:
- Only use ids that exist in the project. Keep every time between 0 and the video duration.
- Change only what the user asked for. Leave every other graphic as it is.
- Write graphic text in the language the project already uses, unless the user asks otherwise.
- If the instruction is unclear or cannot be done with these operations, return "ops": [] and say briefly in "reply" what you can do.
- Always write "reply" in ${LANGUAGE[lang]}, in a friendly polite tone${TONE[lang]}.`
}

const EXAMPLE_REPLY: Record<Lang, string> = {
  en: 'Changed the number to 40 and switched to the Seoul style.',
  ko: '숫자를 40으로 바꾸고 서울 스타일로 바꿨어요.',
  ja: '数字を40にして、ソウルのスタイルにしました。',
}

export function userPrompt(state: AssistState, instruction: string): string {
  const project = { duration: Math.round(state.duration * 10) / 10, style: state.theme, graphics: state.graphics, transcript: state.script }
  return `Project:\n${JSON.stringify(project)}\n\nInstruction: ${instruction}`
}

/** 한 번 보여 주는 예(작은 모델이 꼴을 잘 따르게). */
export function buildMessages(state: AssistState, instruction: string, lang: Lang): ChatMessage[] {
  const example: AssistState = {
    duration: 10,
    theme: 'neon',
    script: 'Three habits for better sleep. Most people fall asleep 37% faster.',
    graphics: [
      { id: 'a', kind: 'title', start: 0, end: 3, text: 'Three habits' },
      { id: 'b', kind: 'stat', start: 4, end: 7, value: 37, prefix: '', suffix: '%', decimals: 0, label: 'faster' },
    ],
  }
  return [
    { role: 'system', content: systemPrompt(lang) },
    { role: 'user', content: userPrompt(example, 'make the number 40 and use the Seoul style') },
    { role: 'assistant', content: JSON.stringify({ reply: EXAMPLE_REPLY[lang], ops: [{ op: 'update', id: 'b', fields: { value: 40 } }, { op: 'theme', theme: 'seoul' }] }) },
    { role: 'user', content: userPrompt(state, instruction) },
  ]
}

/** 모델의 답을 읽어 검사한다. 버린 고치기 수도 알려 준다(편집기가 「일부는 못 했어요」를 띄운다). */
export function parseReply(content: string, state: AssistState): { reply: string; ops: AssistOp[]; dropped: number } | null {
  let raw: unknown
  try {
    raw = JSON.parse(content)
  } catch {
    return null
  }
  if (typeof raw !== 'object' || raw === null) return null
  const body = raw as { reply?: unknown; ops?: unknown }
  const ops = validateOps(raw, state)
  const total = Array.isArray(body.ops) ? body.ops.length : 0
  const reply = typeof body.reply === 'string' ? body.reply.trim().slice(0, 300) : ''
  return { reply, ops, dropped: Math.max(0, Math.min(total, MAX_OPS) - ops.length) }
}

/** 남용 막기: 열쇠(계정 또는 IP)마다 시간 창 안의 요청 수. 메모리에만 두고 창이 지나면 버린다(저장·기록하지 않음). */
export function createRateLimiter(limit: number, windowMs: number, now: () => number = Date.now) {
  const hits = new Map<string, number[]>()
  return {
    hit(key: string): boolean {
      const time = now()
      const recent = (hits.get(key) ?? []).filter((at) => at > time - windowMs)
      if (recent.length >= limit) {
        hits.set(key, recent)
        return false
      }
      recent.push(time)
      hits.set(key, recent)
      if (hits.size > 10_000) for (const [other, times] of hits) if (times.every((at) => at <= time - windowMs)) hits.delete(other)
      return true
    },
  }
}
