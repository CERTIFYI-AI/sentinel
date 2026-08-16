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

## Interlinks

- **Trust Center → Vendors** — published subprocessors resolve to vendor records.
- **Trust Center → Frameworks** — published certifications derive from the
  compliance programme records rather than being typed in freehand.

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
