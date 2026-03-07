"Tests for the compliance engine and all 7 frameworks."
import pytest
from sentinel.compliance.evidence_store import EvidenceStore, EvidenceRecord
from sentinel.compliance.report_builder import ReportBuilder
from sentinel.compliance.frameworks.base import ControlStatus, Control, FrameworkStatus, FrameworkMetadata

TENANT = 'test-tenant-001'

GOOD_SIGNALS = {
    'policy_violations': 0,
    'hitl_triggered': True,
    'circuit_breaker_state': 'closed',
    'audit_log': True,
    'golden_source_empty': False,
    'semantic_drift_score': 0.05,
    'pii_detected': False,
    'consent_recorded': True,
    'data_retained_days': 180,
    'bias_score': 0.02,
    'accuracy_score': 0.92,
    'explainability_enabled': True,
    'incident_reported': True,
    'vulnerability_scan_passed': True,
    'transparency_doc_published': True,
    'data_minimisation_applied': True,
    'purpose_limitation_enforced': True,
    'risk_assessment_completed': True,
    'model_card_published': True,
    'human_oversight_enabled': True,
    'logging_enabled': True,
    'monitoring_enabled': True,
}

BAD_SIGNALS = {
    'policy_violations': 5,
    'hitl_triggered': False,
    'circuit_breaker_state': 'open',
    'audit_log': False,
    'golden_source_empty': True,
    'semantic_drift_score': 0.85,
    'pii_detected': True,
    'consent_recorded': False,
    'data_retained_days': 1200,
    'bias_score': 0.45,
    'accuracy_score': 0.40,
    'explainability_enabled': False,
    'incident_reported': False,
    'vulnerability_scan_passed': False,
    'transparency_doc_published': False,
    'data_minimisation_applied': False,
    'purpose_limitation_enforced': False,
    'risk_assessment_completed': False,
    'model_card_published': False,
    'human_oversight_enabled': False,
    'logging_enabled': False,
    'monitoring_enabled': False,
}


class TestEvidenceStore:
    def test_append_and_query(self):
        store = EvidenceStore()
        rec = EvidenceRecord(
            framework_id="eu_ai_act",
            control_id="AIA-01",
            tenant_id=TENANT,
            request_id="req-001",
            status="PASS",
            evidence_text="Policy violations: 0",
        )
        store.append(rec)
        results = store.query(tenant_id=TENANT)
        assert len(results) == 1
        assert results[0].control_id == "AIA-01"

    def test_query_by_framework(self):
        store = EvidenceStore()
        for fid in ["eu_ai_act", "gdpr", "iso42001"]:
            store.append(EvidenceRecord(
                framework_id=fid,
                control_id="C-01",
                tenant_id=TENANT,
                request_id="req-001",
            ))
        results = store.query(tenant_id=TENANT, framework_id="gdpr")
        assert len(results) == 1

    def test_count(self):
        store = EvidenceStore()
        for i in range(5):
            store.append(EvidenceRecord(
                framework_id="eu_ai_act",
                control_id=f"C-{i}",
                tenant_id=TENANT,
                request_id="req-001",
            ))
        assert store.count(tenant_id=TENANT) == 5

    def test_clear(self):
        store = EvidenceStore()
        store.append(EvidenceRecord(
            framework_id="eu_ai_act",
            control_id="C-01",
            tenant_id=TENANT,
            request_id="req-001",
        ))
        store.clear()
        assert store.count() == 0


class TestEuAiActFramework:
    def test_evaluates_good_signals(self):
        from sentinel.compliance.frameworks.eu_ai_act import EUAIActFramework
        fw = EUAIActFramework()
        results = fw.evaluate(GOOD_SIGNALS, TENANT)
        assert len(results) > 0

    def test_evaluates_bad_signals(self):
        from sentinel.compliance.frameworks.eu_ai_act import EUAIActFramework
        fw = EUAIActFramework()
        results = fw.evaluate(BAD_SIGNALS, TENANT)
        fail_results = [r for r in results if r.status == ControlStatus.FAIL]
        assert len(fail_results) > 0

    def test_fail_has_remediation(self):
        from sentinel.compliance.frameworks.eu_ai_act import EUAIActFramework
        fw = EUAIActFramework()
        results = fw.evaluate(BAD_SIGNALS, TENANT)
        for r in results:
            if r.status == ControlStatus.FAIL:
                assert r.remediation is not None and len(r.remediation) > 0

    def test_legal_weight_is_mandatory(self):
        from sentinel.compliance.frameworks.eu_ai_act import EUAIActFramework
        fw = EUAIActFramework()
        meta = fw.get_metadata()
        assert meta.legal_weight == "mandatory-law"


