// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
//
// Shared layout primitive for all newly scaffolded GA pages. Every new
// module composes this component to get uniform:
//   - loading / error / empty states (explicit, a11y-correct).
//   - breadcrumb + page header.
//   - optional KPI row.
//   - full keyboard reachability and aria landmarks.
//
// The scaffold does not fetch data itself — callers pass a useQuery-shaped
// `state` object so each page can compose its own service / filters without
// this file knowing anything about the domain.

import type { ReactNode } from "react";
import { Info, Warning } from "@phosphor-icons/react";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";

export interface KpiTile {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "positive" | "warn" | "danger";
}

export interface ModuleScaffoldState {
  loading: boolean;
  error: string | null;
  empty: boolean;
}

export interface ModuleScaffoldProps {
  title: string;
  subtitle?: string;
  icon?: PhosphorIcon;
  breadcrumb?: Array<{ label: string; to?: string }>;
  kpis?: KpiTile[];
  actions?: ReactNode;
  state: ModuleScaffoldState;
  /** Optional message shown inside the empty-state card. */
  emptyMessage?: string;
  /** Optional CTA node rendered under the empty-state message. */
  emptyAction?: ReactNode;
  children: ReactNode;
}

function toneColor(tone: KpiTile["tone"]): string {
  switch (tone) {
    case "positive":
      return "hsl(var(--brand))";
    case "warn":
      return "hsl(var(--s-wn-tx))";
    case "danger":
      return "hsl(var(--s-er-tx))";
    default:
      return "hsl(var(--text-1))";
  }
}

export default function ModuleScaffold({
  title,
  subtitle,
  icon: Icon,
  breadcrumb,
  kpis,
  actions,
  state,
  emptyMessage,
  emptyAction,
  children,
}: ModuleScaffoldProps) {
  return (
    <main
      className="px-6 py-6 max-w-[1400px] mx-auto space-y-5"
      aria-labelledby="module-heading"
    >
      {breadcrumb && breadcrumb.length > 0 && (
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-xs" style={{ color: "hsl(var(--text-4))" }}>
            {breadcrumb.map((crumb, i) => (
              <li key={`${crumb.label}-${i}`} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden>/</span>}
                {crumb.to ? (
                  <a href={crumb.to} className="hover:underline">
                    {crumb.label}
                  </a>
                ) : (
                  <span aria-current={i === breadcrumb.length - 1 ? "page" : undefined}>
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <header className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {Icon && <Icon size={28} />}
          <div className="min-w-0">
            <h1 id="module-heading" className="text-2xl font-semibold">
              {title}
            </h1>
            {subtitle && (
              <p
                className="text-sm mt-1"
                style={{ color: "hsl(var(--text-4))" }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>

      {kpis && kpis.length > 0 && (
        <section
          aria-label="Key metrics"
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${Math.min(kpis.length, 4)}, minmax(0, 1fr))` }}
        >
          {kpis.map((k) => (
            <div
              key={k.label}
              className="rounded border px-4 py-3"
              style={{
                borderColor: "hsl(var(--border))",
                background: "hsl(var(--bg-raised))",
              }}
            >
              <div
                className="text-xs uppercase tracking-wide mb-1"
                style={{ color: "hsl(var(--text-4))" }}
              >
                {k.label}
              </div>
              <div
                className="text-xl font-semibold"
                style={{ color: toneColor(k.tone) }}
              >
                {k.value}
              </div>
              {k.hint && (
                <div
                  className="text-xs mt-1"
                  style={{ color: "hsl(var(--text-4))" }}
                >
                  {k.hint}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {state.loading ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded border px-4 py-8 text-sm text-center"
          style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--text-4))" }}
        >
          Loading…
        </div>
      ) : state.error ? (
        <div
          role="alert"
          className="rounded border px-4 py-3 text-sm flex items-start gap-2"
          style={{ borderColor: "hsl(var(--s-er-tx))", color: "hsl(var(--s-er-tx))" }}
        >
          <Warning size={16} aria-hidden />
          <span>{state.error}</span>
        </div>
      ) : state.empty ? (
        <div
          className="rounded border px-4 py-10 text-center"
          style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--bg-raised))" }}
        >
          <Info size={22} aria-hidden style={{ color: "hsl(var(--text-4))" }} />
          <p className="mt-2 text-sm" style={{ color: "hsl(var(--text-2))" }}>
            {emptyMessage ?? "No data yet."}
          </p>
          {emptyAction && <div className="mt-3">{emptyAction}</div>}
        </div>
      ) : (
        children
      )}
    </main>
  );
}
