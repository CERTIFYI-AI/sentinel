import { useEffect, useState } from 'react';

// ── Shimmer block ─────────────────────────────────────────────────────────────
// Thin wrapper around animate-pulse that enforces design-token colors and
// border-radius: 0 (already global, but explicit here for clarity).

function Shimmer({
  className = '',
  style = {},
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`animate-pulse flex-shrink-0 ${className}`}
      style={{ background: 'hsl(var(--bg-muted))', borderRadius: 0, ...style }}
    />
  );
}

// ── Animated 3-dot loader ─────────────────────────────────────────────────────
// Three brand-colored squares that bounce in sequence.
// Exported so inline loading contexts (data-fetch spinners, AI analysis
// banners, etc.) can import and reuse this without pulling in the full skeleton.

export function DotsLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1"
      role="status"
      aria-label={label}
    >
      {([0, 150, 300] as const).map((delay, i) => (
        <span
          key={i}
          className="block w-1.5 h-1.5 animate-bounce"
          style={{
            background: 'hsl(var(--brand))',
            animationDelay: `${delay}ms`,
            animationDuration: '700ms',
            borderRadius: 0,
          }}
        />
      ))}
    </span>
  );
}

// ── Status messages ───────────────────────────────────────────────────────────
// Rotate through domain-relevant messages so the skeleton feels alive.

const STATUS_MESSAGES = [
  'Fetching governance data',
  'Loading controls & evidence',
  'Preparing risk analysis',
  'Syncing compliance frameworks',
  'Initialising policy engine',
  'Resolving regulatory mappings',
  'Aggregating trust signals',
  'Loading model inventory',
];

// ── Skeleton stat tile ────────────────────────────────────────────────────────

function StatTileSkeleton({ titleWidth }: { titleWidth: number }) {
  return (
    <div
      className="p-4 space-y-3"
      style={{
        background: 'hsl(var(--bg-surface))',
        border: '1px solid hsl(var(--border))',
      }}
    >
      <div className="flex items-center justify-between">
        <Shimmer style={{ height: 12, width: titleWidth }} />
        <Shimmer style={{ height: 24, width: 24 }} />
      </div>
      <Shimmer style={{ height: 32, width: 60 }} />
      <Shimmer style={{ height: 11, width: 100 }} />
    </div>
  );
}

// ── Skeleton table row ────────────────────────────────────────────────────────

function TableRowSkeleton({
  index,
  cols,
}: {
  index: number;
  cols: number[];
}) {
  return (
    <div
      className="flex items-center gap-4 px-4 py-3.5"
      style={{
        borderBottom: '1px solid hsl(var(--border))',
        opacity: Math.max(0.3, 1 - index * 0.1),
      }}
    >
      {/* First col always has a checkbox + text */}
      <div className="flex items-center gap-2" style={{ flex: cols[0] }}>
        <Shimmer style={{ height: 14, width: 14 }} />
        <Shimmer style={{ height: 13, flex: 1 }} />
      </div>
      {cols.slice(1).map((w, j) => (
        <Shimmer key={j} style={{ height: 13, width: w, flexShrink: 0 }} />
      ))}
    </div>
  );
}

// ── Full page skeleton ────────────────────────────────────────────────────────
// Renders a realistic page layout while a lazy route is loading.
// Shape: page header → 4 stat tiles → chart + sidebar card → filter bar → table → status bar.

