"""HTTP 입구. 브라우저는 영상이 아니라 소리(WAV)만 보낸다. 받은 소리는 메모리에서 받아 적은 뒤 버린다."""

from __future__ import annotations

import logging
import threading
from dataclasses import asdict, dataclass
from typing import Callable

from starlette.applications import Starlette
from starlette.concurrency import run_in_threadpool
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Route

from .audio import SAMPLE_RATE, AudioError, parse_wav
from .engine import LANGUAGE_NAMES, Engine

log = logging.getLogger("reelmotion_asr")


@dataclass(frozen=True)
class Settings:
    #: 한 번에 받는 소리의 최대 길이(초). 16kHz 16비트면 10분이 약 19MB.
    max_seconds: float = 600.0
    #: 앞 사람이 받아 적는 동안 기다릴 수 있는 요청 수. 넘으면 바로 「바쁨」을 돌려준다.
    max_waiting: int = 4

    @property
    def max_bytes(self) -> int:
        return int(self.max_seconds * SAMPLE_RATE * 2) + 4096


def create_app(engine: Engine, settings: Settings = Settings(), load_in_background: bool = True) -> Starlette:
    state = {"ready": False, "error": ""}
    gate = threading.Lock()  # 그래픽 카드 하나로 한 번에 하나씩
    waiting = {"count": 0}
    counter_lock = threading.Lock()

    def load() -> None:
        try:
            engine.load()
            state["ready"] = True
        except Exception as error:  # noqa: BLE001
            log.exception("model failed to load")
            state["error"] = str(error)

    async def health(_: Request) -> JSONResponse:
        return JSONResponse(
            {
                "ready": state["ready"],
                "engine": "qwen3-asr",
                "model": engine.name,
                "device": engine.device,
                "maxSeconds": settings.max_seconds,
                "error": state["error"] or None,
            },
            status_code=200 if state["ready"] else 503,
        )

    async def transcribe(request: Request) -> JSONResponse:
        if not state["ready"]:
            return JSONResponse({"error": "not_ready"}, status_code=503)
        language = request.query_params.get("lang", "auto")
        if language != "auto" and language not in LANGUAGE_NAMES:
            return JSONResponse({"error": "bad_language"}, status_code=400)
        length = int(request.headers.get("content-length") or 0)
        if length > settings.max_bytes:
            return JSONResponse({"error": "too_long", "maxSeconds": settings.max_seconds}, status_code=413)
        body = await request.body()
        if len(body) > settings.max_bytes:
            return JSONResponse({"error": "too_long", "maxSeconds": settings.max_seconds}, status_code=413)
        try:
            samples = parse_wav(body)
        except AudioError as error:
            return JSONResponse({"error": "bad_audio", "detail": str(error)}, status_code=400)
        finally:
            del body
        duration = samples.size / SAMPLE_RATE
        if duration > settings.max_seconds:
            return JSONResponse({"error": "too_long", "maxSeconds": settings.max_seconds}, status_code=413)

        with counter_lock:
            if waiting["count"] >= settings.max_waiting:
                return JSONResponse({"error": "busy"}, status_code=503)
            waiting["count"] += 1

        def run() -> dict:
            with gate:
                result = engine.transcribe(samples, None if language == "auto" else language)
            return {
                "language": result.language,
                "text": result.text,
                "tokens": [asdict(token) for token in result.tokens],
                "duration": round(duration, 3),
                "engine": "qwen3-asr",
            }

        try:
            payload = await run_in_threadpool(run)
        except Exception:  # noqa: BLE001
            log.exception("transcription failed")
            return JSONResponse({"error": "failed"}, status_code=500)
        finally:
            with counter_lock:
                waiting["count"] -= 1
        return JSONResponse(payload)

    app = Starlette(
        routes=[
            Route("/api/asr/health", health, methods=["GET"]),
            Route("/api/asr/transcribe", transcribe, methods=["POST"]),
        ]
    )
    if load_in_background:
        threading.Thread(target=load, name="asr-load", daemon=True).start()
    else:
        load()
    return app


def app_from_env(make_engine: Callable[[], Engine] | None = None) -> Starlette:
    import os

    from .engine import QwenEngine

    engine = (make_engine or (lambda: QwenEngine(
        model=os.environ.get("ASR_MODEL", "Qwen/Qwen3-ASR-0.6B"),
        aligner=os.environ.get("ASR_ALIGNER", "Qwen/Qwen3-ForcedAligner-0.6B"),
        device=os.environ.get("ASR_DEVICE", "auto"),
        dtype=os.environ.get("ASR_DTYPE", "float32"),
    )))()
    settings = Settings(max_seconds=float(os.environ.get("ASR_MAX_SECONDS", "600")), max_waiting=int(os.environ.get("ASR_MAX_WAITING", "4")))
    return create_app(engine, settings)
