import { Download, Pause, Play, Upload, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { joinWords, scriptToWords } from '../captions/segment'
import type { Word } from '../captions/types'
import { ExportUnsupportedError, exportVideo } from '../export/exportVideo'
import { useLang } from '../lang'
import { fill } from '../langs'
import { CLIPS, clipUrl, posterUrl } from '../media/clips'
import type { ClipId } from '../media/clips'
import { direct } from '../motion/direct'
import { loadFontsForGraphics } from '../motion/fonts'
import { renderGraphics } from '../motion/render'
import { THEMES, themeById } from '../motion/themes'
import type { Graphic, ThemeId } from '../motion/types'
import { Logo, LangPicker } from '../site/Chrome'
import { pageMeta } from '../site/meta'
import { usePageMeta } from '../site/usePageMeta'
import { NoAudioError } from '../speech/audio'
import { retime } from '../speech/retime'
import { ServerBusyError, ServerTooLongError, checkSpeechServer, transcribeOnServer } from '../speech/server'
import type { ServerProgress, SpeechServer } from '../speech/server'
import { SPEECH_MODELS, transcribe } from '../speech/transcribe'
import type { SpeechProgress, SpeechQuality } from '../speech/transcribe'
import { EDITOR_COPY, SAMPLE_SCRIPTS } from './copy'
import type { EditorCopy } from './copy'
import { clampToDuration, createGraphic, syncCaptions } from './graphics'
import { Inspector } from './Inspector'
import { Timeline } from './Timeline'
import './editor.css'

type Source = { kind: 'sample'; clip: ClipId } | { kind: 'file'; file: File; url: string }

type SpeechState =
  | { stage: 'idle' }
  | SpeechProgress
  | ServerProgress
  | { stage: 'done'; count: number }
  | { stage: 'failed'; reason: 'noAudio' | 'empty' | 'error' | 'busy' }
  | { stage: 'failed'; reason: 'tooLong'; maxSeconds: number }

/** 받아쓰는 곳: ReelMotion 서버(Qwen3-ASR) 또는 이 브라우저(Whisper 보통·높음) */
type SpeechEngine = 'server' | SpeechQuality

type ExportState = { stage: 'idle' } | { stage: 'running'; progress: number } | { stage: 'done'; url: string; extension: string } | { stage: 'failed'; unsupported: boolean }

const THEME_IDS = THEMES.map((theme) => theme.id)

const sourceUrl = (source: Source) => (source.kind === 'file' ? source.url : clipUrl(source.clip))

async function sourceBlob(source: Source): Promise<Blob> {
  if (source.kind === 'file') return source.file
  const response = await fetch(clipUrl(source.clip))
  return response.blob()
}

export function EditorPage() {
  const { lang } = useLang()
  const copy = EDITOR_COPY[lang]
  const [params] = useSearchParams()
  const initialScript = params.get('script')
  const [source, setSource] = useState<Source | null>(() => (initialScript ? { kind: 'sample', clip: 'explainer' } : null))
  const [script, setScript] = useState(() => initialScript ?? SAMPLE_SCRIPTS[lang])
  const [recognized, setRecognized] = useState<Word[] | null>(null)
  const [graphics, setGraphics] = useState<Graphic[]>([])
  const [themeId, setThemeId] = useState<ThemeId>(() => (THEME_IDS.includes(params.get('theme') as ThemeId) ? (params.get('theme') as ThemeId) : 'neon'))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState<'graphics' | 'transcript'>('transcript')
  const [duration, setDuration] = useState(0)
  const [size, setSize] = useState({ width: 1280, height: 720 })
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speech, setSpeech] = useState<SpeechState>({ stage: 'idle' })
  const [speechLanguage, setSpeechLanguage] = useState<string>(lang)
  const [engine, setEngine] = useState<SpeechEngine>('standard')
  const [engineChosen, setEngineChosen] = useState(false)
  const [server, setServer] = useState<SpeechServer | null>(null)
  const [exportState, setExportState] = useState<ExportState>({ stage: 'idle' })
  const [autoMade, setAutoMade] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const serial = useRef(100)
  const run = useRef(0)
  const exportAbort = useRef<AbortController | null>(null)

  const theme = themeById(themeId)
  const words = useMemo(() => (recognized ? retime(recognized, script) : duration > 0 ? scriptToWords(script, duration) : []), [recognized, script, duration])
  const shown = useMemo(() => syncCaptions(graphics, words), [graphics, words])
  const selected = shown.find((g) => g.id === selectedId) ?? null

  // 예시 영상이나 첫 화면에서 넘어온 대본은 영상 길이를 안 뒤 한 번 자동으로 그래픽을 만든다.
  if (!autoMade && source?.kind === 'sample' && words.length > 0 && graphics.length === 0) {
    setAutoMade(true)
    setGraphics(clampToDuration(direct(words), duration))
    setTab('graphics')
  }

  useEffect(() => {
    void loadFontsForGraphics(theme, shown)
  }, [theme, shown])

  // 받아쓰기 서버가 있는지 본다. 모델을 올리는 중이면 15초마다 다시 본다.
  useEffect(() => {
    const controller = new AbortController()
    let timer = 0
    const check = async () => {
      const status = await checkSpeechServer(controller.signal)
      if (controller.signal.aborted) return
      setServer(status)
      if (status && !status.ready) timer = window.setTimeout(() => void check(), 15000)
    }
    void check()
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [])

  // 서버가 준비돼 있고 사용자가 직접 고르지 않았으면 서버로 받아 적는다.
  if (!engineChosen && server?.ready && engine !== 'server') setEngine('server')
  if (!engineChosen && !server?.ready && engine === 'server') setEngine('standard')

  // 그리기: 영상 위 캔버스에 지금 시각의 그래픽
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (video && canvas && ctx) {
        const ratio = Math.min(window.devicePixelRatio || 1, 2)
        const w = Math.max(1, Math.round(canvas.clientWidth * ratio))
        const h = Math.max(1, Math.round(canvas.clientHeight * ratio))
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w
          canvas.height = h
        }
        ctx.clearRect(0, 0, w, h)
        renderGraphics(ctx, w, h, shown, video.currentTime, theme)
        setTime(video.currentTime)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [shown, theme])

  const seek = useCallback((t: number) => {
    const video = videoRef.current
    if (video) video.currentTime = t
  }, [])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) void video.play()
    else video.pause()
  }

  const openFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith('video/')) return
    if (source?.kind === 'file') URL.revokeObjectURL(source.url)
    run.current += 1
    setSource({ kind: 'file', file, url: URL.createObjectURL(file) })
    setRecognized(null)
    setScript('')
    setGraphics([])
    setSpeech({ stage: 'idle' })
    setTab('transcript')
    setAutoMade(true)
  }

  const openSample = (clip: ClipId) => {
    run.current += 1
    setSource({ kind: 'sample', clip })
    setRecognized(null)
    setScript(SAMPLE_SCRIPTS[lang])
    setGraphics([])
    setAutoMade(false)
    setSpeech({ stage: 'idle' })
  }

  const listen = async () => {
    if (!source) return
    const mine = ++run.current
    const current = () => run.current === mine
    try {
      const blob = await sourceBlob(source)
      const language = speechLanguage === 'auto' ? null : (speechLanguage as 'en' | 'ko' | 'ja')
      const onProgress = (progress: SpeechProgress | ServerProgress) => current() && setSpeech(progress)
      const result =
        engine === 'server' ? await transcribeOnServer(blob, { language, onProgress }) : await transcribe(blob, { quality: engine, language, onProgress })
      if (!current()) return
      if (result.length === 0) {
        setSpeech({ stage: 'failed', reason: 'empty' })
        return
      }
      setRecognized(result)
      setScript(joinWords(result))
      setSpeech({ stage: 'done', count: result.length })
    } catch (error) {
      if (!current()) return
      if (error instanceof ServerTooLongError) setSpeech({ stage: 'failed', reason: 'tooLong', maxSeconds: error.maxSeconds })
      else setSpeech({ stage: 'failed', reason: error instanceof NoAudioError ? 'noAudio' : error instanceof ServerBusyError ? 'busy' : 'error' })
    }
  }

  const makeGraphics = () => {
    setGraphics(clampToDuration(direct(words), duration))
    setSelectedId(null)
    setTab('graphics')
  }

  const updateGraphic = (next: Graphic) => setGraphics((list) => list.map((g) => (g.id === next.id ? next : g)))
  const addGraphic = (kind: Graphic['kind']) => {
    const g = createGraphic(kind, time, duration || 10, `u${++serial.current}`)
    setGraphics((list) => [...list, g])
    setSelectedId(g.id)
    setTab('graphics')
  }
  const removeGraphic = (id: string) => {
    setGraphics((list) => list.filter((g) => g.id !== id))
    setSelectedId(null)
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.closest('input, textarea, select')) return
      if (event.key === ' ' && target.tagName !== 'BUTTON') {
        event.preventDefault()
        const video = videoRef.current
        if (video) void (video.paused ? video.play() : video.pause())
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) removeGraphic(selectedId)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId])

  const startExport = async () => {
    if (!source) return
    videoRef.current?.pause()
    const controller = new AbortController()
    exportAbort.current = controller
    setExportState({ stage: 'running', progress: 0 })
    try {
      const blob = await sourceBlob(source)
      const result = await exportVideo(blob, shown, theme, { onProgress: (progress) => setExportState({ stage: 'running', progress }), signal: controller.signal })
      setExportState({ stage: 'done', url: URL.createObjectURL(result.blob), extension: result.extension })
    } catch (error) {
      if (controller.signal.aborted) setExportState({ stage: 'idle' })
      else setExportState({ stage: 'failed', unsupported: error instanceof ExportUnsupportedError })
    }
  }

  const closeExport = () => {
    exportAbort.current?.abort()
    if (exportState.stage === 'done') URL.revokeObjectURL(exportState.url)
    setExportState({ stage: 'idle' })
  }

  usePageMeta(pageMeta('app', lang))

  const fileName = source?.kind === 'file' ? source.file.name : source ? `sample-${source.clip}` : copy.untitled
  const isSample = source?.kind === 'sample'

  return (
    <div className="editor">
      <header className="ed-top">
        <Link to="/" className="ed-logo" aria-label={copy.home}>
          <Logo />
        </Link>
        <span className="ed-name">{fileName}</span>
        <div className="ed-top__side">
          <LangPicker label="Language" />
          <button type="button" className="btn-mint ed-export" disabled={!source || duration === 0} onClick={() => void startExport()}>
            <Download size={16} aria-hidden="true" />
            {copy.export}
          </button>
        </div>
      </header>

      {!source ? (
        <StartScreen copy={copy} onFile={openFile} onSample={openSample} />
      ) : (
        <div className="ed-body">
          <section className="ed-stage">
            <div className="ed-frame" style={{ aspectRatio: `${size.width} / ${size.height}` }}>
              <video
                ref={videoRef}
                src={sourceUrl(source)}
                playsInline
                loop
                onLoadedMetadata={(event) => {
                  const video = event.currentTarget
                  setDuration(video.duration)
                  setSize({ width: video.videoWidth || 1280, height: video.videoHeight || 720 })
                }}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
              />
              <canvas ref={canvasRef} onClick={togglePlay} />
            </div>
            <div className="ed-controls">
              <button type="button" className="round-btn" onClick={togglePlay} aria-label={playing ? copy.pause : copy.play}>
                {playing ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <span className="ed-time">
                {time.toFixed(1)}s / {duration.toFixed(1)}s
              </span>
            </div>
          </section>

          <aside className="ed-panel">
            <div className="ed-styles">
              <span>{copy.style}</span>
              <div>
                {THEMES.map((item) => (
                  <button key={item.id} type="button" className={`swatch ${item.id === themeId ? 'is-on' : ''}`} onClick={() => setThemeId(item.id)} aria-pressed={item.id === themeId}>
                    <i style={{ background: item.accent }} />
                    {copy.themes[item.id]}
                  </button>
                ))}
              </div>
            </div>
            <div className="tabs" role="tablist">
              <button type="button" role="tab" aria-selected={tab === 'transcript'} onClick={() => setTab('transcript')}>
                {copy.tabs.transcript}
              </button>
              <button type="button" role="tab" aria-selected={tab === 'graphics'} onClick={() => setTab('graphics')}>
                {copy.tabs.graphics} {graphics.length > 0 && <em>{graphics.length}</em>}
              </button>
            </div>
            {tab === 'transcript' ? (
              <TranscriptPanel
                copy={copy}
                isSample={isSample}
                script={script}
                onScript={setScript}
                estimated={!recognized}
                speech={speech}
                speechLanguage={speechLanguage}
                onSpeechLanguage={setSpeechLanguage}
                engine={engine}
                server={server}
                onEngine={(value) => {
                  setEngine(value)
                  setEngineChosen(true)
                }}
                onListen={() => void listen()}
                hasGraphics={graphics.length > 0}
                canMake={words.length > 0}
                onMake={makeGraphics}
              />
            ) : (
              <Inspector copy={copy} graphics={shown} selected={selected} onSelect={setSelectedId} onAdd={addGraphic} onChange={updateGraphic} onRemove={removeGraphic} />
            )}
          </aside>

          <Timeline copy={copy} graphics={shown} duration={duration} time={time} selectedId={selectedId} onSelect={setSelectedId} onChange={updateGraphic} onSeek={seek} />
        </div>
      )}

      {exportState.stage !== 'idle' && <ExportDialog copy={copy} state={exportState} fileName={fileName} onClose={closeExport} onRetry={() => void startExport()} />}
    </div>
  )
}

