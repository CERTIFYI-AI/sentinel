"""Data models for Certifyi Sentinel.

Pydantic models representing requests, responses, audit events,
policy evaluation results, and fact-check outcomes.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class PolicyAction(str, Enum):
    """Action taken by the policy engine."""

    ALLOW = "allow"
    BLOCK = "block"
    MODIFY = "modify"
    FLAG = "flag"
    REVIEW = "review"


class Severity(str, Enum):
    """Severity levels for policy violations."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class FactCheckVerdict(str, Enum):
    """Verdict for a fact-check claim."""

    SUPPORTED = "supported"
    REFUTED = "refuted"
    UNCERTAIN = "uncertain"
    UNVERIFIABLE = "unverifiable"


class AuditEventType(str, Enum):
    """Types of audit events."""

    REQUEST_RECEIVED = "request_received"
    POLICY_EVALUATED = "policy_evaluated"
    FACT_CHECK_RUN = "fact_check_run"
    RESPONSE_SENT = "response_sent"
    ERROR_OCCURRED = "error_occurred"
    PLUGIN_EXECUTED = "plugin_executed"


# ---------------------------------------------------------------------------
# Request / Response
# ---------------------------------------------------------------------------

class LLMMessage(BaseModel):
    """A single message in a conversation."""

    role: str = Field(..., description="Message role: system, user, or assistant")
    content: str = Field(..., description="Message content")
    name: Optional[str] = Field(None, description="Optional speaker name")


class LLMRequest(BaseModel):
    """Incoming request to the Sentinel proxy."""

    request_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    provider: str = Field("", description="Target LLM provider name")
    model: str = Field("", description="Target model identifier")
    messages: List[LLMMessage] = Field(default_factory=list)
    temperature: float = Field(0.7, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(None, ge=1)
    stream: bool = False
    metadata: Dict[str, Any] = Field(default_factory=dict)
    user_id: Optional[str] = None
    session_id: Optional[str] = None


class LLMResponse(BaseModel):
    """Response from the upstream LLM provider."""

    request_id: str = ""
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    provider: str = ""
    model: str = ""
    content: str = ""
    finish_reason: Optional[str] = None
    usage: Dict[str, int] = Field(default_factory=dict)
    latency_ms: float = 0.0
    metadata: Dict[str, Any] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Policy
# ---------------------------------------------------------------------------

class PolicyViolation(BaseModel):
    """A single policy violation detected."""

    rule_id: str
    rule_name: str
    severity: Severity
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)


class PolicyResult(BaseModel):
    """Result of policy evaluation on a request or response."""

    action: PolicyAction = PolicyAction.ALLOW
    violations: List[PolicyViolation] = Field(default_factory=list)
    modified_content: Optional[str] = None
    evaluation_ms: float = 0.0
    rules_evaluated: int = 0
    metadata: Dict[str, Any] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Fact-Checking
# ---------------------------------------------------------------------------

class Claim(BaseModel):
    """A single factual claim extracted from text."""

    claim_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str
    source_span: Optional[str] = None


class ClaimResult(BaseModel):
    """Result of checking a single claim."""

    claim_id: str
    verdict: FactCheckVerdict
    confidence: float = Field(0.0, ge=0.0, le=1.0)
    evidence: List[str] = Field(default_factory=list)
    sources: List[str] = Field(default_factory=list)


class FactCheckResult(BaseModel):
    """Aggregated fact-check result for a response."""

    request_id: str = ""
    claims: List[ClaimResult] = Field(default_factory=list)
    overall_score: float = Field(0.0, ge=0.0, le=1.0)
    check_ms: float = 0.0


# ---------------------------------------------------------------------------
# Audit
# ---------------------------------------------------------------------------

class AuditEvent(BaseModel):
    """An audit log entry."""

    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_type: AuditEventType
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    request_id: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    data: Dict[str, Any] = Field(default_factory=dict)
    policy_result: Optional[PolicyResult] = None
    fact_check_result: Optional[FactCheckResult] = None
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# Dashboard / Stats
# ---------------------------------------------------------------------------

class RequestStats(BaseModel):
    """Aggregated statistics for the dashboard."""

    total_requests: int = 0
    blocked_requests: int = 0
    flagged_requests: int = 0
    avg_latency_ms: float = 0.0
    fact_checks_run: int = 0
    policy_violations: int = 0
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class HealthStatus(BaseModel):
    """System health status."""

    status: str = "healthy"
    version: str = ""
    uptime_seconds: float = 0.0
    providers_connected: int = 0
    plugins_loaded: int = 0
    audit_backend_ok: bool = True
