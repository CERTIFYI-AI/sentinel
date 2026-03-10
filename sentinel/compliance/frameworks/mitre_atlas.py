from __future__ import annotations
from sentinel.compliance.frameworks.base import BaseFramework, Control, ControlStatus, EvidenceRecord, FrameworkMetadata, FrameworkStatus


class MITREATLASFramework(BaseFramework):
    metadata = FrameworkMetadata(
        framework_id='mitre_atlas',
        framework_name='MITRE ATLAS',
        description='MITRE ATLAS v4.5 adversarial threat landscape for AI',
        status=FrameworkStatus.TECH_STANDARD,
        jurisdiction='Global',
        enforcement_date='Since 2024',
        sentinel_coverage_note='AI adversarial threat detection and defence controls',
    )

    controls = [
        Control('recon01', 'Model Architecture Discovery', 'AML.T0000', 'Detect reconnaissance via drift anomalies.', True),
        Control('exec04', 'Prompt Injection Execution', 'AML.T0011', 'Detect injection attacks at sanitizer layer.', True),
        Control('collect09', 'Data Exfiltration via LLM', 'AML.T0030', 'Prevent data exfiltration via PII masking.', True),
    ]

    def _evaluate_control(self, control, entry, result, config):
        dispatch = {'recon01': self._recon01, 'exec04': self._exec04, 'collect09': self._collect09}
        return dispatch[control.control_id](control, entry, result, config)

    def _r(self, c, s, sc, sig, val, txt, rem=None):
        return EvidenceRecord(control_id=c.control_id, framework_id=self.metadata.framework_id, framework_name=self.metadata.framework_name, control_name=c.control_name, article_ref=c.article_ref, status=s, score=sc, signal_used=sig, signal_value=val, evidence_text=txt, remediation=rem)

    def _recon01(self, c, e, r, cfg):
        drift = r.get('drift_score', 0.0)
        if drift >= 0.85:
            return self._r(c, ControlStatus.PASS, drift, 'drift_score', drift, 'No reconnaissance anomalies detected.')
        return self._r(c, ControlStatus.FAIL, drift, 'drift_score', drift, 'Potential model probing: drift anomaly detected.', 'Enable per-IP and per-session rate limiting.')

    def _exec04(self, c, e, r, cfg):
        pii_clean = r.get('pii_clean', 0.0)
        if pii_clean >= 0.92:
            return self._r(c, ControlStatus.PASS, pii_clean, 'pii_clean', pii_clean, 'Prompt injection controls active.')
        return self._r(c, ControlStatus.FAIL, pii_clean, 'pii_clean', pii_clean, 'Injection evasion detected: pii_clean below threshold.', 'Update injection pattern library.')

    def _collect09(self, c, e, r, cfg):
        pii_clean = r.get('pii_clean', 0.0)
        if pii_clean >= 0.95:
            return self._r(c, ControlStatus.PASS, pii_clean, 'pii_clean', pii_clean, 'PII masking prevents data exfiltration.')
        return self._r(c, ControlStatus.FAIL, pii_clean, 'pii_clean', pii_clean, 'Data exfiltration risk: PII masking insufficient.', 'Immediate Presidio review required.')
