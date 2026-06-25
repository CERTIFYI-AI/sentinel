// EmptyState — reusable empty/zero-state component.
// Styled with design-system tokens to match the enterprise theme.
import React from 'react';

interface EmptyStateProps {
  /** Phosphor icon or any ReactNode to display in the icon well */
  icon?: React.ReactNode;
  /** Primary headline (e.g. "No risks yet") */
  title: string;
  /** Supporting body copy */
  description?: string;
  /** CTA button or link */
  action?: React.ReactNode;
  /** Additional CSS class */
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-label={title}
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '56px 24px',
        textAlign: 'center',
        gap: 16,
        background: 'hsl(var(--bg-surface))',
        border: '1px dashed hsl(var(--border))',
        borderRadius: 0,
      }}
    >
      {icon && (
        <div
          style={{
            background: 'hsl(var(--bg-raised))',
            padding: 18,
            display: 'inline-flex',
            borderRadius: 0,
            border: '1px solid hsl(var(--border))',
            color: 'hsl(var(--text-3))',
          }}
        >
          {icon}
        </div>
      )}
      <div>
        <p
          style={{
            fontWeight: 600,
            color: 'hsl(var(--text-1))',
            fontSize: 15,
            marginBottom: description ? 6 : 0,
          }}
        >
          {title}
        </p>
        {description && (
          <p style={{ fontSize: 13, color: 'hsl(var(--text-3))', maxWidth: 380, margin: '0 auto', lineHeight: 1.6 }}>
            {description}
          </p>
        )}
      </div>
      {action && <div style={{ marginTop: 4 }}>{action}</div>}
    </div>
  );
}

export default EmptyState;
