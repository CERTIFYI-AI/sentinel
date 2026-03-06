from __future__ import annotations
from sentinel.compliance.frameworks.base import ControlDefinition, ControlStatus, BaseFramework


class OWASPLLMFramework(BaseFramework):
    framework_id = 'owasp_llm'
    display_name = 'OWASP LLM Top 10'
    version = '1.1'
    legal_weight = 'best-practice'

    CONTROLS = [
        ControlDefinition(control_id='LLM01', title='Prompt Injection', category='security', is_organisational=False),
        ControlDefinition(control_id='LLM02', title='Insecure Output Handling', category='security', is_organisational=False),
        ControlDefinition(control_id='LLM06', title='Sensitive Info Disclosure', category='privacy', is_organisational=False),
        ControlDefinition(control_id='LLM08', title='Excessive Agency', category='control', is_organisational=False),
        ControlDefinition(control_id='LLM09', title='Overreliance', category='governance', is_organisational=True),
    ]

    def get_controls(self):
        return self.CONTROLS

    def evaluate(self, signals: dict, tenant_id: str) -> list:
        results = []
        cs = ControlStatus

        pv = signals.get('policy_violations')
        if pv is not None:
            status = cs.PASS if int(pv) == 0 else cs.FAIL
            rem = None if status == cs.PASS else f'{pv} policy violations detected. Review for prompt injection patterns.'
            results.append(self._make_result(tenant_id, 'LLM01', status, {'policy_violations': pv}, rem))
        else:
            results.append(self._make_result(tenant_id, 'LLM01', cs.NA, {}, scope_note='Policy violation signal not computed.'))

        sd = signals.get('semantic_drift_score')
        if sd is not None:
            status = cs.PASS if float(sd) < 0.3 else cs.FAIL
            rem = None if status == cs.PASS else f'Output drift {sd} may indicate insecure output handling. Review LLM02.'
            results.append(self._make_result(tenant_id, 'LLM02', status, {'semantic_drift_score': sd}, rem))
        else:
            results.append(self._make_result(tenant_id, 'LLM02', cs.NA, {}, scope_note='Semantic drift signal not computed.'))

        cb = signals.get('circuit_breaker_state')
        if cb is not None:
            status = cs.PASS if cb == 'closed' else cs.FAIL
            rem = None if status == cs.PASS else 'Circuit breaker open - review for excessive agency risk (LLM08).'
            results.append(self._make_result(tenant_id, 'LLM06', status, {'circuit_breaker_state': cb}, rem))
            results.append(self._make_result(tenant_id, 'LLM08', status, {'circuit_breaker_state': cb}, rem))
        else:
            for c in ['LLM06', 'LLM08']:
                results.append(self._make_result(tenant_id, c, cs.NA, {}, scope_note='Circuit breaker state not available.'))

        results.append(self._make_result(tenant_id, 'LLM09', cs.NA, {}, scope_note='Overreliance mitigation must be addressed in organisational AI usage policy.'))

        return results
