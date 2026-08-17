# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Shared types for integration adapters.

An adapter's contract:
  * async ``validate()`` — verify credentials with one lightweight call; raise
    ``ValueError`` with an operator-readable message on failure.
  * async ``fetch_all()`` — run every check and return normalized findings.
  * no database access — the worker persists; the adapter only talks to the
    provider.
  * ``check_id`` is stable across runs: ``{provider}.{service}.{check_name}``.
    It is the upsert key, so renaming one orphans its history.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

FindingStatus = Literal["PASSED", "FAILED", "WARNING", "NOT_AVAILABLE"]
FindingSeverity = Literal["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]

#: check_category values understood by the control mapper. An adapter emitting
#: a category outside this set maps to nothing — the tests enforce membership.
CHECK_CATEGORIES: frozenset[str] = frozenset({
    "mfa_enforcement",
    "access_control",
    "least_privilege",
    "encryption_at_rest",
    "encryption_in_transit",
    "audit_logging",
    "vulnerability_management",
    "change_management",
    "endpoint_protection",
    "data_classification",
    "incident_response",
    "vendor_management",
    "hr_controls",
    "network_security",
    "secret_management",
    "backup_recovery",
})


@dataclass
class IntegrationFinding:
    """One normalized check result from a provider sync."""

    check_id: str
    title: str
    description: str
    remediation: str
    status: FindingStatus
    severity: FindingSeverity
    check_category: str
    #: Raw provider payload retained for the audit trail. Rendered to users
    #: only through the normalized fields, never verbatim.
    result_details: dict = field(default_factory=dict)

    def __post_init__(self) -> None:
        if self.check_category not in CHECK_CATEGORIES:
            raise ValueError(
                f"{self.check_id}: unknown check_category {self.check_category!r} "
                "— it would map to no control; add it to CHECK_CATEGORIES and "
                "the control mapper first"
            )
