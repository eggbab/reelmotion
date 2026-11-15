import { ALL_FORMATS, BlobSource, CanvasSink, Input } from 'mediabunny'
import * as ort from 'onnxruntime-web/wasm'
import plainWasm from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url'
import modelUrl from './ultraface-rfb-320.onnx?url'
import { type FaceSample, decodeFaces } from './track'

/**
 * 영상의 장면들에서 가장 큰 얼굴의 자리를 찾는다 — 모두 이 브라우저 안에서(영상과 얼굴 자리는 어디로도 보내지 않는다).
 * 얼굴 찾기 모델은 UltraFace RFB-320(MIT, 1.3MB, 이 사이트에서 준다 — ultraface-rfb-320.onnx)이고, 누구인지 알아보지는 않는다(자리만).
 * 실행 파일은 받아쓰기와 같은 ONNX Runtime 의 작은 판(asyncify 가 아닌 것)을 이 사이트에서 받는다.
 */
export type FaceRequest = { file: Blob; times: number[] }
export type FaceEvent = { type: 'done'; track: FaceSample[] } | { type: 'unsupported' } | { type: 'error'; message: string }

/** 모델이 받는 그림 크기(가로 320 · 세로 240). 영상 장면을 이 크기로 늘이거나 줄여 넣고, 답(0~1 비율)을 영상에 그대로 쓴다. */
const WIDTH = 320
const HEIGHT = 240

ort.env.wasm.wasmPaths = { wasm: plainWasm }
// 모델이 작아 한 줄로 충분하다(장면 하나에 20~60ms). 여러 줄을 쓰면 받아쓰기와 CPU 를 다툰다.
ort.env.wasm.numThreads = 1
ort.env.logLevel = 'error'

const post = (event: FaceEvent) => self.postMessage(event)

/** 그림(RGBA)을 모델이 받는 꼴로: 색 판 셋(R·G·B)을 차례로, 값은 (색 − 127) ÷ 128 */
function toInput(pixels: Uint8ClampedArray, out: Float32Array) {
  const n = WIDTH * HEIGHT
  for (let p = 0; p < n; p++) {
    out[p] = (pixels[p * 4] - 127) / 128
    out[n + p] = (pixels[p * 4 + 1] - 127) / 128
    out[2 * n + p] = (pixels[p * 4 + 2] - 127) / 128
  }
}

self.onmessage = async (event: MessageEvent<FaceRequest>) => {
  const { file, times } = event.data
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS })
  try {
    if (typeof VideoDecoder === 'undefined' || typeof OffscreenCanvas === 'undefined') return post({ type: 'unsupported' })
    const video = await input.getPrimaryVideoTrack()
    if (!video || !(await video.canDecode())) return post({ type: 'unsupported' })
    const session = await ort.InferenceSession.create(modelUrl, { executionProviders: ['wasm'], logSeverityLevel: 3 })
    const sink = new CanvasSink(video, { width: WIDTH, height: HEIGHT, fit: 'fill', poolSize: 1 })
    const data = new Float32Array(3 * WIDTH * HEIGHT)
    const track: FaceSample[] = []
    let index = 0
    for await (const frame of sink.canvasesAtTimestamps(times)) {
      const t = times[index++]
      const context = frame ? (frame.canvas as OffscreenCanvas).getContext('2d') : null
      if (!context) {
        track.push({ t, box: null })
        continue
      }
      toInput(context.getImageData(0, 0, WIDTH, HEIGHT).data, data)
      const output = await session.run({ input: new ort.Tensor('float32', data, [1, 3, HEIGHT, WIDTH]) })
      const faces = decodeFaces(output.scores.data as Float32Array, output.boxes.data as Float32Array)
      track.push({ t, box: faces[0] ?? null })
    }
    void session.release()
    post({ type: 'done', track })
  } catch (error) {
    post({ type: 'error', message: error instanceof Error ? error.message : String(error) })
  } finally {
    input.dispose()
  }
}
