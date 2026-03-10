from __future__ import annotations
from sentinel.compliance.frameworks.base import BaseFramework, Control, ControlStatus, EvidenceRecord, FrameworkMetadata, FrameworkStatus


class SOC2Framework(BaseFramework):
    metadata = FrameworkMetadata(
        framework_id='soc2',
        framework_name='SOC 2',
        description='Trust Services Criteria',
        status=FrameworkStatus.CERTIFIABLE,
        jurisdiction='Global',
        sentinel_coverage_note='SOC 2 Trust Services Criteria controls',
    )
    controls = [
        Control('cc6_1', 'Logical and Physical Access Controls', 'CC6.1', 'Access controls restrict authorized users.', True),
        Control('cc7_2', 'System Monitoring', 'CC7.2', 'System is monitored for anomalies.', True),
        Control('cc8_1', 'Change Management', 'CC8.1', 'Changes are authorized and tracked.', True),
    ]

    def _evaluate_control(self, control, entry, result, config):
        dispatch = {'cc6_1': self._cc6_1, 'cc7_2': self._cc7_2, 'cc8_1': self._cc8_1}
        return dispatch[control.control_id](control, entry, result, config)

    def _r(self, c, s, sc, sig, val, txt, rem=None):
        return EvidenceRecord(control_id=c.control_id, framework_id=self.metadata.framework_id, framework_name=self.metadata.framework_name, control_name=c.control_name, article_ref=c.article_ref, status=s, score=sc, signal_used=sig, signal_value=val, evidence_text=txt, remediation=rem)

    def _cc6_1(self, c, e, r, cfg):
        pii_blocked = r.get('pii_blocked', False)
        if pii_blocked:
            return self._r(c, ControlStatus.PASS, 1.0, 'pii_blocked', {'pii_blocked': pii_blocked}, 'Access controls active. PII masking enforced.')
        return self._r(c, ControlStatus.FAIL, 0.0, 'pii_blocked', {'pii_blocked': pii_blocked}, 'Access control gap. PII not blocked.', 'Enable PII masking in sentinel config.')

    def _cc7_2(self, c, e, r, cfg):
        monitoring = r.get('monitoring_enabled', False)
        logging_on = r.get('logging_enabled', False)
        if monitoring and logging_on:
            return self._r(c, ControlStatus.PASS, 1.0, 'monitoring_enabled,logging_enabled', {'monitoring': monitoring, 'logging': logging_on}, 'System monitoring active.')
        return self._r(c, ControlStatus.FAIL, 0.0, 'monitoring_enabled,logging_enabled', {'monitoring': monitoring, 'logging': logging_on}, 'Monitoring or logging disabled.', 'Enable monitoring and logging.')

    def _cc8_1(self, c, e, r, cfg):
        entry_hash = e.get('entry_hash', '')
        if entry_hash:
            return self._r(c, ControlStatus.PASS, 1.0, 'entry_hash', {'hash': entry_hash[:16]}, 'Change management: audit trail maintained.')
        return self._r(c, ControlStatus.FAIL, 0.0, 'entry_hash', {}, 'No audit trail for changes.', 'Enable entry hashing.')
