// SPDX-License-Identifier: Apache-2.0
// Policy Detail — the real `policies` row by :id (uuid or policyRef) via
// hooks/queries/usePolicies. Renders the real content sections, real version
// history from policy_versions, real approvals from the oversight queue
// (approvals table), and interlink chips to the linked controls. No mocked
// versions/approvals/audit entries.
import { useParams, useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useState } from 'react';
import {
  ArrowLeft, Warning, FileText, CheckCircle, Clock, User, CalendarBlank,
  Shield, Tag, ClockCounterClockwise, Scales, PencilSimple, FloppyDisk, X,
  ClipboardText, MagnifyingGlass,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { PageHeader } from '../../components/ui/PageHeader';
import { InterlinkChip } from '@/components/ui/InterlinkChip';
import { useSettingsStore } from '../../stores/settingsStore';
import { usePolicies, useUpsertPolicy } from '@/hooks/queries/usePolicies';
import { usePolicyVersions } from '@/hooks/useComplianceGroup';
import { useApprovals } from '@/hooks/useRiskIncidents';
import { useControls } from '@/hooks/queries/useControls';
import type { PolicyRecord } from '../../services/policyService';

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

function sectionsOf(content: any): { heading: string; text: string }[] {
  if (!content || !Array.isArray(content.sections)) return [];
  return content.sections.map((s: any) => ({
    heading: s?.heading ?? '',
    text: s?.text ?? s?.body ?? '',
  }));
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PolicyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { orgName } = useSettingsStore();

  const { data: policies = [], isLoading, error } = usePolicies();
  const upsertMutation = useUpsertPolicy();
  const { data: controls = [] } = useControls();
  const { items: allApprovals, isLoading: approvalsLoading } = useApprovals();

  // :id may be the uuid (canonical) or the business ref (display code).
  const policy = policies.find(p => p.id === id || p.policyRef === id);
  const { data: versions = [], isLoading: versionsLoading } = usePolicyVersions(policy?.id);

  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<PolicyRecord>>({});

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
  const sections = sectionsOf(policy.content);
  const policyApprovals = allApprovals.filter(a => a.entityType === 'policy' && a.entityId === policy.id);
  const linkedControlIds = policy.linkedControlIds ?? [];
  const controlFor = (cid: string) => controls.find((c: any) => c.id === cid);

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
          {['details', 'content', 'versions', 'approvals', 'controls'].map(t => (
            <TabsTrigger key={t} value={t} style={{ borderRadius: 0, textTransform: 'capitalize', fontSize: 13 }}>
              {t}
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
                      <p style={{ fontSize: 13, color: 'hsl(var(--text-2))', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{s.text}</p>
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
                versions.map((v, i) => (
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
                    <div style={{ paddingBottom: 8, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-1))' }}>{v.version ?? '—'}</span>
                        {i === 0 && (
                          <Badge style={{ background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))', border: '1px solid hsl(var(--s-ok-br))', borderRadius: 0, fontSize: 10 }}>LATEST</Badge>
                        )}
                      </div>
                      {v.changelog && <p style={{ fontSize: 12, color: 'hsl(var(--text-2))', margin: 0, lineHeight: 1.5 }}>{v.changelog}</p>}
                      <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', marginTop: 4 }}>
                        {fmt(v.createdAt)}{v.changedBy ? ` · ${v.changedBy}` : ''}
                      </p>
                    </div>
                  </div>
                ))
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
      </Tabs>

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
              <Select value={(editData.status ?? policy.status)} onValueChange={v => setEditData(prev => ({ ...prev, status: v }))}>
                <SelectTrigger style={{ width: '100%', borderRadius: 0 }}><SelectValue /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  {['published', 'in_review', 'draft', 'archived'].map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
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
