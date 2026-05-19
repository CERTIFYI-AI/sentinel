# UI Component Reference

Reference for shared components used across the Sentinel dashboard. Relevant for contributors extending the frontend.

## TrustScoreBadge

Renders a colored badge for a trust score value.

**Props:** `score: number` (0.0 to 1.0), `size?: "sm" | "md" | "lg"`

Color logic:
- score >= 0.85: green (trust high)
- score 0.70-0.84: amber (trust medium)
- score < 0.70: red (trust low)

Value is always rendered in IBM Plex Mono.

## InterventionBadge

**Props:** `level: "NONE" | "REGENERATE" | "UPGRADE" | "HITL"`

Colors: zinc / blue / amber / red

## FrameworkBadge

**Props:** `status: "mandatory_law" | "certifiable" | "voluntary" | "policy_guide" | "tech_standard"`

Colors: red / blue / green / zinc / zinc

## StatCard

Four-field card: title, value, subtitle, optional trend. Value always rendered in IBM Plex Mono.

## TrustPulseBar

Fixed 2px bar at viewport top. Props: `score: number`. Color updates on every WebSocket push from `/ws/metrics`. On hover: expands to 4px and shows tooltip with exact score and label.

## Chart Colors

All Recharts colors must come from `src/lib/chart-colors.ts`. Never pass a Tailwind class or hardcoded hex to a Recharts prop.

```typescript
import { chartColors } from "@/lib/chart-colors"

// Correct
<Line stroke={chartColors.trustHigh} />

// Wrong
<Line stroke="text-green-500" />
<Line stroke="#22c55e" />
```

## Font Rules

| Content type | Font |
|-------------|------|
| Trust scores | IBM Plex Mono |
| Request IDs and hashes | IBM Plex Mono |
| Latency values (ms) | IBM Plex Mono |
| Cost values ($) | IBM Plex Mono |
| API keys | IBM Plex Mono |
| All other text | IBM Plex Sans |

Apply monospace with the `font-mono` class. Never use `font-family` directly in component JSX.
