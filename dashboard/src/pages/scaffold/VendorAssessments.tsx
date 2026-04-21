// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// WS2 — Vendor Assessments (scaffolded page).
// Category: Vendors
//
// Real data binding is wired in subsequent workstreams as the backing
// services and tables land. This scaffold enforces the uniform
// loading / error / empty a11y contract.

import { useEffect, useRef, useState } from "react";
import { ClipboardText } from "@phosphor-icons/react";
import ModuleScaffold from "@/components/ModuleScaffold";
import { isSupabaseConfigured } from "@/lib/supabase";

interface Row {
  id: string;
  label: string;
}

export default function VendorAssessments() {
  const abortRef = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (!isSupabaseConfigured()) {
          // No backing service yet; render an empty-state cleanly.
          setRows([]);
          return;
        }
        // Real query plugged in WS3/WS5/WS6.
        setRows([]);
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, []);

  return (
    <ModuleScaffold
      title="Vendor Assessments"
      subtitle="Questionnaires, evidence, and residual-risk scoring."
      icon={ClipboardText}
      breadcrumb={[{ label: "Vendors" }, { label: "Vendor Assessments" }]}
      state={{ loading, error, empty: !loading && !error && rows.length === 0 }}
      emptyMessage="Nothing to show yet. Connect a data source or import records to get started."
    >
      <section aria-label="Vendor Assessments records">
        <ul role="list" className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded border px-4 py-3 text-sm"
              style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--bg-raised))" }}
            >
              {r.label}
            </li>
          ))}
        </ul>
      </section>
    </ModuleScaffold>
  );
}
