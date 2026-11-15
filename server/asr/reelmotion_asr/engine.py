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


def pick_dtype(name: str, device: str):
    """'auto' 이면: CPU 는 bfloat16, 그래픽 카드는 bfloat16 을 지원하면 bfloat16, 아니면(GTX 10 시리즈 등) float32.

    2026-11-15 이 작업 공간의 CPU 에서 잰 값(0.6B 받아쓰기 + 0.6B 정렬, 24초 한국어):
    float32 는 메모리 약 7.3GB · 10.9초, bfloat16 은 약 0.8GB · 7.9초였고 받아쓴 글은 같았다
    (bfloat16 은 모델 파일 그대로라 메모리에 따로 펼치지 않는다).
    """
    import torch

    if name != "auto":
        return getattr(torch, name)
    if device == "cpu":
        return torch.bfloat16
    return torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float32


class QwenEngine:
    """Qwen3-ASR(받아쓰기) + Qwen3-ForcedAligner(낱말 시간). 모두 Apache-2.0.

    정렬 모델은 따로 CPU 에 둘 수 있다(aligner_device="cpu"). 그래픽 카드 메모리가 8GB 인 GTX 1070 Ti 에서는
    두 모델을 float32 로 함께 올리면 빠듯해서, 받아쓰기는 그래픽 카드·정렬은 CPU 로 나눈다(deploy/compose.gpu.yml).
    """

    def __init__(
        self,
        model: str,
        aligner: str,
        device: str = "auto",
        dtype: str = "auto",
        aligner_device: str = "same",
        aligner_dtype: str = "auto",
    ) -> None:
        self.model_name = model
        self.aligner_name = aligner
        self.requested_device = device
        self.dtype_name = dtype
        self.requested_aligner_device = aligner_device
        self.aligner_dtype_name = aligner_dtype
        self.device = "unloaded"
        self.name = model
        self._model = None

    def load(self) -> None:
        import torch
        from qwen_asr import Qwen3ASRModel

        self.device = pick_device(self.requested_device)
        aligner_device = self.device if self.requested_aligner_device == "same" else pick_device(self.requested_aligner_device)
        dtype = pick_dtype(self.dtype_name, self.device)
        aligner_dtype = pick_dtype(self.aligner_dtype_name, aligner_device)
        if "cpu" in (self.device, aligner_device):
            torch.set_num_threads(int(os.environ.get("ASR_THREADS", os.cpu_count() or 4)))
        self._model = Qwen3ASRModel.from_pretrained(
            self.model_name,
            dtype=dtype,
            device_map=self.device,
            max_inference_batch_size=1,
            max_new_tokens=int(os.environ.get("ASR_MAX_NEW_TOKENS", "1024")),
            forced_aligner=self.aligner_name,
            forced_aligner_kwargs=dict(dtype=aligner_dtype, device_map=aligner_device),
        )
        if aligner_device != self.device:
            self.device = f"{self.device} + aligner {aligner_device}"
        log.info("loaded %s (%s) + %s (%s) on %s", self.model_name, dtype, self.aligner_name, aligner_dtype, self.device)

    def transcribe(self, samples: np.ndarray, language: Optional[str]) -> Transcript:
        if self._model is None:
            raise RuntimeError("model is not loaded")
        name = LANGUAGE_NAMES.get(language or "")
        result = self._model.transcribe(audio=(samples, SAMPLE_RATE), language=name, return_time_stamps=True)[0]
        items = list(result.time_stamps or [])
        tokens = [Token(text=str(it.text), start=float(it.start_time), end=float(it.end_time)) for it in items]
        return Transcript(language=language or language_code(result.language), text=result.text, tokens=tokens)
