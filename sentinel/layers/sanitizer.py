"""Input sanitizer: PII redaction and prompt-injection detection.

Two-mode operation:
- FULL: presidio + spaCy NLP pipeline for PII detection
- FALLBACK: regex-based detection when spaCy is unavailable

Injection detection via cosine similarity against known seed embeddings.
All CPU-bound work runs in a ThreadPoolExecutor to avoid blocking.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
from pathlib import Path
from typing import TYPE_CHECKING

import numpy as np
from cryptography.fernet import Fernet

from sentinel.models import SanitizationResult

if TYPE_CHECKING:
    from sentinel.config import SentinelSettings
    from sentinel.models import TenantConfig

logger = logging.getLogger(__name__)

_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="sanitizer")

# --- Regex fallback patterns for PII detection ---
_REGEX_PATTERNS: dict[str, re.Pattern[str]] = {
    "EMAIL_ADDRESS": re.compile(
        r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
    ),
    "PHONE_NUMBER": re.compile(
        r"\b(\+?1?\s?)?((\(?\d{3}\)?[\s.-]?)(\d{3}[\s.-]\d{4}))\b"
    ),
    "US_SSN": re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
    "CREDIT_CARD": re.compile(r"\b(?:\d[ -]?){13,16}\b"),
    "IP_ADDRESS": re.compile(
        r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b"
    ),
}

# --- Module-level state (loaded once at startup) ---
_spacy_available = False
_analyzer_engine: object | None = None
_injection_embeddings: np.ndarray | None = None
_injection_keywords: list[list[str]] = []
_embedding_model: object | None = None


def _load_spacy(model_name: str) -> bool:
    """Try loading spaCy + presidio; return True on success."""
    global _spacy_available, _analyzer_engine  # noqa: PLW0603
    try:
        from presidio_analyzer import AnalyzerEngine  # type: ignore[import-untyped]
        from presidio_analyzer.nlp_engine import (
            NlpEngineProvider,  # type: ignore[import-untyped]
        )

        provider = NlpEngineProvider(
            nlp_configuration={
                "nlp_engine_name": "spacy",
                "models": [{"lang_code": "en", "model_name": model_name}],
            }
        )
        nlp_engine = provider.create_engine()
        _analyzer_engine = AnalyzerEngine(nlp_engine=nlp_engine)
        _spacy_available = True
        logger.info("Sanitizer: spaCy + presidio loaded (%s)", model_name)
        return True
    except (ImportError, OSError) as exc:
        logger.warning(
            "spaCy model '%s' not found (%s). PII detection running "
            "in regex fallback mode. Run: python -m spacy download %s",
            model_name,
            exc,
            model_name,
        )
        return False


def _load_injection_seeds(embedding_model_name: str) -> None:
    """Pre-compute injection seed embeddings at startup."""
    global _injection_embeddings, _injection_keywords  # noqa: PLW0603
    global _embedding_model  # noqa: PLW0603

    seeds_path = Path(__file__).resolve().parent.parent.parent / "data" / "injection_seeds.jsonl"
    if not seeds_path.exists():
        logger.warning("Injection seeds not found at %s", seeds_path)
        return

    texts: list[str] = []
    keywords: list[list[str]] = []
    with seeds_path.open() as fh:
        for line in fh:
            row = json.loads(line)
            texts.append(row.get("text", ""))
            keywords.append(row.get("keywords", []))
    _injection_keywords = keywords

    try:
        from sentence_transformers import SentenceTransformer

        _embedding_model = SentenceTransformer(embedding_model_name)
        _injection_embeddings = _embedding_model.encode(
            texts, convert_to_numpy=True, normalize_embeddings=True,
        ).astype(np.float32)
        logger.info(
            "Loaded %d injection seeds with embeddings", len(texts),
        )
    except ImportError:
        logger.warning(
            "sentence-transformers not available. "
            "Injection detection using keyword fallback."
        )


def startup(settings: SentinelSettings) -> None:
    """Initialise sanitizer at application startup."""
    _load_spacy(settings.spacy_model)
    _load_injection_seeds(settings.embedding_model)


# --- Core logic (sync, runs in executor) ---


def _detect_pii_regex(
    text: str, entity_types: list[str],
) -> list[tuple[str, int, int]]:
    """Regex-based PII detection fallback."""
    results: list[tuple[str, int, int]] = []
    for etype in entity_types:
        pattern = _REGEX_PATTERNS.get(etype)
        if pattern is None:
            continue
        for match in pattern.finditer(text):
            results.append((etype, match.start(), match.end()))
    return results


def _detect_pii_presidio(
    text: str, entity_types: list[str],
) -> list[tuple[str, int, int]]:
    """Presidio-based PII detection (full mode)."""
    if _analyzer_engine is None:
        return _detect_pii_regex(text, entity_types)
    results_raw = _analyzer_engine.analyze(  # type: ignore[union-attr]
        text=text, entities=entity_types, language="en",
    )
    return [
        (r.entity_type, r.start, r.end) for r in results_raw  # type: ignore[union-attr]
    ]


def _compute_injection_score(text: str) -> float:
    """Cosine similarity against injection seed embeddings."""
    if _injection_embeddings is not None and _embedding_model is not None:
        query_emb = _embedding_model.encode(  # type: ignore[union-attr]
            [text], convert_to_numpy=True, normalize_embeddings=True,
        ).astype(np.float32)
        sims = np.dot(_injection_embeddings, query_emb.T).flatten()
        return float(np.max(sims))

    # Keyword fallback
    text_lower = text.lower()
    max_score = 0.0
    for kw_list in _injection_keywords:
        hits = sum(1 for kw in kw_list if kw.lower() in text_lower)
        if kw_list:
            max_score = max(max_score, hits / len(kw_list))
    return max_score


def _redact_text(
    text: str,
    detections: list[tuple[str, int, int]],
    tenant_key: bytes,
) -> tuple[str, list[str], bytes | None]:
    """Replace PII with typed tokens and encrypt the mapping."""
    if not detections:
        return text, [], None

    sorted_dets = sorted(detections, key=lambda d: d[1], reverse=True)
    counters: dict[str, int] = {}
    redaction_map: dict[str, str] = {}
    entity_types_found: list[str] = []

    result = text
    for etype, start, end in sorted_dets:
        counters[etype] = counters.get(etype, 0) + 1
        token = f"[REDACTED_{etype}_{counters[etype]}]"
        original = result[start:end]
        redaction_map[token] = original
        result = result[:start] + token + result[end:]
        if etype not in entity_types_found:
            entity_types_found.append(etype)

    fernet = Fernet(tenant_key)
    encrypted = fernet.encrypt(json.dumps(redaction_map).encode())
    return result, entity_types_found, encrypted


def _sanitize_sync(
    text: str,
    tenant_config: TenantConfig,
    tenant_key: bytes,
    injection_threshold: float,
) -> SanitizationResult:
    """Synchronous sanitization (runs in thread executor)."""
    # Injection detection
    injection_score = _compute_injection_score(text)
    if injection_score > injection_threshold:
        return SanitizationResult(
            sanitized_text="",
            blocked=True,
            block_reason=(
                f"Prompt injection detected (score={injection_score:.3f})"
            ),
            injection_score=injection_score,
        )

    # PII detection
    entity_types = tenant_config.pii_entity_types
    if _spacy_available:
        detections = _detect_pii_presidio(text, entity_types)
    else:
        detections = _detect_pii_regex(text, entity_types)

    # Redaction
    sanitized, pii_found, encrypted_map = _redact_text(
        text, detections, tenant_key,
    )

    return SanitizationResult(
        sanitized_text=sanitized,
        blocked=False,
        injection_score=injection_score,
        pii_detected=pii_found,
        redaction_map_encrypted=encrypted_map,
    )


# --- Public async API ---


@lru_cache(maxsize=1)
def _default_tenant_key() -> bytes:
    """Generate a default Fernet key for dev/test."""
    return Fernet.generate_key()


async def sanitize(
    text: str,
    tenant_config: TenantConfig,
    settings: SentinelSettings,
    tenant_key: bytes | None = None,
) -> SanitizationResult:
    """Sanitize a prompt: detect injection, redact PII.

    Runs CPU-bound work in a thread executor to avoid
    blocking the asyncio event loop.
    """
    key = tenant_key or _default_tenant_key()
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        _executor,
        _sanitize_sync,
        text,
        tenant_config,
        key,
        settings.injection_block_threshold,
    )
