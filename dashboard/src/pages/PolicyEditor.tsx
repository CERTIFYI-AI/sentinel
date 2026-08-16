// SPDX-License-Identifier: Apache-2.0
// Policy Editor — the structured editor for REAL policies (policies table via
// hooks/queries/usePolicies). Editing writes the policy row AND records a
// policy_versions row with a properly incremented semver minor, changedBy
// from the signed-in user, and an operator-entered changelog. Submitting for
// approval creates a real ApprovalRecord in the oversight queue.
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, PencilSimple, FloppyDisk, X, Clock, PaperPlaneTilt, TrashSimple } from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { toast } from 'sonner';
import { usePolicies, useUpsertPolicy } from '@/hooks/queries/usePolicies';
import { usePolicyVersions } from '@/hooks/useComplianceGroup';
import { useApprovals } from '@/hooks/useRiskIncidents';
import { useAuthStore } from '../stores/authStore';
import { savePolicyVersion, type PolicyRecord } from '../services/policyService';

interface SectionDraft { heading: string; text: string }
interface EditorDraft {
  title: string;
  description: string;
  summary: string;
  sections: SectionDraft[];
  changelog: string;
}

// Increment the semver minor from the LAST version row ('v'?maj.min);
// default 1.0 when no version has been recorded yet.
function nextVersion(last?: string | null): string {
  const m = /^v?(\d+)\.(\d+)/.exec(last ?? '');
  if (!m) return '1.0';
  const prefix = /^v/i.test(last ?? '') ? 'v' : '';
  return `${prefix}${m[1]}.${Number(m[2]) + 1}`;
}

function sectionsOf(content: any): SectionDraft[] {
  if (!content || !Array.isArray(content.sections)) return [];
  return content.sections.map((s: any) => ({
    heading: s?.heading ?? '',
    text: s?.text ?? s?.body ?? '',
  }));
}

function statusBadgeStyle(status: string) {
  switch (status) {
    case 'published': return { background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' };
    case 'in_review': return { background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' };
    case 'archived': return { background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))' };
    default: return { background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))' };
  }
}

