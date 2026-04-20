# Red Team & Evaluations

**Route:** `/evals`, `/red-team-findings`, `/benchmark`, `/model-efficiency` · **Services:** `redTeamService.ts`, `redTeamFindingsService.ts`, `modelArenaService.ts`

## Purpose
Structured adversarial testing and offline/online evaluation of models, prompts, and end-to-end applications covering safety, security, quality, fairness, and robustness.

## Standards Alignment
| Control | Requirement |
|---|---|
| EU AI Act Art.15 | Accuracy, robustness, cybersecurity |
| EU AI Act Art.55 | Systemic-risk GPAI model evaluation and red-teaming |
| NIST AI RMF MEASURE 2.1–2.11 | Test, evaluation, verification, validation |
| ISO/IEC 42001 A.6.2.4 | AI system verification and validation |
| OWASP LLM Top 10 | Full coverage |
| MITRE ATLAS | Adversarial ML TTPs |

## Evaluation Types
- **Golden-set regression** — labeled fixtures, run on every model/policy change.
- **Adversarial suite** — prompt injection, jailbreaks, data exfiltration, bias probes.
- **Online evals** — LLM-as-judge on sampled production traffic.
- **Model arena** — A/B between model versions with paired rater scoring.

## Findings Workflow
Finding → Severity (CVSS-style for AI + impact) → Owner → Remediation task → Re-test → Close with evidence. High/critical findings feed Incident and Regulator-Filing modules where applicable.

## Evidence
Eval run manifests (inputs, outputs, judge prompts, scores, model versions, policy versions) are hashed into `evidence_chain`, satisfying the Art.15/55 documentation expectation.
