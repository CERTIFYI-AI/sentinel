# Changelog

All notable changes to this project will be documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Phase 2 QA/QC audit deliverables (`docs/audit/AUDIT_REPORT.md`, `docs/audit/schema_delta.md`)
  documenting 144 Supabase security-advisor findings (1 ERROR, 77 WARN, 66 INFO),
  356 performance-advisor findings, and a full mapping of the live 144-table schema
  against the §2.3 11-table compliance-kernel target.
- `.github/ISSUE_TEMPLATE/security_report.md` for non-sensitive security reports,
  with a hard redirect to private disclosure (`SECURITY.md` / security@certifyi.ai)
  for exploitable vulnerabilities.

### Security

- Catalogued P0 risks for follow-up PR series:
  - 1 `security_definer_view` ERROR on `users_with_details`
  - 52 `rls_policy_always_true` policies (multi-tenant isolation gap)
  - 8 SECURITY DEFINER functions executable by `anon`, 8 by `authenticated`
  - 8 `function_search_path_mutable` warnings
  - `auth_leaked_password_protection` disabled
  - Missing Supabase token-refresh handler in dashboard client
  - Dangerous placeholder fallback in `dashboard/src/lib/supabase.ts`

### Notes

- Destructive DDL to conform live Supabase to the §2.3 11-table spec was **deliberately
  not run** against production. The conform requires a Supabase dev branch, full pgTAP
  coverage, and a staged PR series (estimated ~95 files / ~14k LOC / 3-4 weeks) before
  promotion. See `docs/audit/schema_delta.md` for the proposed sequence.

## [1.0.0] - 2026-04-18

### Added

- Model Registry with EU AI Act risk classification (Annex III)
- Trust Engine with real-time guardrail evaluation and live traces
- Multi-framework compliance tracking (EU AI Act, ISO 42001, NIST AI RMF, GDPR, SOC 2, ISO 27001)
- Risk Register with ISO 31000 5x5 matrix and treatment workflows
- Bias Audit Center with protected attribute analysis
- Agent Governance: discovery, IAM, choreography, kill-switch
- Vendor Registry with DPA tracking and concentration risk analysis
- Cryptographic evidence chain (SHA-256 tamper-evident ledger)
- HITL Reviews queue per EU AI Act Art. 14
- Incident Response with GDPR 72h and EU AI Act Art. 73 notification timers
- Data Subject Rights (DSR) management with GDPR SLA tracking
- Carbon Ledger and ESG reporting (GRI, SASB, TCFD aligned)
- AI Impact Assessment (AIIA) wizard per EU AI Act Art. 27
- DPIA workflow per GDPR Art. 35
- Post-Market Surveillance per EU AI Act Art. 72
- Supabase backend with row-level security multi-tenancy
- Real-time subscriptions for notifications, guardrails, and HITL
- Autonomous governance event bus with 10 agent types
- Cloudflare Workers deployment
