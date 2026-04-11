import { DotsLoader } from './ui/PageSkeleton';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  dots?: boolean;
  label?: string;
}

export function LoadingSpinner({
  size = 'md',
  className = '',
  dots = false,
  label = 'Loading',
}: LoadingSpinnerProps) {
  if (dots) {
    return (
      <div className={`flex items-center justify-center gap-2 ${className}`}>
        <DotsLoader label={label} />
        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
          {label}&hellip;
        </span>
      </div>
    );
  }

  const sizes: Record<string, { box: string; border: string }> = {
    sm: { box: 'h-4 w-4', border: 'border-2' },
    md: { box: 'h-8 w-8', border: 'border-2' },
    lg: { box: 'h-12 w-12', border: 'border-[3px]' },
  };

  const s = sizes[size];

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`animate-spin ${s.box} ${s.border}`}
        style={{
          borderColor: 'hsl(var(--border-mid))',
          borderTopColor: 'hsl(var(--brand))',
          borderRadius: 0,
        }}
        role="status"
        aria-label={label}
      />
    </div>
  );
}

export default LoadingSpinner;
