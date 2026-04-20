# Security Intelligence (summary)

**Routes:** `/security`, `/attack-surface`, `/security-scans` · **Services:** `securityService.ts`, `securityScansService.ts`, `attackSurfaceService.ts`

See [`../SECURITY_MODULE.md`](../SECURITY_MODULE.md) for the full specification.

## Standards Alignment
| Control | Requirement |
|---|---|
| ISO/IEC 27001:2022 A.8 | Technological controls |
| NIST CSF DETECT + RESPOND | Detection and response |
| MITRE ATT&CK + ATLAS | Coverage mapping |
| CIS Controls v8 | Baseline cyber hygiene |
| EU AI Act Art.15 | AI cybersecurity |

## Scope
Attack-surface management, scheduled and on-demand scans, CVE triage, AI-specific attack detection (prompt-injection chains, model-exfiltration, training-data poisoning signals), and SIEM forwarding.
