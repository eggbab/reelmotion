import { Film, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Lang } from '../langs'
import { posterUrl } from '../media/clips'
import type { EditorCopy } from './copy'
import { formatAgo, formatClock } from './projects'
import type { ProjectListItem } from '../account/sync'
import { useProjectList } from './useProjectList'

type CardProps = {
  item: ProjectListItem
  copy: EditorCopy
  lang: Lang
  now: number
  current: boolean
  onOpen: (id: string) => void
  onDelete?: (id: string) => void
}

function ProjectCard({ item, copy, lang, now, current, onOpen, onDelete }: CardProps) {
  const [confirming, setConfirming] = useState(false)
  const p = copy.projects
  const needsVideo = item.source.kind === 'file' && !item.hasMedia
  const thumb = item.thumbnail ?? (item.source.kind === 'sample' ? posterUrl(item.source.clip, true) : null)
  return (
    <li className={`project ${current ? 'is-current' : ''}`}>
      <button type="button" className="project__open" onClick={() => onOpen(item.id)}>
        <span className={`project__thumb ${item.portrait ? 'is-tall' : ''}`}>{thumb ? <img src={thumb} alt="" /> : <Film size={22} aria-hidden="true" />}</span>
        <span className="project__name">{item.name || copy.untitled}</span>
        <span className="project__meta">
          {formatAgo(item.updatedAt, now, lang)} · {formatClock(item.duration)}
        </span>
        {(current || needsVideo) && <span className={`project__badge ${current ? '' : 'is-warn'}`}>{current ? p.current : p.needsVideo}</span>}
      </button>
      {onDelete &&
        (confirming ? (
          <div className="project__confirm" role="group" aria-label={p.confirmDelete}>
            <span>{p.confirmDelete}</span>
            <button type="button" className="btn-danger" onClick={() => onDelete(item.id)}>
              {p.delete}
            </button>
            <button type="button" className="btn-text" onClick={() => setConfirming(false)}>
              {p.keep}
            </button>
          </div>
        ) : (
          <button type="button" className="project__delete" aria-label={`${p.delete}: ${item.name || copy.untitled}`} onClick={() => setConfirming(true)}>
            <Trash2 size={15} aria-hidden="true" />
          </button>
        ))}
    </li>
  )
}

type GridProps = { items: ProjectListItem[]; copy: EditorCopy; lang: Lang; currentId: string | null; onOpen: (id: string) => void; onDelete?: (id: string) => void }

/** 작업 카드 줄(「내 작업」 창과 시작 화면이 함께 쓴다). */
export function ProjectGrid({ items, copy, lang, currentId, onOpen, onDelete }: GridProps) {
  const [now] = useState(() => Date.now())
  return (
    <ul className="projects">
      {items.map((item) => (
        <ProjectCard key={item.id} item={item} copy={copy} lang={lang} now={now} current={item.id === currentId} onOpen={onOpen} onDelete={onDelete} />
      ))}
    </ul>
  )
}

type DialogProps = {
  copy: EditorCopy
  lang: Lang
  currentId: string | null
  onOpen: (id: string) => void
  onNew: () => void
  /** 지우기(지금 작업이면 편집기가 기다리던 저장을 버리고 새 작업으로 넘어간다) */
  onDelete: (id: string) => Promise<void>
  onClose: () => void
}

/** 「내 작업」 창: 이 브라우저에 저장된 작업을 열고 지운다. */
export function ProjectsDialog({ copy, lang, currentId, onOpen, onNew, onDelete, onClose }: DialogProps) {
  const { state, reload } = useProjectList()
  const p = copy.projects

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const remove = async (id: string) => {
    await onDelete(id)
    reload()
  }

  return (
    <div className="dialog-back" role="presentation" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="dialog dialog--projects" role="dialog" aria-modal="true" aria-labelledby="projects-title">
        <button type="button" className="dialog__close" onClick={onClose} aria-label={copy.close}>
          <X size={18} />
        </button>
        <div className="projects__head">
          <h2 id="projects-title">{p.title}</h2>
          <button type="button" className="btn-outline" onClick={onNew}>
            <Plus size={16} aria-hidden="true" />
            {p.new}
          </button>
        </div>
        {state.status === 'unavailable' && <p className="hint is-error">{p.unavailable}</p>}
        {state.status === 'ready' &&
          (state.items.length === 0 ? (
            <p className="projects__empty">{p.empty}</p>
          ) : (
            <ProjectGrid items={state.items} copy={copy} lang={lang} currentId={currentId} onOpen={onOpen} onDelete={(id) => void remove(id)} />
          ))}
        <p className="projects__note">{p.note}</p>
      </div>
    </div>
  )
}
