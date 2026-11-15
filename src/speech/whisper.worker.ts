import { pipeline } from '@huggingface/transformers'
import type { SpeechChunk } from './words'

export type WorkerRequest = { audio: Float32Array; model: string; dtype: 'q8' | 'q4'; language: string | null }

export type WorkerEvent =
  | { type: 'download'; progress: number }
  | { type: 'listening' }
  | { type: 'done'; chunks: SpeechChunk[] }
  | { type: 'error'; message: string }

const post = (event: WorkerEvent) => self.postMessage(event)

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  try {
    const { audio, model, dtype, language } = event.data
    const transcriber = await pipeline('automatic-speech-recognition', model, {
      dtype,
      progress_callback: (info) => {
        if (info.status === 'progress_total') post({ type: 'download', progress: info.progress / 100 })
      },
    })
    post({ type: 'listening' })
    const output = await transcriber(audio, {
      language: language ?? undefined,
      task: 'transcribe',
      return_timestamps: 'word',
      // 30초로 한 번에 들으면 한국어에서 둘째 문장부터 빠지는 일이 있었다(2026-11-15 실제 음성으로 확인).
      // 15초씩 3초 겹쳐 들으면 빠지지 않았다. 시간은 조금 더 걸린다(24초 음성 4.8초 → 10.2초).
      chunk_length_s: 15,
      stride_length_s: 3,
    })
    post({ type: 'done', chunks: (output.chunks ?? []) as SpeechChunk[] })
  } catch (error) {
    post({ type: 'error', message: error instanceof Error ? error.message : String(error) })
  }
}
