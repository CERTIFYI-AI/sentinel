// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// Conformity Assessment — wired to the real org-scoped
// `conformity_assessments` table (ISO 42001 Clause 9 / EU AI Act Annex IV).
// Assessments reference frameworks (frameworks.id) and models (ai_models.id);
// unresolvable legacy references render as "Unavailable" rather than a
// guessed link. The former demo-table stepper with simulated scoring and the
// fake "Generate PDF" action were dropped — findings shown here come straight
// from the assessment record.
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Eye, Trash, Plus, ClipboardText, Warning, CheckCircle, Info, Clock,
  Cube, StackSimple, ArrowSquareOut, FileText,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PageHeader } from '../../components/ui/PageHeader';
import { useConformityData } from '../../hooks/useConformityData';
import { useFrameworksData } from '../../hooks/useFrameworksData';
import { useModelsData } from '../../hooks/useModelsData';
import type { ConformityAssessmentRecord } from '../../services/conformityService';
import { PageSkeleton } from '../../components/ui/PageSkeleton';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { safeExternalUrl } from '@/lib/url';

function formatDate(d?: string | null): string {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const STATUS_OPTIONS = ['Not Started', 'In Progress', 'Completed'];

function statusStyle(status?: string | null) {
  const s = (status || '').toLowerCase();
  if (s === 'completed' || s === 'complete') return { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' };
  if (s === 'in progress') return { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' };
  if (s === 'not started' || s === 'draft') return { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' };
  return { bg: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))' };
}

function complianceLevelStyle(level?: string | null) {
  const l = (level || '').toLowerCase();
  if (l === 'conformant') return { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' };
  if (l.startsWith('substantially')) return { bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' };
  if (l === 'partial') return { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' };
  if (l === 'non-conformant') return { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))' };
  return { bg: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))' };
}

// Findings are free-form jsonb on the record; render honest key/value rows.
function findingLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function findingValue(v: unknown): string {
  if (typeof v === 'number') return v <= 1 && v >= 0 && !Number.isInteger(v) ? `${Math.round(v * 100)}%` : String(v);
  return String(v);
}

interface NewAssessmentForm {
  title: string;
  framework_id: string;
  model_id: string;
  assessment_body: string;
  valid_until: string;
}

const EMPTY_FORM: NewAssessmentForm = { title: '', framework_id: '', model_id: '', assessment_body: '', valid_until: '' };

// Resolve evidence_ids to real evidence titles — an id renders as its
// resolved label or "Unavailable", never as a raw id.
async function fetchEvidenceLabels(ids: readonly string[]): Promise<Map<string, string>> {
  if (!isSupabaseConfigured() || !supabase || ids.length === 0) return new Map();
  const { data, error } = await supabase
    .from('evidence')
    .select('id, title')
    .in('id', ids as string[]);
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((r: { id: string; title: string | null }) => [r.id, r.title ?? 'Unavailable']));
}

export default function ConformityAssessment() {
  const { assessments, isLoading, error, save, remove, isSaving } = useConformityData();
  const { frameworks } = useFrameworksData();
  const { models } = useModelsData();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selected, setSelected] = useState<ConformityAssessmentRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ConformityAssessmentRecord | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<NewAssessmentForm>(EMPTY_FORM);

  // Deep link: ?open=<id> opens that assessment once data is loaded
  // (platform pattern — see pages/audits/AuditManagement.tsx).
  useEffect(() => {
    const openId = searchParams.get('open');
    if (!openId || isLoading) return;
    const match = assessments.find(a => a.id === openId || a.assessment_id === openId);
    if (match) setSelected(match);
    setSearchParams(prev => { const next = new URLSearchParams(prev); next.delete('open'); return next; }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, assessments.length]);

  const resolveFramework = (ref?: string | null) => frameworks.find((f: any) => f.id === ref);
  // Models resolve by ai_models.id ONLY (one id-space); legacy slug refs are
  // gone from the seeds, and an unresolved ref renders "Unavailable".
  const resolveModel = (ref?: string | null) => models.find(m => m.id === ref);

  // Evidence labels for the assessment open in the detail sheet.
  const selectedEvidenceIds = selected?.evidence_ids ?? [];
  const evidenceQuery = useQuery({
    queryKey: ['conformity-evidence-labels', selectedEvidenceIds],
    queryFn: () => fetchEvidenceLabels(selectedEvidenceIds),
    enabled: selectedEvidenceIds.length > 0,
    staleTime: 60_000,
  });

  const total = assessments.length;
  const completed = assessments.filter(a => (a.status || '').toLowerCase() === 'completed').length;
  const inProgress = assessments.filter(a => (a.status || '').toLowerCase() === 'in progress').length;
  const notStarted = assessments.filter(a => ['not started', 'draft'].includes((a.status || '').toLowerCase())).length;

  const metrics = [
    { label: 'Total Assessments', value: total, bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))', icon: <ClipboardText size={16} weight="fill" /> },
    { label: 'Completed', value: completed, bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))', icon: <CheckCircle size={16} weight="fill" /> },
    { label: 'In Progress', value: inProgress, bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))', icon: <Clock size={16} weight="fill" /> },
    { label: 'Not Started', value: notStarted, bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))', icon: <Warning size={16} weight="fill" /> },
  ];

  const handleCreate = async () => {
    try {
      const year = new Date().getFullYear();
      await save({
        assessment_id: `CA-${year}-${crypto.randomUUID().slice(0, 8)}`,
        title: form.title.trim(),
        framework_id: form.framework_id || null,
        model_id: form.model_id || null,
        assessment_body: form.assessment_body.trim() || null,
        status: 'Not Started',
        compliance_level: 'Pending',
        valid_until: form.valid_until || null,
      });
      toast.success(`Assessment "${form.title.trim()}" created`);
      setCreateOpen(false);
      setForm(EMPTY_FORM);
    } catch (e: any) {
      toast.error(`Failed to create assessment: ${e?.message ?? 'unknown error'}`);
    }
  };

  const handleStatusChange = async (a: ConformityAssessmentRecord, status: string) => {
    try {
      await save({ id: a.id, assessment_id: a.assessment_id, title: a.title, status });
      toast.success(`${a.assessment_id} marked ${status}`);
      setSelected(prev => (prev?.id === a.id ? { ...prev, status } : prev));
    } catch (e: any) {
      toast.error(`Failed to update status: ${e?.message ?? 'unknown error'}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove(deleteTarget.id);
      toast.success(`${deleteTarget.assessment_id} deleted`);
      setSelected(prev => (prev?.id === deleteTarget.id ? null : prev));
    } catch (e: any) {
      toast.error(`Failed to delete assessment: ${e?.message ?? 'unknown error'}`);
    }
    setDeleteTarget(null);
  };

  const findingsEntries = useMemo(() => {
    if (!selected?.findings || typeof selected.findings !== 'object') return [];
    return Object.entries(selected.findings as Record<string, unknown>)
      .filter(([, v]) => typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean');
  }, [selected]);

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header — platform primitive */}
      <PageHeader
        title="Conformity Assessment"
        subtitle="ISO 42001 Clause 9 and EU AI Act Annex IV assessment management"
        icon={ClipboardText}
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Conformity Assessment' }]}
        actions={
          <Button onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true); }} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
            <Plus size={14} /> New Assessment
          </Button>
        }
      />

      {error && (
        <div className="p-3 text-sm" style={{ background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-br))', color: 'hsl(var(--s-er-tx))' }}>
          Failed to load assessments: {(error as Error).message}
        </div>
      )}

      {/* Info banner */}
      <div className="p-3" style={{ background: 'hsl(var(--s-in-bg))', border: '1px solid hsl(var(--s-in-bg))', borderRadius: 0 }}>
        <p className="text-xs" style={{ color: 'hsl(var(--s-in-tx))' }}>
          <Info size={12} className="inline mr-1" />
          <strong>Regulatory Requirement:</strong> Conformity assessments are mandatory for high-risk
          AI systems under EU AI Act Annex IV.
          {total > 0 && ` ${inProgress} in progress, ${notStarted} not started.`}
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map(m => (
          <Card key={m.label} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>{m.label}</span>
                <div className="p-1.5" style={{ background: m.bg, color: m.color, borderRadius: 0 }}>{m.icon}</div>
              </div>
              <div className="text-2xl font-bold" style={{ color: m.color }}>{m.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Assessment cards */}
      {total === 0 ? (
        <div className="flex flex-col items-center justify-center py-16" style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-3))' }}>
          <ClipboardText size={40} />
          <p className="mt-3 text-sm font-medium">No conformity assessments yet</p>
          <p className="text-xs mt-1">Start an assessment against one of your adopted frameworks.</p>
          <Button size="sm" className="mt-4" style={{ borderRadius: 0 }} onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true); }}>
            <Plus size={14} /> New Assessment
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assessments.map(ca => {
            const st = statusStyle(ca.status);
            const cl = complianceLevelStyle(ca.compliance_level);
            const fw = resolveFramework(ca.framework_id);
            const model = resolveModel(ca.model_id);
            return (
              <Card key={ca.id} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{ca.assessment_id}</span>
                      <h3 className="text-sm font-semibold mt-0.5 line-clamp-2" style={{ color: 'hsl(var(--text-1))' }}>{ca.title}</h3>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSelected(ca)}>
                        <Eye size={14} style={{ color: 'hsl(var(--brand))' }} />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteTarget(ca)}>
                        <Trash size={14} style={{ color: 'hsl(var(--destructive))' }} />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge style={{ background: st.bg, color: st.color, borderRadius: 0, fontSize: 10 }}>{ca.status || 'Unknown'}</Badge>
                    {ca.compliance_level && (
                      <Badge style={{ background: cl.bg, color: cl.color, borderRadius: 0, fontSize: 10 }}>{ca.compliance_level}</Badge>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5">
                      <StackSimple size={12} style={{ color: 'hsl(var(--text-4))' }} />
                      {fw ? (
                        <span className="px-1.5 py-0.5" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' }}>{fw.name}</span>
                      ) : (
                        <span title="Framework reference could not be resolved" style={{ color: 'hsl(var(--text-4))' }}>Unavailable</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Cube size={12} style={{ color: 'hsl(var(--text-4))' }} />
                      {model ? (
                        <Link to={`/models/inventory/${model.id}`} className="px-1.5 py-0.5 hover:underline" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' }}>
                          {model.name}
                        </Link>
                      ) : (
                        <span title="Model reference could not be resolved" style={{ color: 'hsl(var(--text-4))' }}>Unavailable</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                    <span>{ca.assessment_body || 'No assessment body'}</span>
                    <span>Valid until {formatDate(ca.valid_until)}</span>
                  </div>

                  <Button
                    className="w-full text-xs"
                    onClick={() => setSelected(ca)}
                    style={{ borderRadius: 0, background: 'transparent', color: 'hsl(var(--brand))', border: '1px solid hsl(var(--brand))' }}
                  >
                    View Details
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        type="danger"
        title="Delete Assessment"
        message={<p>Delete assessment <strong>{deleteTarget?.assessment_id}</strong> — {deleteTarget?.title}? This cannot be undone.</p>}
        confirmLabel="Delete"
      />

      {/* Detail sheet */}
      <Sheet open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto" style={{ borderRadius: 0 }}>
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
                  <ClipboardText size={18} weight="fill" style={{ color: 'hsl(var(--brand))' }} />
                  {selected.assessment_id}
                </SheetTitle>
                <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{selected.title}</p>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {(() => { const st = statusStyle(selected.status); return (
                    <Badge style={{ background: st.bg, color: st.color, borderRadius: 0 }}>{selected.status || 'Unknown'}</Badge>
                  ); })()}
                  {selected.compliance_level && (() => { const cl = complianceLevelStyle(selected.compliance_level); return (
                    <Badge style={{ background: cl.bg, color: cl.color, borderRadius: 0 }}>{selected.compliance_level}</Badge>
                  ); })()}
                </div>

                <div className="space-y-2">
                  {[
                    { label: 'Assessment Body', value: selected.assessment_body || '—' },
                    { label: 'Valid Until', value: formatDate(selected.valid_until) },
                    { label: 'Created', value: formatDate(selected.created_at) },
                    { label: 'Last Updated', value: formatDate(selected.updated_at) },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                      <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>Framework</span>
                    {(() => {
                      const fw = resolveFramework(selected.framework_id);
                      return fw ? (
                        <span className="text-sm px-2 py-0.5" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' }}>{fw.name}</span>
                      ) : (
                        <span className="text-sm" title="Framework reference could not be resolved" style={{ color: 'hsl(var(--text-4))' }}>Unavailable</span>
                      );
                    })()}
                  </div>
                  <div className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>Model</span>
                    {(() => {
                      const model = resolveModel(selected.model_id);
                      return model ? (
                        <Link to={`/models/inventory/${model.id}`} className="text-sm px-2 py-0.5 hover:underline" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' }}>
                          {model.name} <ArrowSquareOut size={11} className="inline ml-0.5" />
                        </Link>
                      ) : (
                        <span className="text-sm" title="Model reference could not be resolved" style={{ color: 'hsl(var(--text-4))' }}>Unavailable</span>
                      );
                    })()}
                  </div>
                </div>

                {/* Findings (from the record) */}
                <div>
                  <h4 className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-4))' }}>FINDINGS</h4>
                  {findingsEntries.length === 0 ? (
                    <p className="text-xs py-3 px-3" style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-4))' }}>
                      No findings recorded for this assessment yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {findingsEntries.map(([k, v]) => (
                        <div key={k} className="p-2.5" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
                          <p className="text-[10px] uppercase" style={{ color: 'hsl(var(--text-4))' }}>{findingLabel(k)}</p>
                          <p className="text-sm font-bold mt-0.5" style={{ color: 'hsl(var(--text-1))' }}>{findingValue(v)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Linked evidence */}
                <div>
                  <h4 className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-4))' }}>LINKED EVIDENCE</h4>
                  {(selected.evidence_ids || []).length === 0 ? (
                    <div className="flex items-center justify-between py-3 px-3" style={{ background: 'hsl(var(--bg-muted))' }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No evidence linked to this assessment yet.</span>
                      <Link to="/evidence-vault" className="text-xs hover:underline flex items-center gap-1" style={{ color: 'hsl(var(--brand))' }}>
                        <FileText size={11} /> Evidence Vault
                      </Link>
                    </div>
                  ) : evidenceQuery.isLoading ? (
                    <p className="text-xs py-3 px-3" style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-4))' }}>
                      Resolving evidence…
                    </p>
                  ) : evidenceQuery.error ? (
                    <p className="text-xs py-3 px-3" role="alert" style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))' }}>
                      Failed to resolve evidence: {(evidenceQuery.error as Error).message}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {(selected.evidence_ids || []).map(id => {
                        // Resolved title or "Unavailable" — never a raw id.
                        const label = evidenceQuery.data?.get(id);
                        return label ? (
                          <Link key={id} to={`/evidence-vault?open=${id}`} className="text-[11px] px-2 py-0.5 hover:underline" style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' }}>
                            {label}
                          </Link>
                        ) : (
                          <span key={id} title="Evidence reference could not be resolved" className="text-[11px] px-2 py-0.5" style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-4))' }}>
                            Unavailable
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {selected.certificate_url && (
                  <div>
                    <h4 className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-4))' }}>CERTIFICATE</h4>
                    <a href={safeExternalUrl(selected.certificate_url) ?? undefined} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline inline-flex items-center gap-1" style={{ color: 'hsl(var(--brand))' }}>
                      <ArrowSquareOut size={12} /> {selected.certificate_url}
                    </a>
                  </div>
                )}

                {/* Status update — a real write */}
                <div className="pt-2" style={{ borderTop: '1px solid hsl(var(--border))' }}>
                  <h4 className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-4))' }}>UPDATE STATUS</h4>
                  <div className="flex gap-2">
                    {STATUS_OPTIONS.map(s => (
                      <Button
                        key={s}
                        size="sm"
                        variant={selected.status === s ? 'default' : 'outline'}
                        disabled={isSaving || selected.status === s}
                        onClick={() => handleStatusChange(selected, s)}
                        style={{ borderRadius: 0, fontSize: 11 }}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>New Conformity Assessment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Title *</label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} style={{ borderRadius: 0 }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Framework</label>
                <Select value={form.framework_id || undefined} onValueChange={v => setForm(p => ({ ...p, framework_id: v }))}>
                  <SelectTrigger style={{ width: '100%', borderRadius: 0 }}><SelectValue placeholder="Select framework…" /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {frameworks.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Model</label>
                <Select value={form.model_id || undefined} onValueChange={v => setForm(p => ({ ...p, model_id: v }))}>
                  <SelectTrigger style={{ width: '100%', borderRadius: 0 }}><SelectValue placeholder="Select model…" /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Assessment Body</label>
              <Input value={form.assessment_body} placeholder="e.g. Internal Risk Team, BSI Group" onChange={e => setForm(p => ({ ...p, assessment_body: e.target.value }))} style={{ borderRadius: 0 }} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Valid Until</label>
              <Input type="date" value={form.valid_until} onChange={e => setForm(p => ({ ...p, valid_until: e.target.value }))} style={{ borderRadius: 0 }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.title.trim() || isSaving} style={{ borderRadius: 0 }}>
              {isSaving ? 'Creating…' : 'Create Assessment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
