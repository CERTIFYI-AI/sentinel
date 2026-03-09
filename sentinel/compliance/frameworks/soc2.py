from __future__ import annotations
from sentinel.compliance.frameworks.base import BaseFramework, FrameworkMetadata, FrameworkStatus


class SOC2Framework(BaseFramework):
    metadata = FrameworkMetadata(
        framework_id='soc2',
        framework_name='SOC 2',
        description='Trust Services Criteria',
        status=FrameworkStatus.CERTIFIABLE,
        jurisdiction='Global',
        sentinel_coverage_note='SOC 2 Trust Services Criteria controls',
    )
    controls = []

    def _evaluate_control(self, control, entry, result, config):
        return {}
