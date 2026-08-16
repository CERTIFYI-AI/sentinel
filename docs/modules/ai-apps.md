# AI Apps

**Route:** `/ai-apps` · **Service:** `aiAppsService.ts` · **Hook:** `useGovernAddons.ts` (`useAiApps`)
**Table:** `ai_apps`

## Purpose

The inventory of third-party and internally-built AI applications in use across
the organisation — including tools adopted by staff without a formal procurement
decision ("shadow AI").

## Why this module exists

The AI Act obliges an organisation to know what AI it *uses*, not only what it
*builds*. Most enterprises discover, late, that staff have adopted a dozen
generative tools with corporate data flowing into them and no DPA in place.

This module makes that estate visible and governable:

1. **Discovery** — the SSO connector's sign-in telemetry surfaces tools in use.
   (Art. 4 AI literacy; Art. 26 deployer obligations)
2. **Vendor accountability** — each app links to the vendor supplying it, so
   third-party risk assessment and DPAs attach to a real record.
   (ISO 42001 A.10.2 third parties)
3. **Data exposure** — what kind of corporate data the app receives, recorded
   rather than assumed. (GDPR Art. 30; Art. 10)
4. **Approval posture** — sanctioned, under review, or prohibited, so staff
   guidance is a fact rather than folklore.

## How it works

Each row is one application, carrying its approval state, the categories of data
it may receive, and a link to the supplying vendor. Apps discovered through SSO
telemetry arrive as unreviewed and must be triaged — the module deliberately does
not auto-approve anything it discovers.

## Interlinks

- **AI Apps → Vendors** — `vendor_id`; the app record links to its supplier.
- **Vendors → AI Apps** — the Vendor Registry carries the count of governed apps
  attributed to a vendor.
- **Integrations → AI Apps** — the SSO connector is the discovery source
  (`config.discoveryFeedsModule = 'ai-apps'`).

## Compliance

| Control | How this module satisfies it |
|---|---|
| EU AI Act Art. 4 | Staff-facing AI inventory supports AI-literacy obligations |
| EU AI Act Art. 26 | Deployer obligations for AI systems put into service |
| EU AI Act Art. 12 | App lifecycle audit-logged |
| ISO/IEC 42001 A.10.2 | Third-party and supplier management |
| GDPR Art. 30 | Data categories per app support records of processing |

## Operations

- **Triage cadence:** review newly discovered apps weekly; an app left unreviewed
  is an ungoverned data path.
- **Prohibiting an app:** set the approval state and record the reason — staff
  guidance and the Trust Center both read from this record.
