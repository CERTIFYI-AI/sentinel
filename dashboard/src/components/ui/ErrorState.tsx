// ErrorState — reusable error presentation component.
// Displays an icon, title, description, and optional retry CTA.
// Use this when a React Query hook returns an error.
import React from 'react';
import { WarningCircle } from '@phosphor-icons/react';

interface ErrorStateProps {
  /** Error headline — defaults to "Something went wrong" */
  title?: string;
  /** Error detail text */
  description?: string;
  /** Error object — extracts .message if present */
  error?: Error | unknown;
  /** Retry callback */
  onRetry?: () => void;
  /** Additional CSS class */
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  error,
  onRetry,
  className,
}: ErrorStateProps) {
  const detail = description
    ?? (error instanceof Error ? error.message : undefined)
    ?? 'An unexpected error occurred. Please try again.';

  return (
    <div
      role="alert"
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        gap: 12,
        background: 'hsl(var(--s-er-bg))',
        border: '1px solid hsl(var(--s-er-bg))',
        borderRadius: 0,
      }}
    >
      <div
        style={{
          background: 'hsl(var(--s-er-bg))',
          padding: 16,
          display: 'inline-flex',
          borderRadius: 0,
          color: 'hsl(var(--destructive))',
        }}
      >
        <WarningCircle size={28} weight="fill" />
      </div>
      <div>
        <p
          style={{
            fontWeight: 600,
            color: 'hsl(var(--text-1))',
            fontSize: 15,
            marginBottom: 4,
          }}
        >
          {title}
        </p>
        <p style={{ fontSize: 13, color: 'hsl(var(--text-3))', maxWidth: 360, margin: '0 auto', lineHeight: 1.6 }}>
          {detail}
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginTop: 4,
            padding: '6px 16px',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            background: 'hsl(var(--bg-raised))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 0,
            color: 'hsl(var(--text-1))',
          }}
          onMouseOver={e => (e.currentTarget.style.background = 'hsl(var(--bg-muted))')}
          onMouseOut={e => (e.currentTarget.style.background = 'hsl(var(--bg-raised))')}
        >
          Try again
        </button>
      )}
    </div>
  );
}

export default ErrorState;
