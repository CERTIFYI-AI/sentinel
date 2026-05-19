// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// WS5 — Framework catalog browser.
//
// Renders the full set of GRC frameworks (currently 22) grouped by
// domain, each linking to its authoritative source. This page is a
// read-only catalog; control-level adoption happens in
// ComplianceControls.tsx.

import { useMemo, useState } from "react";
import { Books } from "@phosphor-icons/react";
import ModuleScaffold from "@/components/ModuleScaffold";
import {
  listFrameworks,
  FRAMEWORK_COUNT,
  TOTAL_CONTROL_COUNT,
  type FrameworkSummary,
} from "@/lib/frameworks";

const DOMAIN_LABEL: Record<FrameworkSummary["domain"], string> = {
  attestation: "Attestation",
  infosec: "Information Security",
  privacy: "Privacy",
  cybersecurity: "Cybersecurity",
  federal: "Federal / Government",
  payments: "Payments",
  healthcare: "Healthcare",
  "ai-governance": "AI Governance",
  financial: "Financial Services",
};

export default function FrameworkCatalog() {
  const all = useMemo(() => listFrameworks(), []);
  const [query, setQuery] = useState("");

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? all.filter(
          (f) =>
            f.name.toLowerCase().includes(q) ||
            f.authority.toLowerCase().includes(q) ||
            f.id.toLowerCase().includes(q)
        )
      : all;
    const byDomain = new Map<FrameworkSummary["domain"], FrameworkSummary[]>();
    for (const f of filtered) {
      const list = byDomain.get(f.domain) ?? [];
      list.push(f);
      byDomain.set(f.domain, list);
    }
    return Array.from(byDomain.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [all, query]);

  return (
    <ModuleScaffold
      title="Framework Catalog"
      subtitle="Authoritative GRC frameworks bundled with Sentinel. Each entry links to the issuing authority."
      icon={Books}
      breadcrumb={[{ label: "Compliance" }, { label: "Framework Catalog" }]}
      state={{ loading: false, error: null, empty: false }}
      kpis={[
        { label: "Frameworks", value: FRAMEWORK_COUNT, tone: "positive" },
        { label: "Seed controls", value: TOTAL_CONTROL_COUNT },
        { label: "Domains", value: new Set(all.map((f) => f.domain)).size },
      ]}
    >
      <section aria-label="Catalog filter" className="mb-4">
        <label className="flex flex-col text-sm gap-1 max-w-md">
          <span>Search</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. SOC 2, NIST, GDPR"
            className="rounded border px-2 py-1"
            style={{ borderColor: "hsl(var(--border))" }}
          />
        </label>
      </section>

      {grouped.length === 0 ? (
        <p className="text-sm" style={{ color: "hsl(var(--text-4))" }}>
          No frameworks match that search.
        </p>
      ) : (
        grouped.map(([domain, list]) => (
          <section key={domain} aria-label={DOMAIN_LABEL[domain]} className="mb-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide mb-2"
              style={{ color: "hsl(var(--text-4))" }}>
              {DOMAIN_LABEL[domain]}
            </h2>
            <ul role="list" className="grid gap-2 md:grid-cols-2">
              {list.map((f) => (
                <li key={f.id} className="rounded border px-4 py-3"
                  style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--bg-raised))" }}>
                  <div className="flex justify-between gap-3">
                    <strong className="text-sm">{f.name}</strong>
                    <span className="text-xs" style={{ color: "hsl(var(--text-4))" }}>
                      {f.control_count} controls
                    </span>
                  </div>
                  <p className="mt-1 text-xs" style={{ color: "hsl(var(--text-2))" }}>
                    {f.authority} · {f.version}
                  </p>
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs underline"
                    style={{ color: "hsl(var(--brand))" }}
                  >
                    View source →
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </ModuleScaffold>
  );
}
