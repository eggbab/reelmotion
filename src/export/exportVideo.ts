import { ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Mp4OutputFormat, Output, WebMOutputFormat, canEncodeVideo } from 'mediabunny'
import { loadFontsForGraphics } from '../motion/fonts'
import { renderGraphics } from '../motion/render'
import type { Graphic, Theme } from '../motion/types'

export type ExportResult = { blob: Blob; extension: 'mp4' | 'webm' }

/** 내보내는 영상의 긴 변 최대(픽셀). 너무 큰 원본은 줄여서 브라우저가 감당하게 한다. */
const MAX_SIDE = 1920

export class ExportUnsupportedError extends Error {}

/**
 * 영상에 모션그래픽을 입혀 새 파일로 만든다. 모두 이 브라우저 안에서 일어난다(WebCodecs).
 * H.264(MP4)를 만들 수 있으면 MP4, 아니면 VP9(WebM). 소리는 그대로 옮긴다.
 */
export async function exportVideo(
  source: Blob,
  graphics: Graphic[],
  theme: Theme,
  options: { onProgress: (progress: number) => void; signal?: AbortSignal },
): Promise<ExportResult> {
  if (typeof VideoEncoder === 'undefined') throw new ExportUnsupportedError()
  await loadFontsForGraphics(theme, graphics)

  const input = new Input({ source: new BlobSource(source), formats: ALL_FORMATS })
  const track = await input.getPrimaryVideoTrack()
  if (!track) throw new ExportUnsupportedError()
  const scale = Math.min(1, MAX_SIDE / Math.max(track.displayWidth, track.displayHeight))
  // 인코더는 짝수 크기를 좋아한다.
  const width = Math.round((track.displayWidth * scale) / 2) * 2
  const height = Math.round((track.displayHeight * scale) / 2) * 2

  const mp4 = await canEncodeVideo('avc', { width, height })
  const vp9 = mp4 ? false : await canEncodeVideo('vp9', { width, height })
  if (!mp4 && !vp9) throw new ExportUnsupportedError()

  const output = new Output({ format: mp4 ? new Mp4OutputFormat({ fastStart: 'in-memory' }) : new WebMOutputFormat(), target: new BufferTarget() })
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new ExportUnsupportedError()

  const conversion = await Conversion.init({
    input,
    output,
    video: {
      codec: mp4 ? 'avc' : 'vp9',
      forceTranscode: true,
      processedWidth: width,
      processedHeight: height,
      process: (sample) => {
        ctx.clearRect(0, 0, width, height)
        sample.draw(ctx, 0, 0, width, height)
        renderGraphics(ctx, width, height, graphics, sample.timestamp, theme)
        return canvas
      },
    },
  })
  if (!conversion.isValid) throw new ExportUnsupportedError()
  conversion.onProgress = (progress) => options.onProgress(progress)
  const abort = () => void conversion.cancel()
  options.signal?.addEventListener('abort', abort)
  try {
    await conversion.execute()
  } finally {
    options.signal?.removeEventListener('abort', abort)
  }
  const buffer = (output.target as BufferTarget).buffer
  if (!buffer) throw new Error('empty output')
  return { blob: new Blob([buffer], { type: mp4 ? 'video/mp4' : 'video/webm' }), extension: mp4 ? 'mp4' : 'webm' }
}
