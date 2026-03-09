from __future__ import annotations
from sentinel.compliance.frameworks.base import BaseFramework, FrameworkMetadata, FrameworkStatus


class HIPAAFramework(BaseFramework):
    metadata = FrameworkMetadata(
        framework_id='hipaa',
        framework_name='HIPAA',
        description='Health Insurance Portability and Accountability Act',
        status=FrameworkStatus.MANDATORY_LAW,
        jurisdiction='United States',
        sentinel_coverage_note='HIPAA compliance controls',
    )
    controls = []

    def _evaluate_control(self, control, entry, result, config):
        return {}
