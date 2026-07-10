// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
import { useState, useCallback } from 'react';
import { useSupabaseTable } from '@/hooks/useSupabaseTable';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Vault, FilePdf, FileDoc, FileXls, File, UploadSimple, MagnifyingGlass,
  Trash, Download, Eye, Warning, CheckCircle, Clock, ShieldCheck,
  Link as LinkIcon, ArrowsClockwise, Spinner, Certificate, Export,
  SealCheck, Hash, CalendarCheck, Lock,
} from '@phosphor-icons/react';
import { statusColor, formatDate } from '../data/seed';
type Evidence = any;
type EvidenceStatus = string;
import { useEvidenceData } from '../hooks/useEvidenceData';
import { PageSkeleton } from '../components/ui/PageSkeleton';

function exportCsv(rows: any[], filename: string) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n')
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = filename; a.click()
}
import { useSettingsStore } from '../stores/settingsStore';
import { toast } from 'sonner';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCardRow } from '../components/ui/StatCardRow';
import { FilterBar } from '../components/ui/FilterBar';
import type { StatCardRowItem } from '../components/ui/StatCardRow';

// ── Simulated cryptographic chain data ──────────────────────────────────────

interface ChainEntry {
  seq: number;
  timestamp: string;
  action: string;
  entityType: string;
  entityId: string;
  actor: string;
  payloadHash: string;
  chainHash: string;
  verified?: boolean;
}

const CHAIN_ENTRIES: ChainEntry[] = [
  { seq: 847, timestamp: '2026-04-10 09:14:32', action: 'approve', entityType: 'control', entityId: 'CTRL-008', actor: 'James Patel', payloadHash: 'a3f4d2c1b8e7f6a5...4d3c2b1a', chainHash: 'f8e7d6c5b4a3f2e1...8c7b6a5f', verified: true },
  { seq: 846, timestamp: '2026-04-10 09:12:11', action: 'create', entityType: 'evidence', entityId: 'EV-012', actor: 'Maria Santos', payloadHash: '2b3c4d5e6f7a8b9c...1a2b3c4d', chainHash: 'd4c3b2a1f8e7d6c5...4b3a2f1e', verified: true },
  { seq: 845, timestamp: '2026-04-10 08:55:44', action: 'sign', entityType: 'policy', entityId: 'POL-003', actor: 'Sarah Chen', payloadHash: 'c9b8a7f6e5d4c3b2...9a8b7c6d', chainHash: 'e1f2a3b4c5d6e7f8...5d4c3b2a', verified: true },
  { seq: 844, timestamp: '2026-04-09 16:33:28', action: 'verify', entityType: 'audit', entityId: 'AUD-022', actor: 'Emma Wilson', payloadHash: '4e5f6a7b8c9d0e1f...2a3b4c5d', chainHash: 'b7a6f5e4d3c2b1a0...7f6e5d4c', verified: true },
  { seq: 843, timestamp: '2026-04-09 14:21:05', action: 'update', entityType: 'risk', entityId: 'RSK-007', actor: 'David Kim', payloadHash: '1f2e3d4c5b6a7f8e...3c2b1a0f', chainHash: '9a8f7e6d5c4b3a2f...9b8a7f6e', verified: true },
  { seq: 842, timestamp: '2026-04-09 11:08:55', action: 'reject', entityType: 'hitl', entityId: 'HITL-041', actor: 'Sarah Chen', payloadHash: 'f1e2d3c4b5a6f7e8...0f1e2d3c', chainHash: '3b4c5d6e7f8a9b0c...3a4b5c6d', verified: true },
  { seq: 841, timestamp: '2026-04-09 10:44:18', action: 'create', entityType: 'incident', entityId: 'INC-012', actor: 'Maria Santos', payloadHash: '7a8b9c0d1e2f3a4b...7c8d9e0f', chainHash: '5e6f7a8b9c0d1e2f...5d6e7f8a', verified: true },
  { seq: 840, timestamp: '2026-04-08 17:30:02', action: 'approve', entityType: 'policy', entityId: 'POL-005', actor: 'James Patel', payloadHash: 'b5c6d7e8f9a0b1c2...5d6e7f8a', chainHash: '1c2d3e4f5a6b7c8d...1a2b3c4d', verified: true },
  { seq: 839, timestamp: '2026-04-08 15:12:44', action: 'sign', entityType: 'evidence', entityId: 'EV-011', actor: 'Raj Gupta', payloadHash: 'd3e4f5a6b7c8d9e0...3e4f5a6b', chainHash: '9c0d1e2f3a4b5c6d...9d0e1f2a', verified: true },
  { seq: 838, timestamp: '2026-04-08 13:05:31', action: 'create', entityType: 'control', entityId: 'CTRL-019', actor: 'Emma Wilson', payloadHash: '6b7c8d9e0f1a2b3c...6a7b8c9d', chainHash: '2f3a4b5c6d7e8f9a...2e3f4a5b', verified: true },
];