export default function PolicyEditor() {
  const { user } = useAuthStore();
  const { data: policies = [], isLoading, error } = usePolicies();
  const upsertMutation = useUpsertPolicy();
  const approvals = useApprovals();
  const qc = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditorDraft | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', framework: '', description: '' });

  const selected = useMemo(
    () => policies.find(p => p.id === selectedId) ?? null,
    [policies, selectedId],
  );
  const { data: versions = [], isLoading: versionsLoading } = usePolicyVersions(selected?.id);

  const changedBy = user?.fullName ?? user?.email ?? undefined;

  // Records the policy_versions row after the policy upsert; invalidates the
  // version namespace so the history panel refreshes. Errors surface — no
  // fake success.
  const versionMutation = useMutation({
    mutationFn: (v: { policyId: string; version: string; content: unknown; changelog?: string }) =>
      savePolicyVersion(v.policyId, v.version, v.content, changedBy, v.changelog),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cg-policy-versions'] }); },
    onError: (e: any) => toast.error(e?.message ? `Version not recorded: ${e.message}` : 'Failed to record the policy version'),
  });

  const startEditing = () => {
    if (!selected) return;
    setDraft({
      title: selected.title,
      description: selected.description ?? '',
      summary: selected.content?.summary ?? '',
      sections: sectionsOf(selected.content),
      changelog: '',
    });
  };

  const saveDraft = async () => {
    if (!draft || !selected?.id) return;
    if (!draft.title.trim()) { toast.error('Title is required'); return; }
    const content = {
      ...(selected.content && typeof selected.content === 'object' ? selected.content : {}),
      summary: draft.summary,
      sections: draft.sections.map(s => ({ heading: s.heading, text: s.text })),
    };
    const version = nextVersion(versions[0]?.version ?? selected.version);
    try {
      await upsertMutation.mutateAsync({
        ...selected,
        name: draft.title.trim(),
        title: draft.title.trim(),
        description: draft.description.trim() || undefined,
        content,
        version,
      }); // hook toasts 'Policy saved' / error
      await versionMutation.mutateAsync({
        policyId: selected.id,
        version,
        content,
        changelog: draft.changelog.trim() || undefined,
      });
      setDraft(null);
    } catch { /* mutation hooks surface the error toasts; stay in edit mode */ }
  };

  const submitForApproval = async () => {
    if (!selected?.id) return;
    try {
      await approvals.save({
        entityType: 'policy',
        entityId: selected.id,
        entityName: selected.title,
        requestedBy: changedBy ?? null,
        requestedAction: 'approve_policy',
        reason: `Publish request for policy ${selected.policyRef ?? selected.title}`,
        status: 'pending',
        stepIndex: 0,
      });
      await upsertMutation.mutateAsync({ ...selected, name: selected.title, status: 'in_review' });
    } catch { /* hooks surface the error toasts */ }
  };

  const createPolicy = async () => {
    if (!newForm.name.trim()) return;
    const record: PolicyRecord = {
      // No client-minted id — the DB uuid default assigns it.
      title: newForm.name.trim(),
      name: newForm.name.trim(),
      description: newForm.description.trim() || undefined,
      framework: newForm.framework.trim() || null,
      linkedFrameworks: newForm.framework.trim() ? [newForm.framework.trim()] : [],
      status: 'draft',
      version: '1.0',
      content: { summary: '', sections: [] },
    };
    try {
      const saved = await upsertMutation.mutateAsync(record);
      if (saved.id) {
        await versionMutation.mutateAsync({
          policyId: saved.id,
          version: '1.0',
          content: record.content,
          changelog: 'Initial draft',
        });
        setSelectedId(saved.id);
      }
      setShowNew(false);
      setNewForm({ name: '', framework: '', description: '' });
      setDraft(null);
    } catch { /* hooks surface the error toasts; dialog stays open */ }
  };

  const setSection = (i: number, patch: Partial<SectionDraft>) =>
    setDraft(d => d ? { ...d, sections: d.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) } : d);
  const addSection = () =>
    setDraft(d => d ? { ...d, sections: [...d.sections, { heading: '', text: '' }] } : d);
  const removeSection = (i: number) =>
    setDraft(d => d ? { ...d, sections: d.sections.filter((_, j) => j !== i) } : d);

  const isSaving = upsertMutation.isPending || versionMutation.isPending;
  const viewSections = selected ? sectionsOf(selected.content) : [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Policy Editor"
        subtitle="Draft and revise governance policies — every save records a version"
        actions={
          <Button size="sm" style={{ borderRadius: 0 }} onClick={() => setShowNew(true)}>
            <Plus size={14} /> New Policy
          </Button>
        }
      />

      {/* Real query error state */}
      {error != null && (
        <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load policies</p>
          <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{(error as Error).message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Policy list */}
        <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]" style={{ borderRadius: 0 }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Policies{isLoading ? '' : ` (${policies.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="text-xs p-4" style={{ color: 'hsl(var(--text-4))' }}>Loading policies…</p>
            ) : policies.length === 0 ? (
              <div className="p-6 text-center" style={{ color: 'hsl(var(--text-4))' }}>
                <FileText size={28} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs">No policies yet. Create one, or instantiate a template from the Policy Templates catalog.</p>
              </div>
            ) : (
              <div className="divide-y divide-[hsl(var(--border))] max-h-[600px] overflow-y-auto">
                {policies.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedId(p.id ?? null); setDraft(null); }}
                    className={`w-full text-left px-4 py-3 hover:bg-[hsl(var(--bg-muted))] transition-colors ${
                      selectedId === p.id ? 'bg-[hsl(var(--bg-muted))] border-l-2 border-l-[hsl(var(--brand))]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-sm font-medium text-[hsl(var(--text-1))] truncate">{p.title}</p>
                      <span className="text-[9px] font-medium px-1.5 py-0.5 capitalize flex-shrink-0 ml-2" style={statusBadgeStyle(p.status)}>
                        {p.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {p.framework && (
                        <span className="text-[10px] px-1.5 py-0.5" style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' }}>{p.framework}</span>
                      )}
                      <span className="text-[10px] text-[hsl(var(--text-4))] font-mono">{p.policyRef ?? ''} {p.version ? `· ${p.version}` : ''}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Editor + version history */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]" style={{ borderRadius: 0 }}>
            {selected ? (
              <>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base font-bold text-[hsl(var(--text-1))] truncate">
                        {draft ? 'Editing: ' : ''}{selected.title}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[9px] font-medium px-1.5 py-0.5 capitalize" style={statusBadgeStyle(selected.status)}>
                          {selected.status.replace('_', ' ')}
                        </span>
                        {selected.framework && (
                          <span className="text-[10px] px-1.5 py-0.5" style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' }}>{selected.framework}</span>
                        )}
                        <span className="text-[11px] text-[hsl(var(--text-4))] flex items-center gap-1">
                          <Clock size={10} /> {selected.version ?? '—'}{selected.updatedAt ? ` · updated ${new Date(selected.updatedAt).toLocaleDateString()}` : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {draft ? (
                        <>
                          <Button size="sm" variant="outline" style={{ borderRadius: 0 }} onClick={() => setDraft(null)} disabled={isSaving}>
                            <X size={12} /> Cancel
                          </Button>
                          <Button size="sm" style={{ borderRadius: 0 }} onClick={saveDraft} disabled={isSaving}>
                            <FloppyDisk size={12} /> {isSaving ? 'Saving…' : 'Save Version'}
                          </Button>
                        </>
                      ) : (
                        <>
                          {selected.status === 'draft' && (
                            <Button size="sm" variant="outline" style={{ borderRadius: 0 }} onClick={submitForApproval} disabled={upsertMutation.isPending}>
                              <PaperPlaneTilt size={12} /> Submit for approval
                            </Button>
                          )}
                          <Button size="sm" style={{ borderRadius: 0 }} onClick={startEditing}>
                            <PencilSimple size={12} /> Edit
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {draft ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-[hsl(var(--text-3))] mb-1">Title *</label>
                        <Input value={draft.title} onChange={e => setDraft(d => d ? { ...d, title: e.target.value } : d)} style={{ borderRadius: 0 }} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[hsl(var(--text-3))] mb-1">Description</label>
                        <Textarea rows={2} value={draft.description} onChange={e => setDraft(d => d ? { ...d, description: e.target.value } : d)} style={{ borderRadius: 0 }} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[hsl(var(--text-3))] mb-1">Summary</label>
                        <Textarea rows={3} value={draft.summary} onChange={e => setDraft(d => d ? { ...d, summary: e.target.value } : d)} style={{ borderRadius: 0 }} placeholder="One-paragraph summary of the policy…" />
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-[hsl(var(--text-3))]">Sections</label>
                          <Button size="sm" variant="outline" style={{ borderRadius: 0 }} onClick={addSection}>
                            <Plus size={12} /> Add Section
                          </Button>
                        </div>
                        {draft.sections.length === 0 && (
                          <p className="text-xs text-[hsl(var(--text-4))]">No sections yet — add the first section of the policy text.</p>
                        )}
                        {draft.sections.map((s, i) => (
                          <div key={i} className="p-3 space-y-2" style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-[hsl(var(--text-4))]">{i + 1}.</span>
                              <Input className="flex-1" value={s.heading} placeholder="Section heading" onChange={e => setSection(i, { heading: e.target.value })} style={{ borderRadius: 0 }} />
                              <Button size="sm" variant="ghost" style={{ borderRadius: 0, color: 'hsl(var(--s-er-tx))' }} onClick={() => removeSection(i)} aria-label={`Remove section ${i + 1}`}>
                                <TrashSimple size={13} />
                              </Button>
                            </div>
                            <Textarea rows={4} value={s.text} placeholder="Section text…" onChange={e => setSection(i, { text: e.target.value })} style={{ borderRadius: 0 }} />
                          </div>
                        ))}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[hsl(var(--text-3))] mb-1">Changelog (recorded with this version)</label>
                        <Input value={draft.changelog} onChange={e => setDraft(d => d ? { ...d, changelog: e.target.value } : d)} placeholder="What changed and why…" style={{ borderRadius: 0 }} />
                        <p className="text-[10px] mt-1 text-[hsl(var(--text-4))]">
                          Saving records version {nextVersion(versions[0]?.version ?? selected.version)}{changedBy ? ` as ${changedBy}` : ''}.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selected.description && (
                        <p className="text-sm text-[hsl(var(--text-2))]">{selected.description}</p>
                      )}
                      {(!selected.content?.summary && viewSections.length === 0) ? (
                        <p className="text-sm text-center py-8 text-[hsl(var(--text-4))]">
                          No policy text recorded yet. Click Edit to draft the content.
                        </p>
                      ) : (
                        <div className="p-4 space-y-4" style={{ background: 'hsl(var(--bg-muted))' }}>
                          {selected.content?.summary && (
                            <p className="text-sm leading-relaxed text-[hsl(var(--text-2))]">{selected.content.summary}</p>
                          )}
                          {viewSections.map((s, i) => (
                            <div key={i}>
                              <p className="text-sm font-semibold text-[hsl(var(--text-1))]">{i + 1}. {s.heading}</p>
                              <p className="text-sm leading-relaxed whitespace-pre-wrap mt-1 text-[hsl(var(--text-2))]">{s.text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </>
            ) : (
              <CardContent className="p-10 text-center text-[hsl(var(--text-4))]">
                <FileText size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select a policy to view or edit</p>
              </CardContent>
            )}
          </Card>

          {/* Version history */}
          {selected && (
            <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]" style={{ borderRadius: 0 }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                  <Clock size={14} /> Version History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {versionsLoading ? (
                  <p className="text-xs py-4 text-center" style={{ color: 'hsl(var(--text-4))' }}>Loading versions…</p>
                ) : versions.length === 0 ? (
                  <p className="text-xs py-4 text-center" style={{ color: 'hsl(var(--text-4))' }}>
                    No versions recorded yet — the first save records one.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {versions.map((v, i) => (
                      <div key={v.id} className="p-3 flex items-start justify-between gap-3"
                        style={{ borderLeft: i === 0 ? '3px solid hsl(var(--brand))' : '3px solid hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold font-mono" style={{ color: i === 0 ? 'hsl(var(--brand))' : 'hsl(var(--text-1))' }}>{v.version ?? '—'}</span>
                            {i === 0 && <Badge style={{ borderRadius: 0, fontSize: 9, background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' }}>LATEST</Badge>}
                          </div>
                          {v.changelog && <p className="text-xs mt-1 text-[hsl(var(--text-2))]">{v.changelog}</p>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[10px] text-[hsl(var(--text-4))]">{v.createdAt ? new Date(v.createdAt).toLocaleDateString() : '—'}</p>
                          {v.changedBy && <p className="text-[10px] text-[hsl(var(--text-4))]">{v.changedBy}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* New Policy dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 480 }}>
          <DialogHeader>
            <DialogTitle>Create New Policy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--text-3))] mb-1">Policy Name *</label>
              <Input value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Data Governance Policy" style={{ borderRadius: 0 }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--text-3))] mb-1">Framework</label>
              <Input value={newForm.framework} onChange={e => setNewForm(f => ({ ...f, framework: e.target.value }))} placeholder="e.g. EU AI Act" style={{ borderRadius: 0 }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--text-3))] mb-1">Description</label>
              <Textarea rows={3} value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))} placeholder="Scope and purpose of the policy…" style={{ borderRadius: 0 }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => setShowNew(false)}>Cancel</Button>
            <Button style={{ borderRadius: 0 }} onClick={createPolicy} disabled={!newForm.name.trim() || isSaving}>
              {isSaving ? 'Creating…' : 'Create Policy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
