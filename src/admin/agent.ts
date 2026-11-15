import type { AdminCopy } from './copy'

/** 서버가 어림한 브라우저 종류(chrome-windows — server/app/pulse.ts 의 agentOf)를 사람이 읽는 이름으로 */
export function agentLabel(agent: string, copy: AdminCopy['pulse']): string {
  if (agent === 'connector') return copy.connector
  if (agent === 'bot') return copy.bot
  if (agent === 'unknown') return copy.unknown
  const [family, system] = agent.split('-')
  const familyName = (copy.families as Record<string, string | undefined>)[family]
  const systemName = (copy.systems as Record<string, string | undefined>)[system]
  return familyName && systemName ? `${familyName} · ${systemName}` : agent
}
