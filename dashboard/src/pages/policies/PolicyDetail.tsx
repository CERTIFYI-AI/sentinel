// SPDX-License-Identifier: Apache-2.0
// Policy Detail — the CANONICAL surface for one `policies` row (route
// /policies/:id, uuid or policyRef). Renders the real content sections
// (sanitized rich text), real version history from policy_versions with an
// LCS compare-to-previous diff and restore, real approvals from the
// oversight queue, real acknowledgment evidence from policy_acknowledgments,
// and the inbound interlink footprint (trainings, AI apps, documents,
// controls). No mocked versions/approvals/acks.
import { useParams, useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Warning, FileText, CheckCircle, Clock, User, CalendarBlank,
  Shield, Tag, ClockCounterClockwise, Scales, PencilSimple, FloppyDisk, X,
  ClipboardText, MagnifyingGlass, Plus, TrashSimple, GitDiff,
  ArrowCounterClockwise, PaperPlaneTilt,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { PageHeader } from '../../components/ui/PageHeader';
import { InterlinkChip } from '@/components/ui/InterlinkChip';
import { FormDialog, Field } from '@/components/evals/FormDialog';
import { useOrgName } from '../../hooks/useOrganization';
import { useAuthStore } from '../../stores/authStore';
import {
  usePolicies, useUpsertPolicy, useSubmitPolicyForApproval,
  usePolicyAcks, useRequestPolicyAcks, useAcknowledgePolicy, usePolicyBacklinks,
} from '@/hooks/queries/usePolicies';
import { usePolicyVersions } from '@/hooks/useComplianceGroup';
import { useApprovals } from '@/hooks/useRiskIncidents';
import { useControls } from '@/hooks/queries/useControls';
import { toast } from 'sonner';
import {
  savePolicyVersion, upsertPolicy, nextVersion,
  type PolicyRecord, type PolicyVersionRecord,
} from '../../services/policyService';
import { sectionsOf as richSectionsOf, sectionRenderHtml, contentToPlainText } from '@/lib/richtext';
import { diffLines, diffStats } from '@/lib/lineDiff';

// ── Status helpers ────────────────────────────────────────────────────────────

function policyStatusColor(status: string) {
  switch (status) {
    case 'published': return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' };
    case 'in_review': return { bg: 'hsl(var(--r-hi-bg))', text: 'hsl(var(--r-hi-tx))', border: 'hsl(var(--r-hi-br))' };
    default: return { bg: 'hsl(var(--bg-muted))', text: 'hsl(var(--text-3))', border: 'hsl(var(--border))' };
  }
}

function approvalStatusColor(status: string) {
  switch (status) {
    case 'approved': return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))', icon: CheckCircle };
    case 'rejected': return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))', icon: X };
    case 'in_review': return { bg: 'hsl(var(--r-hi-bg))', text: 'hsl(var(--r-hi-tx))', border: 'hsl(var(--r-hi-br))', icon: MagnifyingGlass };
    default: return { bg: 'hsl(var(--bg-muted))', text: 'hsl(var(--text-3))', border: 'hsl(var(--border))', icon: Clock };
  }
}

