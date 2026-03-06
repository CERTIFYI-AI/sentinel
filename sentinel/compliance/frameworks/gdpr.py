from __future__ import annotations
from sentinel.compliance.frameworks.base import ControlDefinition, ControlStatus, BaseFramework


class GDPRFramework(BaseFramework):
    framework_id = 'gdpr'
    display_name = 'GDPR 2018'
    version = '2016/679'
    legal_weight = 'regulatory'

    CONTROLS = [
        ControlDefinition(control_id='Art.5.1f', title='Integrity and Confidentiality', category='data_protection', is_organisational=False),
        ControlDefinition(control_id='Art.25', title='Data Protection by Design', category='data_protection', is_organisational=True),
        ControlDefinition(control_id='Art.30', title='Records of Processing', category='accountability', is_organisational=True),
        ControlDefinition(control_id='Art.22', title='Automated Decision Making', category='rights', is_organisational=False),
    ]

    def get_controls(self):
        return self.CONTROLS

    def evaluate(self, signals: dict, tenant_id: str) -> list:
        results = []
        cs = ControlStatus

        cb = signals.get('circuit_breaker_state')
        if cb is not None:
            status = cs.PASS if cb == 'closed' else cs.FAIL
            rem = None if status == cs.PASS else 'Ensure circuit breaker closed to protect data integrity per Art.5.1f.'
            results.append(self._make_result(tenant_id, 'Art.5.1f', status, {'circuit_breaker_state': cb}, rem))
        else:
            results.append(self._make_result(tenant_id, 'Art.5.1f', cs.NA, {}, scope_note='Circuit breaker state not available.'))

        hitl = signals.get('hitl_triggered')
        if hitl is not None:
            status = cs.PASS if hitl else cs.FAIL
            rem = None if status == cs.PASS else 'Enable HITL to provide meaningful human review of automated decisions per Art.22.'
            results.append(self._make_result(tenant_id, 'Art.22', status, {'hitl_triggered': hitl}, rem))
        else:
            results.append(self._make_result(tenant_id, 'Art.22', cs.NA, {}, scope_note='HITL signal not available.'))

        for ctrl_id, note in [
            ('Art.25', 'Data protection by design requirements must be implemented by the organisation.'),
            ('Art.30', 'Records of processing activities must be maintained by the organisation.'),
        ]:
            results.append(self._make_result(tenant_id, ctrl_id, cs.NA, {}, scope_note=note))

        return results
