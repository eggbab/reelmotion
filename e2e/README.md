# 화면 시험 (끝에서 끝까지)

실제 브라우저(크롬)로 사이트를 열어, 사람이 쓰는 순서대로 눌러 보며 확인한다. 자동 시험(`npm test`)이 계산을 본다면,
이 시험들은 화면·서버·저장소가 이어진 채로 되는지를 본다. 2026-11-15 까지는 작업 공간의 임시 폴더에만 있어서
작업 공간이 닫히면 사라졌다 — 그래서 저장소로 옮겼다.

## 준비
- Docker(스택을 띄운다) · ffmpeg(시험 영상) · Playwright 와 크롬(`require('playwright')` 가 되어야 한다. 저장소 의존성에는 넣지 않았다 — 없으면 `npm i --no-save playwright && npx playwright install chromium`).
- `npm ci` 를 한 저장소(커넥터 시험이 공식 MCP 클라이언트를 `node_modules` 에서 읽는다).

## 돌리는 순서
```bash
npm run e2e:media
```
시험 영상 둘을 `e2e/media/` 에 만든다(저장소의 예시 영상에 소리를 넣은 24초·70초짜리. 말소리는 없다).

```bash
cd deploy && docker compose -f compose.yml -f ../e2e/compose.test.yml up -d --build
```
시험용 설정(`compose.test.yml` — **가짜 로그인이 켜진다, 운영에서 쓰지 않는다**)으로 스택을 띄운다. 받아쓰기·말로 고치기 모델을 처음 받는 데 몇 분 걸린다.

```bash
npm run e2e
```
기본 묶음을 차례로 돌리고 통과·실패 수를 모아 보여 준다. 화면 사진과 내려받은 파일은 `e2e/out/<시험 이름>/` 에 남는다.
고른 것만: `node e2e/run.cjs phone connect`. 하나만 자세히: `node e2e/tests/phone.cjs`.

화면을 고친 뒤 이미지를 다시 굽지 않고 바로 볼 때는 `npm run build` 한 뒤:
```bash
cd deploy && docker compose -f compose.yml -f ../e2e/compose.test.yml -f ../e2e/compose.dist.yml up -d --no-build web
```

## 무엇을 보나
| 시험 | 보는 것 |
|---|---|
| `landing` | 소개 페이지 세 언어가 끝까지 내려도 오류 없이 그려진다 |
| `help` · `faqhelp` | 도움말(커넥터 절의 주소)·자주 묻는 질문이 컴퓨터·휴대폰 폭에서 넘치지 않는다 |
| `aspect` | 미리보기 상자가 늘 영상 비율(창 5가지 × 가로·세로 영상) — 다르면 그래픽이 영상과 어긋난다 |
| `timeline` | 컴퓨터(마우스·키보드)의 타임라인: 끌기·길이·눈금·막대·확대·축소 |
| `projects` | 「내 작업」: 저장 → 새로고침·뒤로 가기·언어 바꾸기에도 같은 작업 → 목록·이름·지우기 → 영상 다시 고르기 |
| `accounts` | 계정(가짜 로그인): 계정에 저장 → 다른 브라우저에서 열림 → 더 새 판 → 로그아웃·탈퇴 |
| `notice` | 공지: 관리자가 쓰면 사이트·편집기에 보임 → 닫기 → 다시 저장 → 끄기 |
| `admin` | 관리자 화면: 막힘·상태·숫자·사람 찾기·요금제 바꾸기·백업 내려받기·알림 |
| `pulse` | 쓰임 숫자·브라우저 오류: 편집기를 쓰면 관리자 화면의 숫자가 오르고(이름만 보낸다), 자동 프로그램은 따로, 편집기 오류가 물음표 뒤 없이 모이고, 휴대폰 폭에서 넘치지 않는다 |
| `connect` | Claude·ChatGPT 커넥터: 공식 MCP 클라이언트로 계획·링크 → 링크를 열면 「대본이 준비됐어요」 → 영상을 넣으면 그래픽 |
| `connect-limits` | 커넥터 한도: 한 곳에서 1분에 20개, 다른 곳은 그대로 |
| `chat` | 말로 고치기: AI 가 그래픽을 고치고, 되돌리고, 딴 얘기에는 답만 |
| `ai-picks` | AI로 강조할 순간 찾기(실제 AI): 숫자·순서가 없는 이야기는 규칙이 제목·자막만 → 카드가 까닭을 말하고 → AI 가 고른 그래픽이 문장 시간에 더해지고 → 되돌리기, AI 가 꺼져 있으면 카드 없음, 한도 안내, 한국어 휴대폰 폭 |
| `faces` | 그래픽이 얼굴을 가리지 않게(브라우저 안 얼굴 찾기): 사람이 오른쪽인 예시 영상에서 숫자가 왼쪽으로(그리는 그림도 왼쪽), 왼쪽의 제목·이름표·목록은 그대로, 「위치」로 고르면 그대로, 사람이 가운데면 그대로, 세로 영상은 얼굴 파일을 받지 않고 「위치」 칸이 없음, 한국어 이름 |
| `undo` | 되돌리기·다시 하기: 처음에는 단추가 꺼져 있고(저절로 한 일은 안 담음), 숫자·여러 글자·Delete 로 지우기·타임라인 끌기·스타일을 각각 한 번에 되돌리고 다시 하기, 글 칸 안의 Ctrl+Z 는 그 칸만, 한국어 이름·휴대폰 폭 |
| `phone` | 휴대폰(아이폰 13 흉내, 터치): 배치·손짓·긴 영상·세로 영상·말로 고치기·내보내기·내 작업 |
| `pwa` | 앱으로 설치·오프라인: 설치 조건 → 인터넷 없이 편집기·작업·내보내기 |
| `plans` | 요금제 한도(따로 — 아래) |

