# Bias & Fairness Audits

**Route:** `/bias`, `/bias-audits` · **Services:** `biasAuditService.ts`, `biasAuditsService.ts`

## Purpose
Detect, measure, and remediate unjust disparate impact of AI systems across protected classes and business-relevant cohorts — pre-deployment and continuously in production.

## Standards Alignment
| Control | Requirement |
|---|---|
| EU AI Act Art.10(2)(f)(g) | Examination of datasets for bias |
| EU AI Act Art.15 | Accuracy and non-discrimination |
| NIST AI RMF MEASURE 2.11 | Fairness and bias evaluated |
| NIST SP 1270 | Towards a Standard for Identifying and Managing Bias |
| NYC LL 144 | Automated employment decision tools bias audit |
| EEOC UGESP | Four-fifths rule |
| ISO/IEC TR 24027 | Bias in AI systems |

## Metrics Supported
Demographic parity, equal opportunity, equalised odds, predictive parity, disparate-impact ratio, calibration by group, counterfactual fairness.

## Audit Workflow
Scope (decision, population, protected classes) → Dataset sampling with statistical-power target → Compute metrics → Threshold comparison → Root cause (data, label, model, threshold) → Remediation plan → Re-audit.

## Outputs
Regulator-ready bias-audit report (NYC LL 144 template supported), linked to Model Inventory record and Risk Register.
