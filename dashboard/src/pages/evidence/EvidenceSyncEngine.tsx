import { useState, useMemo } from 'react';
import {
  Eye, PencilSimple, Trash, Plus, ArrowsClockwise, Warning,
  Upload, CaretRight, CaretDown, Link as LinkIcon,
  MagnifyingGlass, Info, Cloud, FileText, FilePdf, FileCode,
  Download, Check, Clock,
} from '@phosphor-icons/react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '../../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '../../components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Textarea } from '../../components/ui/textarea';
import {
  EVIDENCE, Evidence, CONTROLS, statusColor, formatDate,
} from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';

// ── Freshness Calc ────────────────────────────────────────────────────────────
function getFreshness(lastSync: string, status: string): { label: string; color: string; dot: string; days: number; tier: 'green' | 'amber' | 'red' } {
  const days = Math.floor((Date.now() - new Date(lastSync).getTime()) / (86400000));
  if (status === 'expired') return { label: 'Expired', color: 'hsl(var(--s-er-tx))', dot: 'hsl(0 72% 51%)', days, tier: 'red' };
  if (days <= 30) return { label: 'Fresh', color: 'hsl(var(--s-ok-tx))', dot: 'hsl(142 71% 45%)', days, tier: 'green' };
  if (days <= 90) return { label: 'Aging', color: 'hsl(var(--s-wn-tx))', dot: 'hsl(45 93% 47%)', days, tier: 'amber' };
  return { label: 'Stale', color: 'hsl(var(--s-er-tx))', dot: 'hsl(0 72% 51%)', days, tier: 'red' };
}

// ── Evidence-Control mapping ──────────────────────────────────────────────────
const EVIDENCE_CONTROL_MAP: Record<string, string[]> = {
  'EV-001': ['CTRL-006'],
  'EV-002': ['CTRL-003'],
  'EV-003': ['CTRL-004'],
  'EV-004': ['CTRL-005'],
  'EV-005': ['CTRL-009'],
  'EV-006': ['CTRL-007'],
};

// ── Controls with gaps ────────────────────────────────────────────────────────
const CONTROL_GAPS = [
  { ctrlId: 'CTRL-004', title: 'Human Oversight Mechanisms', issue: 'No evidence attached' },
  { ctrlId: 'CTRL-008', title: 'Access Control & Authentication', issue: 'Evidence expired' },
];

