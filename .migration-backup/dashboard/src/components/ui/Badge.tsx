interface BadgeProps { status: string; className?: string; }

const map: Record<string, [string,string,string]> = {
  draft: ['--s-nt-bg','--s-nt-tx','--s-nt-br'],
  archived: ['--s-nt-bg','--s-nt-tx','--s-nt-br'],
  deprecated: ['--s-nt-bg','--s-nt-tx','--s-nt-br'],
  open: ['--s-in-bg','--s-in-tx','--s-in-br'],
  discovered: ['--s-in-bg','--s-in-tx','--s-in-br'],
  in_review: ['--s-in-bg','--s-in-tx','--s-in-br'],
  pending: ['--s-wn-bg','--s-wn-tx','--s-wn-br'],
  under_review: ['--s-wn-bg','--s-wn-tx','--s-wn-br'],
  changes_requested: ['--s-wn-bg','--s-wn-tx','--s-wn-br'],
  pending_approval: ['--s-wn-bg','--s-wn-tx','--s-wn-br'],
  not_started: ['--s-nt-bg','--s-nt-tx','--s-nt-br'],
  active: ['--s-ok-bg','--s-ok-tx','--s-ok-br'],
  approved: ['--s-ok-bg','--s-ok-tx','--s-ok-br'],
  published: ['--s-ok-bg','--s-ok-tx','--s-ok-br'],
  implemented: ['--s-ok-bg','--s-ok-tx','--s-ok-br'],
  confirmed: ['--s-ok-bg','--s-ok-tx','--s-ok-br'],
  completed: ['--s-ok-bg','--s-ok-tx','--s-ok-br'],
  in_progress: ['--s-in-bg','--s-in-tx','--s-in-br'],
  mitigating: ['--s-wn-bg','--s-wn-tx','--s-wn-br'],
  mitigated: ['--s-ok-bg','--s-ok-tx','--s-ok-br'],
  accepted: ['--s-nt-bg','--s-nt-tx','--s-nt-br'],
  rejected: ['--s-er-bg','--s-er-tx','--s-er-br'],
  blocked: ['--s-er-bg','--s-er-tx','--s-er-br'],
  failed: ['--s-er-bg','--s-er-tx','--s-er-br'],
  expired: ['--s-er-bg','--s-er-tx','--s-er-br'],
  critical: ['--r-cr-bg','--r-cr-tx','--r-cr-br'],
  high: ['--r-hi-bg','--r-hi-tx','--r-hi-br'],
  medium: ['--r-md-bg','--r-md-tx','--r-md-br'],
  low: ['--r-lo-bg','--r-lo-tx','--r-lo-br'],
  prohibited: ['--r-cr-bg','--r-cr-tx','--r-cr-br'],
  minimal: ['--r-lo-bg','--r-lo-tx','--r-lo-br'],
  limited: ['--r-md-bg','--r-md-tx','--r-md-br'],
};

export function Badge({ status, className = '' }: BadgeProps) {
  const key = status.toLowerCase().replace(/[\s-]/g, '_');
  const vars = map[key];
  const style = vars ? {
    background: `hsl(var(${vars[0]}))`,
    color: `hsl(var(${vars[1]}))`,
    border: `1px solid hsl(var(${vars[2]}))`,
  } : { background: '#2d1b69', color: '#c4b5fd', border: '1px solid #4c1d95' };
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return (
    <span
      style={style}
      className={`inline-flex items-center text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 ${className}`}
    >
      {label}
    </span>
  );
}
