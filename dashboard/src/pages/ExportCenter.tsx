import { useState } from 'react';
import { Export, DownloadSimple, Trash, Plus, FileText, FileCsv, FileXls, File, CalendarBlank, MagnifyingGlass, CheckCircle, Clock, Spinner } from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useSettingsStore } from '../stores/settingsStore';


interface ExportJob {
  id: string;
  name: string;
  scope: string;
  format: 'CSV' | 'PDF' | 'XLSX' | 'ZIP';
  status: 'completed' | 'scheduled' | 'processing' | 'failed';
  created: string;
  size: string;
  requestedBy: string;
}

const EXPORT_JOBS: ExportJob[] = [
  { id: 'EXP-001', name: 'Model Inventory', scope: 'All Models', format: 'CSV', status: 'completed', created: '2026-03-31T09:15:00Z', size: '1.2 MB', requestedBy: 'Maria Santos' },
  { id: 'EXP-002', name: 'Risk Register', scope: 'All Risks — Q1 2026', format: 'CSV', status: 'completed', created: '2026-03-30T14:00:00Z', size: '890 KB', requestedBy: 'David Kim' },
  { id: 'EXP-003', name: 'Bias Audit Report', scope: 'BA-001 through BA-005', format: 'PDF', status: 'completed', created: '2026-03-29T11:30:00Z', size: '4.2 MB', requestedBy: 'Emma Wilson' },
  { id: 'EXP-004', name: 'Vendor Assessment', scope: 'All Vendors — ISO 27001', format: 'XLSX', status: 'completed', created: '2026-03-28T16:45:00Z', size: '2.1 MB', requestedBy: 'James Patel' },
  { id: 'EXP-005', name: 'Incident Log', scope: 'INC-001 through INC-007', format: 'CSV', status: 'completed', created: '2026-03-27T10:00:00Z', size: '650 KB', requestedBy: 'Sarah Chen' },
  { id: 'EXP-006', name: 'Controls Matrix', scope: 'EU AI Act + SOC 2 Controls', format: 'XLSX', status: 'scheduled', created: '2026-04-01T00:00:00Z', size: '—', requestedBy: 'James Patel' },
  { id: 'EXP-007', name: 'Full Compliance Export', scope: 'All Frameworks — Q1 2026', format: 'ZIP', status: 'scheduled', created: '2026-04-02T00:00:00Z', size: '—', requestedBy: 'Sarah Chen' },
  { id: 'EXP-008', name: 'Evidence Package', scope: 'SOC 2 Type II Audit Package', format: 'ZIP', status: 'scheduled', created: '2026-04-03T00:00:00Z', size: '—', requestedBy: 'Emma Wilson' },
];

function formatBadge(format: ExportJob['format']) {
  const map: Record<string, { bg: string; color: string }> = {
    CSV: { bg: 'hsl(142 71% 45% / 0.15)', color: 'hsl(var(--s-ok-tx))' },
    PDF: { bg: 'hsl(0 72% 51% / 0.15)', color: 'hsl(var(--destructive))' },
    XLSX: { bg: 'hsl(142 71% 45% / 0.15)', color: 'hsl(var(--s-ok-tx))' },
    ZIP: { bg: 'hsl(220 90% 56% / 0.15)', color: 'hsl(var(--s-in-tx))' },
  };
  const s = map[format] ?? map.CSV;
  return <Badge style={{ background: s.bg, color: s.color, borderRadius: 0, fontSize: 11, fontWeight: 700 }}>{format}</Badge>;
}

function statusBadge(status: ExportJob['status']) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    completed: { bg: 'hsl(142 71% 45% / 0.15)', color: 'hsl(var(--s-ok-tx))', label: 'Completed' },
    scheduled: { bg: 'hsl(220 90% 56% / 0.15)', color: 'hsl(var(--s-in-tx))', label: 'Scheduled' },
    processing: { bg: 'hsl(45 93% 47% / 0.15)', color: 'hsl(var(--s-wn-tx))', label: 'Processing' },
    failed: { bg: 'hsl(0 72% 51% / 0.15)', color: 'hsl(var(--destructive))', label: 'Failed' },
  };
  const s = map[status] ?? map.completed;
  return <Badge style={{ background: s.bg, color: s.color, borderRadius: 0, fontSize: 11 }}>{s.label}</Badge>;
}