`placement-shots` 는 통과·실패를 가리지 않는 보는 도구다: 평범한 대본을 편집기에 넣어 그래픽이 영상 위에서 어떻게 보이는지 찍는다
(`node e2e/tests/placement-shots.cjs ko-money:seoul en-tips:editorial`).

## 스택을 다르게 띄워야 하는 시험
- **요금제 한도**: `ENFORCE_PLANS=1` 로 앱을 다시 띄운 뒤 `E2E_ENFORCED=1 npm run e2e`(= `plans` 와 `admin`). 끝나면 값 없이 다시 띄워 베타 설정으로 돌린다.
```bash
cd deploy && ENFORCE_PLANS=1 docker compose -f compose.yml -f ../e2e/compose.test.yml up -d --no-build app
```
- **커넥터 끄는 스위치**: `node e2e/tests/connect-limits.cjs` 가 첫 줄에 찍는 초안 번호를 적어 두고, `CONNECTOR=0` 으로 앱을 다시 띄운 뒤 `node e2e/tests/connect-limits.cjs off <초안 번호>`. 끝나면 다시 켠다.
- **새로 배포했을 때의 오프라인 화면**: `node e2e/tests/pwa.cjs first` → 화면을 조금 고쳐 다시 빌드해 띄움 → `node e2e/tests/pwa.cjs update` → `SW_DISABLE=1` 로 빌드해 띄움 → `node e2e/tests/pwa.cjs kill`. 세 단계가 `e2e/out/pwa/profile` 의 같은 브라우저 자료를 이어 쓴다.

## 설정(환경 변수)
`E2E_BASE`(기본 `http://127.0.0.1:8080`) · `E2E_VIDEO` · `E2E_LONG` · `E2E_OUT` · `E2E_APP_CONTAINER`(기본 `reelmotion-app-1`) · `E2E_SKIP_CHAT=1`(AI 서버 없이 `phone` 을 돌릴 때) — `e2e/env.cjs`.

## 알아 둘 것
- 흉내 낸 것: 휴대폰은 크롬의 아이폰 13 흉내다. **실제 아이폰·안드로이드·사파리·파이어폭스는 이 시험이 보지 못한다.**
- `chat` 과 `phone` 의 말로 고치기는 AI 서버(assist)가 CPU 로 돌면 한 번에 수십 초 걸린다.
- 시험은 가짜 계정(`…@example.com`)과 작업을 만든다. 시험용 스택의 저장소(도커 볼륨)에만 남는다 — 운영 스택을 향해 돌리지 않는다.
- Playwright 에서 겪은 것: `page.waitForFunction` 에 async 함수를 주면 Promise 를 참으로 보고 바로 지나간다(값을 기다리려면 `page.evaluate` 를 돌며 확인). 서비스 워커를 같은 실행에서 설치했으면 `setOffline` 뒤에도 `navigator.onLine` 이 참으로 남는다(브라우저를 다시 띄운 뒤 끊는다 — `pwa.cjs`).
- 새 시험을 더하면: `e2e/tests/<이름>.cjs`(줄 앞에 `PASS`/`FAIL` 을 찍는다) → `run.cjs` 의 묶음 → 이 표.
