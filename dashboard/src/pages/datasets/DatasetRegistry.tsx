import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, PencilSimple, Trash, Plus, Database, ShieldCheck, Warning, XCircle, Lock
} from '@phosphor-icons/react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { DATASETS, MODELS, severityColor, statusColor, formatDate, formatNumber } from '../../data/seed';
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

const sensitivityColor: Record<string, string> = {
  PII: 'bg-red-900/30 text-red-400 border-red-700',
  PHI: 'bg-purple-900/30 text-purple-400 border-purple-700',
  confidential: 'bg-orange-900/30 text-orange-400 border-orange-700',
  internal: 'bg-blue-900/30 text-blue-400 border-blue-700',
  public: 'bg-green-900/30 text-green-400 border-green-700',
};

// Mock schema for detail view
const mockSchema: Record<string, { column: string; type: string; pii: boolean; description: string }[]> = {
  'DS-001': [
    { column: 'applicant_id', type: 'UUID', pii: false, description: 'Anonymous applicant identifier' },
    { column: 'credit_score', type: 'INT', pii: false, description: 'Credit bureau score 300-850' },
    { column: 'annual_income', type: 'DECIMAL', pii: true, description: 'Self-reported annual income (PII)' },
    { column: 'zip_code', type: 'VARCHAR(10)', pii: true, description: 'Geographic proxy for protected class (PII)' },
    { column: 'loan_amount', type: 'DECIMAL', pii: false, description: 'Requested loan amount' },
    { column: 'default_flag', type: 'BOOLEAN', pii: false, description: 'Historical default indicator' },
  ],
};

