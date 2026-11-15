import { describe, expect, it } from 'vitest'
import type { Graphic } from '../motion/types'
import { canStoreMedia, defaultName, formatAgo, formatClock, nextSerial, parseProject, safeFileName } from './projects'
import type { SavedProject } from './projects'

const valid: SavedProject = {
  version: 1,
  id: 'p1',
  name: 'My talk',
  createdAt: 1000,
  updatedAt: 2000,
  source: { kind: 'file', name: 'talk.mp4', size: 1234, type: 'video/mp4', lastModified: 99 },
  hasMedia: true,
  script: 'Hello there',
  recognized: [{ text: 'Hello', start: 0, end: 0.4 }],
  graphics: [{ id: 'u101', kind: 'title', start: 0, end: 3, text: 'Hello' }],
  theme: 'neon',
  speechLanguage: 'en',
  duration: 12.5,
  portrait: false,
  thumbnail: null,
}

describe('parseProject (저장된 작업 읽기)', () => {
  it('바른 작업은 그대로 읽는다', () => {
    expect(parseProject(structuredClone(valid))).toEqual(valid)
  })

  it('필수 값이 없거나 틀리면 null', () => {
    expect(parseProject(null)).toBeNull()
    expect(parseProject({ ...valid, id: '' })).toBeNull()
    expect(parseProject({ ...valid, version: 2 })).toBeNull()
    expect(parseProject({ ...valid, source: { kind: 'disk' } })).toBeNull()
    expect(parseProject({ ...valid, graphics: 'x' })).toBeNull()
  })

  it('모르는 그래픽·스타일은 버리거나 기본값으로', () => {
    const odd = { ...valid, theme: 'retro', graphics: [...valid.graphics, { id: 'z', kind: 'sparkle', start: 0, end: 1 }, { id: 'y', kind: 'title', start: 'a', end: 1 }] }
    const parsed = parseProject(odd)!
    expect(parsed.theme).toBe('neon')
    expect(parsed.graphics.map((g) => g.id)).toEqual(['u101'])
  })

  it('받아 적은 낱말이 망가졌으면 받아쓰기 전으로(null) 본다', () => {
    expect(parseProject({ ...valid, recognized: [{ text: 1 }] })!.recognized).toBeNull()
  })
})

describe('nextSerial', () => {
  it('새 그래픽 번호가 이미 있는 번호와 겹치지 않는다', () => {
    const graphics = [{ id: 'u105' }, { id: 'a' }, { id: 'u9' }] as Graphic[]
    expect(nextSerial(graphics)).toBe(105)
    expect(nextSerial([])).toBe(100)
  })
})

describe('이름·시간·크기', () => {
  it('기본 이름: 파일 이름에서 확장자를 뺀다', () => {
    expect(defaultName({ kind: 'file', name: 'my.talk.final.mp4', size: 1, type: 'video/mp4', lastModified: 0 }, 'Untitled')).toBe('my.talk.final')
    expect(defaultName({ kind: 'sample', clip: 'explainer' }, 'Untitled')).toBe('Untitled')
  })

  it('내려받을 파일 이름에서 쓸 수 없는 글자를 뺀다', () => {
    expect(safeFileName('a/b:c*?"<>|d ', 'video')).toBe('a-b-c-d')
    expect(safeFileName('   ', 'video')).toBe('video')
  })

  it('얼마 전인지 언어마다', () => {
    const now = Date.UTC(2026, 10, 15, 12)
    expect(formatAgo(now - 20_000, now, 'en')).toBe('now')
    expect(formatAgo(now - 3 * 60_000, now, 'ko')).toBe('3분 전')
    expect(formatAgo(now - 2 * 3_600_000, now, 'ja')).toBe('2 時間前')
    expect(formatAgo(now - 26 * 3_600_000, now, 'en')).toBe('yesterday')
  })

  it('영상 길이 시계', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(65.4)).toBe('1:05')
  })

  it('영상을 함께 저장할 수 있는지(2GB 이하, 남은 공간이 넉넉할 때)', () => {
    expect(canStoreMedia(100e6, { quota: 10e9, usage: 1e9 })).toBe(true)
    expect(canStoreMedia(100e6, { quota: 1e9, usage: 0.95e9 })).toBe(false)
    expect(canStoreMedia(3e9, { quota: 100e9, usage: 0 })).toBe(false)
    expect(canStoreMedia(100e6, null)).toBe(true)
  })
})
