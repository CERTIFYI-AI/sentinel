from __future__ import annotations
from sentinel.compliance.frameworks.base import BaseFramework, Control, ControlStatus, EvidenceRecord, FrameworkMetadata, FrameworkStatus


class OWASPAPIFramework(BaseFramework):
    metadata = FrameworkMetadata(
        framework_id='owasp_api',
        framework_name='OWASP API Security',
        description='OWASP API Security Top 10 2023',
        status=FrameworkStatus.TECH_STANDARD,
        jurisdiction='Global',
        enforcement_date='Since 2023',
        sentinel_coverage_note='API security controls for AI proxy endpoints',
    )

    controls = [
        Control('api01', 'Broken Object Level Authorisation', 'API1', 'Verify tenant isolation via audit chain.', True),
        Control('api04', 'Unrestricted Resource Consumption', 'API4', 'Rate limiting and circuit breaker controls.', True),
        Control('api06', 'Unrestricted Access to Sensitive Flows', 'API6', 'PII detection on all inputs.', True),
    ]

    def _evaluate_control(self, control, entry, result, config):
        dispatch = {'api01': self._api01, 'api04': self._api04, 'api06': self._api06}
        return dispatch[control.control_id](control, entry, result, config)

    def _r(self, c, s, sc, sig, val, txt, rem=None):
        return EvidenceRecord(control_id=c.control_id, framework_id=self.metadata.framework_id, framework_name=self.metadata.framework_name, control_name=c.control_name, article_ref=c.article_ref, status=s, score=sc, signal_used=sig, signal_value=val, evidence_text=txt, remediation=rem)

    def _api01(self, c, e, r, cfg):
        integrity = r.get('audit_chain_integrity', False)
        if integrity:
            return self._r(c, ControlStatus.PASS, 1.0, 'audit_chain_integrity', integrity, 'Object-level authorisation verified via audit chain.')
        return self._r(c, ControlStatus.FAIL, 0.0, 'audit_chain_integrity', integrity, 'Audit chain integrity failure: potential BOLA.', 'Verify tenant_id sourced only from JWT claims.')

    def _api04(self, c, e, r, cfg):
        intervention = r.get('intervention', 'NONE')
        cb_state = r.get('circuit_breaker_state', 'CLOSED')
        if cb_state == 'CLOSED' and intervention in ('NONE', 'REGENERATE'):
            return self._r(c, ControlStatus.PASS, 1.0, 'intervention,circuit_breaker_state', {'intervention': intervention, 'cb': cb_state}, 'Resource consumption within limits.')
        return self._r(c, ControlStatus.FAIL, 0.0, 'intervention,circuit_breaker_state', {'intervention': intervention, 'cb': cb_state}, 'Unrestricted resource consumption risk.', 'Review rate limits and circuit breaker configuration.')

    def _api06(self, c, e, r, cfg):
        pii_clean = r.get('pii_clean', 0.0)
        if pii_clean >= 0.90:
            return self._r(c, ControlStatus.PASS, pii_clean, 'pii_clean', pii_clean, 'Sensitive business flow access controlled via PII detection.')
        return self._r(c, ControlStatus.FAIL, pii_clean, 'pii_clean', pii_clean, 'Sensitive data extraction risk in API flow.', 'Review audit log for systematic PII extraction patterns.')
