"""브라우저가 보낸 WAV(16kHz, 16비트 PCM)를 숫자 배열로 바꾼다. 파일로 쓰지 않고 메모리에서만 다룬다."""

from __future__ import annotations

import io
import wave

import numpy as np

SAMPLE_RATE = 16000


class AudioError(ValueError):
    """받은 소리를 읽을 수 없을 때"""


def parse_wav(data: bytes) -> np.ndarray:
    """16kHz 16비트 PCM WAV → -1~1 사이 float32 한 채널. 여러 채널이면 평균을 낸다."""
    try:
        with wave.open(io.BytesIO(data), "rb") as reader:
            channels = reader.getnchannels()
            width = reader.getsampwidth()
            rate = reader.getframerate()
            frames = reader.readframes(reader.getnframes())
    except (wave.Error, EOFError) as error:
        raise AudioError(f"not a WAV file: {error}") from error
    if width != 2:
        raise AudioError("only 16-bit PCM is accepted")
    if rate != SAMPLE_RATE:
        raise AudioError(f"sample rate must be {SAMPLE_RATE}, got {rate}")
    samples = np.frombuffer(frames, dtype="<i2").astype(np.float32) / 32768.0
    if channels > 1:
        samples = samples.reshape(-1, channels).mean(axis=1)
    if samples.size == 0:
        raise AudioError("empty audio")
    return samples
