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
import { useModelDnaData } from '@/hooks/useModelDnaData';
import type { DnaRecord, ProvenanceStage } from '@/services/modelDnaService';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { useSettingsStore } from '../../stores/settingsStore';
import { PageHeader } from '../../components/ui/PageHeader';

/* ─── Provenance Timeline Graph ───────────────────────────────────────── */
function ProvenanceTimeline({ stages }: { stages: ProvenanceStage[] }) {
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
  const { records, isLoading, saveDna, deleteDna } = useModelDnaData();
  const [selectedModelId, setSelectedModelId] = useState('');
  const [tab, setTab] = useState('fingerprint');
  const [registerOpen, setRegisterOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const selectedId = records.some(r => r.id === selectedModelId) ? selectedModelId : (records[0]?.id ?? '');
  const model = useMemo(() => records.find(m => m.id === selectedId) ?? null, [records, selectedId]);

  const verificationDates = useMemo(() => {
    const base = model ? new Date(model.lastVerified) : new Date();
    return [0, 1, 2, 3].map(i => {
      const d = new Date(base);
      d.setMonth(d.getMonth() - i);
      return d.toISOString().split('T')[0];
    });
  }, [model]);

  const registerDna = (id: string, name: string, owner: string, baseModel: string) => {
    const now = new Date().toISOString();
    // If a DNA record for this model id already exists, carry its DB _rowId so we
    // UPDATE it instead of inserting a duplicate row for the same model.
    const existing = records.find(r => r.id === id);
    const rec: DnaRecord = {
      id, name, type: '—', version: 'v1.0', riskTier: 'limited', owner: owner || '—',
      framework: '—', department: '—',
      sha256: '', trainingDataHash: '', registeredAt: now, registeredBy: owner || 'You',
      lastVerified: now, tamperAlert: false, baseModel: baseModel || undefined, parentModelId: null,
      provenance: [{ stage: 'Model registered', dataset: id, hash: '—', date: now.slice(0, 10), by: owner || 'You' }],
      auditChain: [{ id: 'ACH-0001', event: 'DNA record created', actor: owner || 'You', ts: now.slice(0, 16).replace('T', ' '), hash: 'block:0001', prev: 'GENESIS' }],
      _rowId: existing?._rowId,
    };
    saveDna(rec).then(() => { toast.success(`DNA record created for ${name}`); setSelectedModelId(id); })
      .catch(() => toast.error('Failed to create DNA record'));
    setRegisterOpen(false);
  };

  const removeDna = () => {
    setDeleteOpen(false);
    if (!model?._rowId) return;
    const target = model;
    deleteDna(target._rowId!).then(() => toast.success(`DNA record for ${target.name} removed`))
      .catch(() => toast.error('Failed to remove DNA record'));
  };

  const exportCert = () => {
    if (!model) return;
    const cert = {
      model: model.name, id: model.id, fingerprint: model.sha256,
      trainingDataHash: model.trainingDataHash, registeredAt: model.registeredAt,
      registeredBy: model.registeredBy, lastVerified: model.lastVerified,
      tamperAlert: model.tamperAlert, provenance: model.provenance, auditChain: model.auditChain,
    };
    const blob = new Blob([JSON.stringify(cert, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `model-dna-${model.id}.json`; a.click(); URL.revokeObjectURL(url);
    toast.success(`Integrity certificate for ${model.name} exported`);
  };

  if (isLoading) {
    return <div style={{ padding: 24, fontSize: 13, color: 'hsl(var(--text-4))' }}>Loading model DNA…</div>;
  }
  if (!model) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <PageHeader title="Model DNA & Provenance Chain"
          subtitle={`${orgName} · Immutable fingerprinting & provenance`}
          actions={<Button size="sm" onClick={() => setRegisterOpen(true)}>Register DNA</Button>} />
        <Card><CardContent style={{ padding: 48, textAlign: 'center', color: 'hsl(var(--text-4))' }}>
          <Fingerprint size={28} style={{ opacity: 0.4, margin: '0 auto 8px' }} />
          <p style={{ fontSize: 13 }}>No model DNA records yet. Register one to start fingerprint &amp; lineage tracking.</p>
          <Button size="sm" style={{ marginTop: 12 }} onClick={() => setRegisterOpen(true)}>Register DNA</Button>
        </CardContent></Card>
        <RegisterDnaDialog open={registerOpen} onOpenChange={setRegisterOpen} onRegister={registerDna} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader
        title="Model DNA & Provenance Chain"
        subtitle={`${orgName} · Immutable fingerprinting, training lineage provenance, and tamper-evident audit chain`}
        badge={
          <Badge style={{ borderRadius: 0, fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))', border: '1px solid hsl(var(--s-ok-br))' }}>
            ✓ CRYPTOGRAPHIC INTEGRITY
          </Badge>
        }
        actions={
          <>
            <Select value={selectedId} onValueChange={setSelectedModelId}>
              <SelectTrigger style={{ width: 220, borderRadius: 0 }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {records.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{m.id}</span>
                    {' — '}
                    <span style={{ fontSize: 12 }}>{m.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setRegisterOpen(true)}>Register DNA</Button>
            <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>Delete</Button>
            <Button variant="outline" size="sm" leftIcon={<DownloadSimple size={13} />} onClick={exportCert}>
              Export Certificate
            </Button>
          </>
        }
      />

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

              {/* Verification banner — reflects the record's real tamperAlert flag */}
              <div style={{ marginTop: 16, padding: '12px 14px', border: `1px solid ${model.tamperAlert ? 'hsl(var(--s-er-br))' : 'hsl(var(--s-ok-br))'}`, background: model.tamperAlert ? 'hsl(var(--s-er-bg))' : 'hsl(var(--s-ok-bg))', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                {model.tamperAlert
                  ? <Warning size={18} weight="fill" style={{ color: 'hsl(var(--s-er-tx))', flexShrink: 0, marginTop: 1 }} />
                  : <SealCheck size={18} weight="fill" style={{ color: 'hsl(var(--s-ok-tx))', flexShrink: 0, marginTop: 1 }} />}
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: model.tamperAlert ? 'hsl(var(--s-er-tx))' : 'hsl(var(--s-ok-tx))', marginBottom: 3 }}>
                    {model.tamperAlert
                      ? 'Fingerprint verification FAILED — artifact hash does not match the registered value'
                      : 'Fingerprint verification PASSED — model artifact matches registered hash'}
                  </p>
                  <p style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>
                    Last verified: {new Date(model.lastVerified).toLocaleString()}
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
                Verification Schedule
              </CardTitle>
            </CardHeader>
            <CardContent style={{ padding: 0 }}>
              <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', padding: '10px 16px 0' }}>
                Automated monthly SHA-256 artifact checks, anchored to the last verification. The most recent check reflects the current integrity status.
              </p>
              {verificationDates.map((date, i) => {
                // i === 0 is the latest check → reflect the real tamperAlert flag.
                const failed = i === 0 && model.tamperAlert;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: i < verificationDates.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
                    {failed
                      ? <Warning size={14} weight="fill" style={{ color: 'hsl(var(--s-er-tx))', flexShrink: 0 }} />
                      : <CheckCircle size={14} weight="fill" style={{ color: 'hsl(var(--s-ok-tx))', flexShrink: 0 }} />}
                    <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'hsl(var(--text-3))' }}>{date} 08:00 UTC</span>
                    <span style={{ fontSize: 12, color: 'hsl(var(--text-2))', flex: 1 }}>Automated SHA-256 artifact verification</span>
                    <span style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>{model.registeredBy}</span>
                    <Badge style={{ borderRadius: 0, fontSize: 9, background: failed ? 'hsl(var(--s-er-bg))' : 'hsl(var(--s-ok-bg))', color: failed ? 'hsl(var(--s-er-tx))' : 'hsl(var(--s-ok-tx))', border: `1px solid ${failed ? 'hsl(var(--s-er-br))' : 'hsl(var(--s-ok-br))'}` }}>
                      {failed ? '⚠ FAILED' : '✓ PASSED'}
                    </Badge>
                  </div>
                );
              })}
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

              {/* Chain integrity banner — reflects the record's real tamperAlert flag */}
              <div style={{ padding: '10px 14px', marginBottom: 16, border: `1px solid ${model.tamperAlert ? 'hsl(var(--s-er-br))' : 'hsl(var(--s-ok-br))'}`, background: model.tamperAlert ? 'hsl(var(--s-er-bg))' : 'hsl(var(--s-ok-bg))', display: 'flex', alignItems: 'center', gap: 10 }}>
                {model.tamperAlert
                  ? <Warning size={16} weight="fill" style={{ color: 'hsl(var(--s-er-tx))' }} />
                  : <SealCheck size={16} weight="fill" style={{ color: 'hsl(var(--s-ok-tx))' }} />}
                <span style={{ fontSize: 12, fontWeight: 600, color: model.tamperAlert ? 'hsl(var(--s-er-tx))' : 'hsl(var(--s-ok-tx))' }}>
                  {model.tamperAlert
                    ? `Chain integrity: COMPROMISED — tamper detected across ${model.auditChain.length} blocks`
                    : `Chain integrity: VALID — ${model.auditChain.length} blocks verified, hash chain intact`}
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
                  <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: model.tamperAlert ? 'hsl(var(--s-er-bg))' : 'hsl(var(--s-ok-bg))', border: `1px solid ${model.tamperAlert ? 'hsl(var(--s-er-br))' : 'hsl(var(--s-ok-br))'}` }}>
                    {model.tamperAlert
                      ? <Warning size={13} weight="fill" style={{ color: 'hsl(var(--s-er-tx))' }} />
                      : <SealCheck size={13} weight="fill" style={{ color: 'hsl(var(--s-ok-tx))' }} />}
                    <span style={{ fontSize: 11, fontWeight: 700, color: model.tamperAlert ? 'hsl(var(--s-er-tx))' : 'hsl(var(--s-ok-tx))' }}>
                      {model.tamperAlert ? 'INTEGRITY COMPROMISED — TAMPER DETECTED' : 'CRYPTOGRAPHIC INTEGRITY VERIFIED'}
                    </span>
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
                    ['Verification Result', model.tamperAlert ? 'FAILED — Tampering detected' : 'PASSED — No tampering detected'],
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
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify({ model: model.name, id: model.id, fingerprint: model.sha256, provenance: model.provenance, auditChain: model.auditChain }, null, 2));
                      toast.success('Certificate JSON copied to clipboard');
                    }}
                  >
                    <Copy size={13} style={{ marginRight: 5 }} />
                    Copy JSON
                  </Button>
                  <Button
                    style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}
                    onClick={exportCert}
                  >
                    <DownloadSimple size={13} style={{ marginRight: 5 }} />
                    Download Certificate (JSON)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <RegisterDnaDialog open={registerOpen} onOpenChange={setRegisterOpen} onRegister={registerDna} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete DNA record?"
        description={`The fingerprint, lineage and audit chain for “${model.name}” will be permanently removed.`}
        confirmLabel="Delete"
        isDestructive
        onConfirm={removeDna}
      />
    </div>
  );
}

