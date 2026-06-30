# UI Component Reference

Reference for the shared component library used across the Sentinel dashboard
(`dashboard/src/components/ui/`). Relevant for contributors extending the
frontend. Import from the barrel:

```typescript
import { PageHeader, DataTable, RiskBadge, StatusPill } from "@/components/ui";
```

> **Design system invariants.** Square corners everywhere (`border-radius: 0`),
> light mode only, brand green `#368F4D` (token `--brand`). Colour **must** flow
> through the design tokens in [`src/styles/tokens.css`](../dashboard/src/styles/tokens.css) —
> never hardcode a hex value in JSX. See [ADR-0007](./adr/0007-outfit-only-typography.md)
> for typography.

---

## Layout & page chrome

| Component | Purpose | Key props |
| --------- | ------- | --------- |
| `PageHeader` | Standard page title bar with breadcrumbs + actions | `title`, `subtitle`, `breadcrumbs`, `actions`, `badge` |
| `StatCardRow` | Dense horizontal KPI strip | `items: StatCardRowItem[]` |
| `StatCard` | Single KPI card (label, value, delta, lineage tooltip) | `label`, `value`, `delta`, `deltaDir`, `variant`, `href`, `lineage` |
| `MetricStrip` | Compact divided metric row | `items: MetricStripItem[]` |
| `FilterBar` | Search + faceted filters above a table | `fields: FilterField[]`, `value`, `onChange` |

## Data display

| Component | Purpose |
| --------- | ------- |
| `DataTable` | Sortable, dense table (default export) |
| `EmptyState` | Zero-state with icon, copy, optional CTA |
| `ErrorState` | Inline error surface for failed queries (`title`, `description`, `error`, `onRetry`) |
| `PageSkeleton` | Loading skeleton for route-level Suspense |
| `EtlHealthDot` | Freshness indicator for a data source |

## Feedback & status

| Component | Purpose | Notes |
| --------- | ------- | ----- |
| `RiskBadge` | Risk-tier pill (Critical/High/Medium/Low) | Tokens `--r-cr/hi/md/lo-*`, has a safe fallback for unknown tiers |
| `StatusPill` | Status pill across 16+ statuses | Tokens `--s-ok/wn/er/in/nt-*`, optional `pulse` |
| `AgentStatusIndicator` | Agent liveness dot | `online \| processing \| degraded \| offline \| error` |
| `Badge` | Generic badge | 31 variants incl. `default`/`secondary`/`destructive`/`outline`; runtime fallback to `none` |
| `ContextualAlert` | Inline alert banner | severity-driven |
| `InterlinkChip` | Cross-module navigation chip | links records across modules |

## Overlays

| Component | Purpose |
| --------- | ------- |
| `DetailDrawer` | Right-hand record drawer; `ActivityTab` is always the final tab |
| `SlideOverPanel` | Generic slide-over container |
| `ConfirmDialog` | Destructive-action confirmation |
| `NotificationDrawer` | Notification centre |

## Charts

| Component | Purpose |
| --------- | ------- |
| `ChartContainer` | Titled wrapper around a Recharts chart |
| `MetricGauge` | Single-value radial gauge |

---

## Button

`Button` ([`button.tsx`](../dashboard/src/components/ui/button.tsx)) is the
canonical action element. The root is `inline-flex items-center justify-center`
with a size-based gap, so icons and labels are always aligned and evenly spaced.

**Props**

| Prop | Type | Default |
| ---- | ---- | ------- |
| `variant` | `primary \| secondary \| ghost \| danger \| outline \| brand-outline \| default` | `primary` |
| `size` | `xs \| sm \| md \| lg \| xl \| icon` | `md` |
| `icon` | `ReactNode` (convenience slot) | — |
| `iconPosition` | `left \| right` | `left` |
| `leftIcon` / `rightIcon` | `ReactNode` (explicit slots; win over `icon`) | — |
| `loading` | `boolean` (spinner + disabled) | `false` |
| `iconOnly` | `boolean` (square, no label) | `false` |
| `fullWidth` | `boolean` | `false` |

```tsx
// Icon passed as a child — gap + vertical centering are handled internally.
<Button variant="outline" size="sm"><Eye size={14} /> CISO View</Button>

// Or via the convenience API:
<Button icon={<Plus />}>Add Risk</Button>
<Button icon={<ArrowRight />} iconPosition="right">Continue</Button>
```

> Do **not** add `mr-*`/`ml-*` margins to icons inside a `Button` — the internal
> gap handles spacing; manual margins double up.

`SentinelButton` (alias `Btn`) is a style-prop variant used in a few legacy
surfaces; prefer `Button` for new code.

---

## Colour & charts

All colour comes from design tokens. For Recharts, pull values from
[`src/lib/chart-colors.ts`](../dashboard/src/lib/chart-colors.ts) or the
`useChartTheme()` hook — never pass a Tailwind class or raw hex to a chart prop
in application code (literal hex is acceptable only inside that helper module).

```typescript
import { chartColors, trustScoreColor } from "@/lib/chart-colors";

<Line stroke={chartColors.trustHigh} />          // correct
<Bar fill={trustScoreColor(score)} />            // correct

<Line stroke="text-green-500" />                 // wrong
<Line stroke="#22c55e" />                        // wrong (in app code)
```

For status/category → style maps, always provide a fallback object and access
through a guard so an unrecognized key can never crash a render
(see [troubleshooting → Dashboard](./troubleshooting.md)):

```ts
const STATUS = { ok: { bg: "…" } };
const STATUS_FALLBACK = { bg: "hsl(var(--bg-muted))" };
const statusStyle = (k: string) => STATUS[k] ?? STATUS_FALLBACK;
```

---

## Typography (ADR-0007)

| Content type | Font |
| ------------ | ---- |
| Trust scores, request IDs, hashes, latency (ms), cost ($), API keys, timestamps | **JetBrains Mono** (`--font-mono`) |
| All other text | **Outfit Variable** (`--font-sans`) |

Apply monospace with the `font-mono` Tailwind utility. Outfit is self-hosted via
`@fontsource-variable/outfit` (bundled, no CDN, no generic fallback) — never set
`font-family` directly in component JSX.
