"""Fact-checking module for Certifyi Sentinel.

Extracts factual claims from LLM responses and verifies them
using configurable backends (internal heuristics or external APIs).
"""

from __future__ import annotations

import logging
import re
import time
from typing import List, Optional

import httpx

from sentinel.config import FactCheckConfig
from sentinel.models import (
    Claim,
    ClaimResult,
    FactCheckResult,
    FactCheckVerdict,
)

logger = logging.getLogger(__name__)


class ClaimExtractor:
    """Extract factual claims from text."""

    _claim_indicators = [
        r"(?:is|are|was|were|has|have|had)\s+",
        r"\b(?:according to|studies show|research indicates)\b",
        r"\b\d{4}\b",  # years often indicate factual statements
    ]

    def extract(self, text: str) -> List[Claim]:
        """Extract potential factual claims from text."""
        sentences = re.split(r"(?<=[.!?])\s+", text.strip())
        claims: List[Claim] = []
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence or len(sentence) < 20:
                continue
            if self._looks_factual(sentence):
                claims.append(Claim(text=sentence, source_span=sentence))
        return claims

    def _looks_factual(self, sentence: str) -> bool:
        """Heuristic: does the sentence appear to state a fact?"""
        for pattern in self._claim_indicators:
            if re.search(pattern, sentence, re.IGNORECASE):
                return True
        return False


class InternalVerifier:
    """Simple internal claim verifier (placeholder for ML models)."""

    async def verify(self, claim: Claim) -> ClaimResult:
        """Return an UNCERTAIN verdict (no real verification)."""
        return ClaimResult(
            claim_id=claim.claim_id,
            verdict=FactCheckVerdict.UNCERTAIN,
            confidence=0.5,
            evidence=["Internal verifier: no external data available"],
            sources=[],
        )


class ExternalVerifier:
    """Verify claims via an external fact-checking API."""

    def __init__(self, api_url: str, api_key: str) -> None:
        self._api_url = api_url
        self._api_key = api_key
        self._client = httpx.AsyncClient(timeout=15)

    async def verify(self, claim: Claim) -> ClaimResult:
        """Call external API to verify a claim."""
        try:
            resp = await self._client.post(
                self._api_url,
                json={"claim": claim.text},
                headers={"Authorization": f"Bearer {self._api_key}"},
            )
            resp.raise_for_status()
            data = resp.json()
            return ClaimResult(
                claim_id=claim.claim_id,
                verdict=FactCheckVerdict(data.get("verdict", "uncertain")),
                confidence=data.get("confidence", 0.0),
                evidence=data.get("evidence", []),
                sources=data.get("sources", []),
            )
        except Exception as exc:
            logger.warning("External fact-check failed: %s", exc)
            return ClaimResult(
                claim_id=claim.claim_id,
                verdict=FactCheckVerdict.UNCERTAIN,
                confidence=0.0,
                evidence=[f"API error: {exc}"],
                sources=[],
            )

    async def close(self) -> None:
        await self._client.aclose()


class FactChecker:
    """Orchestrates claim extraction and verification."""

    def __init__(self, config: FactCheckConfig) -> None:
        self._config = config
        self._extractor = ClaimExtractor()
        if config.provider == "external" and config.external_api_url:
            self._verifier = ExternalVerifier(
                config.external_api_url, config.external_api_key
            )
        else:
            self._verifier = InternalVerifier()

    async def check(self, text: str) -> FactCheckResult:
        """Extract claims and verify them."""
        if not self._config.enabled or not text.strip():
            return FactCheckResult()

        start = time.time()
        claims = self._extractor.extract(text)
        claims = claims[: self._config.max_claims_per_request]

        results: List[ClaimResult] = []
        for claim in claims:
            result = await self._verifier.verify(claim)
            results.append(result)

        overall = self._compute_overall_score(results)
        return FactCheckResult(
            claims=results,
            overall_score=overall,
            check_ms=(time.time() - start) * 1000,
        )

    @staticmethod
    def _compute_overall_score(results: List[ClaimResult]) -> float:
        """Average confidence of supported claims."""
        if not results:
            return 1.0
        supported = [
            r.confidence
            for r in results
            if r.verdict == FactCheckVerdict.SUPPORTED
        ]
        if not supported:
            return 0.5
        return sum(supported) / len(supported)
