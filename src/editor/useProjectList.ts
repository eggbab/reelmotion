import { useCallback, useEffect, useState } from 'react'
import type { SavedProject } from './projects'
import { listProjects } from './store'

export type ProjectListState = { status: 'loading' } | { status: 'ready'; items: SavedProject[] } | { status: 'unavailable' }

/** 이 브라우저에 저장된 작업 목록. reload 로 다시 읽는다(지운 뒤 등). */
export function useProjectList(): { state: ProjectListState; reload: () => void } {
  const [state, setState] = useState<ProjectListState>({ status: 'loading' })
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let alive = true
    listProjects().then(
      (items) => alive && setState({ status: 'ready', items }),
      () => alive && setState({ status: 'unavailable' }),
    )
    return () => {
      alive = false
    }
  }, [version])
  const reload = useCallback(() => setVersion((value) => value + 1), [])
  return { state, reload }
}
