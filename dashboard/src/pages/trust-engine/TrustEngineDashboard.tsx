import { useState } from 'react';
import { Eye, PencilSimple, Trash, Plus, ShieldCheck, CheckCircle, XCircle, Clock, ArrowClockwise } from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TRUST_POLICIES, TrustPolicy, severityColor, statusColor, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';

const EVAL_DATA = [
  { day: 'Mon', evaluations: 18400 },
  { day: 'Tue', evaluations: 21200 },
  { day: 'Wed', evaluations: 19800 },
  { day: 'Thu', evaluations: 24500 },
  { day: 'Fri', evaluations: 22100 },
  { day: 'Sat', evaluations: 14300 },
  { day: 'Sun', evaluations: 11600 },
];

function TrustGauge({ score }: { score: number }) {
  const r = 70;
  const cx = 90;
  const cy = 90;
  const startAngle = 210;
  const endAngle = 330;
  const totalDeg = 360 - startAngle + endAngle;
  const filledDeg = (score / 100) * totalDeg;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arcPath = (start: number, end: number, radius: number) => {
    const s = toRad(start);
    const e = toRad(end);
    const x1 = cx + radius * Math.cos(s);
    const y1 = cy + radius * Math.sin(s);
    const x2 = cx + radius * Math.cos(e);
    const y2 = cy + radius * Math.sin(e);
    const large = end - start > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
  };

  const endFilled = startAngle + filledDeg;

  return (
    <svg viewBox="0 0 180 110" className="w-44 h-28">
      <path d={arcPath(startAngle, startAngle + totalDeg, r)} fill="none" stroke="hsl(var(--border))" strokeWidth="12" strokeLinecap="round" />
      <path d={arcPath(startAngle, endFilled, r)} fill="none" stroke="hsl(var(--brand))" strokeWidth="12" strokeLinecap="round" />
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="28" fontWeight="700" fill="hsl(var(--text-1))">{score}%</text>
      <text x={cx} y={cy + 18} textAnchor="middle" fontSize="10" fill="hsl(var(--text-4))">Trust Score</text>
    </svg>
  );
}

function policyStatusBadge(status: TrustPolicy['status']) {
  if (status === 'active') return <Badge style={{ background: 'hsl(142 71% 45% / 0.15)', color: 'hsl(142 71% 45%)', borderRadius: 0 }}>Active</Badge>;
  if (status === 'disabled') return <Badge style={{ background: 'hsl(0 72% 51% / 0.15)', color: 'hsl(0 72% 51%)', borderRadius: 0 }}>Disabled</Badge>;
  return <Badge style={{ background: 'hsl(45 93% 47% / 0.15)', color: 'hsl(45 93% 47%)', borderRadius: 0 }}>Testing</Badge>;
}

