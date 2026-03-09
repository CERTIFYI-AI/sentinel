from __future__ import annotations
from sentinel.compliance.frameworks.base import BaseFramework, FrameworkMetadata, FrameworkStatus


class HIPAAFramework(BaseFramework):
    metadata = FrameworkMetadata('hipaa', 'HIPAA', 'Health Insurance Portability', FrameworkStatus.MANDATORY_LAW, 'United States', 'Since 1996', 'HIPAA controls for AI in healthcare')
    controls = []

    def _evaluate_control(self, control, entry, result, config):
        return {}