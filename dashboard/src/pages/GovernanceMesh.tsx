// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// Agentic Mesh — the platform's autonomous governance fabric on one page:
//   * 10 always-on sentinel agents (continuous run mode) with honest
//     runtime status derived from real heartbeats — never a fake "RUNNING".
//   * Agent Inspector: per-sentinel execution history, findings with
//     entity deep links, trigger events and target modules.
//   * The shared event bus: live event stream + execution ledger that the
//     27 reactive cascade agents write to as well.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useTenant } from '../hooks/useTenant';
import { useMeshFleet } from '../hooks/useMeshFleet';
import type { MeshSentinel, MeshExecution, MeshFinding } from '../services/meshFleetService';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { PageSkeleton } from '../components/ui/PageSkeleton';

// ── status helpers ───────────────────────────────────────────────────────────

type FleetStatus = 'RUNNING' | 'STALE' | 'PAUSED' | 'NEVER RUN';

function fleetStatus(s: MeshSentinel): FleetStatus {
  if (!s.isEnabled) return 'PAUSED';
  if (!s.lastHeartbeatAt) return 'NEVER RUN';
  const ageMin = (Date.now() - new Date(s.lastHeartbeatAt).getTime()) / 60_000;
  return ageMin <= s.sweepIntervalMinutes * 2 ? 'RUNNING' : 'STALE';
}

const STATUS_STYLE: Record<FleetStatus, { bg: string; text: string; dot: string }> = {
  RUNNING:     { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', dot: 'hsl(var(--s-ok-tx))' },
  STALE:       { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', dot: 'hsl(var(--s-wn-tx))' },
  PAUSED:      { bg: 'hsl(var(--bg-muted))', text: 'hsl(var(--text-3))', dot: 'hsl(var(--text-4))' },
  'NEVER RUN': { bg: 'hsl(var(--bg-muted))', text: 'hsl(var(--text-3))', dot: 'hsl(var(--text-4))' },
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    completed: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))' },
    succeeded: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))' },
    processing: { bg: 'hsl(var(--brand-subtle))', text: 'hsl(var(--brand))' },
    failed: { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))' },
    pending: { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))' },
    skipped: { bg: 'hsl(var(--bg-muted))', text: 'hsl(var(--text-3))' },
    dead_letter: { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))' },
  };
  const c = map[status] ?? { bg: 'hsl(var(--bg-muted))', text: 'hsl(var(--text-3))' };
  return (
    <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '2px 7px', background: c.bg, color: c.text }}>
      {status}
    </span>
  );
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'never';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 90) return `${Math.round(s)}s ago`;
  if (s < 5400) return `${Math.round(s / 60)}m ago`;
  if (s < 129600) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

/** Entity deep link — canonical routes; never a raw uuid as the label. */
function findingLink(f: MeshFinding): string | null {
  if (!f.entityId) return null;
  switch (f.entityType) {
    case 'model': return `/models/inventory/${f.entityId}`;
    case 'incident': return `/risk/incidents?open=${f.entityId}`;
    case 'dataset': return `/datasets/${f.entityId}`;
    case 'agent': return `/agents/${f.entityId}`;
    default: return null;
  }
}

const SEV_COLOR: Record<string, string> = {
  CRITICAL: 'hsl(var(--s-er-tx))',
  HIGH: 'hsl(var(--s-er-tx))',
  MEDIUM: 'hsl(var(--s-wn-tx))',
  LOW: 'hsl(var(--text-3))',
  INFO: 'hsl(var(--text-4))',
};

// ── page ─────────────────────────────────────────────────────────────────────