export default function TrustEngineDashboard() {
  const { orgName } = useSettingsStore();
  const chart = useChartTheme();
  const [policies, setPolicies] = useState<TrustPolicy[]>(TRUST_POLICIES);
  const [search, setSearch] = useState('');
  const [viewItem, setViewItem] = useState<TrustPolicy | null>(null);
  const [editItem, setEditItem] = useState<TrustPolicy | null>(null);
  const [editForm, setEditForm] = useState<Partial<TrustPolicy>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', type: '', target: '', description: '' });

  const filtered = policies.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.type.toLowerCase().includes(search.toLowerCase()) ||
    p.target.toLowerCase().includes(search.toLowerCase())
  );

  const totalEvals = policies.reduce((s, p) => s + p.evaluations, 0);
  const activePolicies = policies.filter(p => p.status === 'active').length;
  const avgScore = Math.round(policies.reduce((s, p) => s + p.trustScore, 0) / policies.length);

  const openEdit = (p: TrustPolicy) => { setEditItem(p); setEditForm({ ...p }); };
  const saveEdit = () => {
    if (!editItem) return;
    setPolicies(prev => prev.map(p => p.id === editItem.id ? { ...p, ...editForm } as TrustPolicy : p));
    setEditItem(null);
  };
  const handleDelete = (id: string) => setPolicies(prev => prev.filter(p => p.id !== id));
  const handleCreate = () => {
    const np: TrustPolicy = {
      id: `TP-00${policies.length + 1}`,
      name: newForm.name || 'New Policy',
      type: newForm.type || 'Custom',
      target: newForm.target || 'All Agents',
      status: 'testing',
      evaluations: 0,
      trustScore: 100,
      lastEvaluated: new Date().toISOString().split('T')[0],
      description: newForm.description || '',
    };
    setPolicies(prev => [...prev, np]);
    setNewForm({ name: '', type: '', target: '', description: '' });
    setCreateOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Trust Engine</h1>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>{orgName} · Policy evaluation & guardrail management</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
          <Plus className="h-4 w-4 mr-2" weight="bold" />Create Rule
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="pt-5">
            <div className="flex items-center justify-center">
              <TrustGauge score={91} />
            </div>
          </CardContent>
        </Card>
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="pt-5 space-y-1">
            <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>Active Policies</p>
            <p className="text-3xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>{activePolicies}</p>
            <p className="text-xs" style={{ color: 'hsl(142 71% 45%)' }}>{policies.length} total configured</p>
          </CardContent>
        </Card>
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="pt-5 space-y-1">
            <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>Total Evaluations</p>
            <p className="text-3xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>{(totalEvals / 1000).toFixed(0)}K</p>
            <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>This week</p>
          </CardContent>
        </Card>
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="pt-5 space-y-1">
            <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>Avg Trust Score</p>
            <p className="text-3xl font-bold" style={{ color: 'hsl(var(--brand))' }}>{avgScore}%</p>
            <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Across all policies</p>
          </CardContent>
        </Card>
      </div>

      {/* Evaluations Chart */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Policy Evaluations — This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={EVAL_DATA} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fill: chart.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: chart.axis, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: 0, color: chart.tooltipText, fontSize: 12 }} />
              <Bar dataKey="evaluations" fill="hsl(var(--brand))" radius={0} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Policy Table */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Trust Policies</CardTitle>
            <Input
              placeholder="Search policies..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-52 h-8 text-xs"
              style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))' }}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12" style={{ color: 'hsl(var(--text-4))' }}>
              <ShieldCheck size={32} className="mb-2 opacity-40" />
              <p className="text-sm">No policies match your search</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    {['ID', 'Name', 'Type', 'Target', 'Status', 'Evaluations', 'Trust Score', 'Last Evaluated', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'hsl(var(--text-4))' }}>{p.id}</td>
                      <td className="px-4 py-3 font-medium" style={{ color: 'hsl(var(--text-1))' }}>{p.name}</td>
                      <td className="px-4 py-3" style={{ color: 'hsl(var(--text-4))' }}>{p.type}</td>
                      <td className="px-4 py-3" style={{ color: 'hsl(var(--text-4))' }}>{p.target}</td>
                      <td className="px-4 py-3">{policyStatusBadge(p.status)}</td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'hsl(var(--text-1))' }}>{p.evaluations.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold" style={{ color: p.trustScore >= 95 ? 'hsl(142 71% 45%)' : p.trustScore >= 85 ? 'hsl(45 93% 47%)' : 'hsl(0 72% 51%)' }}>
                          {p.trustScore}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{formatDate(p.lastEvaluated)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setViewItem(p)}>
                            <Eye size={14} />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(p)}>
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
                                <AlertDialogTitle>Delete Policy</AlertDialogTitle>
                                <AlertDialogDescription>Delete "{p.name}"? This cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(p.id)} style={{ borderRadius: 0, background: 'hsl(0 72% 51%)' }}>Delete</AlertDialogAction>
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
          <SheetHeader>
            <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>Policy Detail</SheetTitle>
          </SheetHeader>
          {viewItem && (
            <div className="mt-6 space-y-4">
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>ID</p><p className="font-mono text-sm">{viewItem.id}</p></div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Name</p><p className="text-sm font-medium">{viewItem.name}</p></div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Type</p><p className="text-sm">{viewItem.type}</p></div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Target</p><p className="text-sm">{viewItem.target}</p></div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Status</p>{policyStatusBadge(viewItem.status)}</div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Trust Score</p><p className="text-2xl font-bold" style={{ color: 'hsl(var(--brand))' }}>{viewItem.trustScore}%</p></div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Total Evaluations</p><p className="text-sm">{viewItem.evaluations.toLocaleString()}</p></div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Last Evaluated</p><p className="text-sm">{formatDate(viewItem.lastEvaluated)}</p></div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Description</p><p className="text-sm">{viewItem.description}</p></div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent style={{ borderRadius: 0 }}>
          <DialogHeader><DialogTitle>Edit Policy</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Name</label>
              <Input value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="mt-1" style={{ borderRadius: 0 }} /></div>
            <div><label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Type</label>
              <Input value={editForm.type || ''} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))} className="mt-1" style={{ borderRadius: 0 }} /></div>
            <div><label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Target</label>
              <Input value={editForm.target || ''} onChange={e => setEditForm(f => ({ ...f, target: e.target.value }))} className="mt-1" style={{ borderRadius: 0 }} /></div>
            <div><label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Description</label>
              <Input value={editForm.description || ''} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} className="mt-1" style={{ borderRadius: 0 }} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={saveEdit} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent style={{ borderRadius: 0 }}>
          <DialogHeader><DialogTitle>Create Rule</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Name</label>
              <Input value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} className="mt-1" style={{ borderRadius: 0 }} placeholder="Policy name" /></div>
            <div><label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Type</label>
              <Input value={newForm.type} onChange={e => setNewForm(f => ({ ...f, type: e.target.value }))} className="mt-1" style={{ borderRadius: 0 }} placeholder="e.g. Privacy, Safety, Accuracy" /></div>
            <div><label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Target</label>
              <Input value={newForm.target} onChange={e => setNewForm(f => ({ ...f, target: e.target.value }))} className="mt-1" style={{ borderRadius: 0 }} placeholder="e.g. All Agents" /></div>
            <div><label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Description</label>
              <Input value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))} className="mt-1" style={{ borderRadius: 0 }} placeholder="Policy description" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleCreate} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
