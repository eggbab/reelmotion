# syntax=docker/dockerfile:1
# ReelMotion 받아쓰기 서버(Qwen3-ASR). 소리만 받고 저장하지 않는다.
#
#   그래픽 카드 없이:      docker build -t reelmotion-asr .
#   GTX 10 시리즈(Pascal): docker build --build-arg TORCH_VARIANT=cu126 -t reelmotion-asr:gpu .
#
# PyTorch 2.8 부터 CUDA 12.8 판은 Pascal(GTX 1070 Ti 등)을 뺐다. CUDA 12.6 판은 2.14 가 마지막이라 2.14.1 + cu126 에 고정한다.
# 모델(약 3.5GB)은 처음 띄울 때 /models 로 내려받는다 — 볼륨을 붙여 두면 다시 받지 않는다.
FROM python:3.12-slim

ARG TORCH_VARIANT=cpu
ARG TORCH_VERSION=2.14.1

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/models \
    ASR_HOST=0.0.0.0 \
    ASR_PORT=8008

WORKDIR /app
# 회사망처럼 HTTPS 를 다시 서명하는 프록시 뒤에서 빌드할 때만 인증서를 비밀로 넘긴다(보통은 필요 없다):
#   docker build --secret id=extra_ca,src=/path/to/ca.crt ...
RUN --mount=type=secret,id=extra_ca,required=false \
    if [ -s /run/secrets/extra_ca ]; then export PIP_CERT=/run/secrets/extra_ca; fi && \
    pip install "torch==${TORCH_VERSION}" --index-url "https://download.pytorch.org/whl/${TORCH_VARIANT}"
COPY requirements.txt .
RUN --mount=type=secret,id=extra_ca,required=false \
    if [ -s /run/secrets/extra_ca ]; then export PIP_CERT=/run/secrets/extra_ca; fi && \
    pip install -r requirements.txt
COPY reelmotion_asr ./reelmotion_asr

RUN useradd --create-home --uid 10001 app && mkdir -p /models && chown app /models
USER app
VOLUME ["/models"]
EXPOSE 8008
# 모델을 올리는 동안(처음엔 내려받기까지 몇 분)은 503 이라 넉넉히 기다린다.
HEALTHCHECK --interval=30s --timeout=5s --start-period=600s \
  CMD python -c "import sys, urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8008/api/asr/health', timeout=4).status == 200 else 1)"
CMD ["python", "-m", "reelmotion_asr"]
