# Audit Management

**Route:** `/audits` · **Backing:** `audits` + `audit_findings` (org-scoped RLS)

Internal/external/regulator audit planning with real findings. Interlinks: findings → controls (`linked_control_id`), findings → remediation plans (`remediation_plans.source_type='audit_finding'`, `source_id=finding_ref` — the seeded AF-007 resolves the remediation seed's reference). No invented "audit score".
