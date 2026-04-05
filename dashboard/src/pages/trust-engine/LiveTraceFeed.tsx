import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Trash, Clock, Robot, ArrowRight, Warning } from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../components/ui/alert-dialog';
import { useSettingsStore } from '../../stores/settingsStore';

interface TraceEntry {
  id: string;
  timestamp: string;
  agent: string;
  model: string;
  input: string;
  output: string;
  latencyMs: number;
  status: 'success' | 'fallback' | 'blocked' | 'error';
  fallbackAction?: string;
  tokensIn: number;
  tokensOut: number;
}

const INITIAL_TRACES: TraceEntry[] = [
  { id: 'TR-001', timestamp: '2026-03-31T14:23:01.234Z', agent: 'ComplianceBot', model: 'GPT-4o', input: 'Summarize compliance status for Q1', output: 'Q1 compliance score is 87%. 3 open critical findings...', latencyMs: 312, status: 'success', tokensIn: 142, tokensOut: 284 },
  { id: 'TR-002', timestamp: '2026-03-31T14:22:58.891Z', agent: 'LoanAssistant', model: '-', input: 'Evaluate loan application LA-4892', output: '[BLOCKED — PII guardrail triggered]', latencyMs: 8, status: 'blocked', fallbackAction: 'PII Redaction triggered', tokensIn: 0, tokensOut: 0 },
  { id: 'TR-003', timestamp: '2026-03-31T14:22:55.100Z', agent: 'SupportBot', model: 'Claude-3', input: 'Why was my payment declined?', output: 'Your payment may have been declined due to...', latencyMs: 445, status: 'success', tokensIn: 88, tokensOut: 156 },
  { id: 'TR-004', timestamp: '2026-03-31T14:22:50.445Z', agent: 'RiskAnalyzer', model: 'GPT-4o', input: 'Analyze vendor risk profile V-006', output: '[FALLBACK — Primary model unavailable]', latencyMs: 1240, status: 'fallback', fallbackAction: 'Routed to Claude-3-Haiku', tokensIn: 96, tokensOut: 42 },
  { id: 'TR-005', timestamp: '2026-03-31T14:22:45.200Z', agent: 'DataLabeler-v2', model: 'Claude-3', input: 'Label batch DS-0044 training records', output: 'Labeled 500 records. Confidence: 0.94 avg.', latencyMs: 2100, status: 'success', tokensIn: 4200, tokensOut: 890 },
  { id: 'TR-006', timestamp: '2026-03-31T14:22:40.100Z', agent: 'AuditLog-Streamer', model: '-', input: 'Stream audit events to SIEM', output: '[N/A — Internal pipeline, no LLM call]', latencyMs: 12, status: 'success', tokensIn: 0, tokensOut: 0 },
  { id: 'TR-007', timestamp: '2026-03-31T14:22:35.500Z', agent: 'FraudAlert-Watcher', model: '-', input: 'Flag transaction TXN-99812', output: '[BLOCKED — Data boundary violation]', latencyMs: 5, status: 'blocked', fallbackAction: 'Data Boundary enforcement', tokensIn: 0, tokensOut: 0 },
  { id: 'TR-008', timestamp: '2026-03-31T14:22:30.100Z', agent: 'OpenAI-API-Connector', model: 'GPT-4o', input: 'Generate adverse action letter', output: 'Dear Customer, We regret to inform you...', latencyMs: 890, status: 'success', tokensIn: 312, tokensOut: 548 },
];

function statusBadge(status: TraceEntry['status'], fallbackAction?: string) {
  if (status === 'success' && !fallbackAction) {
    return <Badge style={{ background: 'hsl(142 71% 45% / 0.15)', color: 'hsl(142 71% 45%)', borderRadius: 0, fontSize: 11 }}>Success</Badge>;
  }
  if (status === 'blocked') {
    return <Badge style={{ background: 'hsl(0 72% 51% / 0.15)', color: 'hsl(0 72% 51%)', borderRadius: 0, fontSize: 11 }}>Blocked</Badge>;
  }
  if (status === 'fallback') {
    return <Badge style={{ background: 'hsl(25 95% 53% / 0.15)', color: 'hsl(25 95% 53%)', borderRadius: 0, fontSize: 11 }}>Fallback</Badge>;
  }
  if (status === 'error') {
    return <Badge style={{ background: 'hsl(0 72% 51% / 0.15)', color: 'hsl(0 72% 51%)', borderRadius: 0, fontSize: 11 }}>Error</Badge>;
  }
  return <Badge style={{ background: 'hsl(142 71% 45% / 0.15)', color: 'hsl(142 71% 45%)', borderRadius: 0, fontSize: 11 }}>Success</Badge>;
}

function modelBadge(model: string) {
  if (model === '-') {
    return <Badge style={{ background: 'hsl(var(--border) / 0.5)', color: 'hsl(var(--text-4))', borderRadius: 0, fontSize: 11 }}>N/A</Badge>;
  }
  return <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-1))' }}>{model}</span>;
}

