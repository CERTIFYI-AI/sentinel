// ErrorState — reusable error presentation component.
// Displays an icon, title, description, and optional retry CTA.
// Use this when a React Query hook returns an error.
import React from 'react';
import { WarningCircle, Wrench } from '@phosphor-icons/react';
import { humanizeError, isMissingRelationError } from '@/lib/supabaseError';

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
  /** Names what was being loaded, e.g. "vendor assessments", for a natural
   *  "not set up yet" message when the table is missing. */
  subject?: string;
}

export function ErrorState({
  title,
  description,
  error,
  onRetry,
  className,
  subject = 'this data',
}: ErrorStateProps) {
  // A "table not found in the schema cache" error is not a fault to alarm the
  // operator with — it means the module's backend has not been provisioned in
  // this environment yet. Render it as a calm setup state, and never leak the
  // raw schema-cache phrasing. An explicit `title`/`description` from the
  // caller always wins.
  const friendly = humanizeError(error, subject);
  const isSetup = isMissingRelationError(error);
  // For a missing-table error the caller's title (usually "Could not load X")
  // is misleading — nothing failed to load, the backend just isn't there yet —
  // so the friendly wording wins. For a real fault the caller's title stands.
  const resolvedTitle = isSetup ? friendly.title : (title ?? friendly.title);
  const detail = isSetup ? friendly.detail : (description ?? friendly.detail);

  return (
    <div
      role={isSetup ? "status" : "alert"}
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        gap: 12,
        background: isSetup ? 'hsl(var(--bg-raised))' : 'hsl(var(--s-er-bg))',
        border: isSetup ? '1px solid hsl(var(--border))' : '1px solid hsl(var(--s-er-br))',
        borderRadius: 0,
      }}
    >
      <div
        style={{
          background: 'hsl(var(--bg-surface))',
          padding: 16,
          display: 'inline-flex',
          borderRadius: 0,
          border: isSetup ? '1px solid hsl(var(--border))' : '1px solid hsl(var(--s-er-br))',
          color: isSetup ? 'hsl(var(--text-3))' : 'hsl(var(--destructive))',
        }}
      >
        {isSetup ? <Wrench size={28} weight="duotone" /> : <WarningCircle size={28} weight="fill" />}
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
          {resolvedTitle}
        </p>
        <p style={{ fontSize: 13, color: 'hsl(var(--text-3))', maxWidth: 360, margin: '0 auto', lineHeight: 1.6 }}>
          {detail}
        </p>
      </div>
      {onRetry && !isSetup && (
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
