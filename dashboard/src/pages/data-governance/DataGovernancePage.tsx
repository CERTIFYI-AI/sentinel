import { useState, useCallback } from 'react';
import {
  Eye, PencilSimple, Trash, Plus, MagnifyingGlass, Database,
  Warning, CheckCircle, Info, ArrowRight, ShieldCheck,
  FileText, Clock, Envelope, Globe, Lock, UserCircle,
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
import { DATA_GOVERNANCE, DATASETS, formatDate } from '../../data/seed';
import { useEffect } from 'react'
import { useDsarRequests } from '../../hooks/queries/useDataGovernance'

// ── Types ────────────────────────────────────────────────────────────────────

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

interface DG {
  id: string; name: string; datasetId: string; type: string; classification: string;
  retention: string; owner: string; pii: boolean; crossBorder: boolean; countries: string[];
  consentStatus: string; dsarCount: number; lineage: string[]; lawfulBasis: string; lastReview: string;
}

// ── DSAR Mock Data ───────────────────────────────────────────────────────────

interface DSAR {
  id: string; requester: string; dataset: string; datasetId: string; type: 'Access' | 'Delete' | 'Portability';
  received: string; slaDeadline: string; status: string; description: string;
}

const MOCK_DSARS: DSAR[] = [
  { id: 'DSAR-001', requester: 'john.doe@example.com', dataset: 'Consumer Credit History v4', datasetId: 'DG-001', type: 'Access', received: '2026-03-01', slaDeadline: '2026-03-31', status: 'In Progress', description: 'Subject requesting full data export under GDPR Art. 15' },
  { id: 'DSAR-002', requester: 'jane.smith@example.com', dataset: 'Consumer Credit History v4', datasetId: 'DG-001', type: 'Delete', received: '2026-03-05', slaDeadline: '2026-04-04', status: 'Pending', description: 'Right to erasure request under GDPR Art. 17' },
  { id: 'DSAR-003', requester: 'alex.johnson@example.com', dataset: 'Consumer Credit History v4', datasetId: 'DG-001', type: 'Portability', received: '2026-03-10', slaDeadline: '2026-04-09', status: 'Complete', description: 'Data portability request under GDPR Art. 20' },
  { id: 'DSAR-004', requester: 'maria.garcia@example.com', dataset: 'Employee HR Records 2023', datasetId: 'DG-003', type: 'Access', received: '2026-02-15', slaDeadline: '2026-03-17', status: 'Overdue', description: 'Employee requesting personal data access' },
  { id: 'DSAR-005', requester: 'chen.wei@example.com', dataset: 'Employee HR Records 2023', datasetId: 'DG-003', type: 'Delete', received: '2026-02-20', slaDeadline: '2026-03-22', status: 'Overdue', description: 'Former employee right to erasure' },
  { id: 'DSAR-006', requester: 'emma.wilson@example.com', dataset: 'Employee HR Records 2023', datasetId: 'DG-003', type: 'Access', received: '2026-03-01', slaDeadline: '2026-03-31', status: 'In Progress', description: 'HR data subject access request' },
  { id: 'DSAR-007', requester: 'lucas.brown@example.com', dataset: 'Employee HR Records 2023', datasetId: 'DG-003', type: 'Portability', received: '2026-03-05', slaDeadline: '2026-04-04', status: 'In Progress', description: 'Data portability for former employee' },
  { id: 'DSAR-008', requester: 'sophia.lee@example.com', dataset: 'Employee HR Records 2023', datasetId: 'DG-003', type: 'Delete', received: '2026-03-08', slaDeadline: '2026-04-07', status: 'Pending', description: 'Right to erasure request' },
  { id: 'DSAR-009', requester: 'oliver.jones@example.com', dataset: 'Employee HR Records 2023', datasetId: 'DG-003', type: 'Access', received: '2026-03-10', slaDeadline: '2026-04-09', status: 'Pending', description: 'Subject access request for performance data' },
  { id: 'DSAR-010', requester: 'mia.davis@example.com', dataset: 'Employee HR Records 2023', datasetId: 'DG-003', type: 'Access', received: '2026-03-12', slaDeadline: '2026-04-11', status: 'In Progress', description: 'Request for compensation data access' },
  { id: 'DSAR-011', requester: 'noah.miller@example.com', dataset: 'Employee HR Records 2023', datasetId: 'DG-003', type: 'Delete', received: '2026-03-14', slaDeadline: '2026-04-13', status: 'Pending', description: 'Former contractor right to erasure' },
  { id: 'DSAR-012', requester: 'ava.moore@example.com', dataset: 'Employee HR Records 2023', datasetId: 'DG-003', type: 'Access', received: '2026-03-15', slaDeadline: '2026-04-14', status: 'In Progress', description: 'Data access request under GDPR' },
  { id: 'DSAR-013', requester: 'liam.taylor@example.com', dataset: 'Employee HR Records 2023', datasetId: 'DG-003', type: 'Portability', received: '2026-03-16', slaDeadline: '2026-04-15', status: 'Pending', description: 'Data portability request' },
  { id: 'DSAR-014', requester: 'isabella.anderson@example.com', dataset: 'Employee HR Records 2023', datasetId: 'DG-003', type: 'Delete', received: '2026-03-18', slaDeadline: '2026-04-17', status: 'Pending', description: 'Right to erasure for terminated employee' },
  { id: 'DSAR-015', requester: 'james.thomas@example.com', dataset: 'AML Transaction History', datasetId: 'DG-004', type: 'Access', received: '2026-03-20', slaDeadline: '2026-04-19', status: 'In Progress', description: 'Transaction data access request' },
];

// ── MetricTile ───────────────────────────────────────────────────────────────

function MetricTile({ label, value, variant, icon, sub }: {
  label: string; value: string; variant: 'ok' | 'warn' | 'error' | 'info'; icon: React.ReactNode; sub?: string;
}) {
  const vs = {
    ok: { bg: 'hsl(142 71% 45% / 0.10)', color: 'hsl(var(--s-ok-tx))' },
    warn: { bg: 'hsl(45 93% 47% / 0.10)', color: 'hsl(var(--s-wn-tx))' },
    error: { bg: 'hsl(0 72% 51% / 0.10)', color: 'hsl(var(--destructive))' },
    info: { bg: 'hsl(220 90% 56% / 0.10)', color: 'hsl(var(--s-in-tx))' },
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
    'Obtained': { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
    'Partial': { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(var(--s-wn-tx))' },
    'Missing': { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' },
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
    0: 'hsl(220 90% 56%)', // source = blue
    1: 'hsl(142 71% 45%)', // processing = green
    2: 'hsl(142 71% 45%)', // processing = green
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

export default function DataGovernancePage() {
  const [dataAssets] = useState<DG[]>(DATA_GOVERNANCE as DG[]);
  const { data: supabaseDsars = [] } = useDsarRequests()
  const [dsars, setDsars] = useState<DSAR[]>([]);
  useEffect(() => { if (supabaseDsars.length > 0) setDsars(supabaseDsars as any) }, [supabaseDsars]);
  const [activeTab, setActiveTab] = useState('inventory');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedDG, setSelectedDG] = useState<DG | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DG | null>(null);
  const [dsarFormOpen, setDsarFormOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  // DSAR form state
  const [newDSAR, setNewDSAR] = useState({ requester: '', dataset: '', type: 'Access' as DSAR['type'], description: '' });

  const toast = useCallback((text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // Metrics
  const tracked = dataAssets.length;
  const consentGap = dataAssets.filter(d => d.consentStatus === 'Missing' || d.consentStatus === 'Partial').length;
  const dsarPending = dsars.filter(d => d.status === 'Pending' || d.status === 'In Progress').length;
  const crossBorder = dataAssets.filter(d => d.crossBorder).length;

  // Consent health score
  const consentHealth = Math.round((dataAssets.filter(d => d.consentStatus === 'Obtained' || d.consentStatus === 'Not Required').length / tracked) * 100);

  const handleDelete = () => {
    if (!deleteTarget) return;
    toast(`${deleteTarget.id} deleted`, 'info');
    setDeleteTarget(null);
  };

  const handleCreateDSAR = () => {
    const id = `DSAR-${String(dsars.length + 1).padStart(3, '0')}`;
    const received = new Date().toISOString().split('T')[0];
    const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dsar: DSAR = {
      id, requester: newDSAR.requester, dataset: newDSAR.dataset || 'Unknown',
      datasetId: '', type: newDSAR.type, received, slaDeadline: deadline,
      status: 'Pending', description: newDSAR.description,
    };
    setDsars(prev => [...prev, dsar]);
    setDsarFormOpen(false);
    setNewDSAR({ requester: '', dataset: '', type: 'Access', description: '' });
    toast(`DSAR ${id} created — 30-day SLA starts now`);
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="px-4 py-2 text-sm font-medium shadow-lg pointer-events-auto" style={{
            background: t.type === 'success' ? 'hsl(var(--s-ok-tx))' : t.type === 'error' ? 'hsl(var(--destructive))' : 'hsl(var(--s-in-tx))',
            color: '#fff', borderRadius: 0, minWidth: 300,
          }}>{t.text}</div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Database size={22} weight="fill" style={{ color: 'hsl(var(--brand))' }} />
            <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Data Governance</h1>
          </div>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>Governance, consent, lineage, and DSAR management for AI data assets</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setDsarFormOpen(true)} style={{ borderRadius: 0 }}>
            <UserCircle size={14} className="mr-2" />New DSAR
          </Button>
          <Button onClick={() => setRegisterOpen(true)} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
            <Plus size={14} className="mr-2" />Register Data Asset
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricTile label="Datasets Tracked" value={String(tracked)} variant="info" icon={<Database size={16} weight="fill" className="text-blue-600 dark:text-blue-400" />} />
        <MetricTile label="Consent Gap" value={String(consentGap)} variant="error" icon={<Warning size={16} weight="fill" style={{ color: 'hsl(var(--destructive))' }} />} />
        <MetricTile label="DSAR Pending" value={String(dsarPending)} variant="warn" icon={<Clock size={16} weight="fill" style={{ color: 'hsl(var(--s-wn-tx))' }} />} />
        <MetricTile label="Cross-Border Transfers" value={String(crossBorder)} variant="info" icon={<Globe size={16} weight="fill" className="text-blue-600 dark:text-blue-400" />} />
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
                          {dg.pii && <Badge className="ml-2" style={{ background: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 9 }}>PII</Badge>}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{dg.type}</td>
                        <td className="px-4 py-3">
                          <Badge style={{
                            background: dg.classification === 'Restricted' ? 'hsl(0 72% 51% / 0.12)' : dg.classification === 'Confidential' ? 'hsl(45 93% 47% / 0.12)' : 'hsl(var(--s-nt-bg))',
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
                  <Badge style={{ background: 'hsl(220 90% 56% / 0.10)', color: 'hsl(var(--s-in-tx))', borderRadius: 0, fontSize: 10 }}>{dg.type}</Badge>
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
                            <Badge style={{ background: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 10 }}>Yes</Badge>
                          ) : (
                            <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No</span>
                          )}
                        </td>
                        <td className="px-4 py-3"><ConsentBadge status={dg.consentStatus} /></td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{dg.lawfulBasis}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {dg.consentStatus === 'Missing' && (
                              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => toast('Consent request sent')} style={{ borderRadius: 0 }}>
                                Request Consent
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toast('Consent record viewed')} style={{ borderRadius: 0 }}>
                              View Record
                            </Button>
                            {dg.consentStatus === 'Obtained' && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => toast('Consent revoked', 'info')} style={{ borderRadius: 0 }}>
                                Revoke
                              </Button>
                            )}
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

        {/* Tab 4: DSAR Tracker */}
        <TabsContent value="dsar" className="mt-4">
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Data Subject Access Requests</CardTitle>
                <Badge style={{ background: 'hsl(220 90% 56% / 0.10)', color: 'hsl(var(--s-in-tx))', borderRadius: 0, fontSize: 10 }}>
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
                            background: d.type === 'Delete' ? 'hsl(0 72% 51% / 0.12)' : d.type === 'Portability' ? 'hsl(220 90% 56% / 0.12)' : 'hsl(var(--s-nt-bg))',
                            color: d.type === 'Delete' ? 'hsl(var(--destructive))' : d.type === 'Portability' ? 'hsl(var(--s-in-tx))' : 'hsl(var(--s-nt-tx))',
                            borderRadius: 0, fontSize: 10,
                          }}>{d.type}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{formatDate(d.received)}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: d.status === 'Overdue' ? 'hsl(var(--destructive))' : 'hsl(var(--text-4))' }}>{formatDate(d.slaDeadline)}</td>
                        <td className="px-4 py-3">
                          <Badge style={{
                            background: d.status === 'Complete' ? 'hsl(142 71% 45% / 0.12)' : d.status === 'Overdue' ? 'hsl(0 72% 51% / 0.12)' : d.status === 'In Progress' ? 'hsl(45 93% 47% / 0.12)' : 'hsl(var(--s-nt-bg))',
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
                  {dataAssets.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
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
            <Button onClick={handleCreateDSAR} disabled={!newDSAR.requester} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>Create DSAR</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Register Data Asset Dialog */}
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 480 }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Register Data Asset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Name *</Label>
              <Input placeholder="e.g., Customer Transaction Logs" style={{ borderRadius: 0 }} />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Type</Label>
              <Select defaultValue="Personal Data">
                <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  <SelectItem value="Personal Data">Personal Data</SelectItem>
                  <SelectItem value="Transaction Data">Transaction Data</SelectItem>
                  <SelectItem value="Financial Data">Financial Data</SelectItem>
                  <SelectItem value="Behavioral Data">Behavioral Data</SelectItem>
                  <SelectItem value="Document Data">Document Data</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Classification</Label>
              <Select defaultValue="Internal">
                <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  <SelectItem value="Restricted">Restricted</SelectItem>
                  <SelectItem value="Confidential">Confidential</SelectItem>
                  <SelectItem value="Internal">Internal</SelectItem>
                  <SelectItem value="Public">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setRegisterOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={() => { setRegisterOpen(false); toast('Data asset registered'); }} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>Register</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
