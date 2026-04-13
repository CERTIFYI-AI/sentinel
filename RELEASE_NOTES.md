# Sentinel AI GRC v0.1.0-alpha

## What is Sentinel AI GRC?

Sentinel AI GRC is an open-source enterprise platform for AI governance, risk management, and regulatory compliance. It provides compliance teams, CISOs, and AI program managers with structured tooling to govern AI systems across the full model lifecycle — from inventory and risk assessment through audit, evidence collection, and regulatory reporting.

## Supported Compliance Frameworks

- SOC 2 (Type I and Type II)
- ISO 27001:2022
- ISO 42001 (AI Management Systems)
- NIST AI Risk Management Framework (AI RMF 1.0)
- EU AI Act
- GDPR

## What's Included in This Release

- Executive dashboard with compliance posture monitoring and risk heatmaps
- Multi-framework compliance engine with control mapping across all six supported frameworks
- AI model inventory and lifecycle management with AIBOM registry support
- Role-based access control (RBAC) with multi-tenant isolation
- Evidence management with chain-of-custody tracking
- Human-in-the-loop (HITL) review queue and workflow management
- FastAPI/Python backend with PostgreSQL and Redis
- React 18 / TypeScript 5 dashboard with shadcn/ui components
- Docker Compose deployment with hardened service configuration

## Known Limitations (Alpha)

- SSO (SAML/OIDC) integration is not yet included in this release
- Automated evidence collection connectors (AWS, GCP, Azure) are under development
- Framework crosswalk mapping (control overlap analysis) is partial
- Public API and SDK have not been stabilized
- OWASP AI Top 10 framework support is planned for a future release
- Test coverage is below production target; contributions welcome

## Getting Started

```bash
git clone https://github.com/CERTIFYI-AI/sentinel.git
cd sentinel
cp .env.example .env
# Populate all required values in .env
bash scripts/preflight-check.sh
docker compose up -d
```

See [README.md](README.md) for full setup instructions.

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. All submissions must pass the CI pipeline including TypeScript type checking, linting, Python tests, and security scanning.

## Security Reporting

Do not report security vulnerabilities via public GitHub issues. Email `security@certifyi.com` with details. We target a 72-hour initial response for confirmed vulnerabilities.

---

Released under the Apache 2.0 License. Copyright 2024-2026 CERTIFYI AI.
