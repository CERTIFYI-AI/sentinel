# Playground

**Route:** `/ai-gateway/playground` · **Page:** `pages/ai-gateway/Playground.tsx`

## Purpose

A rehearsal environment for guardrail, RBAC and trace behaviour. It lets a
governance engineer see how a policy would treat a given prompt **before** the
policy is changed in production.

## Why this module exists

Policy changes on a live gateway are risky: too strict and legitimate traffic is
blocked, too loose and sensitive data escapes. The Playground lets the guardrail
chain be exercised against a chosen governed model without touching production
traffic.

## How it works — and what is simulated

**This is the important part.** Guardrail decisions, token counts, cost and
latency shown here are **generated locally** to rehearse policy behaviour. They
are:

- **not** live provider inference,
- **not** billed, and
- **never** recorded as measured telemetry.

The page states this explicitly in a banner and points to **Live Inference
Traces** (`/trust-engine/traces`) for real traffic. This labelling is a
compliance requirement under the platform's "no invented data" contract — a
simulated latency number that reached a report as measured evidence would be a
material misstatement.

The target model selector reads the real governed model inventory
(`ai_models`), honours a `?model=<uuid>` deep link from a model record, and links
back to that record — so a rehearsal is always attributable to a real, governed
model rather than an invented endpoint.

## Interlinks

- **Model record → Playground** — "Test in Playground" carries `?model=<uuid>`.
- **Playground → Model record** — "Open model record" links back.
- **Playground → Live Inference Traces** — the banner points to where real
  telemetry lives.

## Compliance

| Control | How this module satisfies it |
|---|---|
| EU AI Act Art. 9 | Policy changes can be rehearsed before deployment, reducing risk |
| EU AI Act Art. 13 | Simulated output is explicitly distinguished from measured telemetry |
| EU AI Act Art. 15 | Guardrail behaviour is testable ahead of production change |
| ISO/IEC 42001 A.6.2.4 | Verification activity prior to change |

## Operations

- **Do not cite Playground figures as evidence.** They are rehearsal output. Use
  Live Inference Traces and Trust Costs & Tokens for measured values.
