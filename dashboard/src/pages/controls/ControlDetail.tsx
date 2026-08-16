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
import { useControls } from '../../hooks/queries/useControls';
import { useControlTests } from '../../hooks/useComplianceGroup';
import { useModelsData } from '../../hooks/useModelsData';
import { useSettingsStore } from '../../stores/settingsStore';
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
  const { orgName } = useSettingsStore();

  const controlsQuery = useControls();
  const testsQuery = useControlTests(id);
  const { models } = useModelsData();

  const modelName = (mid: string) => models.find((m) => m.id === mid)?.name ?? 'Unavailable';

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

  const control = (controlsQuery.data ?? []).find((c) => c.id === id);

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
      <Button variant="ghost" size="sm" onClick={() => navigate('/compliance/controls')} style={{ padding: '4px 8px' }}>
        <ArrowLeft size={14} /> Back to Controls
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>{control.name || control.title || 'Untitled control'}</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · {control.framework || 'No framework'} · {control.clauseRef || 'No clause'} · Ref: {displayRef(control)}
          </p>
        </div>
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
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
          <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
          <TabsTrigger value="testing" style={{ borderRadius: 0 }}>Test History ({tests.length})</TabsTrigger>
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
                      <InterlinkChip key={rid} label={`Risk ${rid.slice(0, 8)}…`} to={`/risks?open=${rid}`} />
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
                      <InterlinkChip key={pid} label={`Policy ${pid.slice(0, 8)}…`} to={`/policies?open=${pid}`} />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs py-2" style={{ color: 'hsl(var(--text-4))' }}>No policies linked to this control yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
