# ReelMotion 운영 안내

지금 상태(2026-11-15): **배포 전.** 도메인은 사용자가 나중에 정한다(정하면 아래 「도메인·문의 메일을 정하면」). 문의 메일은 임시로 `vmelabs@outlook.com`. 아래는 정해지면 그대로 따라 할 순서와, 이 작업 공간에서 실제로 확인한 것이다.

## 무엇이 돌아가나
| 이름 | 하는 일 | 만드는 곳 |
|---|---|---|
| `web` | 소개 페이지·편집기 파일을 내보내고, `/api/asr/*` 를 받아쓰기 서버로 넘긴다(Caddy) | 저장소 맨 위 `Dockerfile`, 설정 `deploy/Caddyfile` |
| `asr` | 소리(WAV)만 받아 Qwen3-ASR 로 받아 적고 낱말마다 시간을 돌려준다. 받은 소리는 저장하지 않고 접속 기록도 남기지 않는다 | `server/asr/` |
| `app` | 로그인(구글)·내 계정·탈퇴, 로그인한 사람의 작업(영상 제외) 저장, 말로 고치기 요청 검사·횟수 세기, 요금제 한도·달마다 내보내기 수, 결제 연결 자리, 자동 백업, 장애 확인·알림, Claude·ChatGPT 커넥터. SQLite 파일 하나(`app-data` 볼륨의 `reelmotion.db`) + 커넥터 초안 파일(`drafts.db` — 최대 7일, 백업하지 않음) | `server/app/`, 저장소 맨 위 `Dockerfile` 의 `app` 단계 |
| `assist` | 말로 고치기 AI: llama.cpp 서버 + Qwen3-4B-Instruct-2507(Apache-2.0, Q4_K_M 약 2.5GB). 글만 받고 저장하지 않는다 | 공식 이미지(판 고정, `compose.yml`) |

- 영상은 서버로 오지 않는다(편집기가 브라우저에서 소리만 꺼내 보낸다). 내보내기도 브라우저에서 한다.
- 받아쓰기 서버가 없거나 꺼져 있으면 편집기는 저절로 「이 브라우저」 받아쓰기(Whisper)를 쓴다.
- 로그인하지 않은 사람의 「내 작업」은 그 사람의 브라우저(IndexedDB)에만 있다. 로그인한 사람의 계정·작업(영상 제외)은 `app` 의 SQLite 파일에 있다 — **백업 대상은 이 파일 하나**(아래 「백업」). 커넥터 초안(`drafts.db`)은 일부러 백업하지 않는다(개인정보처리방침에 「7일 뒤 지우고 백업에 넣지 않는다」고 적었다).

## 띄우기 (운영 PC: 윈도우 + Docker Desktop)
그래픽 카드(GTX 1070 Ti) 없이:
```bash
cd deploy
docker compose up -d --build
```
그래픽 카드로(권함):
```bash
cd deploy
docker compose -f compose.yml -f compose.gpu.yml up -d --build
```
- 웹은 `127.0.0.1:8080` 에서만 받는다. 공개 주소(https)는 운영 PC 의 기존 공개 설정에서 이 포트로 넘긴다. 넘길 때 요청 크기 25MB 이상, 기다리는 시간 15분 이상으로 둔다(CPU 로 긴 소리를 받아 적을 때).
- 처음 띄울 때 모델(약 3.5GB)을 `asr-models` 볼륨으로 내려받는다. 몇 분 걸리고, 그동안 `/api/asr/health` 는 503 이다.
- 빌드가 `429 Too Many Requests` 로 멈추면 Docker Hub 의 내려받기 횟수 제한이다. 잠시 뒤 다시 하거나, Docker Desktop 에 Docker 계정으로 로그인하면 한도가 늘어난다.

## 도메인·문의 메일을 정하면 (사용자 결정 대기)
1. `deploy/.env` 에 `SITE_ORIGIN=https://도메인`(끝에 / 없이)을 적는다. 빌드할 때 쪽마다 바른 주소·언어별 주소(영어·한국어·일본어)·공유 그림 주소가 들어가고 `sitemap.xml` 이 생긴다(`scripts/prerender.mjs`). 비어 있으면 빌드 끝에 경고가 나온다.
2. 문의 메일은 지금 임시로 `vmelabs@outlook.com`(2026-11-15 사용자 지시)이다. 도메인 메일로 바꾸려면 `src/site/business.ts` 의 `contactEmail`. 약관·개인정보처리방침·환불 규정의 문의 자리와 바닥글에 나온다.
3. `docker compose up -d --build`(그래픽 카드면 위 두 번째 명령)로 다시 빌드한다.
4. 앞단(운영 PC 의 home-edge Caddy)에 이 주소 블록을 더할 때 마트마트 블록처럼 **`log { output discard }`** 를 넣는다 — 개인정보처리방침에 「접속 기록을 남기지 않는다」고 적었다. 요청 크기 25MB 이상, 기다리는 시간 15분 이상. 앞단에 CDN·터널 같은 바깥 회사를 끼우면 개인정보처리방침의 「처리 위탁·국외 이전」을 먼저 고친다.

