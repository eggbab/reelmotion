import { useEffect, useRef } from 'react'
import { CLIP_SECONDS, clipUrl, posterUrl } from '../media/clips'
import type { ClipId } from '../media/clips'
import { loadFontsForGraphics } from '../motion/fonts'
import { renderGraphics } from '../motion/render'
import { themeById } from '../motion/themes'
import type { Graphic, ThemeId } from '../motion/types'
import { subscribeFrame } from './ticker'

type Props = {
  clip: ClipId
  graphics: Graphic[]
  theme: ThemeId
  /** 작은 자리에는 작은 영상을 쓴다 */
  small?: boolean
  /** 화면 읽기 프로그램에 읽어 줄 설명 */
  label: string
  className?: string
  /** 그래픽 없이 영상만 */
  bare?: boolean
}

/** 실제 영상 위에서 모션그래픽이 돌아가는 무대. 화면에 보일 때만 영상을 틀고 그린다. */
export function MotionStage({ clip, graphics, theme, small = false, label, className, bare = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!video || !canvas || !ctx) return
    const look = themeById(theme)
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const startedAt = performance.now()

    const draw = (now: number) => {
      if (bare) return
      const t = still ? 4 : video.readyState >= 2 && !video.paused ? video.currentTime : ((now - startedAt) / 1000) % CLIP_SECONDS
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      renderGraphics(ctx, canvas.width, canvas.height, graphics, t, look)
    }

    const resize = new ResizeObserver(() => {
      const ratio = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2)
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * ratio))
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * ratio))
      draw(performance.now())
    })
    resize.observe(canvas)
    void loadFontsForGraphics(look, graphics).then(() => draw(performance.now()))

    let unsubscribe: (() => void) | null = null
    const visibility = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!still) void video.play().catch(() => {})
          unsubscribe ??= subscribeFrame(draw)
        } else {
          video.pause()
          unsubscribe?.()
          unsubscribe = null
        }
      },
      { rootMargin: '120px' },
    )
    visibility.observe(canvas)
    return () => {
      resize.disconnect()
      visibility.disconnect()
      unsubscribe?.()
    }
  }, [graphics, theme, small, bare])

  return (
    <div className={`stage ${className ?? ''}`} role="img" aria-label={label}>
      <video ref={videoRef} src={clipUrl(clip, small)} poster={posterUrl(clip)} muted loop playsInline preload="metadata" aria-hidden="true" />
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  )
}
