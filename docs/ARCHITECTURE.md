# Sentinel AI GRC — Architecture

> System architecture reference for the Sentinel AI Governance, Risk & Compliance platform.

## Overview

Sentinel is an enterprise AI GRC platform with a React SPA frontend and a Python/FastAPI backend, backed by PostgreSQL (Supabase) with row-level security for multi-tenant isolation. The architecture is designed around three principles:

1. **Full lifecycle coverage** — Every stage of AI governance from model registration through continuous monitoring and audit evidence collection.
2. **Multi-tenant by default** — Row-level security ensures complete tenant isolation at the database layer.
3. **Modular and extensible** — 55+ modules organized by functional area, each independently navigable and deployable.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                     │
│         Browser (React SPA)  │  API Consumers  │  CI/CD Pipelines   │
└──────────────┬───────────────┴────────┬────────┴───────────┬────────┘
               │                        │                    │
               │  HTTPS                 │  REST API          │  Webhooks
               ▼                        ▼                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      LOAD BALANCER / CDN                            │
│                   (Vercel / Cloudflare / ALB)                       │
└──────────────┬──────────────────────────────────┬───────────────────┘
               │                                  │
               ▼                                  ▼
┌──────────────────────────┐    ┌──────────────────────────────────────┐
│    DASHBOARD (React SPA) │    │         API LAYER (FastAPI)          │
│                          │    │                                      │
│  ● React 18 + TypeScript │    │  ● Python 3.11+                     │
│  ● Vite build system     │    │  ● Pydantic validation              │
│  ● shadcn/ui + Radix UI  │    │  ● JWT authentication               │
│  ● Tailwind CSS          │    │  ● RBAC middleware                   │
│  ● React Router v6       │    │  ● Tenant-scoped queries            │
│  ● Zustand + TanStack    │    │  ● Background task scheduler        │
│  ● Recharts              │    │  ● Event bus (pub/sub)               │
│  ● Phosphor Icons        │    │  ● Plugin system                     │
│                          │    │                                      │
│  dashboard/              │    │  sentinel/                           │
└──────────────────────────┘    └──────────────┬───────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER (Supabase)                         │
│                                                                     │
│  ┌─────────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  PostgreSQL      │  │  pgvector     │  │  Row-Level Security   │  │
│  │  45+ tables      │  │  Embeddings   │  │  Tenant isolation     │  │
│  │  Migrations      │  │  Golden src   │  │  Policy enforcement   │  │
│  └─────────────────┘  └──────────────┘  └────────────────────────┘  │
│                                                                     │
│  ┌─────────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  Audit log       │  │  Blob storage │  │  Realtime             │  │
│  │  Hash-chained    │  │  Evidence     │  │  (planned)            │  │
│  │  Append-only     │  │  Documents    │  │  WebSocket feeds      │  │
│  └─────────────────┘  └──────────────┘  └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Module Map

The platform's 55+ modules are organized into 9 functional sections:

```
SENTINEL AI GRC
│
├── OVERVIEW
│   ├── Executive Dashboard
│   └── Compliance Reporting
│
├── AI GOVERNANCE
│   ├── Model Inventory
│   │   └── Model Lifecycle
│   ├── Trust Engine
│   │   ├── Guardrails
│   │   ├── Live Traces
│   │   ├── Cost & Tokens
│   │   ├── Fallback Log
│   │   ├── Tool Monitor
│   │   └── Configuration
│   ├── Agent Discovery
│   │   └── Shadow AI Detection
│   ├── Bias Audits
│   ├── AI Impact Assessments (AIIA / DPIA)
│   ├── Explainability Center
│   └── Use Case Registry
│
├── SECURITY
│   └── Security Overview
│       ├── Threat Feed
│       ├── Scan Center
│       ├── Attack Surface Mapping
│       ├── Vulnerability Tracker
│       ├── Red Team Lab
│       ├── Policy Firewall
│       ├── Keys Vault
│       ├── Model Arena
│       └── Security Reports
│
├── COMPLIANCE
│   ├── Compliance Dashboard
│   ├── Framework Management
│   ├── Controls Library (ToD / ToE)
│   ├── Audit Management
│   ├── Evidence Sync
│   │   ├── Evidence Hub
│   │   └── Evidence Vault
│   ├── Gap Analysis
│   ├── Conformity Assessment
│   ├── Policy Management
│   │   ├── Policy Templates
│   │   └── Policy Editor
│   ├── Compliance Calendar
│   ├── Document Management
│   └── Immutable Audit Trail
│
├── RISK & INCIDENTS
│   ├── Risk Register
│   │   └── Risk Matrix (5×5 heat map)
│   ├── Incident Management
│   │   ├── Incident Workflow
│   │   ├── Remediation
│   │   └── Remediation Tracker
│   └── Exception Management
│
├── EVALUATIONS
│   ├── Quality Metrics
│   │   ├── Eval Techniques
│   │   └── Benchmarking
│   ├── Dataset Registry
│   └── Data Governance
│
├── OPERATIONS
│   ├── HITL Review Center
│   ├── Vendor Management
│   ├── Regulatory Radar
│   ├── Approval Workflows
│   ├── Notifications
│   └── Export Center
│
├── ORGANIZATION
│   ├── Training & Awareness
│   ├── Access Control (RBAC)
│   │   ├── Role Manager
│   │   └── User Manager
│   ├── Benchmarking & Maturity
│   └── Business Continuity & DR
│
└── SYSTEM
    ├── Settings
    └── AI Advisor
```

