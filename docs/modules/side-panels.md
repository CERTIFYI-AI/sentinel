# Side Panels — Get started, User guide, What's new, Help

**Route:** none (a persistent right-hand rail, present on every page) ·
**Code:** `dashboard/src/components/shell/RightSidebar.tsx`,
`dashboard/src/data/userGuide.ts`,
`dashboard/src/data/navigation.ts` ·
**Generated data:** `dashboard/src/data/moduleGuides.generated.ts`,
`dashboard/src/data/releases.generated.ts` ·
**Generators:** `scripts/gen_module_guides.py`, `scripts/gen_release_notes.py`

## Purpose

Four always-available panels that answer, in order, the four questions a user
has about a platform this large: *what should I do first*, *what does this
screen do*, *what changed*, and *who do I ask*.

## Why it exists

The platform has 10 menu sections and 134 destinations. Without an in-product
guide, that surface is only navigable by someone who already knows it. The
panels also carry the honest-reporting burden: they are where the product
states what it does **not** know — a setup step it cannot verify, a module
nobody has documented, a release whose detail was trimmed.

## How it works

Every number and sentence in these panels is derived from a real source. None
is hand-typed into the component.

| Panel | Source of truth | Derivation |
| --- | --- | --- |
| Get started | the org's own tables | `SetupChecklist` runs live queries per step (`useSetupProgress`) |
| User guide | `navigation.ts` + `docs/modules/*.md` | `scripts/gen_module_guides.py` → `moduleGuides.generated.ts` |
| What's new | `CHANGELOG.md` | `scripts/gen_release_notes.py` → `releases.generated.ts` |
| Help | the two generated files above | `guideCoverage()` plus the release constants |

### One navigation structure

`dashboard/src/data/navigation.ts` holds the `NAV` array. `Sidebar.tsx` renders
it and the guide generator reads it. Before this, `NAV` was private to
`Sidebar.tsx` and the guide kept its own hand-written list of "collections" —
eleven of them, against ten real menu sections. Adding a module now puts it in
the menu and the guide together; a test asserts the two agree exactly.

### Guide content comes from the module docs

The generator resolves each menu destination to a `docs/modules/*.md` file by,
in order: an explicit pairing in `ROUTE_TO_DOC`; a route the doc itself declares
in its `**Route:**` preamble; then filename and title slug matches. Doc
headings vary across the corpus, so synonyms (`Why this module exists` →
`Why it exists`, `Standards Alignment` → `Compliance`) fold onto one canonical
shape.

A destination the generator cannot resolve is emitted with `hasDoc: false` and
**no body at all** — the panel renders "Not documented yet". It is never given
invented prose, and a test enforces the empty body.

### Release history comes from the changelog

`gen_release_notes.py` parses all three heading variants used in this repo's
history (`## Unreleased`, `## 1.66.0 (2026-08-17)`, `## [1.0.0] - 2026-04-18`),
folds wrapped continuation lines into their bullet, and splits conventional
commit prefixes into `type` / `scope` / `summary`. Unreleased work is carried
separately so the UI cannot present it as shipped.

Full entry text is kept for the 12 most recent releases; older ones keep
version, date and a real change **count**. The panel states that trimming
explicitly rather than implying the older releases were empty.

## Fields

### `GuideEntry` (`moduleGuides.generated.ts`)

| Field | Type | Meaning |
| --- | --- | --- |
| `label` | `string` | Menu label, verbatim from `navigation.ts` |
| `route` | `string` | Destination the menu entry navigates to |
| `parentLabel` | `string \| null` | Parent item when nested, else `null` |
| `hasDoc` | `boolean` | Whether a module doc resolved |
| `docPath` | `string \| null` | Repo-relative source doc |
| `title` | `string` | Doc title; falls back to `label` when undocumented |
| `purpose` / `why` | `string \| null` | Prose sections from the doc |
| `how` | `string[]` | "How it works" bullets |
| `dataProcess` | `string[]` | "Data backing" — the real tables/services behind the screen |
| `interlinks` | `string[]` | What the module connects to |
| `compliance` | `string[]` | Framework obligations it serves |
| `operations` | `string[]` | Operational notes |
| `fields` | `string[][]` | The doc's field table, first row treated as the header |
| `noDocReason` | `string \| null` | Stated reason a destination intentionally has no doc |

### `Release` (`releases.generated.ts`)

| Field | Type | Meaning |
| --- | --- | --- |
| `version` | `string` | Released version; never the string `Unreleased` |
| `date` | `string \| null` | `YYYY-MM-DD` as the changelog recorded it |
| `entryCount` | `number` | Real number of changes, even when text is trimmed |
| `entries` | `ReleaseEntry[]` | Populated only for detailed releases |
| `detailed` | `boolean` | False when entry text was trimmed for bundle size |

## Interlinks

- **Menu → guide.** Every destination in `navigation.ts` has a guide entry;
  `entryForRoute()` resolves by longest prefix, so `/models/inventory/<uuid>`
  opens the Model Registry entry.
- **Guide → module.** Each entry has an "Open <module>" action that navigates
  to the real route and closes the panel.
- **Guide → docs.** A documented entry shows its source `docs/modules/*.md`
  path, so the reader can find the authoritative file.
- **Get started → guide.** The checklist links through to the full guide.
- **Help → guide.** Coverage figures link to the same content.

## Compliance

Read-only surfaces: they render generated documentation and the org's own
setup progress. No new tables, no writes, no personal data, so there is no RLS
surface and no `logAction` path.

- **EU AI Act Art. 13 (transparency).** The guide states, per module, where the
  data on screen comes from (`dataProcess`), which is the in-product half of
  the transparency obligation the module docs carry.
- **ISO/IEC 42001 §7.5 (documented information).** The guide is generated from
  the controlled docs rather than duplicating them, so there is one version of
  the truth and CI fails if the rendered copy drifts.
- **Honest reporting.** Undocumented modules, unverifiable setup steps and
  trimmed release text are all shown as such. Nothing is presented as known
  when it is not.

## Operations

Regenerate after changing the menu, the module docs, or the changelog:

```bash
python3 scripts/gen_release_notes.py
python3 scripts/gen_module_guides.py
```

Both accept `--check`, which is what CI runs (`ci.yml`, job `test-python`,
step "Generated panel data is current"). The check fails if the committed
output differs from what the sources produce.

`gen_module_guides.py` prints coverage on every run and lists each
undocumented destination by name, so the gap is visible in CI logs:

```
guide coverage: 130/134 menu destinations documented (97%); 66/86 module docs used
undocumented destinations (4):
  - ASSESS & VALIDATE › Impact Assessments (/aiia)
  - TRUST ENGINE & GATEWAYS › Performance Monitoring (/performance-monitoring)
  - ADMIN › Resilience (/continuity)
  - ADMIN › Business Continuity (/continuity)
```

Closing a gap means writing `docs/modules/<module>.md` and regenerating — no
change to the panel code is required.

## History

- **2026-08-18** — Rebuilt. `NAV` extracted to `data/navigation.ts` as the one
  navigation structure; the guide regenerated from it plus the module docs
  (130/134 destinations, 97%); "What's new" wired to the real changelog,
  replacing a hard-coded `v1.43.0` / "2 hours ago" / "Release 57" that pointed
  at a tag which was never cut (the real latest version was 1.66.0, release
  67); Help gained real build diagnostics. The superseded guide implementation
  — `moduleGuides.tsx`, `guides/guides1-3.tsx` and the never-mounted
  `UserGuideDrawer.tsx`, ~2,860 lines of hand-written prose describing eleven
  collections — was deleted.
