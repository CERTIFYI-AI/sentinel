import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, PencilSimple, Trash, Plus, MagnifyingGlass, Database,
  Warning, CheckCircle, Info, ArrowRight, ShieldCheck,
  FileText, Clock, Envelope, Globe, Lock, UserCircle, Export,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { formatDate } from '../../data/seed';
import { useDsarRequests, useUpsertDsarRequest } from '../../hooks/queries/useDataGovernance'
import { useDatasets } from '../../hooks/useDatasetData'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { PageHeader } from '@/components/ui/PageHeader'

// Supabase-wired — no mock data

function exportCsv(rows: any[], filename: string) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n')
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = filename; a.click()
}

// ── Types ────────────────────────────────────────────────────────────────────

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

interface DG {
  id: string; name: string; datasetId: string; type: string; classification: string;
  retention: string; owner: string; pii: boolean; crossBorder: boolean; countries: string[];
  consentStatus: string; dsarCount: number; lineage: string[]; lawfulBasis: string; lastReview: string;
}

// ── DSAR Type ──────────────────────────────────────────────

interface DSAR {
  id: string; requester: string; dataset: string; datasetId: string; type: 'Access' | 'Delete' | 'Portability';
  received: string; slaDeadline: string; status: string; description: string;
}

// ── MetricTile ───────────────────────────────────────────────────────────────