---

## Database Schema Overview

Sentinel uses PostgreSQL via Supabase with **45+ tables** organized by domain:

| Domain | Key Tables | Description |
|--------|-----------|-------------|
| **Models** | `models`, `model_versions`, `model_lifecycle_events` | AI/ML model inventory and lifecycle tracking |
| **Trust** | `trust_scores`, `traces`, `guardrail_rules`, `fallback_events` | Runtime trust monitoring and guardrail enforcement |
| **Compliance** | `frameworks`, `controls`, `control_tests`, `evidence`, `audits` | Framework controls, test results, and audit management |
| **Risk** | `risks`, `risk_assessments`, `incidents`, `remediations` | Risk register, incident tracking, and remediation |
| **Security** | `threats`, `scans`, `vulnerabilities`, `firewall_rules` | Security intelligence and policy enforcement |
| **Governance** | `policies`, `policy_versions`, `documents`, `approvals` | Policy lifecycle and document management |
| **Evaluations** | `eval_runs`, `eval_results`, `datasets`, `benchmarks` | Model evaluation and benchmarking |
| **Organization** | `tenants`, `users`, `roles`, `permissions`, `training_records` | Multi-tenant RBAC and training |
| **Audit** | `audit_trail` | Immutable, hash-chained event log |

All tables enforce **Row-Level Security (RLS)** policies scoped by `tenant_id`, ensuring complete data isolation in multi-tenant deployments.

---

## Tech Stack Details

### Frontend (`dashboard/`)

| Technology | Purpose |
|-----------|---------|
| React 18 | UI framework with concurrent features |
| TypeScript 5 | Type safety across the entire frontend |
| Vite | Build tool and dev server (HMR) |
| shadcn/ui + Radix UI | Accessible, composable component primitives |
| Tailwind CSS | Utility-first styling with design tokens |
| Recharts | Data visualization (charts, heatmaps) |
| Phosphor Icons | Consistent icon system (duotone style) |
| React Router v6 | Client-side routing |
| Zustand | Lightweight global state management |
| TanStack Query | Server state, caching, and synchronization |
| TanStack Table | Headless table with sorting, filtering, pagination |
| React Hook Form + Zod | Form management with schema validation |

### Backend (`sentinel/`)

| Technology | Purpose |
|-----------|---------|
| Python 3.11+ | Backend runtime |
| FastAPI | Async REST API framework |
| Pydantic | Request/response validation and serialization |
| Poetry | Dependency management |
| Uvicorn | ASGI server |

### Infrastructure

| Technology | Purpose |
|-----------|---------|
| Supabase (PostgreSQL) | Primary database with RLS and Realtime |
| pgvector | Vector embeddings for golden source verification |
| Docker / Docker Compose | Container orchestration for development |
| Kubernetes | Production deployment (HPA, PDB, NetworkPolicy) |
| GitHub Actions | CI/CD pipeline (lint, type check, test) |
| Vercel | Dashboard hosting (static SPA) |

---

## Deployment Architecture

### Development

```bash
cd dashboard && npm run dev    # Frontend on :5173
cd sentinel && uvicorn ...     # Backend on :8000
# Supabase local via docker-compose
```

### Production

```
                    ┌────────────┐
                    │   Vercel   │  ← Static React SPA
                    │  (CDN)     │
                    └─────┬──────┘
                          │
                          ▼
┌─────────────────────────────────────────────┐
│              Kubernetes Cluster              │
│                                             │
│  ┌───────────────┐   ┌───────────────────┐  │
│  │  FastAPI Pods  │   │  Background       │  │
│  │  (HPA: 2-10)  │   │  Workers          │  │
│  │  sentinel/     │   │  (eval, scan,     │  │
│  └───────┬───────┘   │   compliance)     │  │
│          │           └────────┬──────────┘  │
│          │                    │              │
│          ▼                    ▼              │
│  ┌─────────────────────────────────────┐    │
│  │         Supabase (PostgreSQL)       │    │
│  │  ● 45+ tables with RLS             │    │
│  │  ● pgvector for embeddings         │    │
│  │  ● Append-only audit log           │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  NetworkPolicy: namespace isolation         │
│  PDB: min 2 replicas available              │
└─────────────────────────────────────────────┘
```

### Key deployment properties:

- **Horizontal scaling** — FastAPI pods scale via HPA based on CPU/memory
- **Pod disruption budget** — Minimum 2 replicas available during updates
- **Network isolation** — Kubernetes NetworkPolicy restricts cross-namespace traffic
- **Tenant isolation** — RLS policies enforce data boundaries regardless of application logic
- **Immutable audit** — SHA-256 hash-chained audit trail; tampering breaks the chain

---

## Further Reading

- [README.md](../README.md) — Quick start and feature overview
- [MODULES.md](MODULES.md) — Complete module catalog with routes
- [SECURITY.md](../SECURITY.md) — Security model and threat analysis
- [CONTRIBUTING.md](../CONTRIBUTING.md) — Contribution guidelines
