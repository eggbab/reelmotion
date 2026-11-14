import { useEffect, useMemo, useRef } from 'react'
import { drawCaption, fontSpec } from '../captions/render'
import { cueAt, scriptToWords, scriptTokens, wordsToCues } from '../captions/segment'
import { styleById } from '../captions/styles'
import { subscribeFrame } from './ticker'

export type Backdrop = 'ink' | 'blue' | 'green' | 'violet' | 'orange'

type Props = {
  /** 무대에서 되풀이해 보여 줄 말 */
  script: string
  styleId: string
  backdrop?: Backdrop
  /** 글자 크기 배율. 작은 무대일수록 키운다. */
  scale?: number
  /** 자막의 세로 위치(0 위 ~ 1 아래) */
  position?: number
  /** 여러 무대가 똑같이 움직이지 않게 어긋나게 하는 시간(초) */
  phase?: number
  className?: string
}

const SECONDS_PER_WORD = 0.42
const REST_SECONDS = 0.9

/** 제품과 같은 코드(drawCaption)로 자막이 움직이는 작은 무대. 화면에 보일 때만 그린다. */
export function CaptionStage({ script, styleId, backdrop = 'ink', scale = 1, position, phase = 0, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const timeline = useMemo(() => {
    const base = styleById(styleId)
    const style = { ...base, fontSize: base.fontSize * scale, position: position ?? base.position }
    const seconds = Math.max(1.6, scriptTokens(script).length * SECONDS_PER_WORD)
    const cues = wordsToCues(scriptToWords(script, seconds), { maxChars: base.maxCharsPerCue })
    return { style, cues, loop: seconds + REST_SECONDS }
  }, [script, styleId, scale, position])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const startedAt = performance.now()
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const draw = (now: number) => {
      const elapsed = (now - startedAt) / 1000 + phase
      // 움직임을 줄여 달라는 설정이면 첫 자막이 다 나온 모습으로 멈춰 둔다.
      const t = still ? (timeline.cues[0]?.end ?? 0) - 0.01 : elapsed % timeline.loop
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const cue = cueAt(timeline.cues, t)
      if (cue) drawCaption(ctx, canvas.width, canvas.height, cue, t, timeline.style)
    }

    const resize = new ResizeObserver(() => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(canvas.clientWidth * ratio)
      canvas.height = Math.round(canvas.clientHeight * ratio)
      draw(performance.now())
    })
    resize.observe(canvas)
    void document.fonts.load(fontSpec(timeline.style, 48), script).then(() => draw(performance.now()))

    let unsubscribe: (() => void) | null = null
    const visibility = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !still && !unsubscribe) unsubscribe = subscribeFrame(draw)
      if (!entry.isIntersecting && unsubscribe) {
        unsubscribe()
        unsubscribe = null
      }
    })
    visibility.observe(canvas)

    return () => {
      resize.disconnect()
      visibility.disconnect()
      unsubscribe?.()
    }
  }, [timeline, script, phase])

  return (
    <div className={`set set--${backdrop} ${className ?? ''}`} role="img" aria-label={script}>
      <canvas ref={canvasRef} />
    </div>
  )
}
