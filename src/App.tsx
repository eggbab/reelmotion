import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, CSSProperties } from 'react'
import { drawCaption, fontSpec } from './captions/render'
import { cueAt, scriptToWords, wordsToCues } from './captions/segment'
import { CAPTION_STYLES, styleById } from './captions/styles'
import type { CaptionStyle, Cue } from './captions/types'
import { LANGS, MESSAGES, detectLang } from './i18n'
import type { Lang } from './i18n'

const SAMPLE_URL = '/sample.webm'

type Frame = { width: number; height: number; duration: number }

function StyleThumb({ style, label }: { style: CaptionStyle; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let alive = true
    const words = label.split(/\s+/).map((text, i) => ({ text, start: i, end: i + 1 }))
    const cue: Cue = { words, start: 0, end: words.length }
    const thumbStyle = { ...style, position: 0.5, fontSize: style.fontSize * 5.2 }
    const draw = () => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!alive || !canvas || !ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      // 등장 움직임이 끝난 뒤, 마지막 어절을 말하는 순간의 모습
      drawCaption(ctx, canvas.width, canvas.height, cue, words.length - 0.2, thumbStyle)
    }
    draw()
    void document.fonts.load(fontSpec(style, 48), label).then(draw)
    return () => {
      alive = false
    }
  }, [style, label])

  return <canvas ref={canvasRef} width={360} height={132} aria-hidden="true" />
}

export default function App() {
  const [lang, setLang] = useState<Lang>(() => detectLang(navigator.languages))
  const t = MESSAGES[lang]
  const [videoUrl, setVideoUrl] = useState(SAMPLE_URL)
  const [videoFailed, setVideoFailed] = useState(false)
  const [frame, setFrame] = useState<Frame>({ width: 540, height: 960, duration: 0 })
  const [script, setScript] = useState(t.sampleScript)
  const [styleId, setStyleId] = useState(CAPTION_STYLES[0].id)
  const style = styleById(styleId)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pickedUrlRef = useRef<string | null>(null)

  const cues = useMemo(
    () => wordsToCues(scriptToWords(script, frame.duration), { maxChars: style.maxCharsPerCue }),
    [script, frame.duration, style.maxCharsPerCue],
  )

  // 영상이 멈춰 있어도(찾아가기, 대본·디자인 바꾸기) 자막이 바로 따라오도록 매 화면마다 다시 그린다.
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (video && canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        const cue = cueAt(cues, video.currentTime)
        if (cue) drawCaption(ctx, canvas.width, canvas.height, cue, video.currentTime, style)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [cues, style])

  useEffect(() => {
    void document.fonts.load(fontSpec(style, 48), script)
  }, [style, script])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  useEffect(
    () => () => {
      if (pickedUrlRef.current) URL.revokeObjectURL(pickedUrlRef.current)
    },
    [],
  )

  const showVideo = (url: string, picked: boolean) => {
    if (pickedUrlRef.current) URL.revokeObjectURL(pickedUrlRef.current)
    pickedUrlRef.current = picked ? url : null
    setVideoFailed(false)
    setVideoUrl(url)
  }

  const onPickVideo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) showVideo(URL.createObjectURL(file), true)
  }

  const stageStyle = { '--ratio': frame.width / frame.height } as CSSProperties

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <strong>ReelMotion</strong>
          <span className="tagline">{t.tagline}</span>
        </div>
        <div className="langs" role="group" aria-label="Language">
          {LANGS.map(({ id, label }) => (
            <button key={id} type="button" aria-pressed={lang === id} onClick={() => setLang(id)}>
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="work">
        <section className="stage-wrap">
          <div className="stage" style={stageStyle}>
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              loop
              playsInline
              onLoadedMetadata={(event) => {
                const video = event.currentTarget
                setFrame({ width: video.videoWidth, height: video.videoHeight, duration: video.duration })
              }}
              onError={() => setVideoFailed(true)}
            />
            <canvas ref={canvasRef} width={frame.width} height={frame.height} data-testid="captions" />
          </div>
          {videoFailed && (
            <p className="error" role="alert">
              {t.videoError}
            </p>
          )}
        </section>

        <section className="panel">
          <h2>{t.videoHeading}</h2>
          <div className="row">
            <label className="button primary">
              {t.pickVideo}
              <input type="file" accept="video/*" onChange={onPickVideo} hidden />
            </label>
            {videoUrl !== SAMPLE_URL && (
              <button type="button" className="button" onClick={() => showVideo(SAMPLE_URL, false)}>
                {t.useSample}
              </button>
            )}
          </div>

          <h2>
            <label htmlFor="script">{t.scriptHeading}</label>
          </h2>
          <textarea id="script" rows={6} value={script} onChange={(event) => setScript(event.target.value)} />
          <p className="hint">{t.scriptHint}</p>
          <p className="note">{t.timingNote}</p>

          <h2>{t.styleHeading}</h2>
          <div className="styles">
            {CAPTION_STYLES.map((item) => (
              <button
                key={item.id}
                type="button"
                className="style"
                aria-pressed={item.id === styleId}
                aria-label={t.styleNames[item.id]}
                onClick={() => setStyleId(item.id)}
              >
                <StyleThumb style={item} label={t.styleNames[item.id]} />
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
