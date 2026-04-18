# Sentinel AI GRC

**Governance, Risk & Compliance for production AI systems.**

Sentinel is an open-source platform for organizations deploying AI in regulated
environments. It provides continuous compliance monitoring against EU AI Act,
ISO 42001, NIST AI RMF, GDPR, SOC 2, and ISO 27001 with built-in model
lifecycle governance, bias auditing, vendor risk management, and a real-time
trust engine.

---

## Why Sentinel

Enterprise AI deployments face overlapping regulatory obligations with no
unified tooling. Security teams manage model risk in spreadsheets. Compliance
teams track evidence manually. Engineering teams have no visibility into
downstream governance requirements.

Sentinel closes that gap.

---

## Core Modules

| Module | Purpose |
|--------|--------|
| **Model Registry** | EU AI Act compliant inventory with risk classification, fairness tracking, drift monitoring |
| **Trust Engine** | Real-time guardrail evaluation, live traces, cost attribution, fallback chains |
| **Compliance** | Multi-framework control mapping across EU AI Act, ISO 42001, NIST AI RMF, GDPR, SOC 2 |
| **Risk Register** | ISO 31000 risk management with 5x5 matrix, treatment plans, residual scoring |
| **Bias Audits** | Fairness assessment with protected attribute analysis and remediation workflows |
| **Agent Governance** | Discovery, IAM, choreography, and kill-switch for AI agent fleets |
| **Vendor Registry** | Third-party AI risk with DPA tracking, concentration analysis, attestation management |
| **Evidence Vault** | Cryptographically chained compliance evidence for audit readiness |
| **HITL Reviews** | Human-in-the-loop oversight queue per EU AI Act Art. 14 |
| **Incident Response** | AI-specific incident workflows with regulatory notification timers |

---

## Architecture

```
sentinel/
  dashboard/          # React 18 + TypeScript + Vite frontend
    src/
      api/            # Supabase-backed service layer
      components/     # UI component library
      hooks/          # React Query data hooks
      pages/          # Route-level page components
      stores/         # Zustand state management
      lib/            # Supabase client, utilities
  supabase/
    migrations/       # PostgreSQL schema (versioned)
    functions/        # Edge functions
  server/             # Node.js API layer
  sentinel/           # Python backend (FastAPI)
  docs/               # Architecture and API documentation
```

**Stack:** React 18, TypeScript, Vite, Zustand, TanStack Query, Supabase, Cloudflare Workers, Radix UI, Recharts

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Supabase account (free tier works for development)

### Installation

```bash
git clone https://github.com/CERTIFYI-AI/sentinel.git
cd sentinel/dashboard
npm install
```

### Configuration

```bash
cp .env.example .env.local
```

Add your Supabase credentials to `.env.local`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Database Setup

```bash
npx supabase db push
npm run seed
```

### Development

```bash
npm run dev          # http://localhost:5173
npm run typecheck    # TypeScript validation
npm run test         # Unit tests
```

### Demo

The platform runs in demo mode without a Supabase connection. All modules display representative data from `dashboard/src/data/`.

**Demo credentials (after seed):**
- Email: admin@sentinel-financial.com
- Password: Sentinel2026!

---

## Compliance Coverage

| Framework | Coverage |
|-----------|----------|
| EU AI Act | Art. 6-7 risk classification, Art. 9 risk management, Art. 10 data governance, Art. 13 transparency, Art. 14 human oversight, Art. 72 post-market surveillance |
| ISO 42001 | Clause 6.1 risk identification, Clause 8.3 AI system lifecycle, Clause 9.1 monitoring |
| NIST AI RMF | GOVERN, MAP, MEASURE, MANAGE functions |
| GDPR | Art. 22 automated decisions, Art. 35 DPIA, Art. 83 enforcement |
| SOC 2 | CC6.1 access controls, CC7.1 threat detection |
| ISO 27001 | A.8 information security, A.15 supplier relationships |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Apache 2.0. See [LICENSE](LICENSE).