// ── MetricTile ────────────────────────────────────────────────────────────────
function MetricTile({ label, value, variant }: {
  label: string; value: string | number; variant: 'default' | 'error' | 'warn' | 'ok';
}) {
  const colors = {
    default: { bg: 'hsl(var(--bg-surface))', text: 'hsl(var(--text-1))', border: 'hsl(var(--border))' },
    error: { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' },
    warn: { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--s-wn-br))' },
    ok: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' },
  };
  const c = colors[variant];
  return (
    <Card style={{ borderRadius: 0, background: c.bg, border: `1px solid ${c.border}` }}>
      <CardContent className="px-4 py-3">
        <p className="text-xs font-medium mb-1" style={{ color: 'hsl(var(--text-4))' }}>{label}</p>
        <p className="text-2xl font-bold" style={{ color: c.text }}>{value}</p>
      </CardContent>
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function EvidenceSyncEngine() {
  const { orgName } = useSettingsStore();
  const [evidence, setEvidence] = useState<Evidence[]>(EVIDENCE);
  const [search, setSearch] = useState('');
  const [gapPanelOpen, setGapPanelOpen] = useState(true);

  // Detail sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);

  // Add modal
  const [addOpen, setAddOpen] = useState(false);

  // Sync all confirm
  const [syncAllOpen, setSyncAllOpen] = useState(false);

  // New evidence form
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('');
  const [newSource, setNewSource] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAutoCollect, setNewAutoCollect] = useState(false);
  const [newUploadMode, setNewUploadMode] = useState<'upload' | 'url'>('upload');

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return evidence.filter(e => {
      if (search && !e.title.toLowerCase().includes(search.toLowerCase()) && !e.id.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [evidence, search]);

  // ── Metrics ───────────────────────────────────────────────────────────────
  const totalEvidence = evidence.length;
  const syncedCount = evidence.filter(e => e.status === 'synced').length;
  const pendingCount = evidence.filter(e => e.status === 'pending').length;
  const expiredCount = evidence.filter(e => e.status === 'expired').length;

  // Freshness metrics
  const freshCount = evidence.filter(e => getFreshness(e.lastSync, e.status).tier === 'green').length;
  const agingCount = evidence.filter(e => getFreshness(e.lastSync, e.status).tier === 'amber').length;
  const staleCount = evidence.filter(e => getFreshness(e.lastSync, e.status).tier === 'red').length;

  // ── Open detail ───────────────────────────────────────────────────────────
  const openDetail = (ev: Evidence) => {
    setSelectedEvidence(ev);
    setSheetOpen(true);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteEvidence = (id: string) => {
    setEvidence(prev => prev.filter(e => e.id !== id));
  };

  // ── Re-sync ───────────────────────────────────────────────────────────────
  const resyncEvidence = (id: string) => {
    setEvidence(prev => prev.map(e => e.id === id ? {
      ...e,
      status: 'synced' as Evidence['status'],
      lastSync: new Date().toISOString().split('T')[0],
    } : e));
  };

  // ── Sync All ──────────────────────────────────────────────────────────────
  const syncAll = () => {
    setEvidence(prev => prev.map(e => ({
      ...e,
      status: 'synced' as Evidence['status'],
      lastSync: new Date().toISOString().split('T')[0],
    })));
    setSyncAllOpen(false);
  };

  // ── Add evidence ──────────────────────────────────────────────────────────
  const handleAdd = () => {
    const newEv: Evidence = {
      id: `EV-${String(evidence.length + 1).padStart(3, '0')}`,
      title: newTitle,
      source: newSource,
      framework: 'Custom',
      control: '',
      type: newType,
      status: 'pending',
      lastSync: newDate || new Date().toISOString().split('T')[0],
      owner: 'Current User',
      description: newDescription,
      fileSize: '—',
    };
    setEvidence(prev => [...prev, newEv]);
    setAddOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setNewTitle(''); setNewType(''); setNewSource('');
    setNewDate(''); setNewDescription(''); setNewAutoCollect(false);
  };

  // ── File icon ─────────────────────────────────────────────────────────────
  const fileIcon = (type: string) => {
    if (type.toLowerCase().includes('report') || type.toLowerCase().includes('certificate')) return <FilePdf size={14} style={{ color: 'hsl(var(--s-er-tx))' }} />;
    if (type.toLowerCase().includes('log') || type.toLowerCase().includes('validation')) return <FileCode size={14} style={{ color: 'hsl(var(--s-in-tx))' }} />;
    return <FileText size={14} style={{ color: 'hsl(var(--text-4))' }} />;
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Evidence Sync Engine</h1>
            <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>
              {orgName} · Automated evidence collection & compliance artifact management
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setSyncAllOpen(true)} style={{ borderRadius: 0 }}>
              <ArrowsClockwise size={14} className="mr-1" />Sync All
            </Button>
            <Button onClick={() => setAddOpen(true)} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
              <Upload size={14} className="mr-1" />Upload Evidence
            </Button>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <MetricTile label="Total Evidence" value={totalEvidence} variant="default" />
          <MetricTile label="Synced" value={syncedCount} variant="ok" />
          <MetricTile label="Pending" value={pendingCount} variant="warn" />
          <MetricTile label="Expired" value={expiredCount} variant="error" />
        </div>

        {/* Evidence Freshness Summary */}
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="px-4 py-3">
            <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-4))' }}>Evidence Freshness Overview</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'hsl(142 71% 45%)' }} />
                <span className="text-xs font-medium" style={{ color: 'hsl(var(--s-ok-tx))' }}>Fresh (&lt;30d): {freshCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'hsl(45 93% 47%)' }} />
                <span className="text-xs font-medium" style={{ color: 'hsl(var(--s-wn-tx))' }}>Aging (30-90d): {agingCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'hsl(0 72% 51%)' }} />
                <span className="text-xs font-medium" style={{ color: 'hsl(var(--s-er-tx))' }}>Stale (&gt;90d): {staleCount}</span>
              </div>
              <div className="flex-1" />
              {/* Freshness progress bar */}
              <div className="flex h-2 w-48" style={{ borderRadius: 0, overflow: 'hidden' }}>
                {freshCount > 0 && <div style={{ width: `${(freshCount / totalEvidence) * 100}%`, background: 'hsl(142 71% 45%)' }} />}
                {agingCount > 0 && <div style={{ width: `${(agingCount / totalEvidence) * 100}%`, background: 'hsl(45 93% 47%)' }} />}
                {staleCount > 0 && <div style={{ width: `${(staleCount / totalEvidence) * 100}%`, background: 'hsl(0 72% 51%)' }} />}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Controls Gap Panel */}
        <Card style={{ borderRadius: 0, background: 'hsl(var(--s-wn-bg))', border: '1px solid hsl(var(--s-wn-br))' }}>
          <CardContent className="p-0">
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer"
              onClick={() => setGapPanelOpen(!gapPanelOpen)}
            >
              <div className="flex items-center gap-2">
                <Warning size={14} style={{ color: 'hsl(var(--s-wn-tx))' }} />
                <span className="text-sm font-semibold" style={{ color: 'hsl(var(--s-wn-tx))' }}>
                  Controls Gap Panel — {CONTROL_GAPS.length} issues
                </span>
              </div>
              {gapPanelOpen ? <CaretDown size={14} style={{ color: 'hsl(var(--s-wn-tx))' }} /> : <CaretRight size={14} style={{ color: 'hsl(var(--s-wn-tx))' }} />}
            </div>
            {gapPanelOpen && (
              <div className="px-4 pb-3 space-y-2">
                {CONTROL_GAPS.map(gap => {
                  const ctrl = CONTROLS.find(c => c.id === gap.ctrlId);
                  return (
                    <div key={gap.ctrlId} className="flex items-center justify-between p-2" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <div className="flex items-center gap-2">
                        <Badge className="font-mono text-[10px]" style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))', borderRadius: 0 }}>
                          {gap.ctrlId}
                        </Badge>
                        <div>
                          <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{gap.title}</span>
                          <span className="block text-[10px]" style={{ color: 'hsl(var(--s-er-tx))' }}>{gap.issue}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" style={{ borderRadius: 0, color: 'hsl(var(--brand))' }}>
                        Attach Evidence →
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-4))' }} />
            <Input
              placeholder="Search evidence..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
              style={{ borderRadius: 0 }}
            />
          </div>
        </div>

        {/* Evidence Table */}
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    {['EV-ID', 'Title', 'Source', 'Framework', 'Control', 'Type', 'Last Sync', 'Freshness', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(ev => {
                    const statColor = statusColor(ev.status);
                    const freshness = getFreshness(ev.lastSync, ev.status);
                    return (
                      <tr
                        key={ev.id}
                        className="hover:bg-muted/30 cursor-pointer"
                        style={{ borderBottom: '1px solid hsl(var(--border))' }}
                        onClick={() => openDetail(ev)}
                      >
                        <td className="px-3 py-2">
                          <span className="font-mono text-xs font-medium" style={{ color: 'hsl(var(--brand))' }}>{ev.id}</span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            {fileIcon(ev.type)}
                            <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{ev.title}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <Cloud size={11} style={{ color: 'hsl(var(--text-4))' }} />
                            <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{ev.source}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{ev.framework}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-1))' }}>{ev.control}</span>
                        </td>
                        <td className="px-3 py-2">
                          <Badge style={{ background: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))', borderRadius: 0, fontSize: 10 }}>
                            {ev.type}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{formatDate(ev.lastSync)}</span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: freshness.dot, boxShadow: `0 0 4px ${freshness.dot}`, flexShrink: 0 }} />
                            <Badge style={{
                              borderRadius: 0,
                              fontSize: 10,
                              background: freshness.tier === 'green' ? 'hsl(142 71% 45% / 0.1)' : freshness.tier === 'amber' ? 'hsl(45 93% 47% / 0.1)' : 'hsl(0 72% 51% / 0.1)',
                              color: freshness.color,
                              border: `1px solid ${freshness.tier === 'green' ? 'hsl(142 71% 45% / 0.3)' : freshness.tier === 'amber' ? 'hsl(45 93% 47% / 0.3)' : 'hsl(0 72% 51% / 0.3)'}`,
                            }}>
                              {freshness.label} ({freshness.days}d)
                            </Badge>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <Badge style={{ background: statColor.bg, color: statColor.text, borderRadius: 0, fontSize: 11 }}>
                            {ev.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openDetail(ev)}>
                              <Eye size={14} style={{ color: 'hsl(var(--text-4))' }} />
                            </Button>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => resyncEvidence(ev.id)}>
                                  <ArrowsClockwise size={14} style={{ color: 'hsl(var(--brand))' }} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent style={{ borderRadius: 0 }}>Re-sync this evidence item</TooltipContent>
                            </Tooltip>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                  <Trash size={14} style={{ color: 'hsl(var(--s-er-tx))' }} />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent style={{ borderRadius: 0 }}>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Evidence</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Delete "{ev.id} — {ev.title}"? This may break compliance control mappings.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteEvidence(ev.id)} style={{ borderRadius: 0, background: 'hsl(var(--destructive))' }}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ── Evidence Detail Sheet ────────────────────────────────────────── */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="right" className="w-[520px] sm:max-w-[520px] overflow-y-auto" style={{ borderRadius: 0 }}>
            {selectedEvidence && (
              <>
                <SheetHeader>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold" style={{ color: 'hsl(var(--brand))' }}>{selectedEvidence.id}</span>
                    <Badge style={{ background: statusColor(selectedEvidence.status).bg, color: statusColor(selectedEvidence.status).text, borderRadius: 0, fontSize: 11 }}>
                      {selectedEvidence.status}
                    </Badge>
                    {(() => {
                      const f = getFreshness(selectedEvidence.lastSync, selectedEvidence.status);
                      return (
                        <div className="flex items-center gap-1.5">
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: f.dot, boxShadow: `0 0 4px ${f.dot}`, flexShrink: 0 }} />
                          <Badge style={{
                            borderRadius: 0,
                            fontSize: 10,
                            background: f.tier === 'green' ? 'hsl(142 71% 45% / 0.1)' : f.tier === 'amber' ? 'hsl(45 93% 47% / 0.1)' : 'hsl(0 72% 51% / 0.1)',
                            color: f.color,
                            border: `1px solid ${f.tier === 'green' ? 'hsl(142 71% 45% / 0.3)' : f.tier === 'amber' ? 'hsl(45 93% 47% / 0.3)' : 'hsl(0 72% 51% / 0.3)'}`,
                          }}>
                            {f.label} ({f.days}d)
                          </Badge>
                        </div>
                      );
                    })()}
                  </div>
                  <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>{selectedEvidence.title}</SheetTitle>
                </SheetHeader>

                <Tabs defaultValue="overview" className="mt-4">
                  <TabsList className="w-full" style={{ borderRadius: 0 }}>
                    <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
                    <TabsTrigger value="preview" style={{ borderRadius: 0 }}>File Preview</TabsTrigger>
                    <TabsTrigger value="controls" style={{ borderRadius: 0 }}>Linked Controls</TabsTrigger>
                  </TabsList>

                  {/* Overview */}
                  <TabsContent value="overview" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Source</p>
                        <div className="flex items-center gap-1">
                          <Cloud size={12} style={{ color: 'hsl(var(--text-4))' }} />
                          <span className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{selectedEvidence.source}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Framework</p>
                        <span className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{selectedEvidence.framework}</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Control</p>
                        <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-1))' }}>{selectedEvidence.control}</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Type</p>
                        <span className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{selectedEvidence.type}</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Last Synced</p>
                        <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{formatDate(selectedEvidence.lastSync)}</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>File Size</p>
                        <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{selectedEvidence.fileSize}</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Owner</p>
                        <span className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{selectedEvidence.owner}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Description</p>
                      <p className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{selectedEvidence.description}</p>
                    </div>
                  </TabsContent>

                  {/* File Preview */}
                  <TabsContent value="preview" className="space-y-4 mt-4">
                    {selectedEvidence.type === 'Report' || selectedEvidence.type === 'Certificate' || selectedEvidence.type === 'Agreement' ? (
                      <div className="flex flex-col items-center gap-3 py-6" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                        <FilePdf size={48} style={{ color: 'hsl(var(--s-er-tx))' }} />
                        <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{selectedEvidence.title}.pdf</p>
                        <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{selectedEvidence.fileSize}</p>
                        <div className="flex items-center gap-3 mt-2" style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: 12 }}>
                          <p className="text-[10px] italic" style={{ color: 'hsl(var(--text-4))' }}>PDF preview would render in iframe in production</p>
                        </div>
                        <Button variant="outline" size="sm" style={{ borderRadius: 0 }}>
                          <Download size={12} className="mr-1" />Download PDF
                        </Button>
                      </div>
                    ) : selectedEvidence.type === 'Log' ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Log Preview</p>
                        <div className="p-3 font-mono text-xs overflow-auto" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0, maxHeight: 200, color: 'hsl(var(--text-1))' }}>
                          {`[2026-01-15 09:00:00] HITL review initiated for MDL-004\n[2026-01-15 09:15:23] Reviewer: James Patel assigned\n[2026-01-15 10:30:45] Decision: ESCALATED - bias threshold exceeded\n[2026-01-15 10:31:00] Audit entry created: AL-008\n[2026-02-01 14:00:00] Quarterly review scheduled\n...\n[${formatDate(selectedEvidence.lastSync)}] Last sync completed`}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 py-6" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                        <FileText size={48} style={{ color: 'hsl(var(--text-4))' }} />
                        <p className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{selectedEvidence.title}</p>
                        <Button variant="outline" size="sm" style={{ borderRadius: 0 }}>
                          <Download size={12} className="mr-1" />Download
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  {/* Linked Controls */}
                  <TabsContent value="controls" className="space-y-4 mt-4">
                    <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Controls this evidence item supports.</p>
                    {(EVIDENCE_CONTROL_MAP[selectedEvidence.id] || []).map(ctrlId => {
                      const ctrl = CONTROLS.find(c => c.id === ctrlId);
                      if (!ctrl) return null;
                      const cColor = statusColor(ctrl.status);
                      return (
                        <div key={ctrlId} className="p-3 space-y-2" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className="font-mono text-[10px]" style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))', borderRadius: 0 }}>{ctrl.id}</Badge>
                              <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{ctrl.title}</span>
                            </div>
                            <Badge style={{ background: cColor.bg, color: cColor.text, borderRadius: 0, fontSize: 10 }}>{ctrl.status}</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                            <span>{ctrl.framework} · {ctrl.clause}</span>
                            <span>Score: {ctrl.score}%</span>
                          </div>
                        </div>
                      );
                    })}
                    {(!EVIDENCE_CONTROL_MAP[selectedEvidence.id] || EVIDENCE_CONTROL_MAP[selectedEvidence.id].length === 0) && (
                      <p className="text-xs py-4 text-center" style={{ color: 'hsl(var(--text-4))' }}>No controls linked to this evidence item.</p>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* ── Sync All Confirm ─────────────────────────────────────────────── */}
        <AlertDialog open={syncAllOpen} onOpenChange={setSyncAllOpen}>
          <AlertDialogContent style={{ borderRadius: 0 }}>
            <AlertDialogHeader>
              <AlertDialogTitle>Sync All Evidence</AlertDialogTitle>
              <AlertDialogDescription>
                This will re-sync all {totalEvidence} evidence items from their sources. Expired items will be refreshed. Continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={syncAll} style={{ borderRadius: 0, background: 'hsl(var(--brand))' }}>
                <ArrowsClockwise size={14} className="mr-1" />Sync All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ── Add Evidence Modal ────────────────────────────────────────────── */}
        <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) resetForm(); }}>
          <DialogContent className="sm:max-w-lg" style={{ borderRadius: 0 }}>
            <DialogHeader>
              <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Add Evidence</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="space-y-1">
                <Label className="text-xs">Title *</Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{ borderRadius: 0 }}
                  placeholder="Evidence item title"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Type *</Label>
                  <Select value={newType} onValueChange={setNewType}>
                    <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {['Report', 'Log', 'Validation', 'Agreement', 'Certificate', 'Screenshot', 'Configuration'].map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Source *</Label>
                  <Select value={newSource} onValueChange={setNewSource}>
                    <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="Select source" /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {['Drata', 'Cobalt.io', 'Okta', 'AWS', 'Internal', 'Legal', 'Manual Upload'].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Collection Date *</Label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  style={{ borderRadius: 0 }}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={newAutoCollect} onCheckedChange={setNewAutoCollect} />
                <Label className="text-xs">Auto-collected (scheduled sync)</Label>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  style={{ borderRadius: 0 }}
                  rows={2}
                  placeholder="Describe the evidence..."
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Upload Method</Label>
                <div className="flex items-center gap-3">
                  <Button
                    variant={newUploadMode === 'upload' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewUploadMode('upload')}
                    style={{ borderRadius: 0 }}
                  >
                    <Upload size={12} className="mr-1" />File Upload
                  </Button>
                  <Button
                    variant={newUploadMode === 'url' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewUploadMode('url')}
                    style={{ borderRadius: 0 }}
                  >
                    <LinkIcon size={12} className="mr-1" />URL
                  </Button>
                </div>
                {newUploadMode === 'upload' ? (
                  <div className="mt-2 flex items-center justify-center py-6" style={{ border: '2px dashed hsl(var(--border))', borderRadius: 0 }}>
                    <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Drag & drop or click to upload</p>
                  </div>
                ) : (
                  <Input
                    className="mt-2"
                    placeholder="https://..."
                    style={{ borderRadius: 0 }}
                  />
                )}
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => { setAddOpen(false); resetForm(); }} style={{ borderRadius: 0 }}>
                Cancel
              </Button>
              <Button
                onClick={handleAdd}
                disabled={!newTitle || !newType || !newSource}
                style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}
              >
                <Upload size={14} className="mr-1" />Add Evidence
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