## 말로 고치기 AI (`assist`)
- 처음 띄울 때 모델(약 2.5GB)을 `assist-models` 볼륨에 내려받는다. 그동안 편집기의 「말로 고치기」 탭은 「지금은 쓸 수 없어요」를 보인다(`/api/assist/health`).
- 그래픽 카드 없이(이 작업 공간, CPU 4개, 2026-11-15): 한 번에 9~22초(처음 것이 가장 느리다 — 앞부분을 기억해 두 번째부터 빨라진다). 메모리 약 3GB.
- 그래픽 카드로: `compose.gpu.yml` 이 `server-cuda` 판을 쓰고 모든 층을 카드에 올린다. 받아쓰기 모델(float32 약 2.4GB)과 합쳐 8GB 안에 들 것으로 보지만 실제 1070 Ti 에서는 아직 안 재 봤다. 모자라면 `--n-gpu-layers` 를 줄인다(나머지는 CPU).
- 시험: 실제 모델로 지시 8개(세 언어 — 제목·스타일·이름·숫자·지우기·더하기·낱말 고치기·시간 옮기기)를 돌리는 시험이 있다. 판을 올리면 다시 돌린다:
  `ASSIST_URL=http://<assist 주소>:8080 npx vitest run server/app/assist.live.test.ts` (2026-11-15: 8/8).
- 남용 막기: 로그인했으면 계정마다, 아니면 방문자 주소마다 10분에 20번, 동시에 기다리는 요청 3개까지(`server/app/app.ts`). 방문자 주소는 앞단이 알려 준 값을 믿는다(Caddyfile 의 `trusted_proxies`).

