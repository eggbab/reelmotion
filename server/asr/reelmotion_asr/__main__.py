"""`python -m reelmotion_asr` 로 받아쓰기 서버를 띄운다. 설정은 환경 변수(ASR_*)로."""

import logging
import os

import uvicorn

from .app import app_from_env

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
uvicorn.run(app_from_env(), host=os.environ.get("ASR_HOST", "127.0.0.1"), port=int(os.environ.get("ASR_PORT", "8008")), log_level="info")
