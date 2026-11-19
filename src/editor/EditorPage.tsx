import { Download, FolderOpen, Pause, Play, Redo2, Undo2, Upload, WifiOff, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ChangeEvent, DragEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { AccountLink } from '../account/AccountLink'
import { deleteRemote, getRemote, putRemote, reportExportDone, requestExport } from '../account/api'
import { ACCOUNT_COPY } from '../account/copy'
import { currentUser, sessionReady, useSession } from '../account/session'
import { pushLocalProjects } from '../account/sync'
import { joinWords, scriptToWords } from '../captions/segment'
import { toSrt, toVtt } from '../captions/subtitles'
import type { Word } from '../captions/types'
import { ExportUnsupportedError, exportFormat, exportVideo } from '../export/exportVideo'
import { pickerTypes, savePicker, writesToFile } from '../export/saveTarget'
import { useLang } from '../lang'
import { fill } from '../langs'
import type { Lang } from '../langs'
import { CLIPS, clipUrl, posterUrl } from '../media/clips'
import type { ClipId } from '../media/clips'
import { fetchDraft } from '../connect/api'
import { reportError } from '../errors'
import { changeKey, emptyHistory, record, redo, undo } from './history'
import type { Snapshot } from './history'
import { detectFaces } from '../faces/detect'
import { needsPlacement, placeAwayFromFaces } from '../faces/track'
import type { FaceSample, Measure } from '../faces/track'
import { release } from '../http'
import { direct, resolveOverlaps } from '../motion/direct'
import { loadFontsForGraphics } from '../motion/fonts'
import { measureGraphic } from '../motion/measure'
import { isPortrait } from '../motion/paint'
import { renderGraphics } from '../motion/render'
import { THEMES, themeById } from '../motion/themes'
import type { Graphic, Theme, ThemeId } from '../motion/types'
import { pulse } from '../pulse'
import { promptInstall, useCanInstall } from '../pwa/install'
import { registerServiceWorker } from '../pwa/register'
import { useOnline } from '../pwa/useOnline'
import { Logo, LangPicker } from '../site/Chrome'
import { NoticeBar } from '../site/NoticeBar'
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
import { AiPicks } from './AiPicks'
import type { AiPicksState } from './AiPicks'
import { findHighlights } from './aiPicks'
import { coveredSentences, picksToGraphics, toSentences } from './highlights'
import { Inspector } from './Inspector'
import { applyOps } from './assist'
import { ChatPanel } from './ChatPanel'
import type { ChatDoc, ChatEntry } from './ChatPanel'
import { ProjectGrid, ProjectsDialog } from './ProjectsDialog'
import { PROJECT_VERSION, canStoreMedia, defaultName, formatMegabytes, newProjectId, nextSerial, safeFileName } from './projects'
import type { ProjectSource, SavedProject } from './projects'
import { StorageUnavailableError, deleteProject, getMedia, getProject, keepStorage, putMedia, putProject, storageEstimate } from './store'
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

type ExportState =
  | { stage: 'idle' }
  /** long: 긴 영상을 메모리에 모으는 중(파일 저장 창이 없는 브라우저) — 멈출 수 있다고 알린다 */
  | { stage: 'running'; progress: number; long?: boolean }
  /** url 이 null 이면 고른 파일(savedName)에 바로 썼다 — 긴 영상(src/export/saveTarget.ts) */
  | { stage: 'done'; url: string | null; savedName?: string; extension: string; watermark: boolean; remaining: number | null }
  | { stage: 'failed'; unsupported: boolean }
  /** 요금제 한도에 걸림(결제를 붙인 뒤 켠다 — entitlements.ts) */
  | { stage: 'blocked'; reason: 'login' | 'too_long' | 'limit' }

type SaveState = 'idle' | 'saving' | 'saved' | 'savedNoVideo' | 'failed' | 'unavailable'

const THEME_IDS = THEMES.map((theme) => theme.id)

async function sourceBlob(source: Source): Promise<Blob> {
  if (source.kind === 'file') return source.file
  if (source.kind === 'missing') throw new Error('video is not connected')
  const response = await fetch(clipUrl(source.clip))
  if (!response.ok) {
    release(response)
    throw new Error(`sample video ${response.status}`)
  }
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
  /** 영상을 기다리는 대본(Claude·ChatGPT 커넥터의 ?draft= 로 들어온 것) — 영상을 넣으면 이 대본으로 그래픽을 만든다 */
  pending: string | null
}

function blankInitial(lang: Lang, theme: ThemeId = 'neon'): Initial {
  return { id: null, name: '', createdAt: Date.now(), source: null, script: '', recognized: null, graphics: [], theme, speechLanguage: lang, duration: 0, portrait: false, thumbnail: null, saved: false, hasMedia: false, owner: null, pending: null }
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
    pending: null,
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

type Notice = 'notFound' | 'unavailable' | 'draftGone' | 'draftFailed' | null

/** 시작 화면 위에 보이는 한 줄 안내 */
const NOTICE_TEXT: Record<Exclude<Notice, null>, (copy: EditorCopy) => string> = {
  notFound: (copy) => copy.projects.notFound,
  unavailable: (copy) => copy.projects.unavailable,
  draftGone: (copy) => copy.draft.gone,
  draftFailed: (copy) => copy.draft.failed,
}
/** draft: 이미 받아 온 초안 번호(같은 것을 다시 받지 않게) */
type Session = { key: number; id: string | null; initial: Initial; notice: Notice; draft?: string }

/**
 * 편집기. 주소의 ?project=<id> 가 이 브라우저에 저장된 작업을 가리키면 그 작업을 연다(projects.ts·store.ts).
 * 작업 하나가 Workspace 하나다 — 새 작업·다른 작업을 열면 Workspace 를 새로 만든다.
 */
export function EditorPage() {
  const { lang } = useLang()
  const copy = EDITOR_COPY[lang]
  const [params, setParams] = useSearchParams()
  const wanted = params.get('project')
  const wantedDraft = wanted === null ? params.get('draft') : null
  const [session, setSession] = useState<Session>(() => ({ key: 0, id: null, initial: landingInitial(params, lang), notice: null }))
  const loading = (wanted !== null && wanted !== session.id) || (wantedDraft !== null && wantedDraft !== session.draft)

  // Claude·ChatGPT 커넥터가 만든 주소(?draft=): 대본과 스타일을 받아 「영상을 넣으면 그래픽을 만드는」 빈 작업으로 연다.
  useEffect(() => {
    if (!wantedDraft || wantedDraft === session.draft) return
    let alive = true
    void fetchDraft(wantedDraft).then((draft) => {
      if (!alive) return
      if (draft.status === 'ready') {
        pulse('draft_opened')
        setSession((current) => ({ key: current.key + 1, id: null, initial: { ...blankInitial(lang, draft.theme), pending: draft.script }, notice: null, draft: wantedDraft }))
      } else {
        setSession((current) => ({ key: current.key + 1, id: null, initial: blankInitial(lang), notice: draft.status === 'gone' ? 'draftGone' : 'draftFailed', draft: wantedDraft }))
      }
    })
    return () => {
      alive = false
    }
  }, [wantedDraft, session.draft, lang])

  // 편집기를 연 사람에게만 화면 파일을 브라우저에 받아 둔다 — 다음부터 인터넷이 없어도 편집기가 열린다(src/pwa).
  useEffect(() => registerServiceWorker(), [])
  // 쓰임 숫자: 편집기를 연 횟수(누가 열었는지는 보내지 않는다 — src/pulse.ts)
  useEffect(() => pulse('editor_open', { once: true }), [])

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
  const [tab, setTab] = useState<'graphics' | 'transcript' | 'chat'>(initial.graphics.length > 0 ? 'graphics' : 'transcript')
  const [chat, setChat] = useState<ChatEntry[]>([])
  // 「AI로 강조할 순간 찾기」: 상태와, 되돌릴 때 쓸 더하기 전·후의 그래픽(그 뒤에 손으로 고치면 되돌리기를 감춘다)
  const [aiPicks, setAiPicks] = useState<AiPicksState>({ stage: 'idle' })
  const [aiUndo, setAiUndo] = useState<{ before: Graphic[]; after: Graphic[] } | null>(null)
  // AI 의 답은 몇십 초 뒤에 온다 — 그때의 그래픽(기다리는 동안 손으로 고친 것 포함)에 더하려고 마지막 그래픽을 붙잡아 둔다
  const latestGraphics = useRef<Graphic[]>([])
  const [assistReady, setAssistReady] = useState<boolean | null>(null)
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
  const online = useOnline()
  // 다시 연 작업은 그래픽을 지웠더라도 저절로 다시 만들지 않는다.
  const [autoMade, setAutoMade] = useState(initial.saved)
  // 영상을 기다리는 대본(커넥터 초안). 영상을 넣거나 예시를 고르면 그 대본으로 그래픽을 만들고 비운다.
  const [draftScript, setDraftScript] = useState(initial.pending)
  // 저장은 손을 댄 뒤부터: 넣은 영상은 바로, 예시 영상은 무언가 고쳤을 때(예시를 둘러보기만 하면 목록이 어지럽지 않게).
  const [touched, setTouched] = useState(initial.saved)
  const [saveState, setSaveState] = useState<SaveState>(initial.saved ? (initial.source?.kind === 'missing' ? 'savedNoVideo' : 'saved') : 'idle')
  const [showProjects, setShowProjects] = useState(false)
  const [mismatch, setMismatch] = useState(false)
  // 그래픽이 말하는 사람의 얼굴을 가리지 않게(src/faces): 길이·크기를 안 영상(metaFor)에서, 쪽을 정할 그래픽이 생기면
  // 이 브라우저 안에서 얼굴 자리를 찾는다(faces — 영상마다 한 번, 못 찾으면 빈 목록).
  const [metaFor, setMetaFor] = useState<Source | null>(null)
  const [faces, setFaces] = useState<{ source: Source; track: FaceSample[] } | null>(null)
  // 되돌리기·다시 하기(history.ts): 사람이 고친 것만 담는다. 단추를 켜고 끄려고 개수만 상태로 둔다.
  // now 는 화면에 보이는 마지막 모습(고치기 직전의 모습을 남길 때 쓴다).
  const history = useRef(emptyHistory())
  const [steps, setSteps] = useState({ undo: 0, redo: 0, revision: 0 })
  const now = useRef<Snapshot>({ graphics: initial.graphics, script: initial.script, recognized: initial.recognized, theme: initial.theme })

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const serial = useRef(nextSerial(initial.graphics))
  const run = useRef(0)
  const exportAbort = useRef<AbortController | null>(null)
  const touch = () => setTouched(true)

  // 말로 고치기를 쓸 수 있는지(우리 서버의 AI 가 떠 있는지) 한 번 묻는다.
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/assist/health', { signal: controller.signal, cache: 'no-store' })
      .then((response) => {
        if (response.ok) return response.json() as Promise<{ ready?: boolean }>
        release(response)
        return { ready: false }
      })
      .then((body) => setAssistReady(body.ready === true))
      .catch(() => controller.signal.aborted || setAssistReady(false))
    return () => controller.abort()
  }, [])

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
  // 그리는 쪽(src/motion/paint.ts)과 같은 기준: 세로 영상은 그래픽이 가운데라 쪽을 정할 게 없다
  const portrait = isPortrait(size.width, size.height)
  const faceTrack = faces !== null && faces.source === source ? faces.track : null

  // 얼굴 자리를 알면, 쪽이 아직 정해지지 않은 그래픽(자동으로 만든 것·AI·말로 더한 것·손으로 더한 것)의 쪽을 정한다.
  // 한 번 정한 쪽은 다시 정하지 않는다(src/faces/track.ts). AI 되돌리기는 정한 뒤의 그래픽을 기준으로 둔다.
  if (faceTrack && needsPlacement(graphics)) {
    // 그래픽이 차지하는 자리는 지금 스타일로 실제로 그려 보고 잰다(src/motion/measure.ts). 한 번 정할 동안 같은 것은 다시 재지 않는다.
    const drawn = new Map<string, ReturnType<Measure>>()
    const measure: Measure = (graphic, side) => {
      const key = `${graphic.id}:${side}`
      if (!drawn.has(key)) drawn.set(key, measureGraphic(graphic, side, size.width / size.height, theme))
      return drawn.get(key) ?? null
    }
    const placed = placeAwayFromFaces(graphics, faceTrack, portrait, measure)
    if (placed !== graphics) {
      setGraphics(placed)
      setAiUndo((undo) => (undo && undo.after === graphics ? { ...undo, after: placed } : undo))
    }
  }

  const wantFaces = source !== null && source.kind !== 'missing' && metaFor === source && !portrait && duration > 0 && needsPlacement(graphics)
  useEffect(() => {
    if (!wantFaces || !source || (faces !== null && faces.source === source)) return
    const controller = new AbortController()
    void (async () => {
      const blob = await sourceBlob(source).catch(() => null)
      if (!blob || controller.signal.aborted) return
      try {
        const track = await detectFaces(blob, duration, controller.signal)
        if (!controller.signal.aborted) setFaces({ source, track: track ?? [] })
      } catch (error) {
        if (controller.signal.aborted) return
        // 못 찾아도 그래픽은 기본 자리에 있고 사람이 「위치」에서 고를 수 있다. 까닭은 운영자가 알 수 있게 알린다.
        reportError(error)
        setFaces({ source, track: [] })
      }
    })()
    return () => controller.abort()
  }, [wantFaces, source, duration, faces])

  // 예시 영상, 첫 화면에서 넘어온 대본, 커넥터 초안의 대본은 영상 길이를 안 뒤 한 번 자동으로 그래픽을 만든다
  // (직접 넣은 영상은 autoMade 가 처음부터 true 라 저절로 만들지 않는다).
  if (!autoMade && source !== null && source.kind !== 'missing' && words.length > 0 && graphics.length === 0) {
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
    if (!video) return
    video.currentTime = t
    // 화면의 시각도 바로 옮긴다 — 다음 그리기를 기다리면 빠르게 이어 누르거나 끌 때 막대가 옛 자리로 되돌아간다.
    setTime(t)
  }, [])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) void video.play()
    else video.pause()
  }

  /** 시작 화면을 아래로 내려 고른 뒤에도 편집 화면은 맨 위(미리보기)부터 보이게 한다. */
  const toTop = () => window.scrollTo({ top: 0, behavior: 'instant' })

  const openFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith('video/')) return
    run.current += 1
    toTop()
    pulse('video_added')
    setSource({ kind: 'file', file })
    setName((current) => current || defaultName(fileMeta(file), copy.untitled))
    forget()
    setRecognized(null)
    // 커넥터 초안의 대본이 기다리고 있으면 그 대본으로 그래픽을 만든다(영상 길이를 안 뒤 — 위의 자동 만들기).
    setScript(draftScript ?? '')
    setGraphics([])
    setSpeech({ stage: 'idle' })
    setTab('transcript')
    setAutoMade(draftScript === null)
    setDraftScript(null)
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
    toTop()
    pulse('sample_opened')
    setSource({ kind: 'sample', clip })
    forget()
    setRecognized(null)
    setScript(draftScript ?? SAMPLE_SCRIPTS[lang])
    setDraftScript(null)
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
        engine === 'server' ? await transcribeOnServer(blob, { language, onProgress, maxSeconds: server?.maxSeconds }) : await transcribe(blob, { quality: engine, language, onProgress })
      if (!current()) return
      if (result.length === 0) {
        pulse('transcribe_failed')
        setSpeech({ stage: 'failed', reason: 'empty' })
        return
      }
      pulse('transcribe_ok')
      remember()
      setRecognized(result)
      setScript(joinWords(result))
      setSpeech({ stage: 'done', count: result.length })
      touch()
    } catch (error) {
      if (!current()) return
      pulse('transcribe_failed')
      // 소리가 없는 영상·서버가 바쁨·너무 긴 영상은 고장이 아니다. 그 밖의 까닭은 운영자가 알 수 있게 알린다.
      if (!(error instanceof NoAudioError) && !(error instanceof ServerBusyError) && !(error instanceof ServerTooLongError)) reportError(error)
      if (error instanceof ServerTooLongError) setSpeech({ stage: 'failed', reason: 'tooLong', maxSeconds: error.maxSeconds })
      else setSpeech({ stage: 'failed', reason: error instanceof NoAudioError ? 'noAudio' : error instanceof ServerBusyError ? 'busy' : 'error' })
    }
  }

  /** 자막 파일(SRT·VTT)을 이 브라우저 안에서 만들어 내려받는다. 한 덩어리의 글자 수는 화면 자막과 같게(가로 30 · 세로 16) */
  const downloadSubtitles = (format: 'srt' | 'vtt') => {
    const maxChars = portrait ? 16 : 30
    // SRT 는 앞에 BOM 을 붙인다 — 윈도우의 오래된 프로그램이 한글·일본어를 깨뜨리지 않게
    const text = format === 'srt' ? `\uFEFF${toSrt(words, maxChars)}` : toVtt(words, maxChars)
    const url = URL.createObjectURL(new Blob([text], { type: format === 'srt' ? 'application/x-subrip;charset=utf-8' : 'text/vtt;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${safeFileName(displayName, 'reelmotion')}.${format}`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    pulse('subtitles_downloaded')
  }

  const makeGraphics = () => {
    pulse('graphics_made')
    setAiPicks({ stage: 'idle' })
    setAiUndo(null)
    remember()
    setGraphics(clampToDuration(direct(words), duration))
    setSelectedId(null)
    setTab('graphics')
    touch()
  }

  // AI 가 문장 번호를 고르면 그 문장의 시간에 그래픽을 놓는다(src/editor/highlights.ts). 기다리는 동안 고친 것을 덮지 않게
  // 답이 온 때의 그래픽에 더하고, 가운데 그래픽끼리 겹치지 않게 시간을 나눈다.
  const findMoments = async () => {
    if (words.length === 0 || duration <= 0) return
    const sentences = toSentences(words)
    setAiPicks({ stage: 'running' })
    const result = await findHighlights({ sentences, covered: coveredSentences(sentences, graphics), duration })
    if (!result.ok) {
      setAiPicks({ stage: 'failed', reason: result.reason })
      return
    }
    if (result.picks.length === 0) {
      setAiPicks({ stage: 'none' })
      return
    }
    const added = picksToGraphics(result.picks, sentences, duration, () => `u${++serial.current}`)
    const current = latestGraphics.current
    const merged = resolveOverlaps([...current.map((graphic) => ({ ...graphic })), ...added])
    remember()
    setGraphics(merged)
    setAiUndo({ before: current, after: merged })
    setAiPicks({ stage: 'done', added: added.length })
    touch()
  }

  useEffect(() => {
    latestGraphics.current = graphics
  }, [graphics])

  useEffect(() => {
    now.current = { graphics, script, recognized, theme: themeId }
  }, [graphics, script, recognized, themeId])

  /** 사람이 고치기 직전에 부른다. key: 같은 칸을 잇달아 고치면(글자 치기·끌기) 한 번으로 묶는 이름 */
  const remember = (key: string | null = null) => {
    history.current = record(history.current, now.current, key, Date.now())
    setSteps((current) => ({ ...current, undo: history.current.past.length, redo: 0 }))
  }
  /** 새 영상을 열면 되돌리기를 비운다(다른 작업이다) */
  const forget = () => {
    history.current = emptyHistory()
    setSteps((current) => ({ ...current, undo: 0, redo: 0 }))
  }
  const restore = (snapshot: Snapshot) => {
    now.current = snapshot
    setGraphics(snapshot.graphics)
    setScript(snapshot.script)
    setRecognized(snapshot.recognized)
    setThemeId(snapshot.theme)
    touch()
  }
  const undoEdit = () => {
    const result = undo(history.current, now.current)
    if (!result) return
    history.current = result.history
    setSteps((current) => ({ undo: result.history.past.length, redo: result.history.future.length, revision: current.revision + 1 }))
    restore(result.snapshot)
  }
  const redoEdit = () => {
    const result = redo(history.current, now.current)
    if (!result) return
    history.current = result.history
    setSteps((current) => ({ undo: result.history.past.length, redo: result.history.future.length, revision: current.revision + 1 }))
    restore(result.snapshot)
  }

  const undoMoments = () => {
    if (!aiUndo || graphics !== aiUndo.after) return
    remember()
    setGraphics(aiUndo.before)
    setAiUndo(null)
    setAiPicks({ stage: 'undone' })
    touch()
  }

  const updateGraphic = (next: Graphic) => {
    const before = now.current.graphics.find((g) => g.id === next.id)
    remember(before ? changeKey(before, next) : null)
    setGraphics((list) => list.map((g) => (g.id === next.id ? next : g)))
    touch()
  }
  const addGraphic = (kind: Graphic['kind']) => {
    const g = createGraphic(kind, time, duration || 10, `u${++serial.current}`)
    remember()
    setGraphics((list) => [...list, g])
    setSelectedId(g.id)
    setTab('graphics')
    touch()
  }
  const removeGraphic = (id: string) => {
    remember()
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
      const key = event.key.toLowerCase()
      if ((event.metaKey || event.ctrlKey) && (key === 'z' || key === 'y')) {
        event.preventDefault()
        if (key === 'y' || event.shiftKey) redoEdit()
        else undoEdit()
      }
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
      keepStorage()
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
    // 요금제 한도를 먼저 묻는다(세지는 않음). 다 만든 뒤에만 이번 달 횟수를 센다 — 취소·실패는 횟수를 쓰지 않는다.
    const permit = await requestExport(duration)
    if (controller.signal.aborted) return
    if (!permit.ok) {
      setExportState({ stage: 'blocked', reason: permit.reason })
      return
    }
    // 긴 영상은 다 만든 영상을 메모리에 쥐지 않게, 저장 창이 있는 브라우저에서는 저장할 파일을 먼저 고른다(src/export/saveTarget.ts).
    // 누른 직후에 열어야 브라우저가 창을 열어 준다 — 열지 못하면 보통처럼 메모리에 모은다.
    let file: FileSystemWritableFileStream | null = null
    let savedName: string | undefined
    const picker = savePicker()
    const long = writesToFile(duration, picker !== null)
    if (long && picker) {
      const format = await exportFormat(size.width, size.height)
      if (format) {
        try {
          const handle = await picker({ suggestedName: `${safeFileName(displayName, 'reelmotion')}-reelmotion.${format}`, types: pickerTypes(format) })
          file = await handle.createWritable()
          savedName = handle.name
        } catch (error) {
          // 창을 닫았으면 내보내기를 그만둔다
          if (error instanceof DOMException && error.name === 'AbortError') {
            setExportState({ stage: 'idle' })
            return
          }
        }
      }
    }
    if (controller.signal.aborted) {
      await file?.abort().catch(() => undefined)
      return
    }
    const memoryHeavy = duration > 600 && !file
    pulse('export_started')
    try {
      const blob = await sourceBlob(source)
      const result = await exportVideo(blob, shown, theme, {
        onProgress: (progress) => setExportState({ stage: 'running', progress, long: memoryHeavy }),
        signal: controller.signal,
        watermark: permit.watermark,
        file,
      })
      reportExportDone()
      pulse('export_done')
      setExportState({
        stage: 'done',
        url: result.blob ? URL.createObjectURL(result.blob) : null,
        savedName,
        extension: result.extension,
        watermark: permit.watermark,
        remaining: permit.remaining,
      })
    } catch (error) {
      if (controller.signal.aborted) {
        setExportState({ stage: 'idle' })
        return
      }
      // 어느 브라우저에서 왜 안 되는지 운영자가 알 수 있게: 못 하는 브라우저와 하다가 실패한 것을 따로 세고, 실패의 까닭을 알린다
      const unsupported = error instanceof ExportUnsupportedError
      pulse(unsupported ? 'export_unsupported' : 'export_failed')
      if (!unsupported) reportError(error)
      setExportState({ stage: 'failed', unsupported })
    }
  }

  const closeExport = () => {
    exportAbort.current?.abort()
    if (exportState.stage === 'done' && exportState.url) URL.revokeObjectURL(exportState.url)
    setExportState({ stage: 'idle' })
  }

  // 말로 고치기: 답이 온 때의 최신 작업에 적용한다(기다리는 동안 손으로 고친 것을 덮지 않게).
  const chatDoc: ChatDoc = { graphics, theme: themeId, script, duration }
  const latestDoc = useRef(chatDoc)
  useEffect(() => {
    latestDoc.current = chatDoc
  })
  const applyChat = (ops: Parameters<typeof applyOps>[1]) => {
    const before = latestDoc.current
    const result = applyOps(before, ops, () => `u${++serial.current}`)
    const after: ChatDoc = { ...result, duration: before.duration }
    remember()
    setGraphics(after.graphics)
    setThemeId(after.theme)
    setScript(after.script)
    setSelectedId(null)
    touch()
    latestDoc.current = after
    return { before, after }
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
      <NoticeBar lang={lang} />
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
          {!online && (
            <span className="ed-offline" title={copy.offlineHint} role="status">
              <WifiOff size={14} aria-hidden="true" />
              <span>{copy.offline}</span>
            </span>
          )}
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
        <StartScreen copy={copy} lang={lang} notice={notice} pending={draftScript} onFile={openFile} onSample={openSample} onOpen={onOpen} onShowAll={() => setShowProjects(true)} />
      ) : (
        <main className={`ed-body${shown.length === 0 ? ' is-empty' : ''}`}>
          <h1 className="sr-only">{displayName}</h1>
          <section className="ed-stage">
            {source.kind === 'missing' ? (
              <Reconnect copy={copy} meta={source.meta} onFile={reconnect} />
            ) : (
              // --ar(가로÷세로)로 상자 크기를 정한다 — 창이 좁든 낮든 영상 비율을 지켜야 그래픽이 영상과 어긋나지 않는다(editor.css).
              // data-faces: 얼굴 찾기가 끝난 영상(화면 시험이 기다리는 표시 — e2e/tests/faces.cjs)
              <div className="ed-frame" data-faces={faceTrack ? 'done' : undefined} style={{ aspectRatio: `${size.width} / ${size.height}`, '--ar': size.width / size.height } as CSSProperties}>
                <video
                  ref={videoRef}
                  playsInline
                  loop
                  onLoadedMetadata={(event) => {
                    const video = event.currentTarget
                    setDuration(video.duration)
                    setSize({ width: video.videoWidth || 1280, height: video.videoHeight || 720 })
                    setMetaFor(source)
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
              <input
                type="range"
                className="ed-seek"
                min={0}
                max={duration || 0}
                step={0.1}
                value={Math.min(time, duration)}
                onChange={(event) => seek(Number(event.target.value))}
                aria-label={copy.scrub}
                disabled={source.kind === 'missing' || duration === 0}
                style={{ '--played': duration > 0 ? `${(Math.min(time, duration) / duration) * 100}%` : '0%' } as CSSProperties}
              />
              <span className="ed-time">
                {time.toFixed(1)}s / {duration.toFixed(1)}s
              </span>
              <span className="ed-history">
                <button type="button" className="round-btn" onClick={undoEdit} disabled={steps.undo === 0} aria-label={copy.undo} title={`${copy.undo} (Ctrl+Z · ⌘Z)`}>
                  <Undo2 size={17} aria-hidden="true" />
                </button>
                <button type="button" className="round-btn" onClick={redoEdit} disabled={steps.redo === 0} aria-label={copy.redo} title={`${copy.redo} (Ctrl+Shift+Z · ⌘⇧Z)`}>
                  <Redo2 size={17} aria-hidden="true" />
                </button>
              </span>
            </div>
          </section>

          <aside className="ed-panel">
            <h2 className="sr-only">{copy.panelTitle}</h2>
            <div className="ed-styles">
              <span>{copy.style}</span>
              <div>
                {THEMES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`swatch ${item.id === themeId ? 'is-on' : ''}`}
                    onClick={() => {
                      if (item.id === themeId) return
                      remember()
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
              <button type="button" role="tab" aria-selected={tab === 'chat'} onClick={() => setTab('chat')}>
                {copy.tabs.chat}
              </button>
            </div>
            {tab === 'transcript' ? (
              <TranscriptPanel
                copy={copy}
                isSample={isSample}
                canListen={source.kind === 'file'}
                script={script}
                onScript={(text) => {
                  remember('script')
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
                canSubtitle={words.length > 0}
                onSubtitles={downloadSubtitles}
              />
            ) : tab === 'chat' ? (
              <ChatPanel
                copy={copy}
                lang={lang}
                doc={chatDoc}
                ready={assistReady}
                entries={chat}
                onEntries={setChat}
                onApply={applyChat}
                onRestore={(before) => {
                  remember()
                  setGraphics(before.graphics)
                  setThemeId(before.theme)
                  setScript(before.script)
                  touch()
                }}
              />
            ) : (
              <>
                {assistReady === true && words.length > 0 && duration > 0 && (
                  <AiPicks
                    copy={copy}
                    thin={graphics.length > 0 && !graphics.some((graphic) => graphic.kind === 'stat' || graphic.kind === 'bars' || graphic.kind === 'list' || graphic.kind === 'quote')}
                    state={aiPicks}
                    canUndo={aiUndo !== null && graphics === aiUndo.after}
                    onRun={() => void findMoments()}
                    onUndo={undoMoments}
                  />
                )}
                <Inspector copy={copy} graphics={shown} selected={selected} portrait={portrait} revision={steps.revision} onSelect={setSelectedId} onAdd={addGraphic} onChange={updateGraphic} onRemove={removeGraphic} />
              </>
            )}
          </aside>

          <Timeline copy={copy} graphics={shown} duration={duration} time={time} selectedId={selectedId} onSelect={setSelectedId} onChange={updateGraphic} onSeek={seek} />
        </main>
      )}

      {exportState.stage !== 'idle' && (
        <ExportDialog copy={copy} lang={lang} state={exportState} baseName={safeFileName(displayName, 'reelmotion')} onClose={closeExport} onRetry={() => void startExport()} />
      )}
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
  /** 영상을 기다리는 대본(커넥터 초안) */
  pending: string | null
  onFile: (file: File | undefined) => void
  onSample: (clip: ClipId) => void
  onOpen: (id: string) => void
  onShowAll: () => void
}

function StartScreen({ copy, lang, notice, pending, onFile, onSample, onOpen, onShowAll }: StartProps) {
  const [over, setOver] = useState(false)
  const online = useOnline()
  const canInstall = useCanInstall()
  // 브라우저가 「이어져 있다」고 해도 실제로는 끊겨 있을 수 있다(인터넷 없는 와이파이 등) — 예시 그림을 못 받으면 예시를 숨긴다.
  const [samplesFailed, setSamplesFailed] = useState(false)
  const { state } = useProjectList()
  const recent = state.status === 'ready' ? state.items.slice(0, 4) : []
  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setOver(false)
    onFile(event.dataTransfer.files[0])
  }
  return (
    <main className="ed-start">
      {notice && <p className="ed-notice">{NOTICE_TEXT[notice](copy)}</p>}
      {pending !== null && (
        <section className="ed-draft" aria-label={copy.draft.title}>
          <h2>{copy.draft.title}</h2>
          <p>{copy.draft.body}</p>
          <blockquote>{pending}</blockquote>
        </section>
      )}
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
          {/* 크롬·엣지가 설치할 수 있다고 알려 줄 때만(다른 브라우저의 순서는 도움말에 있다) */}
          {canInstall && (
            <>
              {' · '}
              <button type="button" className="btn-text" onClick={() => void promptInstall()}>
                {copy.start.install}
              </button>
            </>
          )}
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
      {/* 예시 영상은 서버에서 받아 오므로 인터넷이 없으면 보이지 않는다 */}
      {online && !samplesFailed && (
        <>
          <p className="ed-start__label">{copy.start.samples}</p>
          <ul className="samples">
            {(Object.keys(CLIPS) as ClipId[]).map((clip) => (
              <li key={clip}>
                <button type="button" onClick={() => onSample(clip)} className={CLIPS[clip].portrait ? 'is-tall' : undefined} aria-label={copy.start.sampleNames[clip]} title={copy.start.sampleNames[clip]}>
                  <img src={posterUrl(clip, true)} alt="" loading="lazy" onError={() => setSamplesFailed(true)} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
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
  /** 받아쓴 말(또는 대본)이 있어 자막 파일을 만들 수 있다 */
  canSubtitle: boolean
  onSubtitles: (format: 'srt' | 'vtt') => void
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
      // 긴 소리는 나눠 보낸다(src/speech/chunks.ts) — 몇 번째 조각인지 함께
      case 'uploading':
        return p.speech.part ? `${t.uploading} (${p.speech.part.index}/${p.speech.part.count})` : t.uploading
      case 'serverListening':
        return p.speech.part ? `${t.serverListening} (${p.speech.part.index}/${p.speech.part.count})` : t.serverListening
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
      {p.canSubtitle && (
        <div className="subtitle-files">
          <span>{t.subtitles}</span>
          <div className="row-wrap">
            {(['srt', 'vtt'] as const).map((format) => (
              <button key={format} type="button" className="pill" onClick={() => p.onSubtitles(format)}>
                <Download size={12} aria-hidden="true" />
                {format.toUpperCase()}
              </button>
            ))}
          </div>
          <small className="hint">{t.subtitlesHint}</small>
        </div>
      )}
    </div>
  )
}

type ExportDialogProps = { copy: EditorCopy; lang: Lang; state: ExportState; baseName: string; onClose: () => void; onRetry: () => void }

function ExportDialog({ copy, lang, state, baseName, onClose, onRetry }: ExportDialogProps) {
  // 로그인하거나 요금제를 본 뒤 이 작업으로 돌아온다(주소의 ?project=).
  const back = typeof window === 'undefined' ? pagePath('app', lang) : `${window.location.pathname}${window.location.search}`
  const accountPath = pagePath('account', lang)
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
            {state.long && <p className="hint">{copy.exportLongHint}</p>}
            <button type="button" className="btn-outline" onClick={onClose}>
              {copy.cancel}
            </button>
          </>
        )}
        {state.stage === 'done' && (
          <>
            <h2 id="export-title">{copy.exportDone}</h2>
            {state.url ? (
              <>
                <video src={state.url} controls playsInline className="dialog__video" />
                <a className="btn-mint" href={state.url} download={`${baseName}-reelmotion.${state.extension}`}>
                  <Download size={16} aria-hidden="true" />
                  {fill(copy.download, { ext: state.extension.toUpperCase() })}
                </a>
              </>
            ) : (
              <p className="dialog__saved">{fill(copy.exportSaved, { name: state.savedName ?? `${baseName}-reelmotion.${state.extension}` })}</p>
            )}
            {state.watermark && <p className="hint">{copy.watermarkNote}</p>}
            {state.remaining !== null && <p className="hint">{fill(copy.exportsLeft, { n: state.remaining })}</p>}
          </>
        )}
        {state.stage === 'blocked' && (
          <>
            <h2 id="export-title">{copy.exportBlocked[state.reason]}</h2>
            <Link className="btn-mint" to={`${accountPath}?next=${encodeURIComponent(back)}${state.reason === 'login' ? '' : '#plans'}`}>
              {state.reason === 'login' ? copy.exportBlocked.loginButton : copy.exportBlocked.planButton}
            </Link>
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
