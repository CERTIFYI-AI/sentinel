import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import {
  ShieldCheck, Lock, Hash, GitBranch, Clock, CheckCircle, Warning,
  Database, ArrowRight, DownloadSimple, TreeStructure, Certificate,
  Copy, Check, Link, Cube, Robot, Fingerprint, ListChecks,
  SealCheck, Prohibit, Sparkle, ArrowUpRight,
} from '@phosphor-icons/react';
import { MODELS } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import Breadcrumbs from '../../components/Breadcrumbs';

/* ─── Extend seed MODELS with DNA data ────────────────────────────────── */
const DNA_EXTRA: Record<string, {
  sha256: string; trainingDataHash: string; registeredAt: string;
  registeredBy: string; lastVerified: string; tamperAlert: boolean;
  provenance: { stage: string; dataset: string; hash: string; date: string; by: string }[];
  auditChain: { id: string; event: string; actor: string; ts: string; hash: string; prev: string }[];
}> = {
  'MDL-001': {
    sha256: 'a3f8c12e9b74d1056e82cc74abc01234567890abcdef1234567890abcdef1234',
    trainingDataHash: 'sha256:f4d9e8b2a1c037854d6e2f0b8c1a39e7f53d21ab',
    registeredAt: '2026-01-15T09:22:11Z', registeredBy: 'Dr. Nina Okafor',
    lastVerified: '2026-04-10T08:00:00Z', tamperAlert: false,
    provenance: [
      { stage: 'Raw Data Ingestion', dataset: 'LoanApplications-2019-2023', hash: '8f3a…c91d', date: '2025-09-01', by: 'Data Engineering' },
      { stage: 'Data Preprocessing', dataset: 'Cleaned-LA-v4', hash: 'b12e…44af', date: '2025-09-08', by: 'Data Science' },
      { stage: 'Feature Engineering', dataset: 'Features-LA-v2', hash: 'c9d2…71bc', date: '2025-09-12', by: 'Data Science' },
      { stage: 'Model Training (v3.1)', dataset: 'Training-Split-80', hash: 'e4f0…0a33', date: '2025-10-01', by: 'ML Platform' },
      { stage: 'Model Training (v3.2)', dataset: 'Training-Split-80-rebal', hash: '1a2b…f9cc', date: '2025-11-20', by: 'ML Platform' },
      { stage: 'Validation & Testing', dataset: 'Holdout-Test-20', hash: '5c6d…b811', date: '2025-11-22', by: 'Model Validation' },
      { stage: 'Bias Audit Passed', dataset: 'BiasAudit-BA-009', hash: '9e0f…3a47', date: '2025-12-05', by: 'Sentinel AI GRC' },
      { stage: 'Production Deployment', dataset: 'MDL-001-v3.2', hash: 'a3f8…1234', date: '2026-01-15', by: 'MLOps' },
    ],
    auditChain: [
      { id: 'ACH-0001', event: 'Model registered', actor: 'Dr. Nina Okafor', ts: '2026-01-15 09:22', hash: 'block:0001::7ab3c…', prev: 'GENESIS' },
      { id: 'ACH-0002', event: 'Bias audit linked (BA-009)', actor: 'Sentinel Autopilot', ts: '2026-01-15 09:25', hash: 'block:0002::2cd1e…', prev: '7ab3c…' },
      { id: 'ACH-0003', event: 'Production approved by CISO', actor: 'James Patel', ts: '2026-01-16 11:00', hash: 'block:0003::5ef4a…', prev: '2cd1e…' },
      { id: 'ACH-0004', event: 'Monthly fingerprint verification', actor: 'Sentinel Monitor', ts: '2026-02-15 08:00', hash: 'block:0004::9gh7b…', prev: '5ef4a…' },
      { id: 'ACH-0005', event: 'Monthly fingerprint verification', actor: 'Sentinel Monitor', ts: '2026-03-15 08:00', hash: 'block:0005::0ij8c…', prev: '9gh7b…' },
      { id: 'ACH-0006', event: 'Monthly fingerprint verification', actor: 'Sentinel Monitor', ts: '2026-04-10 08:00', hash: 'block:0006::3kl2d…', prev: '0ij8c…' },
    ],
  },
  'MDL-002': {
    sha256: 'b5e2d49f8c301247a9f1ee85bcd89012345678901234567890abcdef56789012',
    trainingDataHash: 'sha256:a1c3f52b9e0487d6c2f1a3e09b7d4c8f2a051e6c',
    registeredAt: '2025-11-02T14:10:33Z', registeredBy: 'Raj Mehta',
    lastVerified: '2026-04-10T08:00:00Z', tamperAlert: false,
    provenance: [
      { stage: 'Raw Transaction Data', dataset: 'TXN-Archive-2020-2024', hash: '3a1b…d9e0', date: '2025-07-01', by: 'Data Engineering' },
      { stage: 'Anomaly Labeling', dataset: 'Labeled-Fraud-v7', hash: '7c8d…a11f', date: '2025-08-01', by: 'Fraud Analytics' },
      { stage: 'LSTM Training', dataset: 'Training-Seq-70', hash: '2f4e…bc90', date: '2025-09-15', by: 'ML Platform' },
      { stage: 'Validation & Testing', dataset: 'Holdout-Seq-30', hash: '6g7h…de12', date: '2025-10-01', by: 'Model Validation' },
      { stage: 'Production Deployment', dataset: 'MDL-002-v1.8', hash: 'b5e2…9012', date: '2025-11-02', by: 'MLOps' },
    ],
    auditChain: [
      { id: 'ACH-0010', event: 'Model registered', actor: 'Raj Mehta', ts: '2025-11-02 14:10', hash: 'block:0010::f1a2b…', prev: 'GENESIS' },
      { id: 'ACH-0011', event: 'Production approved by CISO', actor: 'Sarah Chen', ts: '2025-11-03 09:30', hash: 'block:0011::b3c4d…', prev: 'f1a2b…' },
      { id: 'ACH-0012', event: 'Monthly fingerprint verification', actor: 'Sentinel Monitor', ts: '2025-12-15 08:00', hash: 'block:0012::e5f6g…', prev: 'b3c4d…' },
      { id: 'ACH-0013', event: 'Monthly fingerprint verification', actor: 'Sentinel Monitor', ts: '2026-01-15 08:00', hash: 'block:0013::h7i8j…', prev: 'e5f6g…' },
    ],
  },
  'MDL-003': {
    sha256: 'c9d7e123f4567890abcdef1234567890abcdef1234567890abcdef1234567890',
    trainingDataHash: 'sha256:d2e4f6a8b0c1d3e5f7a9b1c3d5e7f9a1b3c5d7e9',
    registeredAt: '2026-02-01T10:00:00Z', registeredBy: 'Emma Wilson',
    lastVerified: '2026-04-01T08:00:00Z', tamperAlert: false,
    provenance: [
      { stage: 'HR Data Pipeline', dataset: 'HR-Records-2021-2025', hash: '4a5b…e0f1', date: '2025-12-01', by: 'Data Engineering' },
      { stage: 'NLP Preprocessing', dataset: 'Tokenized-HR-v3', hash: '8c9d…12ab', date: '2025-12-10', by: 'NLP Team' },
      { stage: 'BERT Fine-tuning', dataset: 'Training-HR-80', hash: '3e4f…56cd', date: '2025-12-20', by: 'ML Platform' },
      { stage: 'Production Deployment', dataset: 'MDL-003-v1.1', hash: 'c9d7…7890', date: '2026-02-01', by: 'MLOps' },
    ],
    auditChain: [
      { id: 'ACH-0020', event: 'Model registered', actor: 'Emma Wilson', ts: '2026-02-01 10:00', hash: 'block:0020::k1l2m…', prev: 'GENESIS' },
      { id: 'ACH-0021', event: 'EU AI Act high-risk classification confirmed', actor: 'Sentinel Autopilot', ts: '2026-02-01 10:05', hash: 'block:0021::n3o4p…', prev: 'k1l2m…' },
      { id: 'ACH-0022', event: 'Staging approval', actor: 'James Patel', ts: '2026-02-10 14:30', hash: 'block:0022::q5r6s…', prev: 'n3o4p…' },
    ],
  },
};

