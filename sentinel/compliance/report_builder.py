from __future__ import annotations
import json
import logging
from datetime import datetime, timezone
from typing import Any, Optional
from dataclasses import dataclass, field

from sentinel.compliance.frameworks.base import ControlStatus, FrameworkStatus

logger = logging.getLogger(__name__)


@dataclass
class ComplianceReport:
    """Full compliance report for a tenant across all frameworks."""
    tenant_id: str
    generated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    frameworks: list[dict] = field(default_factory=list)
    summary: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            'tenant_id': self.tenant_id,
            'generated_at': self.generated_at,
            'frameworks': self.frameworks,
            'summary': self.summary,
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), default=str, indent=2)


class ReportBuilder:
    """Builds compliance reports from framework evaluation results."""

    def __init__(self):
        logger.info('ReportBuilder initialised')

    def build_report(
        self,
        tenant_id: str,
        framework_results: list[FrameworkStatus],
    ) -> ComplianceReport:
        """Build a full compliance report from evaluation results."""
        report = ComplianceReport(tenant_id=tenant_id)
        total_pass = 0
        total_fail = 0
        total_na = 0
        total_controls = 0

        for fw_status in framework_results:
            fw_dict = self._build_framework_section(fw_status)
            report.frameworks.append(fw_dict)
            for c in fw_status.controls:
                total_controls += 1
                if c.status == ControlStatus.PASS:
                    total_pass += 1
                elif c.status == ControlStatus.FAIL:
                    total_fail += 1
                elif c.status == ControlStatus.NA:
                    total_na += 1

        applicable = total_controls - total_na
        score = (total_pass / applicable * 100) if applicable > 0 else 0.0
        report.summary = {
            'total_frameworks': len(framework_results),
            'total_controls': total_controls,
            'passed': total_pass,
            'failed': total_fail,
            'not_applicable': total_na,
            'compliance_score': round(score, 1),
        }
        return report

    def _build_framework_section(self, fw_status: FrameworkStatus) -> dict:
        """Build report section for a single framework."""
        controls = []
        pass_count = 0
        fail_count = 0
        na_count = 0

        for c in fw_status.controls:
            ctrl = {
                'control_id': c.control_id,
                'title': c.title,
                'status': c.status.value,
                'category': c.category,
                'signal_source': c.signal_source,
                'signal_value': c.signal_value,
                'threshold': c.threshold,
                'remediation': c.remediation,
                'scope_note': getattr(c, 'scope_note', None),
            }
            controls.append(ctrl)
            if c.status == ControlStatus.PASS:
                pass_count += 1
            elif c.status == ControlStatus.FAIL:
                fail_count += 1
            elif c.status == ControlStatus.NA:
                na_count += 1

        applicable = len(controls) - na_count
        score = (pass_count / applicable * 100) if applicable > 0 else 0.0

        return {
            'framework_id': fw_status.metadata.framework_id,
            'display_name': fw_status.metadata.display_name,
            'legal_weight': fw_status.metadata.legal_weight,
            'version': fw_status.metadata.version,
            'country': fw_status.metadata.country,
            'compliance_score': round(score, 1),
            'controls_passed': pass_count,
            'controls_failed': fail_count,
            'controls_na': na_count,
            'controls_total': len(controls),
            'controls': controls,
        }

    def build_summary_only(
        self,
        tenant_id: str,
        framework_results: list[FrameworkStatus],
    ) -> dict:
        """Build lightweight summary without full control details."""
        report = self.build_report(tenant_id, framework_results)
        return {
            'tenant_id': report.tenant_id,
            'generated_at': report.generated_at,
            'summary': report.summary,
            'frameworks': [
                {
                    'framework_id': fw['framework_id'],
                    'display_name': fw['display_name'],
                    'legal_weight': fw['legal_weight'],
                    'compliance_score': fw['compliance_score'],
                    'controls_passed': fw['controls_passed'],
                    'controls_failed': fw['controls_failed'],
                    'controls_na': fw['controls_na'],
                }
                for fw in report.frameworks
            ],
        }