export default function ExportCenter() {
  const { orgName } = useSettingsStore();
  const [jobs, setJobs] = useState<ExportJob[]>(EXPORT_JOBS);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newJob, setNewJob] = useState({ name: '', scope: '', format: 'CSV' as ExportJob['format'] });

  const filtered = jobs.filter(j =>
    j.name.toLowerCase().includes(search.toLowerCase()) ||
    j.scope.toLowerCase().includes(search.toLowerCase()) ||
    j.requestedBy.toLowerCase().includes(search.toLowerCase())
  );

  const completedCount = jobs.filter(j => j.status === 'completed').length;
  const scheduledCount = jobs.filter(j => j.status === 'scheduled').length;

  const handleDelete = (id: string) => setJobs(prev => prev.filter(j => j.id !== id));

  const handleCreate = () => {
    const nj: ExportJob = {
      id: `EXP-${String(jobs.length + 1).padStart(3, '0')}`,
      name: newJob.name || 'New Export',
      scope: newJob.scope || 'All Records',
      format: newJob.format,
      status: 'scheduled',
      created: new Date().toISOString(),
      size: '—',
      requestedBy: 'Current User',
    };
    setJobs(prev => [...prev, nj]);
    setNewJob({ name: '', scope: '', format: 'CSV' });
    setCreateOpen(false);
  };

  const simulateDownload = (job: ExportJob) => {
    const content = `Export: ${job.name}\nScope: ${job.scope}\nFormat: ${job.format}\nRequested by: ${job.requestedBy}\nCreated: ${job.created}\n`;
    const ext = job.format.toLowerCase();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
    a.download = `${job.name.replace(/\s+/g, '-').toLowerCase()}.${ext}`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Export Center</h1>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>{orgName} · Export job management &amp; scheduling</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
          <Plus className="h-4 w-4 mr-2" weight="bold" />Create Export
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Exports This Month', value: 8, color: 'hsl(var(--text-1))' },
          { label: 'Scheduled', value: scheduledCount, color: 'hsl(var(--s-in-tx))' },
          { label: 'Completed', value: completedCount, color: 'hsl(var(--s-ok-tx))' },
          { label: 'Avg Size', value: '2.4 MB', color: 'hsl(var(--brand))' },
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
        <Input placeholder="Search exports..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }} />
      </div>

      {/* Exports Table */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12" style={{ color: 'hsl(var(--text-4))' }}>
              <Export size={32} className="mb-2 opacity-40" />
              <p className="text-sm">No exports match your search</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    {['Name', 'Scope', 'Format', 'Status', 'Created', 'Size', 'Requested By', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(j => (
                    <tr key={j.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-sm" style={{ color: 'hsl(var(--text-1))' }}>{j.name}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{j.scope}</td>
                      <td className="px-4 py-3">{formatBadge(j.format)}</td>
                      <td className="px-4 py-3">{statusBadge(j.status)}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>
                        {new Date(j.created).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: j.size === '—' ? 'hsl(var(--text-4))' : 'hsl(var(--text-1))' }}>{j.size}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{j.requestedBy}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {j.status === 'completed' && (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => simulateDownload(j)} style={{ color: 'hsl(var(--brand))' }}>
                              <DownloadSimple size={13} className="mr-1" />Download
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive">
                                <Trash size={14} />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent style={{ borderRadius: 0 }}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Export</AlertDialogTitle>
                                <AlertDialogDescription>Delete "{j.name}"? This cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(j.id)} style={{ borderRadius: 0, background: 'hsl(var(--destructive))' }}>Delete</AlertDialogAction>
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

      {/* Create Export Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent style={{ borderRadius: 0 }}>
          <DialogHeader><DialogTitle>Create Export</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Export Name</label>
              <Input value={newJob.name} onChange={e => setNewJob(f => ({ ...f, name: e.target.value }))} className="mt-1" style={{ borderRadius: 0 }} placeholder="e.g. Q1 Risk Summary" />
            </div>
            <div>
              <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Scope</label>
              <Input value={newJob.scope} onChange={e => setNewJob(f => ({ ...f, scope: e.target.value }))} className="mt-1" style={{ borderRadius: 0 }} placeholder="e.g. All Models, Q1 2026" />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'hsl(var(--text-4))' }}>Format</label>
              <Select value={newJob.format} onValueChange={v => setNewJob(f => ({ ...f, format: v as ExportJob['format'] }))}>
                <SelectTrigger style={{ borderRadius: 0 }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  <SelectItem value="CSV">CSV — Spreadsheet / tabular data</SelectItem>
                  <SelectItem value="PDF">PDF — Formatted report</SelectItem>
                  <SelectItem value="XLSX">XLSX — Excel workbook</SelectItem>
                  <SelectItem value="ZIP">ZIP — Full package with attachments</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 text-xs" style={{ background: 'hsl(var(--border) / 0.3)', borderRadius: 0, color: 'hsl(var(--text-4))' }}>
              The export will be scheduled and ready within a few minutes. You'll be notified when it's ready to download.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleCreate} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>Schedule Export</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
