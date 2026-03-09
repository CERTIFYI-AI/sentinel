from __future__ import annotations
from sentinel.compliance.frameworks.base import BaseFramework, FrameworkMetadata, FrameworkStatus


class ISO27001Framework(BaseFramework):
    metadata = FrameworkMetadata(
        framework_id='iso27001',
        framework_name='ISO 27001',
        description='Information Security Management',
        status=FrameworkStatus.CERTIFIABLE,
        jurisdiction='Global',
        sentinel_coverage_note='ISO 27001 information security controls',
    )
    controls = []

    def _evaluate_control(self, control, entry, result, config):
        return {}
