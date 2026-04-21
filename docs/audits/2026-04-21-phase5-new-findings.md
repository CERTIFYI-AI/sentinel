<!--
  SPDX-License-Identifier: Apache-2.0
  Copyright (c) 2026 CERTIFYI-AI. All rights reserved.

  Phase 5 New Findings — generated 2026-04-21
  Branch: phase-5/audit-ci-uiux-typography-20260421
-->

# Phase 5 New Findings

**Date:** 2026-04-21  
**Branch:** `phase-5/audit-ci-uiux-typography-20260421`  
**Auditor:** Principal Staff Engineer (automated audit)

---

## P0 — Critical Blockers (CI will not pass until resolved)

### CI-001 — @vitest/coverage-v8 version mismatch
- **Severity:** P0
- **Location:** `dashboard/package.json`
- **Current:** `"@vitest/coverage-v8": "^2.0.5"` vs `"vitest": "^4.1.5"`
- **Symptom:** Running `npm run test:coverage` crashes with `Cannot read properties of undefined (reading 'fetchCache')` because coverage-v8 v2 is not compatible with vitest v4's internal plugin API.
- **Fix:** Bump `@vitest/coverage-v8` to `^4.1.5` in `devDependencies`, then run `npm install --legacy-peer-deps` to regenerate `package-lock.json`.
- **Verification:** `npm run test:coverage` must complete without crash and emit `coverage/coverage-summary.json`.

---

### CI-002 — TypeScript `baseUrl` deprecation error (TS5101)
- **Severity:** P0
- **Location:** `dashboard/tsconfig.json`
- **Current:** `"baseUrl": "."` present in `compilerOptions` without `"ignoreDeprecations"` set.
- **Symptom:** `npx tsc --noEmit` emits `error TS5101: Option 'baseUrl' is deprecated and will stop functioning in TypeScript 6.0. Use 'paths' without 'baseUrl' instead.` in strict/modern TypeScript mode, failing the CI typecheck job.
- **Fix:** Add `"ignoreDeprecations": "6.0"` to `compilerOptions` in `tsconfig.json`. This silences TS5101 while preserving the `paths`/`@/*` alias behaviour.
- **Verification:** `npx tsc --noEmit` exits with code 0.

---

### FONT-001 — Outfit loaded from Google Fonts CDN
- **Severity:** P0
- **Location:** `dashboard/index.html` (lines with `fonts.googleapis.com` preconnect + stylesheet link), `dashboard/src/index.css` (`@import url('https://fonts.googleapis.com/...')`)
- **Symptom:** The application depends on an external CDN (`fonts.googleapis.com`) for the primary brand typeface. This violates the self-hosting requirement, creates a privacy/GDPR risk (Google receives client IP on every page load), adds a latency dependency, and will cause font rendering failures in air-gapped or restricted deployments.
- **Fix (WS3/WS4):** Install `@fontsource-variable/outfit` (npm), import from package in `index.css` / entry point, remove all `googleapis.com` links from `index.html` and `index.css`.
- **Verification:** No requests to `fonts.googleapis.com` in browser network tab; font renders correctly offline.

---

### FONT-002 — `tailwind.config` fontFamily has `sans-serif` fallbacks
- **Severity:** P0
- **Location:** `dashboard/tailwind.config.ts`
- **Current:**
  ```ts
  fontFamily: {
    sans: ["Outfit", "system-ui", "-apple-system", "sans-serif"],
    mono: ["JetBrains Mono", "ui-monospace", "monospace"],
  }
  ```
- **Symptom:** The fallback stack (`system-ui`, `-apple-system`, `sans-serif`) allows the UI to silently degrade to a system font if Outfit fails to load, masking FONT-001 and violating the Outfit-only brand policy.
- **Fix (WS3/WS4):** After self-hosting Outfit via `@fontsource-variable/outfit`, update to:
  ```ts
  fontFamily: {
    sans: ["Outfit Variable", "Outfit", "sans-serif"],
    mono: ["JetBrains Mono", "ui-monospace", "monospace"],
  }
  ```
  The single `sans-serif` generic is acceptable as a last-resort fallback per CSS spec; `system-ui` and `-apple-system` must be removed.

---