/* ─── Derived model list with DNA ─────────────────────────────────────── */
const MODEL_DNA_LIST = MODELS.map(m => ({
  ...m,
  ...(DNA_EXTRA[m.id] || {
    sha256: `${m.id.toLowerCase().replace('-', '')}${'0'.repeat(48)}abcdef1234`,
    trainingDataHash: `sha256:${m.id.toLowerCase()}${'a1b2c3d4'.repeat(3)}`,
    registeredAt: m.lastValidated + 'T09:00:00Z',
    registeredBy: m.owner,
    lastVerified: '2026-04-10T08:00:00Z',
    tamperAlert: false,
    provenance: [
      { stage: 'Data Ingestion', dataset: `Dataset-${m.id}`, hash: `a1b2…c3d4`, date: m.lastValidated, by: 'Data Engineering' },
      { stage: 'Model Training', dataset: `Training-${m.id}`, hash: `e5f6…g7h8`, date: m.lastValidated, by: 'ML Platform' },
      { stage: 'Production Deployment', dataset: `${m.id}-${m.version}`, hash: `i9j0…k1l2`, date: m.lastValidated, by: 'MLOps' },
    ],
    auditChain: [
      { id: `ACH-${m.id}`, event: 'Model registered', actor: m.owner, ts: m.lastValidated + ' 09:00', hash: `block:AUTO::${m.id}…`, prev: 'GENESIS' },
    ],
  }),
}));

