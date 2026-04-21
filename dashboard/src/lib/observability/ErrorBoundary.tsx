// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// WS0.6 — React error boundary. Catches render errors, logs to the
// structured logger, and renders a recoverable fallback. Wrap route
// elements and any async data surface that renders out-of-band.

import { Component, type ErrorInfo, type ReactNode } from "react";
import { log } from "./logger";

interface Props {
  readonly children: ReactNode;
  readonly fallback?: (err: Error, reset: () => void) => ReactNode;
  readonly name?: string;
}

interface State {
  readonly error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    log.error("ui.render_error", {
      boundary: this.props.name ?? "unnamed",
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  private reset = (): void => this.setState({ error: null });

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);
    return (
      <div role="alert" className="p-6 rounded border border-red-300 bg-red-50 text-red-900">
        <h2 className="font-semibold">Something went wrong</h2>
        <p className="text-sm mt-2">{error.message}</p>
        <button
          type="button"
          onClick={this.reset}
          className="mt-4 px-3 py-1.5 rounded bg-red-600 text-white text-sm"
        >
          Try again
        </button>
      </div>
    );
  }
}
