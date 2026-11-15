# ReelMotion 운영 안내

지금 상태(2026-11-15): **배포 전.** 도메인·문의 메일은 사용자가 나중에 정한다. 아래는 정해지면 그대로 따라 할 순서와, 이 작업 공간에서 실제로 확인한 것이다.

## 무엇이 돌아가나
| 이름 | 하는 일 | 만드는 곳 |
|---|---|---|
| `web` | 소개 페이지·편집기 파일을 내보내고, `/api/asr/*` 를 받아쓰기 서버로 넘긴다(Caddy) | 저장소 맨 위 `Dockerfile`, 설정 `deploy/Caddyfile` |
| `asr` | 소리(WAV)만 받아 Qwen3-ASR 로 받아 적고 낱말마다 시간을 돌려준다. 받은 소리는 저장하지 않고 접속 기록도 남기지 않는다 | `server/asr/` |

- 영상은 서버로 오지 않는다(편집기가 브라우저에서 소리만 꺼내 보낸다). 내보내기도 브라우저에서 한다.
- 받아쓰기 서버가 없거나 꺼져 있으면 편집기는 저절로 「이 브라우저」 받아쓰기(Whisper)를 쓴다.
- 서버에 남는 고객 정보가 없다(계정·작업 저장이 아직 없다). 그래서 지금은 백업할 것이 없다 — 계정을 만들면 백업을 함께 만든다.

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
