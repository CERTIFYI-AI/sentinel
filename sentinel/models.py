

"""Domain models for Certifyi Sentinel.

Every data structure that crosses a boundary (API, DB, WebSocket)
is defined here as a Pydantic v2 BaseModel with full validation.
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field, model_validator


# ── Enums ─────────────────────────────────────────


class InterventionLevel(enum.IntEnum):
    """Escalation levels in the circuit-breaker cascade."""

    NONE = 0
    REGENERATE = 1
    UPGRADE = 2
    HITL = 3


_INTERVENTION_NAME_ALIASES: dict[str, "InterventionLevel"] = {
    "NONE": InterventionLevel.NONE,
    "REGENERATE": InterventionLevel.REGENERATE,
    "UPGRADE": InterventionLevel.UPGRADE,
    "HITL": InterventionLevel.HITL,
    "BLOCKED": InterventionLevel.HITL,  # no such member; closest real one
    # Legacy tier-string format previously used across
    # sentinel/compliance/frameworks/*.py (eu_ai_act, gdpr, iso42001,
    # nist_ai_rmf, hipaa, oecd_principles) before the 2026-07 consolidation.
    "L0": InterventionLevel.NONE,
    "L1": InterventionLevel.REGENERATE,
    "L2": InterventionLevel.UPGRADE,
    "L3": InterventionLevel.HITL,
}


def normalize_intervention_level(raw: Any) -> "InterventionLevel | None":
    """Coerce a raw intervention-level value to InterventionLevel.

    This is the single source of truth for interpreting intervention
    levels across the codebase. Historically three different shapes were
    used interchangeably and none of the comparisons actually matched:
    the real int (0-3) stored in audit_log / AuditEntryInput, a legacy
    string enum-name format ("NONE"/"REGENERATE"/"UPGRADE"/"HITL"), and a
    "L0".."L3" tier-string format used in sentinel/compliance/frameworks/.
    Accepts all of them; returns None if the value can't be interpreted
    so callers can report PENDING/unknown instead of guessing.
    """
    if isinstance(raw, InterventionLevel):
        return raw
    if isinstance(raw, bool):
        return None  # bool is an int subclass in Python; not a valid level
    if isinstance(raw, int):
        try:
            return InterventionLevel(raw)
        except ValueError:
            return None
    if isinstance(raw, str):
        name = raw.strip().upper()
        if name in _INTERVENTION_NAME_ALIASES:
            return _INTERVENTION_NAME_ALIASES[name]
        try:
            return InterventionLevel(int(name))
        except (TypeError, ValueError):
            return None
    return None


# ── Sanitizer ─────────────────────────────────────


class SanitizationResult(BaseModel):
    """Output of the sanitizer layer."""

    model_config = ConfigDict(frozen=True)

    sanitized_text: str = Field(description="Prompt after PII redaction")
    blocked: bool = Field(default=False, description="True if blocked")
    block_reason: str | None = Field(default=None)
    injection_score: float = Field(
        default=0.0, ge=0.0, le=1.0,
        description="Cosine similarity to known injection seeds",
    )
    pii_detected: list[str] = Field(
        default_factory=list,
        description="Entity types found, e.g. ['EMAIL_ADDRESS']",
    )
    redaction_map_encrypted: bytes | None = Field(
        default=None, description="Fernet-encrypted {token: original}",
    )


# ── Verifier ──────────────────────────────────────


class ClaimScore(BaseModel):
    """NLI score for a single factual claim."""

    claim: str
    label: str = Field(description="ENTAILMENT | CONTRADICTION | NEUTRAL")
    confidence: float = Field(ge=0.0, le=1.0)
    sources: list[str] = Field(
        default_factory=list, description="doc_ids used as evidence",
    )


class VerificationResult(BaseModel):
    """Output of the verifier layer."""

    trust_score: float = Field(default=0.0, ge=0.0, le=1.0)
    claims: list[ClaimScore] = Field(default_factory=list)
    rag_entailment_score: float = Field(default=0.5, ge=0.0, le=1.0)
    cross_check_agreement: float = Field(default=0.75, ge=0.0, le=1.0)
    semantic_drift_score: float = Field(default=0.75, ge=0.0, le=1.0)
    cross_check_triggered: bool = Field(default=False)
    golden_source_empty: bool = Field(default=False)


# ── Circuit Breaker ───────────────────────────────


class CircuitBreakerResult(BaseModel):
    """Decision from the circuit-breaker cascade."""

    intervention: InterventionLevel | None = None
    final_response: str = ""
    trust_score: float = Field(default=0.0, ge=0.0, le=1.0)
    attempts: int = Field(default=1, ge=1)
    cost_usd: float = Field(default=0.0, ge=0.0)
    provider_used: str = Field(default="")
    intervention_level: InterventionLevel | None = None
    final_trust_score: float = Field(default=0.0, ge=0.0, le=1.0)

    @model_validator(mode="after")
    def sync_cb_fields(self) -> "CircuitBreakerResult":
        if self.intervention_level is None:
            self.intervention_level = self.intervention
        if self.final_trust_score == 0.0 and self.trust_score > 0.0:
            self.final_trust_score = self.trust_score
        return self


# ── Audit ─────────────────────────────────────────


class AuditEntry(BaseModel):
    """A single immutable row in the audit hash chain."""

    entry_id: UUID = Field(default_factory=uuid4)
    tenant_id: str
    request_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    prompt_hash: str = Field(description="SHA-256 of original prompt")
    response_hash: str = Field(description="SHA-256 of delivered response")
    trust_score: float = Field(default=0.0, ge=0.0, le=1.0)
    intervention_level: int
    cost_usd: float = Field(default=0.0, ge=0.0)
    latency_ms: float = Field(default=0.0, ge=0.0)
    prev_hash: str
    entry_hash: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class IntegrityReport(BaseModel):
    """Result of an audit-chain integrity verification."""

    model_config = ConfigDict(populate_by_name=True)

    tenant_id: str = ""
    intact: bool = False
    is_intact: bool = Field(default=False)
    total_entries: int = 0
    entries_checked: int = 0
    broken_at: list[str] = Field(default_factory=list)
    checked_at: datetime = Field(default_factory=datetime.utcnow)

    @model_validator(mode="after")
    def sync_fields(self) -> "IntegrityReport":
        self.is_intact = self.intact
        if self.total_entries and not self.entries_checked:
            self.entries_checked = self.total_entries
        if self.entries_checked and not self.total_entries:
            self.total_entries = self.entries_checked
        return self


# ── HITL ──────────────────────────────────────────


class HitlJob(BaseModel):
    """A job queued for human-in-the-loop review."""

    job_id: str = Field(default_factory=lambda: str(uuid4()))
    tenant_id: str
    request_id: str
    prompt_hash: str
    responses: list[str] = Field(default_factory=list)
    scores: list[float] = Field(default_factory=list)
    status: str = Field(default="pending")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class HitlReview(BaseModel):
    """Human reviewer submission for a HITL job."""

    approved_response: str
    reviewer_note: str = ""
    reviewer_id: str = ""


# ── Metrics & Health ──────────────────────────────


class TrustMetricsSummary(BaseModel):
    """Aggregated metrics pushed over WebSocket."""

    avg_trust_score: float = 0.0
    requests_per_minute: float = 0.0
    intervention_rate: float = 0.0
    error_rate: float = 0.0
    p50_latency_ms: float = 0.0
    p95_latency_ms: float = 0.0
    active_providers: int = 0


class ProviderHealth(BaseModel):
    """Circuit-breaker state for one provider."""

    provider_id: str
    state: str = Field(description="CLOSED | OPEN | HALF_OPEN")
    failure_count: int = 0
    last_failure_at: datetime | None = None
    success_rate: float = Field(default=1.0, ge=0.0, le=1.0)


class CostReport(BaseModel):
    """Accumulated cost-per-truth metrics."""

    total_cost_usd: float = 0.0
    total_requests: int = 0
    avg_cost_per_request: float = 0.0
    cost_by_intervention: dict[str, float] = Field(
        default_factory=dict,
    )


# ── WebSocket ─────────────────────────────────────


class WebSocketMessage(BaseModel):
    """Discriminated message for WebSocket channels."""

    type: str = Field(description="metrics | audit | error")
    payload: dict[str, Any] = Field(default_factory=dict)


# ── Pipeline ──────────────────────────────────────


class PipelineRequest(BaseModel):
    """Internal representation of a chat completion request."""

    model: str = "gpt-4o"
    messages: list[dict[str, str]]
    stream: bool = False
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int | None = None


class PipelineResponse(BaseModel):
    """Internal representation of a processed response."""

    content: str
    model: str
    trust_score: float = Field(default=0.0, ge=0.0, le=1.0)
    intervention: InterventionLevel | None = None
    cost_usd: float = 0.0
    latency_ms: float = 0.0


# ── Golden Source ─────────────────────────────────


class GoldenSourceDocument(BaseModel):
    """A document to be ingested into the vector store."""

    doc_id: str
    source_url: str | None = None
    content: str = Field(min_length=1)
    chunk_size: int = Field(default=512, ge=64)


# ── Tenant ────────────────────────────────────────


class TenantConfig(BaseModel):
    """Per-tenant configuration overrides."""

    tenant_id: str
    trust_score_block_threshold: float = Field(
        default=0.85, ge=0.0, le=1.0,
    )
    injection_block_threshold: float = Field(
        default=0.78, ge=0.0, le=1.0,
    )
    primary_model: str = "gpt-4o"
    fallback_model: str = "gpt-4o"
    pii_entity_types: list[str] = Field(
        default_factory=lambda: [
            "EMAIL_ADDRESS", "PHONE_NUMBER", "US_SSN",
            "CREDIT_CARD", "IP_ADDRESS",
        ],
    )
    custom_pii_patterns: list[str] = Field(default_factory=list)
    hitl_canned_response: str | None = None


class APIKeyPayload(BaseModel):
    """JWT claims for API authentication."""

    tenant_id: str
    key_id: str
    scopes: list[str] = Field(default_factory=lambda: ["read", "write"])
    


# -- LLM Types (used by proxy, rules, sdk, plugins) --------


class LLMMessage(BaseModel):
    """A single message in a chat conversation."""

    role: str = Field(description="system | user | assistant")
    content: str


class LLMRequest(BaseModel):
    """Incoming LLM request through the proxy."""

    model: str = "gpt-4o"
    messages: list[LLMMessage]
    stream: bool = False
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int | None = None
    tenant_id: str = ""
    request_id: str = Field(default_factory=lambda: str(uuid4()))
    provider: str = ""


class LLMResponse(BaseModel):
    """Response from an LLM provider."""

    content: str
    model: str
    cost_usd: float = Field(default=0.0, ge=0.0)
    latency_ms: float = Field(default=0.0, ge=0.0)
    provider_id: str = ""


# -- Policy Types (used by rules, proxy) --------------------


class Severity(enum.StrEnum):
    """Severity of a policy violation."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class PolicyAction(enum.StrEnum):
    """Action to take when a policy is violated."""

    ALLOW = "allow"
    WARN = "warn"
    BLOCK = "block"
    REVIEW = "review"
    FLAG = "flag"
    MODIFY = "modify"