let counter = 9;
function generateTrace(): TraceEntry {
  const agents = ['ComplianceBot', 'LoanAssistant', 'SupportBot', 'RiskAnalyzer', 'FraudAlert-Watcher'];
  const models = ['GPT-4o', 'Claude-3', '-'];
  const statuses: TraceEntry['status'][] = ['success', 'success', 'success', 'blocked', 'fallback'];
  const agent = agents[Math.floor(Math.random() * agents.length)];
  const model = models[Math.floor(Math.random() * models.length)];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  return {
    id: `TR-${String(counter++).padStart(3, '0')}`,
    timestamp: new Date().toISOString(),
    agent,
    model,
    input: 'Incoming request...',
    output: status === 'blocked' ? '[BLOCKED — Guardrail triggered]' : status === 'fallback' ? '[FALLBACK]' : 'Response generated.',
    latencyMs: Math.floor(Math.random() * 1500) + 10,
    status,
    fallbackAction: status === 'fallback' ? 'Routed to backup model' : undefined,
    tokensIn: model === '-' ? 0 : Math.floor(Math.random() * 500),
    tokensOut: model === '-' ? 0 : Math.floor(Math.random() * 800),
  };
}

export default function LiveTraceFeed() {
  const { orgName } = useSettingsStore();
  const [traces, setTraces] = useState<TraceEntry[]>(INITIAL_TRACES);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!paused) {
      intervalRef.current = setInterval(() => {
        setTraces(prev => [generateTrace(), ...prev].slice(0, 50));
      }, 3000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [paused]);

  const handleClear = () => setTraces([]);

  const blocked = traces.filter(t => t.status === 'blocked').length;
  const fallbacks = traces.filter(t => t.status === 'fallback').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Live Trace Feed</h1>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>{orgName} · Real-time agent trace monitoring</p>
        </div>
        <div className="flex gap-2 items-center">
          {!paused && (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'hsl(142 71% 45%)' }}>
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>
          )}
          <Button
            variant="outline"
            onClick={() => setPaused(p => !p)}
            style={{ borderRadius: 0 }}
          >
            {paused ? <><Play className="h-4 w-4 mr-2" />Resume</> : <><Pause className="h-4 w-4 mr-2" />Pause</>}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" style={{ borderRadius: 0, color: 'hsl(0 72% 51%)' }}>
                <Trash className="h-4 w-4 mr-2" />Clear
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent style={{ borderRadius: 0 }}>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear Trace Feed</AlertDialogTitle>
                <AlertDialogDescription>This will remove all {traces.length} trace entries from the live feed. This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClear} style={{ borderRadius: 0, background: 'hsl(0 72% 51%)' }}>Clear All</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Traces', value: traces.length, color: 'hsl(var(--text-1))' },
          { label: 'Blocked', value: blocked, color: 'hsl(0 72% 51%)' },
          { label: 'Fallbacks', value: fallbacks, color: 'hsl(25 95% 53%)' },
          { label: 'Status', value: paused ? 'Paused' : 'Live', color: paused ? 'hsl(45 93% 47%)' : 'hsl(142 71% 45%)' },
        ].map(stat => (
          <Card key={stat.label} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="pt-5">
              <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>{stat.label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trace Feed */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
            Trace Entries {paused && <span className="text-xs font-normal ml-2" style={{ color: 'hsl(45 93% 47%)' }}>(Paused)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {traces.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12" style={{ color: 'hsl(var(--text-4))' }}>
              <Robot size={32} className="mb-2 opacity-40" />
              <p className="text-sm">No traces — feed is clear</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    {['ID', 'Time', 'Agent', 'Model', 'Status', 'Fallback Action', 'Latency', 'Tokens In', 'Tokens Out'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {traces.map((t, i) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid hsl(var(--border))', opacity: i === 0 && !paused ? 1 : 1 }} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'hsl(var(--text-4))' }}>{t.id}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>
                        {new Date(t.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-3 font-medium text-xs" style={{ color: 'hsl(var(--text-1))' }}>{t.agent}</td>
                      <td className="px-4 py-3">{modelBadge(t.model)}</td>
                      <td className="px-4 py-3">{statusBadge(t.status, t.fallbackAction)}</td>
                      <td className="px-4 py-3">
                        {t.fallbackAction ? (
                          <span className="text-xs font-medium" style={{ color: 'hsl(25 95% 53%)' }}>{t.fallbackAction}</span>
                        ) : (
                          <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: t.latencyMs > 1000 ? 'hsl(0 72% 51%)' : t.latencyMs > 300 ? 'hsl(45 93% 47%)' : 'hsl(142 71% 45%)' }}>
                        {t.latencyMs}ms
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'hsl(var(--text-4))' }}>{t.tokensIn}</td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'hsl(var(--text-4))' }}>{t.tokensOut}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
