---
name: Security report (non-sensitive)
about: Report a NON-SENSITIVE security concern. For exploitable vulnerabilities, see SECURITY.md and use private disclosure.
title: "[security] "
labels: ["security", "triage"]
assignees: []
---

> **STOP — Are you reporting an exploitable vulnerability?**
>
> Do **NOT** open a public issue. Follow the private disclosure process in [`SECURITY.md`](../../SECURITY.md):
>
> - Email: **security@certifyi.ai**
> - Or use GitHub's private "Report a vulnerability" tab on this repository.
>
> Public disclosure of an unpatched vulnerability puts every Sentinel deployment at risk, including hospitals, banks, and public-sector users running EU AI Act / GDPR / ISO 42001 workloads on this codebase.

---

## Type of report

<!-- Check one. If you checked the first box, close this issue and email security@certifyi.ai instead. -->

- [ ] Exploitable vulnerability (STOP — use private disclosure)
- [ ] Hardening suggestion / defense-in-depth improvement
- [ ] Documentation gap in SECURITY.md, threat model, or compliance mapping
- [ ] Dependency / supply-chain concern (already public CVE)
- [ ] Question about Sentinel's security posture

## Summary

<!-- One- or two-sentence description. Do NOT include exploit details, payloads, PoC URLs, or credentials. -->

## Affected component

- [ ] Dashboard (React / Vite frontend)
- [ ] Cloudflare Worker (`workers/`)
- [ ] Supabase schema, RLS policies, or SECURITY DEFINER functions
- [ ] CI / GitHub Actions workflow
- [ ] Documentation
- [ ] Other:

## Version / commit

- Sentinel version or commit SHA:
- Browser / OS (if frontend):
- Supabase region (if applicable):

## Impact (without PoC)

<!-- Describe the *category* of risk (e.g. "potential CSRF on settings endpoint", "weak audit-log integrity guarantee") without giving step-by-step reproduction. -->

## Suggested remediation (optional)

<!-- Patch sketch, control reference (NIST AI RMF, ISO 27001, OWASP ASVS, EU AI Act Art. X), or link to prior art. -->

## Compliance / regulatory mapping (optional)

- [ ] EU AI Act
- [ ] GDPR
- [ ] ISO 42001
- [ ] ISO 27001
- [ ] SOC 2
- [ ] NIST AI RMF
- [ ] HIPAA
- [ ] Other:

## Confirmation

- [ ] I confirm this report contains **no** exploit code, working PoC, credentials, customer data, or other sensitive material.
- [ ] I have read [`SECURITY.md`](../../SECURITY.md) and [`CODE_OF_CONDUCT.md`](../../CODE_OF_CONDUCT.md).
- [ ] I understand maintainers may convert this issue to a private security advisory if it is more sensitive than I assessed.
