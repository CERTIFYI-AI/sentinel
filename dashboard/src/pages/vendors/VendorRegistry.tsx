import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, PencilSimple, Trash, Plus, Buildings, CheckCircle, Warning, XCircle, Export
} from '@phosphor-icons/react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Progress } from '../../components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { VENDORS, severityColor, statusColor, formatDate, MODELS } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <Card className="p-4 flex items-start gap-3">
      <div className="mt-0.5 text-[hsl(var(--brand))]">{icon}</div>
      <div>
        <div className="text-2xl font-bold text-[hsl(var(--text-1))]">{value}</div>
        <div className="text-xs text-[hsl(var(--text-4))] mt-0.5">{label}</div>
      </div>
    </Card>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? '#22c55e' : value >= 65 ? '#f59e0b' : '#ef4444';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[hsl(var(--text-3))]">{label}</span>
        <span className="font-medium" style={{ color }}>{value}</span>
      </div>
      <div className="h-1.5 bg-[hsl(var(--border))]">
        <div className="h-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

export default function VendorRegistry() {
  const orgName = useSettingsStore(s => s.orgName);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selected, setSelected] = useState<typeof VENDORS[0] | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<typeof VENDORS[0] | null>(null);
  const [vendors, setVendors] = useState(VENDORS);
  const [editForm, setEditForm] = useState({ name: '', contact: '', category: '' });

  const stats = {
    total: vendors.length,
    approved: vendors.filter(v => v.status === 'approved').length,
    inReview: vendors.filter(v => v.status === 'in_review').length,
    highRisk: vendors.filter(v => v.status === 'high_risk' || v.risk === 'high').length,
  };

  const filtered = vendors.filter(v => {
    const q = search.toLowerCase();
    const matchSearch = !q || v.name.toLowerCase().includes(q) || v.id.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || v.status === statusFilter;
    const matchCat = categoryFilter === 'all' || v.category === categoryFilter;
    return matchSearch && matchStatus && matchCat;
  });

  const categories = [...new Set(VENDORS.map(v => v.category))];

  const handleEdit = (v: typeof VENDORS[0]) => {
    setEditForm({ name: v.name, contact: v.contact, category: v.category });
    setSelected(v);
    setEditOpen(true);
  };

  const handleSaveEdit = () => {
    setVendors(prev => prev.map(v => v.id === selected?.id ? { ...v, ...editForm } : v));
    setEditOpen(false);
  };

  const handleDelete = () => {
    if (deleteTarget) {
      setVendors(prev => prev.filter(v => v.id !== deleteTarget.id));
      setDeleteTarget(null);
      if (selected?.id === deleteTarget.id) setSelected(null);
    }
  };

  const handleExport = () => {
    const csv = [
      ['ID', 'Name', 'Category', 'Risk', 'Score', 'Status', 'DPA Status', 'Last Review', 'Contact'],
      ...vendors.map(v => [v.id, v.name, v.category, v.risk, v.score, v.status, v.dpaStatus, v.lastReview, v.contact]),
    ].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'vendors.csv'; a.click();
  };

  const scoreColor = (s: number) => s >= 80 ? '#22c55e' : s >= 65 ? '#f59e0b' : '#ef4444';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))]">Vendor Registry</h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">{orgName} — AI vendor risk assessment and DPA management</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Export size={16} /> Export
          </Button>
          <Button className="gap-2">
            <Plus size={16} /> Register Vendor
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={<Buildings size={20} />} value={stats.total} label="Total Vendors" />
        <StatCard icon={<CheckCircle size={20} />} value={stats.approved} label="Approved" />
        <StatCard icon={<Warning size={20} />} value={stats.inReview} label="In Review" />
        <StatCard icon={<XCircle size={20} />} value={stats.highRisk} label="High Risk" />
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Input placeholder="Search vendors..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="high_risk">High Risk</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--border))]">
                {['ID', 'Name', 'Category', 'Risk', 'Score', 'Status', 'DPA Status', 'Last Review', 'Contact', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[hsl(var(--text-4))] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => {
                const rc = severityColor(v.risk);
                const sc = statusColor(v.status);
                const dpaColor = statusColor(v.dpaStatus);
                return (
                  <tr key={v.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-surface))/50] transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--text-4))]">{v.id}</td>
                    <td className="px-4 py-3 font-medium text-[hsl(var(--text-1))]">{v.name}</td>
                    <td className="px-4 py-3 text-[hsl(var(--text-3))]">{v.category}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-xs" style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}` }}>{v.risk}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <div className="flex-1 h-1.5 bg-[hsl(var(--border))]">
                          <div className="h-full" style={{ width: `${v.score}%`, background: scoreColor(v.score) }} />
                        </div>
                        <span className="text-xs font-medium w-6" style={{ color: scoreColor(v.score) }}>{v.score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-xs" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>{v.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-xs" style={{ background: dpaColor.bg, color: dpaColor.text, border: `1px solid ${dpaColor.border}` }}>{v.dpaStatus}</span>
                    </td>
                    <td className="px-4 py-3 text-[hsl(var(--text-4))] text-xs">{formatDate(v.lastReview)}</td>
                    <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))]">{v.contact}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelected(v)}>
                          <Eye size={14} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(v)}>
                          <PencilSimple size={14} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => setDeleteTarget(v)}>
                          <Trash size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!selected && !editOpen} onOpenChange={o => { if (!o) setSelected(null); }}>
        <SheetContent className="w-[640px] max-w-full overflow-y-auto" side="right">
          {selected && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2">
                  <Buildings size={18} /> {selected.name}
                  <span className="font-mono text-xs text-[hsl(var(--text-4))]">{selected.id}</span>
                </SheetTitle>
                <p className="text-sm text-[hsl(var(--text-4))]">{selected.description}</p>
              </SheetHeader>

              {selected.dpaStatus !== 'signed' && (
                <div className="mb-4 border border-red-700 bg-red-950/30 p-3 flex items-center gap-2 text-sm text-red-300">
                  <Warning size={16} className="text-red-400 shrink-0" />
                  DPA not signed for this vendor. Data processing may be non-compliant.
                </div>
              )}

              <Tabs defaultValue="scorecard">
                <TabsList className="mb-4">
                  <TabsTrigger value="scorecard">Scorecard</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                </TabsList>
                <TabsContent value="scorecard" className="space-y-4">
                  <div className="text-center mb-4">
                    <div className="text-4xl font-bold" style={{ color: scoreColor(selected.score) }}>{selected.score}</div>
                    <div className="text-xs text-[hsl(var(--text-4))] mt-1">Overall Vendor Risk Score</div>
                  </div>
                  <div className="space-y-4 p-4 bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border))]">
                    <ScoreBar label="Security Controls" value={selected.scoreBreakdown.security} />
                    <ScoreBar label="Compliance Coverage" value={selected.scoreBreakdown.compliance} />
                    <ScoreBar label="Service Reliability" value={selected.scoreBreakdown.reliability} />
                    <ScoreBar label="Data Privacy" value={selected.scoreBreakdown.dataPrivacy} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['DPA Status', selected.dpaStatus], ['Category', selected.category],
                      ['Last Review', formatDate(selected.lastReview)], ['Contact', selected.contact],
                    ].map(([k, v]) => (
                      <div key={k} className="bg-[hsl(var(--bg-surface))] p-3 border border-[hsl(var(--border))]">
                        <div className="text-xs text-[hsl(var(--text-4))]">{k}</div>
                        <div className="text-sm font-medium text-[hsl(var(--text-1))] mt-0.5">{v}</div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="details" className="space-y-4">
                  <div>
                    <div className="text-xs font-medium text-[hsl(var(--text-4))] mb-2 uppercase tracking-wide">Linked Models</div>
                    {selected.linkedModels.length > 0 ? (
                      <div className="space-y-2">
                        {selected.linkedModels.map(mid => {
                          const m = MODELS.find(x => x.id === mid);
                          return m ? (
                            <div key={mid} className="p-3 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))]">
                              <div className="text-sm font-medium text-[hsl(var(--text-1))]">{m.name}</div>
                              <div className="text-xs text-[hsl(var(--text-4))] mt-0.5">{mid} · {m.type}</div>
                            </div>
                          ) : null;
                        })}
                      </div>
                    ) : <div className="text-sm text-[hsl(var(--text-4))]">No linked models.</div>}
                  </div>
                  <div>
                    <div className="text-xs font-medium text-[hsl(var(--text-4))] mb-2 uppercase tracking-wide">Website</div>
                    <a href={`https://${selected.website}`} target="_blank" rel="noopener noreferrer" className="text-sm text-[hsl(var(--brand))] hover:underline">{selected.website}</a>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Vendor — {selected?.id}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {(['name', 'contact', 'category'] as const).map(field => (
              <div key={field}>
                <label className="text-xs text-[hsl(var(--text-4))] capitalize">{field}</label>
                <Input value={editForm[field]} onChange={e => setEditForm(p => ({ ...p, [field]: e.target.value }))} className="mt-1" />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
