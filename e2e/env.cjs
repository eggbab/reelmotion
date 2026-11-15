// 화면 시험이 함께 쓰는 값. 시험마다 결과(화면 사진·내려받은 파일)는 e2e/out/<시험 이름>/ 에 둔다(git 에 넣지 않는다).
//   E2E_BASE            시험할 사이트 주소(기본 http://127.0.0.1:8080 — deploy/compose.yml 의 web)
//   E2E_VIDEO/E2E_LONG  시험 영상(기본 e2e/media/talk.mp4 · long70.mp4 — `npm run e2e:media` 가 만든다)
//   E2E_APP_CONTAINER   관리 명령을 부를 앱 컨테이너 이름(기본 reelmotion-app-1)
//   E2E_OUT             결과를 둘 다른 폴더
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const name = path.basename(process.argv[1] || 'run', '.cjs')
const BASE = (process.env.E2E_BASE || 'http://127.0.0.1:8080').replace(/\/+$/, '')
const OUT = path.join(process.env.E2E_OUT || path.join(__dirname, 'out'), name)
const VIDEO = process.env.E2E_VIDEO || path.join(__dirname, 'media', 'talk.mp4')
const LONG = process.env.E2E_LONG || path.join(__dirname, 'media', 'long70.mp4')
const APP_CONTAINER = process.env.E2E_APP_CONTAINER || 'reelmotion-app-1'
/** 공식 MCP 클라이언트(커넥터 시험이 Claude·ChatGPT 처럼 붙는 데 쓴다) */
const SDK = path.join(root, 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs')

fs.mkdirSync(OUT, { recursive: true })

/** 시험 영상이 없으면 만드는 법을 알리고 멈춘다 */
function needMedia(...files) {
  const missing = files.filter((file) => !fs.existsSync(file))
  if (missing.length === 0) return
  console.error(`시험 영상이 없습니다: ${missing.join(', ')}\n먼저 만드세요: npm run e2e:media`)
  process.exit(2)
}

module.exports = { root, BASE, OUT, VIDEO, LONG, APP_CONTAINER, SDK, needMedia }
