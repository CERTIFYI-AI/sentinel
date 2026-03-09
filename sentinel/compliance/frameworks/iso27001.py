from __future__ import annotations
from sentinel.compliance.frameworks.base import BaseFramework, FrameworkMetadata, FrameworkStatus


class ISO27001Framework(BaseFramework):
    metadata = FrameworkMetadata('iso27001', 'ISO 27001', 'Information Security', FrameworkStatus.MANDATORY_LAW, 'Global', 'Since 2005', 'ISO 27001 controls for AI systems')
    controls = []

    def _evaluate_control(self, control, entry, result, config):
        return {}