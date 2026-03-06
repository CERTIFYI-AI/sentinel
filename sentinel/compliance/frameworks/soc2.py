from __future__ import annotations
from sentinel.compliance.frameworks.base import ControlDefinition, ControlStatus, BaseFramework


class SOC2Framework(BaseFramework):
    framework_id = 'soc2'
    display_name = 'SOC 2 Type II'
    version = '2017'
    legal_weight = 'contractual'

    CONTROLS = [
        ControlDefinition(control_id='CC6.1', title='Logical Access Controls', category='security', is_organisational=False),
        ControlDefinition(control_id='CC7.2', title='System Monitoring', category='security', is_organisational=False),
        ControlDefinition(control_id='CC8.1', title='Change Management', category='operations', is_organisational=True),
        ControlDefinition(control_id='A1.2', title='Capacity and Performance', category='availability', is_organisational=False),
    ]

    def get_controls(self):
        return self.CONTROLS

    def evaluate(self, signals: dict, tenant_id: str) -> list:
        results = []
        cs = ControlStatus

        cb = signals.get('circuit_breaker_state')
        if cb is not None:
            status = cs.PASS if cb == 'closed' else cs.FAIL
            rem = None if status == cs.PASS else 'Restore circuit breaker to closed state to maintain access controls.'
            results.append(self._make_result(tenant_id, 'CC6.1', status, {'circuit_breaker_state': cb}, rem))
        else:
            results.append(self._make_result(tenant_id, 'CC6.1', cs.NA, {}, scope_note='Circuit breaker state not available.'))

        al = signals.get('audit_log')
        if al is not None:
            status = cs.PASS if al else cs.FAIL
            rem = None if status == cs.PASS else 'Enable audit logging for SOC2 CC7.2 system monitoring compliance.'
            results.append(self._make_result(tenant_id, 'CC7.2', status, {'audit_log': al}, rem))
        else:
            results.append(self._make_result(tenant_id, 'CC7.2', cs.NA, {}, scope_note='Audit log signal not available.'))

        results.append(self._make_result(tenant_id, 'CC8.1', cs.NA, {}, scope_note='Change management procedures must be maintained by the organisation.'))

        sd = signals.get('semantic_drift_score')
        if sd is not None:
            status = cs.PASS if float(sd) < 0.3 else cs.FAIL
            rem = None if status == cs.PASS else f'Semantic drift score {sd} exceeds threshold 0.3. Review model outputs.'
            results.append(self._make_result(tenant_id, 'A1.2', status, {'semantic_drift_score': sd}, rem))
        else:
            results.append(self._make_result(tenant_id, 'A1.2', cs.NA, {}, scope_note='Semantic drift signal not computed.'))

        return results
