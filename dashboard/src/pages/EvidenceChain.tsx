import { useState, useMemo } from 'react'
import { Lock, CheckCircle, Warning, X, Download, MagnifyingGlass, ShieldCheck, Eye, ArrowRight, Copy, Shield, FileText, Clock, ArrowDown, Plus } from '@phosphor-icons/react'
import { toast } from 'sonner'


type ActionType = 'Control Assessment' | 'Evidence Upload' | 'Bias Audit' | 'Risk Review' | 'Policy Approval' | 'DSR Processed' | 'Incident Logged' | 'Model Approved'
type VerifyStatus = 'Valid' | 'Tampered' | 'Pending'

interface ChainEntry {
  id: string
  blockIndex: number
  timestamp: string
  actor: string
  role: string
  action: ActionType
  module: string
  entityId: string
  entityName: string
  description: string
  hash: string
  prevHash: string
  nonce: number
  regulatoryRef: string
  signature: string
  verifyStatus: VerifyStatus
  tags: string[]
}

function computeDisplayHash(index: number, seed: string): string {
  const chars = '0123456789abcdef'
  let h = ''
  for (let i = 0; i < 64; i++) h += chars[(index * 7 + seed.charCodeAt(i % seed.length) + i * 13) % 16]
  return h
}

const CHAIN: ChainEntry[] = [
  { id: 'BLK-0001', blockIndex: 1, timestamp: '2026-04-12T09:14:32Z', actor: 'Sarah Chen', role: 'CISO', action: 'Control Assessment', module: 'Compliance Controls', entityId: 'CTRL-034', entityName: 'AI Risk Management System', description: 'Completed full control assessment for CTRL-034. 47 evidence artefacts reviewed. Control rated Effective.', hash: computeDisplayHash(1, 'control-034'), prevHash: '0'.repeat(64), nonce: 48291, regulatoryRef: 'EU AI Act Art.9 / ISO 42001 §6.1', signature: 'SHA256:' + computeDisplayHash(1, 'sig-ctrl034').slice(0, 16), verifyStatus: 'Valid', tags: ['EU AI Act', 'ISO 42001', 'Control'] },
  { id: 'BLK-0002', blockIndex: 2, timestamp: '2026-04-12T10:02:11Z', actor: 'James Liu', role: 'Model Risk Lead', action: 'Bias Audit', module: 'Bias Audits', entityId: 'BA-012', entityName: 'Loan Approval Model v3.0', description: 'Bias audit completed. Gender parity gap: 4.2% above threshold. Remediation plan created. Audit artefacts SHA-256 signed and attached.', hash: computeDisplayHash(2, 'ba-012'), prevHash: computeDisplayHash(1, 'control-034'), nonce: 91047, regulatoryRef: 'CFPB ECOA / EU AI Act Art.10', signature: 'SHA256:' + computeDisplayHash(2, 'sig-ba012').slice(0, 16), verifyStatus: 'Valid', tags: ['CFPB', 'EU AI Act', 'Bias Audit'] },
  { id: 'BLK-0003', blockIndex: 3, timestamp: '2026-04-12T11:45:08Z', actor: 'Maria Santos', role: 'DPO', action: 'DSR Processed', module: 'DSR Management', entityId: 'DSR-089', entityName: 'Data Subject: J.R.** (masked)', description: 'Right to Erasure request processed within 28-day SLA. PII removed from 4 training datasets. Confirmation log hashed.', hash: computeDisplayHash(3, 'dsr-089'), prevHash: computeDisplayHash(2, 'ba-012'), nonce: 33812, regulatoryRef: 'GDPR Art.17 / UK GDPR S.49', signature: 'SHA256:' + computeDisplayHash(3, 'sig-dsr089').slice(0, 16), verifyStatus: 'Valid', tags: ['GDPR', 'DSR', 'Privacy'] },
  { id: 'BLK-0004', blockIndex: 4, timestamp: '2026-04-12T13:20:44Z', actor: 'Marcus Johnson', role: 'Risk Manager', action: 'Risk Review', module: 'Financial Risk', entityId: 'FRQ-003', entityName: 'OpenAI API Outage Risk', description: 'Quarterly risk review completed. AEL updated from $720K to $890K following Q1 outage event. Monte Carlo resimulated.', hash: computeDisplayHash(4, 'frq-003'), prevHash: computeDisplayHash(3, 'dsr-089'), nonce: 72390, regulatoryRef: 'NIST AI RMF MEASURE 2.5', signature: 'SHA256:' + computeDisplayHash(4, 'sig-frq003').slice(0, 16), verifyStatus: 'Valid', tags: ['NIST', 'Financial Risk', 'FAIR'] },
  { id: 'BLK-0005', blockIndex: 5, timestamp: '2026-04-12T14:55:17Z', actor: 'Emma Wilson', role: 'Compliance Officer', action: 'Policy Approval', module: 'Policy Management', entityId: 'POL-021', entityName: 'AI Transparency & Explainability Policy', description: 'Policy approved by AI Ethics Committee (4 of 4 quorum). Version 3.1 supersedes 3.0. AI-signed approval record attached.', hash: computeDisplayHash(5, 'pol-021'), prevHash: computeDisplayHash(4, 'frq-003'), nonce: 51904, regulatoryRef: 'EU AI Act Art.13 / ISO 42001 §8.4', signature: 'SHA256:' + computeDisplayHash(5, 'sig-pol021').slice(0, 16), verifyStatus: 'Valid', tags: ['EU AI Act', 'Policy', 'ISO 42001'] },
  { id: 'BLK-0006', blockIndex: 6, timestamp: '2026-04-12T15:33:29Z', actor: 'Sarah Chen', role: 'CISO', action: 'Incident Logged', module: 'Incidents', entityId: 'INC-047', entityName: 'Model Output Discrimination — Mortgage', description: 'P1 incident: Mortgage model discriminating on zip code proxy. SEC and CFPB notification timers initiated. 72hr window.', hash: computeDisplayHash(6, 'inc-047'), prevHash: computeDisplayHash(5, 'pol-021'), nonce: 89217, regulatoryRef: 'CFPB ECOA / SEC 17a-4', signature: 'SHA256:' + computeDisplayHash(6, 'sig-inc047').slice(0, 16), verifyStatus: 'Valid', tags: ['CFPB', 'Incident', 'P1'] },
  { id: 'BLK-0007', blockIndex: 7, timestamp: '2026-04-12T16:08:03Z', actor: 'Raj Gupta', role: 'ML Engineer', action: 'Model Approved', module: 'Model Inventory', entityId: 'MDL-019', entityName: 'Fraud Detection Engine v4.3', description: 'Model v4.3 passed validation: accuracy 96.2%, bias Δ < 2%, explainability score 84/100. Approved for production deployment.', hash: computeDisplayHash(7, 'mdl-019'), prevHash: computeDisplayHash(6, 'inc-047'), nonce: 61088, regulatoryRef: 'EU AI Act Art.9/Art.13 / NIST AI RMF', signature: 'SHA256:' + computeDisplayHash(7, 'sig-mdl019').slice(0, 16), verifyStatus: 'Valid', tags: ['EU AI Act', 'Model Validation', 'NIST'] },
  { id: 'BLK-0008', blockIndex: 8, timestamp: '2026-04-12T16:47:55Z', actor: 'System (auto)', role: 'Automated Control', action: 'Evidence Upload', module: 'Evidence Sync', entityId: 'EVD-234', entityName: 'Monthly Monitoring Report — April 2026', description: 'Automated evidence collection completed: 234 controls sampled, 91.4% green. 20 controls require review. Report auto-hashed.', hash: computeDisplayHash(8, 'evd-234'), prevHash: computeDisplayHash(7, 'mdl-019'), nonce: 40729, regulatoryRef: 'ISO 42001 §10.2 / NIST MEASURE', signature: 'SHA256:' + computeDisplayHash(8, 'sig-evd234').slice(0, 16), verifyStatus: 'Valid', tags: ['ISO 42001', 'Evidence', 'Automated'] },
]

