from __future__ import annotations
from typing import Any
from sentinel.compliance.frameworks.base import ControlDefinition, ControlStatus, BaseFramework


class EUAIActFramework(BaseFramework):
    framework_id = 'eu_ai_act'
    display_name = 'EU AI Act 2024'
    version = '2024/1689'
    legal_weight = 'regulatory'

    CONTROLS = [
        ControlDefinition(control_id='EUAI-1.1', title='Risk Classification', category='risk_mgmt', is_organisational=False),
        ControlDefinition(control_id='EUAI-1.2', title='HITL Oversight', category='risk_mgmt', is_organisational=False),
        ControlDefinition(control_id='EUAI-1.3', title='Policy Enforcement', category='governance', is_organisational=False),
        ControlDefinition(control_id='EUAI-2.1', title='Audit Logging', category='transparency', is_organisational=False),
        ControlDefinition(control_id='EUAI-2.2', title='Golden Source Integrity', category='transparency', is_organisational=False),
        ControlDefinition(control_id='EUAI-3.1', title='Human Oversight Procedures', category='governance', is_organisational=True),
        ControlDefinition(control_id='EUAI-3.2', title='Incident Response Plan', category='governance', is_organisational=True),
    ]

    def get_controls(self):
        return self.CONTROLS

    def evaluate(self, signals: dict, tenant_id: str) -> list:
        results = []
        cs = ControlStatus

        # EUAI-1.1 risk classification via policy violations
        pv = signals.get('policy_violations')
        if pv is not None:
            status = cs.PASS if int(pv) == 0 else cs.FAIL
            rem = None if status == cs.PASS else 'Review and remediate flagged policy violations before deployment.'
            results.append(self._make_result(tenant_id, 'EUAI-1.1', status, {'policy_violations': pv}, rem))
        else:
            results.append(self._make_result(tenant_id, 'EUAI-1.1', cs.NA, {}, scope_note='Policy violation signal not computed.'))

        # EUAI-1.2 HITL
        hitl = signals.get('hitl_triggered')
        if hitl is not None:
            status = cs.PASS if hitl else cs.FAIL
            rem = None if status == cs.PASS else 'Enable HITL intervention for high-risk decisions.'
            results.append(self._make_result(tenant_id, 'EUAI-1.2', status, {'hitl_triggered': hitl}, rem))
        else:
            results.append(self._make_result(tenant_id, 'EUAI-1.2', cs.NA, {}, scope_note='HITL signal not available.'))

        # EUAI-1.3 policy enforcement
        cb = signals.get('circuit_breaker_state')
        if cb is not None:
            status = cs.PASS if cb == 'closed' else cs.FAIL
            rem = None if status == cs.PASS else 'Circuit breaker is open - review policy enforcement configuration.'
            results.append(self._make_result(tenant_id, 'EUAI-1.3', status, {'circuit_breaker_state': cb}, rem))
        else:
            results.append(self._make_result(tenant_id, 'EUAI-1.3', cs.NA, {}, scope_note='Circuit breaker state not available.'))

        # EUAI-2.1 audit logging
        al = signals.get('audit_log')
        if al is not None:
            status = cs.PASS if al else cs.FAIL
            rem = None if status == cs.PASS else 'Enable comprehensive audit logging for all AI decisions.'
            results.append(self._make_result(tenant_id, 'EUAI-2.1', status, {'audit_log': al}, rem))
        else:
            results.append(self._make_result(tenant_id, 'EUAI-2.1', cs.NA, {}, scope_note='Audit log signal not available.'))

        # EUAI-2.2 golden source
        gs = signals.get('golden_source_empty')
        if gs is not None:
            status = cs.FAIL if gs else cs.PASS
            rem = None if status == cs.PASS else 'Populate golden source data to ensure integrity baseline.'
            results.append(self._make_result(tenant_id, 'EUAI-2.2', status, {'golden_source_empty': gs}, rem))
        else:
            results.append(self._make_result(tenant_id, 'EUAI-2.2', cs.NA, {}, scope_note='Golden source signal not computed.'))

        # Organisational controls
        for ctrl_id, note in [
            ('EUAI-3.1', 'Human oversight procedures must be documented and tested by the organisation.'),
            ('EUAI-3.2', 'Incident response plan for AI failures must be maintained by the organisation.'),
        ]:
            results.append(self._make_result(tenant_id, ctrl_id, cs.NA, {}, scope_note=note))

        return results