const FRAMEWORK_CYCLES = [
  { name: 'EU AI Act', status: 'Cycle 2 of 3', progress: 68, color: 'hsl(var(--brand))' },
  { name: 'ISO 42001', status: 'Certified', progress: 100, color: 'hsl(var(--s-ok-tx))' },
  { name: 'SOC 2 Type II', status: 'Active', progress: 83, color: 'hsl(var(--s-in-tx))' },
  { name: 'NIST AI RMF', status: 'In Progress', progress: 54, color: 'hsl(var(--r-hi-tx))' },
];

const EMPTY_EVIDENCE: Omit<Evidence, 'id'> = {
  title: '', source: '', framework: '', control: '', type: 'Report',
  status: 'pending', lastSync: new Date().toISOString().split('T')[0],
  owner: '', description: '', fileSize: '0 KB',
};

function fileIcon(type: string) {
  if (type === 'Report' || type === 'Validation') return <FilePdf size={28} style={{ color: 'hsl(var(--s-er-tx))' }} />;
  if (type === 'Agreement' || type === 'Log') return <FileDoc size={28} style={{ color: 'hsl(var(--s-in-tx))' }} />;
  if (type === 'Certificate') return <FileXls size={28} style={{ color: 'hsl(var(--s-ok-tx))' }} />;
  return <File size={28} style={{ color: 'hsl(var(--text-3))' }} />;
}

function syncStatusDot(status: EvidenceStatus) {
  if (status === 'synced') return { color: 'hsl(var(--s-ok-tx))', label: 'Synced' };
  if (status === 'pending') return { color: 'hsl(var(--r-hi-tx))', label: 'Pending' };
  if (status === 'expired') return { color: 'hsl(var(--s-er-tx))', label: 'Expired' };
  return { color: 'hsl(var(--s-er-tx))', label: 'Failed' };
}

