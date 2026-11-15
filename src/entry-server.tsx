// oxlint-disable react/only-export-components -- 빌드 때만 쓰는 입구라 빠른 새로고침(개발 서버)과 관계없다
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { AppRoutes } from './App'

/**
 * 빌드 때 쪽마다 HTML 을 미리 그린다(scripts/prerender.mjs 가 부른다). 검색 엔진과 AI 가 자바스크립트 없이도
 * 내용을 읽고, 사람은 그림이 뜨기 전에도 글을 본다. 브라우저는 같은 화면을 이어받는다(main.tsx).
 */
export function render(url: string): string {
  return renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <AppRoutes />
      </StaticRouter>
    </StrictMode>,
  )
}

export { headTags } from './seo/head'
export { llmsTxt, robotsTxt, sitemapXml } from './seo/files'
export { fillTemplate, prerenderPlan } from './seo/template'
export { BUSINESS } from './site/business'
export { KILL_SWITCH, SHELLS, precacheList, stampWorker } from './pwa/routes'
