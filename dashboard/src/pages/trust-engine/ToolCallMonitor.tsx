import { useState } from 'react';
import { Eye, PencilSimple, Trash, MagnifyingGlass, Wrench, CheckCircle, XCircle } from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { useSettingsStore } from '../../stores/settingsStore';

interface ToolCall {
  id: string;
  timestamp: string;
  agent: string;
  tool: string;
  args: string;
  result: 'success' | 'error' | 'timeout' | 'blocked';
  latencyMs: number;
  output: string;
  error?: string;
}

const TOOL_CALLS: ToolCall[] = [
  {
    id: 'TC-001', timestamp: '2026-03-31T14:23:01.234Z', agent: 'ComplianceBot',
    tool: 'search_policy_database', args: '{"query": "EU AI Act Article 11", "scope": "active"}',
    result: 'success', latencyMs: 142, output: 'Found 3 matching policy documents.',
  },
  {
    id: 'TC-002', timestamp: '2026-03-31T14:22:58.891Z', agent: 'LoanAssistant',
    tool: 'get_customer_profile', args: '{"customer_id": "CUST-4892", "fields": ["credit_score", "income"]}',
    result: 'blocked', latencyMs: 8, output: '[BLOCKED — PII guardrail: customer_id contains PII]',
  },
  {
    id: 'TC-003', timestamp: '2026-03-31T14:22:55.100Z', agent: 'RiskAnalyzer',
    tool: 'fetch_vendor_risk_score', args: '{"vendor_id": "V-006", "framework": "ISO27001"}',
    result: 'success', latencyMs: 312, output: 'Vendor V-006 risk score: 61/100. Status: in_review.',
  },
  {
    id: 'TC-004', timestamp: '2026-03-31T14:22:50.445Z', agent: 'DataLabeler-v2',
    tool: 'write_label_store', args: '{"batch_id": "DS-0044", "labels": [...500 records]}',
    result: 'timeout', latencyMs: 30000, output: '[TIMEOUT — write_label_store exceeded 30s]',
    error: 'Database connection pool exhausted after 30000ms',
  },
  {
    id: 'TC-005', timestamp: '2026-03-31T14:22:45.200Z', agent: 'AuditLog-Streamer',
    tool: 'stream_to_siem', args: '{"events": [...12 entries], "destination": "splunk://siem.internal"}',
    result: 'success', latencyMs: 45, output: '12 audit events streamed to SIEM successfully.',
  },
  {
    id: 'TC-006', timestamp: '2026-03-31T14:22:40.100Z', agent: 'VendorRisk-Scanner',
    tool: 'run_vendor_questionnaire', args: '{"vendor_id": "V-004", "template": "ISO27001_v2"}',
    result: 'error', latencyMs: 890, output: '[ERROR — Vendor portal API returned 502]',
    error: 'Remote endpoint returned 502 Bad Gateway',
  },
];

function resultBadge(result: ToolCall['result']) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    success: { bg: 'hsl(142 71% 45% / 0.15)', color: 'hsl(142 71% 45%)', label: 'Success' },
    error: { bg: 'hsl(0 72% 51% / 0.15)', color: 'hsl(0 72% 51%)', label: 'Error' },
    timeout: { bg: 'hsl(0 72% 51% / 0.15)', color: 'hsl(0 72% 51%)', label: 'Timeout' },
    blocked: { bg: 'hsl(45 93% 47% / 0.15)', color: 'hsl(45 93% 47%)', label: 'Blocked' },
  };
  const s = map[result] ?? map.success;
  return <Badge style={{ background: s.bg, color: s.color, borderRadius: 0, fontSize: 11 }}>{s.label}</Badge>;
}

