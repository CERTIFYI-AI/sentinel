// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// WS4 — Just-In-Time privileged access request UI.
//
// Users request elevation to a scoped role for a bounded window (max 8h
// enforced server-side). An admin approves; the elevation auto-expires
// and auto-revokes. Every request + approval lands in the append-only
// audit log.

import { useEffect, useMemo, useRef, useState } from "react";
import { ShieldCheck } from "@phosphor-icons/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ModuleScaffold from "@/components/ModuleScaffold";
import { CANONICAL_ROLES, ROLE_DISPLAY, type OrgRole } from "@/lib/rbac";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { telemetry } from "@/lib/telemetry";

const MAX_HOURS = 8;

const RequestSchema = z.object({
  elevated_role: z.enum(CANONICAL_ROLES),
  reason: z.string().min(20, "Provide a detailed reason (≥20 chars)").max(500),
  ticket_ref: z.string().max(60).optional(),
  duration_hours: z.number().int().min(1).max(MAX_HOURS),
});

type RequestInput = z.infer<typeof RequestSchema>;

interface ElevationRow {
  id: string;
  elevated_role: OrgRole;
  reason: string;
  ticket_ref: string | null;
  requested_at: string;
  approved_at: string | null;
  expires_at: string;
  revoked_at: string | null;
}

export default function JitElevation() {
  const abortRef = useRef<AbortController | null>(null);
  const [rows, setRows] = useState<ElevationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);

  const form = useForm<RequestInput>({
    resolver: zodResolver(RequestSchema),
    defaultValues: { elevated_role: "control_owner", reason: "", ticket_ref: "", duration_hours: 2 },
  });

  const reload = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      if (!isSupabaseConfigured()) {
        setRows([]);
        return;
      }
      const { data, error: err } = await supabase
        .from("jit_elevations")
        .select("id, elevated_role, reason, ticket_ref, requested_at, approved_at, expires_at, revoked_at")
        .order("requested_at", { ascending: false })
        .limit(50)
        .abortSignal(controller.signal);
      if (err) throw err;
      setRows((data ?? []) as ElevationRow[]);
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") return;
      telemetry.error("jit.load.failed", { err: String(e) });
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (values: RequestInput) => {
    setSubmitMsg(null);
    setSubmitting(true);
    try {
      if (!isSupabaseConfigured()) throw new Error("Supabase not configured");
      const expires_at = new Date(Date.now() + values.duration_hours * 3_600_000).toISOString();
      const { error: err } = await supabase.from("jit_elevations").insert({
        elevated_role: values.elevated_role,
        reason: values.reason,
        ticket_ref: values.ticket_ref || null,
        expires_at,
      });
      if (err) throw err;
      setSubmitMsg("Request submitted — awaiting admin approval.");
      form.reset();
      await reload();
    } catch (e) {
      telemetry.error("jit.submit.failed", { err: String(e) });
      setSubmitMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const active = useMemo(
    () => rows.filter((r) => r.approved_at && !r.revoked_at && new Date(r.expires_at) > new Date()),
    [rows]
  );

  return (
    <ModuleScaffold
      title="JIT Privileged Access"
      subtitle="Request time-bounded role elevation. Maximum 8 hours; every action audited."
      icon={ShieldCheck}
      breadcrumb={[{ label: "Security" }, { label: "JIT Elevation" }]}
      state={{ loading, error, empty: false }}
      kpis={[
        { label: "Active elevations", value: active.length, tone: active.length > 0 ? "warn" : "default" },
        { label: "Requests (last 50)", value: rows.length },
        { label: "Max duration", value: `${MAX_HOURS}h` },
      ]}
    >
      <section aria-label="New elevation request" className="rounded border p-4"
        style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--bg-raised))" }}>
        <h2 className="text-lg font-semibold mb-3">Request elevation</h2>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3 md:grid-cols-2" noValidate>
          <label className="flex flex-col text-sm gap-1">
            <span>Target role</span>
            <select {...form.register("elevated_role")} className="rounded border px-2 py-1"
              style={{ borderColor: "hsl(var(--border))" }}>
              {CANONICAL_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_DISPLAY[r].label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-sm gap-1">
            <span>Duration (hours)</span>
            <input type="number" min={1} max={MAX_HOURS} {...form.register("duration_hours", { valueAsNumber: true })}
              className="rounded border px-2 py-1" style={{ borderColor: "hsl(var(--border))" }} />
          </label>
          <label className="flex flex-col text-sm gap-1 md:col-span-2">
            <span>Reason</span>
            <textarea rows={3} {...form.register("reason")}
              className="rounded border px-2 py-1" style={{ borderColor: "hsl(var(--border))" }} />
            {form.formState.errors.reason && (
              <span role="alert" className="text-xs" style={{ color: "hsl(var(--s-er-tx))" }}>
                {form.formState.errors.reason.message}
              </span>
            )}
          </label>
          <label className="flex flex-col text-sm gap-1">
            <span>Ticket ref (optional)</span>
            <input {...form.register("ticket_ref")}
              className="rounded border px-2 py-1" style={{ borderColor: "hsl(var(--border))" }} />
          </label>
          <div className="md:col-span-2 flex items-center gap-3">
            <button type="submit" disabled={submitting}
              className="rounded px-4 py-2 text-sm font-medium"
              style={{ background: "hsl(var(--brand))", color: "white" }}>
              {submitting ? "Submitting…" : "Submit request"}
            </button>
            {submitMsg && <span className="text-sm" style={{ color: "hsl(var(--text-4))" }}>{submitMsg}</span>}
          </div>
        </form>
      </section>

      <section aria-label="Recent elevation requests" className="mt-6">
        <h2 className="text-lg font-semibold mb-3">Recent requests</h2>
        {rows.length === 0 ? (
          <p className="text-sm" style={{ color: "hsl(var(--text-4))" }}>No requests yet.</p>
        ) : (
          <ul role="list" className="space-y-2">
            {rows.map((r) => (
              <li key={r.id} className="rounded border px-4 py-3 text-sm"
                style={{ borderColor: "hsl(var(--border))" }}>
                <div className="flex justify-between gap-3">
                  <strong>{ROLE_DISPLAY[r.elevated_role]?.label ?? r.elevated_role}</strong>
                  <span style={{ color: "hsl(var(--text-4))" }}>
                    {r.revoked_at ? "revoked" : r.approved_at ? "active" : "pending"}
                  </span>
                </div>
                <p className="mt-1" style={{ color: "hsl(var(--text-2))" }}>{r.reason}</p>
                <p className="mt-1 text-xs" style={{ color: "hsl(var(--text-4))" }}>
                  requested {new Date(r.requested_at).toUTCString()} · expires{" "}
                  {new Date(r.expires_at).toUTCString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </ModuleScaffold>
  );
}
