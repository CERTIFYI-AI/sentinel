import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, PencilSimple, Trash, Plus, Robot, Warning, ShieldSlash, ScanSmiley,
  CheckCircle, Spinner, Globe
} from '@phosphor-icons/react';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { AGENTS, severityColor, statusColor, formatDate, formatNumber } from '../../data/seed';
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

export default function AgentDiscovery() {
  const orgName = useSettingsStore(s => s.orgName);
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<typeof AGENTS[0] | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<typeof AGENTS[0] | null>(null);
  const [agents, setAgents] = useState(AGENTS);
  const [scanning, setScanning] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', owner: '', department: '' });

  const stats = {
    total: agents.length,
    confirmed: agents.filter(a => a.status === 'confirmed').length,
    shadow: agents.filter(a => a.status === 'shadow').length,
    highRisk: agents.filter(a => a.risk === 'high' || a.risk === 'critical').length,
  };

  const filtered = agents.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q || a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q) || a.owner.toLowerCase().includes(q);
    const matchRisk = riskFilter === 'all' || a.risk === riskFilter;
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchRisk && matchStatus;
  });

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => setScanning(false), 2500);
  };

  const handleEdit = (a: typeof AGENTS[0]) => {
    setEditForm({ name: a.name, owner: a.owner, department: a.department });
    setSelected(a);
    setEditOpen(true);
  };

  const handleSaveEdit = () => {
    setAgents(prev => prev.map(a => a.id === selected?.id ? { ...a, ...editForm } : a));
    setEditOpen(false);
  };

  const handleDelete = () => {
    if (deleteTarget) {
      setAgents(prev => prev.filter(a => a.id !== deleteTarget.id));
      setDeleteTarget(null);
      if (selected?.id === deleteTarget.id) setSelected(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))]">Agent Discovery</h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">{orgName} — AI agent discovery, classification, and risk management</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleScan} disabled={scanning}>
            {scanning ? <Spinner size={16} className="animate-spin" /> : <ScanSmiley size={16} />}
            {scanning ? 'Scanning...' : 'Scan Network'}
          </Button>
          <Button className="gap-2">
            <Plus size={16} /> Register Agent
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={<Robot size={20} />} value={stats.total} label="Total Agents" />
        <StatCard icon={<CheckCircle size={20} />} value={stats.confirmed} label="Confirmed" />
        <StatCard icon={<ShieldSlash size={20} />} value={stats.shadow} label="Shadow Agents" />
        <StatCard icon={<Warning size={20} />} value={stats.highRisk} label="High Risk" />
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Input
          placeholder="Search agents..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="shadow">Shadow</SelectItem>
            <SelectItem value="quarantined">Quarantined</SelectItem>
          </SelectContent>
        </Select>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Risk" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risks</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--border))]">
                {['ID', 'Name', 'Type', 'Model', 'Owner', 'Department', 'Status', 'Risk', 'API Calls 7d', 'First Seen', 'Last Active', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[hsl(var(--text-4))] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => {
                const isShadow = a.status === 'shadow';
                const sc = statusColor(a.status);
                const rc = severityColor(a.risk);
                return (
                  <tr key={a.id} className={`border-b border-[hsl(var(--border))] transition-colors ${isShadow ? 'bg-red-950/20 hover:bg-red-950/30' : 'hover:bg-[hsl(var(--bg-surface))/50]'}`}>
                    <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--text-4))]">{a.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {isShadow && <ShieldSlash size={13} className="text-red-400" />}
                        <span className={`font-medium ${isShadow ? 'text-red-300' : 'text-[hsl(var(--text-1))]'}`}>{a.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[hsl(var(--text-3))]">{a.type}</td>
                    <td className="px-4 py-3 text-[hsl(var(--text-3))]">{a.model}</td>
                    <td className="px-4 py-3 text-[hsl(var(--text-3))]">{a.owner}</td>
                    <td className="px-4 py-3 text-[hsl(var(--text-3))]">{a.department}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-xs" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>{a.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-xs" style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}` }}>{a.risk}</span>
                    </td>
                    <td className="px-4 py-3 text-[hsl(var(--text-3))]">{formatNumber(a.apiCalls7d)}</td>
                    <td className="px-4 py-3 text-[hsl(var(--text-4))] text-xs">{formatDate(a.firstSeen)}</td>
                    <td className="px-4 py-3 text-[hsl(var(--text-4))] text-xs">{formatDate(a.lastActive)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigate(`/agents/${a.id}`)}>
                          <Eye size={14} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(a)}>
                          <PencilSimple size={14} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => setDeleteTarget(a)}>
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
        <SheetContent className="w-[600px] max-w-full overflow-y-auto" side="right">
          {selected && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2">
                  <Robot size={18} /> {selected.name}
                  <span className="font-mono text-xs text-[hsl(var(--text-4))]">{selected.id}</span>
                </SheetTitle>
                <p className="text-sm text-[hsl(var(--text-4))]">{selected.description}</p>
              </SheetHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Type', selected.type], ['Model', selected.model],
                    ['Owner', selected.owner], ['Department', selected.department],
                    ['Status', selected.status], ['Risk', selected.risk],
                    ['API Calls 7d', formatNumber(selected.apiCalls7d)],
                    ['First Seen', formatDate(selected.firstSeen)],
                    ['Last Active', formatDate(selected.lastActive)],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-[hsl(var(--bg-surface))] p-3 border border-[hsl(var(--border))]">
                      <div className="text-xs text-[hsl(var(--text-4))]">{k}</div>
                      <div className="text-sm font-medium text-[hsl(var(--text-1))] mt-0.5">{v}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-xs font-medium text-[hsl(var(--text-4))] mb-2 uppercase tracking-wide">Data Access</div>
                  <div className="flex flex-wrap gap-2">
                    {selected.dataAccess.map(d => (
                      <span key={d} className="px-2 py-0.5 text-xs bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border))] text-[hsl(var(--text-3))]">{d}</span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={() => navigate(`/agents/${selected.id}`)}>
                    View Full Detail
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleEdit(selected)}>
                    <PencilSimple size={14} className="mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-400" onClick={() => setDeleteTarget(selected)}>
                    <Trash size={14} className="mr-1" /> Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Agent — {selected?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {(['name', 'owner', 'department'] as const).map(field => (
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
            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
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
