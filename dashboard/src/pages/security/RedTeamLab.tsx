import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Sword, MagnifyingGlass, Plus, Eye, PencilSimple, Trash,
  Download, CheckCircle, Clock, Play, Target, UserFocus,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell,
} from 'recharts';
import { RED_TEAM_EXERCISES, RedTeamExercise, severityColor, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';

function statusStyle(status: string) {
  switch (status) {
    case 'completed': return { bg: '#10b98120', text: '#10b981', border: '#10b98140' };
    case 'active': return { bg: '#3b82f620', text: '#3b82f6', border: '#3b82f640' };
    case 'planned': return { bg: '#6b728020', text: '#6b7280', border: '#6b728040' };
    default: return { bg: '#f9731620', text: '#f97316', border: '#f9731640' };
  }
}

function scoreColor(score: number) {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#eab308';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}

const EMPTY_EXERCISE: Omit<RedTeamExercise, 'id'> = {
  name: '', attackVector: 'Prompt Injection', status: 'planned',
  findings: 0, criticalFindings: 0, lead: '', startDate: '',
  endDate: '', targetModel: '', description: '', score: 0,
};

export default function RedTeamLab() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();

  const [exercises, setExercises] = useState<RedTeamExercise[]>(RED_TEAM_EXERCISES);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [viewItem, setViewItem] = useState<RedTeamExercise | null>(null);
  const [editItem, setEditItem] = useState<RedTeamExercise | null>(null);
  const [deleteItem, setDeleteItem] = useState<RedTeamExercise | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<RedTeamExercise, 'id'>>(EMPTY_EXERCISE);

  const filtered = exercises.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.name.toLowerCase().includes(q) || e.attackVector.toLowerCase().includes(q) || e.lead.toLowerCase().includes(q);
    const matchStat = filterStatus === 'all' || e.status === filterStatus;
    return matchSearch && matchStat;
  });

  const vectorData = Array.from(
    exercises.reduce((acc, e) => {
      acc.set(e.attackVector, (acc.get(e.attackVector) || 0) + e.findings);
      return acc;
    }, new Map<string, number>())
  ).map(([name, findings]) => ({ name, findings }));

  const stats = [
    { label: 'Total Exercises', value: exercises.length, icon: Sword },
    { label: 'Active', value: exercises.filter(e => e.status === 'active').length, icon: Play },
    { label: 'Total Findings', value: exercises.reduce((s, e) => s + e.findings, 0), icon: Target },
    { label: 'Critical Findings', value: exercises.reduce((s, e) => s + e.criticalFindings, 0), icon: UserFocus },
  ];

  function handleCreate() {
    const id = `RT-${String(exercises.length + 1).padStart(3, '0')}`;
    setExercises(prev => [...prev, { ...formData, id }]);
    setCreateOpen(false);
    setFormData(EMPTY_EXERCISE);
  }

  function handleEdit() {
    if (!editItem) return;
    setExercises(prev => prev.map(e => e.id === editItem.id ? editItem : e));
    setEditItem(null);
  }

  function handleDelete() {
    if (!deleteItem) return;
    setExercises(prev => prev.filter(e => e.id !== deleteItem.id));
    setDeleteItem(null);
  }

  return (
    <div className="space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Red Team Lab</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · Adversarial testing campaigns & findings
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download size={14} className="mr-1" /> Export</Button>
          <Button size="sm" onClick={() => { setFormData(EMPTY_EXERCISE); setCreateOpen(true); }}>
            <Plus size={14} className="mr-1" /> New Exercise
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{s.label}</p>
                <p className="text-3xl font-bold mt-1" style={{ color: 'hsl(var(--text-1))' }}>{s.value}</p>
              </div>
              <s.icon size={28} style={{ color: 'hsl(var(--brand))' }} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Campaign Cards */}
      <div className="grid grid-cols-2 gap-4">
        {exercises.map(e => (
          <Card
            key={e.id}
            className="cursor-pointer"
            style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderLeft: `3px solid ${scoreColor(e.score)}` }}
            onClick={() => setViewItem(e)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{e.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>{e.attackVector}</p>
                </div>
                <Badge style={{ background: statusStyle(e.status).bg, color: statusStyle(e.status).text, border: `1px solid ${statusStyle(e.status).border}`, borderRadius: 0, fontSize: 11 }}>
                  {e.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-xl font-bold" style={{ color: scoreColor(e.score) }}>{e.score}</p>
                  <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Score</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>{e.findings}</p>
                  <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Findings</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold" style={{ color: '#ef4444' }}>{e.criticalFindings}</p>
                  <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Critical</p>
                </div>
                <div className="flex-1">
                  <div style={{ width: '100%', height: 6, background: 'hsl(var(--bg-muted))', borderRadius: 0 }}>
                    <div style={{ width: `${e.score}%`, height: '100%', background: scoreColor(e.score), borderRadius: 0 }} />
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-3))' }}>Lead: {e.lead}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3 justify-end" onClick={ev => ev.stopPropagation()}>
                <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setViewItem(e)}>
                  <Eye size={13} />
                </Button>
                <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setEditItem({ ...e })}>
                  <PencilSimple size={13} />
                </Button>
                <Button size="sm" variant="ghost" style={{ padding: '4px 8px', color: '#ef4444' }} onClick={() => setDeleteItem(e)}>
                  <Trash size={13} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Findings by Attack Vector</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={vectorData}>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: ct.axis }} />
              <YAxis tick={{ fontSize: 11, fill: ct.axis }} allowDecimals={false} label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fill: ct.axis } }} />
              <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }} />
              <Bar dataKey="findings" fill={ct.brand} radius={0} name="Findings" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Search + Filter + Table */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-3))' }} />
          <Input placeholder="Search exercises..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" style={{ borderRadius: 0 }} />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', fontSize: 13, borderRadius: 0 }}>
          <option value="all">All Statuses</option>
          {['active', 'completed', 'planned'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-xs ml-auto" style={{ color: 'hsl(var(--text-3))' }}>{filtered.length} of {exercises.length} exercises</span>
      </div>

      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: 'hsl(var(--text-3))' }}>
              <Sword size={40} />
              <p className="mt-3 text-sm font-medium">No exercises match your filters</p>
            </div>
          ) : (
            <table className="w-full">
              <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                <tr>
                  {['ID', 'Name', 'Attack Vector', 'Status', 'Score', 'Findings', 'Critical', 'Lead', 'Actions'].map(h => (
                    <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr
                    key={e.id}
                    className="cursor-pointer"
                    style={{ borderTop: '1px solid hsl(var(--border))' }}
                    onMouseEnter={ev => (ev.currentTarget.style.background = 'hsl(var(--bg-muted))')}
                    onMouseLeave={ev => (ev.currentTarget.style.background = '')}
                    onClick={() => setViewItem(e)}
                  >
                    <td className="p-3 text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{e.id}</td>
                    <td className="p-3 text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{e.name}</td>
                    <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{e.attackVector}</td>
                    <td className="p-3">
                      <Badge style={{ background: statusStyle(e.status).bg, color: statusStyle(e.status).text, border: `1px solid ${statusStyle(e.status).border}`, borderRadius: 0, fontSize: 11 }}>
                        {e.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <span className="text-sm font-bold" style={{ color: scoreColor(e.score) }}>{e.score}</span>
                    </td>
                    <td className="p-3 text-sm" style={{ color: 'hsl(var(--text-1))' }}>{e.findings}</td>
                    <td className="p-3 text-sm" style={{ color: '#ef4444' }}>{e.criticalFindings}</td>
                    <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{e.lead}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1" onClick={ev => ev.stopPropagation()}>
                        <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setViewItem(e)}><Eye size={14} /></Button>
                        <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setEditItem({ ...e })}><PencilSimple size={14} /></Button>
                        <Button size="sm" variant="ghost" style={{ padding: '4px 8px', color: '#ef4444' }} onClick={() => setDeleteItem(e)}><Trash size={14} /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* View Sheet */}
      <Sheet open={!!viewItem} onOpenChange={o => !o && setViewItem(null)}>
        <SheetContent style={{ width: 520, background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          {viewItem && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>{viewItem.name}</SheetTitle>
                <div className="flex gap-2">
                  <Badge style={{ background: statusStyle(viewItem.status).bg, color: statusStyle(viewItem.status).text, border: `1px solid ${statusStyle(viewItem.status).border}`, borderRadius: 0 }}>
                    {viewItem.status}
                  </Badge>
                  <Badge variant="outline" style={{ borderRadius: 0 }}>Score: {viewItem.score}</Badge>
                </div>
              </SheetHeader>
              <Tabs defaultValue="details">
                <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
                  <TabsTrigger value="details" style={{ borderRadius: 0 }}>Details</TabsTrigger>
                  <TabsTrigger value="findings" style={{ borderRadius: 0 }}>Findings</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="mt-4 space-y-3">
                  {[
                    { label: 'Exercise ID', value: viewItem.id },
                    { label: 'Attack Vector', value: viewItem.attackVector },
                    { label: 'Lead', value: viewItem.lead },
                    { label: 'Target Model', value: viewItem.targetModel || 'All Systems' },
                    { label: 'Start Date', value: viewItem.startDate ? formatDate(viewItem.startDate) : 'TBD' },
                    { label: 'End Date', value: viewItem.endDate ? formatDate(viewItem.endDate) : 'In Progress' },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                      <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                    </div>
                  ))}
                  <p className="text-sm mt-2" style={{ color: 'hsl(var(--text-2))' }}>{viewItem.description}</p>
                </TabsContent>
                <TabsContent value="findings" className="mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4" style={{ border: '1px solid hsl(var(--border))' }}>
                      <p className="text-4xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>{viewItem.findings}</p>
                      <p className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>Total Findings</p>
                    </div>
                    <div className="text-center p-4" style={{ border: '1px solid hsl(var(--border))' }}>
                      <p className="text-4xl font-bold" style={{ color: '#ef4444' }}>{viewItem.criticalFindings}</p>
                      <p className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>Critical</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-2))' }}>Security Score</p>
                    <div style={{ width: '100%', height: 12, background: 'hsl(var(--bg-muted))', borderRadius: 0 }}>
                      <div style={{ width: `${viewItem.score}%`, height: '100%', background: scoreColor(viewItem.score), borderRadius: 0 }} />
                    </div>
                    <div className="flex justify-between text-xs mt-1" style={{ color: 'hsl(var(--text-3))' }}>
                      <span>0 (Fail)</span><span>{viewItem.score}%</span><span>100 (Pass)</span>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              <div className="flex gap-2 mt-6">
                <Button size="sm" onClick={() => { setEditItem({ ...viewItem }); setViewItem(null); }}>
                  <PencilSimple size={14} className="mr-1" /> Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => setViewItem(null)}>Close</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={o => !o && setEditItem(null)}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader><DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Edit Exercise</DialogTitle></DialogHeader>
          {editItem && (
            <div className="space-y-3">
              {[
                { label: 'Name', key: 'name' }, { label: 'Attack Vector', key: 'attackVector' },
                { label: 'Lead', key: 'lead' }, { label: 'Target Model', key: 'targetModel' },
                { label: 'Description', key: 'description' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                  <Input value={(editItem as any)[f.key] || ''} onChange={e => setEditItem(prev => prev ? { ...prev, [f.key]: e.target.value } : null)} style={{ borderRadius: 0 }} />
                </div>
              ))}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Status</label>
                  <select value={editItem.status} onChange={e => setEditItem(prev => prev ? { ...prev, status: e.target.value } : null)}
                    style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                    {['active', 'completed', 'planned'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Score</label>
                  <Input type="number" min={0} max={100} value={editItem.score} onChange={e => setEditItem(prev => prev ? { ...prev, score: parseInt(e.target.value) } : null)} style={{ borderRadius: 0 }} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Findings</label>
                  <Input type="number" min={0} value={editItem.findings} onChange={e => setEditItem(prev => prev ? { ...prev, findings: parseInt(e.target.value) } : null)} style={{ borderRadius: 0 }} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleEdit} style={{ borderRadius: 0 }}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader><DialogTitle style={{ color: 'hsl(var(--text-1))' }}>New Red Team Exercise</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {[
              { label: 'Name', key: 'name' }, { label: 'Attack Vector', key: 'attackVector' },
              { label: 'Lead', key: 'lead' }, { label: 'Target Model', key: 'targetModel' },
              { label: 'Description', key: 'description' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                <Input value={(formData as any)[f.key] || ''} onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Start Date</label>
                <Input type="date" value={formData.startDate} onChange={e => setFormData(prev => ({ ...prev, startDate: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Status</label>
                <select value={formData.status} onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                  {['active', 'completed', 'planned'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleCreate} style={{ borderRadius: 0 }} disabled={!formData.name}>Create Exercise</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={o => !o && setDeleteItem(null)}>
        <AlertDialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Delete Exercise</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteItem?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} style={{ background: '#ef4444', borderRadius: 0 }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
