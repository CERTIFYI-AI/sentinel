// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
//
// The sensitive secrets live in Supabase Auth's factor tables; this
// module only indexes factor labels + last-used metadata so admins can
// review enrollment coverage without exposing secrets.

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Key } from "@phosphor-icons/react";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useTenant } from "@/hooks/useTenant";
import { telemetry } from "@/lib/telemetry";

interface MfaRow {
  id: string;
  factor_type: "totp" | "webauthn" | "sms" | "email" | "backup_codes";
  factor_label: string | null;
  last_used_at: string | null;
  verified_at: string | null;
  enrolled_at: string;
}

const LABELS: Record<MfaRow["factor_type"], string> = {
  totp: "Authenticator app (TOTP)",
  webauthn: "Security key / passkey (WebAuthn)",
  sms: "SMS",
  email: "Email",
  backup_codes: "Backup codes",
};

export default function MfaEnrollment() {
  const abortRef = useRef<AbortController | null>(null);
  const { orgId } = useTenant();
  const [rows, setRows] = useState<MfaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (!isSupabaseConfigured()) {
          setRows([]);
          return;
        }
        // RLS already scopes to the caller's org; the explicit org_id filter is
        // defense-in-depth, matching sibling security pages.
        let query = supabase
          .from("mfa_enrollments")
          .select("id, factor_type, factor_label, last_used_at, verified_at, enrolled_at");
        if (orgId) query = query.eq("org_id", orgId);
        const { data, error: err } = await query
          .order("enrolled_at", { ascending: false })
          .abortSignal(controller.signal);
        if (err) throw err;
        setRows((data ?? []) as MfaRow[]);
      } catch (e) {
        if ((e as { name?: string })?.name === "AbortError") return;
        telemetry.error("mfa.load.failed", { err: String(e) });
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [orgId]);

  const verified = rows.filter((r) => r.verified_at).length;

  if (loading) return <PageSkeleton title="Multi-Factor Authentication" showStats rows={3} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Multi-Factor Authentication"
        subtitle="Your enrolled factors. Secrets are stored in Supabase Auth; this page shows metadata only."
        icon={Key}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Factors enrolled", value: rows.length, tone: rows.length > 0 ? "positive" : "warn" },
          { label: "Verified", value: verified, tone: verified === rows.length ? "positive" : "warn" },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded border px-4 py-3"
            style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--bg-raised))" }}
          >
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "hsl(var(--text-4))" }}>
              {k.label}
            </div>
            <div
              className="text-xl font-semibold"
              style={{ color: k.tone === "positive" ? "hsl(var(--brand))" : "hsl(var(--s-wn-tx))" }}
            >
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded border px-4 py-3 text-sm flex items-start gap-2"
          style={{ borderColor: "hsl(var(--s-er-tx))", color: "hsl(var(--s-er-tx))" }}
        >
          {error}
        </div>
      ) : rows.length === 0 ? (
        <div
          className="rounded border px-4 py-10 text-center"
          style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--bg-raised))" }}
        >
          <p className="text-sm" style={{ color: "hsl(var(--text-2))" }}>
            No MFA factors enrolled yet. Add a TOTP or WebAuthn factor to get started.
          </p>
          <div className="mt-3">
            <Link
              to="/settings"
              className="text-sm font-medium underline"
              style={{ color: "hsl(var(--brand))" }}
            >
              Go to Settings
            </Link>
          </div>
        </div>
      ) : (
        <section aria-label="Enrolled factors">
          <ul role="list" className="space-y-2">
            {rows.map((r) => (
              <li key={r.id} className="rounded border px-4 py-3 text-sm"
                style={{ borderColor: "hsl(var(--border))" }}>
                <div className="flex justify-between gap-3">
                  <strong>{LABELS[r.factor_type]}</strong>
                  <span style={{ color: "hsl(var(--text-4))" }}>
                    {r.verified_at ? "verified" : "pending"}
                  </span>
                </div>
                {r.factor_label && (
                  <p className="mt-1" style={{ color: "hsl(var(--text-2))" }}>{r.factor_label}</p>
                )}
                <p className="mt-1 text-xs" style={{ color: "hsl(var(--text-4))" }}>
                  enrolled {new Date(r.enrolled_at).toUTCString()}
                  {r.last_used_at ? ` · last used ${new Date(r.last_used_at).toUTCString()}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
