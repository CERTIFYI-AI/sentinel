// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// Enterprise error boundary. Catches render-time failures in the routed page
// surface and presents an actionable, diagnostics-rich fallback instead of a
// blank screen or a generic message. The app shell (sidebar + header) stays
// mounted because this boundary wraps only the <Outlet/>.
//
// Design intent: density + precision. Show the operator exactly what broke,
// where, and give them one-click recovery + copyable diagnostics for triage.

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { WarningOctagon, ArrowClockwise, House, Copy, Check, CaretDown } from '@phosphor-icons/react';

interface InjectedProps {
  /** Current route path — used for context + as a reset key on navigation. */
  routePath: string;
  /** Programmatic navigation for the recovery actions. */
  onNavigateHome: () => void;
}

interface Props extends Partial<InjectedProps> {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  componentStack?: string;
  errorId?: string;
  copied: boolean;
}

const isDev = import.meta.env?.DEV ?? false;

function makeErrorId(): string {
  // Short, human-quotable correlation id (e.g. ERR-7F3A9C).
  return 'ERR-' + Math.random().toString(16).slice(2, 8).toUpperCase();
}

class ErrorBoundaryInner extends Component<Props, State> {
  public state: State = { hasError: false, copied: false };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, errorId: makeErrorId() };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ componentStack: errorInfo.componentStack ?? undefined });
    // Structured console signal for log scraping / session replay tools.
    console.error('[Sentinel] Render error caught by ErrorBoundary', {
      message: error.message,
      route: this.props.routePath,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  public componentDidUpdate(prevProps: Props) {
    // Auto-clear the error when the operator navigates to a different route.
    if (this.state.hasError && prevProps.routePath !== this.props.routePath) {
      this.setState({ hasError: false, error: undefined, componentStack: undefined, copied: false });
    }
  }

  private reset = () => {
    this.setState({ hasError: false, error: undefined, componentStack: undefined, copied: false });
  };

  private diagnostics(): string {
    const { error, componentStack, errorId } = this.state;
    return [
      `Error ID:   ${errorId ?? 'n/a'}`,
      `Route:      ${this.props.routePath ?? 'unknown'}`,
      `Timestamp:  ${new Date().toISOString()}`,
      `Message:    ${error?.message ?? 'unknown'}`,
      '',
      'Stack:',
      error?.stack ?? '(none)',
      '',
      'Component stack:',
      componentStack ?? '(none)',
    ].join('\n');
  }

  private copyDiagnostics = async () => {
    try {
      await navigator.clipboard.writeText(this.diagnostics());
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch {
      /* clipboard unavailable — no-op */
    }
  };

  public render() {
    if (!this.state.hasError) return this.props.children;

    const { error, componentStack, errorId, copied } = this.state;
    const route = this.props.routePath ?? window.location.pathname;
    const message = error?.message || 'An unexpected rendering error occurred.';

    return (
      <div role="alert" className="max-w-3xl">
        <div style={{ border: '1px solid hsl(var(--s-er-br))', background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          {/* Header band */}
          <div
            className="flex items-start gap-3 px-5 py-4"
            style={{ background: 'hsl(var(--s-er-bg))', borderBottom: '1px solid hsl(var(--s-er-br))' }}
          >
            <div style={{ color: 'hsl(var(--s-er-tx))', flexShrink: 0, marginTop: 1 }}>
              <WarningOctagon size={22} weight="fill" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[15px] font-bold" style={{ color: 'hsl(var(--text-1))' }}>
                  This page hit a runtime error
                </h2>
                <span
                  className="text-[10px] font-mono px-1.5 py-0.5"
                  style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--s-er-br))', color: 'hsl(var(--s-er-tx))' }}
                >
                  {errorId}
                </span>
              </div>
              <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-3))' }}>
                The application shell is intact — your navigation and other modules still work. The error below
                is isolated to <span className="font-mono" style={{ color: 'hsl(var(--text-2))' }}>{route}</span>.
              </p>
            </div>
          </div>

          {/* Error message — verbatim, not generic */}
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'hsl(var(--text-4))' }}>
              Error message
            </p>
            <pre
              className="text-xs font-mono whitespace-pre-wrap break-words px-3 py-2"
              style={{ background: 'hsl(var(--bg-sunken))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--s-er-tx))', borderRadius: 0, margin: 0 }}
            >
              {message}
            </pre>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <button
                onClick={this.reset}
                className="inline-flex items-center justify-center gap-1.5 px-3 h-8 text-xs font-medium"
                style={{ background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))', border: 'none', borderRadius: 0, cursor: 'pointer' }}
              >
                <ArrowClockwise size={14} /> Retry render
              </button>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center gap-1.5 px-3 h-8 text-xs font-medium"
                style={{ background: 'hsl(var(--bg-raised))', color: 'hsl(var(--text-1))', border: '1px solid hsl(var(--border))', borderRadius: 0, cursor: 'pointer' }}
              >
                <ArrowClockwise size={14} /> Hard reload
              </button>
              {this.props.onNavigateHome && (
                <button
                  onClick={this.props.onNavigateHome}
                  className="inline-flex items-center justify-center gap-1.5 px-3 h-8 text-xs font-medium"
                  style={{ background: 'hsl(var(--bg-raised))', color: 'hsl(var(--text-1))', border: '1px solid hsl(var(--border))', borderRadius: 0, cursor: 'pointer' }}
                >
                  <House size={14} /> Back to Overview
                </button>
              )}
              <button
                onClick={this.copyDiagnostics}
                className="inline-flex items-center justify-center gap-1.5 px-3 h-8 text-xs font-medium"
                style={{ background: 'hsl(var(--bg-raised))', color: 'hsl(var(--text-2))', border: '1px solid hsl(var(--border))', borderRadius: 0, cursor: 'pointer' }}
              >
                {copied ? <Check size={14} weight="bold" /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy diagnostics'}
              </button>
            </div>

            {/* Dev-only stack trace */}
            {isDev && (error?.stack || componentStack) && (
              <details className="mt-4 group">
                <summary
                  className="inline-flex items-center gap-1 text-[11px] font-medium cursor-pointer select-none"
                  style={{ color: 'hsl(var(--text-3))' }}
                >
                  <CaretDown size={12} className="transition-transform group-open:rotate-0 -rotate-90" />
                  Stack trace (development only)
                </summary>
                <pre
                  className="text-[10px] font-mono whitespace-pre-wrap break-words px-3 py-2 mt-2 max-h-72 overflow-auto"
                  style={{ background: 'hsl(var(--bg-sunken))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-3))', borderRadius: 0, margin: 0 }}
                >
                  {error?.stack}
                  {componentStack ? `\n\nComponent stack:${componentStack}` : ''}
                </pre>
              </details>
            )}
          </div>
        </div>
      </div>
    );
  }
}

/**
 * Route-aware wrapper: injects the current path (used as a reset signal so the
 * boundary clears itself on navigation) and a home-navigation handler.
 */
export function ErrorBoundary({ children }: { children?: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <ErrorBoundaryInner routePath={location.pathname} onNavigateHome={() => navigate('/overview')}>
      {children}
    </ErrorBoundaryInner>
  );
}

export default ErrorBoundary;
