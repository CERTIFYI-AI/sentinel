import { useState } from 'react';
import { Link } from 'react-router-dom';
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
  Target, Warning, Flag, Globe, Clock, Plus, Eye, PencilSimple, Trash, CheckSquare,
} from '@phosphor-icons/react';
import { REGULATIONS, Regulation, Severity, severityColor, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';

const TODAY = new Date();

const EMPTY_REG: Omit<Regulation, 'id'> = {
  name: '', jurisdiction: '', impact: 'medium', effectiveDate: '',
  status: 'monitoring', description: '', actionItems: [], daysUntilEffective: 0,
};

function getDaysLabel(days: number): { label: string; color: string } {
  if (days < 0) return { label: `${Math.abs(days)} days overdue`, color: '#ef4444' };
  if (days === 0) return { label: 'Effective today', color: '#ef4444' };
  if (days <= 30) return { label: `${days} days remaining`, color: '#f97316' };
  return { label: `${days} days remaining`, color: '#10b981' };
}

function statusBadge(status: string) {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    preparing: { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--s-wn-br))' },
    effective: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' },
    monitoring: { bg: 'hsl(var(--s-in-bg))', text: 'hsl(var(--s-in-tx))', border: 'hsl(var(--s-in-br))' },
  };
  return map[status] || map['monitoring'];
}

