# Trust Center

**Route:** `/trust-center` · **Service:** `trustCenterService.ts` · **Hook:** `useGovernAddons.ts` (`useTrustCenter`)
**Table:** `trust_center_config`

## Purpose

The outward-facing transparency surface: what the organisation publishes about
its AI governance posture to customers, partners and regulators.

## Why this module exists

Transparency obligations are increasingly external. Customers performing their
own third-party risk assessment ask for the same artefacts repeatedly; a
published trust page turns a recurring bilateral exercise into a maintained
public record.

1. **Transparency** — a stated, versioned account of governance posture.
   (Art. 13 transparency; Art. 50 transparency for certain systems)
2. **Subprocessor disclosure** — the AI subprocessors in the chain, disclosed.
   (GDPR Art. 28; ISO 42001 A.10.2)
3. **Consistency** — what is published derives from the same records the
   platform governs, so the public statement cannot drift from reality.

## How it works

- **Editor + live preview**, plus a read-only **"View as visitor"** mode that
  renders only the persisted *published* document (unsaved editor changes and
  unpublished drafts are never shown to that view).
- **Badges** come from a curated catalog (ISO/IEC 42001, EU AI Act Conformity,
  SOC 2, ISO 27001). A badge renders with a verification seal only when an
  *active* framework record matches the claim; otherwise the public page
  labels it **self-declared** — the page never implies attestation it lacks.
- **Resources** are either plain URLs (link/page/pdf) or bound to a real
  record — `documents.id` or a *published* `transparency_reports.id` — stored
  as `{ kind, refId }` and resolved to title/link at render time
  ("Unavailable" when the record is gone).
- **Published policies** section (toggle) lists the org's *published* policies
  live from the policy register (title, category, version, effective date) —
  the public-visibility leg of the policy lifecycle. Draft/in-review/archived
  policies never appear.
- **Stats strip** is computed from the model inventory ("AI systems under
  governance" / "high-risk systems under governance") — never typed in.
- `published_at` records the **first** draft→published transition and is
  preserved across republishes/unpublishes. Saves, publishes and unpublishes
  are audit-logged (`logAction`, module `trust-center`).

## Interlinks

- **Trust Center → Vendors** — published subprocessors resolve to vendor
  records (`vendors.id`; soft-deleted vendors — `deleted_at` set — are
  excluded from the picker).
- **Trust Center → Frameworks** — badge verification derives from active
  framework records rather than being typed in freehand.
- **Trust Center → Documents / Transparency Reports** — bound resources
  resolve from `documents.id` / published `transparency_reports.id`.
- **Trust Center → Policies** — the policies section reads published
  `policies` rows live.

## Compliance

| Control | How this module satisfies it |
|---|---|
| EU AI Act Art. 13 | Transparency toward deployers and affected persons |
| EU AI Act Art. 50 | Transparency obligations for certain AI systems |
| ISO/IEC 42001 A.10.2 | Third-party disclosure |
| GDPR Art. 28 | Subprocessor transparency |

## Operations

- **Publishing is a deliberate act.** Review the derived content before it goes
  live; the page is an external representation and carries the same weight as any
  other published statement.