export default function GovernanceMesh() {
  // Defensive tenancy guard (matches MfaEnrollment): never throw while the
  // tenant context is still resolving — useMeshFleet queries stay disabled
  // until orgId resolves, and the loading branch below renders meanwhile.
  const { orgId, status: tenantStatus } = useTenant();
  const {
    fleet, fleetLoading, fleetError, executions, events,
    runClientSweep, runServerSweep, toggleSentinel,
  } = useMeshFleet(orgId);
  const [inspected, setInspected] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  const sweeps = useMemo(() => executions.filter((e) => e.eventType === 'SENTINEL_SWEEP'), [executions]);
  const dayAgo = Date.now() - 86400_000;
  const kpi = useMemo(() => {
    const running = fleet.filter((s) => fleetStatus(s) === 'RUNNING').length;
    const sweeps24 = sweeps.filter((e) => new Date(e.startedAt).getTime() > dayAgo).length;
    const findings24 = sweeps
      .filter((e) => new Date(e.startedAt).getTime() > dayAgo)
      .reduce((n, e) => n + (e.output?.findings?.length ?? 0), 0);
    const events24 = events.filter((e) => new Date(e.createdAt).getTime() > dayAgo).length;
    const failed = executions.filter((e) => e.status === 'failed').length;
    const errorRate = executions.length > 0 ? ((failed / executions.length) * 100).toFixed(1) : '—';
    return { running, sweeps24, findings24, events24, errorRate };
  }, [fleet, sweeps, events, executions, dayAgo]);

  const inspectedSentinel = fleet.find((s) => s.agentName === inspected) ?? null;
  const inspectedRuns = useMemo(
    () => (inspected ? executions.filter((e) => e.agentName === inspected).slice(0, 20) : []),
    [executions, inspected],
  );

  const sweepAll = async () => {
    try {
      const results = await runClientSweep.mutateAsync(undefined);
      const findings = results.reduce((n, r) => n + r.findings, 0);
      const failed = results.filter((r) => r.status === 'failed');
      if (failed.length > 0) toast.error(`Sweep finished with ${failed.length} failed sentinels (${findings} findings).`);
      else toast.success(`Fleet sweep complete — ${results.length} sentinels, ${findings} findings.`);
    } catch (e) {
      toast.error(`Sweep failed: ${(e as Error).message}`);
    }
  };

  const sweepOne = async (name: string) => {
    try {
      const results = await runClientSweep.mutateAsync([name]);
      const r = results[0];
      if (!r) return;
      if (r.status === 'failed') toast.error(`${name}: ${r.error ?? 'sweep failed'}`);
      else toast.success(`${name}: ${r.summary}`);
    } catch (e) {
      toast.error(`${name} sweep failed: ${(e as Error).message}`);
    }
  };

  const serverSweep = async () => {
    try {
      await runServerSweep.mutateAsync(undefined);
      toast.success('Server sweep completed (mesh-sentinels edge function).');
    } catch (e) {
      toast.error(`Server sweep unavailable: ${(e as Error).message}`);
    }
  };

  const togglePause = async (s: MeshSentinel) => {
    try {
      await toggleSentinel.mutateAsync({ agentName: s.agentName, isEnabled: !s.isEnabled });
      toast.success(`${s.agentName} ${s.isEnabled ? 'paused' : 'resumed'}.`);
    } catch (e) {
      toast.error(`Could not update ${s.agentName}: ${(e as Error).message}`);
    }
  };

  if (tenantStatus === 'loading' || fleetLoading) {
    return <PageSkeleton title="Agentic Mesh" showStats rows={5} />;
  }

  return (
    <main id="main-content" style={{ padding: '24px', maxWidth: 1280, margin: '0 auto' }} className="space-y-6">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'hsl(var(--text-1))' }}>Agentic Mesh</h1>
          <p style={{ fontSize: 13, color: 'hsl(var(--text-4))', marginTop: 4, maxWidth: 640 }}>
            {fleet.length} always-on governance sentinels and the reactive cascade agents share one event bus.
            Every sweep, interception and cascade below is read from the live execution ledger.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={sweepAll}
            disabled={runClientSweep.isPending}
            style={{
              fontSize: 13, fontWeight: 600, padding: '8px 14px', cursor: 'pointer',
              background: 'hsl(var(--brand))', color: 'hsl(var(--brand-fg, 0 0% 100%))', border: 'none',
              opacity: runClientSweep.isPending ? 0.6 : 1,
            }}
          >
            {runClientSweep.isPending ? 'Sweeping…' : 'Run fleet sweep'}
          </button>
          <button
            onClick={serverSweep}
            disabled={runServerSweep.isPending}
            style={{
              fontSize: 13, fontWeight: 500, padding: '8px 14px', cursor: 'pointer',
              background: 'transparent', color: 'hsl(var(--text-2))', border: '1px solid hsl(var(--border))',
              opacity: runServerSweep.isPending ? 0.6 : 1,
            }}
            title="Invoke the mesh-sentinels edge function (server-side, service-role)"
          >
            Server sweep
          </button>
        </div>
      </div>

      {fleetError && (
        <p style={{ fontSize: 13, color: 'hsl(var(--s-er-tx))' }}>Failed to load fleet: {fleetError.message}</p>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Sentinels Running', value: `${kpi.running}/${fleet.length}`, sub: 'heartbeat fresh' },
          { label: 'Sweeps (24h)', value: kpi.sweeps24, sub: 'fleet executions' },
          { label: 'Findings (24h)', value: kpi.findings24, sub: 'intercepted issues' },
          { label: 'Bus Events (24h)', value: kpi.events24, sub: 'incl. cascades' },
          { label: 'Error Rate', value: kpi.errorRate === '—' ? '—' : `${kpi.errorRate}%`, sub: 'all executions' },
        ].map((k) => (
          <Card key={k.label} style={{ borderRadius: 0 }}>
            <CardContent className="px-4 py-4">
              <p style={{ fontSize: 24, fontWeight: 700, color: 'hsl(var(--text-1))' }}>{k.value}</p>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--text-2))', marginTop: 4 }}>{k.label}</p>
              <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', marginTop: 2 }}>{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sentinel fleet */}
      {fleet.length === 0 ? (
        <Card style={{ borderRadius: 0 }}>
          <CardContent className="px-4 py-8">
            <p style={{ fontSize: 13, color: 'hsl(var(--text-3))', textAlign: 'center' }}>
              No continuous sentinels registered yet. Apply the
              {' '}<code>20260816_agentic_mesh_fleet</code> migration to seed the 10-agent fleet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fleet.map((s) => {
            const st = fleetStatus(s);
            const c = STATUS_STYLE[st];
            const isOpen = inspected === s.agentName;
            return (
              <Card key={s.agentName} style={{ borderRadius: 0, borderColor: isOpen ? 'hsl(var(--brand))' : undefined }}>
                <CardContent className="px-4 py-4">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot, flexShrink: 0,
                      boxShadow: st === 'RUNNING' ? `0 0 0 2px ${c.bg}` : undefined }} />
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: 'hsl(var(--text-1))', flex: 1 }}>{s.agentName}</h3>
                    <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '2px 7px', background: c.bg, color: c.text }}>
                      {st}
                    </span>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'hsl(var(--text-4))' }}>ENTERPRISE PROBLEM</p>
                    <p style={{ fontSize: 12.5, color: 'hsl(var(--text-3))', marginTop: 2 }}>{s.enterpriseProblem ?? '—'}</p>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'hsl(var(--text-4))' }}>AGENTIC SOLUTION</p>
                    <p style={{ fontSize: 12.5, color: 'hsl(var(--text-2))', marginTop: 2 }}>{s.agenticSolution ?? '—'}</p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, fontSize: 11, color: 'hsl(var(--text-4))', flexWrap: 'wrap' }}>
                    <span>Last sweep: {timeAgo(s.lastHeartbeatAt)}</span>
                    <span>·</span>
                    <span>{s.totalSweeps} sweeps</span>
                    <span>·</span>
                    <span>{s.lastFindingsCount} findings last run</span>
                    {s.consecutiveFailures > 0 && (
                      <>
                        <span>·</span>
                        <span style={{ color: 'hsl(var(--s-er-tx))' }}>{s.consecutiveFailures} consecutive failures</span>
                      </>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                      onClick={() => sweepOne(s.agentName)}
                      disabled={runClientSweep.isPending}
                      style={{ fontSize: 12, fontWeight: 600, padding: '5px 10px', cursor: 'pointer', background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-2))', border: '1px solid hsl(var(--border))' }}
                    >
                      Run now
                    </button>
                    <button
                      onClick={() => togglePause(s)}
                      style={{ fontSize: 12, fontWeight: 500, padding: '5px 10px', cursor: 'pointer', background: 'transparent', color: 'hsl(var(--text-3))', border: '1px solid hsl(var(--border))' }}
                    >
                      {s.isEnabled ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      onClick={() => setInspected(isOpen ? null : s.agentName)}
                      style={{ fontSize: 12, fontWeight: 500, padding: '5px 10px', cursor: 'pointer', background: isOpen ? 'hsl(var(--brand-subtle))' : 'transparent', color: isOpen ? 'hsl(var(--brand))' : 'hsl(var(--text-3))', border: '1px solid hsl(var(--border))', marginLeft: 'auto' }}
                    >
                      {isOpen ? 'Close inspector' : 'Inspect'}
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Agent Inspector */}
      {inspectedSentinel && (
        <Card style={{ borderRadius: 0, borderColor: 'hsl(var(--brand))' }}>
          <CardHeader className="px-4 py-3" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
            <CardTitle style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              Agent Inspector — {inspectedSentinel.agentName}
              <span style={{ fontSize: 11, fontWeight: 400, color: 'hsl(var(--text-4))' }}>
                every {inspectedSentinel.sweepIntervalMinutes}m · priority {inspectedSentinel.priority ?? '—'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-4">
            <p style={{ fontSize: 13, color: 'hsl(var(--text-2))' }}>{inspectedSentinel.description}</p>

            <div style={{ display: 'flex', gap: 24, marginTop: 12, flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'hsl(var(--text-4))' }}>ALSO REACTS TO</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {inspectedSentinel.triggerEvents.map((t) => (
                    <span key={t} style={{ fontSize: 11, background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))', padding: '2px 8px' }}>{t}</span>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'hsl(var(--text-4))' }}>TARGET MODULES</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {inspectedSentinel.targetModules.map((t) => (
                    <span key={t} style={{ fontSize: 11, background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))', padding: '2px 8px' }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>

            <p style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-2))', marginTop: 16 }}>
              Recent runs {inspectedRuns.length === 0 && <span style={{ fontWeight: 400, color: 'hsl(var(--text-4))' }}>— none recorded yet for this org</span>}
            </p>
            <div style={{ maxHeight: 320, overflowY: 'auto', marginTop: 6 }}>
              {inspectedRuns.map((run: MeshExecution) => (
                <div key={run.id} style={{ padding: '8px 0', borderBottom: '1px solid hsl(var(--border))' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <StatusBadge status={run.status} />
                    <span style={{ fontSize: 12, color: 'hsl(var(--text-3))' }}>{run.eventType}</span>
                    <span style={{ fontSize: 11, color: 'hsl(var(--text-4))', marginLeft: 'auto' }}>
                      {timeAgo(run.startedAt)}{run.durationMs != null ? ` · ${run.durationMs}ms` : ''}
                    </span>
                  </div>
                  {run.output?.summary && (
                    <p style={{ fontSize: 12, color: 'hsl(var(--text-2))', marginTop: 4 }}>{run.output.summary}</p>
                  )}
                  {run.error && (
                    <p style={{ fontSize: 12, color: 'hsl(var(--s-er-tx))', marginTop: 4 }}>{run.error}</p>
                  )}
                  {(run.output?.findings?.length ?? 0) > 0 && (
                    <ul style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {run.output!.findings!.slice(0, 10).map((f, i) => {
                        const link = findingLink(f);
                        return (
                          <li key={i} style={{ fontSize: 12, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: SEV_COLOR[f.severity] ?? 'hsl(var(--text-4))', minWidth: 52 }}>
                              {f.severity}
                            </span>
                            <span style={{ color: 'hsl(var(--text-2))' }}>{f.title}</span>
                            {link && (
                              <Link
                                to={link}
                                style={{ fontSize: 11, color: 'hsl(var(--brand))', background: 'hsl(var(--brand-subtle))', padding: '1px 8px', textDecoration: 'none' }}
                              >
                                open →
                              </Link>
                            )}
                          </li>
                        );
                      })}
                      {(run.output!.findings!.length > 10) && (
                        <li style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>
                          +{run.output!.findings!.length - 10} more findings in this run
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bus panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event Stream */}
        <Card style={{ borderRadius: 0 }}>
          <CardHeader className="px-4 py-3" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
            <CardTitle style={{ fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              Live Event Stream
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'hsl(var(--s-ok-tx))', display: 'inline-block', boxShadow: '0 0 0 2px hsl(var(--s-ok-bg))', animation: 'pulse 2s infinite' }} title="Realtime" />
            </CardTitle>
          </CardHeader>
          <div style={{ maxHeight: 384, overflowY: 'auto' }}>
            {events.length === 0 && (
              <p style={{ padding: 16, fontSize: 13, color: 'hsl(var(--text-4))', textAlign: 'center' }}>
                No events yet. Run a fleet sweep or register a model to start the cascade.
              </p>
            )}
            {events.map((e, idx) => (
              <button
                key={e.id}
                onClick={() => setSelectedEvent(e.id === selectedEvent ? null : e.id)}
                style={{ width: '100%', textAlign: 'left', padding: '10px 16px', background: selectedEvent === e.id ? 'hsl(var(--bg-muted))' : 'transparent', borderBottom: idx < events.length - 1 ? '1px solid hsl(var(--border))' : 'none', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <StatusBadge status={e.status} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--text-1))', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.eventType}</span>
                  <span style={{ fontSize: 11, color: 'hsl(var(--text-4))', flexShrink: 0 }}>D{e.cascadeDepth}</span>
                </div>
                <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', marginTop: 3 }}>
                  {e.sourceModule} · {new Date(e.createdAt).toLocaleTimeString()}
                </p>
                {selectedEvent === e.id && e.triggeredAgents.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {e.triggeredAgents.map((a) => (
                      <span key={a} style={{ fontSize: 11, background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))', padding: '2px 8px' }}>{a}</span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </Card>

        {/* Execution ledger */}
        <Card style={{ borderRadius: 0 }}>
          <CardHeader className="px-4 py-3" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
            <CardTitle style={{ fontSize: 14 }}>Execution Ledger</CardTitle>
          </CardHeader>
          <div style={{ maxHeight: 384, overflowY: 'auto' }}>
            {executions.length === 0 && (
              <p style={{ padding: 16, fontSize: 13, color: 'hsl(var(--text-4))', textAlign: 'center' }}>
                No agent executions recorded yet for this org.
              </p>
            )}
            {executions.slice(0, 60).map((x, idx) => (
              <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderBottom: idx < Math.min(executions.length, 60) - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
                <StatusBadge status={x.status} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--text-1))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.agentName}</p>
                  <p style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>{x.eventType}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 11, color: 'hsl(var(--text-3))' }}>{timeAgo(x.startedAt)}</p>
                  {x.durationMs != null && <p style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>{x.durationMs}ms</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}
