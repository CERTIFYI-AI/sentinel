import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  ArrowLeft, Warning, CheckCircle, XCircle, Clock, Shield,
  FileText, User, CalendarBlank, TestTube, Link as LinkIcon, Paperclip,
} from '@phosphor-icons/react';
import { CONTROLS, RISKS, EVIDENCE, severityColor, statusColor, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';

import { useControls } from '../../hooks/queries/useControls'

const MOCK_TEST_HISTORY = [
  {
    id: 'TEST-001',
    date: '2026-03-20',
    tester: 'Emma Wilson',
    result: 'pass' as const,
    score: 94,
    notes: 'All test cases passed. Control operating effectively. Minor documentation gap noted.',
    duration: '3.5 hours',
  },
  {
    id: 'TEST-002',
    date: '2025-12-15',
    tester: 'Emma Wilson',
    result: 'pass' as const,
    score: 91,
    notes: 'Control passed quarterly review. Recommend automation of evidence collection.',
    duration: '4 hours',
  },
  {
    id: 'TEST-003',
    date: '2025-09-10',
    tester: 'James Patel',
    result: 'fail' as const,
    score: 68,
    notes: 'Control failed — documentation not updated post model deployment. Remediation required.',
    duration: '2 hours',
  },
];

function ScoreCircle({ score, size = 80 }: { score: number; size?: number }) {
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

  const control = CONTROLS.find(c => c.id === id);

  if (!control) {
    return (
      <div className="p-6 flex flex-col items-center justify-center" style={{ minHeight: 400 }}>
        <Warning size={48} style={{ color: 'hsl(var(--r-hi-tx))' }} />
        <p className="mt-4 text-lg font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Control not found</p>
        <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>Control ID "{id}" does not exist.</p>
        <Button className="mt-4" onClick={() => navigate('/compliance/controls')} style={{ borderRadius: 0 }}>
          <ArrowLeft size={14} /> Back to Controls
        </Button>
      </div>
    );
  }

  const sc = statusColor(control.status);
  const trColor = control.testResult === 'pass' ? 'hsl(var(--s-ok-tx))' : control.testResult === 'fail' ? 'hsl(var(--s-er-tx))' : 'hsl(var(--r-hi-tx))';
  const scoreColor = control.score >= 85 ? 'hsl(var(--s-ok-tx))' : control.score >= 65 ? 'hsl(var(--r-hi-tx))' : 'hsl(var(--s-er-tx))';

  // Linked evidence (same framework)
  const linkedEvidence = EVIDENCE.filter(e => e.framework === control.framework).slice(0, 3);

  // Linked risks (same framework)
  const linkedRisks = RISKS.filter(r => r.linkedModel !== '' || r.category === 'Compliance').slice(0, 4);

  const mockEvidence = [
    { id: `EV-${control.id}-001`, title: `${control.title} — Test Report Q1 2026`, type: 'Report', source: 'Internal', size: '1.8 MB', date: '2026-03-20', status: 'synced' },
    { id: `EV-${control.id}-002`, title: `${control.framework} Evidence — ${control.clause}`, type: 'Documentation', source: 'Internal', size: '890 KB', date: '2026-03-10', status: 'synced' },
    { id: `EV-${control.id}-003`, title: `Screenshot — ${control.title} Implementation`, type: 'Screenshot', source: 'Internal', size: '230 KB', date: '2026-02-28', status: 'pending' },
  ];

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/compliance/controls')} style={{ padding: '4px 8px' }}>
        <ArrowLeft size={14} /> Back to Controls
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>{control.title}</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · {control.framework} · {control.clause} · Control ID: {control.id}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0 }}>
            {control.status}
          </Badge>
          <Badge style={{ background: `${trColor}20`, color: trColor, border: `1px solid ${trColor}`, borderRadius: 0 }}>
            {control.testResult === 'pass' ? <CheckCircle size={11} style={{ display: 'inline', marginRight: 3 }} /> : control.testResult === 'fail' ? <XCircle size={11} style={{ display: 'inline', marginRight: 3 }} /> : <Clock size={11} style={{ display: 'inline', marginRight: 3 }} />}
            {control.testResult.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
          <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
          <TabsTrigger value="evidence" style={{ borderRadius: 0 }}>Evidence ({mockEvidence.length})</TabsTrigger>
          <TabsTrigger value="testing" style={{ borderRadius: 0 }}>Test History</TabsTrigger>
          <TabsTrigger value="risks" style={{ borderRadius: 0 }}>Linked Risks</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            {/* Score */}
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Control Score</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center py-4">
                <ScoreCircle score={control.score} size={100} />
                <div className="mt-4 w-full space-y-2">
                  <div className="flex justify-between text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                    <span>Score</span><span style={{ color: scoreColor, fontWeight: 700 }}>{control.score}/100</span>
                  </div>
                  <div style={{ height: 6, background: 'hsl(var(--bg-muted))' }}>
                    <div style={{ width: `${control.score}%`, height: '100%', background: scoreColor }} />
                  </div>
                  <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                    {control.score >= 85 ? 'Operating effectively' : control.score >= 65 ? 'Partially effective — improvements needed' : 'Ineffective — immediate remediation required'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Details */}
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', gridColumn: '2 / 4' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Control Details</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4" style={{ color: 'hsl(var(--text-2))' }}>{control.description}</p>
                <div className="grid grid-cols-2 gap-x-8">
                  {[
                    { label: 'Control ID', value: control.id, icon: Shield },
                    { label: 'Framework', value: control.framework, icon: FileText },
                    { label: 'Clause', value: control.clause, icon: LinkIcon },
                    { label: 'Owner', value: control.owner, icon: User },
                    { label: 'Last Tested', value: control.lastTested ? formatDate(control.lastTested) : 'Not tested', icon: CalendarBlank },
                    { label: 'Evidence Count', value: control.evidenceCount, icon: Paperclip },
                  ].map(r => (
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

        {/* Evidence Tab */}
        <TabsContent value="evidence" className="mt-4">
          <div className="space-y-3">
            {mockEvidence.map(ev => {
              const evSc = statusColor(ev.status);
              return (
                <Card key={ev.id} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div style={{ width: 40, height: 40, background: 'hsl(var(--bg-muted))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Paperclip size={18} style={{ color: 'hsl(var(--brand))' }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{ev.id}</span>
                        <Badge variant="outline" style={{ borderRadius: 0, fontSize: 10 }}>{ev.type}</Badge>
                        <Badge style={{ background: evSc.bg, color: evSc.text, border: `1px solid ${evSc.border}`, borderRadius: 0, fontSize: 10 }}>{ev.status}</Badge>
                      </div>
                      <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{ev.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>{ev.source} · {ev.size} · {formatDate(ev.date)}</p>
                    </div>
                    <Button size="sm" variant="outline" style={{ borderRadius: 0 }}>
                      <FileText size={13} /> View
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Test History Tab */}
        <TabsContent value="testing" className="mt-4">
          <div className="space-y-3">
            {MOCK_TEST_HISTORY.map(test => {
              const color = test.result === 'pass' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))';
              return (
                <Card key={test.id} style={{ background: 'hsl(var(--bg-surface))', border: `1px solid ${color}40` }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{test.id}</span>
                          <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{formatDate(test.date)} · {test.tester} · {test.duration}</span>
                        </div>
                        <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                          {control.title} — Quarterly Test
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold" style={{ color }}>{test.score}</span>
                        <Badge style={{ background: `${color}20`, color, border: `1px solid ${color}`, borderRadius: 0, fontSize: 11 }}>
                          {test.result === 'pass' ? <CheckCircle size={11} style={{ display: 'inline', marginRight: 3 }} /> : <XCircle size={11} style={{ display: 'inline', marginRight: 3 }} />}
                          {test.result.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{test.notes}</p>
                    {/* Score bar */}
                    <div className="mt-3">
                      <div style={{ height: 4, background: 'hsl(var(--bg-muted))' }}>
                        <div style={{ width: `${test.score}%`, height: '100%', background: color }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Linked Risks Tab */}
        <TabsContent value="risks" className="mt-4">
          <div className="space-y-3">
            {linkedRisks.map(risk => {
              const rc = severityColor(risk.severity);
              const rsc = statusColor(risk.status);
              return (
                <Card key={risk.id} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{risk.id}</span>
                          <Badge style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}`, borderRadius: 0, fontSize: 10 }}>{risk.severity}</Badge>
                          <Badge style={{ background: rsc.bg, color: rsc.text, border: `1px solid ${rsc.border}`, borderRadius: 0, fontSize: 10 }}>{risk.status}</Badge>
                        </div>
                        <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{risk.title}</p>
                        <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-2))' }}>{risk.description}</p>
                      </div>
                      <div className="ml-4 text-right">
                        <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Risk Score</p>
                        <p className="text-2xl font-bold" style={{ color: rc.text }}>{risk.score}</p>
                        <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{risk.owner}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
