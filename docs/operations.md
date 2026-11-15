# ReelMotion 운영 안내

지금 상태(2026-11-15): **배포 전.** 도메인은 사용자가 나중에 정한다(정하면 아래 「도메인·문의 메일을 정하면」). 문의 메일은 임시로 `vmelabs@outlook.com`. 아래는 정해지면 그대로 따라 할 순서와, 이 작업 공간에서 실제로 확인한 것이다.

## 무엇이 돌아가나
| 이름 | 하는 일 | 만드는 곳 |
|---|---|---|
| `web` | 소개 페이지·편집기 파일을 내보내고, `/api/asr/*` 를 받아쓰기 서버로 넘긴다(Caddy) | 저장소 맨 위 `Dockerfile`, 설정 `deploy/Caddyfile` |
| `asr` | 소리(WAV)만 받아 Qwen3-ASR 로 받아 적고 낱말마다 시간을 돌려준다. 받은 소리는 저장하지 않고 접속 기록도 남기지 않는다 | `server/asr/` |
| `app` | 로그인(구글)·내 계정·탈퇴, 로그인한 사람의 작업(영상 제외) 저장, 말로 고치기 요청 검사·횟수 세기. SQLite 파일 하나(`app-data` 볼륨의 `reelmotion.db`) | `server/app/`, 저장소 맨 위 `Dockerfile` 의 `app` 단계 |
| `assist` | 말로 고치기 AI: llama.cpp 서버 + Qwen3-4B-Instruct-2507(Apache-2.0, Q4_K_M 약 2.5GB). 글만 받고 저장하지 않는다 | 공식 이미지(판 고정, `compose.yml`) |

- 영상은 서버로 오지 않는다(편집기가 브라우저에서 소리만 꺼내 보낸다). 내보내기도 브라우저에서 한다.
- 받아쓰기 서버가 없거나 꺼져 있으면 편집기는 저절로 「이 브라우저」 받아쓰기(Whisper)를 쓴다.
- 로그인하지 않은 사람의 「내 작업」은 그 사람의 브라우저(IndexedDB)에만 있다. 로그인한 사람의 계정·작업(영상 제외)은 `app` 의 SQLite 파일에 있다 — **백업 대상은 이 파일 하나**(아래 「백업」).

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
- 두 이미지를 실제로 빌드했다: `reelmotion-web` 157MB, `reelmotion-asr`(CPU) 2.88GB.
- 함께 띄우고 크롬으로 편집기 → 영어 말소리 영상(24초) → 서버 받아쓰기 10초 → 그래픽 → 내보내기까지 끝까지 됐다. 한국어·일본어도 같은 서버(컨테이너 밖에서)로 확인했다.
- 웹의 머리글(COOP/COEP·보안 머리글)과 `/assets` 오래 보관 머리글, `/app` 주소가 나온다.
- 받아쓰기 서버 메모리: CPU bfloat16 약 0.8GB(float32 였으면 약 7.3GB — 처음에 7GB 제한에 걸려 계속 다시 시작했다). 4GB 제한을 두었다.
- 이 작업 공간은 HTTPS 를 다시 서명하는 프록시 뒤라 빌드에 `--secret id=extra_ca,src=<인증서>` 를 넘겼다. 운영 PC 에서는 넘기지 않는다.
- 쪽 주소(2026-11-15, 시험 도메인으로 빌드): `/` `/ko` `/ko/` `/ja/terms` `/privacy` `/app` `/ko/app` 200, 없는 주소 `/nope` `/ko/nope` `/ja/a/b` 는 그 언어의 404 쪽을 404 상태로. 404 쪽에도 같은 보안 머리글. 크롬에서 미리 그린 화면을 다시 그리지 않고 이어받는 것(9개 주소), 첫 화면·편집기 언어 옮기기(7가지), 언어 고르기, 바닥글·머리 메뉴 이동을 확인했다.
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
