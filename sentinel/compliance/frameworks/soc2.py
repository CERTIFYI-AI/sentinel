from __future__ import annotations
from sentinel.compliance.frameworks.base import BaseFramework, Control, ControlStatus, EvidenceRecord, FrameworkMetadata, FrameworkStatus


class SOC2Framework(BaseFramework):
    metadata = FrameworkMetadata('soc2', 'SOC 2', 'Trust Services Criteria', FrameworkStatus.INDUSTRY_STANDARD, 'Global', 'Since 2010', 'SOC 2 Trust Services Criteria for AI systems')
    controls = []

    def _evaluate_control(self, control, entry, result, config):
        return {}