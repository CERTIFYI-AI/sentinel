import sys
import os
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sentinel.compliance.frameworks.base import ControlStatus, ControlDefinition, EvidenceRecord
from sentinel.compliance.models import ComplianceResult
from sentinel.compliance.frameworks.eu_ai_act import EUAIActFramework
from sentinel.compliance.frameworks.soc2 import SOC2Framework
from sentinel.compliance.frameworks.iso27001 import ISO27001Framework
from sentinel.compliance.frameworks.nist_ai_rmf import NISTAIRMFFramework
from sentinel.compliance.frameworks.gdpr import GDPRFramework
from sentinel.compliance.frameworks.hipaa import HIPAAFramework
from sentinel.compliance.frameworks.owasp_llm import OWASPLLMFramework
from sentinel.compliance.frameworks import FRAMEWORK_REGISTRY
from sentinel.compliance.registry import get_framework_evaluator, list_framework_ids
from sentinel.compliance.configs.framework_config import FrameworkConfig

TENANT = "test-tenant-001"

GOOD_SIGNALS = {
    "policy_violations": 0,
    "hitl_triggered": True,
    "circuit_breaker_state": "closed",
    "audit_log": True,
    "golden_source_empty": False,
    "semantic_drift_score": 0.05,
}

BAD_SIGNALS = {
    "policy_violations": 3,
    "hitl_triggered": False,
    "circuit_breaker_state": "open",
    "audit_log": False,
    "golden_source_empty": True,
    "semantic_drift_score": 0.9,
}


class TestModels:
    def test_control_status_values(self):
        assert ControlStatus.PASS == "pass"
        assert ControlStatus.FAIL == "fail"
        assert ControlStatus.NA == "na"

    def test_control_definition(self):
        c = ControlDefinition(control_id="X", title="T", category="C", is_organisational=False)
        assert c.control_id == "X"
        assert c.is_organisational is False

    def test_evidence_record(self):
        e = EvidenceRecord(signal_key="k", signal_value="v")
        assert e.signal_key == "k"

    def test_compliance_result_pass(self):
        r = ComplianceResult(
            tenant_id=TENANT, framework_id="eu_ai_act", control_id="C1",
            status=ControlStatus.PASS, evidence=[], remediation=None, scope_note=None
        )
        assert r.status == ControlStatus.PASS
        assert r.remediation is None

    def test_compliance_result_fail_has_remediation(self):
        r = ComplianceResult(
            tenant_id=TENANT, framework_id="eu_ai_act", control_id="C1",
            status=ControlStatus.FAIL, evidence=[],
            remediation="Fix this.", scope_note=None
        )
        assert r.remediation is not None
        assert len(r.remediation) > 0

    def test_compliance_result_na_has_scope_note(self):
        r = ComplianceResult(
            tenant_id=TENANT, framework_id="eu_ai_act", control_id="C1",
            status=ControlStatus.NA, evidence=[],
            remediation=None, scope_note="Org must provide this."
        )
        assert r.scope_note is not None


class TestEUAIAct:
    def setup_method(self):
        self.fw = EUAIActFramework()

    def test_framework_metadata(self):
        assert self.fw.framework_id == "eu_ai_act"
        assert self.fw.legal_weight == "regulatory"

    def test_get_controls(self):
        controls = self.fw.get_controls()
        assert len(controls) >= 5
        ids = [c.control_id for c in controls]
        assert "EUAI-1.1" in ids
        assert "EUAI-3.1" in ids

    def test_organisational_controls_are_na(self):
        results = self.fw.evaluate(GOOD_SIGNALS, TENANT)
        org_controls = [c for c in self.fw.get_controls() if c.is_organisational]
        for ctrl in org_controls:
            result = next(r for r in results if r.control_id == ctrl.control_id)
            assert result.status == ControlStatus.NA
            assert result.scope_note is not None, f"{ctrl.control_id} NA must have scope_note"

    def test_good_signals_produce_passes(self):
        results = self.fw.evaluate(GOOD_SIGNALS, TENANT)
        non_org = [r for r in results if r.status != ControlStatus.NA]
        assert any(r.status == ControlStatus.PASS for r in non_org)

    def test_bad_signals_produce_fails(self):
        results = self.fw.evaluate(BAD_SIGNALS, TENANT)
        non_org = [r for r in results if r.status != ControlStatus.NA]
        assert any(r.status == ControlStatus.FAIL for r in non_org)

    def test_fail_has_remediation(self):
        results = self.fw.evaluate(BAD_SIGNALS, TENANT)
        for r in results:
            if r.status == ControlStatus.FAIL:
                assert r.remediation is not None, f"{r.control_id} FAIL must have remediation"

    def test_pass_has_evidence(self):
        results = self.fw.evaluate(GOOD_SIGNALS, TENANT)
        for r in results:
            if r.status == ControlStatus.PASS:
                assert len(r.evidence) > 0, f"{r.control_id} PASS must have evidence"

    def test_no_fake_pass_without_signal(self):
        results = self.fw.evaluate({}, TENANT)
        for r in results:
            assert r.status != ControlStatus.PASS, f"{r.control_id} must not PASS when no signal"


