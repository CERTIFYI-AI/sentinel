from __future__ import annotations
from sentinel.compliance.frameworks.base import BaseFramework, Control, ControlStatus, EvidenceRecord, FrameworkMetadata, FrameworkStatus


class ISO27001Framework(BaseFramework):
    metadata = FrameworkMetadata(
        framework_id='iso27001',
        framework_name='ISO 27001',
        description='Information Security Management',
        status=FrameworkStatus.CERTIFIABLE,
        jurisdiction='Global',
        sentinel_coverage_note='ISO 27001 information security controls',
    )
    controls = [
        Control('a8_access', 'Access Control', 'A.8', 'Access to information shall be restricted.', True),
        Control('a12_ops', 'Operations Security', 'A.12', 'Operational procedures and responsibilities.', True),
        Control('a18_compliance', 'Compliance', 'A.18', 'Compliance with legal and contractual requirements.', True),
    ]

    def _evaluate_control(self, control, entry, result, config):
        dispatch = {'a8_access': self._a8, 'a12_ops': self._a12, 'a18_compliance': self._a18}
        return dispatch[control.control_id](control, entry, result, config)

    def _r(self, c, s, sc, sig, val, txt, rem=None):
        return EvidenceRecord(control_id=c.control_id, framework_id=self.metadata.framework_id, framework_name=self.metadata.framework_name, control_name=c.control_name, article_ref=c.article_ref, status=s, score=sc, signal_used=sig, signal_value=val, evidence_text=txt, remediation=rem)

    def _a8(self, c, e, r, cfg):
        pii_blocked = r.get('pii_blocked', False)
        trust = r.get('trust_score', 0.0)
        if pii_blocked and trust >= 0.5:
            return self._r(c, ControlStatus.PASS, 1.0, 'pii_blocked,trust_score', {'pii_blocked': pii_blocked, 'trust': trust}, 'Access controls enforced. PII blocked, trust verified.')
        return self._r(c, ControlStatus.FAIL, 0.0, 'pii_blocked,trust_score', {'pii_blocked': pii_blocked, 'trust': trust}, 'Access control gap detected.', 'Enable PII masking and verify trust thresholds.')

    def _a12(self, c, e, r, cfg):
        logging_on = r.get('logging_enabled', False)
        monitoring = r.get('monitoring_enabled', False)
        if logging_on and monitoring:
            return self._r(c, ControlStatus.PASS, 1.0, 'logging_enabled,monitoring_enabled', {'logging': logging_on, 'monitoring': monitoring}, 'Operations security active. Logging and monitoring enabled.')
        return self._r(c, ControlStatus.FAIL, 0.0, 'logging_enabled,monitoring_enabled', {'logging': logging_on, 'monitoring': monitoring}, 'Operations security gap.', 'Enable logging and monitoring.')

    def _a18(self, c, e, r, cfg):
        entry_hash = e.get('entry_hash', '')
        audit_log = r.get('audit_log', False)
        if entry_hash and audit_log:
            return self._r(c, ControlStatus.PASS, 1.0, 'entry_hash,audit_log', {'hash': entry_hash[:16], 'audit': audit_log}, 'Compliance controls active. Audit trail maintained.')
        return self._r(c, ControlStatus.FAIL, 0.0, 'entry_hash,audit_log', {'hash': entry_hash, 'audit': audit_log}, 'Compliance evidence gap.', 'Enable audit logging and hash chain.')
