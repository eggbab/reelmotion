import type { LegalPageId } from './legal/types'
import { lazyPage } from './lazyPage'
import type { PageId } from './routes'

/**
 * 첫 화면이 함께 받지 않는 쪽: 약관·개인정보처리방침·환불 규정·도움말(LegalPage)과 오픈소스 라이선스(LicensesPage).
 * 글이 길어(압축해도 약 40KB) 소개 페이지를 여는 사람 대부분이 받지 않게 나눴다(2026-11-19). 제목·설명·바닥글 글은 legal/heads.ts.
 */
const legal = lazyPage<{ page: LegalPageId | 'help' }>(() => import('./legal/LegalPage').then((module) => module.LegalPage))
const licenses = lazyPage<object>(() => import('./legal/LicensesPage').then((module) => module.LicensesPage))

export const splitPages = { legal, licenses }

const SPLIT: Partial<Record<PageId, { preload: () => Promise<void> }>> = { help: legal, terms: legal, privacy: legal, refund: legal, licenses }

/** 이 쪽이 따로 받는 쪽이면 받아 둔다(아니면 바로 끝) */
export const preloadPage = (page: PageId | undefined): Promise<void> => (page && SPLIT[page] ? SPLIT[page].preload() : Promise.resolve())

/** 빌드 때 모든 쪽을 미리 그리기 전에 */
export const preloadAllPages = (): Promise<void> => Promise.all([legal.preload(), licenses.preload()]).then(() => undefined)
