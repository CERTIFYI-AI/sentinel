from __future__ import annotations
from sentinel.compliance.frameworks.base import BaseFramework, Control, ControlStatus, EvidenceRecord, FrameworkMetadata, FrameworkStatus
from sentinel.models import InterventionLevel, normalize_intervention_level


class HIPAAFramework(BaseFramework):
    metadata = FrameworkMetadata(
        framework_id='hipaa',
        framework_name='HIPAA',
        description='Health Insurance Portability and Accountability Act',
        status=FrameworkStatus.MANDATORY_LAW,
        jurisdiction='United States',
        sentinel_coverage_note='HIPAA compliance controls',
    )
    controls = [
        Control('phi_safeguard', 'PHI Safeguards', 'HIPAA 164.312', 'Protected health information must be safeguarded.', True),
        Control('audit_controls', 'Audit Controls', 'HIPAA 164.312(b)', 'Record and examine access to ePHI.', True),
        Control('access_control', 'Access Control', 'HIPAA 164.312(a)', 'Implement access controls for ePHI.', True),
    ]

    def _evaluate_control(self, control, entry, result, config):
        dispatch = {'phi_safeguard': self._phi, 'audit_controls': self._audit, 'access_control': self._access}
        return dispatch[control.control_id](control, entry, result, config)

    def _r(self, c, s, sc, sig, val, txt, rem=None):
        return EvidenceRecord(control_id=c.control_id, framework_id=self.metadata.framework_id, framework_name=self.metadata.framework_name, control_name=c.control_name, article_ref=c.article_ref, status=s, score=sc, signal_used=sig, signal_value=val, evidence_text=txt, remediation=rem)

    def _phi(self, c, e, r, cfg):
        pii_blocked = r.get('pii_blocked', False)
        pii_entities = r.get('pii_entities_detected', [])
        if pii_blocked or not pii_entities:
            return self._r(c, ControlStatus.PASS, 1.0, 'pii_blocked,pii_entities_detected', {'blocked': pii_blocked, 'entities': pii_entities}, 'PHI safeguards active. PII/PHI masked.')
        return self._r(c, ControlStatus.FAIL, 0.0, 'pii_blocked,pii_entities_detected', {'blocked': pii_blocked, 'entities': pii_entities}, 'PHI safeguard failure. Sensitive data detected but not masked.', 'Enable PII/PHI masking in sentinel config.')

    def _audit(self, c, e, r, cfg):
        entry_id = e.get('entry_id', e.get('request_id', ''))
        entry_hash = e.get('entry_hash', '')
        if entry_id and entry_hash:
            return self._r(c, ControlStatus.PASS, 1.0, 'entry_id,entry_hash', {'entry_id': entry_id, 'hash': entry_hash[:16]}, 'Audit controls active. Access logged with tamper-evident hash.')
        return self._r(c, ControlStatus.FAIL, 0.0, 'entry_id,entry_hash', {'entry_id': entry_id}, 'Audit trail missing.', 'Ensure audit logging is enabled.')

    def _access(self, c, e, r, cfg):
        trust = r.get('trust_score', 0.0)
        intervention = normalize_intervention_level(r.get('intervention_level', InterventionLevel.NONE)) or InterventionLevel.NONE
        if trust >= 0.5:
            return self._r(c, ControlStatus.PASS, trust, 'trust_score,intervention_level', {'trust': trust, 'intervention': intervention.name}, 'Access control enforced via trust scoring.')
        return self._r(c, ControlStatus.FAIL, trust, 'trust_score,intervention_level', {'trust': trust, 'intervention': intervention.name}, 'Access control concern: low trust score.', 'Review intervention policy and trust thresholds.')
