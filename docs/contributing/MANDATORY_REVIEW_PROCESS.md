# Mandatory Review Process — Contributor Checklist

> **Binding for every pull request.** No change reaches `main` until all four
> role gates below are run **in order** and recorded in the PR description — a
> one-line change included. Sentinel is the system of record customers use for
> EU AI Act and ISO/IEC 42001 conformity: a defect here is a governance record a
> regulator may later rely on, not just a broken screen.
>
> This is the **actionable checklist**. The full rationale, cross-checking rules
> and sign-off format live in [`review-process.md`](review-process.md); the
> engineering contract is [`../../CLAUDE.md`](../../CLAUDE.md). Where they and
> this file agree, follow either; where detail is needed, `review-process.md`
> wins.

## How to use this

Copy the checklist block at the bottom into your PR description and tick every
line. Each gate **re-checks the one before it** — a single author wearing four
hats in sequence will rubber-stamp their own earlier call, so read each gate as
if a different specialist wrote it. A gate that genuinely does not apply is
marked **N/A with a one-line reason** — never left blank, never silently passed.

The order is fixed: **QA/QC → UI/UX → Documentation → Compliance.** A later gate
failing sends the change back to the relevant earlier gate.

---

## Gate 1 — QA/QC Engineer · *does it work, and is it wired in?*

- [ ] `cd dashboard && npx tsc --noEmit` is clean.
- [ ] `cd dashboard && npx vitest run` is green; Python changes also pass
      `ruff check sentinel/` and `pytest tests/`.
- [ ] Migrations replay from zero: `python3 scripts/check_migration_replay.py`.
- [ ] **No dead code / no orphans** — new files are imported by something; removed
      files are proven zero-consumer (grep **and** a clean `tsc`/test run).
- [ ] **No fake success** — writes throw on failure; a success toast fires only
      *after* the write resolves; no fabricated metrics presented as measured.
- [ ] **Interlinks proven** — new records link to their model / use case / dataset
      / assessment **and are reachable back**, demonstrated with a query where
      `total == resolves`. An unreachable module is unfinished.
- [ ] Org scoping is filled **DB-side** (`current_user_org_id()` default), never
      by the client; new tables have RLS.

## Gate 2 — UI/UX Designer · *does it look and behave like the same product?*

- [ ] Uses the platform primitives only — `PageHeader`, `DataTable`,
      `FormDialog`, `ConfirmDialog`, and all three of skeleton / empty / error
      states. No one-off tables, toasts, colours, or layouts.
- [ ] Semantic Radix/Tailwind design tokens only — no hardcoded hex.
- [ ] **Null renders `—`, never `0`.** Simulated values are labelled as simulated.
      Unresolvable ids show **"Unavailable"**, never a raw uuid.
- [ ] No dead-end records — every record links out; deep links carry a
      dismissible filter chip (`?model=<uuid>`).
- [ ] Keyboard focus is visible; interactive controls are keyboard-operable
      (`aria-sort`, real `<button>`s); dialogs close only on success.

## Gate 3 — Documentation Expert · *will the next person know this exists?*

- [ ] `docs/modules/<module>.md` exists and follows the standard shape
      ([`../modules/_TEMPLATE.md`](../modules/_TEMPLATE.md)): Purpose → Why →
      How → Features → Fields → Interlinks → Compliance → Operations.
- [ ] The **Fields** table matches the real schema (a migration), not invented.
- [ ] Interlinks documented **both** directions.
- [ ] After editing any `docs/modules/*.md`, `python3 scripts/gen_module_guides.py`
      was run and the regenerated `moduleGuides.generated.ts` is in the same PR.
- [ ] README / CHANGELOG / relevant `docs/` updated **in the same change**, not
      as a follow-up. Env vars, workflows and processes are documented too.

## Gate 4 — Senior Compliance Officer · *does it keep us aligned with the frameworks we sell alignment to?*

- [ ] Mapped in [`../compliance/eu-ai-act-mapping.md`](../compliance/eu-ai-act-mapping.md)
      and [`../compliance/iso-42001-mapping.md`](../compliance/iso-42001-mapping.md)
      (ISO/IEC **42001**) and, where relevant, **NIST AI RMF** — or recorded as
      out of scope with a reason.
- [ ] Art. 12 audit logging via `logAction` / `fn_audit_trigger` on
      state-changing actions, with a real actor.
- [ ] Art. 14 human-oversight path where the module acts autonomously (any agent
      that mutates a production entity has a documented HITL / override route).
- [ ] Evidence chain never weakened; approvals/evidence reference their source
      records; secrets stored as digests, never plaintext.
- [ ] No unjustified conformity claim (no "SOC 2 / ISO / GDPR compliant" unless a
      report exists); demo data stays fictional and labelled.

---

## Paste this into your PR description

```md
### Mandatory Review (QA → UX → Docs → Compliance)
- [ ] **Gate 1 — QA/QC:** tsc + tests green · migrations replay · no dead code ·
      no fake success · interlinks proven (total == resolves) · org-scoped + RLS
- [ ] **Gate 2 — UI/UX:** platform primitives · tokens · null→— · "Unavailable"
      not uuid · no dead-ends · keyboard/focus a11y
- [ ] **Gate 3 — Docs:** module doc to _TEMPLATE shape · fields match schema ·
      interlinks both ways · guide regenerated · README/CHANGELOG updated
- [ ] **Gate 4 — Compliance:** EU AI Act + ISO 42001 (+NIST RMF) mapped or N/A
      w/ reason · Art. 12 logging · Art. 14 oversight · evidence chain intact

Evidence (queries / counts / screenshots):
<paste here>
```

A change that cannot satisfy a gate documents **why** here and gets an explicit
human sign-off on that line. Silence is not a pass.