### FONT-003 — Inline `fontFamily: "Outfit, sans-serif"` in 12+ component files
- **Severity:** P0
- **Location:** `dashboard/src/components/TopBar.tsx` (3 occurrences), `dashboard/src/components/policy/PolicyDetailDrawer.tsx`, `PolicyEditorModal.tsx` (6 occurrences), `PolicyPublicView.tsx`, `PolicyReviewDrawer.tsx` (3 occurrences), `SharePolicyModal.tsx` (3 occurrences), `SignPolicyModal.tsx` (1 occurrence), and others.
- **Symptom:** Inline `style={{ fontFamily: "Outfit, sans-serif" }}` bypasses Tailwind's design token system. It creates inconsistency, is not theme-aware, and must be replaced with the `font-sans` Tailwind utility class.
- **Fix (WS4):** Remove all inline `fontFamily` style props; apply `className="font-sans"` (or rely on global `body { font-family: theme(fontFamily.sans); }` in `index.css`).
- **Verification:** `grep -rn "fontFamily" src/` returns 0 results in non-test source files.

---

### BUILD-001 — `npm install` fails without `--legacy-peer-deps`
- **Severity:** P0
- **Location:** `dashboard/package.json`
- **Current:** `"react": "^19.2.5"` and `"react-dom": "^18.3.1"` with `"@types/react-dom": "^18.x"` requiring `@types/react@^18` while `"@types/react": "^19"` is also present.
- **Symptom:** `npm ci` (without flags) exits with `ERESOLVE` peer dependency conflict, blocking all CI jobs.
- **Fix (WS2):** All `npm ci` invocations in `.github/workflows/ci.yml` must be replaced with `npm ci --legacy-peer-deps`. The lockfile must be regenerated with `npm install --legacy-peer-deps`.

---

## P1 — High Priority (feature/quality gaps)

### UI-001 — No `PageHeader` shared component
- **Severity:** P1
- **Location:** `dashboard/src/components/ui/` (absent), pages throughout `dashboard/src/pages/`
- **Description:** Every page implements its own bespoke header section (title, subtitle, action buttons) with inconsistent markup, styling, and spacing. A shared `PageHeader` component with standardised `title`, `subtitle`, `actions`, and optional `breadcrumb` props is required by the Phase 5 design system.
- **Fix (WS3):** Create `dashboard/src/components/ui/PageHeader.tsx` with the canonical API; migrate all page-level bespoke headers to use it.

---

### UI-002 — Sidebar has no collapse/icon-only mode
- **Severity:** P1
- **Location:** `dashboard/src/components/ui/sidebar.tsx` (774 lines)
- **Description:** The sidebar component is 774 lines with no collapse toggle, no icon-only mode (compact state showing only icons), no search/filter for nav items, and no pinned items feature. This limits usability on smaller screens and for power users.
- **Fix (WS3):** Add a `collapsed` prop + `useSidebar` context hook to drive icon-only mode; add collapse toggle button; add a search input for filtering nav items when expanded.

---

### UI-003 — TopBar has inline `fontFamily` styles
- **Severity:** P1
- **Location:** `dashboard/src/components/TopBar.tsx`
- **Description:** `TopBar` uses inline `style` objects with hardcoded `fontFamily: 'Outfit'` and `fontFamily: 'Outfit,sans-serif'` on three elements, plus hardcoded colours (`#fff`). This component is a root-level layout element rendered on every page.
- **Fix (WS4):** Replace inline styles with Tailwind utility classes (`font-sans`, `text-foreground`, etc.).

---

### UI-004 — `@fontsource-variable/outfit` package not installed
- **Severity:** P1
- **Location:** `dashboard/package.json`
- **Description:** The npm package `@fontsource-variable/outfit` is absent from both `dependencies` and `devDependencies`. Self-hosting Outfit requires this package (or `@fontsource/outfit`). Without it, FONT-001 cannot be resolved.
- **Fix (WS3/WS4):** `npm install @fontsource-variable/outfit --legacy-peer-deps`; import `@fontsource-variable/outfit/index.css` in the app entry point.

---

## P2 — Medium Priority (code quality, maintainability)

### P2-001 — Duplicate service file naming convention
- **Severity:** P2
- **Location:** `dashboard/src/services/`
- **Description:** Four resources have two service files each: `incidentService.ts` + `incidents.service.ts`, `notificationService.ts` + `notifications.service.ts`, `riskService.ts` + `risks.service.ts`, `vendorService.ts` + `vendors.service.ts`. This creates import confusion and potential divergent logic.
- **Fix:** Consolidate to a single `fooService.ts` per resource; deprecate/delete the `.service.ts` variants.

---

### P2-002 — 603 uses of `any` type in source
- **Severity:** P2
- **Location:** `dashboard/src/` (excluding `__tests__`)
- **Description:** `grep ": any\b\|as any\b"` returns 603 matches across source files. Strict TypeScript forbids implicit `any`; explicit `any` usage bypasses type safety and should be replaced with proper types or `unknown`.
- **Fix:** Address `any` usages incrementally per module; introduce ESLint `@typescript-eslint/no-explicit-any: error` rule.

