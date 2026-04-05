import { useState } from 'react';
import { Eye, Trash, ArrowRight, GitFork, MagnifyingGlass } from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../components/ui/alert-dialog';
import { useSettingsStore } from '../../stores/settingsStore';

interface FallbackEvent {
  id: string;
  timestamp: string;
  agent: string;
  primaryModel: string;
  fallbackModel: string;
  reason: string;
  latencyMs: number;
  status: 'success' | 'failed';
  tokensUsed: number;
  details: string;
}

const FALLBACK_EVENTS: FallbackEvent[] = [
  {
    id: 'FB-001', timestamp: '2026-03-31T14:22:50.445Z', agent: 'RiskAnalyzer',
    primaryModel: 'GPT-4o', fallbackModel: 'Claude-3-Haiku',
    reason: 'Primary model rate limit exceeded', latencyMs: 1240, status: 'success',
    tokensUsed: 312, details: 'GPT-4o returned 429 Too Many Requests. Routed to Claude-3-Haiku. Response generated successfully.',
  },
  {
    id: 'FB-002', timestamp: '2026-03-31T13:48:22.100Z', agent: 'LoanAssistant',
    primaryModel: 'GPT-4o', fallbackModel: 'GPT-3.5-Turbo',
    reason: 'Timeout — primary model exceeded 30s SLA', latencyMs: 31200, status: 'success',
    tokensUsed: 756, details: 'Primary model response timed out after 30000ms. Fallback to GPT-3.5-Turbo succeeded in 1.2s.',
  },
  {
    id: 'FB-003', timestamp: '2026-03-31T12:15:11.000Z', agent: 'ComplianceBot',
    primaryModel: 'Claude-3-Opus', fallbackModel: 'Claude-3-Sonnet',
    reason: 'Model API error (503 Service Unavailable)', latencyMs: 892, status: 'success',
    tokensUsed: 428, details: 'Anthropic API returned 503. Automatically routed to Claude-3-Sonnet fallback. No data loss.',
  },
  {
    id: 'FB-004', timestamp: '2026-03-31T10:30:05.200Z', agent: 'DataLabeler-v2',
    primaryModel: 'GPT-4o', fallbackModel: 'Mistral-7B',
    reason: 'Cost limit exceeded for agent', latencyMs: 445, status: 'failed',
    tokensUsed: 0, details: 'Agent cost ceiling of $50/day reached. Fallback model Mistral-7B returned insufficient confidence (0.42). Request aborted.',
  },
  {
    id: 'FB-005', timestamp: '2026-03-30T22:10:44.800Z', agent: 'SupportBot',
    primaryModel: 'Claude-3-Opus', fallbackModel: 'GPT-4o-Mini',
    reason: 'Primary model context window exceeded', latencyMs: 678, status: 'success',
    tokensUsed: 2100, details: 'Input exceeded Claude-3-Opus 200K context window. Truncated and routed to GPT-4o-Mini. Customer response delivered.',
  },
];

function statusBadge(status: FallbackEvent['status']) {
  if (status === 'success') {
    return <Badge style={{ background: 'hsl(142 71% 45% / 0.15)', color: 'hsl(142 71% 45%)', borderRadius: 0, fontSize: 11 }}>Success</Badge>;
  }
  return <Badge style={{ background: 'hsl(0 72% 51% / 0.15)', color: 'hsl(0 72% 51%)', borderRadius: 0, fontSize: 11 }}>Failed</Badge>;
}

