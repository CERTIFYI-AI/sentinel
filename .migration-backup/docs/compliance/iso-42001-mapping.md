# ISO 42001 Control Mapping

This document maps Certifyi Sentinel features to ISO/IEC 42001:2023 AI Management System controls.

## Scope

ISO 42001 is the international standard for AI management systems. The controls below correspond
to Sentinel's automated governance layer.

## Control Mapping Table

| ISO 42001 Control | Control Description | Sentinel Feature | Status |
|---|---|---|---|
| 6.1.2 | AI risk assessment | Trust score pipeline | Implemented |
| 6.1.3 | AI risk treatment | Circuit breaker cascade | Implemented |
| 8.4 | AI system operation | Proxy middleware | Implemented |
| 8.5 | AI system output review | Verifier layer (NLI) | Implemented |
| 9.1 | Monitoring & measurement | Audit hash chain | Implemented |
| 9.2 | Internal audit | Audit logger + export | Implemented |
| A.6.1 | Intended use | Policy engine rules | Implemented |
| A.6.2 | AI system impact assessment | Compliance engine | Implemented |
| A.8.3 | Data governance for AI | PII sanitizer | Implemented |
| A.8.4 | Logging & monitoring | Immutable audit chain | Implemented |

## Audit Evidence

Evidence packages can be exported via the Sentinel CLI:

```bash
sentinel compliance export --framework iso-42001 --output evidence/
```

## Certification Notes

- Sentinel automates evidence collection for ISO 42001 Annex A controls
- The immutable audit chain provides tamper-evident logs required by clause 9.1
- Trust score thresholds map to AI risk treatment plans (clause 6.1.3)
