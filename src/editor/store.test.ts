import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import type { SavedProject } from './projects'
import { deleteProject, getMedia, getProject, listProjects, putMedia, putProject } from './store'

const project = (id: string, updatedAt: number): SavedProject => ({
  version: 1,
  id,
  name: `project ${id}`,
  createdAt: 1,
  updatedAt,
  source: { kind: 'file', name: `${id}.mp4`, size: 3, type: 'video/mp4', lastModified: 0 },
  hasMedia: true,
  script: 'hello',
  recognized: null,
  graphics: [{ id: 'u101', kind: 'title', start: 0, end: 2, text: 'hello' }],
  theme: 'clean',
  speechLanguage: 'en',
  duration: 3,
  portrait: false,
  thumbnail: null,
  owner: null,
})

describe('「내 작업」 저장소(IndexedDB)', () => {
  it('저장한 작업을 그대로 다시 읽는다', async () => {
    await putProject(project('a', 10))
    expect(await getProject('a')).toEqual(project('a', 10))
    expect(await getProject('missing')).toBeNull()
  })

  it('목록은 최근에 고친 것부터', async () => {
    await putProject(project('b', 30))
    await putProject(project('c', 20))
    const ids = (await listProjects()).map((item) => item.id).filter((id) => ['a', 'b', 'c'].includes(id))
    expect(ids).toEqual(['b', 'c', 'a'])
  })

  it('같은 작업을 다시 저장하면 덮어쓴다', async () => {
    await putProject({ ...project('a', 40), name: 'renamed' })
    expect((await getProject('a'))?.name).toBe('renamed')
    expect((await listProjects()).filter((item) => item.id === 'a')).toHaveLength(1)
  })

  it('영상 파일을 함께 두고 꺼낸다', async () => {
    await putMedia('a', new Blob(['abc'], { type: 'video/mp4' }))
    const blob = await getMedia('a')
    expect(blob?.type).toBe('video/mp4')
    expect(await blob?.text()).toBe('abc')
    expect(await getMedia('b')).toBeNull()
  })

  it('작업을 지우면 영상도 지운다', async () => {
    await deleteProject('a')
    expect(await getProject('a')).toBeNull()
    expect(await getMedia('a')).toBeNull()
  })
})
