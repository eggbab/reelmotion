import type { SavedProject } from '../editor/projects'
import { listProjects, putProject } from '../editor/store'
import { listRemote, putRemote } from './api'
import type { RemoteSummary } from './api'

/** 「내 작업」 목록의 한 줄: 이 브라우저의 작업과 계정의 작업을 합친 것. */
export type ProjectListItem = Pick<SavedProject, 'id' | 'name' | 'updatedAt' | 'duration' | 'portrait' | 'thumbnail' | 'source'> & {
  /** 영상이 이 브라우저에 있다 */
  hasMedia: boolean
  /** 계정에만 있다(다른 기기에서 만든 작업) */
  remoteOnly: boolean
}

const pick = (item: SavedProject | RemoteSummary) => ({
  id: item.id,
  name: item.name,
  updatedAt: item.updatedAt,
  duration: item.duration,
  portrait: item.portrait,
  thumbnail: item.thumbnail,
  source: item.source,
})

/** 같은 작업은 나중에 고친 쪽의 이름·그림을 보인다. 영상이 있는지는 이 브라우저 기준. 최근 것부터. */
export function mergeProjects(local: SavedProject[], remote: RemoteSummary[]): ProjectListItem[] {
  const byId = new Map<string, ProjectListItem>()
  for (const project of local) byId.set(project.id, { ...pick(project), hasMedia: project.hasMedia, remoteOnly: false })
  for (const item of remote) {
    const mine = byId.get(item.id)
    if (!mine) byId.set(item.id, { ...pick(item), hasMedia: false, remoteOnly: true })
    else if (item.updatedAt > mine.updatedAt) byId.set(item.id, { ...pick(item), hasMedia: mine.hasMedia, remoteOnly: false })
  }
  return [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt)
}

/**
 * 로그인한 뒤 이 브라우저의 작업을 계정에 올린다: 내 것이거나 아직 주인이 없는 것 중, 계정에 없거나 더 새것만.
 * 올린(또는 이미 같은 판이 있는) 작업은 내 것으로 표시한다. 다른 계정의 작업은 이 브라우저에만 둔다.
 */
export async function pushLocalProjects(userId: string): Promise<number> {
  const [local, remote] = await Promise.all([listProjects(), listRemote()])
  const remoteTime = new Map(remote.map((item) => [item.id, item.updatedAt]))
  let pushed = 0
  for (const project of local) {
    if (project.owner !== null && project.owner !== userId) continue
    const upToDate = (remoteTime.get(project.id) ?? -Infinity) >= project.updatedAt
    if (!upToDate) {
      if ((await putRemote({ ...project, owner: userId, hasMedia: false })) !== 'ok') continue
      pushed += 1
    }
    if (project.owner !== userId) await putProject({ ...project, owner: userId })
  }
  return pushed
}