function fmt(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Parse a policy_versions.content text payload (JSON when the source was
 *  structured, bare prose otherwise) into a content object. */
function parseVersionContent(raw?: string | null): any {
  if (!raw) return { summary: '', sections: [] };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    return { summary: String(parsed ?? ''), sections: [] };
  } catch {
    return { summary: raw, sections: [] };
  }
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PolicyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const orgName = useOrgName();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data: policies = [], isLoading, error } = usePolicies();
  const upsertMutation = useUpsertPolicy();
  const submitMutation = useSubmitPolicyForApproval();
  const { data: controls = [] } = useControls();
  const { items: allApprovals, isLoading: approvalsLoading } = useApprovals();

  // :id may be the uuid (canonical) or the business ref (display code).
  const policy = policies.find(p => p.id === id || p.policyRef === id);
  const { data: versions = [], isLoading: versionsLoading } = usePolicyVersions(policy?.id);
  const { data: acks = [], isLoading: acksLoading } = usePolicyAcks(policy?.id);
  const { data: backlinks, isLoading: backlinksLoading } = usePolicyBacklinks(policy?.id);
  const requestAcks = useRequestPolicyAcks();
  const acknowledge = useAcknowledgePolicy();

  const actorName = user?.fullName ?? user?.email ?? undefined;

  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<PolicyRecord>>({});
  // Versions tab state: which version id is expanded into a compare view.
  const [compareId, setCompareId] = useState<string | null>(null);
  // Acknowledgment request dialog: a small list of people to add.
  const [ackDialogOpen, setAckDialogOpen] = useState(false);
  const [ackPeople, setAckPeople] = useState<{ name: string; email: string }[]>([{ name: '', email: '' }]);

  // Restore an old version: rewrites the policy content AND records a new
  // policy_versions row — both real writes, both surfaced on failure.
  const restoreMutation = useMutation({
    mutationFn: async (v: PolicyVersionRecord) => {
      if (!policy?.id) throw new Error('Policy not loaded');
      const content = parseVersionContent(v.content);
      const version = nextVersion(versions[0]?.version ?? policy.version);
      await upsertPolicy({ ...policy, name: policy.title, content, version });
      await savePolicyVersion(policy.id, version, content, actorName, `Restored from ${v.version ?? 'earlier version'}`);
      return version;
    },
    onSuccess: (version) => {
      qc.invalidateQueries({ queryKey: ['policies'] });
      qc.invalidateQueries({ queryKey: ['cg-policy-versions'] });
      toast.success(`Version restored — recorded as ${version}`);
    },
    onError: (e: any) => toast.error(e?.message ?? 'Restore failed'),
  });

  if (isLoading) {
    return (
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <FileText size={40} style={{ color: 'hsl(var(--text-4))', opacity: 0.5 }} />
        <p style={{ marginTop: 16, fontSize: 14, color: 'hsl(var(--text-3))' }}>Loading policy…</p>
      </div>
    );
  }

  if (error != null) {
    return (
      <div style={{ padding: 24 }}>
        <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load policies</p>
          <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <Warning size={48} style={{ color: 'hsl(var(--r-hi-tx))' }} />
        <p style={{ marginTop: 16, fontSize: 16, fontWeight: 600, color: 'hsl(var(--text-1))' }}>Policy not found</p>
        <p style={{ fontSize: 13, color: 'hsl(var(--text-3))', marginTop: 4 }}>No policy matches "{id}".</p>
        <Button style={{ marginTop: 16, borderRadius: 0 }} onClick={() => navigate('/policies')}>
          <ArrowLeft size={14} style={{ marginRight: 6 }} /> Back to Policies
        </Button>
      </div>
    );
  }

  const sc = policyStatusColor(policy.status);
  const sections = richSectionsOf(policy.content);
  const policyApprovals = allApprovals.filter(a => a.entityType === 'policy' && a.entityId === policy.id);
  const linkedControlIds = policy.linkedControlIds ?? [];
  const controlFor = (cid: string) => controls.find((c: any) => c.id === cid);

  const ackTotal = acks.length;
  const ackDone = acks.filter(a => a.status === 'acknowledged').length;
  const ackPct = ackTotal ? Math.round((ackDone / ackTotal) * 100) : null;

  return (
    <div style={{ paddingBottom: 40 }}>
      <PageHeader
        title={policy.title}
        description={`${orgName}${policy.framework ? ` · ${policy.framework}` : ''}${policy.owner ? ` · Owner: ${policy.owner}` : ''}`}
        icon={FileText}
        actions={
          <div className="flex items-center gap-2">
            {policy.policyRef && (
              <span style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-4))', fontFamily: 'monospace' }}>{policy.policyRef}</span>
            )}
            <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 10 }}>{policy.status.replace('_', ' ').toUpperCase()}</Badge>
            {policy.category && <Badge style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))', border: '1px solid hsl(var(--border))', borderRadius: 0, fontSize: 10 }}>{policy.category}</Badge>}
            {policy.version && <Badge style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))', border: '1px solid hsl(var(--border))', borderRadius: 0, fontSize: 10 }}>{policy.version}</Badge>}
            {policy.status === 'draft' && (
              <Button variant="outline" style={{ borderRadius: 0 }} disabled={submitMutation.isPending}
                onClick={() => submitMutation.mutate({ policy, requestedBy: actorName ?? null })}>
                <PaperPlaneTilt size={14} style={{ marginRight: 6 }} /> Submit for approval
              </Button>
            )}
            <Button style={{ borderRadius: 0 }} onClick={() => { setEditData({ ...policy }); setEditOpen(true); }}>
              <PencilSimple size={14} style={{ marginRight: 6 }} /> Edit Policy
            </Button>
          </div>
        }
      />

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Version', value: policy.version ?? '—', sub: 'Current version', color: 'hsl(var(--text-1))' },
          { label: 'Framework', value: policy.framework ? policy.framework.split(' ')[0] : '—', sub: policy.framework ?? 'No framework linked', color: 'hsl(var(--brand))' },
          {
            label: 'Next Review',
            value: (policy.nextReviewAt ?? policy.nextReviewDate) ? new Date(policy.nextReviewAt ?? policy.nextReviewDate!).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A',
            sub: 'Review due',
            color: (policy.nextReviewAt ?? policy.nextReviewDate) && new Date(policy.nextReviewAt ?? policy.nextReviewDate!) < new Date() ? 'hsl(var(--s-er-tx))' : 'hsl(var(--r-hi-tx))',
          },
          { label: 'Linked Controls', value: linkedControlIds.length, sub: 'Interlinked controls', color: 'hsl(var(--s-ok-tx))' },
        ].map(kpi => (
          <Card key={kpi.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
            <CardContent style={{ padding: '14px 16px' }}>
              <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', marginBottom: 4 }}>{kpi.label}</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: kpi.color, margin: 0, lineHeight: 1 }}>{kpi.value}</p>
              <p style={{ fontSize: 11, color: 'hsl(var(--text-3))', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details">
        <TabsList style={{ background: 'hsl(var(--bg-muted))', borderRadius: 0, gap: 2 }}>
          {([
            ['details', 'Details'], ['content', 'Content'], ['versions', 'Versions'],
            ['approvals', 'Approvals'], ['controls', 'Controls'],
            ['acknowledgments', 'Acknowledgments'], ['linked', 'Linked records'],
          ] as const).map(([t, label]) => (
            <TabsTrigger key={t} value={t} style={{ borderRadius: 0, fontSize: 13 }}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Details ── */}
        <TabsContent value="details" className="mt-4">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
              <CardHeader style={{ padding: '14px 16px 10px' }}>
                <CardTitle style={{ fontSize: 14, fontWeight: 600 }}>Description</CardTitle>
              </CardHeader>
              <CardContent style={{ padding: '0 16px 16px' }}>
                {policy.description ? (
                  <p style={{ fontSize: 13, color: 'hsl(var(--text-2))', lineHeight: 1.6 }}>{policy.description}</p>
                ) : (
                  <p style={{ fontSize: 12, color: 'hsl(var(--text-4))' }}>No description recorded.</p>
                )}
                {(policy.linkedFrameworks ?? []).length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-2))', marginBottom: 6 }}>Linked Frameworks</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(policy.linkedFrameworks ?? []).map(fw => (
                        <Badge key={fw} variant="outline" style={{ borderRadius: 0, fontSize: 11 }}>{fw}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {(policy.tags ?? []).length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-2))', marginBottom: 6 }}>Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(policy.tags ?? []).map(t => (
                        <span key={t} className="text-[10px] px-2 py-0.5" style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))', border: '1px solid hsl(var(--border))' }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
              <CardHeader style={{ padding: '14px 16px 10px' }}>
                <CardTitle style={{ fontSize: 14, fontWeight: 600 }}>Policy Metadata</CardTitle>
              </CardHeader>
              <CardContent style={{ padding: '0 16px 16px' }}>
                {[
                  { label: 'Category', value: policy.category ?? '—', icon: Tag },
                  { label: 'Framework', value: policy.framework ?? '—', icon: Shield },
                  { label: 'Owner', value: policy.owner ?? '—', icon: User },
                  { label: 'Approver', value: policy.approver ?? 'Pending', icon: CheckCircle },
                  { label: 'Effective', value: fmt(policy.effectiveAt ?? policy.effectiveDate), icon: CalendarBlank },
                  { label: 'Next Review', value: fmt(policy.nextReviewAt ?? policy.nextReviewDate), icon: Clock },
                  { label: 'Version', value: policy.version ?? '—', icon: ClipboardText },
                  { label: 'Status', value: policy.status.replace('_', ' '), icon: Scales },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid hsl(var(--border))' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon size={13} style={{ color: 'hsl(var(--text-4))' }} />
                      <span style={{ fontSize: 12, color: 'hsl(var(--text-3))' }}>{label}</span>
                    </div>
                    <span style={{ fontSize: 13, color: 'hsl(var(--text-1))', fontWeight: 500 }}>{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Content ── */}
        <TabsContent value="content" className="mt-4">
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
            <CardHeader style={{ padding: '14px 16px 10px' }}>
              <CardTitle style={{ fontSize: 14, fontWeight: 600 }}>Policy Text</CardTitle>
            </CardHeader>
            <CardContent style={{ padding: '0 16px 16px' }}>
              {(!policy.content?.summary && sections.length === 0) ? (
                <p style={{ fontSize: 13, color: 'hsl(var(--text-4))', textAlign: 'center', padding: '32px 0' }}>
                  No policy text recorded yet. Draft the content in the Policy Editor.
                </p>
              ) : (
                <div className="space-y-4">
                  {policy.content?.summary && (
                    <p style={{ fontSize: 13, color: 'hsl(var(--text-2))', lineHeight: 1.6 }}>{policy.content.summary}</p>
                  )}
                  {sections.map((s, i) => (
                    <div key={i}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-1))', marginBottom: 4 }}>{i + 1}. {s.heading}</p>
                      {/* sectionRenderHtml sanitizes stored html (and escapes
                          legacy plain text) before it reaches innerHTML. */}
                      <div
                        style={{ fontSize: 13, color: 'hsl(var(--text-2))', lineHeight: 1.6 }}
                        className="[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:underline [&_a]:text-[hsl(var(--brand))] [&_p]:my-1 [&_h3]:font-semibold [&_h3]:my-1"
                        dangerouslySetInnerHTML={{ __html: sectionRenderHtml(s) }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Versions ── */}
        <TabsContent value="versions" className="mt-4">
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
            <CardHeader style={{ padding: '14px 16px 10px' }}>
              <CardTitle style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ClockCounterClockwise size={15} /> Version History
              </CardTitle>
            </CardHeader>
            <CardContent style={{ padding: '0 16px 16px' }}>
              {versionsLoading ? (
                <p style={{ fontSize: 12, color: 'hsl(var(--text-4))', textAlign: 'center', padding: '24px 0' }}>Loading version history…</p>
              ) : versions.length === 0 ? (
                <p style={{ fontSize: 12, color: 'hsl(var(--text-4))', textAlign: 'center', padding: '24px 0' }}>
                  No versions recorded yet. Saving from the Policy Editor records a version.
                </p>
              ) : (
                versions.map((v, i) => {
                  const prev = versions[i + 1]; // list is newest-first
                  const comparing = compareId === v.id;
                  const diff = comparing && prev
                    ? diffLines(contentToPlainText(parseVersionContent(prev.content)), contentToPlainText(parseVersionContent(v.content)))
                    : null;
                  const stats = diff ? diffStats(diff) : null;
                  return (
                    <div key={v.id} style={{ display: 'flex', gap: 12, paddingBottom: 16 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                          background: i === 0 ? 'hsl(var(--brand))' : 'hsl(var(--bg-muted))',
                          border: `2px solid ${i === 0 ? 'hsl(var(--brand))' : 'hsl(var(--border))'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: i === 0 ? 'hsl(var(--bg-surface))' : 'hsl(var(--text-3))' }}>{v.version ?? '—'}</span>
                        </div>
                        {i < versions.length - 1 && <div style={{ width: 1, flex: 1, marginTop: 4, background: 'hsl(var(--border))' }} />}
                      </div>
                      <div style={{ paddingBottom: 8, flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-1))' }}>{v.version ?? '—'}</span>
                          {i === 0 && (
                            <Badge style={{ background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))', border: '1px solid hsl(var(--s-ok-br))', borderRadius: 0, fontSize: 10 }}>LATEST</Badge>
                          )}
                          <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                            {prev && (
                              <Button size="sm" variant="ghost" style={{ borderRadius: 0, padding: '2px 8px', fontSize: 11 }}
                                onClick={() => setCompareId(comparing ? null : (v.id ?? null))}>
                                <GitDiff size={12} /> {comparing ? 'Hide diff' : 'Compare to previous'}
                              </Button>
                            )}
                            {i !== 0 && (
                              <Button size="sm" variant="ghost" style={{ borderRadius: 0, padding: '2px 8px', fontSize: 11 }}
                                disabled={restoreMutation.isPending}
                                onClick={() => restoreMutation.mutate(v)}>
                                <ArrowCounterClockwise size={12} /> {restoreMutation.isPending ? 'Restoring…' : 'Restore this version'}
                              </Button>
                            )}
                          </span>
                        </div>
                        {v.changelog && <p style={{ fontSize: 12, color: 'hsl(var(--text-2))', margin: 0, lineHeight: 1.5 }}>{v.changelog}</p>}
                        <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', marginTop: 4 }}>
                          {fmt(v.createdAt)}{v.changedBy ? ` · ${v.changedBy}` : ''}
                        </p>
                        {diff && stats && (
                          <div style={{ marginTop: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}>
                            <div style={{ padding: '6px 10px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span style={{ fontSize: 11, color: 'hsl(var(--text-3))' }}>{prev!.version ?? '—'} → {v.version ?? '—'}</span>
                              <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'hsl(var(--s-ok-tx))' }}>+{stats.added}</span>
                              <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'hsl(var(--s-er-tx))' }}>−{stats.removed}</span>
                            </div>
                            <div style={{ maxHeight: 280, overflowY: 'auto', padding: '6px 0' }}>
                              {stats.added === 0 && stats.removed === 0 ? (
                                <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', padding: '4px 10px', margin: 0 }}>
                                  No text changes between these versions.
                                </p>
                              ) : diff.map((l, li) => (
                                <pre key={li} style={{
                                  margin: 0, padding: '1px 10px', fontSize: 11, lineHeight: 1.6,
                                  whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace',
                                  background: l.type === 'added' ? 'hsl(var(--s-ok-bg))' : l.type === 'removed' ? 'hsl(var(--s-er-bg))' : 'transparent',
                                  color: l.type === 'added' ? 'hsl(var(--s-ok-tx))' : l.type === 'removed' ? 'hsl(var(--s-er-tx))' : 'hsl(var(--text-3))',
                                }}>{l.type === 'added' ? '+ ' : l.type === 'removed' ? '− ' : '  '}{l.text}</pre>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Approvals — real oversight queue rows ── */}
        <TabsContent value="approvals" className="mt-4">
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
            <CardHeader style={{ padding: '14px 16px 10px' }}>
              <CardTitle style={{ fontSize: 14, fontWeight: 600 }}>Approval Requests</CardTitle>
            </CardHeader>
            <CardContent style={{ padding: '0 16px 16px' }}>
              {approvalsLoading ? (
                <p style={{ fontSize: 12, color: 'hsl(var(--text-4))', textAlign: 'center', padding: '24px 0' }}>Loading approvals…</p>
              ) : policyApprovals.length === 0 ? (
                <p style={{ fontSize: 12, color: 'hsl(var(--text-4))', textAlign: 'center', padding: '24px 0' }}>
                  No approval requests for this policy yet. Submit it for approval from the Policies page or Policy Editor.
                </p>
              ) : (
                policyApprovals.map((appr, i) => {
                  const ac = approvalStatusColor(appr.status);
                  const AIcon = ac.icon;
                  return (
                    <div key={appr.id ?? i} style={{ display: 'flex', gap: 12, paddingBottom: 16 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: ac.bg, border: `2px solid ${ac.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <AIcon size={14} style={{ color: ac.text }} />
                        </div>
                        {i < policyApprovals.length - 1 && <div style={{ width: 1, flex: 1, marginTop: 4, background: 'hsl(var(--border))' }} />}
                      </div>
                      <div style={{ flex: 1, paddingBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-1))', margin: 0 }}>
                              {(appr.requestedAction ?? 'approval').replace(/_/g, ' ')}
                            </p>
                            <p style={{ fontSize: 11, color: 'hsl(var(--text-3))', margin: '2px 0 0 0' }}>
                              Requested{appr.requestedBy ? ` by ${appr.requestedBy}` : ''} · {fmt(appr.createdAt)}
                            </p>
                          </div>
                          <Badge style={{ background: ac.bg, color: ac.text, border: `1px solid ${ac.border}`, borderRadius: 0, fontSize: 10 }}>{appr.status.replace('_', ' ')}</Badge>
                        </div>
                        {appr.reason && <p style={{ fontSize: 12, color: 'hsl(var(--text-2))', margin: '6px 0 0 0', fontStyle: 'italic' }}>"{appr.reason}"</p>}
                        {appr.decidedAt && (
                          <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', margin: '4px 0 0 0' }}>
                            Decided {fmt(appr.decidedAt)}{appr.approver ? ` by ${appr.approver}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Controls — real interlinks via linkedControlIds ── */}
        <TabsContent value="controls" className="mt-4">
          {linkedControlIds.length === 0 ? (
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
              <CardContent style={{ padding: 40, textAlign: 'center' }}>
                <Shield size={40} style={{ color: 'hsl(var(--text-4))', opacity: 0.4, margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14, color: 'hsl(var(--text-3))' }}>No controls linked to this policy yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {linkedControlIds.map(cid => {
                const ctrl = controlFor(cid);
                return (
                  <Card key={cid} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <CardContent style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'hsl(var(--text-4))' }}>{ctrl?.controlRef ?? ctrl?.controlCode ?? ''}</span>
                            {ctrl?.clauseRef && <Badge style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))', border: '1px solid hsl(var(--border))', borderRadius: 0, fontSize: 10 }}>{ctrl.clauseRef}</Badge>}
                            {ctrl?.status && <Badge variant="outline" style={{ borderRadius: 0, fontSize: 10 }}>{ctrl.status}</Badge>}
                          </div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-1))', margin: 0 }}>
                            {ctrl?.name || ctrl?.title || 'Unavailable'}
                          </p>
                          {ctrl?.description && <p style={{ fontSize: 12, color: 'hsl(var(--text-2))', marginTop: 3 }}>{ctrl.description}</p>}
                        </div>
                        <InterlinkChip label={ctrl?.controlRef || ctrl?.name || 'Unavailable'} to={`/compliance/controls?open=${cid}`} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Acknowledgments — real policy_acknowledgments rows ── */}
        <TabsContent value="acknowledgments" className="mt-4">
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
            <CardHeader style={{ padding: '14px 16px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <CardTitle style={{ fontSize: 14, fontWeight: 600 }}>Acknowledgments</CardTitle>
                <Button size="sm" style={{ borderRadius: 0 }}
                  onClick={() => { setAckPeople([{ name: '', email: '' }]); setAckDialogOpen(true); }}>
                  <Plus size={13} /> Request acknowledgment
                </Button>
              </div>
              {ackPct != null && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'hsl(var(--text-3))' }}>{ackDone} of {ackTotal} acknowledged</span>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'hsl(var(--text-2))' }}>{ackPct}%</span>
                  </div>
                  <div style={{ height: 6, background: 'hsl(var(--bg-muted))' }}>
                    <div style={{ height: 6, width: `${ackPct}%`, background: 'hsl(var(--s-ok-tx))' }} />
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent style={{ padding: '0 16px 16px' }}>
              {acksLoading ? (
                <p style={{ fontSize: 12, color: 'hsl(var(--text-4))', textAlign: 'center', padding: '24px 0' }}>Loading acknowledgments…</p>
              ) : acks.length === 0 ? (
                <p style={{ fontSize: 12, color: 'hsl(var(--text-4))', textAlign: 'center', padding: '24px 0' }}>
                  No acknowledgments requested yet. Request them here, or link a training to this policy — attendee completions sync in automatically.
                </p>
              ) : (
                <div style={{ border: '1px solid hsl(var(--border))' }}>
                  {acks.map((a, i) => (
                    <div key={a.id ?? i} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                      borderTop: i === 0 ? 'none' : '1px solid hsl(var(--border))',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--text-1))', margin: 0 }}>{a.personName}</p>
                        <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', margin: '2px 0 0 0' }}>
                          {a.personEmail ?? '—'} · v{(a.policyVersion ?? '—').replace(/^v/i, '')} · {a.source === 'training' ? 'via training' : 'manual'}
                          {a.acknowledgedAt ? ` · acknowledged ${fmt(a.acknowledgedAt)}` : ''}
                        </p>
                      </div>
                      {a.source === 'training' && a.trainingId && (
                        <InterlinkChip label="Training" to="/ai-literacy" />
                      )}
                      <Badge style={{
                        borderRadius: 0, fontSize: 10,
                        background: a.status === 'acknowledged' ? 'hsl(var(--s-ok-bg))' : a.status === 'declined' ? 'hsl(var(--s-er-bg))' : 'hsl(var(--s-wn-bg))',
                        color: a.status === 'acknowledged' ? 'hsl(var(--s-ok-tx))' : a.status === 'declined' ? 'hsl(var(--s-er-tx))' : 'hsl(var(--s-wn-tx))',
                        border: `1px solid ${a.status === 'acknowledged' ? 'hsl(var(--s-ok-br))' : a.status === 'declined' ? 'hsl(var(--s-er-br))' : 'hsl(var(--s-wn-br))'}`,
                      }}>{a.status}</Badge>
                      {a.status === 'pending' && a.id && (
                        <Button size="sm" variant="outline" style={{ borderRadius: 0, fontSize: 11, padding: '2px 8px' }}
                          disabled={acknowledge.isPending}
                          onClick={() => acknowledge.mutate({ ackId: a.id!, byName: actorName, policyId: policy.id! })}>
                          <CheckCircle size={12} /> Acknowledge
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Linked records — inbound interlinks resolved by id ── */}
        <TabsContent value="linked" className="mt-4">
          {backlinksLoading ? (
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
              <CardContent style={{ padding: 24, textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: 'hsl(var(--text-4))' }}>Loading linked records…</p>
              </CardContent>
            </Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {([
                { key: 'trainings', title: 'Trainings governed by this policy', source: backlinks?.trainings, to: () => '/ai-literacy', empty: 'No trainings link to this policy yet.' },
                { key: 'aiApps', title: 'AI apps governed by this policy', source: backlinks?.aiApps, to: () => '/ai-apps', empty: 'No AI apps link to this policy yet.' },
                { key: 'documents', title: 'Documents referencing this policy', source: backlinks?.documents, to: (bid: string) => `/documents?open=${bid}`, empty: 'No documents reference this policy yet.' },
                { key: 'controls', title: 'Controls citing this policy', source: backlinks?.controls, to: (bid: string) => `/compliance/controls?open=${bid}`, empty: 'No controls cite this policy yet.' },
              ] as const).map(({ key, title, source, to, empty }) => (
                <Card key={key} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                  <CardHeader style={{ padding: '14px 16px 8px' }}>
                    <CardTitle style={{ fontSize: 13, fontWeight: 600 }}>
                      {title}{source?.count != null ? ` (${source.count})` : ''}
                    </CardTitle>
                  </CardHeader>
                  <CardContent style={{ padding: '0 16px 14px' }}>
                    {source?.count == null ? (
                      <p style={{ fontSize: 12, color: 'hsl(var(--text-4))', margin: 0 }}>Unavailable</p>
                    ) : source.items.length === 0 ? (
                      <p style={{ fontSize: 12, color: 'hsl(var(--text-4))', margin: 0 }}>{empty}</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {source.items.map(item => (
                          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                            <InterlinkChip label={item.ref ?? item.title ?? 'Unavailable'} to={to(item.id)} />
                            <span style={{ fontSize: 12, color: 'hsl(var(--text-2))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                            {item.status && (
                              <Badge variant="outline" style={{ borderRadius: 0, fontSize: 10, marginLeft: 'auto', flexShrink: 0 }}>
                                {item.status.replace(/_/g, ' ')}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Request-acknowledgment dialog — bulk-adds pending rows */}
      <FormDialog
        open={ackDialogOpen}
        onOpenChange={setAckDialogOpen}
        title="Request acknowledgment"
        description={`People added here get a pending acknowledgment for ${policy.title}${policy.version ? ` (version ${policy.version})` : ''}.`}
        submitLabel="Request"
        busy={requestAcks.isPending}
        disabled={!ackPeople.some(p => p.name.trim())}
        onSubmit={() => {
          requestAcks.mutate(
            {
              policyId: policy.id!,
              version: policy.version ?? null,
              people: ackPeople.filter(p => p.name.trim()).map(p => ({ name: p.name, email: p.email || undefined })),
            },
            { onSuccess: () => setAckDialogOpen(false) }, // closes only on success
          );
        }}
      >
        {ackPeople.map((p, i) => (
          <div key={i} className="flex items-end gap-2">
            <div className="flex-1">
              <Field label={i === 0 ? 'Name' : ''} required={i === 0}>
                <Input value={p.name} placeholder="Full name"
                  onChange={e => setAckPeople(list => list.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
              </Field>
            </div>
            <div className="flex-1">
              <Field label={i === 0 ? 'Email (optional)' : ''}>
                <Input type="email" value={p.email} placeholder="name@example.com"
                  onChange={e => setAckPeople(list => list.map((x, j) => j === i ? { ...x, email: e.target.value } : x))} />
              </Field>
            </div>
            <Button type="button" size="sm" variant="ghost" style={{ borderRadius: 0, color: 'hsl(var(--s-er-tx))' }}
              disabled={ackPeople.length === 1}
              aria-label={`Remove person ${i + 1}`}
              onClick={() => setAckPeople(list => list.filter((_, j) => j !== i))}>
              <TrashSimple size={13} />
            </Button>
          </div>
        ))}
        <Button type="button" size="sm" variant="outline" style={{ borderRadius: 0 }}
          onClick={() => setAckPeople(list => [...list, { name: '', email: '' }])}>
          <Plus size={12} /> Add person
        </Button>
      </FormDialog>

      {/* Edit Dialog — real upsert; closes only on success */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: 15, fontWeight: 600 }}>Edit Policy{policy.policyRef ? ` — ${policy.policyRef}` : ''}</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
            {([
              { label: 'Title', key: 'title' },
              { label: 'Owner', key: 'owner' },
              { label: 'Version', key: 'version' },
              { label: 'Approver', key: 'approver' },
            ] as { label: string; key: keyof PolicyRecord }[]).map(({ label, key }) => (
              <div key={key as string}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--text-2))', display: 'block', marginBottom: 4 }}>{label}</label>
                <input
                  type="text"
                  value={((editData[key] ?? policy[key]) as string) ?? ''}
                  onChange={e => setEditData(prev => ({ ...prev, [key]: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13, background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', borderRadius: 0, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            ))}
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--text-2))', display: 'block', marginBottom: 4 }}>Status</label>
              {/* Publication happens only through the approval queue — the
                  status field can't jump straight to 'published' (it stays
                  selectable only if the policy already is published). */}
              <Select value={(editData.status ?? policy.status)} onValueChange={v => setEditData(prev => ({ ...prev, status: v }))}>
                <SelectTrigger style={{ width: '100%', borderRadius: 0 }}><SelectValue /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  {(policy.status === 'published' ? ['published', 'in_review', 'draft', 'archived'] : ['in_review', 'draft', 'archived'])
                    .map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--text-2))', display: 'block', marginBottom: 4 }}>Description</label>
              <textarea
                rows={3}
                value={(editData.description ?? policy.description) ?? ''}
                onChange={e => setEditData(prev => ({ ...prev, description: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', fontSize: 13, background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', borderRadius: 0, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => setEditOpen(false)}>
              <X size={13} style={{ marginRight: 4 }} /> Cancel
            </Button>
            <Button style={{ borderRadius: 0 }} disabled={upsertMutation.isPending} onClick={async () => {
              const updated: PolicyRecord = { ...policy, ...editData, title: (editData.title ?? policy.title) as string };
              updated.name = updated.title;
              try {
                await upsertMutation.mutateAsync(updated); // hook toasts; throws on failure
                setEditOpen(false); // closes only on success
              } catch { /* hook surfaces the error toast; dialog stays open */ }
            }}>
              <FloppyDisk size={13} style={{ marginRight: 4 }} /> {upsertMutation.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