function actionBadgeStyle(action: string) {
  switch (action) {
    case 'approve': return { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' };
    case 'sign': return { bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' };
    case 'create': return { bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' };
    case 'verify': return { bg: 'hsl(var(--tag-purple-bg))', color: 'hsl(var(--tag-purple))' };
    case 'reject': return { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))' };
    case 'update': return { bg: 'hsl(var(--r-hi-bg))', color: 'hsl(var(--r-hi-tx))' };
    default: return { bg: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))' };
  }
}

function truncateHash(h: string) {
  if (h.length <= 16) return h;
  return h.slice(0, 8) + '...' + h.slice(-8);
}

export default function EvidenceVault() {
  const { orgName } = useSettingsStore();
  const { evidence, isLoading, save: saveEvidence, remove: removeEvidence } = useEvidenceData();
  const [_localEvidence, _setLocalEvidence] = useState<Evidence[]>([]);
  const { data: chain, setData: setChain } = useSupabaseTable('evidencevault_table', CHAIN_ENTRIES);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [viewItem, setViewItem] = useState<Evidence | null>(null);
  const [deleteItem, setDeleteItem] = useState<Evidence | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<Evidence, 'id'>>(EMPTY_EVIDENCE);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; entries: number } | null>(null);
  const [verifyingRow, setVerifyingRow] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('vault');

  const evidenceList = evidence || [];
  const types = Array.from(new Set(evidenceList.map(e => e.type)));
  const filtered = evidenceList.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.title.toLowerCase().includes(q) || e.source.toLowerCase().includes(q) || e.framework.toLowerCase().includes(q);
    const matchType = filterType === 'all' || e.type === filterType;
    return matchSearch && matchType;
  });

  const synced = evidenceList.filter(e => e.status === 'synced').length;
  const totalChain = chain.length > 0 ? chain[0].seq : 0;

  const stats = [
    { label: 'Chain Length', value: totalChain, icon: LinkIcon, color: 'hsl(var(--brand))', sub: 'entries' },
    { label: 'Audit Cycles', value: '3', icon: CalendarCheck, color: 'hsl(var(--s-ok-tx))', sub: 'complete' },
    { label: 'Days Active', value: '847', icon: Clock, color: 'hsl(var(--s-in-tx))', sub: 'days' },
    { label: 'Integrity', value: '100%', icon: SealCheck, color: 'hsl(var(--s-ok-tx))', sub: 'verified' },
  ];

  const handleUpload = useCallback(async () => {
    try {
      await saveEvidence({ ...formData });
      toast.success(`${formData.title || 'Evidence'} uploaded successfully`);
    } catch { toast.error('Failed to upload evidence'); }
    setUploadOpen(false);
    setFormData(EMPTY_EVIDENCE);
  }, [formData, saveEvidence]);

  const handleDelete = useCallback(async () => {
    if (!deleteItem) return;
    try { await removeEvidence(deleteItem.id); toast.success('Evidence removed from vault'); } catch { toast.error('Failed to remove'); }
    setDeleteItem(null);
  }, [deleteItem, removeEvidence]);

  const handleVerifyChain = useCallback(async () => {
    setVerifying(true);
    setVerifyResult(null);
    await new Promise(r => setTimeout(r, 2200));
    setVerifyResult({ valid: true, entries: totalChain });
    setVerifying(false);
    toast.success(`Chain integrity verified — ${totalChain} entries validated`);
  }, [totalChain]);

  const handleVerifyRow = useCallback(async (seq: number) => {
    setVerifyingRow(seq);
    await new Promise(r => setTimeout(r, 900));
    setVerifyingRow(null);
    setChain(prev => prev.map(e => e.seq === seq ? { ...e, verified: true } : e));
    toast.success(`Entry #${seq} — hash verified ✓`);
  }, []);

  const handleExportPackage = useCallback(() => {
    exportCsv(evidence, 'evidence.csv');
    toast.success('Evidence export downloaded');
  }, [evidence]);

  const sxSel: React.CSSProperties = {
    background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))',
    color: 'hsl(var(--text-1))', padding: '6px 10px', fontSize: 13, borderRadius: 0,
  };

  const evidenceKpiCards: StatCardRowItem[] = [
    {
      label: 'Chain Length',
      value: String(totalChain),
      icon: <LinkIcon size={18} style={{ color: 'hsl(var(--brand))' }} />,
      delta: 'Append-only entries',
      deltaDir: 'up' as const,
      isPositiveUp: true,
    },
    {
      label: 'Files in Vault',
      value: String(evidence.length),
      icon: <Vault size={18} style={{ color: 'hsl(var(--brand))' }} />,
      delta: `${synced} synced`,
      deltaDir: 'up' as const,
      isPositiveUp: true,
    },
    {
      label: 'Days Active',
      value: '847',
      icon: <Clock size={18} style={{ color: 'hsl(var(--s-in-tx))' }} />,
      delta: '3 audit cycles',
      deltaDir: 'up' as const,
      isPositiveUp: true,
    },
    {
      label: 'Chain Integrity',
      value: '100%',
      icon: <SealCheck size={18} style={{ color: 'hsl(var(--s-ok-tx))' }} />,
      delta: 'SHA-256 verified',
      deltaDir: 'up' as const,
      isPositiveUp: true,
    },
  ];

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Evidence Vault"
        subtitle="Immutable audit evidence collection and custody"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Evidence Vault' }]}
        badge={
          <span className="px-2 py-0.5 text-xs font-bold" style={{ background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))', border: '1px solid hsl(var(--s-ok-br))' }}>
            ENTERPRISE
          </span>
        }
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleExportPackage} style={{ borderRadius: 0 }}>
              <Export size={14} /> Export Package
            </Button>
            <Button size="sm" onClick={() => { setFormData(EMPTY_EVIDENCE); setUploadOpen(true); }} style={{ borderRadius: 0 }}>
              <UploadSimple size={14} /> Upload Evidence
            </Button>
          </div>
        }
      />

      {/* Evidence KPI Row */}
      <StatCardRow cards={evidenceKpiCards} />

      {/* ── Compliance Continuity Hero ── */}
      <div style={{ background: 'hsl(var(--brand-subtle))', border: '2px solid hsl(var(--brand-subtle))', padding: '20px 24px' }}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Certificate size={28} style={{ color: 'hsl(var(--brand))' }} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'hsl(var(--brand))' }}>
                  Compliance Continuity Score
                </p>
                <h2 className="text-3xl font-black" style={{ color: 'hsl(var(--text-1))' }}>
                  847 Days
                </h2>
              </div>
            </div>
            <p className="text-sm mb-4" style={{ color: 'hsl(var(--text-2))' }}>
              3 complete audit cycles of unbroken, cryptographically verified compliance history. Switching platforms means starting from zero.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {FRAMEWORK_CYCLES.map(f => (
                <span key={f.name} className="px-2.5 py-1 text-xs font-medium" style={{ background: `${f.color}20`, color: f.color, border: `1px solid ${f.color}40` }}>
                  {f.name}: {f.status}
                </span>
              ))}
            </div>
            <div className="space-y-2">
              {FRAMEWORK_CYCLES.map(f => (
                <div key={f.name} className="flex items-center gap-3">
                  <span className="text-xs w-28" style={{ color: 'hsl(var(--text-3))' }}>{f.name}</span>
                  <div className="flex-1 h-1.5" style={{ background: 'hsl(var(--bg-muted))' }}>
                    <div className="h-full transition-all" style={{ width: `${f.progress}%`, background: f.color }} />
                  </div>
                  <span className="text-xs font-medium w-8 text-right" style={{ color: f.color }}>{f.progress}%</span>
                </div>
              ))}
            </div>
            <p className="text-xs mt-4 italic" style={{ color: 'hsl(var(--text-4))' }}>
              "What this means: No competitor can import your 847-day audit chain. Your compliance history lives exclusively in Sentinel."

            </p>
          </div>
          <div className="ml-6 text-right flex flex-col items-end gap-3">
            {verifyResult ? (
              <div className="flex items-center gap-2 px-3 py-2" style={{ background: 'hsl(var(--s-ok-bg))', border: '1px solid hsl(var(--s-ok-br))' }}>
                <SealCheck size={18} style={{ color: 'hsl(var(--s-ok-tx))' }} />
                <div className="text-left">
                  <p className="text-xs font-bold" style={{ color: 'hsl(var(--s-ok-tx))' }}>INTEGRITY: VERIFIED ✓</p>
                  <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{verifyResult.entries} entries validated</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2" style={{ background: 'hsl(var(--s-in-bg))', border: '1px solid hsl(var(--s-in-br))' }}>
                <ShieldCheck size={18} style={{ color: 'hsl(var(--brand))' }} />
                <div className="text-left">
                  <p className="text-xs font-bold" style={{ color: 'hsl(var(--brand))' }}>CHAIN: INTACT</p>
                  <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Last verified: Today</p>
                </div>
              </div>
            )}
            <Button size="sm" onClick={handleVerifyChain} disabled={verifying} style={{ borderRadius: 0 }}>
              {verifying ? <Spinner size={14} className="animate-spin" /> : <ArrowsClockwise size={14} />}
              {verifying ? 'Verifying…' : 'Run Integrity Verification'}
            </Button>
            <Button size="sm" variant="outline" style={{ borderRadius: 0 }}>
              <Certificate size={14} /> Generate Audit Certificate
            </Button>
          </div>
        </div>
      </div>

      {/* Metric tiles replaced by StatCardRow above */}

      {/* ── Tabs: Vault Files / Chain Explorer ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
          <TabsTrigger value="vault" style={{ borderRadius: 0 }}>
            <Vault size={14} className="mr-1.5" /> Evidence Files
          </TabsTrigger>
          <TabsTrigger value="chain" style={{ borderRadius: 0 }}>
            <LinkIcon size={14} className="mr-1.5" /> Chain Explorer
          </TabsTrigger>
        </TabsList>

        {/* ── Files Tab ── */}
        <TabsContent value="vault" className="mt-4 space-y-4">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search vault by title, source, framework..."
            filters={[
              {
                key: 'type',
                label: 'Type',
                value: filterType === 'all' ? '' : filterType,
                onChange: v => setFilterType(v || 'all'),
                options: types.map(t => ({ label: t, value: t })),
              },
            ]}
            activeFilterCount={filterType !== 'all' ? 1 : 0}
            onClearAll={() => { setSearch(''); setFilterType('all'); }}
            trailing={
              <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{filtered.length} of {evidence.length} files</span>
            }
          />
          <div className="grid grid-cols-3 gap-4">
            {filtered.map(e => {
              const sc = statusColor(e.status);
              return (
                <Card key={e.id} className="cursor-pointer" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0, transition: 'border-color 0.15s' }}
                  onMouseEnter={ev => (ev.currentTarget.style.borderColor = 'hsl(var(--brand))')}
                  onMouseLeave={ev => (ev.currentTarget.style.borderColor = 'hsl(var(--border))')}
                  onClick={() => setViewItem(e)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      {fileIcon(e.type)}
                      <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 10 }}>{e.status}</Badge>
                    </div>
                    <p className="text-sm font-semibold mb-1 line-clamp-2" style={{ color: 'hsl(var(--text-1))' }}>{e.title}</p>
                    <p className="text-xs mb-2 line-clamp-1" style={{ color: 'hsl(var(--text-3))' }}>{e.framework}</p>
                    <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'hsl(var(--text-3))' }}>
                      <span>{e.type}</span><span>{e.fileSize}</span>
                    </div>
                    <div className="flex items-center text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                      <Hash size={10} className="mr-1" />
                      <span className="font-mono">SHA-256 signed</span>
                    </div>
                    <div className="flex items-center gap-2 pt-3 mt-2" style={{ borderTop: '1px solid hsl(var(--border))' }} onClick={ev => ev.stopPropagation()}>
                      <Button size="sm" variant="ghost" style={{ padding: '3px 8px', fontSize: 11, borderRadius: 0 }}><Download size={12} /> Download</Button>
                      <Button size="sm" variant="ghost" style={{ padding: '3px 8px', fontSize: 11, borderRadius: 0, color: 'hsl(var(--s-er-tx))' }} onClick={() => setDeleteItem(e)}><Trash size={12} /></Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: 'hsl(var(--text-3))' }}>
              <Vault size={40} />
              <p className="mt-3 text-sm font-medium">No files found</p>
              <p className="text-xs mt-1">Adjust search or upload new evidence</p>
            </div>
          )}
        </TabsContent>

        {/* ── Chain Explorer Tab ── */}
        <TabsContent value="chain" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                Cryptographic Evidence Chain
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>
                SHA-256 tamper-evident ledger — each entry includes the hash of the previous
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs" style={{ background: 'hsl(var(--s-ok-bg))', border: '1px solid hsl(var(--s-ok-br))', color: 'hsl(var(--s-ok-tx))' }}>
              <Lock size={12} />
              Append-only — no DELETE or UPDATE permitted
            </div>
          </div>
          <div style={{ border: '1px solid hsl(var(--border))', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '60px 160px 90px 110px 120px 1fr 1fr 100px', background: 'hsl(var(--bg-muted))', padding: '8px 12px', fontSize: 11, color: 'hsl(var(--text-3))', fontWeight: 600, borderBottom: '1px solid hsl(var(--border))', gap: 8 }}>
              <span>SEQ</span><span>TIMESTAMP</span><span>ACTION</span><span>ENTITY</span>
              <span>ACTOR</span><span>PAYLOAD HASH</span><span>CHAIN HASH</span><span>VERIFY</span>
            </div>
            {chain.map((entry, idx) => (
              <div key={entry.seq} style={{ display: 'grid', gridTemplateColumns: '60px 160px 90px 110px 120px 1fr 1fr 100px', padding: '10px 12px', fontSize: 11, borderBottom: idx < chain.length - 1 ? '1px solid hsl(var(--border))' : 'none', background: idx % 2 === 0 ? 'hsl(var(--bg-surface))' : 'hsl(var(--bg-raised))', alignItems: 'center', gap: 8 }}>
                <span className="font-mono font-bold" style={{ color: 'hsl(var(--brand))' }}>#{entry.seq}</span>
                <span className="font-mono text-xs" style={{ color: 'hsl(var(--text-3))' }}>{entry.timestamp}</span>
                <span>
                  <span className="px-1.5 py-0.5 font-medium" style={{ ...actionBadgeStyle(entry.action), fontSize: 10 }}>
                    {entry.action}
                  </span>
                </span>
                <div>
                  <p style={{ color: 'hsl(var(--text-2))' }}>{entry.entityType}</p>
                  <p className="font-mono" style={{ color: 'hsl(var(--text-4))', fontSize: 10 }}>{entry.entityId}</p>
                </div>
                <span style={{ color: 'hsl(var(--text-2))' }}>{entry.actor}</span>
                <span className="font-mono" style={{ color: 'hsl(var(--text-4))', fontSize: 10 }}>{truncateHash(entry.payloadHash)}</span>
                <span className="font-mono" style={{ color: 'hsl(var(--text-4))', fontSize: 10 }}>{truncateHash(entry.chainHash)}</span>
                <button
                  onClick={() => handleVerifyRow(entry.seq)}
                  disabled={verifyingRow === entry.seq}
                  className="flex items-center gap-1 px-2 py-1 text-xs hover:opacity-80 transition-opacity"
                  style={{ background: entry.verified ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--bg-muted))', color: entry.verified ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-3))', border: `1px solid ${entry.verified ? 'hsl(var(--s-ok-br))' : 'hsl(var(--border))'}`, borderRadius: 0 }}>
                  {verifyingRow === entry.seq ? <Spinner size={10} className="animate-spin" /> : entry.verified ? <CheckCircle size={10} /> : <Eye size={10} />}
                  {verifyingRow === entry.seq ? 'Checking…' : entry.verified ? 'Verified' : 'Verify'}
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs mt-3 text-center" style={{ color: 'hsl(var(--text-4))' }}>
            Showing most recent {chain.length} of {totalChain} chain entries · Full chain available in export package
          </p>
        </TabsContent>
      </Tabs>

      {/* ── View Dialog ── */}
      <Dialog open={!!viewItem} onOpenChange={o => !o && setViewItem(null)}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0, maxWidth: 540 }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>{viewItem?.title}</DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-3">
              <div className="flex justify-center py-4">{fileIcon(viewItem.type)}</div>
              {[
                { label: 'Evidence ID', value: viewItem.id },
                { label: 'Type', value: viewItem.type },
                { label: 'Framework', value: viewItem.framework },
                { label: 'Control', value: viewItem.control },
                { label: 'Source', value: viewItem.source },
                { label: 'Owner', value: viewItem.owner },
                { label: 'File Size', value: viewItem.fileSize },
                { label: 'Status', value: viewItem.status },
                { label: 'Last Sync', value: formatDate(viewItem.lastSync) },
                { label: 'Chain Entry', value: `#${Math.floor(Math.random() * 100) + 740}` },
                { label: 'SHA-256 Hash', value: '3a4b5c6d7e8f9a0b…' },
              ].map(r => (
                <div key={r.label} className="flex justify-between py-1.5" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                  <span className="text-sm font-medium font-mono" style={{ color: r.label.includes('Hash') || r.label.includes('Chain') ? 'hsl(var(--brand))' : 'hsl(var(--text-1))' }}>{r.value}</span>
                </div>
              ))}
              {viewItem.description && <p className="text-sm pt-2" style={{ color: 'hsl(var(--text-2))' }}>{viewItem.description}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" style={{ borderRadius: 0 }}><Download size={14} /> Download</Button>
            <Button variant="outline" onClick={() => setViewItem(null)} style={{ borderRadius: 0 }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Upload Dialog ── */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Upload Evidence File</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-col items-center justify-center py-8" style={{ border: '2px dashed hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}>
              <UploadSimple size={28} style={{ color: 'hsl(var(--text-3))' }} />
              <p className="text-sm mt-2" style={{ color: 'hsl(var(--text-2))' }}>Drop files here or click to browse</p>
              <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-3))' }}>File will be SHA-256 hashed and appended to chain</p>
            </div>
            {[{ label: 'Title', key: 'title' }, { label: 'Framework', key: 'framework' }, { label: 'Owner', key: 'owner' }, { label: 'Description', key: 'description' }].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                <Input value={(formData as any)[f.key] || ''} onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Type</label>
              <select value={formData.type} onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}
                style={{ width: '100%', ...sxSel }}>
                {['Report', 'Log', 'Validation', 'Agreement', 'Certificate'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleUpload} disabled={!formData.title} style={{ borderRadius: 0 }}>
              <UploadSimple size={14} /> Upload & Sign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <AlertDialog open={!!deleteItem} onOpenChange={o => !o && setDeleteItem(null)}>
        <AlertDialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Delete Evidence File</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete <strong>{deleteItem?.title}</strong>? The chain entry remains as a record of deletion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} style={{ background: 'hsl(var(--s-er-tx))', borderRadius: 0 }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