class PolicyViolation(BaseModel):
    """A single policy violation."""

    rule_id: str
    description: str
    severity: Severity = Severity.MEDIUM
    action: PolicyAction = PolicyAction.WARN
    details: dict | None = None


class PolicyResult(BaseModel):
    """Result of policy evaluation."""

    allowed: bool = True
    violations: list[PolicyViolation] = Field(default_factory=list)
    action: PolicyAction = PolicyAction.ALLOW
    modified_content: str | None = None
    evaluation_ms: float = 0.0
    rules_evaluated: int = 0


# -- Audit Types (used by audit, proxy) ---------------------


class AuditEventType(enum.StrEnum):
    """Types of auditable events."""

    REQUEST = "request"
    RESPONSE = "response"
    POLICY_CHECK = "policy_check"
    INTERVENTION = "intervention"
    ERROR = "error"
    REQUEST_RECEIVED = "request_received"
    POLICY_EVALUATED = "policy_evaluated"
    ERROR_OCCURRED = "error_occurred"
    FACT_CHECK_RUN = "fact_check_run"
    RESPONSE_SENT = "response_sent"


class AuditEvent(BaseModel):
    """An auditable event in the system."""

    event_id: str = Field(default_factory=lambda: str(uuid4()))
    event_type: AuditEventType
    tenant_id: str
    request_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    data: dict[str, Any] = Field(default_factory=dict)
    user_id: str = ""
    session_id: str = ""
    policy_result: dict[str, Any] | None = None
    fact_check_result: dict[str, Any] | None = None
    error: str | None = None


