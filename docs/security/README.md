# Security

How Sentinel defends the request path, and how it isolates and authorises the
people and organisations using it.

| Document | What it covers |
|---|---|
| [security-model.md](security-model.md) | Security architecture and threat model, with the implementation backing each claim |
| [guardrails.md](guardrails.md) | The two guardrail layers — governance pipeline before the LLM, verification pipeline after it — and how to tune detection thresholds |
| [policy-language.md](policy-language.md) | The YAML configuration surface and the Python rule engine used to express governance rules |

## Access, tenancy and identity

| Document | What it covers |
|---|---|
| [rbac/ARCHITECTURE.md](rbac/ARCHITECTURE.md) | Role depth beyond flat roles, JIT privilege elevation with approver trail, and MFA enrollment inventory |
| [multi-tenancy/ARCHITECTURE.md](multi-tenancy/ARCHITECTURE.md) | The source of truth for org isolation: required reading before adding a table, query, route or page |
| [multi-tenancy/DBA_RUNBOOK.md](multi-tenancy/DBA_RUNBOOK.md) | Database operator procedures for tenant isolation |
| [sso/ARCHITECTURE.md](sso/ARCHITECTURE.md) | SAML 2.0, OIDC and SCIM 2.0 support and how they are wired |
| [sso/INTEGRATION.md](sso/INTEGRATION.md) | Configuring a real identity provider against that infrastructure |

## Related

- [Writing policies](../guides/writing-policies.md)
- [Policy Firewall & Guardrails module](../modules/policy-firewall.md)
- [Security Intelligence module](../modules/security-intelligence.md)
- [GDPR / HIPAA PII handling](../compliance/gdpr-hipaa-pii.md)
- Vulnerability reporting: [`SECURITY.md`](../../SECURITY.md)
