# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Continuous-GRC integration evidence pipeline.

Adapters pull posture evidence from connected providers, the worker persists
normalized findings, and the control mapper links them to the org's control
catalog. Everything here runs server-side: credentials are decrypted only in
this package, never in the browser.
"""

from sentinel.integrations.base import (  # noqa: F401
    FindingSeverity,
    FindingStatus,
    IntegrationFinding,
)
