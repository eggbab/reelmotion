import type { FaceEvent, FaceRequest } from './faces.worker'
import { type FaceSample, sampleTimes } from './track'

export class FaceDetectError extends Error {}

/**
 * 영상에서 얼굴 자리를 찾는다(faces.worker.ts — 이 브라우저 안에서). 브라우저가 이 영상을 풀지 못하면 null:
 * 그래픽은 기본 자리에 그대로 있고 사람이 「위치」에서 고를 수 있다. 그만두면(signal) null.
 * 그 밖의 실패는 FaceDetectError — 부르는 쪽이 운영자에게 알린다.
 */
export function detectFaces(file: Blob, duration: number, signal: AbortSignal): Promise<FaceSample[] | null> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return resolve(null)
    const worker = new Worker(new URL('./faces.worker.ts', import.meta.url), { type: 'module' })
    const finish = (settle: () => void) => {
      worker.terminate()
      signal.removeEventListener('abort', stop)
      settle()
    }
    const stop = () => finish(() => resolve(null))
    signal.addEventListener('abort', stop)
    worker.onmessage = (event: MessageEvent<FaceEvent>) => {
      const message = event.data
      if (message.type === 'done') finish(() => resolve(message.track))
      else if (message.type === 'unsupported') finish(() => resolve(null))
      else finish(() => reject(new FaceDetectError(message.message)))
    }
    worker.onerror = (event) => finish(() => reject(new FaceDetectError(event.message || 'face worker failed')))
    const request: FaceRequest = { file, times: sampleTimes(duration) }
    worker.postMessage(request)
  })
}