class AuditEntryInput(BaseModel):
    """Input for creating an audit log entry."""

    tenant_id: str
    request_id: str
    prompt_hash: str
    response_hash: str
    trust_score: float = Field(default=0.0, ge=0.0, le=1.0)
    intervention_level: int = 0
    cost_usd: float = Field(default=0.0, ge=0.0)
    latency_ms: float = Field(default=0.0, ge=0.0)
    metadata: dict[str, Any] = Field(default_factory=dict)


# -- Fact Check Types (used by checker) ---------------------


class FactCheckVerdict(enum.StrEnum):
    """Verdict for a fact check."""

    SUPPORTED = "supported"
    REFUTED = "refuted"
    INCONCLUSIVE = "inconclusive"
    UNCERTAIN = "uncertain"


class Claim(BaseModel):
    """A factual claim extracted from text."""

    claim_id: str = Field(default_factory=lambda: str(uuid4()))
    text: str
    source_span: str = ""


class ClaimResult(BaseModel):
    """Result of checking a single claim."""

    claim: Claim
    verdict: FactCheckVerdict = FactCheckVerdict.INCONCLUSIVE
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    evidence: list[str] = Field(default_factory=list)


class FactCheckResult(BaseModel):
    """Result of checking all claims in a response."""

    claims: list[ClaimResult] = Field(default_factory=list)
    overall_verdict: FactCheckVerdict = FactCheckVerdict.INCONCLUSIVE
    trust_score: float = Field(default=0.5, ge=0.0, le=1.0)


