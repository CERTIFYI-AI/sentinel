import { useState } from 'react';
import { Warning, X, ArrowRight } from '@phosphor-icons/react';
import { TASKS } from './taskData';

interface OverdueAlertBannerProps {
  /** Override the tasks list; defaults to the canonical TASKS seed. */
  tasks?: typeof TASKS;
  /** Callback when "View Overdue Tasks" is clicked. */
  onViewOverdue?: () => void;
}

export default function OverdueAlertBanner({ tasks = TASKS, onViewOverdue }: OverdueAlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  const overdue = tasks.filter(t => t.status === 'overdue');
  const overdueCount = overdue.length;

  if (overdueCount === 0 || dismissed) return null;

  // Group by priority
  const critical = overdue.filter(t => t.priority === 'critical').length;
  const high = overdue.filter(t => t.priority === 'high').length;

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        background: 'hsl(var(--s-er-bg))',
        border: '1px solid hsl(var(--s-er-br))',
        borderLeft: '4px solid #ef4444',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
              }}
    >
      {/* Icon */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: '#ef444420',
        border: '1px solid #ef444440',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Warning size={16} style={{ color: '#ef4444' }} weight="fill" />
      </div>

      {/* Text */}
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'hsl(var(--s-er-tx))' }}>
          {overdueCount} overdue task{overdueCount > 1 ? 's' : ''} require immediate attention
        </span>
        <span style={{ fontSize: 12, color: 'hsl(var(--s-er-tx))', opacity: 0.75, marginLeft: 8 }}>
          {critical > 0 && `${critical} critical`}
          {critical > 0 && high > 0 && ' · '}
          {high > 0 && `${high} high priority`}
        </span>
      </div>

      {/* CTA */}
      <button
        onClick={onViewOverdue}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 12, fontWeight: 600,
          color: '#ef4444',
          background: 'none', border: '1px solid #ef444440',
          padding: '4px 12px',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        View Overdue Tasks <ArrowRight size={12} />
      </button>

      {/* Dismiss */}
      <button
        onClick={() => setDismissed(true)}
        title="Dismiss"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'hsl(var(--s-er-tx))', opacity: 0.6,
          padding: 2, flexShrink: 0,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
