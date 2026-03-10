from __future__ import annotations
from sentinel.compliance.frameworks.base import BaseFramework, Control, ControlStatus, EvidenceRecord, FrameworkMetadata, FrameworkStatus


class OWASPAgenticFramework(BaseFramework):
    metadata = FrameworkMetadata(
        framework_id='owasp_agentic',
        framework_name='OWASP Agentic AI',
        description='OWASP Top 10 for Agentic AI Applications 2025',
        status=FrameworkStatus.TECH_STANDARD,
        jurisdiction='Global',
        enforcement_date='Since 2025',
        sentinel_coverage_note='Agentic AI security controls for memory, tool use, and orchestration',
    )

    controls = [
        Control('agent01', 'Memory Poisoning', 'Agent-01', 'Detect memory poisoning via drift.', True),
        Control('agent02', 'Tool Abuse', 'Agent-02', 'Detect tool abuse via intervention signals.', True),
        Control('agent06', 'Inadequate Audit Trails', 'Agent-06', 'Verify audit chain integrity for agents.', True),
    ]

    def _evaluate_control(self, control, entry, result, config):
        dispatch = {'agent01': self._agent01, 'agent02': self._agent02, 'agent06': self._agent06}
        return dispatch[control.control_id](control, entry, result, config)

    def _r(self, c, s, sc, sig, val, txt, rem=None):
        return EvidenceRecord(control_id=c.control_id, framework_id=self.metadata.framework_id, framework_name=self.metadata.framework_name, control_name=c.control_name, article_ref=c.article_ref, status=s, score=sc, signal_used=sig, signal_value=val, evidence_text=txt, remediation=rem)

    def _agent01(self, c, e, r, cfg):
        drift = r.get('drift_score', 0.0)
        if drift >= 0.80:
            return self._r(c, ControlStatus.PASS, drift, 'drift_score', drift, 'No memory poisoning detected. Drift within threshold.')
        return self._r(c, ControlStatus.FAIL, drift, 'drift_score', drift, 'Potential memory poisoning: drift below threshold.', 'Clear agent memory and re-initialise baseline.')

    def _agent02(self, c, e, r, cfg):
        intervention = r.get('intervention', 'NONE')
        if intervention in ('NONE', 'REGENERATE'):
            return self._r(c, ControlStatus.PASS, 1.0, 'intervention', intervention, 'No tool abuse detected.')
        return self._r(c, ControlStatus.FAIL, 0.0, 'intervention', intervention, 'Tool abuse risk: high intervention level.', 'Implement tool-call whitelisting in agentic pipeline.')

    def _agent06(self, c, e, r, cfg):
        integrity = r.get('audit_chain_integrity', False)
        if integrity:
            return self._r(c, ControlStatus.PASS, 1.0, 'audit_chain_integrity', integrity, 'Audit trail integrity verified for agentic actions.')
        return self._r(c, ControlStatus.FAIL, 0.0, 'audit_chain_integrity', integrity, 'Audit trail integrity failure for agentic actions.', 'Ensure agent_id in every audit entry and verify hash chain.')
