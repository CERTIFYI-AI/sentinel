from __future__ import annotations
from sentinel.compliance.frameworks.base import BaseFramework, Control, ControlStatus, EvidenceRecord, FrameworkMetadata, FrameworkStatus


class OWASPLLMFramework(BaseFramework):
    metadata = FrameworkMetadata(
        framework_id='owasp_llm',
        framework_name='OWASP LLM',
        description='OWASP Top 10 for LLMs',
        status=FrameworkStatus.TECH_STANDARD,
        jurisdiction='Global',
        enforcement_date='Since 2023',
        sentinel_coverage_note='OWASP LLM Top 10 security controls',
    )
    controls = [
        Control('llm01', 'Prompt Injection', 'OWASP LLM01', 'Prevent prompt injection attacks.', True),
        Control('llm02', 'Insecure Output Handling', 'OWASP LLM02', 'Validate and sanitize LLM outputs.', True),
        Control('llm06', 'Sensitive Information Disclosure', 'OWASP LLM06', 'Prevent disclosure of sensitive data.', True),
    ]

    def _evaluate_control(self, control, entry, result, config):
        dispatch = {'llm01': self._llm01, 'llm02': self._llm02, 'llm06': self._llm06}
        return dispatch[control.control_id](control, entry, result, config)

    def _r(self, c, s, sc, sig, val, txt, rem=None):
        return EvidenceRecord(control_id=c.control_id, framework_id=self.metadata.framework_id, framework_name=self.metadata.framework_name, control_name=c.control_name, article_ref=c.article_ref, status=s, score=sc, signal_used=sig, signal_value=val, evidence_text=txt, remediation=rem)

    def _llm01(self, c, e, r, cfg):
        injection_blocked = r.get('injection_blocked', False)
        injection_score = r.get('injection_score', 0.0)
        if not injection_blocked and injection_score < 0.3:
            return self._r(c, ControlStatus.PASS, 1.0, 'injection_blocked,injection_score', {'blocked': injection_blocked, 'score': injection_score}, 'Prompt injection controls active. No injection detected.')
        return self._r(c, ControlStatus.FAIL, 0.0, 'injection_blocked,injection_score', {'blocked': injection_blocked, 'score': injection_score}, 'Prompt injection risk detected.', 'Review injection detection and filtering rules.')

    def _llm02(self, c, e, r, cfg):
        trust = r.get('trust_score', 0.0)
        cb_state = r.get('circuit_breaker_state', 'CLOSED')
        if trust >= 0.5 and cb_state == 'CLOSED':
            return self._r(c, ControlStatus.PASS, trust, 'trust_score,circuit_breaker_state', {'trust': trust, 'cb': cb_state}, 'Output handling verified. Trust score adequate.')
        return self._r(c, ControlStatus.FAIL, trust, 'trust_score,circuit_breaker_state', {'trust': trust, 'cb': cb_state}, 'Insecure output detected. Low trust or circuit breaker open.', 'Review output validation pipeline.')

    def _llm06(self, c, e, r, cfg):
        pii_blocked = r.get('pii_blocked', False)
        pii_entities = r.get('pii_entities_detected', [])
        if pii_blocked or not pii_entities:
            return self._r(c, ControlStatus.PASS, 1.0, 'pii_blocked,pii_entities_detected', {'blocked': pii_blocked, 'entities': pii_entities}, 'Sensitive info disclosure prevented. PII masked.')
        return self._r(c, ControlStatus.FAIL, 0.0, 'pii_blocked,pii_entities_detected', {'blocked': pii_blocked, 'entities': pii_entities}, 'Sensitive information disclosure risk.', 'Enable PII masking.')
