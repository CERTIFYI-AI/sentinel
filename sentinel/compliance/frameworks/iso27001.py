from __future__ import annotations
from sentinel.compliance.frameworks.base import ControlDefinition, ControlStatus, BaseFramework


class ISO42001Framework(BaseFramework):
    framework_id = 'iso42001'
    display_name = 'ISO/IEC 42001:2023'
    version = '2022'
    legal_weight = 'best-practice'

    CONTROLS = [
        ControlDefinition(control_id='A.8.15', title='Logging', category='operations', is_organisational=False),
        ControlDefinition(control_id='A.8.16', title='Monitoring Activities', category='operations', is_organisational=False),
        ControlDefinition(control_id='A.5.8', title='IS in Project Management', category='governance', is_organisational=True),
        ControlDefinition(control_id='A.8.25', title='Secure Development Lifecycle', category='development', is_organisational=True),
    ]

    def get_controls(self):
        return self.CONTROLS

    def evaluate(self, signals: dict, tenant_id: str) -> list:
        results = []
        cs = ControlStatus

        al = signals.get('audit_log')
        if al is not None:
            status = cs.PASS if al else cs.FAIL
            rem = None if status == cs.PASS else 'Implement event logging per ISO 27001 A.8.15.'
            results.append(self._make_result(tenant_id, 'A.8.15', status, {'audit_log': al}, rem))
        else:
            results.append(self._make_result(tenant_id, 'A.8.15', cs.NA, {}, scope_note='Audit log signal not available.'))

        sd = signals.get('semantic_drift_score')
        if sd is not None:
            status = cs.PASS if float(sd) < 0.5 else cs.FAIL
            rem = None if status == cs.PASS else f'Semantic drift {sd} indicates anomalous behaviour. Investigate immediately.'
            results.append(self._make_result(tenant_id, 'A.8.16', status, {'semantic_drift_score': sd}, rem))
        else:
            results.append(self._make_result(tenant_id, 'A.8.16', cs.NA, {}, scope_note='Semantic drift signal not computed.'))

        for ctrl_id, note in [
            ('A.5.8', 'IS in project management must be addressed by organisational policy.'),
            ('A.8.25', 'Secure development lifecycle policy must be maintained by the organisation.'),
        ]:
            results.append(self._make_result(tenant_id, ctrl_id, cs.NA, {}, scope_note=note))

        return results
