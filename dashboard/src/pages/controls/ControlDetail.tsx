import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  ArrowLeft, ShieldCheck, ClipboardText, Warning, CheckCircle,
  XCircle, Clock, TestTube, Link as LinkIcon,
} from '@phosphor-icons/react';
import { CONTROLS, EVIDENCE, RISKS, GAPS, statusColor, severityColor, formatDate } from '../../data/seed';

function testResultBadge(result: string) {
  if (result === 'pass') return { bg: 'hsl(var(--s-ok-bg))', text: '#10b981', border: 'hsl(var(--s-ok-br))', label: 'Pass' };
  if (result === 'fail') return { bg: 'hsl(var(--s-er-bg))', text: '#ef4444', border: 'hsl(var(--s-er-br))', label: 'Fail' };
  return { bg: 'hsl(var(--s-nt-bg))', text: 'hsl(var(--s-nt-tx))', border: 'hsl(var(--s-nt-br))', label: 'Pending' };
}

function scoreBarColor(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#f97316';
  return '#ef4444';
}

const TEST_HISTORY = [
  { date: '2026-03-20', result: 'pass', tester: 'Emma Wilson', notes: 'All test cases passed. Evidence reviewed.' },
  { date: '2026-02-18', result: 'fail', tester: 'James Patel', notes: 'Missing documentation for two sub-controls.' },
  { date: '2026-01-15', result: 'pass', tester: 'Emma Wilson', notes: 'Quarterly review completed successfully.' },
];

