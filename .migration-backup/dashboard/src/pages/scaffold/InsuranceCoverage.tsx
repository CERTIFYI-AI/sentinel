// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// WS2 — Insurance Coverage (scaffolded page).
// Category: Assurance
//
// Real data binding is wired in subsequent workstreams as the backing
// services and tables land. This scaffold enforces the uniform
// loading / error / empty a11y contract.

import { useEffect, useRef, useState } from "react";
import { Shield } from "@phosphor-icons/react";
import ModuleScaffold from "@/components/ModuleScaffold";
import { isSupabaseConfigured } from "@/lib/supabase";

interface Row {
  id: string;
  label: string;
}

export default function InsuranceCoverage() {
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
      title="Insurance Coverage"
      subtitle="Cyber, E&O, and D&O policies with renewal dates."
      icon={Shield}
      breadcrumb={[{ label: "Assurance" }, { label: "Insurance Coverage" }]}
      state={{ loading, error, empty: !loading && !error && rows.length === 0 }}
      emptyMessage="Nothing to show yet. Connect a data source or import records to get started."
    >
      <section aria-label="Insurance Coverage records">
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
