// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// GuardrailActivity — Active Guardrails (/trust-engine/guardrails).
// Events tab reads the real org-scoped guardrail_events table (models and
// policies resolved by uuid at read time); acknowledgements persist
// ack_by/ack_at/ack_reason; escalation creates a real incident in the
// Incident Response module. Rule Builder is real guardrail_rules CRUD.
// No seeded events, no fabricated rule JSON, no fake incident ids.

import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ShieldCheck, Eye, Plus, Trash, Siren, X, Cpu, CheckCircle,
} from '@phosphor-icons/react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '../../components/ui/alert-dialog';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCardRow } from '@/components/ui/StatCardRow';
import { FilterBar } from '@/components/ui/FilterBar';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { InterlinkChip } from '@/components/ui/InterlinkChip';
import { useGuardrailEvents, useGuardrailRules } from '@/hooks/useGuardrails';
import { useModelOptions } from '@/hooks/useAiiaData';
import { useAuthStore } from '@/store/authStore';
import type { GuardrailEvent } from '@/services/guardrailService';

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(isoDate: string): string {
  const mins = Math.floor((Date.now() - new Date(isoDate).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fullTimestamp(isoDate: string): string {
  return new Date(isoDate).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** Short human reference for a uuid-keyed event — never a raw uuid. */
function displayEventId(id: string): string {
  return `EV-${id.slice(0, 8).toUpperCase()}`;
}

function severityBadge(severity: string | null) {
  const map: Record<string, { bg: string; color: string }> = {
    critical: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))' },
    high: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
    medium: { bg: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' },
    low: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  };
  const s = (severity && map[severity]) || { bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))' };
  return (
    <Badge style={{ background: s.bg, color: s.color, borderRadius: 0, fontSize: 10 }}>
      {(severity ?? 'unknown').toUpperCase()}
    </Badge>
  );
}

function actionBadge(action: string | null) {
  const map: Record<string, { bg: string; color: string }> = {
    block: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))' },
    warn: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
    redact: { bg: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' },
    route_hitl: { bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
    log: { bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))' },
    flag: { bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
    throttle: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
    fallback: { bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
  };
  const s = (action && map[action]) || { bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))' };
  const label = action ? action.replace('_', ' ') : 'unknown';
  return <Badge style={{ background: s.bg, color: s.color, borderRadius: 0, fontSize: 10 }}>{label}</Badge>;
}

function statusBadge(status: string | null) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    open: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))', label: 'Open' },
    acknowledged: { bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))', label: 'Acknowledged' },
    resolved: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))', label: 'Resolved' },
  };
  const s = (status && map[status]) || { bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))', label: status ?? 'Unknown' };
  return <Badge style={{ background: s.bg, color: s.color, borderRadius: 0, fontSize: 10 }}>{s.label}</Badge>;
}

// Rule-builder vocabulary drawn from the live guardrail_rules rows.
const RULE_TYPES = ['pii', 'toxicity', 'jailbreak', 'topic', 'content', 'cost', 'latency', 'security'];
const RULE_ACTIONS = ['block', 'warn', 'flag', 'redact', 'throttle', 'fallback', 'log'];

// Templates prefill the rule-builder form — they create nothing by themselves.
const RULE_TEMPLATES = [
  {
    label: 'PII redaction',
    form: { name: 'PII redaction', ruleType: 'pii', action: 'redact', priority: 90, condition: { type: 'pii', entities: ['email', 'phone'], sensitivity: 'medium' } },
  },
  {
    label: 'High-sensitivity PII block',
    form: { name: 'High-sensitivity PII block', ruleType: 'pii', action: 'block', priority: 100, condition: { type: 'pii', entities: ['ssn', 'credit_card'], sensitivity: 'high' } },
  },
  {
    label: 'Toxicity threshold',
    form: { name: 'Toxicity threshold', ruleType: 'toxicity', action: 'block', priority: 80, condition: { type: 'toxicity', threshold: 0.8, categories: ['hate', 'harassment'] } },
  },
  {
    label: 'Jailbreak heuristics',
    form: { name: 'Jailbreak heuristics', ruleType: 'jailbreak', action: 'block', priority: 95, condition: { type: 'jailbreak', ml_check: true, patterns: ['ignore previous'] } },
  },
  {
    label: 'Prompt token cap',
    form: { name: 'Prompt token cap', ruleType: 'cost', action: 'throttle', priority: 40, condition: { type: 'token_limit', max_prompt_tokens: 6000 } },
  },
];