export default function ToolCallMonitor() {
  const { orgName } = useSettingsStore();
  const [calls, setCalls] = useState<ToolCall[]>(TOOL_CALLS);
  const [search, setSearch] = useState('');
  const [viewItem, setViewItem] = useState<ToolCall | null>(null);
  const [editItem, setEditItem] = useState<ToolCall | null>(null);
  const [editForm, setEditForm] = useState<Partial<ToolCall>>({});

  const filtered = calls.filter(c =>
    c.agent.toLowerCase().includes(search.toLowerCase()) ||
    c.tool.toLowerCase().includes(search.toLowerCase()) ||
    c.result.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (c: ToolCall) => { setEditItem(c); setEditForm({ ...c }); };
  const saveEdit = () => {
    if (!editItem) return;
    setCalls(prev => prev.map(c => c.id === editItem.id ? { ...c, ...editForm } as ToolCall : c));
    setEditItem(null);
  };
  const handleDelete = (id: string) => setCalls(prev => prev.filter(c => c.id !== id));

  const successRate = Math.round((calls.filter(c => c.result === 'success').length / calls.length) * 100);
  const errors = calls.filter(c => c.result === 'error' || c.result === 'timeout').length;
  const avgLatency = Math.round(calls.reduce((s, c) => s + c.latencyMs, 0) / calls.length);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Tool Call Monitor</h1>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>{orgName} · Agent tool invocation tracking</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Calls', value: calls.length, color: 'hsl(var(--text-1))' },
          { label: 'Success Rate', value: `${successRate}%`, color: 'hsl(142 71% 45%)' },
          { label: 'Errors / Timeouts', value: errors, color: 'hsl(0 72% 51%)' },
          { label: 'Avg Latency', value: `${avgLatency >= 1000 ? `${(avgLatency / 1000).toFixed(1)}s` : `${avgLatency}ms`}`, color: 'hsl(var(--brand))' },
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
        <Input placeholder="Search tool calls..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }} />
      </div>

      {/* Table */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12" style={{ color: 'hsl(var(--text-4))' }}>
              <Wrench size={32} className="mb-2 opacity-40" />
              <p className="text-sm">No tool calls match your search</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    {['ID', 'Time', 'Agent', 'Tool', 'Args (preview)', 'Result', 'Latency', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'hsl(var(--text-4))' }}>{c.id}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>
                        {new Date(c.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-3 font-medium text-xs" style={{ color: 'hsl(var(--text-1))' }}>{c.agent}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs px-2 py-0.5" style={{ background: 'hsl(var(--brand) / 0.1)', color: 'hsl(var(--brand))', borderRadius: 0 }}>
                          {c.tool}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-48">
                        <span className="text-xs font-mono line-clamp-1" style={{ color: 'hsl(var(--text-4))' }}>
                          {c.args.slice(0, 60)}{c.args.length > 60 ? '...' : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3">{resultBadge(c.result)}</td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: c.latencyMs > 5000 ? 'hsl(0 72% 51%)' : c.latencyMs > 500 ? 'hsl(45 93% 47%)' : 'hsl(142 71% 45%)' }}>
                        {c.latencyMs >= 1000 ? `${(c.latencyMs / 1000).toFixed(1)}s` : `${c.latencyMs}ms`}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setViewItem(c)}>
                            <Eye size={14} />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(c)}>
                            <PencilSimple size={14} />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" style={{ color: 'hsl(0 72% 51%)' }}>
                                <Trash size={14} />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent style={{ borderRadius: 0 }}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Tool Call</AlertDialogTitle>
                                <AlertDialogDescription>Delete record {c.id}? This cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(c.id)} style={{ borderRadius: 0, background: 'hsl(0 72% 51%)' }}>Delete</AlertDialogAction>
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
          <SheetHeader><SheetTitle style={{ color: 'hsl(var(--text-1))' }}>Tool Call Detail</SheetTitle></SheetHeader>
          {viewItem && (
            <div className="mt-6 space-y-4 text-sm">
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>ID</p><p className="font-mono">{viewItem.id}</p></div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Timestamp</p><p>{new Date(viewItem.timestamp).toLocaleString()}</p></div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Agent</p><p className="font-medium">{viewItem.agent}</p></div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Tool</p>
                <span className="font-mono text-xs px-2 py-1 mt-1 inline-block" style={{ background: 'hsl(var(--brand) / 0.1)', color: 'hsl(var(--brand))', borderRadius: 0 }}>{viewItem.tool}</span>
              </div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Arguments</p>
                <pre className="mt-1 p-2 text-xs font-mono overflow-auto" style={{ background: 'hsl(var(--border) / 0.3)', borderRadius: 0, maxHeight: 120 }}>{viewItem.args}</pre>
              </div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Result</p>{resultBadge(viewItem.result)}</div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Latency</p><p className="font-mono">{viewItem.latencyMs >= 1000 ? `${(viewItem.latencyMs / 1000).toFixed(1)}s` : `${viewItem.latencyMs}ms`}</p></div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Output</p>
                <p className="mt-1 p-2 text-xs" style={{ background: 'hsl(var(--border) / 0.3)', borderRadius: 0 }}>{viewItem.output}</p>
              </div>
              {viewItem.error && (
                <div><p className="text-xs font-semibold" style={{ color: 'hsl(0 72% 51%)' }}>Error</p>
                  <p className="mt-1 p-2 text-xs" style={{ background: 'hsl(0 72% 51% / 0.08)', borderRadius: 0, color: 'hsl(0 72% 51%)' }}>{viewItem.error}</p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent style={{ borderRadius: 0 }}>
          <DialogHeader><DialogTitle>Edit Tool Call Record</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Agent</label>
              <Input value={editForm.agent || ''} onChange={e => setEditForm(f => ({ ...f, agent: e.target.value }))} className="mt-1" style={{ borderRadius: 0 }} /></div>
            <div><label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Tool</label>
              <Input value={editForm.tool || ''} onChange={e => setEditForm(f => ({ ...f, tool: e.target.value }))} className="mt-1" style={{ borderRadius: 0 }} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={saveEdit} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