/* ─── Provenance Timeline Graph ───────────────────────────────────────── */
function ProvenanceTimeline({ stages }: { stages: typeof MODEL_DNA_LIST[0]['provenance'] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  return (
    <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, minWidth: 'max-content', paddingTop: 8 }}>
        {stages.map((stage, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start' }}>
            <div
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Node */}
              <div style={{
                width: 14, height: 14, borderRadius: '50%',
                background: hoveredIdx === i ? 'hsl(var(--brand))' : 'hsl(var(--bg-surface))',
                border: `2px solid hsl(var(--brand))`,
                transition: 'background 0.15s',
                zIndex: 1,
              }} />
              {/* Card */}
              <div style={{
                marginTop: 10, width: 148, padding: '10px 10px 8px',
                border: `1px solid ${hoveredIdx === i ? 'hsl(var(--brand))' : 'hsl(var(--border))'}`,
                background: hoveredIdx === i ? 'hsl(var(--brand-subtle))' : 'hsl(var(--bg-raised))',
                transition: 'all 0.15s',
              }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'hsl(var(--text-1))', marginBottom: 4, lineHeight: 1.4 }}>{stage.stage}</p>
                <p style={{ fontSize: 9, color: 'hsl(var(--text-4))', marginBottom: 2 }}>{stage.date} · {stage.by}</p>
                <p style={{ fontSize: 9, fontFamily: 'monospace', color: 'hsl(var(--brand))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stage.hash}</p>
              </div>
            </div>
            {i < stages.length - 1 && (
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 6, marginLeft: -1, marginRight: -1 }}>
                <div style={{ width: 20, height: 2, background: 'hsl(var(--brand))', opacity: 0.3 }} />
                <ArrowRight size={10} style={{ color: 'hsl(var(--brand))', opacity: 0.5 }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Copy Button ─────────────────────────────────────────────────────── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success('Copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      }}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-4))', padding: '2px 4px', display: 'flex', alignItems: 'center' }}
      title="Copy to clipboard"
    >
      {copied ? <Check size={12} style={{ color: 'hsl(var(--s-ok-tx))' }} /> : <Copy size={12} />}
    </button>
  );
}

/* ─── Main Component ───────────────────────────────────────────────────── */
export default function ModelDNA() {
  const { orgName } = useSettingsStore();
  const [selectedModelId, setSelectedModelId] = useState(MODEL_DNA_LIST[0].id);
  const [tab, setTab] = useState('fingerprint');

  const model = useMemo(() =>
    MODEL_DNA_LIST.find(m => m.id === selectedModelId) || MODEL_DNA_LIST[0],
    [selectedModelId]
  );

  const verificationDates = useMemo(() => {
    const base = new Date(model.lastVerified);
    return [0, 1, 2, 3].map(i => {
      const d = new Date(base);
      d.setMonth(d.getMonth() - i);
      return d.toISOString().split('T')[0];
    });
  }, [model]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Breadcrumbs />

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'hsl(var(--text-1))', margin: 0 }}>Model DNA & Provenance Chain</h1>
            <Badge style={{ borderRadius: 0, fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))', border: '1px solid hsl(var(--s-ok-br))' }}>
              ✓ CRYPTOGRAPHIC INTEGRITY
            </Badge>
          </div>
          <p style={{ fontSize: 13, color: 'hsl(var(--text-4))', margin: 0 }}>
            {orgName} · Immutable fingerprinting, training lineage provenance, and tamper-evident audit chain
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <Select value={selectedModelId} onValueChange={setSelectedModelId}>
            <SelectTrigger style={{ width: 220, borderRadius: 0 }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              {MODEL_DNA_LIST.map(m => (
                <SelectItem key={m.id} value={m.id}>
                  <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{m.id}</span>
                  {' — '}
                  <span style={{ fontSize: 12 }}>{m.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            style={{ borderRadius: 0 }}
            onClick={() => toast.success(`Integrity certificate for ${model.name} downloaded`)}
          >
            <DownloadSimple size={13} style={{ marginRight: 4 }} />
            Export Certificate
          </Button>
        </div>
      </div>

      {/* ── KPI Tiles ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          {
            label: 'Model',
            value: model.name,
            sub: `${model.type} · ${model.version}`,
            icon: <Cube size={16} />,
            mono: false,
            ok: null,
          },
          {
            label: 'SHA-256 Fingerprint',
            value: model.sha256.substring(0, 18) + '…',
            sub: 'Click to copy full hash',
            icon: <Hash size={16} />,
            mono: true,
            ok: null,
            copyText: model.sha256,
          },
          {
            label: 'Last Verified',
            value: new Date(model.lastVerified).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            sub: 'Automated monthly check',
            icon: <CheckCircle size={16} />,
            ok: true,
          },
          {
            label: 'Integrity Status',
            value: model.tamperAlert ? 'TAMPERED ⚠' : 'VERIFIED',
            sub: model.tamperAlert ? 'Immediate action required' : 'No tampering detected',
            icon: model.tamperAlert ? <Warning size={16} /> : <ShieldCheck size={16} />,
            ok: !model.tamperAlert,
          },
        ].map((tile, i) => (
          <div key={i} style={{
            padding: '14px 16px',
            background: 'hsl(var(--bg-surface))',
            border: `1px solid ${tile.ok === false ? 'hsl(var(--s-er-br))' : tile.ok === true ? 'hsl(var(--s-ok-br))' : 'hsl(var(--border))'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: tile.ok === false ? 'hsl(var(--s-er-tx))' : tile.ok === true ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--brand))' }}>
                  {tile.icon}
                </span>
                <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, color: 'hsl(var(--text-4))' }}>{tile.label}</span>
              </div>
              {tile.copyText && <CopyButton text={tile.copyText} />}
            </div>
            <p style={{
              fontSize: tile.mono ? 11 : 13,
              fontWeight: 700,
              fontFamily: tile.mono ? 'monospace' : undefined,
              color: tile.ok === false ? 'hsl(var(--s-er-tx))' : tile.ok === true ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-1))',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0,
            }}>
              {tile.value}
            </p>
            <p style={{ fontSize: 10, color: 'hsl(var(--text-4))', marginTop: 3 }}>{tile.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Summary Stats Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Provenance Stages', value: model.provenance.length, icon: <GitBranch size={14} /> },
          { label: 'Audit Chain Blocks', value: model.auditChain.length, icon: <Link size={14} /> },
          { label: 'Verification Cycles', value: verificationDates.length, icon: <ListChecks size={14} /> },
          { label: 'Risk Tier', value: model.riskTier.toUpperCase(), icon: <Sparkle size={14} /> },
        ].map((s, i) => (
          <div key={i} style={{ padding: '10px 14px', background: 'hsl(var(--brand-subtle))', border: '1px solid hsl(var(--brand-subtle))', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'hsl(var(--brand))' }}>{s.icon}</span>
            <div>
              <p style={{ fontSize: 18, fontWeight: 700, color: 'hsl(var(--brand))', margin: 0 }}>{s.value}</p>
              <p style={{ fontSize: 10, color: 'hsl(var(--text-3))', margin: 0 }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-raised))' }}>
          <TabsTrigger value="fingerprint" style={{ borderRadius: 0 }}>
            <Fingerprint size={13} style={{ marginRight: 5 }} />
            Cryptographic Fingerprint
          </TabsTrigger>
          <TabsTrigger value="provenance" style={{ borderRadius: 0 }}>
            <GitBranch size={13} style={{ marginRight: 5 }} />
            Training Lineage
          </TabsTrigger>
          <TabsTrigger value="chain" style={{ borderRadius: 0 }}>
            <Link size={13} style={{ marginRight: 5 }} />
            Audit Chain
          </TabsTrigger>
          <TabsTrigger value="certificate" style={{ borderRadius: 0 }}>
            <Certificate size={13} style={{ marginRight: 5 }} />
            Integrity Certificate
          </TabsTrigger>
        </TabsList>

        {/* ── FINGERPRINT TAB ── */}
        <TabsContent value="fingerprint" style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2">
              <CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Fingerprint size={14} style={{ color: 'hsl(var(--brand))' }} />
                Cryptographic Model Identity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  { label: 'Model Artifact SHA-256', value: model.sha256, copyable: true, mono: true },
                  { label: 'Training Data Hash', value: model.trainingDataHash, copyable: true, mono: true },
                  { label: 'Registered Version', value: model.version, mono: true },
                  { label: 'Registration Timestamp', value: new Date(model.registeredAt).toLocaleString() },
                  { label: 'Registered By', value: model.registeredBy },
                  { label: 'Framework', value: model.framework },
                  { label: 'Owner Team', value: model.department },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid hsl(var(--border))' }}>
                    <span style={{ fontSize: 12, color: 'hsl(var(--text-4))', fontWeight: 500 }}>{row.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        fontSize: 12,
                        fontFamily: row.mono ? 'monospace' : undefined,
                        color: 'hsl(var(--text-1))',
                        background: row.mono ? 'hsl(var(--bg-raised))' : undefined,
                        padding: row.mono ? '3px 8px' : undefined,
                        wordBreak: 'break-all',
                        flex: 1,
                      }}>
                        {row.value}
                      </span>
                      {row.copyable && <CopyButton text={row.value} />}
                    </div>
                  </div>
                ))}
              </div>

              {/* Verification banner */}
              <div style={{ marginTop: 16, padding: '12px 14px', border: '1px solid hsl(var(--s-ok-br))', background: 'hsl(var(--s-ok-bg))', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <SealCheck size={18} weight="fill" style={{ color: 'hsl(var(--s-ok-tx))', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'hsl(var(--s-ok-tx))', marginBottom: 3 }}>
                    Fingerprint verification PASSED — model artifact matches registered hash
                  </p>
                  <p style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>
                    Last verified: {new Date(model.lastVerified).toLocaleString()} · Next scheduled: {verificationDates[0].replace(/(\d{4}-\d{2})/, (_, m) => {
                      const [y, mo] = m.split('-');
                      const next = new Date(parseInt(y), parseInt(mo), 1);
                      return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
                    })}-10
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Verification history */}
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2">
              <CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} style={{ color: 'hsl(var(--brand))' }} />
                Verification History
              </CardTitle>
            </CardHeader>
            <CardContent style={{ padding: 0 }}>
              {verificationDates.map((date, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: i < verificationDates.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
                  <CheckCircle size={14} weight="fill" style={{ color: 'hsl(var(--s-ok-tx))', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'hsl(var(--text-3))' }}>{date} 08:00 UTC</span>
                  <span style={{ fontSize: 12, color: 'hsl(var(--text-2))', flex: 1 }}>Automated SHA-256 artifact verification</span>
                  <span style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>{model.registeredBy}</span>
                  <Badge style={{ borderRadius: 0, fontSize: 9, background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))', border: '1px solid hsl(var(--s-ok-br))' }}>
                    ✓ PASSED
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PROVENANCE TAB ── */}
        <TabsContent value="provenance" style={{ marginTop: 16 }}>
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2">
              <CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))', display: 'flex', alignItems: 'center', gap: 6 }}>
                <GitBranch size={14} style={{ color: 'hsl(var(--brand))' }} />
                Training Lineage Graph — {model.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p style={{ fontSize: 12, color: 'hsl(var(--text-4))', marginBottom: 16 }}>
                Every dataset, transformation, and training run is cryptographically linked. This lineage is immutable and audit-ready per EU AI Act Article 12.
              </p>
              <ProvenanceTimeline stages={model.provenance} />

              <div style={{ marginTop: 20 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                      {['#', 'Stage', 'Dataset / Artifact', 'SHA-256 (truncated)', 'Date', 'Performed By'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'hsl(var(--text-4))', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {model.provenance.map((p, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                        <td style={{ padding: '9px 12px', color: 'hsl(var(--text-4))', fontFamily: 'monospace', fontSize: 11 }}>{String(i + 1).padStart(2, '0')}</td>
                        <td style={{ padding: '9px 12px', fontWeight: 600, color: 'hsl(var(--text-1))' }}>{p.stage}</td>
                        <td style={{ padding: '9px 12px', color: 'hsl(var(--text-3))' }}>{p.dataset}</td>
                        <td style={{ padding: '9px 12px', fontFamily: 'monospace', color: 'hsl(var(--brand))' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {p.hash}
                            <CopyButton text={p.hash} />
                          </div>
                        </td>
                        <td style={{ padding: '9px 12px', color: 'hsl(var(--text-4))' }}>{p.date}</td>
                        <td style={{ padding: '9px 12px', color: 'hsl(var(--text-3))' }}>{p.by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── AUDIT CHAIN TAB ── */}
        <TabsContent value="chain" style={{ marginTop: 16 }}>
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2">
              <CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Link size={14} style={{ color: 'hsl(var(--brand))' }} />
                Tamper-Evident Audit Chain
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p style={{ fontSize: 12, color: 'hsl(var(--text-4))', marginBottom: 16 }}>
                Every event is hashed and linked to the previous block. Any modification to a past event invalidates all subsequent hashes — making tampering immediately detectable.
              </p>

              {/* Chain integrity banner */}
              <div style={{ padding: '10px 14px', marginBottom: 16, border: '1px solid hsl(var(--s-ok-br))', background: 'hsl(var(--s-ok-bg))', display: 'flex', alignItems: 'center', gap: 10 }}>
                <SealCheck size={16} weight="fill" style={{ color: 'hsl(var(--s-ok-tx))' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--s-ok-tx))' }}>
                  Chain integrity: VALID — {model.auditChain.length} blocks verified, hash chain intact
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {model.auditChain.map((block, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
                    {/* Timeline connector */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 36, flexShrink: 0 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: i === 0 ? 'hsl(var(--brand))' : 'hsl(var(--bg-surface))', border: '2px solid hsl(var(--brand))', marginTop: 16 }} />
                      {i < model.auditChain.length - 1 && (
                        <div style={{ width: 2, flex: 1, background: 'hsl(var(--border))', marginTop: 4 }} />
                      )}
                    </div>
                    {/* Block */}
                    <div style={{
                      flex: 1,
                      margin: '8px 0',
                      padding: '12px 14px',
                      background: i === 0 ? 'hsl(var(--bg-raised))' : 'hsl(var(--bg-surface))',
                      border: `1px solid ${i === 0 ? 'hsl(var(--brand-subtle))' : 'hsl(var(--border))'}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 800, padding: '2px 6px', background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' }}>{block.id}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-1))' }}>{block.event}</span>
                        </div>
                        <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'hsl(var(--text-4))' }}>{block.ts}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, fontSize: 11 }}>
                        <div>
                          <span style={{ color: 'hsl(var(--text-4))' }}>Actor: </span>
                          <span style={{ color: 'hsl(var(--text-2))', fontWeight: 500 }}>{block.actor}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ color: 'hsl(var(--text-4))' }}>Hash: </span>
                          <span style={{ fontFamily: 'monospace', color: 'hsl(var(--brand))' }}>{block.hash}</span>
                          <CopyButton text={block.hash} />
                        </div>
                        <div>
                          <span style={{ color: 'hsl(var(--text-4))' }}>Prev: </span>
                          <span style={{ fontFamily: 'monospace', color: 'hsl(var(--text-3))' }}>{block.prev}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CERTIFICATE TAB ── */}
        <TabsContent value="certificate" style={{ marginTop: 16 }}>
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent style={{ padding: 32 }}>
              <div style={{ maxWidth: 680, margin: '0 auto' }}>
                {/* Certificate header */}
                <div style={{ textAlign: 'center', marginBottom: 28, padding: '24px 32px', border: '2px solid hsl(var(--brand-subtle))', background: 'hsl(var(--bg-raised))' }}>
                  <Certificate size={36} weight="duotone" style={{ color: 'hsl(var(--brand))', margin: '0 auto 12px' }} />
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: 'hsl(var(--text-1))', margin: '0 0 6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Model Integrity Certificate
                  </h2>
                  <p style={{ fontSize: 12, color: 'hsl(var(--text-4))', margin: 0 }}>
                    Sentinel AI GRC Platform · Issued {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                  <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: 'hsl(var(--s-ok-bg))', border: '1px solid hsl(var(--s-ok-br))' }}>
                    <SealCheck size={13} weight="fill" style={{ color: 'hsl(var(--s-ok-tx))' }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'hsl(var(--s-ok-tx))' }}>CRYPTOGRAPHIC INTEGRITY VERIFIED</span>
                  </div>
                </div>

                {/* Certificate fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 24 }}>
                  {[
                    ['Certified Model', `${model.name} (${model.id})`],
                    ['Model Type', model.type],
                    ['Version', model.version],
                    ['Framework', model.framework],
                    ['SHA-256 Fingerprint', model.sha256],
                    ['Training Data Hash', model.trainingDataHash],
                    ['Registered By', model.registeredBy],
                    ['Registration Date', new Date(model.registeredAt).toLocaleString()],
                    ['Provenance Stages', `${model.provenance.length} cryptographically linked stages`],
                    ['Audit Chain Blocks', `${model.auditChain.length} immutable events`],
                    ['Last Verification', new Date(model.lastVerified).toLocaleString()],
                    ['Verification Result', 'PASSED — No tampering detected'],
                    ['Certificate Issuer', 'Sentinel AI GRC · Automated Integrity Monitor'],
                  ].map(([label, value], i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid hsl(var(--border))' }}>
                      <span style={{ fontSize: 12, color: 'hsl(var(--text-4))', minWidth: 200 }}>{label}</span>
                      <span style={{ fontSize: 12, fontFamily: value.length > 30 ? 'monospace' : undefined, fontWeight: 500, color: 'hsl(var(--text-1))', maxWidth: 400, textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outline"
                    style={{ borderRadius: 0 }}
                    onClick={() => toast.success('Certificate JSON copied to clipboard')}
                  >
                    <Copy size={13} style={{ marginRight: 5 }} />
                    Copy JSON
                  </Button>
                  <Button
                    style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}
                    onClick={() => toast.success(`Downloading signed PDF certificate for ${model.name}…`)}
                  >
                    <DownloadSimple size={13} style={{ marginRight: 5 }} />
                    Download Signed PDF Certificate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