function StartScreen({ copy, onFile, onSample }: { copy: EditorCopy; onFile: (file: File | undefined) => void; onSample: (clip: ClipId) => void }) {
  const [over, setOver] = useState(false)
  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setOver(false)
    onFile(event.dataTransfer.files[0])
  }
  return (
    <main className="ed-start">
      <div
        className={`drop ${over ? 'is-over' : ''}`}
        onDragOver={(event) => {
          event.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        <h1>{copy.start.title}</h1>
        <p>{copy.start.body}</p>
        <label className="btn-mint">
          <Upload size={16} aria-hidden="true" />
          {copy.start.pick}
          <input type="file" accept="video/*" hidden onChange={(event: ChangeEvent<HTMLInputElement>) => onFile(event.target.files?.[0])} />
        </label>
        <small>
          {copy.start.drop} · {copy.start.privacy}
        </small>
      </div>
      <p className="ed-start__label">{copy.start.samples}</p>
      <ul className="samples">
        {(Object.keys(CLIPS) as ClipId[]).map((clip) => (
          <li key={clip}>
            <button type="button" onClick={() => onSample(clip)} className={CLIPS[clip].portrait ? 'is-tall' : undefined}>
              <img src={posterUrl(clip)} alt="" loading="lazy" />
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}

type TranscriptProps = {
  copy: EditorCopy
  isSample: boolean
  script: string
  onScript: (text: string) => void
  estimated: boolean
  speech: SpeechState
  speechLanguage: string
  onSpeechLanguage: (value: string) => void
  engine: SpeechEngine
  server: SpeechServer | null
  onEngine: (value: SpeechEngine) => void
  onListen: () => void
  hasGraphics: boolean
  canMake: boolean
  onMake: () => void
}

function TranscriptPanel(p: TranscriptProps) {
  const t = p.copy.transcript
  const busy = ['decoding', 'download', 'listening', 'uploading', 'serverListening'].includes(p.speech.stage)
  const message = (() => {
    switch (p.speech.stage) {
      case 'idle':
        if (p.isSample) return p.copy.sampleNote
        return p.engine === 'server' ? t.serverNote : fill(t.firstTime, { mb: SPEECH_MODELS[p.engine].megabytes })
      case 'decoding':
        return t.decoding
      case 'download':
        return fill(t.download, { n: Math.round(p.speech.progress * 100) })
      case 'listening':
        return t.listening
      case 'uploading':
        return t.uploading
      case 'serverListening':
        return t.serverListening
      case 'done':
        return fill(t.done, { n: p.speech.count })
      case 'failed':
        if (p.speech.reason === 'tooLong') return fill(t.tooLong, { min: Math.floor(p.speech.maxSeconds / 60) })
        return { noAudio: t.noAudio, empty: t.noSpeech, error: t.failed, busy: t.busy }[p.speech.reason]
    }
  })()
  return (
    <div className="transcript-panel">
      <div className="row-wrap">
        <button type="button" className="btn-outline" disabled={p.isSample || busy} onClick={p.onListen}>
          {t.listen}
        </button>
        <label className="mini-select">
          {t.language}
          <select value={p.speechLanguage} disabled={busy} onChange={(e) => p.onSpeechLanguage(e.target.value)}>
            <option value="en">English</option>
            <option value="ko">한국어</option>
            <option value="ja">日本語</option>
            <option value="auto">{t.auto}</option>
          </select>
        </label>
        <label className="mini-select">
          {t.engine}
          <select value={p.engine} disabled={busy} onChange={(e) => p.onEngine(e.target.value as SpeechEngine)}>
            {p.server && (
              <option value="server" disabled={!p.server.ready}>
                {p.server.ready ? t.engineServer : t.engineServerStarting}
              </option>
            )}
            <option value="standard">{t.engineStandard}</option>
            <option value="precise">{t.enginePrecise}</option>
          </select>
        </label>
      </div>
      <p className={p.speech.stage === 'failed' ? 'hint is-error' : 'hint'} role="status">
        {message}
      </p>
      {p.speech.stage === 'download' && <progress value={p.speech.progress} max={1} />}
      <label className="field">
        <span>{t.scriptLabel}</span>
        <textarea rows={9} value={p.script} onChange={(e) => p.onScript(e.target.value)} />
        <small>{t.scriptHint}</small>
      </label>
      {p.estimated && p.script.trim() !== '' && <p className="note">{t.estimated}</p>}
      <button type="button" className="btn-mint full" disabled={!p.canMake} onClick={p.onMake}>
        {p.hasGraphics ? t.remake : t.make}
      </button>
      {p.hasGraphics && <small className="hint">{t.remakeHint}</small>}
    </div>
  )
}

function ExportDialog({ copy, state, fileName, onClose, onRetry }: { copy: EditorCopy; state: ExportState; fileName: string; onClose: () => void; onRetry: () => void }) {
  const base = fileName.replace(/\.[^.]+$/, '')
  return (
    <div className="dialog-back" role="presentation">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="export-title">
        <button type="button" className="dialog__close" onClick={onClose} aria-label={state.stage === 'running' ? copy.cancel : copy.close}>
          <X size={18} />
        </button>
        {state.stage === 'running' && (
          <>
            <h2 id="export-title">{fill(copy.exporting, { n: Math.round(state.progress * 100) })}</h2>
            <div className="bar">
              <span style={{ width: `${state.progress * 100}%` }} />
            </div>
            <button type="button" className="btn-outline" onClick={onClose}>
              {copy.cancel}
            </button>
          </>
        )}
        {state.stage === 'done' && (
          <>
            <h2 id="export-title">{copy.exportDone}</h2>
            <video src={state.url} controls playsInline className="dialog__video" />
            <a className="btn-mint" href={state.url} download={`${base}-reelmotion.${state.extension}`}>
              <Download size={16} aria-hidden="true" />
              {fill(copy.download, { ext: state.extension.toUpperCase() })}
            </a>
          </>
        )}
        {state.stage === 'failed' && (
          <>
            <h2 id="export-title">{state.unsupported ? copy.exportUnsupported : copy.exportFailed}</h2>
            {!state.unsupported && (
              <button type="button" className="btn-mint" onClick={onRetry}>
                {copy.export}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
