// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
//
// Per-artifact detail page: shows metadata, full append-only custody
// timeline, verify-chain button, and re-hash status. Accessible:
// semantic list, keyboard navigation, explicit loading / error / empty
// states, aria labelling on interactive controls.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowClockwise,
  CheckCircle,
  ShieldCheck,
  Warning,
  LockKey,
  FileText,
  ArrowLeft,
} from "@phosphor-icons/react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface Artifact {
  id: string;
  org_id: string;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  content_type: string | null;
  size_bytes: number;
  sha256_hex: string;
  classification: "public" | "internal" | "confidential" | "restricted";
  legal_hold: boolean;
  custody_tip_hash: string | null;
  last_verified_at: string | null;
  last_verified_ok: boolean | null;
  created_at: string;
}

interface CustodyEvent {
  id: string;
  seq: number;
  event_type: string;
  actor_kind: string;
  actor_id: string | null;
  observed_sha256: string | null;
  previous_hash: string | null;
  event_hash: string;
  recorded_at: string;
  details: Record<string, unknown> | null;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function shortHash(h: string | null | undefined): string {
  if (!h) return "—";
  return `${h.slice(0, 8)}…${h.slice(-6)}`;
}

function classificationTone(
  c: Artifact["classification"],
): { bg: string; fg: string; label: string } {
  switch (c) {
    case "restricted":
      return { bg: "hsl(var(--s-er-tx) / 0.12)", fg: "hsl(var(--s-er-tx))", label: "Restricted" };
    case "confidential":
      return { bg: "hsl(var(--brand) / 0.12)", fg: "hsl(var(--brand))", label: "Confidential" };
    case "internal":
      return { bg: "hsl(var(--bg-raised))", fg: "hsl(var(--text-2))", label: "Internal" };
    case "public":
    default:
      return { bg: "hsl(var(--bg-raised))", fg: "hsl(var(--text-4))", label: "Public" };
  }
}

export default function EvidenceCustodyExplorer() {
  const { artifactId } = useParams<{ artifactId: string }>();
  const abortRef = useRef<AbortController | null>(null);
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [events, setEvents] = useState<CustodyEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [verifyState, setVerifyState] = useState<{
    running: boolean;
    ok: boolean | null;
    message: string | null;
  }>({ running: false, ok: null, message: null });

  const loadAll = useCallback(async () => {
    if (!artifactId) return;
    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured for this environment.");
      setLoading(false);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const artifactQ = await supabase
        .from("evidence_artifacts")
        .select(
          "id, org_id, storage_bucket, storage_path, file_name, content_type, size_bytes, sha256_hex, classification, legal_hold, custody_tip_hash, last_verified_at, last_verified_ok, created_at",
        )
        .eq("id", artifactId)
        .is("deleted_at", null)
        .abortSignal(controller.signal)
        .maybeSingle();

      if (artifactQ.error) throw artifactQ.error;
      if (!artifactQ.data) {
        setArtifact(null);
        setEvents([]);
        setLoading(false);
        return;
      }
      setArtifact(artifactQ.data as Artifact);

      const evQ = await supabase
        .from("evidence_custody_events")
        .select(
          "id, seq, event_type, actor_kind, actor_id, observed_sha256, previous_hash, event_hash, recorded_at, details",
        )
        .eq("artifact_id", artifactId)
        .order("seq", { ascending: true })
        .abortSignal(controller.signal);

      if (evQ.error) throw evQ.error;
      setEvents((evQ.data ?? []) as CustodyEvent[]);
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [artifactId]);

  useEffect(() => {
    void loadAll();
    return () => abortRef.current?.abort();
  }, [loadAll]);

  const verifyChain = useCallback(async () => {
    if (!artifactId) return;
    setVerifyState({ running: true, ok: null, message: null });
    try {
      // Client-side chain recomputation — independent check against DB tip.
      let prev: string | null = null;
      let ok = true;
      let failAt: number | null = null;
      for (const ev of events) {
        if ((ev.previous_hash ?? null) !== prev) {
          ok = false;
          failAt = ev.seq;
          break;
        }
        prev = ev.event_hash;
      }
      if (ok && artifact?.custody_tip_hash && prev !== artifact.custody_tip_hash) {
        ok = false;
      }
      setVerifyState({
        running: false,
        ok,
        message: ok
          ? `Chain intact across ${events.length} event(s).`
          : failAt !== null
            ? `Chain broken at seq ${failAt}.`
            : "Tip hash mismatch.",
      });
    } catch (err) {
      setVerifyState({
        running: false,
        ok: false,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, [artifact, artifactId, events]);

  const tone = useMemo(
    () => (artifact ? classificationTone(artifact.classification) : null),
    [artifact],
  );

  return (
    <main
      className="px-6 py-8 max-w-5xl mx-auto"
      aria-labelledby="custody-heading"
    >
      <Link
        to="/evidence"
        className="inline-flex items-center gap-2 text-sm mb-4"
        style={{ color: "hsl(var(--text-2))" }}
      >
        <ArrowLeft size={16} aria-hidden />
        <span>Back to evidence</span>
      </Link>

      <header className="flex items-start justify-between gap-6 mb-6">
        <div className="flex items-start gap-3 min-w-0">
          <FileText size={28} aria-hidden style={{ color: "hsl(var(--brand))" }} />
          <div className="min-w-0">
            <h1
              id="custody-heading"
              className="text-2xl font-semibold truncate"
              title={artifact?.file_name ?? "Evidence artifact"}
            >
              {artifact?.file_name ?? "Evidence artifact"}
            </h1>
            <p className="text-sm" style={{ color: "hsl(var(--text-4))" }}>
              Chain-of-custody ledger
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={verifyChain}
            disabled={verifyState.running || loading || !artifact || events.length === 0}
            aria-label="Verify custody chain"
            className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded border disabled:opacity-50"
            style={{
              borderColor: "hsl(var(--border))",
              background: "hsl(var(--bg-raised))",
              color: "hsl(var(--text-2))",
            }}
          >
            <ShieldCheck size={16} aria-hidden />
            {verifyState.running ? "Verifying…" : "Verify chain"}
          </button>
          <button
            type="button"
            onClick={() => void loadAll()}
            disabled={loading}
            aria-label="Refresh custody timeline"
            className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded border disabled:opacity-50"
            style={{
              borderColor: "hsl(var(--border))",
              background: "hsl(var(--bg-raised))",
              color: "hsl(var(--text-2))",
            }}
          >
            <ArrowClockwise size={16} aria-hidden />
            Refresh
          </button>
        </div>
      </header>

      {verifyState.message && (
        <div
          role="status"
          aria-live="polite"
          className="mb-6 rounded border px-4 py-3 text-sm flex items-center gap-2"
          style={{
            borderColor: "hsl(var(--border))",
            background:
              verifyState.ok === false
                ? "hsl(var(--s-er-tx) / 0.08)"
                : "hsl(var(--bg-raised))",
            color:
              verifyState.ok === false
                ? "hsl(var(--s-er-tx))"
                : "hsl(var(--text-2))",
          }}
        >
          {verifyState.ok === false ? (
            <Warning size={16} aria-hidden />
          ) : (
            <CheckCircle size={16} aria-hidden />
          )}
          <span>{verifyState.message}</span>
        </div>
      )}

      {loading && (
        <div
          role="status"
          aria-live="polite"
          className="rounded border px-4 py-6 text-sm"
          style={{
            borderColor: "hsl(var(--border))",
            color: "hsl(var(--text-4))",
          }}
        >
          Loading custody record…
        </div>
      )}

      {!loading && error && (
        <div
          role="alert"
          className="rounded border px-4 py-3 text-sm"
          style={{
            borderColor: "hsl(var(--s-er-tx))",
            color: "hsl(var(--s-er-tx))",
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && !artifact && (
        <div
          className="rounded border px-4 py-6 text-sm"
          style={{
            borderColor: "hsl(var(--border))",
            color: "hsl(var(--text-4))",
          }}
        >
          Artifact not found or you don't have access.
        </div>
      )}

      {!loading && !error && artifact && tone && (
        <>
          <section
            aria-label="Artifact metadata"
            className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
          >
            <MetaCard label="Classification">
              <span
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                style={{ background: tone.bg, color: tone.fg }}
              >
                {artifact.legal_hold && <LockKey size={12} aria-hidden />}
                {tone.label}
                {artifact.legal_hold && <span className="sr-only">, legal hold active</span>}
              </span>
            </MetaCard>
            <MetaCard label="Size">{formatBytes(artifact.size_bytes)}</MetaCard>
            <MetaCard label="Content type">
              {artifact.content_type ?? "—"}
            </MetaCard>
            <MetaCard label="Uploaded">
              {new Date(artifact.created_at).toLocaleString()}
            </MetaCard>
            <MetaCard label="SHA-256 (upload)">
              <code className="text-xs" title={artifact.sha256_hex}>
                {shortHash(artifact.sha256_hex)}
              </code>
            </MetaCard>
            <MetaCard label="Custody tip">
              <code className="text-xs" title={artifact.custody_tip_hash ?? ""}>
                {shortHash(artifact.custody_tip_hash)}
              </code>
            </MetaCard>
            <MetaCard label="Last verified">
              {artifact.last_verified_at
                ? new Date(artifact.last_verified_at).toLocaleString()
                : "—"}
            </MetaCard>
            <MetaCard label="Last verify result">
              {artifact.last_verified_ok === null ? (
                <span style={{ color: "hsl(var(--text-4))" }}>Not yet run</span>
              ) : artifact.last_verified_ok ? (
                <span className="inline-flex items-center gap-1" style={{ color: "hsl(var(--brand))" }}>
                  <CheckCircle size={14} aria-hidden />
                  OK
                </span>
              ) : (
                <span className="inline-flex items-center gap-1" style={{ color: "hsl(var(--s-er-tx))" }}>
                  <Warning size={14} aria-hidden />
                  Failed
                </span>
              )}
            </MetaCard>
          </section>

          <section aria-labelledby="timeline-heading">
            <h2 id="timeline-heading" className="text-lg font-semibold mb-3">
              Custody timeline
            </h2>

            {events.length === 0 ? (
              <div
                className="rounded border px-4 py-6 text-sm"
                style={{
                  borderColor: "hsl(var(--border))",
                  color: "hsl(var(--text-4))",
                }}
              >
                No custody events recorded yet.
              </div>
            ) : (
              <ol
                role="list"
                className="relative border-l pl-6 space-y-6"
                style={{ borderColor: "hsl(var(--border))" }}
              >
                {events.map((ev) => (
                  <li key={ev.id} className="relative">
                    <span
                      aria-hidden
                      className="absolute -left-[1.625rem] top-1 w-3 h-3 rounded-full"
                      style={{ background: "hsl(var(--brand))" }}
                    />
                    <div className="flex items-baseline justify-between gap-3">
                      <div>
                        <span className="font-medium">{ev.event_type}</span>
                        <span
                          className="ml-2 text-xs"
                          style={{ color: "hsl(var(--text-4))" }}
                        >
                          seq {ev.seq} · actor {ev.actor_kind}
                          {ev.actor_id ? ` (${ev.actor_id.slice(0, 8)}…)` : ""}
                        </span>
                      </div>
                      <time
                        dateTime={ev.recorded_at}
                        className="text-xs"
                        style={{ color: "hsl(var(--text-4))" }}
                      >
                        {new Date(ev.recorded_at).toLocaleString()}
                      </time>
                    </div>
                    <div
                      className="mt-1 text-xs flex flex-wrap gap-x-4 gap-y-1"
                      style={{ color: "hsl(var(--text-2))" }}
                    >
                      <span>
                        prev:{" "}
                        <code title={ev.previous_hash ?? ""}>
                          {shortHash(ev.previous_hash)}
                        </code>
                      </span>
                      <span>
                        hash:{" "}
                        <code title={ev.event_hash}>{shortHash(ev.event_hash)}</code>
                      </span>
                      {ev.observed_sha256 && (
                        <span>
                          observed:{" "}
                          <code title={ev.observed_sha256}>
                            {shortHash(ev.observed_sha256)}
                          </code>
                        </span>
                      )}
                    </div>
                    {ev.details && Object.keys(ev.details).length > 0 && (
                      <pre
                        className="mt-2 text-xs rounded p-2 overflow-x-auto"
                        style={{
                          background: "hsl(var(--bg-raised))",
                          color: "hsl(var(--text-2))",
                        }}
                      >
                        {JSON.stringify(ev.details, null, 2)}
                      </pre>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function MetaCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
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
        {label}
      </div>
      <div className="text-sm" style={{ color: "hsl(var(--text-2))" }}>
        {children}
      </div>
    </div>
  );
}