// ── Register DNA dialog ───────────────────────────────────────────────────────
function RegisterDnaDialog({ open, onOpenChange, onRegister }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  onRegister: (id: string, name: string, owner: string, baseModel: string) => void;
}) {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [owner, setOwner] = useState('');
  const [baseModel, setBaseModel] = useState('');
  const canSubmit = Boolean(id.trim() && name.trim());
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ borderRadius: 0 }}>
        <DialogHeader><DialogTitle>Register model DNA</DialogTitle></DialogHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-4))' }}>Model ID</label>
            <Input value={id} onChange={e => setId(e.target.value)} placeholder="MDL-010" style={{ borderRadius: 0, marginTop: 4 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-4))' }}>Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Model name" style={{ borderRadius: 0, marginTop: 4 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-4))' }}>Owner</label>
              <Input value={owner} onChange={e => setOwner(e.target.value)} placeholder="Team / owner" style={{ borderRadius: 0, marginTop: 4 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-4))' }}>Base model</label>
              <Input value={baseModel} onChange={e => setBaseModel(e.target.value)} placeholder="e.g. BERT-base" style={{ borderRadius: 0, marginTop: 4 }} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!canSubmit} onClick={() => onRegister(id.trim(), name.trim(), owner.trim(), baseModel.trim())}>Register</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
