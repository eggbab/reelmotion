import { describe, expect, it, vi } from 'vitest'
import { createApp } from './app'
import { openDb } from './db'
import { CONTACT_MAILS_PER_DAY, CONTACT_PER_DAY, CONTACT_PER_VISITOR, CONTACT_WINDOW, KEEP_DAYS } from './inbox'
import type { Mailer } from './watch'

const ORIGIN = 'https://reelmotion.test'
const NOW = Date.UTC(2026, 10, 19, 3)

function setup(options: { mailer?: Mailer | null; failMail?: boolean } = {}) {
  const db = openDb(':memory:')
  const sent: { subject: string; text: string }[] = []
  const mailer: Mailer = {
    send: async (subject, text) => {
      sent.push({ subject, text })
      if (options.failMail) throw new Error('smtp down')
    },
  }
  let now = NOW
  const app = createApp({
    db,
    google: null,
    config: { siteOrigin: ORIGIN, secureCookies: true, devLogin: true, enforcePlans: false },
    now: () => now,
    mailer: options.mailer === undefined ? mailer : options.mailer,
    admin: { emails: ['boss@example.com'], backupDir: null, alerts: { email: 'vmelabs@outlook.com', mail: true, test: null } },
  })
  const request = (path: string, init: RequestInit & { cookie?: string; ip?: string; noOrigin?: boolean } = {}) => {
    const headers = new Headers(init.headers)
    if (init.cookie) headers.set('cookie', init.cookie)
    if (init.method && init.method !== 'GET' && !init.noOrigin) headers.set('origin', ORIGIN)
    headers.set('x-forwarded-for', init.ip ?? '203.0.113.9')
    return app.request(path, { ...init, headers })
  }
  const send = (body: unknown, ip?: string) => request('/api/contact', { method: 'POST', body: JSON.stringify(body), ip })
  const login = async (email: string) => {
    const response = await request('/api/auth/dev', { method: 'POST', body: JSON.stringify({ email, name: email.split('@')[0] }) })
    return response.headers.get('set-cookie')!.split(';')[0]
  }
  const messages = async (cookie: string) => (await (await request('/api/admin/messages', { cookie })).json()) as { messages: { id: number; kind: string; body: string; email: string | null; page: string; doneAt: number | null }[]; open: number }
  return { request, send, login, messages, sent, advance: (ms: number) => (now += ms) }
}

const QUESTION = { kind: 'question', body: '자막 파일은 어떻게 받나요?', email: 'mina@example.com', lang: 'ko', page: '/ko/help?x=1' }