export default function RegRadar() {
  const { orgName } = useSettingsStore();

  const [regulations, setRegulations] = useState<Regulation[]>(REGULATIONS);
  const [filterImpact, setFilterImpact] = useState('all');
  const [filterJurisdiction, setFilterJurisdiction] = useState('all');

  const [viewItem, setViewItem] = useState<Regulation | null>(null);
  const [editItem, setEditItem] = useState<Regulation | null>(null);
  const [deleteItem, setDeleteItem] = useState<Regulation | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<Regulation, 'id'>>(EMPTY_REG);

  const jurisdictions = Array.from(new Set(regulations.map(r => r.jurisdiction)));
  const overdueActions = regulations.filter(r => r.daysUntilEffective < 0 && r.status !== 'effective').length;
  const criticalImpact = regulations.filter(r => r.impact === 'critical').length;

  const filtered = regulations.filter(r => {
    const matchImpact = filterImpact === 'all' || r.impact === filterImpact;
    const matchJurisdiction = filterJurisdiction === 'all' || r.jurisdiction === filterJurisdiction;
    return matchImpact && matchJurisdiction;
  });

  const stats = [
    { label: 'Total Regulations', value: regulations.length, icon: Target, color: '#6366f1' },
    { label: 'Critical Impact', value: criticalImpact, icon: Warning, color: '#ef4444' },
    { label: 'Overdue Actions', value: overdueActions, icon: Clock, color: '#f97316' },
    { label: 'Jurisdictions', value: jurisdictions.length, icon: Globe, color: '#3b82f6' },
  ];

  // Sort: overdue first, then by days remaining ascending
  const sorted = [...filtered].sort((a, b) => a.daysUntilEffective - b.daysUntilEffective);

  function handleCreate() {
    const id = `REG-${String(regulations.length + 1).padStart(3, '0')}`;
    const effectiveDate = formData.effectiveDate;
    const days = effectiveDate
      ? Math.ceil((new Date(effectiveDate).getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    setRegulations(prev => [...prev, { ...formData, id, daysUntilEffective: days }]);
    setCreateOpen(false);
    setFormData(EMPTY_REG);
  }

  function handleEdit() {
    if (!editItem) return;
    const days = editItem.effectiveDate
      ? Math.ceil((new Date(editItem.effectiveDate).getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24))
      : editItem.daysUntilEffective;
    setRegulations(prev => prev.map(r => r.id === editItem.id ? { ...editItem, daysUntilEffective: days } : r));
    setEditItem(null);
  }

  function handleDelete() {
    if (!deleteItem) return;
    setRegulations(prev => prev.filter(r => r.id !== deleteItem.id));
    setDeleteItem(null);
  }

  const selectStyle = {
    background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))',
    color: 'hsl(var(--text-1))', padding: '6px 10px', fontSize: 13, borderRadius: 0,
  };

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Breadcrumb */}
      <div className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>
        <Link to="/governance" style={{ color: 'hsl(var(--text-3))', textDecoration: 'none' }}>Governance</Link>
        <span className="mx-1">›</span>
        <span style={{ color: 'hsl(var(--text-1))' }}>Regulatory Radar</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Regulatory Radar</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · Track incoming regulations and compliance deadlines
          </p>
        </div>
        <Button size="sm" onClick={() => { setFormData(EMPTY_REG); setCreateOpen(true); }}>
          <Plus size={14} className="mr-1" /> Add Regulation
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{s.label}</p>
                <p className="text-3xl font-bold mt-1" style={{ color: 'hsl(var(--text-1))' }}>{s.value}</p>
              </div>
              <s.icon size={28} style={{ color: s.color }} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters — jurisdiction separate from impact */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-2))' }}>Impact:</span>
          <select value={filterImpact} onChange={e => setFilterImpact(e.target.value)} style={selectStyle}>
            <option value="all">All Impact Levels</option>
            {['critical', 'high', 'medium', 'low'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-2))' }}>Jurisdiction:</span>
          <select value={filterJurisdiction} onChange={e => setFilterJurisdiction(e.target.value)} style={selectStyle}>
            <option value="all">All Jurisdictions</option>
            {jurisdictions.map(j => <option key={j} value={j}>{j}</option>)}
          </select>
        </div>
        <span className="text-xs ml-auto" style={{ color: 'hsl(var(--text-3))' }}>
          {filtered.length} of {regulations.length} regulations
        </span>
      </div>

      {/* Timeline */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Regulatory Timeline</CardTitle>
          <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>
            Today: {TODAY.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </CardHeader>
        <CardContent>
          {/* Timeline horizontal bar */}
          <div className="relative mb-6">
            <div className="h-0.5 w-full" style={{ background: 'hsl(var(--border))' }} />
            {/* Today marker */}
            <div className="absolute top-0 left-0 -translate-y-1/2" style={{ left: '0%' }}>
              <div className="w-3 h-3 rounded-full border-2" style={{ background: '#ef4444', borderColor: '#ef4444' }} />
              <span className="text-xs font-bold absolute top-4 -translate-x-1/2" style={{ color: '#ef4444', whiteSpace: 'nowrap' }}>TODAY</span>
            </div>
          </div>

          {/* Regulation items */}
          <div className="space-y-3 mt-4">
            {sorted.map(reg => {
              const sc = severityColor(reg.impact);
              const dayInfo = getDaysLabel(reg.daysUntilEffective);
              const sb = statusBadge(reg.status);
              const isOverdue = reg.daysUntilEffective < 0;

              return (
                <div
                  key={reg.id}
                  className="flex items-start gap-4 p-4 cursor-pointer"
                  style={{
                    border: `1px solid ${isOverdue ? '#ef444444' : 'hsl(var(--border))'}`,
                    background: isOverdue ? 'hsl(var(--s-er-bg))' : 'hsl(var(--bg-muted))',
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  onClick={() => setViewItem(reg)}
                >
                  {/* Left: severity dot */}
                  <div className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0" style={{ background: sc.text }} />

                  {/* Middle: info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{reg.name}</p>
                      <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 10 }}>
                        {reg.impact}
                      </Badge>
                      <Badge style={{ background: sb.bg, color: sb.text, border: `1px solid ${sb.border}`, borderRadius: 0, fontSize: 10 }}>
                        {reg.status}
                      </Badge>
                    </div>
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'hsl(var(--text-3))' }}>{reg.description}</p>
                    <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                      <span className="text-xs flex items-center gap-1" style={{ color: 'hsl(var(--text-3))' }}>
                        <Globe size={11} /> {reg.jurisdiction}
                      </span>
                      <span className="text-xs flex items-center gap-1" style={{ color: 'hsl(var(--text-3))' }}>
                        <Clock size={11} /> Effective: {formatDate(reg.effectiveDate)}
                      </span>
                      <span className="text-xs font-semibold" style={{ color: dayInfo.color }}>
                        {dayInfo.label}
                      </span>
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setViewItem(reg)}>
                      <Eye size={14} />
                    </Button>
                    <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setEditItem({ ...reg })}>
                      <PencilSimple size={14} />
                    </Button>
                    <Button size="sm" variant="ghost" style={{ padding: '4px 8px', color: '#ef4444' }} onClick={() => setDeleteItem(reg)}>
                      <Trash size={14} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!viewItem} onOpenChange={o => !o && setViewItem(null)}>
        <SheetContent style={{ width: 560, background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          {viewItem && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>{viewItem.name}</SheetTitle>
                <div className="flex gap-2 flex-wrap">
                  {(() => {
                    const sc = severityColor(viewItem.impact);
                    const dayInfo = getDaysLabel(viewItem.daysUntilEffective);
                    return (
                      <>
                        <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0 }}>
                          {viewItem.impact} impact
                        </Badge>
                        <Badge variant="outline" style={{ borderRadius: 0, color: dayInfo.color, borderColor: dayInfo.color }}>
                          {dayInfo.label}
                        </Badge>
                      </>
                    );
                  })()}
                </div>
              </SheetHeader>

              <Tabs defaultValue="overview">
                <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
                  <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
                  <TabsTrigger value="actions" style={{ borderRadius: 0 }}>Action Items</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4 space-y-3">
                  <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{viewItem.description}</p>
                  {[
                    { label: 'Regulation ID', value: viewItem.id },
                    { label: 'Jurisdiction', value: viewItem.jurisdiction },
                    { label: 'Impact Level', value: viewItem.impact },
                    { label: 'Status', value: viewItem.status },
                    { label: 'Effective Date', value: formatDate(viewItem.effectiveDate) },
                    { label: 'Days Remaining', value: getDaysLabel(viewItem.daysUntilEffective).label },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                      <span className="text-sm font-medium" style={{ color: r.label === 'Days Remaining' ? getDaysLabel(viewItem.daysUntilEffective).color : 'hsl(var(--text-1))' }}>
                        {r.value}
                      </span>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="actions" className="mt-4">
                  <p className="text-xs font-semibold mb-3" style={{ color: 'hsl(var(--text-2))' }}>Required Action Items</p>
                  <ul className="space-y-2">
                    {viewItem.actionItems.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 p-2" style={{ border: '1px solid hsl(var(--border))' }}>
                        <CheckSquare size={14} style={{ color: 'hsl(var(--brand))', marginTop: 2, flexShrink: 0 }} />
                        <span className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
                    <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                      {viewItem.actionItems.length} action items · Deadline: {formatDate(viewItem.effectiveDate)}
                    </p>
                  </div>
                  <Link to={`/reg-radar/${viewItem.id}`} className="block mt-4">
                    <Button size="sm" variant="outline" style={{ borderRadius: 0, width: '100%' }}>
                      View Full Detail Page
                    </Button>
                  </Link>
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
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Edit Regulation</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-3">
              {[
                { label: 'Name', key: 'name' },
                { label: 'Jurisdiction', key: 'jurisdiction' },
                { label: 'Description', key: 'description' },
                { label: 'Effective Date', key: 'effectiveDate', type: 'date' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                  <Input type={f.type || 'text'} value={(editItem as any)[f.key] || ''} onChange={e => setEditItem(prev => prev ? { ...prev, [f.key]: e.target.value } : null)} style={{ borderRadius: 0 }} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Impact</label>
                  <select value={editItem.impact} onChange={e => setEditItem(prev => prev ? { ...prev, impact: e.target.value as Severity } : null)}
                    style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                    {['critical', 'high', 'medium', 'low'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Status</label>
                  <select value={editItem.status} onChange={e => setEditItem(prev => prev ? { ...prev, status: e.target.value } : null)}
                    style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                    {['monitoring', 'preparing', 'effective'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
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
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Add Regulation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {[
              { label: 'Name', key: 'name' },
              { label: 'Jurisdiction', key: 'jurisdiction' },
              { label: 'Description', key: 'description' },
              { label: 'Effective Date', key: 'effectiveDate', type: 'date' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                <Input type={f.type || 'text'} value={(formData as any)[f.key] || ''} onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Impact</label>
              <select value={formData.impact} onChange={e => setFormData(prev => ({ ...prev, impact: e.target.value as Severity }))}
                style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                {['critical', 'high', 'medium', 'low'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!formData.name} style={{ borderRadius: 0 }}>Add Regulation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={o => !o && setDeleteItem(null)}>
        <AlertDialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Delete Regulation</AlertDialogTitle>
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
