# WS7 — UX Polish, WCAG 2.2 AA & i18n

## Scope
- Lightweight i18n runtime (no external deps) supporting 7 locales.
- WCAG 2.2 AA accessibility primitives: skip link, focus ring, live region,
  focus trap, reduced-motion, minimum target size.
- White-label theming via CSS custom properties, per-tenant override.

## Locales shipped
`en`, `es`, `fr`, `de`, `ja`, `pt`, `zh` — maintained as JSON catalogs
under `dashboard/src/i18n/locales/*.json`.

## Runtime contract
```ts
import { t, setLocale, formatCurrency, plural } from "@/i18n";

t("action.save");                       // "Save" | "Enregistrer" | …
t("unit.count.other", { count: 42 });   // placeholder substitution
plural(count, { one: "…", other: "…" });// Intl.PluralRules
formatCurrency(12345, "USD");           // 12345 minor units → "$123.45"
```

## WCAG 2.2 AA checklist (implemented)

| SC        | Technique                                    | File                                   |
|-----------|----------------------------------------------|----------------------------------------|
| 1.3.1     | Semantic landmarks, `<main id="main-content">` | ModuleScaffold + App shell            |
| 1.4.3     | Contrast >= 4.5:1 via oklch token guard      | `lib/theming.ts`                       |
| 1.4.11    | Non-text contrast >= 3:1                     | tokens.css + a11y.css                  |
| 2.1.1     | Keyboard-navigable controls                  | focus-visible styles, focus trap       |
| 2.3.3     | prefers-reduced-motion                       | `styles/a11y.css`                      |
| 2.4.1     | Skip to content link                         | `lib/a11y/SkipLink.tsx`                |
| 2.4.3     | Focus order & trap in dialogs                | `lib/a11y/focusTrap.ts` + Radix        |
| 2.4.11    | Focus not obscured                           | `:focus-visible` outline-offset        |
| 2.5.8     | Target size 24×24 px min                     | `styles/a11y.css`                      |
| 4.1.3     | Status messages via aria-live region         | `lib/a11y/LiveRegion.tsx`              |

## White-label theming
`TenantTheme` schema (zod-validated) defines `primary_hue`, `primary_chroma`,
`density`, and `reduce_motion_default`. `applyTheme(theme)` writes CSS custom
properties to `:root`. Hue/chroma constrained to stay inside the AA-safe
oklch gamut (chroma <= 0.2).

## Testing
- `i18n.test.ts` — 7 locales loaded, fallback, placeholder, plural, number/currency
- `theming.test.ts` — schema validation, safe fallback
- Playwright a11y smoke covered by WS0.5 harness (axe + keyboard traversal)

## Out of scope
- Translator workflow (TMS integration) — tracked as post-GA follow-up.
- RTL locales (ar, he) — add in GA+1; `dir` attribute already switchable.