export default function FallbackLog() {
  const { orgName } = useSettingsStore();
  const [events, setEvents] = useState<FallbackEvent[]>(FALLBACK_EVENTS);
  const [search, setSearch] = useState('');
  const [viewItem, setViewItem] = useState<FallbackEvent | null>(null);

  const filtered = events.filter(e =>
    e.agent.toLowerCase().includes(search.toLowerCase()) ||
    e.primaryModel.toLowerCase().includes(search.toLowerCase()) ||
    e.fallbackModel.toLowerCase().includes(search.toLowerCase()) ||
    e.reason.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: string) => setEvents(prev => prev.filter(e => e.id !== id));
  const successCount = events.filter(e => e.status === 'success').length;
  const failCount = events.filter(e => e.status === 'failed').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Fallback Log</h1>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>{orgName} · Model fallback chain events</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Fallbacks', value: events.length, color: 'hsl(var(--text-1))' },
          { label: 'Successful', value: successCount, color: 'hsl(142 71% 45%)' },
          { label: 'Failed', value: failCount, color: 'hsl(0 72% 51%)' },
          { label: 'Success Rate', value: `${Math.round((successCount / events.length) * 100)}%`, color: 'hsl(var(--brand))' },
        ].map(stat => (
          <Card key={stat.label} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="pt-5">
              <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>{stat.label}</p>
              <p className="text-3xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'hsl(var(--text-4))' }} />
        <Input placeholder="Search fallback events..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }} />
      </div>

      {/* Table */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12" style={{ color: 'hsl(var(--text-4))' }}>
              <GitFork size={32} className="mb-2 opacity-40" />
              <p className="text-sm">No fallback events match your search</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    {['ID', 'Time', 'Agent', 'Model Chain', 'Reason', 'Latency', 'Tokens', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'hsl(var(--text-4))' }}>{e.id}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>
                        {new Date(e.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-medium text-xs" style={{ color: 'hsl(var(--text-1))' }}>{e.agent}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-1))' }}>{e.primaryModel}</span>
                          <ArrowRight size={12} style={{ color: 'hsl(var(--text-4))' }} />
                          <span className="text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{e.fallbackModel}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs max-w-48" style={{ color: 'hsl(var(--text-4))' }}>
                        <span className="line-clamp-1">{e.reason}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: e.latencyMs > 5000 ? 'hsl(0 72% 51%)' : e.latencyMs > 1000 ? 'hsl(45 93% 47%)' : 'hsl(142 71% 45%)' }}>
                        {e.latencyMs >= 1000 ? `${(e.latencyMs / 1000).toFixed(1)}s` : `${e.latencyMs}ms`}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'hsl(var(--text-4))' }}>{e.tokensUsed}</td>
                      <td className="px-4 py-3">{statusBadge(e.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setViewItem(e)}>
                            <Eye size={14} />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" style={{ color: 'hsl(0 72% 51%)' }}>
                                <Trash size={14} />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent style={{ borderRadius: 0 }}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Fallback Event</AlertDialogTitle>
                                <AlertDialogDescription>Delete event {e.id}? This cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(e.id)} style={{ borderRadius: 0, background: 'hsl(0 72% 51%)' }}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Sheet */}
      <Sheet open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <SheetContent style={{ borderRadius: 0 }}>
          <SheetHeader><SheetTitle style={{ color: 'hsl(var(--text-1))' }}>Fallback Event Detail</SheetTitle></SheetHeader>
          {viewItem && (
            <div className="mt-6 space-y-4 text-sm">
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>ID</p><p className="font-mono">{viewItem.id}</p></div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Timestamp</p><p>{new Date(viewItem.timestamp).toLocaleString()}</p></div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Agent</p><p className="font-medium">{viewItem.agent}</p></div>
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Model Chain</p>
                <div className="flex items-center gap-2 p-2" style={{ background: 'hsl(var(--border) / 0.3)' }}>
                  <Badge style={{ background: 'hsl(var(--border))', color: 'hsl(var(--text-1))', borderRadius: 0, fontSize: 11 }}>{viewItem.primaryModel}</Badge>
                  <ArrowRight size={14} style={{ color: 'hsl(var(--text-4))' }} />
                  <Badge style={{ background: 'hsl(var(--brand) / 0.15)', color: 'hsl(var(--brand))', borderRadius: 0, fontSize: 11 }}>{viewItem.fallbackModel}</Badge>
                </div>
              </div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Reason</p><p>{viewItem.reason}</p></div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Latency</p><p className="font-mono">{viewItem.latencyMs >= 1000 ? `${(viewItem.latencyMs / 1000).toFixed(1)}s` : `${viewItem.latencyMs}ms`}</p></div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Tokens Used</p><p>{viewItem.tokensUsed}</p></div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Status</p>{statusBadge(viewItem.status)}</div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Details</p>
                <p className="mt-1 p-2 text-xs" style={{ background: 'hsl(var(--border) / 0.3)', lineHeight: 1.6 }}>{viewItem.details}</p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