export function PageSkeleton() {
  const [msgIdx, setMsgIdx] = useState(
    () => Math.floor(Math.random() * STATUS_MESSAGES.length),
  );

  useEffect(() => {
    const timer = setInterval(
      () => setMsgIdx((i) => (i + 1) % STATUS_MESSAGES.length),
      1800,
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="space-y-6 animate-in fade-in duration-300"
      aria-busy="true"
      aria-label="Loading page"
    >
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Shimmer style={{ height: 28, width: 220 }} />
          <Shimmer style={{ height: 14, width: 340 }} />
        </div>
        <div className="flex items-center gap-2">
          <Shimmer style={{ height: 32, width: 100 }} />
          <Shimmer style={{ height: 32, width: 120 }} />
        </div>
      </div>

      {/* ── Stat tiles ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        {([80, 110, 70, 95] as const).map((w, i) => (
          <StatTileSkeleton key={i} titleWidth={w} />
        ))}
      </div>

      {/* ── Chart + sidebar card ─────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {/* Chart card — 2/3 width */}
        <div
          className="col-span-2 p-4 space-y-4"
          style={{
            background: 'hsl(var(--bg-surface))',
            border: '1px solid hsl(var(--border))',
          }}
        >
          <div className="flex items-center justify-between">
            <Shimmer style={{ height: 14, width: 160 }} />
            <Shimmer style={{ height: 28, width: 80 }} />
          </div>
          {/* Bar chart placeholder */}
          <div
            className="flex items-end gap-2"
            style={{ height: 160, paddingTop: 16 }}
          >
            {[72, 48, 88, 60, 92, 55, 78, 42, 83, 67, 53, 96].map((h, i) => (
              <Shimmer
                key={i}
                style={{ height: `${h}%`, flex: 1, alignSelf: 'flex-end' }}
              />
            ))}
          </div>
          {/* X-axis labels */}
          <div className="flex items-center gap-2 pt-1">
            {[32, 28, 36, 30, 40, 26, 34, 28, 38, 32, 28, 44].map((w, i) => (
              <Shimmer key={i} style={{ height: 10, width: w, flex: 1 }} />
            ))}
          </div>
        </div>

        {/* Sidebar card — 1/3 width */}
        <div
          className="p-4 space-y-3.5"
          style={{
            background: 'hsl(var(--bg-surface))',
            border: '1px solid hsl(var(--border))',
          }}
        >
          <Shimmer style={{ height: 14, width: 130 }} />
          <div
            className="space-y-0"
            style={{ borderTop: '1px solid hsl(var(--border))' }}
          >
            {[
              [90, 56],
              [70, 48],
              [85, 52],
              [60, 44],
              [80, 56],
              [65, 48],
            ].map(([lw, vw], i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2.5"
                style={{ borderBottom: '1px solid hsl(var(--border))' }}
              >
                <Shimmer style={{ height: 12, width: lw }} />
                <Shimmer style={{ height: 20, width: vw }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Filter bar ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Shimmer style={{ height: 32, width: 240 }} />
        <Shimmer style={{ height: 32, width: 140 }} />
        <Shimmer style={{ height: 32, width: 140 }} />
        <div className="ml-auto flex gap-2">
          <Shimmer style={{ height: 32, width: 80 }} />
          <Shimmer style={{ height: 32, width: 100 }} />
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: 'hsl(var(--bg-surface))',
          border: '1px solid hsl(var(--border))',
        }}
      >
        {/* Header row */}
        <div
          className="flex items-center gap-4 px-4 py-3"
          style={{ borderBottom: '1px solid hsl(var(--border))' }}
        >
          <Shimmer style={{ height: 12, width: 14 }} />
          {[80, 100, 60, 120, 70, 60].map((w, i) => (
            <Shimmer key={i} style={{ height: 11, width: w }} />
          ))}
        </div>
        {/* Data rows — fade out toward bottom */}
        {Array.from({ length: 7 }).map((_, i) => (
          <TableRowSkeleton
            key={i}
            index={i}
            cols={[1, 96, 56, 110, 64, 56]}
          />
        ))}
      </div>

      {/* ── Status bar ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-2 py-1">
        <DotsLoader />
        <span
          className="text-xs"
          key={msgIdx}
          style={{
            color: 'hsl(var(--text-4))',
            minWidth: 230,
            animation: 'fadeIn 0.4s ease',
          }}
        >
          {STATUS_MESSAGES[msgIdx]}&hellip;
        </span>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
