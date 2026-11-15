"""Qwen3-ASR 와 정렬 모델(Qwen3-ForcedAligner)을 불러 받아쓰기를 한다."""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Optional, Protocol

import numpy as np

from .audio import SAMPLE_RATE

log = logging.getLogger("reelmotion_asr")

# 화면 언어 코드 ↔ Qwen3-ASR 의 언어 이름
LANGUAGE_NAMES = {"en": "English", "ko": "Korean", "ja": "Japanese"}
LANGUAGE_CODES = {name.lower(): code for code, name in LANGUAGE_NAMES.items()}


@dataclass(frozen=True)
class Token:
    text: str
    start: float
    end: float


@dataclass(frozen=True)
class Transcript:
    language: str  # 'en' | 'ko' | 'ja' | '' (모름)
    text: str
    tokens: list[Token]


class Engine(Protocol):
    name: str
    device: str

    def load(self) -> None: ...

    def transcribe(self, samples: np.ndarray, language: Optional[str]) -> Transcript: ...


def language_code(name: str) -> str:
    """'Korean' 또는 'Korean,English' → 'ko'. 모르는 언어면 빈 글."""
    first = (name or "").split(",")[0].strip().lower()
    return LANGUAGE_CODES.get(first, "")


def pick_device(requested: str) -> str:
    """'auto' 이면 쓸 수 있는 그래픽 카드를 쓰고, 없거나 이 PyTorch 가 그 카드를 못 쓰면 CPU."""
    import torch

    if requested != "auto":
        return requested
    if not torch.cuda.is_available():
        return "cpu"
    try:
        # GTX 10 시리즈(Pascal) 같은 오래된 카드는 PyTorch 판에 따라 계산을 못 할 수 있다. 작은 계산으로 미리 확인한다.
        (torch.ones(8, device="cuda") * 2).sum().item()
        return "cuda:0"
    except Exception as error:  # noqa: BLE001 — 어떤 실패든 CPU 로 물러난다
        log.warning("CUDA is present but unusable (%s); falling back to CPU", error)
        return "cpu"


class QwenEngine:
    """Qwen3-ASR(받아쓰기) + Qwen3-ForcedAligner(낱말 시간). 모두 Apache-2.0."""

    def __init__(self, model: str, aligner: str, device: str = "auto", dtype: str = "float32") -> None:
        self.model_name = model
        self.aligner_name = aligner
        self.requested_device = device
        self.dtype_name = dtype
        self.device = "unloaded"
        self.name = model
        self._model = None

    def load(self) -> None:
        import torch
        from qwen_asr import Qwen3ASRModel

        self.device = pick_device(self.requested_device)
        # GTX 1070 Ti 같은 Pascal 카드는 반정밀도 계산이 매우 느려 float32 가 기본이다.
        dtype = getattr(torch, self.dtype_name)
        if self.device == "cpu":
            torch.set_num_threads(int(os.environ.get("ASR_THREADS", os.cpu_count() or 4)))
        self._model = Qwen3ASRModel.from_pretrained(
            self.model_name,
            dtype=dtype,
            device_map=self.device,
            max_inference_batch_size=1,
            max_new_tokens=int(os.environ.get("ASR_MAX_NEW_TOKENS", "1024")),
            forced_aligner=self.aligner_name,
            forced_aligner_kwargs=dict(dtype=dtype, device_map=self.device),
        )
        log.info("loaded %s + %s on %s (%s)", self.model_name, self.aligner_name, self.device, self.dtype_name)

    def transcribe(self, samples: np.ndarray, language: Optional[str]) -> Transcript:
        if self._model is None:
            raise RuntimeError("model is not loaded")
        name = LANGUAGE_NAMES.get(language or "")
        result = self._model.transcribe(audio=(samples, SAMPLE_RATE), language=name, return_time_stamps=True)[0]
        items = list(result.time_stamps or [])
        tokens = [Token(text=str(it.text), start=float(it.start_time), end=float(it.end_time)) for it in items]
        return Transcript(language=language or language_code(result.language), text=result.text, tokens=tokens)