function MetricTile({ label, value, variant, icon, sub }: {
  label: string; value: string; variant: 'ok' | 'warn' | 'error' | 'info'; icon: React.ReactNode; sub?: string;
}) {
  const vs = {
    ok: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
    warn: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
    error: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
    info: { bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
  };
  const s = vs[variant];
  return (
    <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>{label}</span>
          <div className="p-1.5" style={{ background: s.bg, borderRadius: 0 }}>{icon}</div>
        </div>
        <div className="text-2xl font-bold" style={{ color: s.color }}>{value}</div>
        {sub && <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Consent Status Badge ─────────────────────────────────────────────────────

function ConsentBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    'Obtained': { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
    'Partial': { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
    'Missing': { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
    'Not Required': { bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))' },
  };
  const style = map[status] || map['Not Required'];
  return <Badge style={{ background: style.bg, color: style.color, borderRadius: 0, fontSize: 10 }}>{status}</Badge>;
}

// ── Lineage Step Card ────────────────────────────────────────────────────────

function LineageFlow({ lineage }: { lineage: string[] }) {
  // Parse the lineage string: "Source → ETL → Dataset → Model"
  const line = lineage[0] || '';
  const steps = line.split('→').map(s => s.trim());
  const colors: Record<number, string> = {
    0: 'hsl(var(--s-in-tx))', // source = blue
    1: 'hsl(var(--s-ok-tx))', // processing = green
    2: 'hsl(var(--s-ok-tx))', // processing = green
    3: 'hsl(var(--brand))', // model = brand
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="px-3 py-2 text-xs font-medium" style={{
            background: `${colors[i] || 'hsl(var(--border))'} / 0.1)`.replace('/ 0.1)', ''),
            opacity: 0.15,
            position: 'absolute',
          }} />
          <div className="px-3 py-2 text-xs font-medium relative" style={{
            border: `1px solid ${colors[i] || 'hsl(var(--border))'}`,
            borderRadius: 0,
            color: colors[i] || 'hsl(var(--text-1))',
            background: 'hsl(var(--bg-surface))',
          }}>
            {step}
          </div>
          {i < steps.length - 1 && (
            <ArrowRight size={14} style={{ color: 'hsl(var(--text-4))' }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

const DSAR_TYPE_TO_DB: Record<DSAR['type'], string> = { Access: 'access', Delete: 'deletion', Portability: 'portability' }
const DSAR_TYPE_FROM_DB: Record<string, DSAR['type']> = { access: 'Access', deletion: 'Delete', portability: 'Portability' }

export default function DataGovernancePage() {
  const nav = useNavigate()
  const { data: datasetItems, isLoading: datasetsLoading, remove: removeDataset } = useDatasets()
  const { data: supabaseDsars = [] } = useDsarRequests()
  const upsertDsar = useUpsertDsarRequest()
  const [activeTab, setActiveTab] = useState('inventory');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedDG, setSelectedDG] = useState<DG | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DG | null>(null);
  const [dsarFormOpen, setDsarFormOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  // DSAR form state — dataset holds the datasets.id, resolved to a name at render.
  const [newDSAR, setNewDSAR] = useState({ requester: '', dataset: '', type: 'Access' as DSAR['type'], description: '' });

  // DSAR display rows mapped from real dsar_requests rows; overdue is derived
  // from due_date, never stored.
  const dsars: DSAR[] = useMemo(() => (supabaseDsars as any[]).map(r => {
    const dueDate = r.due_date ?? ''
    const done = r.status === 'completed' || !!r.completed_at
    const overdue = !done && dueDate && new Date(dueDate).getTime() < Date.now()
    return {
      id: r.id,
      requester: r.requester_email || r.requester_name || '—',
      dataset: (datasetItems as any[]).find(d => d.id === r.dataset_id)?.name ?? (r.dataset_id ? 'Unavailable' : '—'),
      datasetId: r.dataset_id ?? '',
      type: DSAR_TYPE_FROM_DB[r.request_type] ?? 'Access',
      received: r.created_at ?? '',
      slaDeadline: dueDate,
      status: overdue ? 'Overdue' : done ? 'Complete' : r.status === 'in_progress' ? 'In Progress' : 'Pending',
      description: r.description ?? '',
    }
  }), [supabaseDsars, datasetItems]);

  const toast = useCallback((text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  if (datasetsLoading) return <PageSkeleton />;

  // Map dataset items to DG shape — use live data from Supabase
  const dataAssets = (datasetItems as any[]).map(d => ({
    id: d.id || '',
    name: d.name || '',
    datasetId: d.id || '',
    type: d.type || 'Unknown',
    classification: d.classification || 'Internal',
    retention: d.retentionPolicy || 'Unknown',
    owner: d.owner || 'Unknown',
    pii: !!d.containsPii,
    crossBorder: d.crossBorder ?? false,
    countries: d.countries || [],
    consentStatus: d.consentStatus || 'Not Required',
    dsarCount: dsars.filter(r => r.datasetId === d.id).length,
    lineage: d.upstreamSources || [],
    lawfulBasis: d.lawfulBasis || 'Legitimate Interest',
    lastReview: d.lastAuditDate || '',
  })) as DG[];

  // Metrics
  const tracked = dataAssets.length;
  const consentGap = dataAssets.filter(d => d.consentStatus === 'Missing' || d.consentStatus === 'Partial').length;
  const dsarPending = dsars.filter(d => d.status === 'Pending' || d.status === 'In Progress').length;
  const crossBorder = dataAssets.filter(d => d.crossBorder).length;

  // Consent health score
  const consentHealth = Math.round((dataAssets.filter(d => d.consentStatus === 'Obtained' || d.consentStatus === 'Not Required').length / tracked) * 100);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await removeDataset.mutateAsync(target.datasetId);
      toast(`${target.name} deleted`, 'info');
    } catch (e: any) {
      toast(e?.message ?? 'Delete failed', 'error');
    }
  };

  const handleCreateDSAR = async () => {
    const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    try {
      await upsertDsar.mutateAsync({
        requester_email: newDSAR.requester,
        request_type: DSAR_TYPE_TO_DB[newDSAR.type],
        description: newDSAR.description || null,
        dataset_id: newDSAR.dataset || null,
        due_date: deadline,
        status: 'pending',
      });
      setDsarFormOpen(false);
      setNewDSAR({ requester: '', dataset: '', type: 'Access', description: '' });
      toast('DSAR created — 30-day SLA starts now');
    } catch (e: any) {
      toast(e?.message ?? 'Failed to create DSAR', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="px-4 py-2 text-sm font-medium shadow-lg pointer-events-auto" style={{
            background: t.type === 'success' ? 'hsl(var(--s-ok-tx))' : t.type === 'error' ? 'hsl(var(--destructive))' : 'hsl(var(--s-in-tx))',
            color: 'hsl(var(--bg-surface))', borderRadius: 0, minWidth: 300,
          }}>{t.text}</div>
        ))}
      </div>

      {/* Header */}
      <PageHeader
        title="Data Governance"
        subtitle="Governance, consent, lineage, and DSAR management for AI data assets"
        icon={Database}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => exportCsv(dataAssets, 'data-governance.csv')} style={{ borderRadius: 0 }}>
              <Export size={14} />Export CSV
            </Button>
            <Button variant="outline" onClick={() => setDsarFormOpen(true)} style={{ borderRadius: 0 }}>
              <UserCircle size={14} />New DSAR
            </Button>
            <Button onClick={() => nav('/datasets')} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
              <Plus size={14} />Register Data Asset
            </Button>
          </div>
        }
      />

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricTile label="Datasets Tracked" value={String(tracked)} variant="info" icon={<Database size={16} weight="fill" className="text-[hsl(var(--s-in-tx))]" />} />
        <MetricTile label="Consent Gap" value={String(consentGap)} variant="error" icon={<Warning size={16} weight="fill" style={{ color: 'hsl(var(--destructive))' }} />} />
        <MetricTile label="DSAR Pending" value={String(dsarPending)} variant="warn" icon={<Clock size={16} weight="fill" style={{ color: 'hsl(var(--s-wn-tx))' }} />} />
        <MetricTile label="Cross-Border Transfers" value={String(crossBorder)} variant="info" icon={<Globe size={16} weight="fill" className="text-[hsl(var(--s-in-tx))]" />} />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList style={{ borderRadius: 0 }}>
          <TabsTrigger value="inventory" style={{ borderRadius: 0 }}>Data Inventory</TabsTrigger>
          <TabsTrigger value="lineage" style={{ borderRadius: 0 }}>Data Lineage</TabsTrigger>
          <TabsTrigger value="consent" style={{ borderRadius: 0 }}>Consent Management</TabsTrigger>
          <TabsTrigger value="dsar" style={{ borderRadius: 0 }}>DSAR Tracker</TabsTrigger>
        </TabsList>

        {/* Tab 1: Data Inventory */}
        <TabsContent value="inventory" className="mt-4">
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      {['DG-ID', 'Name', 'Type', 'Classification', 'Countries', 'Consent', 'DSAR', 'Last Review', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dataAssets.map(dg => (
                      <tr key={dg.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                        <td className="px-4 py-3 text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{dg.id}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{dg.name}</span>
                          {dg.pii && <Badge className="ml-2" style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 9 }}>PII</Badge>}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{dg.type}</td>
                        <td className="px-4 py-3">
                          <Badge style={{
                            background: dg.classification === 'Restricted' ? 'hsl(var(--s-er-bg))' : dg.classification === 'Confidential' ? 'hsl(var(--s-wn-bg))' : 'hsl(var(--s-nt-bg))',
                            color: dg.classification === 'Restricted' ? 'hsl(var(--destructive))' : dg.classification === 'Confidential' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-nt-tx))',
                            borderRadius: 0, fontSize: 10,
                          }}>{dg.classification}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{dg.countries.join(', ')}</td>
                        <td className="px-4 py-3"><ConsentBadge status={dg.consentStatus} /></td>
                        <td className="px-4 py-3">
                          {dg.dsarCount > 0 ? (
                            <button onClick={() => { setActiveTab('dsar'); }} className="text-xs font-bold underline" style={{ color: 'hsl(var(--brand))' }}>
                              {dg.dsarCount}
                            </button>
                          ) : (
                            <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{formatDate(dg.lastReview)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setSelectedDG(dg); setDetailOpen(true); }}>
                              <Eye size={14} style={{ color: 'hsl(var(--brand))' }} />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setSelectedDG(dg); setDetailOpen(true); }}>
                              <PencilSimple size={14} style={{ color: 'hsl(var(--text-4))' }} />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteTarget(dg)}>
                              <Trash size={14} style={{ color: 'hsl(var(--destructive))' }} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Data Lineage */}
        <TabsContent value="lineage" className="mt-4 space-y-4">
          {dataAssets.map(dg => (
            <Card key={dg.id} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{dg.id}</span>
                    <span className="text-sm font-medium ml-2" style={{ color: 'hsl(var(--text-1))' }}>{dg.name}</span>
                  </div>
                  <Badge style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))', borderRadius: 0, fontSize: 10 }}>{dg.type}</Badge>
                </div>
                <LineageFlow lineage={dg.lineage} />
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Tab 3: Consent Management */}
        <TabsContent value="consent" className="mt-4 space-y-4">
          {/* Consent Health KPI */}
          <div className="p-4" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Consent Health Score</span>
                <p className="text-3xl font-bold mt-1" style={{ color: consentHealth >= 80 ? 'hsl(var(--s-ok-tx))' : consentHealth >= 60 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--destructive))' }}>
                  {consentHealth}%
                </p>
              </div>
              <ShieldCheck size={32} weight="fill" style={{ color: consentHealth >= 80 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))' }} />
            </div>
          </div>

          {/* Consent Table */}
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      {['Dataset', 'PII', 'Consent Status', 'Lawful Basis', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dataAssets.map(dg => (
                      <tr key={dg.id} style={{
                        borderBottom: '1px solid hsl(var(--border))',
                        borderLeft: dg.consentStatus === 'Missing' ? '4px solid hsl(var(--destructive))' : 'none',
                      }} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{dg.name}</span>
                        </td>
                        <td className="px-4 py-3">
                          {dg.pii ? (
                            <Badge style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 10 }}>Yes</Badge>
                          ) : (
                            <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No</span>
                          )}
                        </td>
                        <td className="px-4 py-3"><ConsentBadge status={dg.consentStatus} /></td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{dg.lawfulBasis}</td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => nav(`/datasets/${dg.datasetId}`)} style={{ borderRadius: 0 }}>
                            View Dataset
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: DSAR Tracker */}
        <TabsContent value="dsar" className="mt-4">
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Data Subject Access Requests</CardTitle>
                <Badge style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))', borderRadius: 0, fontSize: 10 }}>
                  SLA: 30 days (GDPR)
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      {['DSAR-ID', 'Requester', 'Dataset', 'Type', 'Received', 'SLA Deadline', 'Status'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dsars.map(d => (
                      <tr key={d.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                        <td className="px-4 py-3 text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{d.id}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-1))' }}>{d.requester}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{d.dataset}</td>
                        <td className="px-4 py-3">
                          <Badge style={{
                            background: d.type === 'Delete' ? 'hsl(var(--s-er-bg))' : d.type === 'Portability' ? 'hsl(var(--s-in-bg))' : 'hsl(var(--s-nt-bg))',
                            color: d.type === 'Delete' ? 'hsl(var(--destructive))' : d.type === 'Portability' ? 'hsl(var(--s-in-tx))' : 'hsl(var(--s-nt-tx))',
                            borderRadius: 0, fontSize: 10,
                          }}>{d.type}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{formatDate(d.received)}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: d.status === 'Overdue' ? 'hsl(var(--destructive))' : 'hsl(var(--text-4))' }}>{formatDate(d.slaDeadline)}</td>
                        <td className="px-4 py-3">
                          <Badge style={{
                            background: d.status === 'Complete' ? 'hsl(var(--s-ok-bg))' : d.status === 'Overdue' ? 'hsl(var(--s-er-bg))' : d.status === 'In Progress' ? 'hsl(var(--s-wn-bg))' : 'hsl(var(--s-nt-bg))',
                            color: d.status === 'Complete' ? 'hsl(var(--s-ok-tx))' : d.status === 'Overdue' ? 'hsl(var(--destructive))' : d.status === 'In Progress' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-nt-tx))',
                            borderRadius: 0, fontSize: 10,
                          }}>{d.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        type="danger"
        title="Delete Data Asset"
        message={<p>Delete <strong>{deleteTarget?.name}</strong> ({deleteTarget?.id})? This cannot be undone.</p>}
        confirmLabel="Delete"
      />

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto" style={{ borderRadius: 0 }}>
          {selectedDG && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
                  <Database size={18} weight="fill" style={{ color: 'hsl(var(--brand))' }} />
                  {selectedDG.id} — {selectedDG.name}
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-3 mt-4">
                {[
                  { label: 'Type', value: selectedDG.type },
                  { label: 'Classification', value: selectedDG.classification },
                  { label: 'Owner', value: selectedDG.owner },
                  { label: 'Retention', value: selectedDG.retention },
                  { label: 'PII', value: selectedDG.pii ? 'Yes' : 'No' },
                  { label: 'Cross-Border', value: selectedDG.crossBorder ? 'Yes' : 'No' },
                  { label: 'Countries', value: selectedDG.countries.join(', ') },
                  { label: 'Consent Status', value: selectedDG.consentStatus },
                  { label: 'Lawful Basis', value: selectedDG.lawfulBasis },
                  { label: 'DSAR Count', value: String(selectedDG.dsarCount) },
                  { label: 'Last Review', value: formatDate(selectedDG.lastReview) },
                ].map(f => (
                  <div key={f.label} className="flex items-center justify-between py-2 px-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{f.label}</span>
                    <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{f.value}</span>
                  </div>
                ))}
                <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                  <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Data Lineage</span>
                  <div className="mt-2">
                    <LineageFlow lineage={selectedDG.lineage} />
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* New DSAR Dialog */}
      <Dialog open={dsarFormOpen} onOpenChange={setDsarFormOpen}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 480 }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>New DSAR Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Requester Email *</Label>
              <Input value={newDSAR.requester} onChange={e => setNewDSAR({ ...newDSAR, requester: e.target.value })} placeholder="requester@example.com" style={{ borderRadius: 0 }} />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Dataset</Label>
              <Select value={newDSAR.dataset} onValueChange={v => setNewDSAR({ ...newDSAR, dataset: v })}>
                <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="Select dataset" /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  {dataAssets.map(d => <SelectItem key={d.id} value={d.datasetId}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Request Type *</Label>
              <Select value={newDSAR.type} onValueChange={v => setNewDSAR({ ...newDSAR, type: v as DSAR['type'] })}>
                <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  <SelectItem value="Access">Access</SelectItem>
                  <SelectItem value="Delete">Delete</SelectItem>
                  <SelectItem value="Portability">Portability</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Description</Label>
              <Textarea value={newDSAR.description} onChange={e => setNewDSAR({ ...newDSAR, description: e.target.value })} placeholder="Describe the request..." style={{ borderRadius: 0 }} rows={3} />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDsarFormOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleCreateDSAR} disabled={!newDSAR.requester} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>Create DSAR</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
