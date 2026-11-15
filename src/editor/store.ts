import { parseProject } from './projects'
import type { SavedProject } from './projects'

/**
 * 「내 작업」 저장소: 이 브라우저의 IndexedDB. 서버로 보내지 않는다.
 * - projects: 작업(대본·낱말 시간·그래픽·스타일·작은 그림), id 로 찾는다.
 * - media: 넣은 영상 파일(Blob), 같은 id 로. 크면 저장하지 않는다(projects.ts 의 canStoreMedia).
 * 사생활 보호 창이나 저장을 막은 브라우저에서는 StorageUnavailableError — 편집은 되고 저장만 안 된다.
 */
const DB_NAME = 'reelmotion'
const DB_VERSION = 1
const PROJECTS = 'projects'
const MEDIA = 'media'

export class StorageUnavailableError extends Error {}

let opening: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (opening) return opening
  const attempt = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new StorageUnavailableError('IndexedDB is not available'))
      return
    }
    let request: IDBOpenDBRequest
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION)
    } catch (error) {
      reject(new StorageUnavailableError(String(error)))
      return
    }
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(PROJECTS)) db.createObjectStore(PROJECTS, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(MEDIA)) db.createObjectStore(MEDIA)
    }
    request.onsuccess = () => {
      const db = request.result
      // 다른 탭이 새 판으로 올리려 하면 비켜 준다(다음 요청 때 다시 연다).
      db.onversionchange = () => {
        db.close()
        opening = null
      }
      resolve(db)
    }
    request.onerror = () => reject(new StorageUnavailableError(request.error?.message ?? 'IndexedDB open failed'))
  })
  opening = attempt
  attempt.catch(() => {
    if (opening === attempt) opening = null
  })
  return attempt
}

/** 거래 하나를 열고, 다 끝나면(oncomplete) 마지막 요청의 결과를 돌려준다. */
async function transact<T>(stores: string[], mode: IDBTransactionMode, work: (tx: IDBTransaction) => IDBRequest | void): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(stores, mode)
    let result: T
    const request = work(tx)
    if (request) request.onsuccess = () => (result = request.result as T)
    tx.oncomplete = () => resolve(result)
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB request failed'))
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'))
  })
}

/** 최근에 고친 것부터. 읽을 수 없는(망가진) 작업은 뺀다. */
export async function listProjects(): Promise<SavedProject[]> {
  const all = await transact<unknown[]>([PROJECTS], 'readonly', (tx) => tx.objectStore(PROJECTS).getAll())
  return all
    .map(parseProject)
    .filter((project): project is SavedProject => project !== null)
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function getProject(id: string): Promise<SavedProject | null> {
  const value = await transact<unknown>([PROJECTS], 'readonly', (tx) => tx.objectStore(PROJECTS).get(id))
  return parseProject(value)
}

export async function putProject(project: SavedProject): Promise<void> {
  await transact([PROJECTS], 'readwrite', (tx) => tx.objectStore(PROJECTS).put(project))
}

/** 공간이 모자라면 QuotaExceededError 로 실패한다 — 부르는 쪽이 「영상 빼고 저장」으로 넘어간다. */
export async function putMedia(id: string, blob: Blob): Promise<void> {
  await transact([MEDIA], 'readwrite', (tx) => tx.objectStore(MEDIA).put({ blob }, id))
}

export async function getMedia(id: string): Promise<Blob | null> {
  const value = await transact<{ blob?: unknown } | undefined>([MEDIA], 'readonly', (tx) => tx.objectStore(MEDIA).get(id))
  return value?.blob instanceof Blob ? value.blob : null
}

export async function deleteProject(id: string): Promise<void> {
  await transact([PROJECTS, MEDIA], 'readwrite', (tx) => {
    tx.objectStore(PROJECTS).delete(id)
    tx.objectStore(MEDIA).delete(id)
  })
}

/** 저장소 남은 공간(브라우저가 알려 줄 때만). */
export async function storageEstimate(): Promise<{ quota?: number; usage?: number } | null> {
  try {
    return (await navigator.storage?.estimate?.()) ?? null
  } catch {
    return null
  }
}