# -- Health & Stats Types (used by proxy, sdk, dashboard) ---


class HealthStatus(BaseModel):
    """System health status."""

    status: str = "healthy"
    version: str = "0.2.0"
    uptime_seconds: float = 0.0
    checks: dict[str, bool] = Field(default_factory=dict)


class RequestStats(BaseModel):
    """Request statistics for the dashboard."""

    total_requests: int = 0
    requests_per_minute: float = 0.0
    avg_latency_ms: float = 0.0
    error_rate: float = 0.0


# --- Compliance Engine Models ---

class ComplianceStatus(str, enum.Enum):
    COMPLIANT="compliant"
    NON_COMPLIANT="non_compliant"
    PARTIAL="partial"
    SKIPPED="skipped"
    ERROR="error"



class ComplianceCheckResult(BaseModel):
    model_config = ConfigDict(extra="forbid")
    framework_id: str
    framework_name: str
    status: ComplianceStatus
    score: float = Field(default=0.0, ge=0.0, le=1.0)
    violations: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    checked_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    tenant_id: str = ""
    metadata: dict = Field(default_factory=dict)

class ComplianceSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")
    tenant_id: str
    overall_status: ComplianceStatus
    overall_score: float = Field(default=0.0, ge=0.0, le=1.0)
    framework_results: list[ComplianceCheckResult] = Field(default_factory=list)
    evaluated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    request_id: str = Field(default_factory=lambda: str(uuid4()))
