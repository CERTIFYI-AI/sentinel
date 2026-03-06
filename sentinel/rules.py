"""Policy and rules engine for Certifyi Sentinel.

Evaluates incoming requests and outgoing responses against
configurable rules for content safety, PII detection,
topic blocking, and custom governance policies.
"""

from __future__ import annotations

import logging
import re
import time
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

from sentinel.config import PolicyConfig
from sentinel.models import (
    LLMRequest,
    LLMResponse,
    PolicyAction,
    PolicyResult,
    PolicyViolation,
    Severity,
)

# BLOCK-03: Explicit severity ordering
SEVERITY_ORDER: dict = {
    "low": 1,
    "medium": 2,
    "high": 3,
    "critical": 4,
}


logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Base rule interface
# ---------------------------------------------------------------------------


class Rule(ABC):
    """Abstract base class for policy rules."""

    rule_id: str = ""
    rule_name: str = ""
    severity: Severity = Severity.MEDIUM
    enabled: bool = True

    @abstractmethod
    async def evaluate(
        self, text: str, context: Dict[str, Any]
    ) -> Optional[PolicyViolation]:
        """Evaluate text against this rule.

        Returns a PolicyViolation if the rule is triggered, else None.
        """


# ---------------------------------------------------------------------------
# Built-in rules
# ---------------------------------------------------------------------------


class PIIDetectionRule(Rule):
    """Detect common PII patterns (emails, phone numbers, SSNs)."""

    rule_id = "builtin.pii_detection"

    severity = Severity.HIGH

    _patterns = {
        "email": re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"),
        "phone": re.compile(r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b"),
        "ssn": re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
        "credit_card": re.compile(r"\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b"),
    }

    async def evaluate(
        self, text: str, context: Dict[str, Any]
    ) -> Optional[PolicyViolation]:
        found = []
        for pii_type, pattern in self._patterns.items():
            if pattern.search(text):
                found.append(pii_type)
        if found:
            return PolicyViolation(
                rule_id=self.rule_id,

                severity=self.severity,
                description=f"PII detected: {', '.join(found)}",
                details={"pii_types": list(found)},

            )
        return None


class BlockedTopicRule(Rule):
    """Block requests containing specified topics."""

    rule_id = "builtin.blocked_topic"

    severity = Severity.HIGH

    def __init__(self, topics: List[str]) -> None:
        self._topics = [t.lower() for t in topics]

    async def evaluate(
        self, text: str, context: Dict[str, Any]
    ) -> Optional[PolicyViolation]:
        text_lower = text.lower()
        matched = [t for t in self._topics if t in text_lower]
        if matched:
            return PolicyViolation(
                rule_id=self.rule_id,

                severity=self.severity,
                description=f"Blocked topic(s) detected: {', '.join(matched)}",
                details={"topics": list(matched)},

            )
        return None


class MaxTokenGuardRule(Rule):
    """Ensure input length is within bounds."""

    rule_id = "builtin.max_token_guard"

    severity = Severity.MEDIUM

    def __init__(self, max_chars: int = 50000) -> None:
        self._max_chars = max_chars

    async def evaluate(
        self, text: str, context: Dict[str, Any]
    ) -> Optional[PolicyViolation]:
        if len(text) > self._max_chars:
            return PolicyViolation(
                rule_id=self.rule_id,

                severity=self.severity,
                description=f"Input exceeds {self._max_chars} characters",
                details={"length": len(text), "max": self._max_chars},

            )
        return None


class PromptInjectionRule(Rule):
    """Basic prompt injection detection."""

    rule_id = "builtin.prompt_injection"

    severity = Severity.CRITICAL

    _suspicious = [
        "ignore previous instructions",
        "ignore all previous",
        "disregard your instructions",
        "you are now",
        "new instructions:",
        "system prompt:",
        "override:",
    ]

    async def evaluate(
        self, text: str, context: Dict[str, Any]
    ) -> Optional[PolicyViolation]:
        text_lower = text.lower()
        for phrase in self._suspicious:
            if phrase in text_lower:
                return PolicyViolation(
                    rule_id=self.rule_id,

                    severity=self.severity,
                    description="Potential prompt injection detected",
                    details={"matched_phrase": phrase},

                )
        return None


# ---------------------------------------------------------------------------
# Policy engine
# ---------------------------------------------------------------------------


class PolicyEngine:
    """Evaluate requests and responses against registered rules."""

    def __init__(self, config: PolicyConfig) -> None:
        self._config = config
        self._request_rules: List[Rule] = []
        self._response_rules: List[Rule] = []
        self._load_builtin_rules()

    def _load_builtin_rules(self) -> None:
        """Register built-in rules based on config."""
        if self._config.pii_detection:
            rule = PIIDetectionRule()
            self._request_rules.append(rule)
            self._response_rules.append(rule)

        if self._config.blocked_topics:
            rule = BlockedTopicRule(self._config.blocked_topics)
            self._request_rules.append(rule)

        self._request_rules.append(MaxTokenGuardRule())
        self._request_rules.append(PromptInjectionRule())

    def register_rule(
        self, rule: Rule, phase: str = "both"
    ) -> None:
        """Register a custom rule.

        Args:
            rule: Rule instance.
            phase: 'request', 'response', or 'both'.
        """
        if phase in ("request", "both"):
            self._request_rules.append(rule)
        if phase in ("response", "both"):
            self._response_rules.append(rule)

    async def evaluate_request(self, request: LLMRequest) -> PolicyResult:
        """Run all request-phase rules."""
        text = " ".join(m.content for m in request.messages)
        context = {"request_id": request.request_id, "phase": "request"}
        return await self._run_rules(self._request_rules, text, context)

    async def evaluate_response(
        self, request: LLMRequest, response: LLMResponse
    ) -> PolicyResult:
        """Run all response-phase rules."""
        context = {"request_id": request.request_id, "phase": "response"}
        return await self._run_rules(
            self._response_rules, response.content, context
        )

    async def _run_rules(
        self,
        rules: List[Rule],
        text: str,
        context: Dict[str, Any],
    ) -> PolicyResult:
        """Execute rules and aggregate results."""
        start = time.time()
        violations: List[PolicyViolation] = []

        for rule in rules:
            if not rule.enabled:
                continue
            try:
                violation = await rule.evaluate(text, context)
                if violation is not None:
                    violations.append(violation)
            except Exception:
                logger.exception("Rule %s failed", rule.rule_id)

        action = self._determine_action(violations)
        return PolicyResult(
            action=action,
            violations=violations,
            evaluation_ms=(time.time() - start) * 1000,
            rules_evaluated=len(rules),
        )

    def _determine_action(
        self, violations: List[PolicyViolation]
    ) -> PolicyAction:
        """Determine the final action based on violations."""
        if not violations:
            return PolicyAction.ALLOW

        max_severity_rank = max(SEVERITY_ORDER.get(v.severity.value, 0) for v in violations)
        if self._config.strict_mode or max_severity_rank >= SEVERITY_ORDER["high"]:
            return PolicyAction.BLOCK
        return PolicyAction.ALLOW
