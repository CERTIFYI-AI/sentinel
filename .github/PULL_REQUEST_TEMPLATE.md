## Summary

<!-- What changed and why — not the diff, the intent. -->

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Refactoring / cleanup (no functional change)
- [ ] Documentation
- [ ] CI / infrastructure

## How to Test

<!-- Steps a reviewer can follow to verify this works. -->

1. ...
2. ...

---

## Mandatory 4-Role Review

> Every PR passes all four gates **in order**. A gate that does not apply is
> marked **N/A** with a reason — never left blank.
> Full process: [`docs/contributing/review-process.md`](docs/contributing/review-process.md)

### Gate 1 — QA/QC Engineer

- [ ] `cd dashboard && npx tsc --noEmit` is clean
- [ ] `cd dashboard && npx vitest run` is green; Python: `ruff check sentinel/` + `pytest tests/`
- [ ] Migrations replay: `python3 scripts/check_migration_replay.py`
- [ ] No fake success — writes throw on failure; toasts fire only after the write resolves
- [ ] Interlinks proven — new records link to their model / use case / assessment and are reachable back

### Gate 2 — UI/UX Reviewer

- [ ] Uses platform primitives (PageHeader, DataTable, FormDialog, ConfirmDialog)
- [ ] Skeleton / empty / error states present
- [ ] Null renders `—`, never `0`; unresolvable IDs show "Unavailable"
- [ ] No one-off styles or colours outside design tokens

### Gate 3 — Documentation

- [ ] New/changed modules update `docs/modules/<module>.md`
- [ ] README, CHANGELOG, migration comments updated where applicable
- [ ] Generated panel data is current (`gen_release_notes.py --check`, `gen_module_guides.py --check`)

### Gate 4 — Compliance

- [ ] New modules mapped in `docs/compliance/eu-ai-act-mapping.md` and `iso-42001-mapping.md`
- [ ] State-changing actions write to audit log (`logAction`)
- [ ] New tables are org-scoped with RLS; scoping column filled DB-side
- [ ] No plaintext credentials — secrets AES-256-GCM encrypted

## Related Issues

<!-- Closes #123 -->