export default function ControlDetail() {
  const { id } = useParams<{ id: string }>();
  const control = CONTROLS.find(c => c.id === id);

  if (!control) {
    return (
      <div className="p-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
        <Link to="/compliance/controls">
          <Button variant="outline" size="sm" style={{ borderRadius: 0 }}>
            <ArrowLeft size={14} className="mr-1" /> Back to Controls
          </Button>
        </Link>
        <div className="flex flex-col items-center justify-center py-24">
          <Warning size={48} style={{ color: 'hsl(var(--text-3))' }} />
          <p className="mt-4 text-lg font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Control Not Found</p>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>No control with ID: {id}</p>
        </div>
      </div>
    );
  }

  const sc = statusColor(control.status);
  const tr = testResultBadge(control.testResult);

  // Linked evidence: by framework
  const linkedEvidence = EVIDENCE.filter(e => e.framework === control.framework);

  // Linked risks: by category
  const linkedRisks = RISKS.filter(r => r.category === 'Compliance' || r.category === 'AI/ML').slice(0, 3);

  // Gap delta — decrease is green, increase is red
  const gapDelta = control.score - 80;

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Back */}
      <Link to="/compliance/controls">
        <Button variant="outline" size="sm" style={{ borderRadius: 0 }}>
          <ArrowLeft size={14} className="mr-1" /> Back to Controls
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{control.id}</span>
            <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0 }}>
              {control.status.replace('_', ' ')}
            </Badge>
            <Badge style={{ background: tr.bg, color: tr.text, border: `1px solid ${tr.border}`, borderRadius: 0 }}>
              {tr.label}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>{control.title}</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {control.framework} · {control.clause}
          </p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Compliance Score', value: control.score + '%', icon: ShieldCheck, color: scoreBarColor(control.score) },
          { label: 'Evidence Items', value: control.evidenceCount, icon: ClipboardText, color: '#3b82f6' },
          { label: 'Last Tested', value: control.lastTested ? formatDate(control.lastTested) : 'Never', icon: TestTube, color: '#6366f1' },
          { label: 'Owner', value: control.owner, icon: Warning, color: '#f97316' },
        ].map(s => (
          <Card key={s.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{s.label}</p>
                <s.icon size={16} style={{ color: s.color }} />
              </div>
              <p className="text-base font-bold" style={{ color: 'hsl(var(--text-1))' }}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Score bar */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-4">
          <div className="flex justify-between text-xs mb-2">
            <span style={{ color: 'hsl(var(--text-2))' }}>Compliance Score</span>
            <div className="flex items-center gap-2">
              <span className="font-bold" style={{ color: scoreBarColor(control.score) }}>{control.score}%</span>
              <span className="text-xs" style={{ color: gapDelta >= 0 ? '#10b981' : '#ef4444' }}>
                {gapDelta >= 0 ? `+${gapDelta}% above target` : `${gapDelta}% below target`}
              </span>
            </div>
          </div>
          <div style={{ background: 'hsl(var(--bg-muted))', height: 12 }}>
            <div style={{ width: control.score + '%', height: '100%', background: scoreBarColor(control.score), transition: 'width 0.3s' }} />
          </div>
          <div className="flex justify-between text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>
            <span>&lt;60% Non-Compliant</span>
            <span>60-79% Partial</span>
            <span>≥80% Target</span>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
          <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
          <TabsTrigger value="evidence" style={{ borderRadius: 0 }}>Evidence ({linkedEvidence.length})</TabsTrigger>
          <TabsTrigger value="tests" style={{ borderRadius: 0 }}>Test History</TabsTrigger>
          <TabsTrigger value="risks" style={{ borderRadius: 0 }}>Linked Risks ({linkedRisks.length})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Control Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Control ID', value: control.id },
                  { label: 'Framework', value: control.framework },
                  { label: 'Clause', value: control.clause },
                  { label: 'Status', value: control.status.replace('_', ' ') },
                  { label: 'Owner', value: control.owner },
                  { label: 'Score', value: control.score + '%' },
                  { label: 'Evidence Items', value: control.evidenceCount.toString() },
                  { label: 'Last Tested', value: control.lastTested ? formatDate(control.lastTested) : '—' },
                  { label: 'Test Result', value: control.testResult },
                ].map(r => (
                  <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                    <span className="text-sm font-medium" style={{
                      color: r.label === 'Test Result'
                        ? (control.testResult === 'pass' ? '#10b981' : control.testResult === 'fail' ? '#ef4444' : 'hsl(var(--text-1))')
                        : 'hsl(var(--text-1))'
                    }}>
                      {r.value}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{control.description}</p>
                <div className="mt-4 p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-2))' }}>Gap Delta vs 80% Target</p>
                  <p className="text-lg font-bold" style={{ color: gapDelta >= 0 ? '#10b981' : '#ef4444' }}>
                    {gapDelta >= 0 ? '+' : ''}{gapDelta}%
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>
                    {gapDelta >= 0 ? 'Exceeds target — well controlled' : 'Below target — remediation needed'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Evidence Tab */}
        <TabsContent value="evidence" className="mt-4">
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Linked Evidence</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {linkedEvidence.length === 0 ? (
                <div className="flex flex-col items-center py-10" style={{ color: 'hsl(var(--text-3))' }}>
                  <ClipboardText size={32} />
                  <p className="mt-2 text-sm">No evidence linked to this control's framework</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                    <tr>
                      {['ID', 'Title', 'Type', 'Status', 'Source', 'Last Sync'].map(h => (
                        <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {linkedEvidence.map(e => {
                      const esc = statusColor(e.status);
                      return (
                        <tr key={e.id} style={{ borderTop: '1px solid hsl(var(--border))' }}>
                          <td className="p-3 text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{e.id}</td>
                          <td className="p-3 text-sm" style={{ color: 'hsl(var(--text-1))' }}>{e.title}</td>
                          <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{e.type}</td>
                          <td className="p-3">
                            <Badge style={{ background: esc.bg, color: esc.text, border: `1px solid ${esc.border}`, borderRadius: 0, fontSize: 10 }}>
                              {e.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{e.source}</td>
                          <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{formatDate(e.lastSync)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test History */}
        <TabsContent value="tests" className="mt-4">
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Test History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {TEST_HISTORY.map((t, i) => {
                  const trb = testResultBadge(t.result);
                  return (
                    <div key={i} className="flex items-start gap-3 p-3" style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}>
                      {t.result === 'pass' ? (
                        <CheckCircle size={16} style={{ color: '#10b981', flexShrink: 0, marginTop: 1 }} />
                      ) : (
                        <XCircle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <Badge style={{ background: trb.bg, color: trb.text, border: `1px solid ${trb.border}`, borderRadius: 0, fontSize: 10 }}>
                            {trb.label}
                          </Badge>
                          <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{formatDate(t.date)}</span>
                        </div>
                        <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-2))' }}>{t.notes}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>Tested by: {t.tester}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Linked Risks */}
        <TabsContent value="risks" className="mt-4">
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Linked Risks</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {linkedRisks.length === 0 ? (
                <div className="flex flex-col items-center py-10" style={{ color: 'hsl(var(--text-3))' }}>
                  <CheckCircle size={32} style={{ color: '#10b981' }} />
                  <p className="mt-2 text-sm">No risks linked</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                    <tr>
                      {['ID', 'Risk', 'Category', 'Severity', 'Score', 'Status'].map(h => (
                        <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {linkedRisks.map(r => {
                      const rsc = severityColor(r.severity);
                      const rstc = statusColor(r.status);
                      return (
                        <tr key={r.id} style={{ borderTop: '1px solid hsl(var(--border))' }}>
                          <td className="p-3 text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{r.id}</td>
                          <td className="p-3 text-sm" style={{ color: 'hsl(var(--text-1))', maxWidth: 200 }}>
                            <span className="line-clamp-2">{r.title}</span>
                          </td>
                          <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{r.category}</td>
                          <td className="p-3">
                            <Badge style={{ background: rsc.bg, color: rsc.text, border: `1px solid ${rsc.border}`, borderRadius: 0, fontSize: 10 }}>
                              {r.severity}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm font-bold" style={{ color: r.score >= 15 ? '#ef4444' : 'hsl(var(--text-1))' }}>
                            {r.score}
                          </td>
                          <td className="p-3">
                            <Badge style={{ background: rstc.bg, color: rstc.text, border: `1px solid ${rstc.border}`, borderRadius: 0, fontSize: 10 }}>
                              {r.status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