const EMPTY_RULE_FORM = { name: '', ruleType: 'pii', action: 'block', priority: 50, conditionText: '{}' };

// ── Main Component ────────────────────────────────────────────────────────────

export default function GuardrailActivity() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const modelParam = searchParams.get('model');
  const policyParam = searchParams.get('policy');
  const { models } = useModelOptions();
  const user = useAuthStore(s => s.user);

  // Server-side scoping for deep links; list filters run client-side (small set).
  const filters = useMemo(() => ({
    modelId: modelParam || undefined,
    policyId: policyParam || undefined,
  }), [modelParam, policyParam]);

  const { events, isLoading, error, acknowledge, escalate } = useGuardrailEvents(filters);
  const {
    rules, isLoading: rulesLoading, error: rulesError,
    create: createRule, update: updateRule, remove: removeRule,
  } = useGuardrailRules();

  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<GuardrailEvent | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [ackTarget, setAckTarget] = useState<GuardrailEvent | null>(null);
  const [ackReason, setAckReason] = useState('');
  const [escalateTarget, setEscalateTarget] = useState<GuardrailEvent | null>(null);
  // Session-local record of real incident ids created from events this visit.
  const [escalatedMap, setEscalatedMap] = useState<Record<string, string>>({});
  const [ruleForm, setRuleForm] = useState(EMPTY_RULE_FORM);

  const filtered = useMemo(() => events.filter(e => {
    if (filterSeverity && e.severity !== filterSeverity) return false;
    if (filterAction && e.action !== filterAction) return false;
    if (filterStatus && e.status !== filterStatus) return false;
    if (dateFrom && new Date(e.createdAt) < new Date(`${dateFrom}T00:00:00`)) return false;
    if (dateTo && new Date(e.createdAt) > new Date(`${dateTo}T23:59:59.999`)) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = [e.policyName, e.policyRef, e.modelName, e.action, displayEventId(e.id)]
        .filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [events, filterSeverity, filterAction, filterStatus, dateFrom, dateTo, search]);

  // KPIs from real rows — divide-by-zero guarded, never NaN.
  const blockedCount = events.filter(e => e.action === 'block').length;
  const openCount = events.filter(e => e.status === 'open').length;
  const latencies = events.map(e => e.latencyMs).filter((v): v is number => typeof v === 'number');
  const avgLatency = latencies.length > 0
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : null;

  // Models actually referenced by recent events (distinct, uuid-keyed).
  const linkedModels = useMemo(() => {
    const byId = new Map<string, { id: string; name: string | null; count: number }>();
    for (const e of events) {
      if (!e.modelId) continue;
      const cur = byId.get(e.modelId);
      if (cur) cur.count += 1;
      else byId.set(e.modelId, { id: e.modelId, name: e.modelName, count: 1 });
    }
    return Array.from(byId.values()).sort((a, b) => b.count - a.count);
  }, [events]);

  const activeFilterCount = (filterSeverity ? 1 : 0) + (filterAction ? 1 : 0) + (filterStatus ? 1 : 0)
    + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (modelParam ? 1 : 0) + (policyParam ? 1 : 0);

  const clearParam = (key: string) => {
    const next = new URLSearchParams(searchParams);
    next.delete(key);
    setSearchParams(next);
  };

  // Deep-link chip labels resolved to names — never raw uuids.
  const modelChipName = modelParam
    ? (models.find(m => m.id === modelParam)?.name
      ?? events.find(e => e.modelId === modelParam)?.modelName
      ?? 'Unavailable')
    : null;
  const policyChipName = policyParam
    ? (events.find(e => e.policyId === policyParam)?.policyName
      ?? events.find(e => e.policyId === policyParam)?.policyRef
      ?? 'Unavailable')
    : null;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAck = () => {
    if (!ackTarget) return;
    if (!user?.id) { toast.error('Sign in required to acknowledge events'); return; }
    acknowledge.mutate(
      { id: ackTarget.id, userId: user.id, reason: ackReason.trim() },
      {
        onSuccess: (saved) => {
          toast.success(`${displayEventId(saved.id)} acknowledged by ${user.name || user.email}`);
          if (selectedEvent?.id === saved.id) setSelectedEvent(saved);
        },
        onError: (e: Error) => toast.error(`Failed to acknowledge: ${e.message}`),
      },
    );
    setAckTarget(null);
    setAckReason('');
  };

  const handleEscalate = () => {
    if (!escalateTarget) return;
    const target = escalateTarget;
    escalate.mutate(
      {
        eventId: target.id,
        severity: target.severity,
        action: target.action,
        policyLabel: target.policyName ?? target.policyRef,
        modelName: target.modelName,
        occurredAt: target.createdAt,
        reporter: user?.name || user?.email || 'Unknown',
      },
      {
        onSuccess: (incidentId) => {
          setEscalatedMap(prev => ({ ...prev, [target.id]: incidentId }));
          toast.success(`Incident ${incidentId} created from ${displayEventId(target.id)}`, {
            action: { label: 'Open Incident Response', onClick: () => navigate('/risk/incidents') },
          });
        },
        onError: (e: Error) => toast.error(`Failed to create incident: ${e.message}`),
      },
    );
    setEscalateTarget(null);
  };

  const handleCreateRule = () => {
    if (!ruleForm.name.trim()) { toast.error('Rule name is required'); return; }
    let condition: Record<string, any>;
    try {
      condition = JSON.parse(ruleForm.conditionText || '{}');
      if (condition === null || typeof condition !== 'object' || Array.isArray(condition)) {
        throw new Error('condition must be a JSON object');
      }
    } catch (e) {
      toast.error(`Condition is not valid JSON: ${(e as Error).message}`);
      return;
    }
    createRule.mutate(
      {
        name: ruleForm.name.trim(),
        ruleType: ruleForm.ruleType,
        action: ruleForm.action,
        priority: Number.isFinite(ruleForm.priority) ? ruleForm.priority : 0,
        condition,
      },
      {
        onSuccess: (rule) => {
          toast.success(`Rule "${rule.name}" created (${rule.id})`);
          setRuleForm(EMPTY_RULE_FORM);
        },
        onError: (e: Error) => toast.error(`Failed to create rule: ${e.message}`),
      },
    );
  };

  if (isLoading) return <PageSkeleton title="Active Guardrails" />;

  return (
    <div className="space-y-6">

      <PageHeader
        title="Active Guardrails"
        subtitle="Runtime guardrail events, acknowledgement workflow, and the org's guardrail rule set"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Trust Engine', href: '/trust-engine' }, { label: 'Guardrails' }]}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/trust-engine/traces')} style={{ borderRadius: 0 }}>
            View Inference Traces
          </Button>
        }
      />

      {error && (
        <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load guardrail events</p>
          <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{error.message}</p>
        </div>
      )}

      {/* Deep-link chips: ?model=<uuid> and ?policy=<uuid> */}
      {(modelParam || policyParam) && (
        <div className="flex items-center gap-2 flex-wrap">
          {modelParam && (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-[hsl(var(--brand-subtle))] border border-[hsl(var(--brand))/30] text-[hsl(var(--brand))] rounded-none">
              <span>Model: <strong>{modelChipName}</strong></span>
              <button aria-label="Clear model filter" onClick={() => clearParam('model')}
                className="inline-flex items-center hover:text-[hsl(var(--text-1))] cursor-pointer">
                <X size={14} />
              </button>
            </span>
          )}
          {policyParam && (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-[hsl(var(--brand-subtle))] border border-[hsl(var(--brand))/30] text-[hsl(var(--brand))] rounded-none">
              <span>Policy: <strong>{policyChipName}</strong></span>
              <button aria-label="Clear policy filter" onClick={() => clearParam('policy')}
                className="inline-flex items-center hover:text-[hsl(var(--text-1))] cursor-pointer">
                <X size={14} />
              </button>
            </span>
          )}
        </div>
      )}

      <StatCardRow
        cards={[
          {
            label: 'Events',
            value: events.length,
            description: `Guardrail events loaded: ${events.length}`,
          },
          {
            label: 'Blocked',
            value: blockedCount,
            description: `Events where the guardrail blocked the request: ${blockedCount}`,
          },
          {
            label: 'Open',
            value: openCount,
            description: `Events awaiting acknowledgement: ${openCount}`,
          },
          {
            label: 'Avg latency',
            value: avgLatency != null ? `${avgLatency}ms` : '—',
            description: 'Mean guardrail evaluation latency across loaded events',
          },
        ]}
      />

      <Tabs defaultValue="events">
        <TabsList style={{ borderRadius: 0 }}>
          <TabsTrigger value="events" style={{ borderRadius: 0 }}>Events</TabsTrigger>
          <TabsTrigger value="rules" style={{ borderRadius: 0 }}>Visual Rule Builder</TabsTrigger>
          <TabsTrigger value="models" style={{ borderRadius: 0 }}>Linked Models</TabsTrigger>
        </TabsList>

        {/* ── Events tab ──────────────────────────────────────────────────── */}
        <TabsContent value="events" className="space-y-4 mt-4">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by policy, model, action…"
            filters={[
              {
                key: 'severity', label: 'Severity', value: filterSeverity, onChange: setFilterSeverity,
                options: ['critical', 'high', 'medium', 'low'].map(s => ({ label: s, value: s })),
              },
              {
                key: 'action', label: 'Action', value: filterAction, onChange: setFilterAction,
                options: ['block', 'warn', 'redact', 'route_hitl', 'log'].map(a => ({ label: a.replace('_', ' '), value: a })),
              },
              {
                key: 'status', label: 'Status', value: filterStatus, onChange: setFilterStatus,
                options: ['open', 'acknowledged', 'resolved'].map(s => ({ label: s, value: s })),
              },
            ]}
            activeFilterCount={activeFilterCount}
            onClearAll={() => {
              setSearch(''); setFilterSeverity(''); setFilterAction(''); setFilterStatus('');
              setDateFrom(''); setDateTo('');
              if (modelParam || policyParam) setSearchParams({});
            }}
            trailing={
              <div className="flex items-center gap-2">
                <label className="text-xs text-[hsl(var(--text-4))]">From</label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="h-8 w-36 text-xs" style={{ borderRadius: 0 }} aria-label="Events from date" />
                <label className="text-xs text-[hsl(var(--text-4))]">To</label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="h-8 w-36 text-xs" style={{ borderRadius: 0 }} aria-label="Events to date" />
                <span className="text-xs text-[hsl(var(--text-4))]">
                  {filtered.length} event{filtered.length !== 1 ? 's' : ''}
                </span>
              </div>
            }
          />

          <Card style={{ borderRadius: 0 }}>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                      {['Event', 'Time', 'Policy', 'Model', 'Action', 'Severity', 'Status', 'Latency', 'Actions'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(ev => (
                      <tr key={ev.id} className="border-b hover:bg-raised transition-colors cursor-pointer"
                        style={{ borderColor: 'hsl(var(--border))' }}
                        onClick={() => { setSelectedEvent(ev); setSheetOpen(true); }}>
                        <td className="px-3 py-2.5">
                          <span className="font-mono text-xs px-1.5 py-0.5" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' }}>
                            {displayEventId(ev.id)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }} title={fullTimestamp(ev.createdAt)}>
                          {timeAgo(ev.createdAt)}
                        </td>
                        <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--text-1))' }}>
                          {ev.policyId ? (
                            <span title={ev.policyRef ?? undefined}>{ev.policyName ?? ev.policyRef ?? 'Unavailable'}</span>
                          ) : '—'}
                        </td>
                        <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                          {ev.modelId ? (
                            <InterlinkChip label={ev.modelName ?? 'Unavailable'} to={`/models/inventory/${ev.modelId}`} />
                          ) : (
                            <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">{actionBadge(ev.action)}</td>
                        <td className="px-3 py-2.5">{severityBadge(ev.severity)}</td>
                        <td className="px-3 py-2.5">{statusBadge(ev.status)}</td>
                        <td className="px-3 py-2.5 text-xs font-mono whitespace-nowrap" style={{ color: 'hsl(var(--text-1))' }}>
                          {ev.latencyMs != null ? `${ev.latencyMs}ms` : '—'}
                        </td>
                        <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" style={{ borderRadius: 0 }}
                              onClick={() => { setSelectedEvent(ev); setSheetOpen(true); }}>
                              <Eye size={14} style={{ color: 'hsl(var(--brand))' }} />
                            </Button>
                            {ev.status === 'open' && (
                              <Button variant="ghost" size="sm" className="h-7 px-2" style={{ borderRadius: 0 }}
                                onClick={() => { setAckTarget(ev); setAckReason(''); }}>
                                <span className="text-xs text-[hsl(var(--s-ok-tx))]">Ack</span>
                              </Button>
                            )}
                            {escalatedMap[ev.id] ? (
                              <Badge style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))', borderRadius: 0, fontSize: 9 }}>
                                Escalated → {escalatedMap[ev.id]}
                              </Badge>
                            ) : (
                              <Button variant="ghost" size="sm" className="h-7 px-2" style={{ borderRadius: 0 }}
                                onClick={() => setEscalateTarget(ev)}>
                                <span className="text-xs text-destructive">Escalate</span>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && !error && (
                  events.length === 0 && activeFilterCount === 0 && !search ? (
                    <div className="py-12 text-center">
                      <ShieldCheck size={32} className="mx-auto mb-3 text-[hsl(var(--text-4))]" />
                      <p className="text-sm text-[hsl(var(--text-3))]">No guardrail events recorded for your organization yet.</p>
                      <p className="text-xs text-[hsl(var(--text-4))] mt-1">
                        Events appear here when trust policies fire against live inference traffic.
                      </p>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-sm text-[hsl(var(--text-4))]">
                      No events match the current filters.
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Visual Rule Builder tab (real guardrail_rules CRUD) ─────────── */}
        <TabsContent value="rules" className="space-y-4 mt-4">
          {rulesError && (
            <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
              <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load guardrail rules</p>
              <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{rulesError.message}</p>
            </div>
          )}

          {/* New rule form */}
          <div style={{ border: '1px solid hsl(var(--brand) / 0.25)', background: 'hsl(var(--brand) / 0.03)', padding: 16 }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'hsl(var(--brand))' }}>New Rule</p>
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[11px] mr-1" style={{ color: 'hsl(var(--text-4))' }}>Prefill from template:</span>
                {RULE_TEMPLATES.map(tpl => (
                  <button
                    key={tpl.label}
                    onClick={() => setRuleForm({
                      name: tpl.form.name,
                      ruleType: tpl.form.ruleType,
                      action: tpl.form.action,
                      priority: tpl.form.priority,
                      conditionText: JSON.stringify(tpl.form.condition, null, 2),
                    })}
                    className="text-[11px] px-2 py-0.5 border transition-colors hover:border-[hsl(var(--brand))] hover:text-[hsl(var(--brand))]"
                    style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-3))', background: 'hsl(var(--bg-surface))', cursor: 'pointer' }}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Rule Name *</label>
                <Input value={ruleForm.name} onChange={e => setRuleForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. SSN redaction" className="h-8 text-xs" style={{ borderRadius: 0 }} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Type</label>
                <select value={ruleForm.ruleType} onChange={e => setRuleForm(f => ({ ...f, ruleType: e.target.value }))}
                  aria-label="Rule type"
                  style={{ width: '100%', height: 32, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '0 8px', borderRadius: 0, fontSize: 12 }}>
                  {RULE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Action</label>
                <select value={ruleForm.action} onChange={e => setRuleForm(f => ({ ...f, action: e.target.value }))}
                  aria-label="Rule action"
                  style={{ width: '100%', height: 32, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '0 8px', borderRadius: 0, fontSize: 12 }}>
                  {RULE_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Priority</label>
                <Input type="number" value={String(ruleForm.priority)}
                  onChange={e => setRuleForm(f => ({ ...f, priority: parseInt(e.target.value, 10) || 0 }))}
                  className="h-8 text-xs" style={{ borderRadius: 0 }} />
              </div>
            </div>
            <div className="mb-3">
              <label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Condition (JSON)</label>
              <textarea
                value={ruleForm.conditionText}
                onChange={e => setRuleForm(f => ({ ...f, conditionText: e.target.value }))}
                spellCheck={false}
                className="w-full px-3 py-2 text-xs font-mono border bg-transparent outline-none"
                style={{ borderColor: 'hsl(var(--border))', borderRadius: 0, minHeight: 96, color: 'hsl(var(--text-1))' }}
                placeholder='{"type": "pii", "entities": ["ssn"]}'
              />
            </div>
            <Button size="sm" style={{ borderRadius: 0 }} onClick={handleCreateRule} disabled={createRule.isPending}>
              <Plus size={13} /> {createRule.isPending ? 'Creating…' : 'Create Rule'}
            </Button>
          </div>

          {/* Existing rules — real rows with pretty-printed condition jsonb */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'hsl(var(--text-3))' }}>
              Configured Rules {!rulesLoading && `(${rules.filter(r => r.enabled).length} enabled / ${rules.length} total)`}
            </p>
            {rulesLoading ? (
              <p className="text-xs py-4" style={{ color: 'hsl(var(--text-4))' }}>Loading rules…</p>
            ) : rules.length === 0 && !rulesError ? (
              <div className="py-10 text-center" style={{ border: '1px solid hsl(var(--border))' }}>
                <p className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>No guardrail rules configured yet.</p>
                <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>Create the first rule above, or start from a template.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {rules.map(rule => (
                  <div key={rule.id} className="px-3 py-2" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-4))', minWidth: 90 }}>{rule.id}</span>
                      <span className="text-xs font-semibold flex-1" style={{ color: rule.enabled ? 'hsl(var(--text-1))' : 'hsl(var(--text-4))' }}>
                        {rule.name}
                      </span>
                      {rule.ruleType && (
                        <Badge style={{ background: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))', borderRadius: 0, fontSize: 10 }}>{rule.ruleType}</Badge>
                      )}
                      {actionBadge(rule.action)}
                      <span className="text-xs whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>prio {rule.priority}</span>
                      <Switch
                        checked={rule.enabled}
                        disabled={updateRule.isPending}
                        onCheckedChange={(checked) => {
                          updateRule.mutate(
                            { id: rule.id, patch: { enabled: checked } },
                            {
                              onSuccess: (saved) => toast.success(`Rule "${saved.name}" ${saved.enabled ? 'enabled' : 'disabled'}`),
                              onError: (e: Error) => toast.error(`Failed to update rule: ${e.message}`),
                            },
                          );
                        }}
                        aria-label={`${rule.enabled ? 'Disable' : 'Enable'} rule ${rule.name}`}
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" style={{ borderRadius: 0, color: 'hsl(var(--s-er-tx))' }}>
                            <Trash size={13} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent style={{ borderRadius: 0 }}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Rule</AlertDialogTitle>
                            <AlertDialogDescription>
                              Delete rule "{rule.name}" ({rule.id})? This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
                            <AlertDialogAction style={{ borderRadius: 0 }}
                              onClick={() => removeRule.mutate(rule.id, {
                                onSuccess: () => toast.success(`Rule "${rule.name}" deleted`),
                                onError: (e: Error) => toast.error(`Failed to delete rule: ${e.message}`),
                              })}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    {/* The REAL condition jsonb, pretty-printed */}
                    <details className="mt-1.5">
                      <summary className="text-[11px] cursor-pointer select-none" style={{ color: 'hsl(var(--text-4))' }}>
                        Condition
                      </summary>
                      <pre className="text-[11px] font-mono mt-1 p-2 overflow-x-auto"
                        style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0, color: 'hsl(var(--text-2))' }}>
                        {JSON.stringify(rule.condition, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Linked Models tab (models actually referenced by events) ────── */}
        <TabsContent value="models" className="space-y-3 mt-4">
          <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
            Registry models referenced by the loaded guardrail events.
          </p>
          {linkedModels.length === 0 ? (
            <div className="py-10 text-center" style={{ border: '1px solid hsl(var(--border))' }}>
              <Cpu size={28} className="mx-auto mb-2 text-[hsl(var(--text-4))]" />
              <p className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>No guardrail events reference a model yet.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {linkedModels.map(m => (
                <div key={m.id} className="flex items-center justify-between px-3 py-2.5"
                  style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                  <InterlinkChip label={m.name ?? 'Unavailable'} to={`/models/inventory/${m.id}`} />
                  <div className="flex items-center gap-3">
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                      {m.count} event{m.count !== 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={() => setSearchParams({ model: m.id })}
                      className="text-xs underline"
                      style={{ color: 'hsl(var(--brand))', cursor: 'pointer' }}
                    >
                      Filter events
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Acknowledge Dialog — persists ack_by / ack_at / ack_reason */}
      <Dialog open={!!ackTarget} onOpenChange={(open) => { if (!open) setAckTarget(null); }}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 480 }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>
              Acknowledge {ackTarget ? displayEventId(ackTarget.id) : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="p-3 text-xs space-y-1" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
              <p style={{ color: 'hsl(var(--text-3))' }}>
                Policy: <strong style={{ color: 'hsl(var(--text-1))' }}>{ackTarget?.policyName ?? ackTarget?.policyRef ?? '—'}</strong>
              </p>
              <p style={{ color: 'hsl(var(--text-3))' }}>
                Acknowledging as <strong style={{ color: 'hsl(var(--text-1))' }}>{user?.name || user?.email || 'Unknown user'}</strong> — recorded against your user profile.
              </p>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Reason / resolution note</label>
              <textarea
                className="w-full px-3 py-2 text-sm border bg-transparent outline-none"
                style={{ borderColor: 'hsl(var(--border))', borderRadius: 0, minHeight: 72, color: 'hsl(var(--text-1))' }}
                value={ackReason}
                onChange={e => setAckReason(e.target.value)}
                placeholder="e.g. Legitimate block — policy behaving as intended"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAckTarget(null)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleAck} disabled={acknowledge.isPending} style={{ borderRadius: 0 }}>
              <CheckCircle size={14} /> {acknowledge.isPending ? 'Saving…' : 'Acknowledge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Escalate Dialog — creates a REAL incident in the Incident Response module */}
      <Dialog open={!!escalateTarget} onOpenChange={(open) => { if (!open) setEscalateTarget(null); }}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
              <Siren size={18} weight="fill" style={{ color: 'hsl(var(--destructive))' }} />
              Escalate to Incident Response
            </DialogTitle>
          </DialogHeader>
          {escalateTarget && (
            <div className="space-y-3 mt-2">
              <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>
                This creates a real incident record in the Incident Response module, linked back to this guardrail event.
              </p>
              <div className="p-3 space-y-2" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>Event</span>
                  <span className="text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{displayEventId(escalateTarget.id)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>Policy</span>
                  <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{escalateTarget.policyName ?? escalateTarget.policyRef ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>Model</span>
                  <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{escalateTarget.modelName ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>Severity</span>
                  {severityBadge(escalateTarget.severity)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>Action taken</span>
                  {actionBadge(escalateTarget.action)}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEscalateTarget(null)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleEscalate} disabled={escalate.isPending}
              style={{ borderRadius: 0, background: 'hsl(var(--destructive))', color: 'hsl(var(--bg-surface))' }}>
              <Siren size={14} weight="fill" /> {escalate.isPending ? 'Creating…' : 'Create Incident'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto" style={{ borderRadius: 0 }}>
          {selectedEvent && (
            <>
              <SheetHeader className="pb-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
                <SheetTitle className="flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
                  <ShieldCheck size={18} weight="fill" style={{ color: 'hsl(var(--brand))' }} />
                  <span className="font-mono text-sm px-1.5 py-0.5" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' }}>
                    {displayEventId(selectedEvent.id)}
                  </span>
                  {statusBadge(selectedEvent.status)}
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 col-span-2" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Policy</span>
                    <p className="text-sm font-medium mt-1" style={{ color: 'hsl(var(--text-1))' }}>
                      {selectedEvent.policyName ?? 'Unavailable'}
                      {selectedEvent.policyRef && (
                        <span className="text-xs font-mono ml-2" style={{ color: 'hsl(var(--text-4))' }}>{selectedEvent.policyRef}</span>
                      )}
                    </p>
                  </div>
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Model</span>
                    <div className="mt-1">
                      {selectedEvent.modelId ? (
                        <InterlinkChip label={selectedEvent.modelName ?? 'Unavailable'} to={`/models/inventory/${selectedEvent.modelId}`} />
                      ) : (
                        <span className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>—</span>
                      )}
                    </div>
                  </div>
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Agent</span>
                    <p className="text-sm mt-1" style={{ color: selectedEvent.agentName ? 'hsl(var(--text-1))' : 'hsl(var(--text-4))' }}>
                      {selectedEvent.agentName ?? 'Not attributed'}
                    </p>
                  </div>
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Action</span>
                    <div className="mt-1">{actionBadge(selectedEvent.action)}</div>
                  </div>
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Severity</span>
                    <div className="mt-1">{severityBadge(selectedEvent.severity)}</div>
                  </div>
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Latency</span>
                    <p className="text-sm font-mono mt-1" style={{ color: 'hsl(var(--text-1))' }}>
                      {selectedEvent.latencyMs != null ? `${selectedEvent.latencyMs}ms` : '—'}
                    </p>
                  </div>
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Occurred</span>
                    <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-1))' }}>{fullTimestamp(selectedEvent.createdAt)}</p>
                  </div>
                </div>

                {/* Acknowledgement record (real ack_by resolved to a name) */}
                {selectedEvent.ackAt ? (
                  <div className="p-3 space-y-1" style={{ background: 'hsl(var(--s-ok-bg))', borderLeft: '3px solid hsl(var(--s-ok-tx))', borderRadius: 0 }}>
                    <p className="text-xs font-semibold" style={{ color: 'hsl(var(--s-ok-tx))' }}>
                      Acknowledged by {selectedEvent.ackByName ?? 'Unavailable'} · {fullTimestamp(selectedEvent.ackAt)}
                    </p>
                    {selectedEvent.ackReason && (
                      <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{selectedEvent.ackReason}</p>
                    )}
                  </div>
                ) : selectedEvent.status === 'open' && (
                  <Button size="sm" style={{ borderRadius: 0 }}
                    onClick={() => { setSheetOpen(false); setAckTarget(selectedEvent); setAckReason(''); }}>
                    <CheckCircle size={13} /> Acknowledge this event
                  </Button>
                )}

                {/* The REAL policy configuration (trust_policies.condition_json) */}
                <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                  <span className="text-xs mb-2 block" style={{ color: 'hsl(var(--text-4))' }}>
                    Policy configuration {selectedEvent.policyType ? `(${selectedEvent.policyType})` : ''}
                  </span>
                  {selectedEvent.policyCondition ? (
                    <pre className="text-xs font-mono p-3 overflow-x-auto"
                      style={{ background: 'hsl(var(--bg-muted))', borderRadius: 0, color: 'hsl(var(--text-1))' }}>
                      {JSON.stringify(selectedEvent.policyCondition, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                      No condition configuration is recorded for the evaluated policy.
                    </p>
                  )}
                </div>

                {/* Cross-links */}
                {selectedEvent.modelId && (
                  <div className="flex gap-2 flex-wrap">
                    <InterlinkChip
                      label="View this model's inference traces"
                      to={`/trust-engine/traces?model=${selectedEvent.modelId}`}
                      onClick={() => setSheetOpen(false)}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