describe('문의 보내기(/api/contact)', () => {
  it('받아 두고, 운영자에게 알림 메일을 보낸다 — 메일에는 내용과 메일 주소가 없다', async () => {
    const { send, sent, login, messages } = setup()
    const response = await send(QUESTION)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(sent).toHaveLength(1)
    expect(sent[0].subject).toBe('[ReelMotion] 새 문의 #1 · 질문')
    expect(sent[0].text).toContain(`${ORIGIN}/ko/admin#messages`)
    expect(`${sent[0].subject}\n${sent[0].text}`).not.toContain('자막 파일')
    expect(`${sent[0].subject}\n${sent[0].text}`).not.toContain('mina@example.com')
    const boss = await login('boss@example.com')
    const list = await messages(boss)
    expect(list.open).toBe(1)
    expect(list.messages[0]).toMatchObject({ id: 1, kind: 'question', body: QUESTION.body, email: 'mina@example.com', page: '/ko/help', doneAt: null })
  })

  it('다른 사이트에서 보낸 것·틀린 것·너무 큰 것은 받지 않는다', async () => {
    const { request, send, sent } = setup()
    expect((await request('/api/contact', { method: 'POST', body: JSON.stringify(QUESTION), noOrigin: true })).status).toBe(403)
    expect((await send({ ...QUESTION, kind: 'spam' })).status).toBe(400)
    expect((await send({ ...QUESTION, body: '' })).status).toBe(400)
    expect((await request('/api/contact', { method: 'POST', body: 'x'.repeat(20_000) })).status).toBe(413)
    expect(sent).toHaveLength(0)
  })

  it('숨긴 칸을 채운 자동 프로그램에는 받은 척만 한다', async () => {
    const { send, sent, login, messages } = setup()
    expect((await send({ ...QUESTION, website: 'http://spam.example' })).status).toBe(200)
    expect(sent).toHaveLength(0)
    expect((await messages(await login('boss@example.com'))).messages).toEqual([])
  })

  it(`한 곳에서 10분에 ${CONTACT_PER_VISITOR}번까지, 지나면 다시`, async () => {
    const { send, advance } = setup()
    for (let i = 0; i < CONTACT_PER_VISITOR; i++) expect((await send(QUESTION, '198.51.100.1')).status).toBe(200)
    expect((await send(QUESTION, '198.51.100.1')).status).toBe(429)
    expect((await send(QUESTION, '198.51.100.2')).status).toBe(200)
    advance(CONTACT_WINDOW + 1)
    expect((await send(QUESTION, '198.51.100.1')).status).toBe(200)
  })

  it(`모두 합쳐 하루 ${CONTACT_PER_DAY}개까지 받고, 알림 메일은 ${CONTACT_MAILS_PER_DAY}통까지(마지막 것에 그렇다고)`, async () => {
    const { send, sent } = setup()
    for (let i = 0; i < CONTACT_PER_DAY; i++) expect((await send(QUESTION, `10.0.${Math.floor(i / CONTACT_PER_VISITOR)}.1`)).status).toBe(200)
    const full = await send(QUESTION, '10.9.9.9')
    expect(full.status).toBe(503)
    expect(await full.json()).toEqual({ error: 'inbox_full' })
    expect(sent).toHaveLength(CONTACT_MAILS_PER_DAY)
    expect(sent.at(-1)!.text).toContain('더 보내지 않아요')
    expect(sent.at(-2)!.text).not.toContain('더 보내지 않아요')
  })

  it('메일을 보내지 못해도, 메일 설정이 없어도 문의는 받아 둔다', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    const failing = setup({ failMail: true })
    expect((await failing.send(QUESTION)).status).toBe(200)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(quiet).toHaveBeenCalledWith('contact alert failed:', 'smtp down')
    expect((await failing.messages(await failing.login('boss@example.com'))).open).toBe(1)
    quiet.mockRestore()
    const none = setup({ mailer: null })
    expect((await none.send(QUESTION)).status).toBe(200)
    expect((await none.messages(await none.login('boss@example.com'))).open).toBe(1)
  })

  it('3년 지난 문의는 지운다', async () => {
    const { send, login, messages, advance } = setup()
    await send(QUESTION)
    advance(KEEP_DAYS * 24 * 60 * 60 * 1000 + 1)
    await send({ ...QUESTION, body: '새 문의' })
    const list = await messages(await login('boss@example.com'))
    expect(list.messages.map((message) => message.body)).toEqual(['새 문의'])
  })
})

describe('관리자 화면의 문의 칸', () => {
  it('관리자만 보고, 답함 표시·되돌리기·지우기를 한다', async () => {
    const { request, send, login, messages } = setup()
    await send(QUESTION)
    await send({ kind: 'bug', body: '내보내기가 멈춰요', lang: 'en', page: '/app' })
    expect((await request('/api/admin/messages')).status).toBe(401)
    const mina = await login('mina@example.com')
    expect((await request('/api/admin/messages', { cookie: mina })).status).toBe(403)
    expect((await request('/api/admin/messages/1/done', { method: 'POST', cookie: mina, body: '{"done":true}' })).status).toBe(403)
    expect((await request('/api/admin/messages/1', { method: 'DELETE', cookie: mina })).status).toBe(403)

    const boss = await login('boss@example.com')
    expect((await messages(boss)).messages.map((message) => message.id)).toEqual([2, 1])
    expect((await request('/api/admin/messages/1/done', { method: 'POST', cookie: boss, body: '{"done":true}' })).status).toBe(200)
    expect((await messages(boss)).open).toBe(1)
    const overview = (await (await request('/api/admin/overview', { cookie: boss })).json()) as { messages: { open: number } }
    expect(overview.messages).toEqual({ open: 1 })
    expect((await request('/api/admin/messages/1/done', { method: 'POST', cookie: boss, body: '{"done":false}' })).status).toBe(200)
    expect((await messages(boss)).open).toBe(2)
    expect((await request('/api/admin/messages/1/done', { method: 'POST', cookie: boss, body: '{}' })).status).toBe(400)
    expect((await request('/api/admin/messages/99/done', { method: 'POST', cookie: boss, body: '{"done":true}' })).status).toBe(404)
    expect((await request('/api/admin/messages/2', { method: 'DELETE', cookie: boss })).status).toBe(200)
    expect((await request('/api/admin/messages/2', { method: 'DELETE', cookie: boss })).status).toBe(404)
    expect((await request('/api/admin/messages/abc', { method: 'DELETE', cookie: boss })).status).toBe(400)
    expect((await messages(boss)).messages.map((message) => message.id)).toEqual([1])
  })
})
