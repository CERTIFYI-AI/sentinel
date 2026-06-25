// PageSkeleton — themed shimmer loading placeholder.
// Uses design-system CSS custom properties for colors (not Tailwind gray).
import React from 'react';

interface PageSkeletonProps {
  /** Optional page title (renders a wide shimmer bar) */
  title?: string;
  /** Number of table-row shimmer items to render */
  rows?: number;
  /** Show four KPI stat-card skeletons above the rows */
  showStats?: boolean;
}

function ShimmerBox({ height = 16, width = '100%', style = {} }: {
  height?: number;
  width?: string | number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        height,
        width,
        background: 'hsl(var(--bg-raised))',
        borderRadius: 0,
        overflow: 'hidden',
        position: 'relative',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, transparent 0%, hsl(var(--bg-muted)) 50%, transparent 100%)',
          animation: 'shimmer 1.4s ease-in-out infinite',
        }}
      />
    </div>
  );
}

export const PageSkeleton: React.FC<PageSkeletonProps> = ({ title, rows = 5, showStats = true }) => {
  return (
    <>
      {/* Inject shimmer keyframes once */}
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
      <div
        role="status"
        aria-label="Loading…"
        className="space-y-5 p-6"
        style={{ width: '100%' }}
      >
        {/* Title */}
        {title && (
          <ShimmerBox height={28} width="30%" />
        )}
        <ShimmerBox height={14} width="55%" />

        {/* Stat cards */}
        {showStats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 16 }}>
            {[1, 2, 3, 4].map(i => (
              <ShimmerBox key={i} height={80} />
            ))}
          </div>
        )}

        {/* Table rows */}
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Header */}
          <ShimmerBox height={36} style={{ opacity: 0.6 }} />
          {/* Rows */}
          {Array.from({ length: rows }).map((_, i) => (
            <ShimmerBox key={i} height={48} style={{ opacity: 1 - i * 0.07 }} />
          ))}
        </div>
      </div>
    </>
  );
};

export default PageSkeleton;
