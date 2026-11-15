import { Download, FolderOpen, Pause, Play, Upload, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { AccountLink } from '../account/AccountLink'
import { deleteRemote, getRemote, putRemote } from '../account/api'
import { ACCOUNT_COPY } from '../account/copy'
import { currentUser, sessionReady, useSession } from '../account/session'
import { pushLocalProjects } from '../account/sync'
import { joinWords, scriptToWords } from '../captions/segment'
import type { Word } from '../captions/types'
import { ExportUnsupportedError, exportVideo } from '../export/exportVideo'
import { useLang } from '../lang'
import { fill } from '../langs'
import type { Lang } from '../langs'
import { CLIPS, clipUrl, posterUrl } from '../media/clips'
import type { ClipId } from '../media/clips'
import { direct } from '../motion/direct'
import { loadFontsForGraphics } from '../motion/fonts'
import { renderGraphics } from '../motion/render'
import { THEMES, themeById } from '../motion/themes'
import type { Graphic, Theme, ThemeId } from '../motion/types'
import { Logo, LangPicker } from '../site/Chrome'
import { pageMeta } from '../site/meta'
import { pagePath } from '../site/routes'
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
import { ProjectGrid, ProjectsDialog } from './ProjectsDialog'
import { PROJECT_VERSION, canStoreMedia, defaultName, formatMegabytes, newProjectId, nextSerial, safeFileName } from './projects'
import type { ProjectSource, SavedProject } from './projects'
import { StorageUnavailableError, deleteProject, getMedia, getProject, putMedia, putProject, storageEstimate } from './store'
import { Timeline } from './Timeline'
import { useProjectList } from './useProjectList'
import './editor.css'

type FileMeta = Extract<ProjectSource, { kind: 'file' }>

/** 편집할 영상. missing: 다시 연 작업인데 영상이 이 브라우저에 저장돼 있지 않다(같은 파일을 다시 고른다). */
type Source = { kind: 'sample'; clip: ClipId } | { kind: 'file'; file: File } | { kind: 'missing'; meta: FileMeta }

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

type SaveState = 'idle' | 'saving' | 'saved' | 'savedNoVideo' | 'failed' | 'unavailable'

const THEME_IDS = THEMES.map((theme) => theme.id)

async function sourceBlob(source: Source): Promise<Blob> {
  if (source.kind === 'file') return source.file
  if (source.kind === 'missing') throw new Error('video is not connected')
  const response = await fetch(clipUrl(source.clip))
  return response.blob()
}

const fileMeta = (file: File): FileMeta => ({ kind: 'file', name: file.name, size: file.size, type: file.type, lastModified: file.lastModified })

const projectSourceOf = (source: Source): ProjectSource => (source.kind === 'sample' ? source : source.kind === 'file' ? fileMeta(source.file) : source.meta)

/** 목록에 보일 작은 그림: 지금 장면 + 그래픽, 긴 변 320px JPEG. */
function makeThumbnail(video: HTMLVideoElement, graphics: Graphic[], theme: Theme): string | null {
  try {
    if (video.readyState < 2 || !video.videoWidth) return null
    const scale = 320 / Math.max(video.videoWidth, video.videoHeight)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    renderGraphics(ctx, canvas.width, canvas.height, graphics, video.currentTime, theme)
    return canvas.toDataURL('image/jpeg', 0.72)
  } catch {
    return null
  }
}

/** 작업 하나의 처음 상태: 새 작업, 첫 화면에서 넘어온 대본, 또는 다시 연 작업 */
type Initial = {
  id: string | null
  name: string
  createdAt: number
  source: Source | null
  script: string
  recognized: Word[] | null
  graphics: Graphic[]
  theme: ThemeId
  speechLanguage: string
  duration: number
  portrait: boolean
  thumbnail: string | null
  /** 이미 저장된 작업(다시 연 것) — 고치지 않아도 저장 대상이다 */
  saved: boolean
  hasMedia: boolean
  /** 이 작업을 올린 계정(projects.ts 의 owner) */
  owner: string | null
}

function blankInitial(lang: Lang, theme: ThemeId = 'neon'): Initial {
  return { id: null, name: '', createdAt: Date.now(), source: null, script: '', recognized: null, graphics: [], theme, speechLanguage: lang, duration: 0, portrait: false, thumbnail: null, saved: false, hasMedia: false, owner: null }
}

/** 첫 화면의 떠 있는 입력 칸(?script=)과 스타일 카드(?theme=)에서 넘어온 값 */
function landingInitial(params: URLSearchParams, lang: Lang): Initial {
  const theme = THEME_IDS.includes(params.get('theme') as ThemeId) ? (params.get('theme') as ThemeId) : 'neon'
  const script = params.get('script')
  const blank = blankInitial(lang, theme)
  return script ? { ...blank, source: { kind: 'sample', clip: 'explainer' }, script } : blank
}

function projectInitial(project: SavedProject, media: Blob | null): Initial {
  const source: Source =
    project.source.kind === 'sample'
      ? project.source
      : media
        ? { kind: 'file', file: new File([media], project.source.name, { type: project.source.type || media.type, lastModified: project.source.lastModified }) }
        : { kind: 'missing', meta: project.source }
  return {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    source,
    script: project.script,
    recognized: project.recognized,
    graphics: project.graphics,
    theme: project.theme,
    speechLanguage: project.speechLanguage,
    duration: project.duration,
    portrait: project.portrait,
    thumbnail: project.thumbnail,
    saved: true,
    hasMedia: media !== null,
    owner: project.owner,
  }
}

type Opened = { kind: 'ok'; initial: Initial } | { kind: 'notFound' } | { kind: 'unavailable' }

/**
 * 저장된 작업 열기: 이 브라우저에서 찾고, 로그인했으면 계정에서도 찾는다. 계정 쪽이 더 새것(다른 기기에서 고침)이면
 * 그 판을 열고 이 브라우저에도 둔다(영상은 이 브라우저에 있던 것을 그대로 쓴다 — 없으면 다시 고른다).
 */
async function openStored(id: string): Promise<Opened> {
  const local = await getProject(id).catch((error: unknown) => (error instanceof StorageUnavailableError ? undefined : null))
  const user = currentUser(await sessionReady())
  const mine = user && (!local || local.owner === null || local.owner === user.id)
  const remote = mine ? await getRemote(id).catch(() => null) : null
  let project = local ?? null
  if (user && remote && (!project || remote.updatedAt > project.updatedAt)) {
    project = { ...remote, hasMedia: project?.hasMedia ?? false, owner: user.id }
    await putProject(project).catch(() => undefined)
  }
  if (!project) return local === undefined ? { kind: 'unavailable' } : { kind: 'notFound' }
  const media = project.source.kind === 'file' && project.hasMedia ? await getMedia(id).catch(() => null) : null
  return { kind: 'ok', initial: projectInitial(project, media) }
}

type Notice = 'notFound' | 'unavailable' | null
type Session = { key: number; id: string | null; initial: Initial; notice: Notice }

/**
 * 편집기. 주소의 ?project=<id> 가 이 브라우저에 저장된 작업을 가리키면 그 작업을 연다(projects.ts·store.ts).
 * 작업 하나가 Workspace 하나다 — 새 작업·다른 작업을 열면 Workspace 를 새로 만든다.
 */
export function EditorPage() {
  const { lang } = useLang()
  const copy = EDITOR_COPY[lang]
  const [params, setParams] = useSearchParams()
  const wanted = params.get('project')
  const [session, setSession] = useState<Session>(() => ({ key: 0, id: null, initial: landingInitial(params, lang), notice: null }))
  const loading = wanted !== null && wanted !== session.id

  useEffect(() => {
    if (!wanted || wanted === session.id) return
    let alive = true
    void openStored(wanted).then((opened) => {
      if (!alive) return
      if (opened.kind === 'ok') {
        setSession((current) => ({ key: current.key + 1, id: wanted, initial: opened.initial, notice: null }))
      } else {
        setSession((current) => ({ key: current.key + 1, id: null, initial: blankInitial(lang), notice: opened.kind }))
        setParams({}, { replace: true })
      }
    })
    return () => {
      alive = false
    }
  }, [wanted, session.id, lang, setParams])

  usePageMeta(pageMeta('app', lang))

  // 로그인한 사람이면 이 브라우저의 작업을 계정에도 올린다(한 번, 내 것·주인 없는 것만 — src/account/sync.ts).
  const userId = currentUser(useSession())?.id ?? null
  useEffect(() => {
    if (userId) void pushLocalProjects(userId).catch(() => undefined)
  }, [userId])

  // 처음 저장한 작업: 주소에 id 를 적어 새로고침해도 다시 열리게 한다(주소를 먼저 바꾸면 「여는 중」으로 깜빡이므로 id 를 먼저 둔다).
  const onSaved = useCallback(
    (id: string) => {
      setSession((current) => ({ ...current, id }))
      setParams({ project: id }, { replace: true })
    },
    [setParams],
  )
  const onNew = useCallback(() => {
    setSession((current) => ({ key: current.key + 1, id: null, initial: blankInitial(lang), notice: null }))
    setParams({}, { replace: !wanted })
  }, [lang, setParams, wanted])
  const onOpen = useCallback(
    (id: string) => {
      if (id !== session.id) setParams({ project: id })
    },
    [session.id, setParams],
  )

  if (loading) {
    return (
      <div className="editor">
        <header className="ed-top">
          <Link to={pagePath('home', lang)} className="ed-logo" aria-label={copy.home}>
            <Logo />
          </Link>
        </header>
        <main className="ed-start">
          <p className="ed-loading">{copy.projects.loading}</p>
        </main>
      </div>
    )
  }
  return <Workspace key={session.key} initial={session.initial} notice={session.notice} projectId={session.id} onSaved={onSaved} onNew={onNew} onOpen={onOpen} />
}

type WorkspaceProps = {
  initial: Initial
  notice: Notice
  projectId: string | null
  onSaved: (id: string) => void
  onNew: () => void
  onOpen: (id: string) => void
}

function Workspace({ initial, notice, projectId, onSaved, onNew, onOpen }: WorkspaceProps) {
  const { lang } = useLang()
  const copy = EDITOR_COPY[lang]
  const [source, setSource] = useState<Source | null>(initial.source)
  const [name, setName] = useState(initial.name)
  const [script, setScript] = useState(initial.script)
  const [recognized, setRecognized] = useState<Word[] | null>(initial.recognized)
  const [graphics, setGraphics] = useState<Graphic[]>(initial.graphics)
  const [themeId, setThemeId] = useState<ThemeId>(initial.theme)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState<'graphics' | 'transcript'>(initial.graphics.length > 0 ? 'graphics' : 'transcript')
  const [duration, setDuration] = useState(initial.duration)
  const [size, setSize] = useState(initial.portrait ? { width: 720, height: 1280 } : { width: 1280, height: 720 })
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speech, setSpeech] = useState<SpeechState>({ stage: 'idle' })
  const [speechLanguage, setSpeechLanguage] = useState<string>(initial.speechLanguage)
  const [engine, setEngine] = useState<SpeechEngine>('standard')
  const [engineChosen, setEngineChosen] = useState(false)
  const [server, setServer] = useState<SpeechServer | null>(null)
  const [exportState, setExportState] = useState<ExportState>({ stage: 'idle' })
  // 다시 연 작업은 그래픽을 지웠더라도 저절로 다시 만들지 않는다.
  const [autoMade, setAutoMade] = useState(initial.saved)
  // 저장은 손을 댄 뒤부터: 넣은 영상은 바로, 예시 영상은 무언가 고쳤을 때(예시를 둘러보기만 하면 목록이 어지럽지 않게).
  const [touched, setTouched] = useState(initial.saved)
  const [saveState, setSaveState] = useState<SaveState>(initial.saved ? (initial.source?.kind === 'missing' ? 'savedNoVideo' : 'saved') : 'idle')
  const [showProjects, setShowProjects] = useState(false)
  const [mismatch, setMismatch] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const serial = useRef(nextSerial(initial.graphics))
  const run = useRef(0)
  const exportAbort = useRef<AbortController | null>(null)
  const touch = () => setTouched(true)

  // 영상 요소에 주소를 붙인다. 넣은 파일은 임시 주소를 만들고, 영상이 바뀌거나 작업을 닫으면 돌려준다.
  useEffect(() => {
    const video = videoRef.current
    if (!video || !source || source.kind === 'missing') return
    const url = source.kind === 'file' ? URL.createObjectURL(source.file) : clipUrl(source.clip)
    video.src = url
    return () => {
      if (source.kind === 'file') URL.revokeObjectURL(url)
    }
  }, [source])

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
    run.current += 1
    setSource({ kind: 'file', file })
    setName((current) => current || defaultName(fileMeta(file), copy.untitled))
    setRecognized(null)
    setScript('')
    setGraphics([])
    setSpeech({ stage: 'idle' })
    setTab('transcript')
    setAutoMade(true)
    touch()
  }

  /** 다시 연 작업의 영상을 다시 고른다. 받아 적은 말과 그래픽은 그대로 둔다. */
  const reconnect = (file: File | undefined) => {
    if (!file || !file.type.startsWith('video/') || source?.kind !== 'missing') return
    setMismatch(file.name !== source.meta.name || file.size !== source.meta.size)
    setSource({ kind: 'file', file })
    touch()
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
      touch()
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
    touch()
  }

  const updateGraphic = (next: Graphic) => {
    setGraphics((list) => list.map((g) => (g.id === next.id ? next : g)))
    touch()
  }
  const addGraphic = (kind: Graphic['kind']) => {
    const g = createGraphic(kind, time, duration || 10, `u${++serial.current}`)
    setGraphics((list) => [...list, g])
    setSelectedId(g.id)
    setTab('graphics')
    touch()
  }
  const removeGraphic = (id: string) => {
    setGraphics((list) => list.filter((g) => g.id !== id))
    setSelectedId(null)
    touch()
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

  // ── 이 브라우저에 저장(「내 작업」) ──
  const idRef = useRef(projectId)
  const mediaRef = useRef<'none' | 'saving' | 'saved' | 'skipped'>(initial.hasMedia ? 'saved' : 'none')
  const thumbRef = useRef({ data: initial.thumbnail, at: 0 })
  const queue = useRef<Promise<void>>(Promise.resolve())
  const pending = useRef<(() => void) | null>(null)
  const mounted = useRef(true)
  const discarded = useRef(false)
  const ownerRef = useRef(initial.owner)
  const [syncState, setSyncState] = useState<'off' | 'synced' | 'failed' | 'stale'>('off')
  const onSavedRef = useRef(onSaved)
  useEffect(() => {
    onSavedRef.current = onSaved
  }, [onSaved])

  /** 작업을 쓴다. 새 작업이면 먼저 작업만 써서 바로 목록에 보이게 하고, 넣은 영상은 그다음 한 번만 따로 쓴다. */
  const persist = async (record: SavedProject, file: File | null) => {
    if (discarded.current) return
    try {
      const isNew = idRef.current === null
      const id = idRef.current ?? newProjectId()
      idRef.current = id
      // 로그인했으면 주인 없는 작업은 내 것으로 표시해 계정에도 둔다. 다른 계정의 작업은 이 브라우저에만.
      const user = currentUser()
      if (user && ownerRef.current === null) ownerRef.current = user.id
      record = { ...record, owner: ownerRef.current }
      await putProject({ ...record, id, hasMedia: file !== null && mediaRef.current === 'saved' })
      if (isNew && mounted.current) onSavedRef.current(id)
      if (file && mediaRef.current === 'none') {
        mediaRef.current = 'saving'
        const fits = canStoreMedia(file.size, await storageEstimate())
        const stored = fits && (await putMedia(id, file).then(
          () => true,
          () => false,
        ))
        mediaRef.current = stored ? 'saved' : 'skipped'
        if (!discarded.current) await putProject({ ...record, id, hasMedia: stored, updatedAt: Date.now() })
      }
      const videoKept = record.source.kind === 'sample' || (file !== null && mediaRef.current === 'saved')
      setSaveState(videoKept ? 'saved' : 'savedNoVideo')
      if (user && record.owner === user.id && !discarded.current) {
        const result = await putRemote({ ...record, id, hasMedia: false })
        setSyncState(result === 'ok' ? 'synced' : result)
      } else setSyncState('off')
    } catch (error) {
      setSaveState(error instanceof StorageUnavailableError ? 'unavailable' : 'failed')
    }
  }

  // 고친 뒤 0.8초 동안 더 고치지 않으면 저장한다. 앞 저장이 끝난 뒤 차례로 쓴다(옛 내용이 새 내용을 덮지 않게).
  useEffect(() => {
    if (!touched || !source) return
    let done = false
    const save = () => {
      if (done || discarded.current) return
      done = true
      pending.current = null
      const video = videoRef.current
      if (video && (!thumbRef.current.data || Date.now() - thumbRef.current.at > 8000)) {
        const data = makeThumbnail(video, shown, theme)
        if (data) thumbRef.current = { data, at: Date.now() }
      }
      const projectSource = projectSourceOf(source)
      const record: SavedProject = {
        version: PROJECT_VERSION,
        id: '',
        name: name.trim() || defaultName(projectSource, copy.untitled),
        createdAt: initial.createdAt,
        updatedAt: Date.now(),
        source: projectSource,
        hasMedia: false,
        script,
        recognized,
        graphics,
        theme: themeId,
        speechLanguage,
        duration,
        portrait: size.height > size.width,
        thumbnail: thumbRef.current.data,
        owner: ownerRef.current,
      }
      const file = source.kind === 'file' ? source.file : null
      setSaveState('saving')
      queue.current = queue.current.then(() => persist(record, file))
    }
    pending.current = save
    const timer = window.setTimeout(save, 800)
    return () => window.clearTimeout(timer)
    // persist 는 ref 와 상태 바꾸기만 쓴다(매번 새로 만들어져도 같은 일을 한다).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [touched, source, name, script, recognized, graphics, themeId, speechLanguage, duration, size, shown, theme, copy.untitled, initial.createdAt])

  // 탭을 숨기거나 닫거나 다른 작업으로 넘어갈 때, 기다리던 저장을 바로 한다.
  useEffect(() => {
    mounted.current = true
    const flush = () => pending.current?.()
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flush)
      flush()
      mounted.current = false
    }
  }, [])

  /** 「내 작업」에서 지우기. 지금 작업이면 기다리던 저장을 버리고, 쓰던 저장이 끝난 뒤 지우고 새 작업으로. */
  const deleteStored = async (id: string) => {
    const removeEverywhere = async () => {
      await deleteProject(id).catch(() => undefined)
      if (currentUser()) await deleteRemote(id)
    }
    if (id !== idRef.current) {
      await removeEverywhere()
      return
    }
    discarded.current = true
    pending.current = null
    await queue.current.catch(() => undefined)
    await removeEverywhere()
    onNew()
  }

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

  const currentSource = source ? projectSourceOf(source) : null
  const displayName = name.trim() || (currentSource ? defaultName(currentSource, copy.untitled) : copy.untitled)
  const isSample = source?.kind === 'sample'
  const accountCopy = ACCOUNT_COPY[lang]
  const saveLabel: Record<Exclude<SaveState, 'idle'>, string> = {
    saving: copy.projects.saving,
    saved: syncState === 'synced' ? accountCopy.synced : syncState === 'failed' ? accountCopy.syncFailed : syncState === 'stale' ? accountCopy.syncStale : copy.projects.saved,
    savedNoVideo: copy.projects.savedNoVideo,
    failed: copy.projects.failed,
    unavailable: copy.projects.unavailable,
  }
  const saveTone = saveState === 'saved' && syncState === 'stale' ? 'savedNoVideo' : saveState

  return (
    <div className="editor">
      <header className="ed-top">
        <Link to={pagePath('home', lang)} className="ed-logo" aria-label={copy.home}>
          <Logo />
        </Link>
        {source && (
          <input
            className="ed-name"
            value={name}
            placeholder={displayName}
            aria-label={copy.projects.name}
            maxLength={80}
            spellCheck={false}
            onChange={(event) => {
              setName(event.target.value)
              touch()
            }}
          />
        )}
        {source && saveState !== 'idle' && (
          <span className={`ed-save is-${saveTone}`} title={saveState === 'savedNoVideo' ? copy.projects.noVideoSaved : undefined}>
            {saveLabel[saveState]}
          </span>
        )}
        <div className="ed-top__side">
          <button type="button" className="btn-outline ed-projects" onClick={() => setShowProjects(true)} aria-label={copy.projects.open} title={copy.projects.open}>
            <FolderOpen size={16} aria-hidden="true" />
            <span>{copy.projects.open}</span>
          </button>
          <LangPicker label="Language" />
          <AccountLink />
          <button
            type="button"
            className="btn-mint ed-export"
            disabled={!source || source.kind === 'missing' || duration === 0}
            onClick={() => void startExport()}
            aria-label={copy.export}
          >
            <Download size={16} aria-hidden="true" />
            <span>{copy.export}</span>
          </button>
        </div>
      </header>

      {!source ? (
        <StartScreen copy={copy} lang={lang} notice={notice} onFile={openFile} onSample={openSample} onOpen={onOpen} onShowAll={() => setShowProjects(true)} />
      ) : (
        <div className="ed-body">
          <section className="ed-stage">
            {source.kind === 'missing' ? (
              <Reconnect copy={copy} meta={source.meta} onFile={reconnect} />
            ) : (
              <div className="ed-frame" style={{ aspectRatio: `${size.width} / ${size.height}` }}>
                <video
                  ref={videoRef}
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
            )}
            {mismatch && <p className="ed-warn">{copy.projects.mismatch}</p>}
            <div className="ed-controls">
              <button type="button" className="round-btn" onClick={togglePlay} aria-label={playing ? copy.pause : copy.play} disabled={source.kind === 'missing'}>
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
                  <button
                    key={item.id}
                    type="button"
                    className={`swatch ${item.id === themeId ? 'is-on' : ''}`}
                    onClick={() => {
                      setThemeId(item.id)
                      touch()
                    }}
                    aria-pressed={item.id === themeId}
                  >
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
                canListen={source.kind === 'file'}
                script={script}
                onScript={(text) => {
                  setScript(text)
                  touch()
                }}
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

      {exportState.stage !== 'idle' && <ExportDialog copy={copy} state={exportState} baseName={safeFileName(displayName, 'reelmotion')} onClose={closeExport} onRetry={() => void startExport()} />}
      {showProjects && (
        <ProjectsDialog
          copy={copy}
          lang={lang}
          currentId={projectId}
          onOpen={(id) => {
            setShowProjects(false)
            onOpen(id)
          }}
          onNew={() => {
            setShowProjects(false)
            onNew()
          }}
          onDelete={deleteStored}
          onClose={() => setShowProjects(false)}
        />
      )}
    </div>
  )
}

/** 다시 연 작업의 영상이 이 브라우저에 없을 때: 같은 파일을 다시 고른다. */
function Reconnect({ copy, meta, onFile }: { copy: EditorCopy; meta: FileMeta; onFile: (file: File | undefined) => void }) {
  const [over, setOver] = useState(false)
  const p = copy.projects
  return (
    <div
      className={`drop reconnect ${over ? 'is-over' : ''}`}
      onDragOver={(event) => {
        event.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event: DragEvent) => {
        event.preventDefault()
        setOver(false)
        onFile(event.dataTransfer.files[0])
      }}
    >
      <h2>{p.reconnectTitle}</h2>
      <p>{p.reconnectBody}</p>
      <p className="reconnect__file">
        {meta.name} · {formatMegabytes(meta.size)}
      </p>
      <label className="btn-mint">
        <Upload size={16} aria-hidden="true" />
        {p.reconnectPick}
        <input type="file" accept="video/*" hidden onChange={(event: ChangeEvent<HTMLInputElement>) => onFile(event.target.files?.[0])} />
      </label>
    </div>
  )
}

type StartProps = {
  copy: EditorCopy
  lang: Lang
  notice: Notice
  onFile: (file: File | undefined) => void
  onSample: (clip: ClipId) => void
  onOpen: (id: string) => void
  onShowAll: () => void
}

function StartScreen({ copy, lang, notice, onFile, onSample, onOpen, onShowAll }: StartProps) {
  const [over, setOver] = useState(false)
  const { state } = useProjectList()
  const recent = state.status === 'ready' ? state.items.slice(0, 4) : []
  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setOver(false)
    onFile(event.dataTransfer.files[0])
  }
  return (
    <main className="ed-start">
      {notice && <p className="ed-notice">{notice === 'notFound' ? copy.projects.notFound : copy.projects.unavailable}</p>}
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
          {copy.start.drop} · {copy.start.privacy} · <Link to={pagePath('help', lang)}>{copy.start.help}</Link>
        </small>
      </div>
      {recent.length > 0 && (
        <>
          <div className="ed-start__row">
            <p className="ed-start__label">{copy.projects.recent}</p>
            <button type="button" className="btn-text" onClick={onShowAll}>
              {copy.projects.all}
            </button>
          </div>
          <ProjectGrid items={recent} copy={copy} lang={lang} currentId={null} onOpen={onOpen} />
        </>
      )}
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
  /** 받아쓸 소리가 있다(넣은 영상이 연결돼 있다) */
  canListen: boolean
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
        <button type="button" className="btn-outline" disabled={!p.canListen || busy} onClick={p.onListen}>
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

function ExportDialog({ copy, state, baseName, onClose, onRetry }: { copy: EditorCopy; state: ExportState; baseName: string; onClose: () => void; onRetry: () => void }) {
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
            <a className="btn-mint" href={state.url} download={`${baseName}-reelmotion.${state.extension}`}>
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