class TestAllFrameworks:
    @pytest.mark.parametrize("fw_cls", [
        EUAIActFramework, SOC2Framework, ISO27001Framework,
        NISTAIRMFFramework, GDPRFramework, HIPAAFramework, OWASPLLMFramework
    ])
    def test_framework_has_required_attrs(self, fw_cls):
        fw = fw_cls()
        assert fw.framework_id != ""
        assert fw.display_name != ""
        assert fw.legal_weight in ("regulatory", "contractual", "best-practice", "informational")

    @pytest.mark.parametrize("fw_cls", [
        EUAIActFramework, SOC2Framework, ISO27001Framework,
        NISTAIRMFFramework, GDPRFramework, HIPAAFramework, OWASPLLMFramework
    ])
    def test_evaluate_returns_results(self, fw_cls):
        fw = fw_cls()
        results = fw.evaluate(GOOD_SIGNALS, TENANT)
        assert len(results) > 0

    @pytest.mark.parametrize("fw_cls", [
        EUAIActFramework, SOC2Framework, ISO27001Framework,
        NISTAIRMFFramework, GDPRFramework, HIPAAFramework, OWASPLLMFramework
    ])
    def test_org_controls_are_always_na(self, fw_cls):
        fw = fw_cls()
        controls = fw.get_controls()
        results = fw.evaluate(GOOD_SIGNALS, TENANT)
        results_by_id = {r.control_id: r for r in results}
        for ctrl in controls:
            if ctrl.is_organisational:
                r = results_by_id.get(ctrl.control_id)
                if r:
                    assert r.status == ControlStatus.NA, (
                        f"{fw.framework_id}/{ctrl.control_id} org control must be NA"
                    )

    @pytest.mark.parametrize("fw_cls", [
        EUAIActFramework, SOC2Framework, ISO27001Framework,
        NISTAIRMFFramework, GDPRFramework, HIPAAFramework, OWASPLLMFramework
    ])
    def test_fail_records_have_remediation(self, fw_cls):
        fw = fw_cls()
        results = fw.evaluate(BAD_SIGNALS, TENANT)
        for r in results:
            if r.status == ControlStatus.FAIL:
                assert r.remediation is not None and len(r.remediation) > 0, (
                    f"{fw.framework_id}/{r.control_id} FAIL must have non-null remediation"
                )

    @pytest.mark.parametrize("fw_cls", [
        EUAIActFramework, SOC2Framework, ISO27001Framework,
        NISTAIRMFFramework, GDPRFramework, HIPAAFramework, OWASPLLMFramework
    ])
    def test_na_records_have_scope_note(self, fw_cls):
        fw = fw_cls()
        results = fw.evaluate(GOOD_SIGNALS, TENANT)
        for r in results:
            if r.status == ControlStatus.NA:
                assert r.scope_note is not None and len(r.scope_note) > 0, (
                    f"{fw.framework_id}/{r.control_id} NA must have scope_note"
                )

    @pytest.mark.parametrize("fw_cls", [
        EUAIActFramework, SOC2Framework, ISO27001Framework,
        NISTAIRMFFramework, GDPRFramework, HIPAAFramework, OWASPLLMFramework
    ])
    def test_no_pass_on_missing_signals(self, fw_cls):
        fw = fw_cls()
        results = fw.evaluate({}, TENANT)
        for r in results:
            assert r.status != ControlStatus.PASS, (
                f"{fw.framework_id}/{r.control_id} must not PASS when signals empty"
            )


class TestRegistry:
    def test_framework_registry_has_all_ids(self):
        expected = {"eu_ai_act", "soc2", "iso27001", "nist_ai_rmf", "gdpr", "hipaa", "owasp_llm"}
        assert expected.issubset(set(FRAMEWORK_REGISTRY.keys()))

    def test_get_framework_evaluator(self):
        fw = get_framework_evaluator("eu_ai_act")
        assert fw.framework_id == "eu_ai_act"

    def test_get_framework_evaluator_unknown_raises(self):
        with pytest.raises(KeyError):
            get_framework_evaluator("unknown_framework_xyz")

    def test_list_framework_ids(self):
        ids = list_framework_ids()
        assert "eu_ai_act" in ids
        assert len(ids) == 11


class TestFrameworkConfig:
    def test_default_config_loads(self):
        cfg = FrameworkConfig(tenant_id=TENANT)
        assert cfg.is_enabled("eu_ai_act") is True
        assert cfg.is_enabled("hipaa") is False

    def test_enabled_frameworks(self):
        cfg = FrameworkConfig(tenant_id=TENANT)
        enabled = cfg.enabled_frameworks()
        assert "eu_ai_act" in enabled
        assert "hipaa" not in enabled

    def test_tenant_override(self):
        cfg = FrameworkConfig(tenant_id=TENANT, overrides={"hipaa": {"enabled": True}})
        assert cfg.is_enabled("hipaa") is True

    def test_threshold_lookup(self):
        cfg = FrameworkConfig(tenant_id=TENANT)
        assert cfg.get_threshold("eu_ai_act", "policy_violations_max") == 0
        assert cfg.get_threshold("eu_ai_act", "nonexistent", default=99) == 99
