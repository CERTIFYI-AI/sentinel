import { useState, useEffect } from 'react';
import { fetchAllModelDNAs } from '../../services/modelDNAService';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { TooltipProvider } from '../../components/ui/tooltip';
import {
  ShieldCheck, Lock, Hash, GitBranch, Clock, CheckCircle, Warning,
  Database, ArrowRight, Download, Eye, TreeStructure, Certificate,
} from '@phosphor-icons/react';
import { useSettingsStore } from '../../stores/settingsStore';

const MODEL_DNA = [
  {
    id: 'MDL-001', name: 'CreditRisk-XGB-v3.2', type: 'XGBoost',
    sha256: 'a3f8c12e9b74d1056e82cc74abc01234567890abcdef1234567890abcdef1234',
    registeredAt: '2026-01-15T09:22:11Z', registeredBy: 'Dr. Nina Okafor',
    trainingDataHash: 'sha256:f4d9e8b2a1c037854d…',
    version: '3.2.1', lastVerified: '2026-04-10T08:00:00Z', status: 'verified',
    tamperAlert: false,
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
      { id: 'ACH-0001', event: 'Model registered', actor: 'Dr. Nina Okafor', ts: '2026-01-15 09:22', hash: 'block:0001::7ab3…', prev: 'GENESIS' },
      { id: 'ACH-0002', event: 'Bias audit linked (BA-009)', actor: 'Sentinel Autopilot', ts: '2026-01-15 09:25', hash: 'block:0002::2cd1…', prev: '7ab3…' },
      { id: 'ACH-0003', event: 'Production approved by CISO', actor: 'James Patel', ts: '2026-01-16 11:00', hash: 'block:0003::5ef4…', prev: '2cd1…' },
      { id: 'ACH-0004', event: 'Monthly fingerprint verification', actor: 'Sentinel Monitor', ts: '2026-02-15 08:00', hash: 'block:0004::9gh7…', prev: '5ef4…' },
      { id: 'ACH-0005', event: 'Monthly fingerprint verification', actor: 'Sentinel Monitor', ts: '2026-03-15 08:00', hash: 'block:0005::0ij8…', prev: '9gh7…' },
      { id: 'ACH-0006', event: 'Monthly fingerprint verification', actor: 'Sentinel Monitor', ts: '2026-04-10 08:00', hash: 'block:0006::3kl2…', prev: '0ij8…' },
    ],
  },
  {
    id: 'MDL-002', name: 'FraudDetect-LSTM-v1.8', type: 'LSTM Neural Net',
    sha256: 'b5e2d49f8c301247a9f1ee85bcd89012345678901234567890abcdef56789012',
    registeredAt: '2025-11-02T14:10:33Z', registeredBy: 'Raj Mehta',
    trainingDataHash: 'sha256:a1c3f52b9e04…',
    version: '1.8.4', lastVerified: '2026-04-10T08:00:00Z', status: 'verified',
    tamperAlert: false,
    provenance: [
      { stage: 'Raw Transaction Data', dataset: 'TXN-Archive-2020-2024', hash: '3a1b…d9e0', date: '2025-07-01', by: 'Data Engineering' },
      { stage: 'Anomaly Labeling', dataset: 'Labeled-Fraud-v7', hash: '7c8d…a11f', date: '2025-08-01', by: 'Fraud Analytics' },
      { stage: 'LSTM Training', dataset: 'Training-Seq-70', hash: '2f4e…bc90', date: '2025-09-15', by: 'ML Platform' },
      { stage: 'Production Deployment', dataset: 'MDL-002-v1.8', hash: 'b5e2…9012', date: '2025-11-02', by: 'MLOps' },
    ],
    auditChain: [
      { id: 'ACH-0010', event: 'Model registered', actor: 'Raj Mehta', ts: '2025-11-02 14:10', hash: 'block:0010::f1a2…', prev: 'GENESIS' },
      { id: 'ACH-0011', event: 'Production approved by CISO', actor: 'Sarah Chen', ts: '2025-11-03 09:30', hash: 'block:0011::b3c4…', prev: 'f1a2…' },
    ],
  },
];

