import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, CSSProperties } from 'react'
import { drawCaption, fontSpec } from './captions/render'
import { cueAt, scriptToWords, wordsToCues } from './captions/segment'
import { CAPTION_STYLES, styleById } from './captions/styles'
import type { CaptionStyle, Cue, Word } from './captions/types'
import { LANGS, MESSAGES, detectLang, fill } from './i18n'
import type { Lang } from './i18n'
import { NoAudioError } from './speech/audio'
import { retime } from './speech/retime'
import { SPEECH_MODELS, transcribe } from './speech/transcribe'
import type { SpeechLanguage, SpeechProgress, SpeechQuality } from './speech/transcribe'

const SAMPLE_URL = '/sample.webm'

type Frame = { width: number; height: number; duration: number }

type SpeechState =
  | { stage: 'idle' }
  | SpeechProgress
  | { stage: 'done'; count: number }
  | { stage: 'failed'; reason: 'noAudio' | 'empty' | 'error' }

/** 받아 적은 글을 대본 칸에 보여 줄 때 한 줄의 길이. */
const SCRIPT_LINE_CHARS = 24

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
  /** 말소리 인식으로 얻은 어절 시간. 없으면 대본을 영상 길이에 고르게 나눈다. */
  const [recognized, setRecognized] = useState<Word[] | null>(null)
  const [speech, setSpeech] = useState<SpeechState>({ stage: 'idle' })
  const [speechLanguage, setSpeechLanguage] = useState<Lang | 'auto'>(lang)
  const [speechQuality, setSpeechQuality] = useState<SpeechQuality>('standard')

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pickedUrlRef = useRef<string | null>(null)
  const pickedFileRef = useRef<File | null>(null)
  /** 영상을 바꾼 뒤에 도착한 옛 인식 결과를 버리기 위한 번호. */
  const speechRunRef = useRef(0)

  const cues = useMemo(() => {
    const words = recognized ? retime(recognized, script) : scriptToWords(script, frame.duration)
    return wordsToCues(words, { maxChars: style.maxCharsPerCue })
  }, [recognized, script, frame.duration, style.maxCharsPerCue])

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

  const showVideo = (file: File | null) => {
    if (pickedUrlRef.current) URL.revokeObjectURL(pickedUrlRef.current)
    const url = file ? URL.createObjectURL(file) : SAMPLE_URL
    pickedUrlRef.current = file ? url : null
    pickedFileRef.current = file
    speechRunRef.current += 1
    setVideoFailed(false)
    setVideoUrl(url)
    setRecognized(null)
    setSpeech({ stage: 'idle' })
    setScript(file ? '' : t.sampleScript)
  }

  const onPickVideo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) showVideo(file)
  }

  const makeCaptionsFromSpeech = async () => {
    const file = pickedFileRef.current
    if (!file) return
    const run = ++speechRunRef.current
    const current = () => speechRunRef.current === run
    try {
      const language: SpeechLanguage = speechLanguage === 'auto' ? null : speechLanguage
      const words = await transcribe(file, {
        quality: speechQuality,
        language,
        onProgress: (progress) => {
          if (current()) setSpeech(progress)
        },
      })
      if (!current()) return
      if (words.length === 0) {
        setSpeech({ stage: 'failed', reason: 'empty' })
        return
      }
      const lines = wordsToCues(words, { maxChars: SCRIPT_LINE_CHARS })
      setRecognized(words)
      setScript(lines.map((cue) => cue.words.map((word) => word.text).join(' ')).join('\n'))
      setSpeech({ stage: 'done', count: words.length })
    } catch (error) {
      if (current()) setSpeech({ stage: 'failed', reason: error instanceof NoAudioError ? 'noAudio' : 'error' })
    }
  }

  const speechBusy = speech.stage === 'decoding' || speech.stage === 'download' || speech.stage === 'listening'
  const hasOwnVideo = videoUrl !== SAMPLE_URL
  const speechMessage = (() => {
    switch (speech.stage) {
      case 'idle':
        return hasOwnVideo ? fill(t.speechFirstTime, { megabytes: SPEECH_MODELS[speechQuality].megabytes }) : t.speechNeedsVideo
      case 'decoding':
        return t.speechDecoding
      case 'download':
        return fill(t.speechDownload, { percent: Math.round(speech.progress * 100) })
      case 'listening':
        return t.speechListening
      case 'done':
        return fill(t.speechDone, { count: speech.count })
      case 'failed':
        return { noAudio: t.speechNoAudio, empty: t.speechEmpty, error: t.speechFailed }[speech.reason]
    }
  })()

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
            {hasOwnVideo && (
              <button type="button" className="button" onClick={() => showVideo(null)}>
                {t.useSample}
              </button>
            )}
          </div>

          <h2>
            <label htmlFor="script">{t.scriptHeading}</label>
          </h2>
          <div className="row">
            <button
              type="button"
              className="button primary"
              disabled={!hasOwnVideo || speechBusy}
              onClick={() => void makeCaptionsFromSpeech()}
            >
              {t.speechButton}
            </button>
            <label className="select">
              {t.speechLanguage}
              <select
                value={speechLanguage}
                disabled={speechBusy}
                onChange={(event) => setSpeechLanguage(event.target.value as Lang | 'auto')}
              >
                {LANGS.map(({ id, label }) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
                <option value="auto">{t.speechAuto}</option>
              </select>
            </label>
            <label className="select">
              {t.speechQuality}
              <select
                value={speechQuality}
                disabled={speechBusy}
                onChange={(event) => setSpeechQuality(event.target.value as SpeechQuality)}
              >
                <option value="standard">{t.speechStandard}</option>
                <option value="precise">{t.speechPrecise}</option>
              </select>
            </label>
          </div>
          <p className={speech.stage === 'failed' ? 'error' : 'hint'} role="status" data-testid="speech-status">
            {speechMessage}
          </p>
          {speech.stage === 'download' && <progress value={speech.progress} max={1} />}
          <textarea id="script" rows={7} value={script} onChange={(event) => setScript(event.target.value)} />
          <p className="hint">{t.scriptHint}</p>
          {!recognized && script.trim() !== '' && <p className="note">{t.timingNote}</p>}

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
