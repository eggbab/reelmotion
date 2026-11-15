import { useCallback, useEffect, useState } from 'react'
import { listRemote } from '../account/api'
import { currentUser, useSession } from '../account/session'
import { mergeProjects } from '../account/sync'
import type { ProjectListItem } from '../account/sync'
import { listProjects } from './store'

export type ProjectListState = { status: 'loading' } | { status: 'ready'; items: ProjectListItem[] } | { status: 'unavailable' }

/** 「내 작업」 목록: 이 브라우저의 작업 + (로그인했으면) 계정의 작업. reload 로 다시 읽는다(지운 뒤 등). */
export function useProjectList(): { state: ProjectListState; reload: () => void } {
  const [state, setState] = useState<ProjectListState>({ status: 'loading' })
  const [version, setVersion] = useState(0)
  const session = useSession()
  const userId = currentUser(session)?.id ?? null
  useEffect(() => {
    let alive = true
    const load = async () => {
      const local = await listProjects()
      const remote = userId ? await listRemote().catch(() => []) : []
      return mergeProjects(local, remote)
    }
    load().then(
      (items) => alive && setState({ status: 'ready', items }),
      () => alive && setState({ status: 'unavailable' }),
    )
    return () => {
      alive = false
    }
  }, [version, userId])
  const reload = useCallback(() => setVersion((value) => value + 1), [])
  return { state, reload }
}