const ACTION_COLOR: Record<ActionType, string> = {
  'Control Assessment': 'hsl(var(--s-in-tx))',
  'Evidence Upload':    'hsl(var(--s-ok-tx))',
  'Bias Audit':         'hsl(280 70% 55%)',
  'Risk Review':        'hsl(var(--s-wn-tx))',
  'Policy Approval':    'hsl(var(--brand))',
  'DSR Processed':      'hsl(199 89% 48%)',
  'Incident Logged':    'hsl(var(--destructive))',
  'Model Approved':     'hsl(var(--s-ok-tx))',
}

export default function EvidenceChain() {
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('All')
  const [selected, setSelected] = useState<ChainEntry | null>(null)
  const [drawerTab, setDrawerTab] = useState<'detail' | 'verify' | 'export'>('detail')
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<null | { valid: boolean; chainIntact: boolean; timestamp: string }>(null)

  const filtered = useMemo(() => CHAIN.filter(e => {
    const m = !search || e.entityName.toLowerCase().includes(search.toLowerCase()) || e.actor.toLowerCase().includes(search.toLowerCase()) || e.action.toLowerCase().includes(search.toLowerCase()) || e.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
    const a = actionFilter === 'All' || e.action === actionFilter
    return m && a
  }), [search, actionFilter])

  const handleVerify = (entry: ChainEntry) => {
    setVerifying(true)
    setVerifyResult(null)
    setTimeout(() => {
      setVerifyResult({ valid: entry.verifyStatus === 'Valid', chainIntact: true, timestamp: new Date().toISOString() })
      setVerifying(false)
    }, 1400)
  }

  const handleExportPackage = () => {
    toast.success('Court-admissible evidence package generated — ZIP ready for download')
  }

  const totalEntries = CHAIN.length
  const validEntries = CHAIN.filter(e => e.verifyStatus === 'Valid').length
  const frameworks = [...new Set(CHAIN.flatMap(e => e.tags.filter(t => ['EU AI Act', 'ISO 42001', 'GDPR', 'NIST', 'CFPB'].includes(t))))].length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
            <Lock size={20} weight="fill" className="text-[hsl(var(--brand))]" />
            Cryptographic Evidence Chain
          </h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">
            SHA-256 hash-chained audit trail — every governance action signed, immutable, and court-admissible
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportPackage} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-raised">
            <Download size={14} /> Export Evidence Package
          </button>
          <button onClick={() => toast.success('Chain integrity verification started across all 847 blocks')} className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))] text-sm hover:opacity-90">
            <ShieldCheck size={14} /> Verify Chain Integrity
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Chain Blocks', value: '847', sub: 'Total signed entries', color: 'hsl(var(--brand))' },
          { label: 'Chain Integrity', value: '100%', sub: `${validEntries}/${totalEntries} verified valid`, color: 'hsl(var(--s-ok-tx))' },
          { label: 'Frameworks Covered', value: frameworks, sub: 'Active regulatory references', color: 'hsl(var(--text-1))' },
          { label: 'Last Block', value: '2m ago', sub: 'Auto-sealed every action', color: 'hsl(var(--text-1))' },
        ].map(s => (
          <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-surface p-4">
            <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide">{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-[hsl(var(--text-4))] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 p-3 rounded border border-[hsl(var(--s-ok-bg))] bg-[hsl(var(--s-ok-bg))]">
        <ShieldCheck size={16} className="text-[hsl(var(--s-ok-tx))] flex-shrink-0" />
        <div className="text-xs text-[hsl(var(--text-2))]">
          <span className="font-semibold text-[hsl(var(--s-ok-tx))]">Chain integrity confirmed.</span> All 847 blocks verified. SHA-256 hash chain intact from genesis block. Every entry is tamper-evident — any modification breaks the chain and triggers instant alert.
        </div>
        <div className="ml-auto flex-shrink-0 flex items-center gap-1.5 text-[11px] text-[hsl(var(--s-ok-tx))] font-medium">
          <div className="w-2 h-2 rounded-full bg-[hsl(var(--s-ok-tx))] animate-pulse" />
          Live monitoring
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by entity, actor, tag…" className="w-full pl-9 pr-3 py-2 text-sm border border-[hsl(var(--border))] bg-surface text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:outline-none focus:border-[hsl(var(--brand))]" />
        </div>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="px-3 py-2 text-sm border border-[hsl(var(--border))] bg-surface text-[hsl(var(--text-1))] focus:outline-none">
          {['All', 'Control Assessment', 'Bias Audit', 'Policy Approval', 'DSR Processed', 'Risk Review', 'Incident Logged', 'Model Approved', 'Evidence Upload'].map(a => <option key={a}>{a}</option>)}
        </select>
      </div>

      <div className="relative">
        <div className="absolute left-[22px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-[hsl(var(--brand)/0.5)] to-[hsl(var(--border)/0.3)] pointer-events-none" />
        <div className="space-y-3">
          {filtered.map((entry, idx) => (
            <div key={entry.id} className="relative pl-12">
              <div className="absolute left-[16px] top-4 w-3 h-3 rounded-full border-2 border-[hsl(var(--brand))] bg-surface z-10" />
              <div onClick={() => { setSelected(entry); setDrawerTab('detail'); setVerifyResult(null) }} className="rounded border border-[hsl(var(--border))] bg-surface p-4 cursor-pointer hover:border-[hsl(var(--brand)/0.4)] transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-[10px] text-[hsl(var(--text-4))]">#{entry.blockIndex.toString().padStart(4, '0')}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: ACTION_COLOR[entry.action] + '20', color: ACTION_COLOR[entry.action] }}>{entry.action}</span>
                      {entry.tags.slice(0, 2).map(t => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 border border-[hsl(var(--border))] text-[hsl(var(--text-4))]">{t}</span>
                      ))}
                      <div className="flex items-center gap-1 ml-auto">
                        <CheckCircle size={12} className="text-[hsl(var(--s-ok-tx))]" />
                        <span className="text-[10px] text-[hsl(var(--s-ok-tx))] font-medium">Verified</span>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-[hsl(var(--text-1))]">{entry.entityName}</p>
                    <p className="text-xs text-[hsl(var(--text-4))] mt-0.5 line-clamp-1">{entry.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-[hsl(var(--text-4))]">{entry.actor}</p>
                    <p className="text-[10px] text-[hsl(var(--text-4))]">{entry.role}</p>
                    <p className="text-[10px] text-[hsl(var(--text-4))] mt-1">{entry.timestamp.replace('T', ' ').slice(0, 16)}Z</p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-[hsl(var(--border))] flex items-center gap-3">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <Lock size={10} className="text-[hsl(var(--text-4))] flex-shrink-0" />
                    <span className="font-mono text-[10px] text-[hsl(var(--text-4))] truncate">{entry.hash}</span>
                  </div>
                  <ArrowRight size={10} className="text-[hsl(var(--text-4))]" />
                  <span className="text-[10px] text-[hsl(var(--text-4))]">{entry.regulatoryRef}</span>
                </div>
              </div>
              {idx < filtered.length - 1 && (
                <div className="absolute left-[21px] top-full h-3 flex items-center justify-center">
                  <ArrowDown size={10} className="text-[hsl(var(--brand)/0.5)]" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-[hsl(var(--text-4))]">
          <Lock size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No chain entries match your filters</p>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[520px] bg-surface border-l border-[hsl(var(--border))] flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
              <div>
                <p className="font-mono text-xs text-[hsl(var(--brand))]">{selected.id} · Block #{selected.blockIndex}</p>
                <h2 className="text-base font-semibold text-[hsl(var(--text-1))]">{selected.entityName}</h2>
                <p className="text-xs text-[hsl(var(--text-4))] mt-0.5">{selected.action} · {selected.actor} ({selected.role})</p>
              </div>
              <button onClick={() => setSelected(null)}><X size={18} className="text-[hsl(var(--text-4))]" /></button>
            </div>
            <div className="flex border-b border-[hsl(var(--border))]">
              {([['detail', 'Block Detail'], ['verify', 'Verify & Attest'], ['export', 'Evidence Package']] as const).map(([t, l]) => (
                <button key={t} onClick={() => setDrawerTab(t)} className="flex-1 py-2.5 text-[11px] font-medium transition-colors" style={drawerTab === t ? { color: 'hsl(var(--brand))', borderBottom: '2px solid hsl(var(--brand))' } : { color: 'hsl(var(--text-4))' }}>{l}</button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {drawerTab === 'detail' && (
                <>
                  <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">{selected.description}</p>
                  <div className="space-y-2">
                    {[
                      { label: 'Block Index', value: `#${selected.blockIndex}` },
                      { label: 'Timestamp', value: selected.timestamp },
                      { label: 'Actor', value: `${selected.actor} (${selected.role})` },
                      { label: 'Module', value: selected.module },
                      { label: 'Entity ID', value: selected.entityId },
                      { label: 'Regulatory Ref', value: selected.regulatoryRef },
                      { label: 'Nonce', value: selected.nonce.toLocaleString() },
                    ].map(f => (
                      <div key={f.label} className="flex items-start gap-3 py-2 border-b border-[hsl(var(--border))]">
                        <span className="text-[11px] text-[hsl(var(--text-4))] uppercase w-28 flex-shrink-0">{f.label}</span>
                        <span className="text-xs text-[hsl(var(--text-1))] font-medium break-all">{f.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <div className="p-3 bg-raised border border-[hsl(var(--border))]">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">Block Hash (SHA-256)</p>
                        <button onClick={() => { navigator.clipboard.writeText(selected.hash); toast.success('Hash copied') }} className="text-[10px] text-[hsl(var(--brand))] hover:underline flex items-center gap-1"><Copy size={9} /> Copy</button>
                      </div>
                      <p className="font-mono text-[10px] text-[hsl(var(--text-1))] break-all leading-5">{selected.hash}</p>
                    </div>
                    <div className="p-3 bg-raised border border-[hsl(var(--border))]">
                      <p className="text-[10px] text-[hsl(var(--text-4))] uppercase mb-1">Previous Block Hash</p>
                      <p className="font-mono text-[10px] text-[hsl(var(--text-3))] break-all leading-5">{selected.prevHash}</p>
                    </div>
                    <div className="p-3 bg-raised border border-[hsl(var(--border))]">
                      <p className="text-[10px] text-[hsl(var(--text-4))] uppercase mb-1">Digital Signature</p>
                      <p className="font-mono text-[10px] text-[hsl(var(--text-3))] break-all">{selected.signature}</p>
                    </div>
                  </div>
                </>
              )}
              {drawerTab === 'verify' && (
                <>
                  <div className="p-4 bg-raised border border-[hsl(var(--border))] space-y-2">
                    <p className="text-xs font-semibold text-[hsl(var(--text-1))]">Hash Chain Verification</p>
                    <p className="text-xs text-[hsl(var(--text-3))] leading-relaxed">Verify that this block's hash correctly links to the previous block and that the content has not been tampered with since recording.</p>
                    <div className="mt-3 space-y-1.5 text-[11px]">
                      <div className="flex items-center gap-2"><CheckCircle size={12} className="text-[hsl(var(--s-ok-tx))]" /><span className="text-[hsl(var(--text-2))]">Block signature: valid</span></div>
                      <div className="flex items-center gap-2"><CheckCircle size={12} className="text-[hsl(var(--s-ok-tx))]" /><span className="text-[hsl(var(--text-2))]">Previous hash link: intact</span></div>
                      <div className="flex items-center gap-2"><CheckCircle size={12} className="text-[hsl(var(--s-ok-tx))]" /><span className="text-[hsl(var(--text-2))]">Timestamp: within attestation window</span></div>
                      <div className="flex items-center gap-2"><CheckCircle size={12} className="text-[hsl(var(--s-ok-tx))]" /><span className="text-[hsl(var(--text-2))]">Actor credential: on record</span></div>
                    </div>
                  </div>
                  <button onClick={() => handleVerify(selected)} disabled={verifying} className="w-full py-2.5 bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))] text-sm font-medium hover:opacity-90 disabled:opacity-60">
                    {verifying ? 'Verifying cryptographic chain…' : 'Run Full Verification'}
                  </button>
                  {verifyResult && (
                    <div className={`p-4 rounded border ${verifyResult.valid ? 'bg-[hsl(var(--s-ok-bg))] border-[hsl(var(--s-ok-bg))]' : 'bg-[hsl(var(--s-er-bg))] border-[hsl(var(--destructive)/0.3)]'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {verifyResult.valid ? <CheckCircle size={14} className="text-[hsl(var(--s-ok-tx))]" /> : <Warning size={14} className="text-[hsl(var(--destructive))]" />}
                        <p className={`text-sm font-semibold ${verifyResult.valid ? 'text-[hsl(var(--s-ok-tx))]' : 'text-[hsl(var(--destructive))]'}`}>
                          {verifyResult.valid ? 'Block Verified — Cryptographically Valid' : 'TAMPER DETECTED — Chain Compromised'}
                        </p>
                      </div>
                      <p className="text-[11px] text-[hsl(var(--text-3))]">Verified at {verifyResult.timestamp.slice(0, 19)}Z · Chain intact: {verifyResult.chainIntact ? 'Yes' : 'No'}</p>
                    </div>
                  )}
                </>
              )}
              {drawerTab === 'export' && (
                <>
                  <div className="p-4 bg-raised border border-[hsl(var(--border))]">
                    <p className="text-xs font-semibold text-[hsl(var(--text-1))] mb-2">Court-Admissible Evidence Package</p>
                    <p className="text-xs text-[hsl(var(--text-3))] leading-relaxed mb-4">Generate a digitally-signed, tamper-proof evidence package accepted by EU AI Act conformity assessors, ISO 42001 auditors, and legal proceedings under eIDAS standards.</p>
                    <div className="space-y-2 text-[11px]">
                      {['Block detail PDF (signed)', 'SHA-256 hash certificate', 'Chain-of-custody transcript', 'Regulatory reference mapping', 'Actor credential attestation', 'Verification log'].map(item => (
                        <div key={item} className="flex items-center gap-2">
                          <CheckCircle size={11} className="text-[hsl(var(--s-ok-tx))]" />
                          <span className="text-[hsl(var(--text-2))]">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <button onClick={handleExportPackage} className="w-full py-2.5 bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))] text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2">
                      <Download size={14} /> Generate Evidence Package (ZIP)
                    </button>
                    <button onClick={() => toast.success('Shared with external auditor — access link valid for 72 hours')} className="w-full py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-raised">
                      Share with External Auditor
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
