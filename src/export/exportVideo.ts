import { ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Mp4OutputFormat, Output, StreamTarget, WebMOutputFormat, canEncodeVideo } from 'mediabunny'
import { loadFontsForGraphics } from '../motion/fonts'
import { renderGraphics } from '../motion/render'
import { WATERMARK_FONT, drawWatermark } from '../motion/watermark'
import type { Graphic, Theme } from '../motion/types'

/** blob 이 null 이면 고른 파일에 바로 썼다(options.file) */
export type ExportResult = { blob: Blob | null; extension: 'mp4' | 'webm' }

/** 내보내는 영상의 긴 변 최대(픽셀). 너무 큰 원본은 줄여서 브라우저가 감당하게 한다. */
const MAX_SIDE = 1920

export class ExportUnsupportedError extends Error {}

/** 내보낼 영상의 크기: 긴 변을 MAX_SIDE 까지 줄이고, 인코더가 좋아하는 짝수로 */
export function outputSize(width: number, height: number): { width: number; height: number } {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height))
  return { width: Math.round((width * scale) / 2) * 2, height: Math.round((height * scale) / 2) * 2 }
}

/** 이 브라우저가 만들 수 있는 꼴: H.264(MP4)가 되면 MP4, 아니면 VP9(WebM), 둘 다 안 되면 null */
export async function exportFormat(width: number, height: number): Promise<'mp4' | 'webm' | null> {
  if (typeof VideoEncoder === 'undefined') return null
  const size = outputSize(width, height)
  if (await canEncodeVideo('avc', size)) return 'mp4'
  return (await canEncodeVideo('vp9', size)) ? 'webm' : null
}

/**
 * 영상에 모션그래픽을 입혀 새 파일로 만든다. 모두 이 브라우저 안에서 일어난다(WebCodecs).
 * H.264(MP4)를 만들 수 있으면 MP4, 아니면 VP9(WebM). 소리는 그대로 옮긴다.
 */
export async function exportVideo(
  source: Blob,
  graphics: Graphic[],
  theme: Theme,
  options: {
    onProgress: (progress: number) => void
    signal?: AbortSignal
    watermark?: boolean
    /** 이 파일에 바로 써 나간다(긴 영상 — 다 만든 영상을 메모리에 쥐지 않는다, src/export/saveTarget.ts). 없으면 메모리에 모아 Blob 으로 */
    file?: FileSystemWritableFileStream | null
  },
): Promise<ExportResult> {
  if (typeof VideoEncoder === 'undefined') throw new ExportUnsupportedError()
  await loadFontsForGraphics(theme, graphics)
  if (options.watermark) await document.fonts.load(WATERMARK_FONT, 'ReelMotion').catch(() => null)

  const input = new Input({ source: new BlobSource(source), formats: ALL_FORMATS })
  const track = await input.getPrimaryVideoTrack()
  if (!track) throw new ExportUnsupportedError()
  const { width, height } = outputSize(track.displayWidth, track.displayHeight)
  const format = await exportFormat(track.displayWidth, track.displayHeight)
  if (!format) throw new ExportUnsupportedError()
  const mp4 = format === 'mp4'

  // 파일에 바로 쓸 때는 MP4 의 머리 정보(moov)를 끝에 둔다 — 앞에 두려면 다 만든 영상을 메모리에 쥐어야 한다
  const file = options.file ?? null
  const output = new Output({
    format: mp4 ? new Mp4OutputFormat({ fastStart: file ? false : 'in-memory' }) : new WebMOutputFormat(),
    target: file ? new StreamTarget(file, { chunked: true }) : new BufferTarget(),
  })
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
        if (options.watermark) drawWatermark(ctx, width, height)
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
  } catch (error) {
    // 그만두거나 실패하면 쓰다 만 파일을 버린다(파일 이름은 남을 수 있다)
    if (file) await file.abort().catch(() => undefined)
    throw error
  } finally {
    options.signal?.removeEventListener('abort', abort)
  }
  if (file) return { blob: null, extension: format }
  const buffer = (output.target as BufferTarget).buffer
  if (!buffer) throw new Error('empty output')
  return { blob: new Blob([buffer], { type: mp4 ? 'video/mp4' : 'video/webm' }), extension: mp4 ? 'mp4' : 'webm' }
}
