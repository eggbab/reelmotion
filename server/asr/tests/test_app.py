import io
import threading
import time
import wave

import numpy as np
from starlette.testclient import TestClient

from reelmotion_asr.app import Settings, create_app
from reelmotion_asr.engine import Token, Transcript, language_code


def wav_bytes(seconds: float = 1.0, rate: int = 16000, channels: int = 1, width: int = 2) -> bytes:
    frames = int(seconds * rate)
    data = (np.sin(np.linspace(0, 200, frames * channels)) * 8000).astype("<i2").tobytes()
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as writer:
        writer.setnchannels(channels)
        writer.setsampwidth(width)
        writer.setframerate(rate)
        writer.writeframes(data[: frames * channels * width])
    return buffer.getvalue()


class FakeEngine:
    name = "fake"
    device = "cpu"

    def __init__(self, delay: float = 0.0, fail_load: bool = False) -> None:
        self.calls: list[tuple[int, str | None]] = []
        self.delay = delay
        self.fail_load = fail_load

    def load(self) -> None:
        if self.fail_load:
            raise RuntimeError("no model")

    def transcribe(self, samples, language):
        self.calls.append((samples.size, language))
        time.sleep(self.delay)
        return Transcript(language=language or "en", text="Hello world.", tokens=[Token("Hello", 0.1, 0.4), Token("world", 0.5, 0.9)])


def client(engine=None, settings=Settings()) -> TestClient:
    return TestClient(create_app(engine or FakeEngine(), settings, load_in_background=False))


def test_health_reports_ready_model_and_limit():
    response = client().get("/api/asr/health")
    assert response.status_code == 200
    assert response.json()["ready"] is True
    assert response.json()["maxSeconds"] == 600.0


def test_health_is_503_when_model_failed_to_load():
    response = client(FakeEngine(fail_load=True)).get("/api/asr/health")
    assert response.status_code == 503
    assert response.json()["error"] == "no model"


def test_transcribe_returns_text_tokens_and_duration():
    engine = FakeEngine()
    response = client(engine).post("/api/asr/transcribe?lang=ko", content=wav_bytes(2), headers={"content-type": "audio/wav"})
    assert response.status_code == 200
    body = response.json()
    assert body["text"] == "Hello world."
    assert body["tokens"] == [{"text": "Hello", "start": 0.1, "end": 0.4}, {"text": "world", "start": 0.5, "end": 0.9}]
    assert body["duration"] == 2.0
    assert engine.calls == [(32000, "ko")]


def test_auto_language_passes_none_to_the_model():
    engine = FakeEngine()
    client(engine).post("/api/asr/transcribe", content=wav_bytes())
    assert engine.calls[0][1] is None


def test_stereo_is_mixed_to_one_channel():
    engine = FakeEngine()
    client(engine).post("/api/asr/transcribe", content=wav_bytes(1, channels=2))
    assert engine.calls[0][0] == 16000


def test_rejects_bad_language_wrong_rate_and_non_wav():
    c = client()
    assert c.post("/api/asr/transcribe?lang=fr", content=wav_bytes()).json()["error"] == "bad_language"
    assert c.post("/api/asr/transcribe", content=wav_bytes(rate=44100)).json()["error"] == "bad_audio"
    assert c.post("/api/asr/transcribe", content=b"not audio").status_code == 400


def test_rejects_audio_longer_than_the_limit():
    response = client(settings=Settings(max_seconds=1)).post("/api/asr/transcribe", content=wav_bytes(3))
    assert response.status_code == 413
    assert response.json()["error"] == "too_long"


def test_busy_when_too_many_are_waiting():
    engine = FakeEngine(delay=0.5)
    c = client(engine, Settings(max_waiting=1))
    results: list[int] = []
    first = threading.Thread(target=lambda: results.append(c.post("/api/asr/transcribe", content=wav_bytes()).status_code))
    first.start()
    time.sleep(0.15)
    second = c.post("/api/asr/transcribe", content=wav_bytes())
    first.join()
    assert second.status_code == 503
    assert second.json()["error"] == "busy"
    assert results == [200]


def test_language_code_reads_qwen_language_names():
    assert language_code("Korean") == "ko"
    assert language_code("Japanese,English") == "ja"
    assert language_code("French") == ""
