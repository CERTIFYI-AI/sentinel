import { cn } from '../../lib/utils';

// Skeleton — token-aware shimmer block.
// Uses hsl(var(--bg-muted)) so it adapts to both light and dark mode.
// border-radius is globally overridden to 0 by tokens.css; we also set
// rounded-none here so the intent is explicit in the source.

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-none', className)}
      style={{ background: 'hsl(var(--bg-muted))' }}
      {...props}
    />
  );
}

export { Skeleton };