export default function DatasetRegistry() {
  const orgName = useSettingsStore(s => s.orgName);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sensitFilter, setSensitFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [selected, setSelected] = useState<typeof DATASETS[0] | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<typeof DATASETS[0] | null>(null);
  const [datasets, setDatasets] = useState(DATASETS);
  const [editForm, setEditForm] = useState({ name: '', owner: '', retentionPolicy: '' });

  const stats = {
    total: datasets.length,
    pii: datasets.filter(d => d.sensitivity === 'PII' || d.sensitivity === 'PHI').length,
    critical: datasets.filter(d => d.risk === 'critical').length,
    needsAudit: datasets.filter(d => d.status === 'under_review').length,
  };

  const filtered = datasets.filter(d => {
    const q = search.toLowerCase();
    const matchSearch = !q || d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q);
    const matchSensit = sensitFilter === 'all' || d.sensitivity === sensitFilter;
    const matchRisk = riskFilter === 'all' || d.risk === riskFilter;
    return matchSearch && matchSensit && matchRisk;
  });

  const handleEdit = (d: typeof DATASETS[0]) => {
    setEditForm({ name: d.name, owner: d.owner, retentionPolicy: d.retentionPolicy });
    setSelected(d);
    setEditOpen(true);
  };

  const handleSaveEdit = () => {
    setDatasets(prev => prev.map(d => d.id === selected?.id ? { ...d, ...editForm } : d));
    setEditOpen(false);
  };

  const handleDelete = () => {
    if (deleteTarget) {
      setDatasets(prev => prev.filter(d => d.id !== deleteTarget.id));
      setDeleteTarget(null);
      if (selected?.id === deleteTarget.id) setSelected(null);
    }
  };

  const linkedModel = (linkedId: string) => MODELS.find(m => m.id === linkedId);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))]">Dataset Registry</h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">{orgName} — Training data governance and lineage tracking</p>
        </div>
        <Button className="gap-2">
          <Plus size={16} /> Register Dataset
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={<Database size={20} />} value={stats.total} label="Total Datasets" />
        <StatCard icon={<Lock size={20} />} value={stats.pii} label="PII / PHI Datasets" />
        <StatCard icon={<XCircle size={20} />} value={stats.critical} label="Critical Risk" />
        <StatCard icon={<Warning size={20} />} value={stats.needsAudit} label="Needs Re-Audit" />
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Input placeholder="Search datasets..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={sensitFilter} onValueChange={setSensitFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Sensitivity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="PII">PII</SelectItem>
            <SelectItem value="confidential">Confidential</SelectItem>
            <SelectItem value="internal">Internal</SelectItem>
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
                {['ID', 'Name', 'Sensitivity', 'Classification', 'Risk', 'Records', 'Linked Model', 'Encryption', 'Status', 'Last Audit', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[hsl(var(--text-4))] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => {
                const rc = severityColor(d.risk);
                const sc = statusColor(d.status);
                const model = linkedModel(d.linkedModel);
                return (
                  <tr key={d.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-surface))/50] transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--text-4))]">{d.id}</td>
                    <td className="px-4 py-3 font-medium text-[hsl(var(--text-1))]">{d.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs border ${sensitivityColor[d.sensitivity] || 'text-[hsl(var(--text-3))] border-[hsl(var(--border))]'}`}>{d.sensitivity}</span>
                    </td>
                    <td className="px-4 py-3 text-[hsl(var(--text-3))]">{d.classification}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-xs" style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}` }}>{d.risk}</span>
                    </td>
                    <td className="px-4 py-3 text-[hsl(var(--text-3))]">{formatNumber(d.records)}</td>
                    <td className="px-4 py-3 text-[hsl(var(--text-3))] text-xs">{model ? `${model.name}` : '—'}</td>
                    <td className="px-4 py-3 text-[hsl(var(--text-3))]">{d.encryption}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-xs" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>{d.status}</span>
                    </td>
                    <td className="px-4 py-3 text-[hsl(var(--text-4))] text-xs">{formatDate(d.lastAudit)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigate(`/datasets/${d.id}`)}>
                          <Eye size={14} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(d)}>
                          <PencilSimple size={14} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => setDeleteTarget(d)}>
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
        <SheetContent className="w-[680px] max-w-full overflow-y-auto" side="right">
          {selected && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2">
                  <Database size={18} /> {selected.name}
                  <span className="font-mono text-xs text-[hsl(var(--text-4))]">{selected.id}</span>
                </SheetTitle>
                <p className="text-sm text-[hsl(var(--text-4))]">{selected.description}</p>
              </SheetHeader>
              <Tabs defaultValue="schema">
                <TabsList className="mb-4">
                  <TabsTrigger value="schema">Schema</TabsTrigger>
                  <TabsTrigger value="linked">Linked Models</TabsTrigger>
                </TabsList>
                <TabsContent value="schema" className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      ['Owner', selected.owner], ['Encryption', selected.encryption],
                      ['Retention', selected.retentionPolicy], ['Records', formatNumber(selected.records)],
                      ['Classification', selected.classification], ['Last Audit', formatDate(selected.lastAudit)],
                    ].map(([k, v]) => (
                      <div key={k} className="bg-[hsl(var(--bg-surface))] p-3 border border-[hsl(var(--border))]">
                        <div className="text-xs text-[hsl(var(--text-4))]">{k}</div>
                        <div className="text-sm font-medium text-[hsl(var(--text-1))] mt-0.5">{v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs font-medium text-[hsl(var(--text-4))] mb-2 uppercase tracking-wide">Column Schema</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[hsl(var(--border))]">
                          {['Column', 'Type', 'PII', 'Description'].map(h => (
                            <th key={h} className="text-left px-3 py-2 text-xs font-medium text-[hsl(var(--text-4))]">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(mockSchema[selected.id] || mockSchema['DS-001']).map(row => (
                          <tr key={row.column} className="border-b border-[hsl(var(--border))]">
                            <td className="px-3 py-2 font-mono text-xs text-[hsl(var(--text-1))]">{row.column}</td>
                            <td className="px-3 py-2 text-xs text-[hsl(var(--text-3))]">{row.type}</td>
                            <td className="px-3 py-2">
                              {row.pii && <span className="px-1.5 py-0.5 text-xs bg-red-900/30 text-red-400 border border-red-700">PII</span>}
                            </td>
                            <td className="px-3 py-2 text-xs text-[hsl(var(--text-4))]">{row.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
                <TabsContent value="linked" className="space-y-3">
                  {selected.linkedModel ? (
                    (() => {
                      const model = linkedModel(selected.linkedModel);
                      return model ? (
                        <div className="border border-[hsl(var(--border))] p-4 bg-[hsl(var(--bg-surface))]">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-[hsl(var(--text-1))]">{model.name}</div>
                              <div className="text-xs text-[hsl(var(--text-4))] mt-0.5">{model.id} · {model.type}</div>
                              <div className="text-xs text-[hsl(var(--text-3))] mt-1">{model.description}</div>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => navigate('/models/inventory')}>View Model</Button>
                          </div>
                        </div>
                      ) : null;
                    })()
                  ) : (
                    <div className="text-sm text-[hsl(var(--text-4))]">No linked models for this dataset.</div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Dataset — {selected?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {(['name', 'owner', 'retentionPolicy'] as const).map(field => (
              <div key={field}>
                <label className="text-xs text-[hsl(var(--text-4))] capitalize">{field.replace(/([A-Z])/g, ' $1')}</label>
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
            <AlertDialogTitle>Delete Dataset</AlertDialogTitle>
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
