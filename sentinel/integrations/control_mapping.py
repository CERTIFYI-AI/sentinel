# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Maps integration findings to the org's control catalog.

Two-level resolution, both tolerant of what actually exists:

1. ``CATEGORY_TO_CONTROLS`` names (framework key, control ref) pairs per
   check_category — the industry-standard SOC 2 / ISO 27001 / HIPAA / PCI DSS
   references plus the frameworks Sentinel's live catalog actually carries
   (GDPR, ISO/IEC 42001, NIST AI RMF).
2. ``FRAMEWORK_MATCHERS`` resolves a framework key to a catalog row by name
   pattern, because ``frameworks.code`` is an internal ``FW-00N`` sequence,
   not a slug. A framework the org has not enabled simply contributes no
   links — mapping never invents a target.

Control refs are compared normalized (case/space/dot-insensitive) so the
sheet's ``Art.32`` matches the catalog's ``Art. 32``.
"""

from __future__ import annotations

import re

from sentinel.integrations.base import IntegrationFinding

# framework key -> ILIKE pattern against frameworks.name
FRAMEWORK_MATCHERS: dict[str, str] = {
    "soc2": "%SOC 2%",
    "iso27001": "%27001%",
    "iso42001": "%42001%",
    "hipaa": "%HIPAA%",
    "pci_dss": "%PCI%",
    "gdpr": "%GDPR%",
    "nist_ai_rmf": "%NIST AI RMF%",
}

# check_category -> [(framework key, control ref)]
CATEGORY_TO_CONTROLS: dict[str, list[tuple[str, str]]] = {
    "mfa_enforcement":         [("soc2", "CC6.1"), ("soc2", "CC6.6"), ("iso27001", "A.9.4.2"),
                                ("hipaa", "164.312(a)(2)(i)"), ("pci_dss", "8.3")],
    "access_control":          [("soc2", "CC6.1"), ("soc2", "CC6.2"), ("soc2", "CC6.3"),
                                ("iso27001", "A.9.1.1"), ("iso27001", "A.9.2.1"),
                                ("pci_dss", "7.1"), ("pci_dss", "7.2"), ("gdpr", "Art. 25")],
    "least_privilege":         [("soc2", "CC6.3"), ("iso27001", "A.9.2.3"), ("iso27001", "A.9.4.1"),
                                ("pci_dss", "7.1"), ("gdpr", "Art. 25")],
    "encryption_at_rest":      [("soc2", "CC9.1"), ("iso27001", "A.10.1.1"),
                                ("hipaa", "164.312(a)(2)(iv)"), ("pci_dss", "3.4"), ("gdpr", "Art. 32")],
    "encryption_in_transit":   [("soc2", "CC9.1"), ("iso27001", "A.10.1.1"),
                                ("hipaa", "164.312(e)(2)(ii)"), ("pci_dss", "4.1"), ("gdpr", "Art. 32")],
    "audit_logging":           [("soc2", "CC7.2"), ("soc2", "CC7.3"), ("iso27001", "A.12.4.1"),
                                ("iso27001", "A.12.4.3"), ("hipaa", "164.312(b)"),
                                ("pci_dss", "10.1"), ("pci_dss", "10.2"), ("gdpr", "Art. 30")],
    "vulnerability_management": [("soc2", "CC7.1"), ("iso27001", "A.12.6.1"),
                                 ("pci_dss", "6.3"), ("pci_dss", "11.3")],
    "change_management":       [("soc2", "CC8.1"), ("iso27001", "A.12.1.2"), ("pci_dss", "6.4")],
    "endpoint_protection":     [("soc2", "CC6.8"), ("iso27001", "A.12.2.1"),
                                ("hipaa", "164.312(a)(2)(i)")],
    "data_classification":     [("soc2", "C1.1"), ("iso27001", "A.8.2.1"), ("gdpr", "Art. 25")],
    "incident_response":       [("soc2", "CC7.3"), ("soc2", "CC7.4"), ("iso27001", "A.16.1.1"),
                                ("hipaa", "164.308(a)(6)"), ("pci_dss", "12.10"), ("gdpr", "Art. 33")],
    "vendor_management":       [("soc2", "CC9.2"), ("iso27001", "A.15.1.1"), ("hipaa", "164.308(b)"),
                                ("pci_dss", "12.8"), ("gdpr", "Art. 28")],
    "hr_controls":             [("soc2", "CC6.2"), ("iso27001", "A.7.1.1"), ("iso27001", "A.7.3.1"),
                                ("hipaa", "164.308(a)(3)")],
    "network_security":        [("soc2", "CC6.6"), ("soc2", "CC6.7"), ("iso27001", "A.13.1.1"),
                                ("pci_dss", "1.1"), ("pci_dss", "1.2")],
    "secret_management":       [("soc2", "CC6.1"), ("iso27001", "A.9.2.4"), ("pci_dss", "8.2")],
    "backup_recovery":         [("soc2", "A1.2"), ("soc2", "A1.3"), ("iso27001", "A.12.3.1"),
                                ("hipaa", "164.308(a)(7)")],
}


def normalize_ref(ref: str) -> str:
    """``Art. 32`` == ``Art.32`` == ``art 32``; ``A.9.4.2`` == ``A 9.4.2``."""
    return re.sub(r"[\s.]+", "", ref).lower()


class ControlMapper:
    """Persists finding→control links and refreshes evidence rollups."""

    def __init__(self, conn) -> None:
        self.conn = conn

    async def map(self, org_id: str, findings: list[IntegrationFinding]) -> int:
        """Link findings to controls. Returns the number of links written."""
        controls = await self._load_controls(org_id)
        linked = 0
        for finding in findings:
            for framework_key, ref in CATEGORY_TO_CONTROLS.get(finding.check_category, []):
                control_id = controls.get((framework_key, normalize_ref(ref)))
                if control_id is None:
                    continue  # framework not enabled for this org — no target, no link
                row = await self.conn.fetchrow(
                    "SELECT id FROM public.integration_findings"
                    " WHERE check_id = $1 AND org_id = $2",
                    finding.check_id, org_id,
                )
                if row is None:
                    continue  # finding not persisted (worker persists first)
                await self.conn.execute(
                    """
                    INSERT INTO public.control_finding_evidence
                      (org_id, control_id, integration_finding_id, status, mapped_at)
                    VALUES ($1, $2, $3, $4, now())
                    ON CONFLICT (control_id, integration_finding_id)
                    DO UPDATE SET status = EXCLUDED.status, mapped_at = EXCLUDED.mapped_at
                    """,
                    org_id, control_id, row["id"], finding.status,
                )
                linked += 1
        return linked

    async def _load_controls(self, org_id: str) -> dict[tuple[str, str], str]:
        """(framework key, normalized ref) -> controls.id for this org."""
        out: dict[tuple[str, str], str] = {}
        for framework_key, pattern in FRAMEWORK_MATCHERS.items():
            rows = await self.conn.fetch(
                """
                SELECT c.id, c.control_ref
                FROM public.controls c
                JOIN public.frameworks f ON f.id = c.framework_id
                WHERE c.org_id = $1 AND f.name ILIKE $2
                  AND c.control_ref IS NOT NULL
                """,
                org_id, pattern,
            )
            for r in rows:
                out[(framework_key, normalize_ref(r["control_ref"]))] = str(r["id"])
        return out