---

### P2-003 — 163 `console.log/warn/error` calls in non-test source
- **Severity:** P2
- **Location:** `dashboard/src/` (non-test files)
- **Description:** Production source contains 163 `console.*` statements. These leak internal state/errors to browser DevTools and should be replaced with the observability/logging service already present in the codebase.
- **Fix:** Enable ESLint `no-console` rule; replace with structured logging via `observability` module.

---

### P2-004 — Hardcoded hex colours bypassing design tokens
- **Severity:** P2
- **Location:** `dashboard/src/components/auth/LoginForm.tsx`, `SignupForm.tsx`, `compliance/ComplianceExportPanel.tsx`, `TopBar.tsx`, `EnterpriseGate.tsx`
- **Description:** Multiple components use hardcoded hex values (`#1A6B5A`, `#10b981`, `#2563eb`, `#9ca3af`, `#fff`, `#e5e7eb`) instead of CSS custom properties (`hsl(var(--primary))`) or Tailwind semantic classes. This breaks dark mode and white-label theming.
- **Fix:** Replace all hardcoded hex colours with Tailwind semantic utilities (`bg-primary`, `text-foreground`, etc.) or `hsl(var(--token))` references.

---

### P2-005 — ~88 `.map()` calls potentially missing React `key` props
- **Severity:** P2
- **Location:** `dashboard/src/components/` (various)
- **Description:** Static grep finds ~88 `.map(` calls in TSX component files without an adjacent `key=` prop. Missing keys cause React reconciliation warnings and performance issues.
- **Fix:** Audit each `.map()` render call; add stable `key` props (preferably from data IDs, not array indices).

---

### P2-006 — Only 32 loading/error state handlers across all components
- **Severity:** P2
- **Location:** `dashboard/src/components/` (various)
- **Description:** With 75+ TanStack Query hooks providing `isLoading`/`isPending`/`isError` states, only 32 usages of these states exist in components. The majority of data-dependent views render nothing or stale content while loading, with no error boundaries or retry UI.
- **Fix:** Audit each component using query hooks; add `<PageSkeleton>` for loading states (component exists in `ui/`) and error states using `<EmptyState>`.

---

### P2-007 — `ComplianceExportPanel` uses raw HTML elements with hardcoded CSS
- **Severity:** P2
- **Location:** `dashboard/src/components/compliance/ComplianceExportPanel.tsx`
- **Description:** Uses raw `<div>`, `<select>`, `<button>` with inline `style` objects containing hardcoded colours (`#e5e7eb`, `#d1d5db`, `#2563eb`, `#9ca3af`, `#fff`) and no ARIA labels on the export button. Does not use the design system (`Select`, `Button`, `Card` from `ui/`).
- **Fix:** Rewrite using `Card`, `Select`, `Button` from `components/ui/`; remove all inline styles; add `aria-label` to the export button.

---

### P2-008 — No `aria-label` on icon-only interactive elements
- **Severity:** P2
- **Location:** `dashboard/src/components/TopBar.tsx` (notification bell button with badge), various icon buttons across the app
- **Description:** Several `<button>` elements contain only icons or emoji (e.g., `✉` notification button in `TopBar`) with no `aria-label` or `aria-describedby`. These are inaccessible to screen readers, violating WCAG 2.1 SC 4.1.2 (Name, Role, Value).
- **Fix:** Add `aria-label="Notifications (2 unread)"` (or equivalent) to all icon-only interactive elements.

---

## Summary Table

| ID | Priority | Category | Status |
|----|----------|----------|--------|
| CI-001 | P0 | CI/Build | Open → Fixed in WS2 |
| CI-002 | P0 | CI/Build | Open → Fixed in WS2 |
| FONT-001 | P0 | Typography | Open → WS3/WS4 |
| FONT-002 | P0 | Typography | Open → WS3/WS4 |
| FONT-003 | P0 | Typography | Open → WS4 |
| BUILD-001 | P0 | CI/Build | Open → Fixed in WS2 |
| UI-001 | P1 | UI/UX | Open → WS3 |
| UI-002 | P1 | UI/UX | Open → WS3 |
| UI-003 | P1 | Typography | Open → WS4 |
| UI-004 | P1 | Typography | Open → WS3/WS4 |
| P2-001 | P2 | Code Quality | Open |
| P2-002 | P2 | Type Safety | Open |
| P2-003 | P2 | Observability | Open |
| P2-004 | P2 | Design System | Open |
| P2-005 | P2 | Accessibility | Open |
| P2-006 | P2 | UX | Open |
| P2-007 | P2 | UI/Design System | Open |
| P2-008 | P2 | Accessibility | Open |