## 구글 로그인 켜기 (도메인이 정해진 뒤)
1. [Google Cloud 콘솔](https://console.cloud.google.com/) → 「API 및 서비스」 → 「OAuth 동의 화면」: 앱 이름 ReelMotion, 지원 메일, 범위는 `openid`·`email`·`profile` 만(민감하지 않은 범위라 심사가 가볍다), 게시 상태 「프로덕션」.
2. 「사용자 인증 정보」 → 「OAuth 클라이언트 ID 만들기」 → 「웹 애플리케이션」 → 승인된 리디렉션 URI: `https://도메인/api/auth/google/callback`.
3. `deploy/.env`(git 에 넣지 않는다)에 적는다: `SITE_ORIGIN=https://도메인`, `GOOGLE_CLIENT_ID=…`, `GOOGLE_CLIENT_SECRET=…`.
4. `docker compose up -d --build`. `/api/me` 의 `login.google` 이 `true` 면 켜진 것이다. 비밀값은 로그에 찍지 않는다(`server/app/config.ts`).
- 셋 중 하나라도 없으면 로그인 단추가 「로그인 준비 중」으로 바뀌고, 편집기는 로그인 없이 그대로 쓴다.
- 시험용 가짜 로그인(`AUTH_DEV=1`)은 이 작업 공간의 시험에서만 켰다. 운영 `.env` 에 넣지 않는다(켜면 서버 시작 줄에 크게 경고가 찍힌다).

## 요금제 한도 (`ENFORCE_PLANS`)
- 지금(베타)은 `0`(기본): 누구나 로그인 없이, 길이·횟수 한도 없이, 워터마크 없이 내보낸다. 로그인한 사람은 다 만든 내보내기 수만 달마다 센다(「내 계정」에 보인다).
- `deploy/.env` 에 `ENFORCE_PLANS=1` 을 적고 `docker compose up -d` 하면: 내보내려면 로그인해야 하고, 요금제(`src/site/plans.ts`)대로 영상 하나의 길이·한 달 횟수를 지키며, 무료 요금제 영상에는 오른쪽 아래에 작은 ReelMotion 표시가 들어간다. 한 달은 서울 시간으로 센다. **결제를 붙이는 날 켠다**(아래 「결제 붙이기」) — 결제 없이 켜면 아무도 한도를 늘릴 수 없다(관리 명령 `set-plan` 으로 손으로 주는 것만 된다).
- 순서: 편집기가 내보내기 전에 `POST /api/usage/export`(영상 길이만 보냄)로 묻고 — 이때는 세지 않는다 — 다 만들면 `POST /api/usage/export/done` 으로 알린다(이때 하나 센다). 취소하거나 실패한 내보내기는 세지 않는다.
- 정직한 한계: 내보내기는 이용자의 브라우저 안에서 하므로, 편집기 코드를 고쳐 쓰는 사람은 이 확인을 피할 수 있다. 정직한 이용자를 위한 장치다. 피해 가는 사람이 많아지면 내보내기를 서버에서 하는 방법을 그때 정한다.
- 앱 서버가 꺼져 있거나 없으면(정적 파일만 띄운 경우) 편집기는 한도 없이 내보낸다 — 편집기는 계정 없이도 쓰는 것이 원칙이다.

## 결제 붙이기 (카드 — 사용자가 나중에 붙인다)
지금은 연결 자리(`server/app/billing.ts` 의 `BillingProvider`)만 있고 붙인 결제사가 없다. 그래서 「내 계정」 요금제 칸은 「곧 나와요」·「카드 결제는 곧 열려요」, `POST /api/billing/checkout` 은 503(`billing_not_connected`), `POST /api/billing/webhook` 은 404 다. 붙이는 순서:
1. 카드 결제사를 고르고 계약한다(달마다 자동으로 결제되는 정기 결제를 지원하는 곳). 시험용(샌드박스) 키와 운영 키를 받는다.
2. 키는 `deploy/.env` 에만 적는다(git 에 넣지 않는다). `compose.yml` 의 `app` 환경 변수에 그 이름을 더한다(값은 `${이름:-}` 꼴로).
3. `server/app/billing.ts` 의 모양대로 구현 하나를 만든다.
   - `startCheckout({ user, plan, returnUrl })`: 결제사의 결제 화면 주소를 만들어 `{ url }` 로 돌려준다. 결제가 끝나면 돌아올 주소는 `returnUrl`(`https://도메인/<언어>/account?checkout=done` — 「내 계정」이 「결제가 확인되면 바뀐 요금제가 보여요」를 보이고 4초 뒤 다시 묻는다).
   - `handleWebhook(request, setPlan)`: 결제사가 보내는 알림의 **서명부터 확인**한다(틀리면 400). 결제가 끝났으면 `setPlan(사용자 id, 'creator' 또는 'pro', 끝나는 시각(ms))`, 해지·환불이면 `setPlan(사용자 id, 'free', null)`. 같은 알림이 두 번 와도 결과가 같게 만든다.
   - 결제사 관리 화면에 알림 주소 `https://도메인/api/billing/webhook` 를 적는다. 이 주소만 「우리 사이트에서 온 요청인지」(Origin)를 보지 않는다 — 대신 서명으로 확인한다.
4. `server/app/main.ts` 에서 `createApp({ …, billing: 만든 구현 })` 으로 넘기고, 시작 줄의 `billing not connected` 를 바꾼다.
5. `src/site/plans.ts` 에서 유료 요금제의 `available` 을 `true` 로 바꾼다(소개 페이지 요금표 단추가 「내 계정」의 그 요금제로 간다). `src/site/plans.test.ts` 의 「결제를 받을 수 있기 전에는…」 시험과, 요금표의 「베타 동안 무료」 글(`src/site/copy.ts` 의 `pricing.body`·`pricing.note`, `src/account/copy.ts` 의 `planBeta`)도 함께 고친다.
6. `deploy/.env` 에 `ENFORCE_PLANS=1`.
7. 약관·정책을 먼저 고치고 알린다(약관의 「약관 변경」: 시행 7일 전, 불리하면 30일 전).
   - 이용약관 「유료 서비스」: 값, 자동 결제와 갱신일, 해지 방법, 결제사.
   - 개인정보처리방침 「제3자 제공과 처리 위탁」: 결제사를 처리를 맡기는 곳으로 적는다(카드 번호는 결제사가 받고 우리는 받지 않는다면 그렇게). 결제사가 나라 밖이면 「국외 이전」도.
   - 환불 규정(`src/site/legal/refund.ts`): 결제사의 취소 방법에 맞춘다.
8. 결제사 시험 환경에서 확인한다: 결제 → 알림 → 「내 계정」 요금제가 바뀜, 해지 → 무료로 돌아감, 서명이 틀린 알림 → 400. 같은 흐름을 가짜 결제사로 확인하는 시험이 `server/app/plans.test.ts` 의 「결제사를 붙이면…」 이다.

## 관리자 화면
- 주소: `https://도메인/ko/admin`(영어 `/admin`, 일본어 `/ja/admin`). 검색에는 나오지 않는다. 「내 계정」에도 관리자에게만 「관리자 화면」 단추가 보인다.
- 쓸 수 있는 사람: `ADMIN_EMAILS`(쉼표로 여럿, 비우면 vmelabs@outlook.com)의 메일로 **구글 로그인**한 사람. 구글 계정의 메일이 그 주소여야 한다 — Outlook 주소로도 구글 계정을 만들 수 있다(구글 계정 만들기에서 「기존 이메일 주소 사용」). Gmail 로 쓰려면 `deploy/.env` 에 `ADMIN_EMAILS=그주소@gmail.com`.
- 할 수 있는 것: 서버 상태(5분마다 확인한 결과), 가입자·요금제별 사람 수·이번 달 내보내기, 최근 가입 20명과 찾기(메일·이름), 요금제 바꾸기(관리 명령 `set-plan` 과 같은 규칙), 공지 쓰기, 자동 백업 목록과 내려받기, 장애 알림 받는 곳과 시험 메일.
- 내려받은 백업은 다른 곳(외장 디스크 등)에 두고 30일이 지나면 지운다(개인정보처리방침).
- **공지**: 「공지」 칸에 세 언어로 적고 「공지 보이기」를 켜서 저장하면 사이트 맨 위(베타 안내 자리)와 편집기 위에 보인다. 모양은 알림·주의(노란색). 비운 언어에는 영어 → 한국어 → 일본어 순으로 적힌 글이 보인다. 방문자는 닫을 수 있고(그 브라우저에서만), 다시 저장하면 다시 보인다. 점검·장애 안내에 쓴다. 2026-11-15 확인: 쓰기·언어별·편집기·닫기·다시 보이기·끄기·휴대폰 폭(14개 모두 통과).
- 2026-11-15 이 작업 공간에서 확인: 로그인 전 → 로그인 안내, 일반 회원 → 「관리자만 볼 수 있어요」(서버도 403), 관리자 → 상태 다섯 가지·숫자·사람·요금제 바꾸기(그 회원의 요금제가 실제로 바뀜)·찾기·백업 내려받기, 휴대폰 폭·영어 화면(확인 24개 모두 통과).

## 관리 명령 (요금제 손으로 주기·사용량·백업)
`deploy` 폴더에서(첫 줄에 SQLite 「실험 기능」 경고가 나오면 무시해도 된다):
```bash
docker compose exec app node main.js admin users
```
```bash
docker compose exec app node main.js admin set-plan 메일주소 creator 30
```
```bash
docker compose exec app node main.js admin usage 메일주소
```
- `users`: 가입한 사람 수와 최근 50명(메일·요금제·끝나는 날·가입한 날).
- `set-plan <메일> <free|creator|pro> [일수]`: 결제를 붙이기 전 시험하거나 손으로 줄 때. 일수를 빼면 30일. `free` 는 끝나는 날 없음.
- `usage <메일>`: 달마다 다 만든 내보내기 수(최근 12달).

## 백업
백업할 것은 `app-data` 볼륨의 `reelmotion.db` 하나다(계정·작업·내보내기 수). 영상은 서버에 없다.
- **자동**: 앱 서버가 한 시간마다 확인해 서울 날짜로 하루 하나(`/data/backups/reelmotion-YYYYMMDD.db`)를 만들고, 7일이 지난 것은 지운다(`BACKUP_DAYS`, 0 이면 끔, 30 이하). 앱 기록에 `backup: reelmotion-…db` 가 찍힌다. 목록 보기: `docker compose exec app ls /data/backups`
- 자동 백업은 같은 PC 안에 있어 디스크가 망가지면 함께 잃는다. 그래서 **매주 하나를 꺼내 다른 곳(외장 디스크 등)에 두고, 꺼낸 것도 30일이 지나면 지운다** — 개인정보처리방침에 「백업은 30일이 지나면 지운다(탈퇴한 정보도 백업에는 최대 30일)」고 적었다. 판을 올리기 전에도 하나 만든다.
1. 돌아가는 중에도 안전하게 한 파일로 복사한다(SQLite 의 `VACUUM INTO`, 같은 이름이 있으면 멈춘다):
```bash
docker compose exec app node main.js admin backup /data/backup-20261115.db
```
2. 운영 PC 로 꺼내 다른 곳(외장 디스크 등)에 둔다:
```bash
docker compose cp app:/data/backup-20261115.db ./backup-20261115.db
```
자동 백업으로 되살릴 때는 파일을 넣을 필요 없이 `admin restore /data/backups/reelmotion-YYYYMMDD.db` 로 바로 한다(아래 세 번째 명령에서 주소만 바꾼다).
되살리기(파일을 넣고 → 앱을 끄고 → 되돌리고 → 켠다). 되돌리기 명령은 아무것도 지우지 않는다: 백업이 멀쩡한 ReelMotion 저장소인지 먼저 보고, 지금 저장소는 `reelmotion.db.before-restore-<시각>` 으로 옆에 남긴 뒤 백업을 넣는다. 앱이 켜져 있으면 멈추고 알려 준다.
```bash
docker compose cp ./backup-20261115.db app:/data/restore.db
```
```bash
docker compose stop app
```
```bash
docker compose run --rm --no-deps app node main.js admin restore /data/restore.db
```
```bash
docker compose start app
```
- 2026-11-15 이 작업 공간에서 이 순서 그대로 해 봤다(아래 「이 작업 공간에서 확인한 것」). 남긴 파일(`restore.db`, `before-restore-…`, 백업 파일)은 볼륨에 그대로 있다 — 자리가 모자랄 때만 정리한다.

## 앱으로 설치·오프라인
- **설치**: 사이트에 앱 정보 파일(`public/manifest.webmanifest`)과 아이콘(`public/icons/`)이 있어, 브라우저가 ReelMotion 을 앱처럼 설치할 수 있다(크롬·엣지의 주소창 설치 아이콘, 맥 사파리의 「Dock에 추가」, 아이폰 「홈 화면에 추가」). 앱 장터의 앱이 아니라 브라우저가 설치하는 웹 앱이다. 소개 페이지의 「맥·윈도우 앱」「아이폰·안드로이드」 줄은 크롬·엣지에서는 설치 창을 바로 띄우고, 다른 브라우저에서는 도움말의 설치 순서(`/help#install`)로 간다.
- **오프라인**: 편집기를 한 번 연 브라우저는 편집기 화면 파일(약 1.6MB)을 받아 두어, 다음부터 인터넷이 없어도 편집기가 열린다(서비스 워커 `dist/sw.js` — 원본 `src/pwa/sw.ts`, 규칙 `src/pwa/routes.ts`). 소개 페이지만 본 사람은 받지 않는다. 인터넷이 없으면 받아쓰기 서버·말로 고치기·계정 저장은 쉬고, 고치기·내보내기·「내 작업」은 된다. API(`/api/*`)·영상·다른 사이트 요청은 서비스 워커가 손대지 않는다.
- **새로 배포하면**: 쪽(HTML)은 늘 네트워크에서 먼저 받으므로 새 화면이 바로 보인다. 새 서비스 워커는 옛 것을 쓰는 창이 모두 닫힌 뒤에 넘겨받고, 그때 옛 캐시를 지운다(열려 있는 화면이 쓰던 파일을 중간에 지우지 않게). 빌드 끝의 `서비스 워커 판 …` 이 배포마다 바뀐다.
- **끄는 법(문제가 생겼을 때만)**: `deploy/.env` 에 `SW_DISABLE=1` 을 적고 다시 빌드한다(`docker compose up -d --build`). 그러면 `sw.js` 가 「캐시를 지우고 스스로 등록을 푸는 판」이 되어, 방문자의 브라우저가 다음에 편집기를 열 때 서비스 워커를 내려놓는다. 「내 작업」(IndexedDB)은 그대로다. 다시 켜려면 그 줄을 지우고 빌드한다.
- 아이콘·설치 창의 화면 그림을 다시 만들기(편집기 모습을 바꿨을 때, Playwright 필요): `node scripts/pwa-assets.mjs`.
- 편집기는 작업을 처음 저장할 때 브라우저에 「오래 두기」(`navigator.storage.persist`)를 청한다 — 들어주면 브라우저가 자리 정리를 해도 「내 작업」이 지워지지 않는다(크롬·엣지는 묻지 않고 정하고, 파이어폭스는 이용자에게 묻는다).

## Claude·ChatGPT 커넥터
- **무엇**: 사이트 주소 뒤에 `/mcp` 를 붙인 주소(`https://도메인/mcp`)가 커넥터(MCP 서버)다. 로그인 없이 누구나 Claude·ChatGPT 에 더해 쓴다. 영상은 다루지 않고 **대본(글)만** 받는다. 웹 서버가 앱 서버의 `/api/mcp` 로 넘긴다(`deploy/Caddyfile`, 코드는 `server/app/connect.ts`, 계산은 `src/connect/plan.ts` — 편집기와 같은 자동 배치 규칙).
- **AI 가 쓸 수 있는 도구 셋**: `list_styles`(스타일 여섯) · `plan_motion_graphics`(대본에서 어떤 그래픽이 언제 나올지 — 아무것도 저장하지 않음) · `open_in_editor`(대본·스타일을 초안으로 두고 편집기로 여는 링크 `…/app?draft=…` 를 돌려줌). 링크를 연 사람이 자기 브라우저에서 영상을 넣으면 그 대본으로 그래픽이 만들어진다.
- **초안**: `app-data` 볼륨의 `drafts.db`(계정 저장소와 다른 파일 — 백업하지 않는다). 누구 것인지는 적지 않는다. 7일이 지나면 열리지 않고, 다음 초안을 만들 때 지워진다. 20,000개가 차면 가장 오래된 것부터 지운다(이때는 링크가 7일보다 일찍 닫힐 수 있다).
- **한도**(숫자는 `server/app/connect.ts` 맨 위): 링크 만들기는 부르는 곳(IP)마다 1분에 20개, 모두 합쳐 1분에 60개. 대본 6,000자, 요청 본문 64KB. 넘으면 AI 가 「잠시 뒤 다시」라는 답을 받는다. IP 는 세는 동안 메모리에 1분까지만 둔다.
- **링크의 주소는 `SITE_ORIGIN` 으로 만든다.** 도메인을 정해 `SITE_ORIGIN=https://도메인` 을 적어야 링크가 `https://도메인/…` 으로 나온다. 비어 있으면 요청이 들어온 주소를 따르는데, 앞단이 https 를 풀어 넘기므로 `http://…` 로 나온다.
- **끄는 법(남용될 때만)**: `deploy/.env` 에 `CONNECTOR=0` 을 적고 `docker compose up -d`. 커넥터 주소는 「잠시 꺼 두었다」(503)를 답하고, 이미 만든 링크는 기한까지 열린다. 앱 시작 줄에 `connector OFF`. 도움말의 안내는 그대로 보이므로 오래 꺼 둘 거라면 공지(관리자 화면)로 알린다. 다시 켜려면 그 줄을 지운다.
- **공개하는 날 할 일**(이 작업 공간에는 공개 https 주소가 없어 **실제 Claude·ChatGPT 안에서는 해 보지 못했다** — 공식 MCP 클라이언트로만 확인했다):
  1. Claude: Customize → Connectors → Add → Add custom connector 에 이름과 `https://도메인/mcp`, 로그인 방식은 No sign-in. 도구 셋이 보이는지, 「이 대본으로 ReelMotion 그래픽 계획을 보여 줘」「편집기 링크를 만들어 줘」가 되는지, 받은 링크가 편집기로 열리는지 본다.
  2. ChatGPT(웹): Plugins → 더하기(+) → Add custom MCP server 에 같은 주소, No authentication. 같은 것을 본다.
  3. 두 서비스의 메뉴 이름이 도움말(`src/site/legal/help.ts` 의 `connect` 절 — 2026-11-15 두 회사의 공식 안내를 보고 적음)과 다르면 도움말을 고친다.
  - Claude 는 공개 인터넷에서 표준 https 포트(443)로만 붙는다 — 공개 주소에 다른 포트를 쓰지 않는다. 앞단(home-edge)이 `/mcp` 도 다른 주소와 같이 8080 으로 넘기는지 본다(주소 전체를 넘기고 있으면 따로 할 일이 없다).
- 두 회사의 커넥터 목록(디렉터리)에 올리는 일은 하지 않았다 — 지금은 이용자가 주소를 직접 넣는 방식이다. 올리려면 각 회사의 심사를 받아야 한다.

## 장애 알림
- 앱 서버가 5분마다 확인한다: 웹사이트, 받아쓰기 서버, 말로 고치기 AI, 저장 공간(2GB 미만이면 문제 — `DISK_MIN_GB`), 자동 백업(오늘이나 어제 것이 없으면 문제). **15분(세 번 잇달아) 넘게 이어지면** 받는 곳(`ALERT_EMAIL`, 기본 `vmelabs@outlook.com` — 2026-11-15 사용자 지시)으로 메일을 보낸다. 풀리면 「다시 정상이에요」, 계속되면 6시간마다 「아직 문제가 있어요」. 메일에는 부분 이름·상태·시각만 들어간다(이용자 정보 없음).
- **보내는 메일 계정이 있어야 메일이 간다.** Outlook.com 개인 계정은 2024년 9월부터 다른 프로그램이 비밀번호로 메일을 보내는 것을 막았다는 보고가 많다(받는 것은 된다). 그래서 보내는 쪽은 Gmail 앱 비밀번호를 쓴다.
- **보내는 계정은 outreach 의 관리자 계정에 연결된 Gmail 을 그대로 쓴다(2026-11-15 사용자 지시 「앱 비밀번호는 outreach의 관리자 계정에서 찾아」).** 그 앱 비밀번호는 outreach 운영 데이터베이스에 잠겨(암호화되어) 들어 있고, outreach 설정 화면도 값을 보여 주지 않는다(연결 여부만). 그래서 배포하는 날 **운영 PC 에서** 아래 도구로 옮긴다 — outreach 가 자기 서비스 메일을 보낼 때 쓰는 계정(주소·앱 비밀번호·서버)을 outreach 앱 컨테이너에서 읽어 `deploy/.env` 에 바로 적고, 값은 화면에 보이지 않는다. 주소와 비밀번호는 저장소·대화에 적지 않는다.
  1. 운영 PC 의 PowerShell 에서(ReelMotion 을 받은 폴더의 `deploy`):
```powershell
powershell -ExecutionPolicy Bypass -File .\smtp-from-outreach.ps1
```
  2. 「Wrote SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS …」가 나오면 끝. outreach 가 `%USERPROFILE%\outreach\deploy` 가 아닌 곳에 있으면 `-OutreachDeploy <그 폴더>` 를 붙인다.
  3. `docker compose up -d` 로 다시 띄운 뒤 시험 메일을 보낸다. vmelabs@outlook.com 받은편지함(처음에는 스팸함도)을 본다:
```bash
docker compose exec app node main.js admin test-alert
```
- 도구가 「outreach has no sending mail account」라고 하면 outreach 관리자 계정에 메일이 연결돼 있지 않은 것이다. 그때는 보낼 Gmail 계정에서 앱 비밀번호를 새로 만들어(2단계 인증을 켠 뒤 Google 계정 → 보안 → 「앱 비밀번호」, 16자리) `deploy/.env` 에 `SMTP_HOST=smtp.gmail.com`, `SMTP_USER=그 주소`, `SMTP_PASS=앱 비밀번호` 를 손으로 적는다.
- 이 도구는 두 조각이다: outreach 컨테이너 안에서 도는 `deploy/smtp_from_outreach.py`(2026-11-15 outreach 의 실제 코드에 임시 저장소와 가짜 비밀번호로 확인 — 관리자 Gmail·회사 메일 서버·outreach 설정 파일의 시스템 메일·계정 없음 네 경우, 그리고 적힌 줄을 ReelMotion 앱 컨테이너가 그대로 읽는 것)와, 그것을 넣고 받아 적는 `deploy/smtp-from-outreach.ps1`(**윈도우 쪽은 운영 PC 에서 아직 돌려 보지 못했다**).
- 보내는 계정을 넣기 전에는 알림이 앱 기록에만 남는다: `docker compose logs app` 에서 `ALERT` 로 시작하는 줄. 앱 시작 줄 끝에 `alerts → vmelabs@outlook.com (mail)` 이면 메일, `(log only)` 면 기록만.
- PC 나 인터넷이 통째로 멈추면 이 서버도 알릴 수 없다. 도메인이 생기면 바깥 감시 서비스(예: UptimeRobot 무료)에 `https://도메인/api/status` 를 5분마다 보게 하고, 알림을 vmelabs@outlook.com 으로 받게 한다. 모두 정상이면 200, 하나라도 문제면 503 을 돌려준다(부분 이름과 정상 여부만 — 자세한 내용은 관리자 화면).
- 메일을 받으면:
  - 웹사이트: `docker compose ps` 로 `web` 이 떠 있는지 보고 `docker compose up -d`.
  - 받아쓰기 서버: 처음 켤 때는 모델을 내려받느라 15분 넘게 걸릴 수 있다(`docker compose logs asr`). 그동안 편집기는 브라우저 받아쓰기로 계속 된다.
  - 말로 고치기 AI: `docker compose logs assist`. 메모리가 모자라면 다른 프로그램을 끈다.
  - 저장 공간: `docker system df` 로 큰 것을 찾아 정리한다(Docker Desktop 의 정리 기능).
  - 자동 백업: `docker compose logs app` 에서 `backup failed` 줄을 본다.

## 기록(로그)
- 웹(Caddy)은 접속 기록을 쓰지 않는다. 오류 기록에는 요청 정보가 붙는데, 그중 IP 주소·포트·머리글을 지우게 했다(`deploy/Caddyfile` 맨 위). 2026-11-15 확인: 일부러 오류를 낸 요청(`X-Forwarded-For` 포함)의 기록에 IP 가 0번 나왔다.
- 받아쓰기 서버는 접속 기록을 끄고(`access_log=False`), 실패했을 때 오류 내용만 남긴다(소리·IP 없음).
- 두 컨테이너 모두 기록 파일을 10MB × 3개로 묶었다(`compose.yml` 의 `logging`).

## 그래픽 카드 확인 (실제 카드에서는 아직 안 해 봤다)
```bash
docker compose -f compose.yml -f compose.gpu.yml exec asr python -c "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0))"
```
- `/api/asr/health` 의 `device` 가 `cuda:0 + aligner cpu` 이면 그래픽 카드로 받아 적는 중이다. `cpu` 로 나오면 카드를 못 쓴 것이다(서버는 멈추지 않고 CPU 로 물러난다 — `pick_device`).
- 근거: PyTorch 2.8 부터 CUDA 12.8 판은 Pascal(GTX 10 시리즈)을 뺐고, CUDA 12.6 판은 2.14 가 마지막이다. 그래서 `torch==2.14.1` + cu126 에 고정했다. 2026-11-15 그 판을 내려받아 들어 있는 카드 코드를 읽어 보니 `sm_50 sm_60 sm_70 sm_75 sm_80 sm_86 sm_90` 이었다 — `sm_61`(1070 Ti) 전용은 없지만 CUDA 는 6.0 코드를 6.1 카드에서 돌린다(같은 세대 하위 호환). 실제 카드에서 확인하기 전까지는 추정이다.
- 1070 Ti 는 메모리 8GB 에 bfloat16 을 못 쓴다. 그래서 받아쓰기 모델은 그래픽 카드에 float32, 정렬 모델은 CPU 에 bfloat16 으로 나눴다(`compose.gpu.yml`). 그래픽 카드 메모리를 얼마나 쓰는지는 재지 못했다.

## 이 작업 공간에서 확인한 것 (2026-11-15, 그래픽 카드 없음, CPU 4개)
- 아래의 화면 확인들은 저장소의 화면 시험(`e2e/`, 돌리는 법 `e2e/README.md`)으로 다시 돌릴 수 있다 — 2026-11-15 저장소로 옮긴 뒤 14개 묶음·확인 206개가 모두 통과했다(시험 영상은 저장소의 예시 영상으로 만든다).
- 두 이미지를 실제로 빌드했다: `reelmotion-web` 157MB, `reelmotion-asr`(CPU) 2.88GB.
- 함께 띄우고 크롬으로 편집기 → 영어 말소리 영상(24초) → 서버 받아쓰기 10초 → 그래픽 → 내보내기까지 끝까지 됐다. 한국어·일본어도 같은 서버(컨테이너 밖에서)로 확인했다.
- 웹의 머리글(COOP/COEP·보안 머리글)과 `/assets` 오래 보관 머리글, `/app` 주소가 나온다.
- 받아쓰기 서버 메모리: CPU bfloat16 약 0.8GB(float32 였으면 약 7.3GB — 처음에 7GB 제한에 걸려 계속 다시 시작했다). 4GB 제한을 두었다.
- 이 작업 공간은 HTTPS 를 다시 서명하는 프록시 뒤라 빌드에 `--secret id=extra_ca,src=<인증서>` 를 넘겼다. 운영 PC 에서는 넘기지 않는다.
- 쪽 주소(2026-11-15, 시험 도메인으로 빌드): `/` `/ko` `/ko/` `/ja/terms` `/privacy` `/app` `/ko/app` 200, 없는 주소 `/nope` `/ko/nope` `/ja/a/b` 는 그 언어의 404 쪽을 404 상태로. 404 쪽에도 같은 보안 머리글. 크롬에서 미리 그린 화면을 다시 그리지 않고 이어받는 것(9개 주소), 첫 화면·편집기 언어 옮기기(7가지), 언어 고르기, 바닥글·머리 메뉴 이동을 확인했다.
- 앱으로 설치·오프라인(크롬, 같은 브라우저 자료를 이어 쓰며 세 단계): ① 크롬이 「설치할 수 없는 까닭」을 하나도 내놓지 않음(앱 정보·아이콘·화면 그림), 소개 페이지만 열면 서비스 워커를 등록하지 않음, 편집기를 열면 언어별 껍데기와 화면 코드를 받아 둠 → 브라우저를 껐다가 인터넷 없이 켜도 저장한 작업(영상 포함)이 열리고, 내보내기(H.264+AAC)가 되고, 가 본 적 없는 쪽(도움말·일본어 약관)도 그려짐, 「오프라인」 표시와 예시 숨김(19개) ② 새로 배포하면 새 쪽이 바로 보이고, 새 판은 창이 열려 있는 동안 기다리며(옛 캐시 유지), 창을 닫았다 열면 넘겨받고 옛 캐시를 지움, 새 판으로도 오프라인 됨(5개) ③ `SW_DISABLE=1` 로 배포하면 캐시가 지워지고 등록이 풀리며 「내 작업」은 그대로(3개). 실제 아이폰·사파리의 「홈 화면에 추가」와 맥 사파리의 「Dock에 추가」는 해 보지 못했다.
- Claude·ChatGPT 커넥터(실제 이미지로 띄운 스택에, 공식 MCP 클라이언트가 웹 서버를 거쳐 — 확인 25개 모두 통과): 붙기 → 도구 셋 → 대본에서 계획(이름표·숫자·목록·자막) → 편집기 링크 → 크롬에서 그 링크를 열면 「대본이 준비됐어요」 → 영상을 넣으면 그 대본·스타일로 그래픽(실제 영상 길이에 맞춤) → 작업으로 저장되고 새로고침해도 남음 → 예시 영상으로도 됨 → 없는 링크·틀린 링크는 「기한이 지났거나 없는 링크」, 서버에 닿지 못하면 「불러오지 못했어요 — 새로고침」(다시 열면 대본이 나옴) → 소개 페이지의 줄 → 도움말에 주소 전체 → 휴대폰 폭 → 한국어 브라우저로 영어 링크를 열면 한국어 화면에 같은 대본. 한도: 한 곳에서 20개까지 만들고 21번째는 「잠시 뒤 다시」, 다른 곳은 그대로. 끄는 스위치(`CONNECTOR=0`): 커넥터는 503, 전에 만든 링크는 열리고 사이트는 그대로(5개). 브라우저로 `/mcp` 를 열면 안내(405), AI 서비스가 로그인 방법을 찾아보는 주소(`/.well-known/oauth-*`)는 404(= 로그인 없음). **실제 Claude·ChatGPT 안에서는 해 보지 못했다**(공개 https 주소가 없다).
- 휴대폰 크기의 편집기(크롬의 아이폰 13 흉내, 터치 입력을 브라우저에 직접 넣음 — 확인 34개 모두 통과): 미리보기 → 타임라인 → 판 순서, 미리보기가 위에 붙어 있음, 누르는 곳 40px 이상, 눌러 고르기 → 끌어 옮기기 → 끝을 끌어 길이, 세로로 밀면 화면이 밀리고 블록은 그대로, 눈금·막대로 위치, 70초 영상의 가로 밀기·확대·축소, 세로 영상 비율, 말로 고치기, 내보내기(H.264 1280×720), 내 작업 창. 컴퓨터(마우스·키보드) 13개도 통과. 실제 아이폰·안드로이드에서는 아직 안 해 봤다.
- 요금제 한도(`ENFORCE_PLANS=1`, 크롬, 확인 28개 모두 통과): 로그인 없이 내보내기 → 「로그인하면 내보낼 수 있어요」 → 로그인 → 하던 작업으로 돌아옴 → 무료는 워터마크(내보낸 MP4 를 잘라 보니 오른쪽 아래에 표시, 크리에이터로 내보낸 것에는 없음)와 남은 횟수 → 내보내다 그만둔 것은 세지 않음 → 3번을 다 쓰면 「다 썼어요」 → 「요금제 보기」 → 관리 명령으로 크리에이터 30일 → 워터마크 없음 → 무료에서 70초 영상은 「길어요」. 영어·일본어·휴대폰 폭의 「내 계정」도 봤다.
- 백업·되살리기(위 「백업」 순서 그대로): 5명일 때 백업 → 1명 더 가입 → 되살리기 → 5명, 그 뒤 새 가입도 저장됨. 앱이 켜진 채 되살리기를 부르면 멈추고 알려 준다. `docker compose cp` 로 넣은 파일은 root 것이라 손으로 옮겨 넣으면 앱이 쓰지 못한다 — 그래서 되살리기 명령이 앱 사용자로 복사해 넣는다.
- 이 작업 공간에서 Docker Hub 가 429 로 막혔을 때는 같은 공식 이미지(`node:22-slim`·`caddy:2.10-alpine`)를 Google 의 Docker Hub 거울(`mirror.gcr.io/library/…`)에서 받아 같은 이름을 붙여 빌드했다.
- 브라우저 안 받아쓰기의 실행 파일(onnxruntime)이 jsDelivr 가 아니라 우리 서버(`/assets/ort-wasm-*`)에서 오는 것, 바깥으로 나가는 곳이 Hugging Face(`huggingface.co`, `us.aws.cdn.hf.co`)뿐인 것을 확인했다(영어 24초 음성, 43초).

## 받아쓰기 서버 설정(환경 변수)
| 이름 | 기본 | 뜻 |
|---|---|---|
| `ASR_MODEL` | `Qwen/Qwen3-ASR-0.6B` | 받아쓰기 모델(1.7B 로 바꾸면 더 정확하지만 2배 이상 느리고 무겁다) |
| `ASR_ALIGNER` | `Qwen/Qwen3-ForcedAligner-0.6B` | 낱말 시간 모델 |
| `ASR_DEVICE` / `ASR_ALIGNER_DEVICE` | `auto` / `same` | `cpu`, `cuda:0` 등 |
| `ASR_DTYPE` / `ASR_ALIGNER_DTYPE` | `auto` | CPU 는 bfloat16, bfloat16 못 쓰는 카드는 float32 |
| `ASR_MAX_SECONDS` | `600` | 한 번에 받는 소리 길이(초) |
| `ASR_MAX_WAITING` | `4` | 앞 요청이 도는 동안 기다릴 수 있는 수. 넘으면 「바쁨」 |

## 끄기·되돌리기
```bash
cd deploy && docker compose down
```
받아쓰기 서버만 끄면 편집기는 브라우저 받아쓰기로 계속 동작한다.
