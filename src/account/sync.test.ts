import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SavedProject } from '../editor/projects'
import { getProject, putProject } from '../editor/store'
import type { RemoteSummary } from './api'
import { mergeProjects, pushLocalProjects } from './sync'

const project = (id: string, updatedAt: number, owner: string | null = null, hasMedia = true): SavedProject => ({
  version: 1,
  id,
  name: `local ${id}`,
  createdAt: 1,
  updatedAt,
  source: { kind: 'file', name: `${id}.mp4`, size: 1, type: 'video/mp4', lastModified: 0 },
  hasMedia,
  script: '',
  recognized: null,
  graphics: [],
  theme: 'neon',
  speechLanguage: 'en',
  duration: 5,
  portrait: false,
  thumbnail: null,
  owner,
})

const remote = (id: string, updatedAt: number): RemoteSummary => ({
  id,
  name: `remote ${id}`,
  updatedAt,
  createdAt: 1,
  duration: 5,
  portrait: false,
  thumbnail: null,
  source: { kind: 'file', name: `${id}.mp4`, size: 1, type: 'video/mp4', lastModified: 0 },
})

describe('mergeProjects (이 브라우저 + 계정)', () => {
  it('계정에만 있는 작업은 영상 없이, 둘 다 있으면 나중에 고친 쪽 이름·그림, 영상은 이 브라우저 기준', () => {
    const items = mergeProjects([project('a', 10), project('b', 30)], [remote('a', 20), remote('b', 5), remote('c', 15)])
    expect(items.map((item) => [item.id, item.name, item.hasMedia, item.remoteOnly])).toEqual([
      ['b', 'local b', true, false],
      ['a', 'remote a', true, false],
      ['c', 'remote c', false, true],
    ])
  })
})

describe('pushLocalProjects (로그인한 뒤 이 브라우저의 작업 올리기)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('내 것·주인 없는 것 중 계정에 없거나 더 새것만 올리고, 다른 사람 것은 올리지 않는다', async () => {
    await putProject(project('p1', 10, null))
    await putProject(project('p2', 20, 'u1'))
    await putProject(project('p3', 30, 'u2'))
    await putProject(project('p4', 40, null))
    const puts: string[] = []
    vi.stubGlobal('fetch', async (_input: string, init?: RequestInit) => {
      if (init?.method === 'PUT') {
        const body = JSON.parse(String(init.body)) as SavedProject
        expect(body.hasMedia).toBe(false)
        expect(body.owner).toBe('u1')
        puts.push(body.id)
        return Response.json({ ok: true })
      }
      return Response.json({ projects: [remote('p2', 20), remote('p4', 5)] })
    })
    expect(await pushLocalProjects('u1')).toBe(2)
    expect(puts.sort()).toEqual(['p1', 'p4'])
    expect((await getProject('p1'))?.owner).toBe('u1')
    expect((await getProject('p3'))?.owner).toBe('u2')
    expect((await getProject('p1'))?.hasMedia).toBe(true)
  })
})
