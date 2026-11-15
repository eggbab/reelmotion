import { useEffect } from 'react'
import type { PageMeta } from './meta'

/**
 * 브라우저 안에서 쪽을 옮길 때 탭 제목과 설명을 바꾼다. 처음 여는 쪽의 머리 정보는 빌드 때 미리 그린 HTML 에 이미 있다
 * (src/seo/head.ts — 바른 주소·언어별 주소·공유 그림까지). 여기서는 제목과 설명만 맞춘다.
 */
export function usePageMeta(meta: PageMeta): void {
  useEffect(() => {
    document.title = meta.title
    let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!tag) {
      tag = document.createElement('meta')
      tag.name = 'description'
      document.head.append(tag)
    }
    tag.content = meta.description
  }, [meta.title, meta.description])
}

/** 소개·약관·404 쪽의 바탕(편집기와 다르다). */
export function useSiteBody(): void {
  useEffect(() => {
    document.body.classList.add('site-body')
    return () => document.body.classList.remove('site-body')
  }, [])
}
