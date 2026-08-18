# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Retrieval-augmented compliance evaluation — the "AI Brain".

Two halves that meet at ``policy_knowledge_base``:

* :mod:`sentinel.services.embedding_service` — ingest. Chunks policy text,
  embeds each chunk, stores it.
* :mod:`sentinel.services.compliance_evaluator` — inference. Embeds raw
  integration evidence, retrieves the policy passages nearest to it, and asks
  an LLM whether the evidence satisfies a control.

Both connect with ``SENTINEL_DATABASE_URL`` (service role), so **RLS does not
apply** and every statement is explicitly org-scoped. That is the same posture
as ``sentinel/integrations/worker.py`` and the same reason: the org boundary
is derived from a row the caller already owns, never from request input.
"""

from sentinel.services.compliance_evaluator import (
    ComplianceEvaluator,
    ComplianceVerdict,
    EvaluationOutcome,
)
from sentinel.services.embedding_service import EmbeddingService, PolicyChunk

__all__ = [
    "ComplianceEvaluator",
    "ComplianceVerdict",
    "EvaluationOutcome",
    "EmbeddingService",
    "PolicyChunk",
]
