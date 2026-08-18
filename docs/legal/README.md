# Legal documents — source of record

This directory holds the canonical text of Certifyi AI's public legal documents.
The application does **not** render them; it links out to the published copies:

| Document | Source file | Published at |
| --- | --- | --- |
| Terms of Service | [`terms-of-service.md`](terms-of-service.md) | https://certifyi.ai/terms-of-service/ |
| Privacy Policy | [`privacy-policy.md`](privacy-policy.md) | https://certifyi.ai/privacy-policy/ |

The URLs live in one place in the app — `dashboard/src/lib/legal.ts` — and are
used by the Login page, the Signup page and the Help panel. Change them there,
not inline.

## ⚠️ Review status

**These documents are drafts prepared in-house and have NOT been reviewed by a
qualified lawyer.** They were written to be accurate about how the platform
actually behaves, but accuracy about the product is not the same as legal
sufficiency in any given jurisdiction.

Before publishing, have counsel admitted in Nepal review both documents, and
have counsel familiar with GDPR/UK GDPR review the Privacy Policy if you serve
EU/UK customers. Points that specifically need a lawyer's eye:

- the liability cap and the NPR 10,000 free-tier figure (§13 of the Terms);
- the governing-law and jurisdiction clause (§16 of the Terms);
- the controller/processor split and whether a separate DPA is required for your
  customer base (§1 of the Privacy Policy, §10 of the Terms);
- the retention periods in §6 of the Privacy Policy — these must match what the
  infrastructure actually does, not merely what we would like it to do;
- the international-transfer basis (§5 of the Privacy Policy), particularly
  whether Standard Contractual Clauses are in place with each sub-processor.

## Claims that must stay true

These documents deliberately avoid asserting anything the platform cannot back
up. Two commitments in particular are load-bearing, and changing the product
without changing the text would make the documents false:

1. **No certification claim.** The Privacy Policy states plainly that Dignep
   Group does *not* hold SOC 2 Type II, ISO/IEC 27001 or equivalent
   certification for the platform. A prior version of the Login and Signup pages
   claimed "SOC 2 Type II certified" with nothing behind it; that claim was
   removed in the same change that added these documents. **Do not reintroduce a
   certification claim anywhere in the product until a report actually exists.**

2. **No advertising trackers, and no training on Customer Data.** The Privacy
   Policy states the application contains no Google Analytics, Meta, Segment,
   Mixpanel or PostHog tag, and that Customer Data is not used to train models.
   Both were true when written. Adding such a dependency, or any
   Customer-Data-derived training, requires updating §2.3 **and** notifying
   users.

## Sub-processors

§4.1 of the Privacy Policy lists Supabase, Cloudflare and (optionally) Sentry.
Adding a sub-processor that touches personal data means updating that table and,
where we act as processor, giving customers reasonable notice so they can
object.

## When you change a document

1. Edit the markdown here — this is the source of record.
2. Update the **Last updated** date in the document.
3. Publish the new text to the corresponding certifyi.ai URL.
4. For material changes, notify users before the effective date, as both
   documents promise.
