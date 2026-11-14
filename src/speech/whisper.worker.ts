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
      chunk_length_s: 30,
    })
    post({ type: 'done', chunks: (output.chunks ?? []) as SpeechChunk[] })
  } catch (error) {
    post({ type: 'error', message: error instanceof Error ? error.message : String(error) })
  }
}
