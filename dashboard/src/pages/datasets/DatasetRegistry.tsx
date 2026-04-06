import { useState, useCallback } from 'react';
import {
  Eye, PencilSimple, Trash, Plus, Database, MagnifyingGlass, Funnel,
  Warning, CheckCircle, ShieldWarning, Lock, CalendarBlank, ListChecks,
} from '@phosphor-icons/react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  DATASETS, Dataset, MODELS, severityColor, statusColor, formatDate, formatNumber,
} from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';

// ── Helpers ───────────────────────────────────────────────────────────────────

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

function isAuditOverdue(lastAudit: string): boolean {
  if (!lastAudit) return true;
  const auditDate = new Date(lastAudit);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - auditDate.getTime()) / (1000 * 60 * 60 * 24));
  return daysDiff > 90;
}

function daysSinceAudit(lastAudit: string): number {
  if (!lastAudit) return 999;
  return Math.floor((new Date().getTime() - new Date(lastAudit).getTime()) / (1000 * 60 * 60 * 24));
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function DatasetRegistry() {
  const { orgName } = useSettingsStore();
  const [datasets, setDatasets] = useState<Dataset[]>(DATASETS);
  const [search, setSearch] = useState('');
  const [sensitivityFilter, setSensitivityFilter] = useState('all');
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [detailTab, setDetailTab] = useState('overview');
  const [editDataset, setEditDataset] = useState<Dataset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Dataset | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const toast = useCallback((text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // Metrics
  const totalDatasets = datasets.length;
  const piiPhiCount = datasets.filter(d => d.sensitivity === 'PII' || d.sensitivity === 'PHI').length;
  const criticalRisk = datasets.filter(d => d.risk === 'critical').length;
  const needsReAudit = datasets.filter(d => isAuditOverdue(d.lastAudit)).length;

  // Filters
  const filtered = datasets.filter(d => {
    const matchSearch = d.id.toLowerCase().includes(search.toLowerCase()) ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.owner.toLowerCase().includes(search.toLowerCase());
    const matchSensitivity = sensitivityFilter === 'all' || d.sensitivity === sensitivityFilter;
    return matchSearch && matchSensitivity;
  });

  const handleDelete = () => {
    if (!deleteTarget) return;
    setDatasets(prev => prev.filter(d => d.id !== deleteTarget.id));
    toast(`${deleteTarget.id} removed`, 'error');
    setDeleteTarget(null);
  };

  // Schema fields for the detail view (simulated)
  const schemaFields = (ds: Dataset) => {
    const base = [
      { name: 'id', type: 'string', pii: false },
      { name: 'timestamp', type: 'datetime', pii: false },
      { name: 'amount', type: 'float', pii: false },
    ];
    if (ds.sensitivity === 'PII') {
      return [
        ...base,
        { name: 'customer_name', type: 'string', pii: true },
        { name: 'ssn', type: 'string', pii: true },
        { name: 'email', type: 'string', pii: true },
        { name: 'address', type: 'string', pii: true },
        { name: 'credit_score', type: 'integer', pii: true },
      ];
    }
    return [...base, { name: 'category', type: 'string', pii: false }, { name: 'value', type: 'float', pii: false }];
  };

  return (
    <div className="space-y-6">
      {/* Toast layer */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="px-4 py-2 text-sm font-medium shadow-lg pointer-events-auto" style={{
            background: t.type === 'success' ? 'hsl(var(--s-ok-tx))' : t.type === 'error' ? 'hsl(var(--destructive))' : 'hsl(var(--s-in-tx))',
            color: '#fff', borderRadius: 0, minWidth: 300
          }}>{t.text}</div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Dataset Registry</h1>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>{orgName} · AI training data governance & compliance</p>
        </div>
        <Button onClick={() => setAddOpen(true)} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
          <Plus className="h-4 w-4 mr-2" />Add Dataset
        </Button>
      </div>

      {/* Metric Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Datasets', value: totalDatasets, color: 'hsl(var(--text-1))', icon: Database },
          { label: 'PII / PHI', value: piiPhiCount, color: 'hsl(var(--s-wn-tx))', icon: Lock },
          { label: 'Critical Risk', value: criticalRisk, color: 'hsl(var(--destructive))', icon: ShieldWarning },
          { label: 'Needs Re-Audit', value: needsReAudit, color: 'hsl(var(--s-wn-tx))', icon: CalendarBlank },
        ].map(stat => (
          <Card key={stat.label} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <stat.icon size={20} style={{ color: stat.color }} />
              </div>
              <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative min-w-52 max-w-xs">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'hsl(var(--text-4))' }} />
          <Input placeholder="Search datasets..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9" style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }} />
        </div>
        <Select value={sensitivityFilter} onValueChange={setSensitivityFilter}>
          <SelectTrigger className="w-36 h-9" style={{ borderRadius: 0 }}>
            <Funnel className="h-3 w-3 mr-1" /><SelectValue placeholder="Sensitivity" />
          </SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All Sensitivity</SelectItem>
            {['PII', 'PHI', 'internal', 'confidential'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{filtered.length} datasets</span>
      </div>

      {/* Table */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12" style={{ color: 'hsl(var(--text-4))' }}>
              <Database size={32} className="mb-2 opacity-40" />
              <p className="text-sm">No datasets found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    {['ID', 'Name', 'Linked Model', 'Sensitivity', 'Risk Level', 'Records', 'Status', 'Last Audit', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(d => {
                    const sc = severityColor(d.risk);
                    const stc = statusColor(d.status);
                    const auditOverdue = isAuditOverdue(d.lastAudit);
                    const linkedModel = MODELS.find(m => m.id === d.linkedModel);
                    return (
                      <tr
                        key={d.id}
                        className="hover:bg-muted/30 transition-colors"
                        style={{ borderBottom: '1px solid hsl(var(--border))' }}
                      >
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: 'hsl(var(--text-4))' }}>{d.id}</td>
                        <td className="px-4 py-3 text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{d.name}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>
                          {linkedModel ? `${linkedModel.id} — ${linkedModel.name}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge style={{
                            background: d.sensitivity === 'PII' ? 'hsl(0 72% 51% / 0.15)' : d.sensitivity === 'confidential' ? 'hsl(45 93% 47% / 0.15)' : 'hsl(220 90% 56% / 0.15)',
                            color: d.sensitivity === 'PII' ? 'hsl(var(--destructive))' : d.sensitivity === 'confidential' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-in-tx))',
                            borderRadius: 0, fontSize: 10,
                          }}>
                            {d.sensitivity}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge style={{ background: sc.bg, color: sc.text, borderRadius: 0, fontSize: 10 }}>{d.risk}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono" style={{ color: 'hsl(var(--text-2))' }}>
                          {formatNumber(d.records)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge style={{ background: stc.bg, color: stc.text, borderRadius: 0, fontSize: 10 }}>{d.status}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs" style={{
                            color: auditOverdue ? 'hsl(var(--destructive))' : 'hsl(var(--text-4))',
                            fontWeight: auditOverdue ? 600 : 400,
                          }}>
                            {formatDate(d.lastAudit)}
                            {auditOverdue && ` (${daysSinceAudit(d.lastAudit)}d ago)`}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                              onClick={() => { setSelectedDataset(d); setDetailTab('overview'); }}>
                              <Eye size={14} />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                              onClick={() => setEditDataset(d)}>
                              <PencilSimple size={14} />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                              onClick={() => setDeleteTarget(d)}>
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
          )}
        </CardContent>
      </Card>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.name}?`}
        description={`This will remove ${deleteTarget?.id} from the dataset registry. This action cannot be undone.`}
        confirmLabel="Delete Dataset"
        variant="destructive"
        onConfirm={handleDelete}
      />

      {/* Dataset Detail Sheet */}
      <Sheet open={!!selectedDataset} onOpenChange={() => setSelectedDataset(null)}>
        <SheetContent style={{ borderRadius: 0, width: 640, maxWidth: '100vw' }}>
          <SheetHeader>
            <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>
              {selectedDataset?.name} <span className="text-xs font-mono font-normal" style={{ color: 'hsl(var(--text-4))' }}>{selectedDataset?.id}</span>
            </SheetTitle>
          </SheetHeader>
          {selectedDataset && (
            <div className="mt-4 overflow-y-auto h-[calc(100vh-120px)]">
              <Tabs value={detailTab} onValueChange={setDetailTab}>
                <TabsList style={{ borderRadius: 0 }}>
                  <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
                  <TabsTrigger value="schema" style={{ borderRadius: 0 }}>Schema</TabsTrigger>
                  <TabsTrigger value="linked" style={{ borderRadius: 0 }}>Linked Models</TabsTrigger>
                  <TabsTrigger value="compliance" style={{ borderRadius: 0 }}>Compliance</TabsTrigger>
                  <TabsTrigger value="audit" style={{ borderRadius: 0 }}>Audit History</TabsTrigger>
                </TabsList>

                {/* Overview */}
                <TabsContent value="overview" className="mt-4 space-y-4">
                  <div className="flex gap-2 flex-wrap">
                    <Badge style={{ ...severityColor(selectedDataset.risk), borderRadius: 0, fontSize: 10 }}>{selectedDataset.risk}</Badge>
                    <Badge style={{ ...statusColor(selectedDataset.status), borderRadius: 0, fontSize: 10 }}>{selectedDataset.status}</Badge>
                    <Badge style={{
                      background: selectedDataset.sensitivity === 'PII' ? 'hsl(0 72% 51% / 0.15)' : 'hsl(220 90% 56% / 0.15)',
                      color: selectedDataset.sensitivity === 'PII' ? 'hsl(var(--destructive))' : 'hsl(var(--s-in-tx))',
                      borderRadius: 0, fontSize: 10,
                    }}>{selectedDataset.sensitivity}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div><p style={{ color: 'hsl(var(--text-4))' }}>Description</p><p className="mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedDataset.description}</p></div>
                    <div><p style={{ color: 'hsl(var(--text-4))' }}>Owner</p><p className="mt-1 font-medium" style={{ color: 'hsl(var(--text-1))' }}>{selectedDataset.owner}</p></div>
                    <div><p style={{ color: 'hsl(var(--text-4))' }}>Records</p><p className="mt-1 font-bold" style={{ color: 'hsl(var(--text-1))' }}>{formatNumber(selectedDataset.records)}</p></div>
                    <div><p style={{ color: 'hsl(var(--text-4))' }}>Classification</p><p className="mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedDataset.classification}</p></div>
                    <div><p style={{ color: 'hsl(var(--text-4))' }}>Encryption</p><p className="mt-1 font-mono" style={{ color: 'hsl(var(--text-1))' }}>{selectedDataset.encryption}</p></div>
                    <div><p style={{ color: 'hsl(var(--text-4))' }}>Retention Policy</p><p className="mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedDataset.retentionPolicy}</p></div>
                    <div><p style={{ color: 'hsl(var(--text-4))' }}>Last Audit</p><p className="mt-1" style={{ color: isAuditOverdue(selectedDataset.lastAudit) ? 'hsl(var(--destructive))' : 'hsl(var(--text-1))' }}>{formatDate(selectedDataset.lastAudit)}</p></div>
                  </div>
                </TabsContent>

                {/* Schema Tab */}
                <TabsContent value="schema" className="mt-4 space-y-3">
                  <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Field Schema</p>
                  <div className="space-y-1">
                    {schemaFields(selectedDataset).map((f, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2" style={{ border: '1px solid hsl(var(--border))' }}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-1))' }}>{f.name}</span>
                          <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{f.type}</span>
                        </div>
                        {f.pii && (
                          <Badge style={{ background: 'hsl(0 72% 51% / 0.15)', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 9 }}>
                            PII
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* Linked Models */}
                <TabsContent value="linked" className="mt-4 space-y-3">
                  <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Linked Models</p>
                  {selectedDataset.linkedModel ? (
                    (() => {
                      const model = MODELS.find(m => m.id === selectedDataset.linkedModel);
                      return model ? (
                        <div className="p-3 flex items-center justify-between" style={{ border: '1px solid hsl(var(--border))' }}>
                          <div>
                            <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{model.name}</p>
                            <p className="text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>{model.id} · {model.version}</p>
                          </div>
                          <Badge style={{ ...statusColor(model.status), borderRadius: 0, fontSize: 10 }}>{model.status}</Badge>
                        </div>
                      ) : (
                        <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Model {selectedDataset.linkedModel} not found</p>
                      );
                    })()
                  ) : (
                    <p className="text-xs text-center py-6" style={{ color: 'hsl(var(--text-4))' }}>No linked models</p>
                  )}
                </TabsContent>

                {/* Compliance */}
                <TabsContent value="compliance" className="mt-4 space-y-3">
                  <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>GDPR Art. 5 Compliance Checklist</p>
                  {[
                    { label: 'Lawful basis for processing identified', met: selectedDataset.sensitivity !== 'PII' || selectedDataset.risk !== 'critical' },
                    { label: 'Purpose limitation documented', met: true },
                    { label: 'Data minimization applied', met: selectedDataset.classification !== 'restricted' },
                    { label: 'Accuracy measures in place', met: true },
                    { label: 'Storage limitation defined', met: !!selectedDataset.retentionPolicy },
                    { label: 'Integrity & confidentiality (encryption)', met: selectedDataset.encryption.includes('AES') },
                    { label: 'Data subject consent obtained', met: selectedDataset.sensitivity !== 'PII' },
                    { label: 'DPIA completed', met: selectedDataset.risk !== 'critical' },
                  ].map((check, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3" style={{ border: '1px solid hsl(var(--border))' }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{check.label}</span>
                      {check.met ? (
                        <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
                      ) : (
                        <Warning size={16} className="text-destructive" />
                      )}
                    </div>
                  ))}
                </TabsContent>

                {/* Audit History */}
                <TabsContent value="audit" className="mt-4 space-y-3">
                  <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Audit History</p>
                  {[
                    { date: selectedDataset.lastAudit, auditor: 'Emma Wilson', result: 'Pass', notes: 'Quarterly compliance audit completed.' },
                    { date: '2025-11-15', auditor: 'David Kim', result: 'Pass', notes: 'Data quality verification — all checks passed.' },
                    { date: '2025-08-20', auditor: 'Maria Santos', result: selectedDataset.risk === 'critical' ? 'Partial' : 'Pass', notes: selectedDataset.risk === 'critical' ? 'PII consent gaps identified — remediation required.' : 'Routine audit completed.' },
                  ].map((audit, idx) => (
                    <div key={idx} className="p-3" style={{ border: '1px solid hsl(var(--border))' }}>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{formatDate(audit.date)}</p>
                        <Badge style={{
                          background: audit.result === 'Pass' ? 'hsl(142 71% 45% / 0.15)' : 'hsl(45 93% 47% / 0.15)',
                          color: audit.result === 'Pass' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))',
                          borderRadius: 0, fontSize: 10,
                        }}>{audit.result}</Badge>
                      </div>
                      <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>Auditor: {audit.auditor}</p>
                      <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-2))' }}>{audit.notes}</p>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={!!editDataset} onOpenChange={() => setEditDataset(null)}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle>Edit {editDataset?.name}</DialogTitle>
          </DialogHeader>
          {editDataset && (
            <EditDatasetForm
              dataset={editDataset}
              onSave={(updated) => {
                setDatasets(prev => prev.map(d => d.id === updated.id ? updated : d));
                toast(`${updated.id} updated`);
                setEditDataset(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Add Dataset Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 600 }} className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Dataset</DialogTitle>
          </DialogHeader>
          <AddDatasetForm
            onSubmit={(newDs) => {
              setDatasets(prev => [...prev, newDs]);
              toast(`${newDs.id} ${newDs.name} added`);
              setAddOpen(false);
            }}
            nextId={`DS-${String(datasets.length + 1).padStart(3, '0')}`}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Edit Form ─────────────────────────────────────────────────────────────────

function EditDatasetForm({ dataset, onSave }: { dataset: Dataset; onSave: (d: Dataset) => void }) {
  const [name, setName] = useState(dataset.name);
  const [owner, setOwner] = useState(dataset.owner);
  const [sensitivity, setSensitivity] = useState(dataset.sensitivity);
  const [status, setStatus] = useState(dataset.status);

  return (
    <div className="space-y-3 py-2">
      <div>
        <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Name</label>
        <Input value={name} onChange={e => setName(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} />
      </div>
      <div>
        <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Owner</label>
        <Input value={owner} onChange={e => setOwner(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} />
      </div>
      <div>
        <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Sensitivity</label>
        <Select value={sensitivity} onValueChange={setSensitivity}>
          <SelectTrigger className="mt-1 h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            {['PII', 'PHI', 'confidential', 'internal'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={() => onSave({ ...dataset, name, owner, sensitivity, status })}
          style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}

// ── Add Dataset Form ──────────────────────────────────────────────────────────

function AddDatasetForm({ onSubmit, nextId }: { onSubmit: (d: Dataset) => void; nextId: string }) {
  const [name, setName] = useState('');
  const [version, setVersion] = useState('');
  const [dsType, setDsType] = useState('tabular');
  const [sensitivity, setSensitivity] = useState('internal');
  const [hasPii, setHasPii] = useState(false);
  const [hasPhi, setHasPhi] = useState(false);
  const [owner, setOwner] = useState('');
  const [source, setSource] = useState('');
  const [linkedModel, setLinkedModel] = useState('');
  const [format, setFormat] = useState('CSV');
  const [records, setRecords] = useState('');
  const [encryption, setEncryption] = useState('AES-256');
  const [retention, setRetention] = useState('3 years');
  const [classification, setClassification] = useState('internal');

  const canSubmit = name && sensitivity && owner;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const now = new Date().toISOString().split('T')[0];
    const effSensitivity = hasPhi ? 'PHI' : hasPii ? 'PII' : sensitivity;
    onSubmit({
      id: nextId, name, sensitivity: effSensitivity, classification,
      risk: (hasPii || hasPhi) ? 'high' : 'medium',
      linkedModel, records: parseInt(records) || 0, status: 'active',
      lastAudit: now, owner, encryption, retentionPolicy: retention,
      description: `${name} — ${dsType} dataset.`,
    });
  };

  return (
    <div className="space-y-3 py-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Name *</label>
          <Input value={name} onChange={e => setName(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} placeholder="Dataset name" />
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Version</label>
          <Input value={version} onChange={e => setVersion(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} placeholder="v1.0" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Type</label>
          <Select value={dsType} onValueChange={setDsType}>
            <SelectTrigger className="mt-1 h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              {['tabular', 'text_corpus', 'image', 'time_series', 'graph', 'audio'].map(t =>
                <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Sensitivity *</label>
          <Select value={sensitivity} onValueChange={setSensitivity}>
            <SelectTrigger className="mt-1 h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              {['PII', 'PHI', 'confidential', 'internal', 'public'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-6 py-1">
        <label className="flex items-center gap-2 text-xs" style={{ color: 'hsl(var(--text-1))' }}>
          <input type="checkbox" checked={hasPii} onChange={e => setHasPii(e.target.checked)} className="h-4 w-4" />
          Contains PII
        </label>
        <label className="flex items-center gap-2 text-xs" style={{ color: 'hsl(var(--text-1))' }}>
          <input type="checkbox" checked={hasPhi} onChange={e => setHasPhi(e.target.checked)} className="h-4 w-4" />
          Contains PHI
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Owner *</label>
          <Input value={owner} onChange={e => setOwner(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} placeholder="Owner name" />
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Source</label>
          <Input value={source} onChange={e => setSource(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} placeholder="Data source" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Linked Models</label>
          <Input value={linkedModel} onChange={e => setLinkedModel(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} placeholder="e.g. MDL-001" />
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Format</label>
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger className="mt-1 h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              {['CSV', 'Parquet', 'JSON', 'SQL', 'AVRO', 'Delta'].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Records</label>
          <Input type="number" value={records} onChange={e => setRecords(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} placeholder="0" />
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Encryption</label>
          <Select value={encryption} onValueChange={setEncryption}>
            <SelectTrigger className="mt-1 h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              {['AES-256', 'AES-128', 'RSA-2048', 'None'].map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Retention</label>
          <Select value={retention} onValueChange={setRetention}>
            <SelectTrigger className="mt-1 h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              {['1 year', '2 years', '3 years', '5 years', '7 years', '10 years'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Classification</label>
        <Select value={classification} onValueChange={setClassification}>
          <SelectTrigger className="mt-1 h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            {['public', 'internal', 'confidential', 'restricted'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button disabled={!canSubmit} onClick={handleSubmit}
          style={{ borderRadius: 0, background: canSubmit ? 'hsl(var(--brand))' : undefined, color: canSubmit ? '#fff' : undefined }}>
          <Plus size={14} className="mr-1" />Add Dataset
        </Button>
      </div>
    </div>
  );
}
