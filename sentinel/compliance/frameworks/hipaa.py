from __future__ import annotations
from sentinel.compliance.frameworks.base import ControlDefinition, ControlStatus, BaseFramework


class HIPAAFramework(BaseFramework):
    framework_id = 'hipaa'
    display_name = 'HIPAA Security Rule'
    version = '2013'
    legal_weight = 'regulatory'

    CONTROLS = [
        ControlDefinition(control_id='164.312.b', title='Audit Controls', category='technical', is_organisational=False),
        ControlDefinition(control_id='164.308.a1', title='Security Management Process', category='administrative', is_organisational=True),
        ControlDefinition(control_id='164.312.a1', title='Access Control', category='technical', is_organisational=False),
    ]

    def get_controls(self):
        return self.CONTROLS

    def evaluate(self, signals: dict, tenant_id: str) -> list:
        results = []
        cs = ControlStatus

        al = signals.get('audit_log')
        if al is not None:
            status = cs.PASS if al else cs.FAIL
            rem = None if status == cs.PASS else 'Implement audit controls for all ePHI access per HIPAA 164.312.b.'
            results.append(self._make_result(tenant_id, '164.312.b', status, {'audit_log': al}, rem))
        else:
            results.append(self._make_result(tenant_id, '164.312.b', cs.NA, {}, scope_note='Audit log signal not available.'))

        cb = signals.get('circuit_breaker_state')
        if cb is not None:
            status = cs.PASS if cb == 'closed' else cs.FAIL
            rem = None if status == cs.PASS else 'Restore access controls per HIPAA 164.312.a1.'
            results.append(self._make_result(tenant_id, '164.312.a1', status, {'circuit_breaker_state': cb}, rem))
        else:
            results.append(self._make_result(tenant_id, '164.312.a1', cs.NA, {}, scope_note='Circuit breaker state not available.'))

        results.append(self._make_result(tenant_id, '164.308.a1', cs.NA, {}, scope_note='Security management process must be implemented by the organisation.'))

        return results
