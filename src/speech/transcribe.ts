import type { Word } from '../captions/types'
import { decodeToMono16k } from './audio'
import type { WorkerEvent, WorkerRequest } from './whisper.worker'
import { chunksToWords } from './words'

/**
 * 말소리 인식에 쓰는 Whisper(무료 공개 모델, Apache-2.0). 사용자의 브라우저 안에서 돌아가므로 우리 쪽 비용이 없다.
 * megabytes 는 처음 한 번 내려받는 크기(화면 안내용).
 * 고른 까닭과 다른 후보(Moonshine·Qwen3-ASR·SenseVoice 등)와의 비교는 AGENTS.md 「말소리 인식」 절.
 */
export const SPEECH_MODELS = {
  standard: { id: 'onnx-community/whisper-small_timestamped', dtype: 'q8', megabytes: 250 },
  precise: { id: 'onnx-community/whisper-large-v3-turbo_timestamped', dtype: 'q4', megabytes: 760 },
} as const

export type SpeechQuality = keyof typeof SPEECH_MODELS

export type SpeechProgress = { stage: 'decoding' } | { stage: 'download'; progress: number } | { stage: 'listening' }

export type SpeechLanguage = 'ko' | 'ja' | 'en' | null

export async function transcribe(
  file: Blob,
  options: { quality: SpeechQuality; language: SpeechLanguage; onProgress: (progress: SpeechProgress) => void },
): Promise<Word[]> {
  options.onProgress({ stage: 'decoding' })
  const audio = await decodeToMono16k(file)
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./whisper.worker.ts', import.meta.url), { type: 'module' })
    const finish = (settle: () => void) => {
      worker.terminate()
      settle()
    }
    worker.onmessage = (event: MessageEvent<WorkerEvent>) => {
      const message = event.data
      if (message.type === 'download') options.onProgress({ stage: 'download', progress: message.progress })
      else if (message.type === 'listening') options.onProgress({ stage: 'listening' })
      else if (message.type === 'done') finish(() => resolve(chunksToWords(message.chunks)))
      else finish(() => reject(new Error(message.message)))
    }
    worker.onerror = (event) => finish(() => reject(new Error(event.message)))
    const model = SPEECH_MODELS[options.quality]
    const request: WorkerRequest = { audio, model: model.id, dtype: model.dtype, language: options.language }
    worker.postMessage(request, [audio.buffer])
  })
}