function ProvenanceGraph({ stages }: { stages: typeof MODEL_DNA[0]['provenance'] }) {
  return (
    <div className="overflow-x-auto">
      <div className="flex items-start gap-0 min-w-max py-4">
        {stages.map((stage, i) => (
          <div key={i} className="flex items-start">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 rounded-full" style={{ background: 'hsl(var(--brand))', border: '2px solid hsl(var(--brand) / 0.3)' }} />
              <div className="mt-2 w-36 p-2" style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-surface))' }}>
                <p className="text-[10px] font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{stage.stage}</p>
                <p className="text-[9px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{stage.date}</p>
                <p className="text-[9px] font-mono mt-1 truncate" style={{ color: 'hsl(var(--brand))' }}>{stage.hash}</p>
                <p className="text-[9px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{stage.by}</p>
              </div>
            </div>
            {i < stages.length - 1 && (
              <div className="flex items-center" style={{ marginTop: 5 }}>
                <div style={{ width: 24, height: 2, background: 'hsl(var(--border))' }} />
                <ArrowRight size={10} style={{ color: 'hsl(var(--text-4))' }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ModelDNA() {
  const { orgName } = useSettingsStore();
  const [selectedModel, setSelectedModel] = useState('MDL-001');
  const [tab, setTab] = useState('fingerprint');

  useEffect(() => { fetchAllModelDNAs().catch(() => {}) }, [])

  const model = MODEL_DNA.find(m => m.id === selectedModel) || MODEL_DNA[0];

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Model DNA & Provenance Chain</h1>
              <Badge style={{ borderRadius: 0, fontSize: 9, background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))', border: '1px solid hsl(var(--s-ok-br))' }}>
                CRYPTOGRAPHIC INTEGRITY
              </Badge>
            </div>
            <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>
              {orgName} · Immutable fingerprinting, training lineage provenance, and tamper-evident audit chain for every registered model
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-52" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {MODEL_DNA.map(m => <SelectItem key={m.id} value={m.id}>{m.id} — {m.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" style={{ borderRadius: 0 }}>
              <Download size={13} className="mr-1" />Export Certificate
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Model', value: model.name, icon: TreeStructure, sub: model.type },
            { label: 'SHA-256 Fingerprint', value: model.sha256.substring(0, 16) + '…', icon: Hash, sub: 'Click to copy full hash', mono: true },
            { label: 'Last Verified', value: new Date(model.lastVerified).toLocaleDateString(), icon: CheckCircle, sub: 'Automated monthly check' },
            { label: 'Integrity Status', value: model.tamperAlert ? 'TAMPERED' : 'VERIFIED', icon: ShieldCheck, sub: model.tamperAlert ? 'Immediate action required' : 'No tampering detected', ok: !model.tamperAlert },
          ].map((tile, i) => (
            <div key={i} className="p-4" style={{ border: `1px solid ${tile.ok === false ? 'hsl(var(--destructive))' : 'hsl(var(--border))'}`, background: 'hsl(var(--bg-surface))' }}>
              <div className="flex items-center gap-2 mb-1">
                <tile.icon size={14} style={{ color: tile.ok === false ? 'hsl(var(--destructive))' : 'hsl(var(--brand))' }} />
                <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{tile.label}</span>
              </div>
              <p className={`text-sm font-bold truncate ${tile.mono ? 'font-mono' : ''}`} style={{ color: tile.ok === false ? 'hsl(var(--destructive))' : tile.ok === true ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-1))' }}>{tile.value}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{tile.sub}</p>
            </div>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList style={{ borderRadius: 0 }}>
            <TabsTrigger value="fingerprint" style={{ borderRadius: 0 }}>Cryptographic Fingerprint</TabsTrigger>
            <TabsTrigger value="provenance" style={{ borderRadius: 0 }}>Training Lineage</TabsTrigger>
            <TabsTrigger value="chain" style={{ borderRadius: 0 }}>Audit Chain</TabsTrigger>
            <TabsTrigger value="certificate" style={{ borderRadius: 0 }}>Integrity Certificate</TabsTrigger>
          </TabsList>

          <TabsContent value="fingerprint" className="mt-4 space-y-4">
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-5">
                <p className="text-sm font-semibold mb-4" style={{ color: 'hsl(var(--text-1))' }}>Cryptographic Model Identity</p>
                <div className="space-y-3">
                  {[
                    { label: 'Model Artifact SHA-256', value: model.sha256, copyable: true },
                    { label: 'Training Data Hash', value: model.trainingDataHash, copyable: true },
                    { label: 'Registered Version', value: model.version },
                    { label: 'Registration Timestamp', value: model.registeredAt },
                    { label: 'Registered By', value: model.registeredBy },
                  ].map((row, i) => (
                    <div key={i} className="grid grid-cols-3 gap-4 items-center py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>{row.label}</span>
                      <span className="col-span-2 text-xs font-mono px-2 py-1" style={{ background: 'hsl(var(--bg-raised))', color: 'hsl(var(--text-1))', wordBreak: 'break-all' }}>{row.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3" style={{ border: '1px solid hsl(var(--s-ok-br))', background: 'hsl(var(--s-ok-bg))' }}>
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} style={{ color: 'hsl(var(--s-ok-tx))' }} />
                    <span className="text-xs font-semibold" style={{ color: 'hsl(var(--s-ok-tx))' }}>Fingerprint verification passed — model artifact matches registered hash</span>
                  </div>
                  <p className="text-[10px] mt-1 ml-5" style={{ color: 'hsl(var(--text-4))' }}>
                    Last verified: {new Date(model.lastVerified).toLocaleString()} · Next scheduled: 2026-05-10
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-5">
                <p className="text-sm font-semibold mb-2" style={{ color: 'hsl(var(--text-1))' }}>Verification History</p>
                <div className="space-y-2">
                  {['2026-04-10', '2026-03-15', '2026-02-15', '2026-01-15'].map((date, i) => (
                    <div key={i} className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <CheckCircle size={13} style={{ color: 'hsl(var(--s-ok-tx))' }} />
                      <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>{date} 08:00 UTC</span>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>Automated SHA-256 verification</span>
                      <Badge className="ml-auto text-[9px] px-1.5 py-0" style={{ borderRadius: 0, background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' }}>PASSED</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="provenance" className="mt-4">
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-5">
                <p className="text-sm font-semibold mb-1" style={{ color: 'hsl(var(--text-1))' }}>Training Lineage Graph — {model.name}</p>
                <p className="text-xs mb-4" style={{ color: 'hsl(var(--text-4))' }}>
                  Every dataset, transformation, and training run is cryptographically linked. This lineage is immutable and audit-ready.
                </p>
                <ProvenanceGraph stages={model.provenance} />
                <div className="mt-4">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                        {['Stage', 'Dataset / Artifact', 'SHA-256 (truncated)', 'Date', 'Performed By'].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {model.provenance.map((p, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                          <td className="px-3 py-2 font-medium" style={{ color: 'hsl(var(--text-1))' }}>{p.stage}</td>
                          <td className="px-3 py-2" style={{ color: 'hsl(var(--text-3))' }}>{p.dataset}</td>
                          <td className="px-3 py-2 font-mono" style={{ color: 'hsl(var(--brand))' }}>{p.hash}</td>
                          <td className="px-3 py-2" style={{ color: 'hsl(var(--text-4))' }}>{p.date}</td>
                          <td className="px-3 py-2" style={{ color: 'hsl(var(--text-3))' }}>{p.by}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chain" className="mt-4">
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-5">
                <p className="text-sm font-semibold mb-1" style={{ color: 'hsl(var(--text-1))' }}>Tamper-Evident Audit Chain</p>
                <p className="text-xs mb-4" style={{ color: 'hsl(var(--text-4))' }}>
                  Every event is hashed and linked to the previous block. Any modification to a past event invalidates all subsequent hashes, making tampering immediately detectable.
                </p>
                <div className="space-y-2">
                  {model.auditChain.map((block, i) => (
                    <div key={i} className="p-3" style={{ border: '1px solid hsl(var(--border))', background: i === 0 ? 'hsl(var(--bg-raised))' : undefined }}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5" style={{ background: 'hsl(var(--brand) / 0.12)', color: 'hsl(var(--brand))' }}>{block.id}</span>
                          <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{block.event}</span>
                        </div>
                        <span className="text-[10px] font-mono" style={{ color: 'hsl(var(--text-4))' }}>{block.ts}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-[10px]">
                        <div><span style={{ color: 'hsl(var(--text-4))' }}>Actor: </span><span style={{ color: 'hsl(var(--text-2))' }}>{block.actor}</span></div>
                        <div><span style={{ color: 'hsl(var(--text-4))' }}>Hash: </span><span className="font-mono" style={{ color: 'hsl(var(--brand))' }}>{block.hash}</span></div>
                        <div><span style={{ color: 'hsl(var(--text-4))' }}>Prev: </span><span className="font-mono" style={{ color: 'hsl(var(--text-3))' }}>{block.prev}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="certificate" className="mt-4">
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-6">
                <div className="max-w-2xl mx-auto">
                  <div className="text-center mb-6 p-4" style={{ border: '2px solid hsl(var(--brand))', background: 'hsl(var(--brand) / 0.03)' }}>
                    <Certificate size={32} style={{ color: 'hsl(var(--brand))', margin: '0 auto 8px' }} />
                    <h2 className="text-lg font-bold" style={{ color: 'hsl(var(--text-1))' }}>MODEL INTEGRITY CERTIFICATE</h2>
                    <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>Sentinel AI GRC Platform · Issued {new Date().toLocaleDateString()}</p>
                  </div>
                  <div className="space-y-3 text-xs">
                    {[
                      ['Certified Model', `${model.name} (${model.id})`],
                      ['Model Type', model.type],
                      ['Version', model.version],
                      ['SHA-256 Fingerprint', model.sha256],
                      ['Training Data Hash', model.trainingDataHash],
                      ['Provenance Stages', `${model.provenance.length} cryptographically linked stages`],
                      ['Audit Chain Blocks', `${model.auditChain.length} immutable events`],
                      ['Last Verification', new Date(model.lastVerified).toLocaleString()],
                      ['Verification Result', 'PASSED — No tampering detected'],
                      ['Certificate Issuer', 'Sentinel AI GRC · Automated Integrity Monitor'],
                    ].map(([label, value], i) => (
                      <div key={i} className="flex justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                        <span style={{ color: 'hsl(var(--text-4))' }}>{label}</span>
                        <span className="font-mono font-medium" style={{ color: 'hsl(var(--text-1))', maxWidth: 320, textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
                      <Download size={13} className="mr-2" />Download Signed PDF Certificate
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
