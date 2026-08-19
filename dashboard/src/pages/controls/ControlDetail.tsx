// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Control Detail — the canonical /compliance/controls/:id page over the real
// org-scoped `controls` row (uuid id), its real `control_tests` history and
// its real interlinks (linked_model_ids → ai_models, linked_risk_ids →
// /risks?open=, linked_policy_ids → /policies?open=). No mock history, no
// fabricated evidence: what has not been recorded renders as an honest
// empty state.
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  ArrowLeft, Warning, CheckCircle, XCircle, Clock, Shield,
  FileText, User, CalendarBlank, Link as LinkIcon, Paperclip,
} from '@phosphor-icons/react';
import { InterlinkChip } from '../../components/ui/InterlinkChip';
import { PageSkeleton } from '../../components/ui/PageSkeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { useControls } from '../../hooks/queries/useControls';
import { useControlTests } from '../../hooks/useComplianceGroup';
import { useControlAssurance, type AssuranceSource } from '../../hooks/useControlAssurance';
import { useControlCatalogEntry } from '../../hooks/useFrameworkCatalog';
import { useControlEvidence } from '@/hooks/useIntegrationCatalog';
import { rankFindings, countByStatus, evidencePosture } from '@/services/integrationFindingsService';
import { useModelsData } from '../../hooks/useModelsData';
import { useRisksData } from '../../hooks/useRisksData';
import { usePolicies } from '../../hooks/queries/usePolicies';
import { useOrgName } from '../../hooks/useOrganization';
import type { ControlRecord } from '../../services/controlService';

