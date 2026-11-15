import type { Word } from '../captions/types'
import { alignTokensToWords } from './align'
import type { AsrToken } from './align'
import { decodeToMono16k } from './audio'
import type { SpeechLanguage } from './transcribe'
import { encodeWav } from './wav'

/**
 * ReelMotion 받아쓰기 서버(Qwen3-ASR, `server/asr/`). 영상이 아니라 소리만 보낸다. 서버는 받은 소리를 저장하지 않는다.
 * 같은 주소의 `/api/asr/*` 로 부른다(개발 중에는 vite 가 127.0.0.1:8008 로 넘긴다).
 */
export type SpeechServer = { ready: boolean; model: string; device: string; maxSeconds: number }

export class ServerBusyError extends Error {}
export class ServerTooLongError extends Error {
  maxSeconds: number
  constructor(maxSeconds: number) {
    super('too long')
    this.maxSeconds = maxSeconds
  }
}

/** 서버가 있으면 상태를, 없으면(아직 배포 전·꺼짐) null 을 돌려준다. 모델을 올리는 중이면 ready=false. */
export async function checkSpeechServer(signal?: AbortSignal): Promise<SpeechServer | null> {
  try {
    const response = await fetch('/api/asr/health', { signal, cache: 'no-store' })
    if (response.status !== 200 && response.status !== 503) return null
    const data = (await response.json()) as Partial<SpeechServer> & { engine?: string }
    if (data.engine !== 'qwen3-asr') return null
    return { ready: Boolean(data.ready), model: data.model ?? '', device: data.device ?? '', maxSeconds: data.maxSeconds ?? 600 }
  } catch {
    return null
  }
}

export type ServerProgress = { stage: 'decoding' } | { stage: 'uploading' } | { stage: 'serverListening' }

export async function transcribeOnServer(
  file: Blob,
  options: { language: SpeechLanguage; onProgress: (progress: ServerProgress) => void; signal?: AbortSignal },
): Promise<Word[]> {
  options.onProgress({ stage: 'decoding' })
  const audio = await decodeToMono16k(file)
  const wav = encodeWav(audio, 16000)
  options.onProgress({ stage: 'uploading' })
  const request = fetch(`/api/asr/transcribe?lang=${options.language ?? 'auto'}`, {
    method: 'POST',
    body: wav,
    headers: { 'content-type': 'audio/wav' },
    signal: options.signal,
  })
  // 보내는 데는 보통 1~2초면 끝나므로 곧바로 「서버가 듣는 중」으로 바꿔 보여 준다.
  const timer = window.setTimeout(() => options.onProgress({ stage: 'serverListening' }), 900)
  let response: Response
  try {
    response = await request
  } finally {
    window.clearTimeout(timer)
  }
  if (response.status === 413) {
    const data = (await response.json().catch(() => ({}))) as { maxSeconds?: number }
    throw new ServerTooLongError(data.maxSeconds ?? 600)
  }
  if (response.status === 503) throw new ServerBusyError('busy')
  if (!response.ok) throw new Error(`speech server ${response.status}`)
  const data = (await response.json()) as { text: string; tokens: AsrToken[] }
  return alignTokensToWords(data.text, data.tokens)
}
