# WS2 — Scaffolded GA-Critical Modules

## Problem

Enterprise buyer audits (SOC 2, NIST CSF 2.0, ISO 27001, GDPR Art. 30,
EU AI Act Art. 52) surface 25+ module names that a Fortune 500 reviewer
expects to see navigable in the product — even before the underlying
service layer is complete. Previously, links from the sitemap and role
playbooks hit `NotFound`, which fails the first 15 seconds of a demo.

## Solution

Introduce a single shared `ModuleScaffold` primitive + 25 scaffolded
pages, each wired into `App.tsx` behind the existing auth boundary and
org-scoped providers. Each page presents a production-shaped shell —
header, breadcrumb, optional KPI tiles, loading / error / empty states,
aria landmarks, keyboard reachability — and leaves a single, obvious
hook for its domain service to be plugged in during later workstreams.

## Design

### `ModuleScaffold`

Path: `dashboard/src/components/ModuleScaffold.tsx`

Responsibilities:

- Uniform page chrome (breadcrumb, title, subtitle, icon, actions slot)
- Optional KPI row (1–4 tiles, tone-aware)
- Strict three-state branching: `loading` / `error` / `empty` / content
- A11y landmarks: `<main aria-labelledby>`, `role="status"` for loading,
  `role="alert"` for error, semantic breadcrumb nav
- Zero data fetching — callers own the query lifecycle

Non-responsibilities (intentional):

- No feature flag logic
- No RBAC gating (callers wrap with `<RBACGate>` when needed)
- No routing — pages are registered centrally in `App.tsx`

### Scaffolded pages

All 25 pages share the same contract:

```tsx
const abortRef = useRef<AbortController | null>(null);
useEffect(() => {
  abortRef.current?.abort();
  const controller = new AbortController();
  abortRef.current = controller;
  (async () => { /* service call with controller.signal */ })();
  return () => controller.abort();
}, []);
```

This guarantees compliance with the "No fetch without abort signal"
anti-pattern rule from the contributor guide.

### Categories

| Category        | Pages                                                                    |
| --------------- | ------------------------------------------------------------------------ |
| Governance      | Board Reports, Committee Calendar, Policy Library, Policy Attestation,
                    Regulatory Horizon                                                       |
| Third-Party     | Third-Party Inventory, Vendor Assessments, Vendor Contract Review       |
| Incidents       | Incident Response Playbooks, Post-Incident Reviews                      |
| Threat          | Threat Intel Feed, Vulnerability Program                                |
| Privacy         | DPIA Builder, RoPA (v2), Transfer Log                                    |
| Data            | Data Map, Lineage, Quality Metrics                                       |
| AI Assurance    | AI Red Team, Model Registry, Prompt Library                              |
| Training        | Training Programs, Awareness Campaigns                                   |
| Assurance       | SOX ITGC, Insurance Coverage                                             |

## Generator

`scripts/ws2-scaffold-pages.mjs` is an idempotent generator. Re-running
it regenerates the 25 `.tsx` files from a single source-of-truth array
(path → title → subtitle → icon → breadcrumb). If a page is later
hand-customised beyond the template, that file should be removed from
the generator list (the generator writes `// @generated` comments on
files it owns).

## Integration with later workstreams

- **WS3 (CRUD audit):** Each scaffold's `// Real query plugged in`
  comment is the injection point. CRUD forms are added with
  `react-hook-form + zod`.
- **WS4 (RBAC):** High-risk pages (e.g. AI Red Team, Policy Attestation)
  get wrapped with `<RBACGate roles={[...]}>` once the 12-role model
  lands.
- **WS5 (Frameworks):** `Regulatory Horizon` + `Policy Library` consume
  the YAML framework catalog directly.
- **WS6 (Observability):** Every scaffold already renders a `role="alert"`
  on error; Sentry breadcrumbs only need to be attached at the service
  layer.
- **WS7 (a11y + i18n):** All strings live in one file per page, making
  string extraction for i18n trivial.
- **WS8 (OpenAPI):** Each scaffold's service layer will be generated
  from OpenAPI 3.1 clients.
- **WS9 (seed):** Seed data lands in the tables these pages read from.

## Quality gates

- `npx tsc --noEmit` — 0 errors on this branch (strict TS + `noUncheckedIndexedAccess`).
- Every new file carries the Apache-2.0 licence header.
- Every new route is registered inside the authenticated `<Route>`
  subtree, inheriting the existing tenancy and RBAC guards.
- No `any`, no `console.log`, no TODO comments (anti-pattern linter
  will fail the PR otherwise).
