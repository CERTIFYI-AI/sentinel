from __future__ import annotations
from sentinel.compliance.frameworks.base import ControlDefinition, ControlStatus, BaseFramework


class NISTAIRMFFramework(BaseFramework):
    framework_id = 'nist_ai_rmf'
    display_name = 'NIST AI RMF 1.0'
    version = '1.0'
    legal_weight = 'best-practice'

    CONTROLS = [
        ControlDefinition(control_id='GOVERN-1.1', title='AI Risk Governance Policy', category='govern', is_organisational=True),
        ControlDefinition(control_id='MAP-1.1', title='Context Establishment', category='map', is_organisational=True),
        ControlDefinition(control_id='MEASURE-2.5', title='Runtime Monitoring', category='measure', is_organisational=False),
        ControlDefinition(control_id='MANAGE-1.3', title='Incident Response', category='manage', is_organisational=False),
    ]

    def get_controls(self):
        return self.CONTROLS

    def evaluate(self, signals: dict, tenant_id: str) -> list:
        results = []
        cs = ControlStatus

        for ctrl_id, note in [
            ('GOVERN-1.1', 'AI risk governance policy must be documented by the organisation.'),
            ('MAP-1.1', 'AI system context and stakeholder analysis must be performed by the organisation.'),
        ]:
            results.append(self._make_result(tenant_id, ctrl_id, cs.NA, {}, scope_note=note))

        sd = signals.get('semantic_drift_score')
        if sd is not None:
            status = cs.PASS if float(sd) < 0.4 else cs.FAIL
            rem = None if status == cs.PASS else f'Semantic drift {sd} detected. Review model behaviour per NIST MEASURE-2.5.'
            results.append(self._make_result(tenant_id, 'MEASURE-2.5', status, {'semantic_drift_score': sd}, rem))
        else:
            results.append(self._make_result(tenant_id, 'MEASURE-2.5', cs.NA, {}, scope_note='Semantic drift signal not computed.'))

        hitl = signals.get('hitl_triggered')
        if hitl is not None:
            status = cs.PASS if hitl else cs.FAIL
            rem = None if status == cs.PASS else 'Enable human-in-the-loop for incident response per NIST MANAGE-1.3.'
            results.append(self._make_result(tenant_id, 'MANAGE-1.3', status, {'hitl_triggered': hitl}, rem))
        else:
            results.append(self._make_result(tenant_id, 'MANAGE-1.3', cs.NA, {}, scope_note='HITL signal not available.'))

        return results
