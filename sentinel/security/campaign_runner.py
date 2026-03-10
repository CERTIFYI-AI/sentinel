"""Campaign Runner — executes red team security campaigns.

Runs adversarial testing campaigns (prompt injection, jailbreak, data exfiltration,
PII leakage, model inversion, excessive agency, hallucination), produces vulnerability
findings, and emits events that cascade to compliance gaps and remediation tasks.
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

ATTACK_TECHNIQUES = [
    "prompt_injection",
    "jailbreak",
    "data_exfiltration",
    "pii_leakage",
    "model_inversion",
    "excessive_agency",
    "hallucination",
    "insecure_output",
    "training_data_poisoning",
    "model_denial_of_service",
]


@dataclass
class Finding:
    id: str
    campaign_id: str
    tenant_id: str
    technique: str
    severity: str  # CRITICAL | HIGH | MEDIUM | LOW | INFO
    title: str
    description: str
    evidence: str
    model_id: str | None = None
    status: str = "OPEN"  # OPEN | IN_PROGRESS | REMEDIATED | VERIFIED
    framework_refs: list[str] = field(default_factory=list)
    created_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


@dataclass
class Campaign:
    id: str
    tenant_id: str
    name: str
    description: str
    target_model_id: str | None
    techniques: list[str]
    status: str  # CREATED | RUNNING | COMPLETE | FAILED
    findings: list[Finding] = field(default_factory=list)
    started_at: str | None = None
    completed_at: str | None = None
    created_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


class CampaignRunner:
    """Orchestrates red team campaigns with event emission on findings."""

    _campaigns: dict[str, list[Campaign]] = {}  # tenant_id -> campaigns

    async def create_campaign(
        self,
        *,
        tenant_id: str,
        name: str,
        description: str = "",
        target_model_id: str | None = None,
        techniques: list[str] | None = None,
    ) -> Campaign:
        campaign = Campaign(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            name=name,
            description=description,
            target_model_id=target_model_id,
            techniques=techniques or ATTACK_TECHNIQUES[:5],
            status="CREATED",
        )
        if tenant_id not in self._campaigns:
            self._campaigns[tenant_id] = []
        self._campaigns[tenant_id].append(campaign)
        logger.info("Campaign created: %s for tenant %s", campaign.id, tenant_id)
        return campaign

    async def run_campaign(
        self, tenant_id: str, campaign_id: str
    ) -> Campaign | None:
        campaign = await self.get_campaign(tenant_id, campaign_id)
        if not campaign:
            return None

        campaign.status = "RUNNING"
        campaign.started_at = datetime.now(timezone.utc).isoformat()

        try:
            for technique in campaign.techniques:
                findings = await self._run_technique(
                    tenant_id=tenant_id,
                    campaign_id=campaign.id,
                    technique=technique,
                    model_id=campaign.target_model_id,
                )
                campaign.findings.extend(findings)

                # Wire: emit_campaign_finding for each finding
                for finding in findings:
                    await self._emit_campaign_finding(finding)

            campaign.status = "COMPLETE"
            campaign.completed_at = datetime.now(timezone.utc).isoformat()
            logger.info(
                "Campaign %s completed: %d findings",
                campaign.id,
                len(campaign.findings),
            )

        except Exception as exc:
            campaign.status = "FAILED"
            campaign.completed_at = datetime.now(timezone.utc).isoformat()
            logger.error("Campaign %s failed: %s", campaign.id, exc)

        return campaign

    async def _run_technique(
        self,
        *,
        tenant_id: str,
        campaign_id: str,
        technique: str,
        model_id: str | None,
    ) -> list[Finding]:
        """Run a single attack technique.
        Production: integrate with actual red team tooling.
        """
        # Placeholder: production should call actual adversarial testing
        return []

    async def _emit_campaign_finding(self, finding: Finding) -> None:
        """Emit security.finding event to trigger automation cascade.

        This wires into sentinel.events.emitters.emit_campaign_finding()
        to cascade: finding -> compliance gap + remediation task.
        """
        try:
            from sentinel.events.emitters import emit_campaign_finding

            await emit_campaign_finding(
                tenant_id=finding.tenant_id,
                finding_id=finding.id,
                campaign_id=finding.campaign_id,
                severity=finding.severity,
                technique=finding.technique,
                title=finding.title,
                model_id=finding.model_id or "",
            )
            logger.info("Emitted campaign finding event for %s", finding.id)
        except Exception as exc:
            logger.error(
                "Failed to emit campaign finding for %s: %s", finding.id, exc
            )

    async def get_campaign(
        self, tenant_id: str, campaign_id: str
    ) -> Campaign | None:
        for c in self._campaigns.get(tenant_id, []):
            if c.id == campaign_id:
                return c
        return None

    async def get_all_campaigns(
        self, tenant_id: str, page: int = 1, page_size: int = 20
    ) -> list[Campaign]:
        campaigns = self._campaigns.get(tenant_id, [])
        start = (page - 1) * page_size
        return campaigns[start : start + page_size]

    async def get_campaign_results(
        self, tenant_id: str, campaign_id: str
    ) -> list[Finding]:
        campaign = await self.get_campaign(tenant_id, campaign_id)
        if not campaign:
            return []
        return campaign.findings