class TestGdprFramework:
    def test_evaluates(self):
        from sentinel.compliance.frameworks.gdpr import GDPRFramework
        fw = GDPRFramework()
        results = fw.evaluate(GOOD_SIGNALS, TENANT)
        assert len(results) > 0

    def test_legal_weight_is_mandatory(self):
        from sentinel.compliance.frameworks.gdpr import GDPRFramework
        fw = GDPRFramework()
        meta = fw.get_metadata()
        assert meta.legal_weight == "mandatory-law"


class TestIso42001Framework:
    def test_evaluates(self):
        from sentinel.compliance.frameworks.iso42001 import ISO42001Framework
        fw = ISO42001Framework()
        results = fw.evaluate(GOOD_SIGNALS, TENANT)
        assert len(results) > 0

    def test_framework_id(self):
        from sentinel.compliance.frameworks.iso42001 import ISO42001Framework
        fw = ISO42001Framework()
        meta = fw.get_metadata()
        assert meta.framework_id == "iso42001"

    def test_no_iso27001_id(self):
        from sentinel.compliance.frameworks.iso42001 import ISO42001Framework
        fw = ISO42001Framework()
        meta = fw.get_metadata()
        assert "27001" not in meta.framework_id


class TestNistAiRmfFramework:
    def test_evaluates(self):
        from sentinel.compliance.frameworks.nist_ai_rmf import NISTAIRMFFramework
        fw = NISTAIRMFFramework()
        results = fw.evaluate(GOOD_SIGNALS, TENANT)
        assert len(results) > 0


class TestChinaAiRegsFramework:
    def test_evaluates(self):
        from sentinel.compliance.frameworks.china_ai_regs import ChinaAIRegsFramework
        fw = ChinaAIRegsFramework()
        results = fw.evaluate(GOOD_SIGNALS, TENANT)
        assert len(results) > 0


class TestOecdPrinciplesFramework:
    def test_evaluates(self):
        from sentinel.compliance.frameworks.oecd_principles import OECDPrinciplesFramework
        fw = OECDPrinciplesFramework()
        results = fw.evaluate(GOOD_SIGNALS, TENANT)
        assert len(results) > 0


class TestIeee7000Framework:
    def test_evaluates(self):
        from sentinel.compliance.frameworks.ieee7000 import IEEE7000Framework
        fw = IEEE7000Framework()
        results = fw.evaluate(GOOD_SIGNALS, TENANT)
        assert len(results) > 0


class TestReportBuilder:
    def _make_fw_status(self, framework_id, legal_weight="voluntary"):
        meta = FrameworkMetadata(
            framework_id=framework_id,
            display_name=framework_id,
            version="1.0",
            legal_weight=legal_weight,
            country="Global",
        )
        controls = [
            Control(
                control_id="C-01",
                title="Test Control",
                status=ControlStatus.PASS,
                category="test",
                signal_source="test",
                signal_value=True,
            ),
            Control(
                control_id="C-02",
                title="Test Control 2",
                status=ControlStatus.FAIL,
                category="test",
                signal_source="test",
                signal_value=False,
                remediation="Fix this",
            ),
            Control(
                control_id="C-03",
                title="Test Control 3",
                status=ControlStatus.NA,
                category="test",
                signal_source="",
                signal_value=None,
                scope_note="Not applicable",
            ),
        ]
        return FrameworkStatus(metadata=meta, controls=controls)

    def test_build_report(self):
        builder = ReportBuilder()
        fw_status = self._make_fw_status("test_fw")
        report = builder.build_report(TENANT, [fw_status])
        assert report.tenant_id == TENANT
        assert len(report.frameworks) == 1

    def test_compliance_score_excludes_na(self):
        builder = ReportBuilder()
        fw_status = self._make_fw_status("test_fw")
        report = builder.build_report(TENANT, [fw_status])
        assert report.summary["compliance_score"] == 50.0

    def test_fail_has_remediation_in_report(self):
        builder = ReportBuilder()
        fw_status = self._make_fw_status("test_fw")
        report = builder.build_report(TENANT, [fw_status])
        fw_data = report.frameworks[0]
        for ctrl in fw_data["controls"]:
            if ctrl["status"] == "FAIL":
                assert ctrl["remediation"] is not None