const formatDate = (d?: string | null) => {
  if (!d) return '—';
  const date = new Date(d);
  return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const prettyStatus = (s?: string | null) => {
  const raw = (s || '').toLowerCase();
  if (!raw) return '—';
  return raw.charAt(0).toUpperCase() + raw.slice(1).replace(/_/g, ' ');
};

const displayRef = (c: ControlRecord) => c.controlRef || (c.id ? `${c.id.slice(0, 8)}…` : '—');

/**
 * One assurance source card: the count of records citing this control, up to
 * 3 of them with resolved titles deep-linking into their module. A failed
 * query shows "Unavailable" (never a fake 0); an empty source says honestly
 * that nothing cites the control yet.
 */
function AssuranceSourceCard({
  title, source, loading, linkTo, emptyText,
}: {
  title: string;
  source: AssuranceSource | undefined;
  loading: boolean;
  /** Builds the deep link for one item; null renders the item unlinked. */
  linkTo: ((id: string) => string) | null;
  emptyText: string;
}) {
  const count = source?.count ?? null;
  return (
    <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center justify-between" style={{ color: 'hsl(var(--text-1))' }}>
          <span>{title}</span>
          <span className="text-xs font-normal" style={{ color: 'hsl(var(--text-3))' }}>
            {loading ? '…' : count == null ? 'Unavailable' : count}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="animate-pulse space-y-2" aria-busy="true">
            {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-5 bg-[hsl(var(--bg-sunken))]" />)}
          </div>
        ) : count == null ? (
          <p className="text-xs py-2" style={{ color: 'hsl(var(--text-4))' }}>
            This source could not be queried — its records may exist but are not visible right now.
          </p>
        ) : count === 0 ? (
          <p className="text-xs py-2" style={{ color: 'hsl(var(--text-4))' }}>{emptyText}</p>
        ) : (
          <div className="space-y-1.5">
            {(source?.items ?? []).map((item) => {
              const label = item.ref ? `${item.ref} — ${item.title}` : item.title;
              const meta = [item.note, item.status].filter(Boolean).join(' · ');
              return (
                <div key={item.id} className="flex items-center gap-2 min-w-0">
                  {linkTo
                    ? <InterlinkChip label={label} to={linkTo(item.id)} />
                    : <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-2))' }}>{label}</span>}
                  {meta && <span className="text-[10px] truncate" style={{ color: 'hsl(var(--text-4))' }}>{meta}</span>}
                </div>
              );
            })}
            {count > (source?.items.length ?? 0) && (
              <p className="text-[10px] pt-1" style={{ color: 'hsl(var(--text-4))' }}>
                Showing {source?.items.length} of {count}.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScoreCircle({ score, size = 100 }: { score: number; size?: number }) {
  const color = score >= 85 ? 'hsl(var(--s-ok-tx))' : score >= 65 ? 'hsl(var(--r-hi-tx))' : 'hsl(var(--s-er-tx))';
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `${color}15`, border: `4px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
      <span style={{ fontSize: size * 0.28, fontWeight: 700, color }}>{score}</span>
      <span style={{ fontSize: size * 0.14, color, opacity: 0.7 }}>/ 100</span>
    </div>
  );
}

export default function ControlDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const orgName = useOrgName();

  const controlsQuery = useControls();
  const testsQuery = useControlTests(id);
  const assuranceQuery = useControlAssurance(id);
  // Automated evidence collected by connected integrations, mapped to this
  // control server-side. Kept separate from controls.status: a machine finding
  // is a signal about the control, not the owner's assertion about it.
  const evidenceQuery = useControlEvidence(id ?? null);
  const { models } = useModelsData();
  const { risks } = useRisksData();
  const policiesQuery = usePolicies();

  // Resolve the control up front (undefined while loading) so the catalog
  // backlink hook is called unconditionally, in stable order.
  const control = (controlsQuery.data ?? []).find((c) => c.id === id);
  // Reverse interlink: the published catalog entry (framework_controls) this
  // org control satisfies, and its owning framework — for the deep link back.
  const catalogEntry = useControlCatalogEntry(
    control ? { framework: control.framework, frameworkId: control.frameworkId, clauseRef: control.clauseRef } : null,
  );

  // Interlink labels resolve to display names at render time — never a raw
  // uuid; an unresolvable id shows "Unavailable".
  const modelName = (mid: string) => models.find((m) => m.id === mid)?.name ?? 'Unavailable';
  const riskName = (rid: string) => {
    const r = risks.find((x) => x.id === rid);
    return r ? (r.risk_id ? `${r.risk_id} — ${r.title}` : r.title) : 'Unavailable';
  };
  const policyName = (pid: string) =>
    (policiesQuery.data ?? []).find((p) => p.id === pid)?.title ?? 'Unavailable';

  if (controlsQuery.isLoading) return <PageSkeleton title="Control" showStats={false} rows={5} />;

  if (controlsQuery.isError) {
    return (
      <div className="p-6 flex flex-col items-center justify-center" style={{ minHeight: 400 }}>
        <Warning size={48} style={{ color: 'hsl(var(--s-er-tx))' }} />
        <p className="mt-4 text-lg font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Failed to load controls</p>
        <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>{(controlsQuery.error as Error).message}</p>
        <Button className="mt-4" onClick={() => controlsQuery.refetch()} style={{ borderRadius: 0 }}>Retry</Button>
      </div>
    );
  }

  if (!control) {
    return (
      <div className="p-6 flex flex-col items-center justify-center" style={{ minHeight: 400 }}>
        <Warning size={48} style={{ color: 'hsl(var(--r-hi-tx))' }} />
        <p className="mt-4 text-lg font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Control not found</p>
        <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
          No control with this id exists in your organization's library.
        </p>
        <Button className="mt-4" onClick={() => navigate('/compliance/controls')} style={{ borderRadius: 0 }}>
          <ArrowLeft size={14} /> Back to Controls
        </Button>
      </div>
    );
  }

  const status = (control.implementationStatus || control.status || '').toLowerCase();
  const statusTone = ['implemented', 'effective'].includes(status)
    ? { bg: 'hsl(var(--s-ok-bg))', tx: 'hsl(var(--s-ok-tx))' }
    : ['in_progress', 'partially_implemented'].includes(status)
      ? { bg: 'hsl(var(--s-wn-bg))', tx: 'hsl(var(--s-wn-tx))' }
      : { bg: 'hsl(var(--s-er-bg))', tx: 'hsl(var(--s-er-tx))' };
  const testResult = (control.testResult ?? '').toLowerCase();
  const trColor = testResult === 'pass' ? 'hsl(var(--s-ok-tx))' : testResult === 'fail' ? 'hsl(var(--s-er-tx))' : 'hsl(var(--r-hi-tx))';
  const score = control.effectivenessScore ?? control.score ?? null;

  const linkedModels = control.linkedModelIds ?? [];
  const linkedRisks = control.linkedRiskIds ?? [];
  const linkedPolicies = control.linkedPolicyIds ?? [];
  const tests = testsQuery.items;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={control.name || control.title || 'Untitled control'}
        subtitle={`${orgName} · ${control.framework || 'No framework'} · ${control.clauseRef || 'No clause'} · Ref: ${displayRef(control)}`}
        onBack={() => navigate('/compliance/controls')}
        actions={
          <div className="flex gap-2 items-center">
            <Badge style={{ background: statusTone.bg, color: statusTone.tx, borderRadius: 0 }}>
              {prettyStatus(status)}
            </Badge>
            {testResult ? (
              <Badge style={{ background: `${trColor}20`, color: trColor, border: `1px solid ${trColor}`, borderRadius: 0 }}>
                {testResult === 'pass' ? <CheckCircle size={11} style={{ display: 'inline', marginRight: 3 }} /> : testResult === 'fail' ? <XCircle size={11} style={{ display: 'inline', marginRight: 3 }} /> : <Clock size={11} style={{ display: 'inline', marginRight: 3 }} />}
                {testResult.toUpperCase()}
              </Badge>
            ) : (
              <Badge variant="outline" style={{ borderRadius: 0 }}>Never tested</Badge>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
          <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
          <TabsTrigger value="testing" style={{ borderRadius: 0 }}>Test History ({tests.length})</TabsTrigger>
          <TabsTrigger value="evidence" style={{ borderRadius: 0 }}>Automated Evidence ({evidenceQuery.data.length})</TabsTrigger>
          <TabsTrigger value="interlinks" style={{ borderRadius: 0 }}>Interlinks</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Effectiveness</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center py-4">
                {score != null ? (
                  <>
                    <ScoreCircle score={Math.round(Number(score))} />
                    <p className="text-xs mt-4 text-center" style={{ color: 'hsl(var(--text-3))' }}>
                      {score >= 85 ? 'Operating effectively' : score >= 65 ? 'Partially effective — improvements needed' : 'Ineffective — remediation required'}
                    </p>
                  </>
                ) : (
                  <p className="text-xs py-8 text-center" style={{ color: 'hsl(var(--text-4))' }}>
                    Not scored yet — an effectiveness score appears once the control is measured.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', gridColumn: '2 / 4' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Control Details</CardTitle>
              </CardHeader>
              <CardContent>
                {control.description && <p className="text-sm mb-4" style={{ color: 'hsl(var(--text-2))' }}>{control.description}</p>}
                <div className="grid grid-cols-2 gap-x-8">
                  {[
                    { label: 'Reference', value: displayRef(control), icon: Shield },
                    { label: 'Framework', value: control.framework || '—', icon: FileText },
                    { label: 'Clause', value: control.clauseRef || '—', icon: LinkIcon },
                    { label: 'Owner', value: control.owner || '—', icon: User },
                    { label: 'Last Tested', value: formatDate(control.lastTestedAt), icon: CalendarBlank },
                    { label: 'Next Test Due', value: formatDate(control.nextTestAt), icon: CalendarBlank },
                    { label: 'Evidence Count', value: control.evidenceCount == null ? '—' : String(control.evidenceCount), icon: Paperclip },
                    { label: 'Category', value: control.category || '—', icon: FileText },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center gap-2 py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <r.icon size={14} style={{ color: 'hsl(var(--text-3))', flexShrink: 0 }} />
                      <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                      <span className="text-xs font-medium ml-auto" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Assurance — every record across the platform that cites this
              control as the thing it evidences: Evidence Vault entries,
              supply-chain attestations, vendor documents and legacy
              control_evidence rows. This is the inbound half of the
              evidence→control edge the Evidence Vault already draws. */}
          <div className="mt-4">
            <h2 className="text-sm font-semibold mb-2" style={{ color: 'hsl(var(--text-1))' }}>Assurance</h2>
            <p className="text-xs mb-3" style={{ color: 'hsl(var(--text-3))' }}>
              Records elsewhere in the platform that cite this control. Each source is counted independently — a source that cannot be queried says so rather than showing zero.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AssuranceSourceCard
                title="Evidence Vault"
                source={assuranceQuery.data?.evidence}
                loading={assuranceQuery.isLoading}
                linkTo={(eid) => `/evidence-vault?open=${eid}`}
                emptyText="No evidence cites this control."
              />
              <AssuranceSourceCard
                title="Supply Chain Attestations"
                source={assuranceQuery.data?.attestations}
                loading={assuranceQuery.isLoading}
                linkTo={(aid) => `/supply-chain?open=${aid}`}
                emptyText="No attestation cites this control."
              />
              <AssuranceSourceCard
                title="Vendor Documents"
                source={assuranceQuery.data?.vendorDocuments}
                loading={assuranceQuery.isLoading}
                linkTo={(did) => `/vendor-upload?open=${did}`}
                emptyText="No vendor document cites this control."
              />
              <AssuranceSourceCard
                title="Legacy Control Evidence"
                source={assuranceQuery.data?.controlEvidence}
                loading={assuranceQuery.isLoading}
                linkTo={null}
                emptyText="No legacy control_evidence rows cite this control."
              />
            </div>
          </div>
        </TabsContent>

        {/* Test History — real control_tests rows */}
        <TabsContent value="testing" className="mt-4">
          {testsQuery.isLoading ? (
            <div className="animate-pulse space-y-2" aria-busy="true">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-[hsl(var(--bg-sunken))]" />)}
            </div>
          ) : testsQuery.error ? (
            <p className="text-sm py-6" style={{ color: 'hsl(var(--s-er-tx))' }}>
              Failed to load test history: {(testsQuery.error as Error).message}
            </p>
          ) : tests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border border-dashed" style={{ borderColor: 'hsl(var(--border))' }}>
              <Clock size={30} style={{ color: 'hsl(var(--text-4))' }} />
              <p className="mt-3 text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>No tests recorded for this control yet</p>
              <Button size="sm" className="mt-4" style={{ borderRadius: 0 }} onClick={() => navigate('/control-testing')}>
                Record a test in Control Testing
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {tests.map((test) => {
                const color = test.result === 'pass' ? 'hsl(var(--s-ok-tx))' : test.result === 'fail' ? 'hsl(var(--s-er-tx))' : 'hsl(var(--s-wn-tx))';
                return (
                  <Card key={test.id} style={{ background: 'hsl(var(--bg-surface))', border: `1px solid ${color}40` }}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                            {formatDate(test.testedAt)}{test.tester ? ` · ${test.tester}` : ''}
                          </p>
                          {test.notes && <p className="text-sm mt-1.5" style={{ color: 'hsl(var(--text-2))' }}>{test.notes}</p>}
                        </div>
                        <Badge style={{ background: `${color}20`, color, border: `1px solid ${color}`, borderRadius: 0, fontSize: 11 }}>
                          {test.result === 'pass' ? <CheckCircle size={11} style={{ display: 'inline', marginRight: 3 }} /> : test.result === 'fail' ? <XCircle size={11} style={{ display: 'inline', marginRight: 3 }} /> : <Clock size={11} style={{ display: 'inline', marginRight: 3 }} />}
                          {test.result.toUpperCase()}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Interlinks — the control's place in the platform graph */}
        <TabsContent value="evidence" className="mt-4">
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                Automated evidence
              </CardTitle>
            </CardHeader>
            <CardContent>
              {evidenceQuery.isLoading ? (
                <div className="space-y-2 animate-pulse" aria-busy="true">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-12" style={{ background: 'hsl(var(--bg-sunken))' }} />
                  ))}
                </div>
              ) : evidenceQuery.isError ? (
                <p className="text-xs py-2" style={{ color: 'hsl(var(--s-er-tx))' }}>
                  Could not load automated evidence: {evidenceQuery.error?.message}
                </p>
              ) : evidenceQuery.data.length === 0 ? (
                <div className="py-3">
                  <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                    No automated evidence has been collected for this control yet. Connect an
                    evidence source in Integrations, or attach evidence manually in the vault.
                  </p>
                  <InterlinkChip label="Integrations" to="/integrations" />
                </div>
              ) : (
                <>
                  {(() => {
                    const counts = countByStatus(evidenceQuery.data);
                    const posture = evidencePosture(evidenceQuery.data);
                    return (
                      <p className="text-xs mb-3" style={{ color: 'hsl(var(--text-3))' }}>
                        {/* Null posture renders an em dash, never a verdict. */}
                        Posture: <strong>{posture ?? '—'}</strong> · {counts.PASSED} passed ·{' '}
                        {counts.FAILED} failed · {counts.WARNING} warning
                      </p>
                    );
                  })()}
                  <div className="space-y-2">
                    {rankFindings(evidenceQuery.data).map((f) => (
                      <div
                        key={f.id}
                        className="border p-2.5"
                        style={{ borderColor: 'hsl(var(--border))' }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[13px] font-medium" style={{ color: 'hsl(var(--text-1))' }}>
                            {f.title}
                          </span>
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 uppercase tracking-wider flex-shrink-0"
                            style={{
                              color:
                                f.status === 'FAILED'
                                  ? 'hsl(var(--s-er-tx))'
                                  : f.status === 'WARNING'
                                  ? 'hsl(var(--s-wa-tx))'
                                  : f.status === 'PASSED'
                                  ? 'hsl(var(--s-ok-tx))'
                                  : 'hsl(var(--text-4))',
                            }}
                          >
                            {f.status}
                          </span>
                        </div>
                        <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-3))' }}>
                          {f.description}
                        </p>
                        {f.status !== 'PASSED' && f.remediation && (
                          <p className="text-xs mt-1.5" style={{ color: 'hsl(var(--text-2))' }}>
                            <strong>Remediation:</strong> {f.remediation}
                          </p>
                        )}
                        <p className="text-[10px] font-mono mt-1.5" style={{ color: 'hsl(var(--text-4))' }}>
                          {f.checkId} · {f.checkCategory} · {f.severity}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interlinks" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Linked Models ({linkedModels.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {linkedModels.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {linkedModels.map((mid) => (
                      <InterlinkChip key={mid} label={modelName(mid)} to={`/models/inventory/${mid}`} />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs py-2" style={{ color: 'hsl(var(--text-4))' }}>No models linked to this control yet.</p>
                )}
              </CardContent>
            </Card>
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Linked Risks ({linkedRisks.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {linkedRisks.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {linkedRisks.map((rid) => (
                      <InterlinkChip key={rid} label={riskName(rid)} to={`/risks?open=${rid}`} />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs py-2" style={{ color: 'hsl(var(--text-4))' }}>No risks linked to this control yet.</p>
                )}
              </CardContent>
            </Card>
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Linked Policies ({linkedPolicies.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {linkedPolicies.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {linkedPolicies.map((pid) => (
                      <InterlinkChip key={pid} label={policyName(pid)} to={`/policies?open=${pid}`} />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs py-2" style={{ color: 'hsl(var(--text-4))' }}>No policies linked to this control yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Reverse link into the framework catalog: which published control
                (framework_controls) this org control satisfies, and a deep link
                to that framework's detail (/frameworks?open=<framework_id>). */}
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Framework Catalog</CardTitle>
              </CardHeader>
              <CardContent>
                {catalogEntry.isLoading ? (
                  <div className="animate-pulse space-y-2" aria-busy="true">
                    {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-5" style={{ background: 'hsl(var(--bg-sunken))' }} />)}
                  </div>
                ) : catalogEntry.isError || catalogEntry.data?.available === false ? (
                  <p className="text-xs py-2" style={{ color: 'hsl(var(--text-4))' }}>
                    Catalog could not be queried — the published requirement may exist but is not visible right now.
                  </p>
                ) : !catalogEntry.data?.frameworkId ? (
                  <p className="text-xs py-2" style={{ color: 'hsl(var(--text-4))' }}>
                    This control is not resolvable to a catalogued framework yet.
                  </p>
                ) : catalogEntry.data.matches.length > 0 ? (
                  <div className="space-y-1.5">
                    {catalogEntry.data.matches.map((m) => (
                      <InterlinkChip
                        key={m.id}
                        label={`${m.controlRef} — ${m.title}`}
                        to={`/frameworks?open=${catalogEntry.data!.frameworkId}`}
                      />
                    ))}
                    <p className="text-[10px] pt-0.5" style={{ color: 'hsl(var(--text-4))' }}>
                      Published requirement in {catalogEntry.data.frameworkName || 'the framework'}.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                      No catalogued requirement resolves to this control's clause yet.
                    </p>
                    <InterlinkChip
                      label={`Open ${catalogEntry.data.frameworkName || 'framework'} catalog`}
                      to={`/frameworks?open=${catalogEntry.data.frameworkId}`}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
