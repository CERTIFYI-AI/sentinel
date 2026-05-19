# Sentinel AI GRC — Release Checkpoints

Engineering milestones and deployment notes, ordered newest first.

---

## 2026-04-21 — v1.0.0 Full Backend Integration

**Commit:** `4195e21` on `main`

### What shipped
- Full Supabase backend integration across all 96 files — zero mock data remaining
- All 29 service files corrected to target production table names and column schemas
- 14 new React hooks covering ESG, Energy, Model Efficiency, Committees, and Gap Analysis
- Complete seed dataset: 19 tables populated (risks, incidents, vendors, bias audits, evidence, maturity assessments, security threats/scans/vulnerabilities, red team campaigns, conformity assessments, exceptions, consent records, DSAR requests, tasks, remediation plans, ESG reports, energy metrics, model efficiency)
- Realtime subscriptions verified for all 9 Organization module tables

### Migration history (applied to production)
| Migration | Tables seeded |
|-----------|--------------|
| `p1_create_new_tables` | esg_reports, energy_metrics, model_efficiency (with RLS) |
| `p2a_risks_incidents_vendors_bias` | 12 risks, 8 incidents, 8 vendors, 6 bias audits |
| `p2d_maturity_security_redteam` | maturity, threats, scans, vulns, red_team, exceptions |
| `p2g_conformity_assessments_fw_corrected` | 4 conformity assessments |
| `p2f_consent_dsar` | 6 consent records, 6 DSAR requests |
| `p2h_tasks_remediation_plans` | 8 tasks, 9 remediation plans |
| `p2i_esg_energy_model_efficiency` | 4 ESG reports, 8 energy metrics, 6 model efficiency |
| `p2j_evidence_records` | 10 evidence records |

---

## 2026-04-20 — Organization Module Realtime

- `useRealtimeInvalidation.ts` extended with 5 missing Organization tables: `assets`, `bia_processes`, `committees`, `identities`, `roles`
- Aligned existing query keys: `ethics_reports`, `training_courses`, `bcp_plans`, `bias_audits`
- All 9 Organization module tables confirmed: `rls_enabled = true`, `realtime = true`
- Coverage: Access Control, Committee Management, Training, Maturity, Continuity, Ethics Reporting, Asset Registry, Identity Governance, Business Impact

---

## 2026-04-18 — v1.0.0 Launch

Initial production release. See [CHANGELOG.md](CHANGELOG.md) for full feature list.
