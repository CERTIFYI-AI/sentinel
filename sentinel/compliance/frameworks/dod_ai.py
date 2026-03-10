from __future__ import annotations
from sentinel.compliance.frameworks.base import BaseFramework, Control, ControlStatus, EvidenceRecord, FrameworkMetadata, FrameworkStatus


class DoDAlFramework(BaseFramework):
    metadata = FrameworkMetadata(
        framework_id='dod_ai',
        framework_name='DoD AI Ethical Principles',
        description='DoD AI Ethical Principles (2020) and Responsible AI Strategy (2022)',
        status=FrameworkStatus.POLICY_GUIDE,
        jurisdiction='United States',
        enforcement_date='Since 2020',
        sentinel_coverage_note='DoD responsible AI controls for accountability, traceability, and governability',
    )

    controls = [
        Control('responsible01', 'Accountability', 'DoD-AI-P1', 'Humans bear responsibility for AI decisions.', True),
        Control('traceable03', 'Explainable AI', 'DoD-AI-P3', 'Trust score provides decision traceability.', True),
        Control('governable05', 'Human Control', 'DoD-AI-P5', 'Intervention cascade implements governability.', True),
    ]

    def _evaluate_control(self, control, entry, result, config):
        dispatch = {'responsible01': self._responsible01, 'traceable03': self._traceable03, 'governable05': self._governable05}
        return dispatch[control.control_id](control, entry, result, config)

    def _r(self, c, s, sc, sig, val, txt, rem=None):
        return EvidenceRecord(control_id=c.control_id, framework_id=self.metadata.framework_id, framework_name=self.metadata.framework_name, control_name=c.control_name, article_ref=c.article_ref, status=s, score=sc, signal_used=sig, signal_value=val, evidence_text=txt, remediation=rem)

    def _responsible01(self, c, e, r, cfg):
        intervention = r.get('intervention', 'NONE')
        if intervention in ('HITL', 'BLOCKED'):
            return self._r(c, ControlStatus.PASS, 1.0, 'intervention', intervention, 'Human accountability enforced via HITL resolution.')
        if intervention == 'NONE':
            return self._r(c, ControlStatus.PASS, 0.8, 'intervention', intervention, 'No intervention needed. Low-risk interaction.')
        return self._r(c, ControlStatus.PASS, 0.9, 'intervention', intervention, 'Automated intervention applied.')

    def _traceable03(self, c, e, r, cfg):
        trust = r.get('trust_score', 0.0)
        if trust >= 0.75:
            return self._r(c, ControlStatus.PASS, trust, 'trust_score', trust, 'Trust score provides decision traceability.')
        return self._r(c, ControlStatus.FAIL, trust, 'trust_score', trust, 'Trust score too low for reliable traceability.', 'Enable trust score component headers in API responses.')

    def _governable05(self, c, e, r, cfg):
        intervention = r.get('intervention', 'NONE')
        cb_state = r.get('circuit_breaker_state', 'CLOSED')
        if cb_state != 'OPEN':
            return self._r(c, ControlStatus.PASS, 1.0, 'intervention,circuit_breaker_state', {'intervention': intervention, 'cb': cb_state}, 'Governability controls active.')
        return self._r(c, ControlStatus.FAIL, 0.0, 'intervention,circuit_breaker_state', {'intervention': intervention, 'cb': cb_state}, 'Circuit breaker OPEN: system ungovernable.', 'Investigate root cause before resetting circuit breaker.')
