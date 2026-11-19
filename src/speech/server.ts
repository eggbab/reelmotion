import type { Word } from '../captions/types'
import { alignTokensToWords } from './align'
import type { AsrToken } from './align'
import { decodeToMono16k } from './audio'
import { offsetWords, splitAudio } from './chunks'
import type { SpeechLanguage } from './transcribe'
import { encodeWav } from './wav'
import { release } from '../http'

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
    if (response.status !== 200 && response.status !== 503) {
      release(response)
      return null
    }
    const data = (await response.json()) as Partial<SpeechServer> & { engine?: string }
    if (data.engine !== 'qwen3-asr') return null
    return { ready: Boolean(data.ready), model: data.model ?? '', device: data.device ?? '', maxSeconds: data.maxSeconds ?? 600 }
  } catch {
    return null
  }
}

/** 긴 소리를 나눠 보낼 때 몇 번째 조각인지(chunks.ts). 한 번에 보내면 없다 */
export type ServerPart = { index: number; count: number }
export type ServerProgress = { stage: 'decoding' } | { stage: 'uploading'; part?: ServerPart } | { stage: 'serverListening'; part?: ServerPart }

const SAMPLE_RATE = 16000

type ServerOptions = {
  language: SpeechLanguage
  onProgress: (progress: ServerProgress) => void
  signal?: AbortSignal
  /** 서버가 한 번에 받는 길이(초, 서버 상태의 maxSeconds). 넘으면 조용한 틈에서 나눠 차례로 보낸다 */
  maxSeconds?: number
}

export async function transcribeOnServer(file: Blob, options: ServerOptions): Promise<Word[]> {
  options.onProgress({ stage: 'decoding' })
  return transcribeAudioOnServer(await decodeToMono16k(file), options)
}

/** 16kHz 한 채널 소리를 받아 적는다. 길면 조각마다 보내고 낱말 시간을 이어 붙인다 */
export async function transcribeAudioOnServer(audio: Float32Array, options: ServerOptions): Promise<Word[]> {
  const pieces = splitAudio(audio, SAMPLE_RATE, options.maxSeconds ?? 600)
  const words: Word[] = []
  for (const [i, piece] of pieces.entries()) {
    const part = pieces.length > 1 ? { index: i + 1, count: pieces.length } : undefined
    const heard = await sendPiece(audio.subarray(piece.start, piece.end), options, part)
    words.push(...offsetWords(heard, piece.start / SAMPLE_RATE))
  }
  return words
}

async function sendPiece(samples: Float32Array, options: ServerOptions, part: ServerPart | undefined): Promise<Word[]> {
  const wav = encodeWav(samples, SAMPLE_RATE)
  options.onProgress({ stage: 'uploading', part })
  const request = fetch(`/api/asr/transcribe?lang=${options.language ?? 'auto'}`, {
    method: 'POST',
    body: wav,
    headers: { 'content-type': 'audio/wav' },
    signal: options.signal,
  })
  // 보내는 데는 보통 1~2초면 끝나므로 곧바로 「서버가 듣는 중」으로 바꿔 보여 준다.
  const timer = window.setTimeout(() => options.onProgress({ stage: 'serverListening', part }), 900)
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
  if (!response.ok) {
    release(response)
    if (response.status === 503) throw new ServerBusyError('busy')
    throw new Error(`speech server ${response.status}`)
  }
  const data = (await response.json()) as { text: string; tokens: AsrToken[] }
  return alignTokensToWords(data.text, data.tokens)
}
