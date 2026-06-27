import { useState, useMemo } from 'react';
import {
  Storefront, MagnifyingGlass, CheckCircle, Clock, Warning,
  Download, Plus, X, Eye, Star, ArrowRight, Shield,
  ArrowClockwise, Upload, Certificate, FileText,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useSettingsStore } from '../stores/settingsStore';

// ── Types ─────────────────────────────────────────────────────────────────────

type AttestationType = 'SOC2' | 'ISO27001' | 'ISO42001' | 'PenTest' | 'DPA' | 'ModelCard';
type VendorCategory = 'Foundation Model' | 'Infrastructure' | 'Data Provider' | 'Tool';

interface MarketplaceAttestation {
  id: string;
  type: AttestationType;
  title: string;
  issuer: string;
  issuedAt: string;
  expiresAt: string;
  frameworks: string[];
  hash: string;
  downloads: number;
  description: string;
}

interface MarketplaceVendor {
  id: string;
  name: string;
  category: VendorCategory;
  verified: boolean;
  attestationCount: number;
  subscriberCount: number;
  lastUpdated: string;
  avgScore: number;
  attestations: MarketplaceAttestation[];
  description: string;
  subscribed?: boolean;
}

// ── Seed data ─────────────────────────────────────────────────────────────────

const VENDORS: MarketplaceVendor[] = [
  {
    id: 'MV-001', name: 'OpenAI', category: 'Foundation Model', verified: true,
    attestationCount: 8, subscriberCount: 312, lastUpdated: '2026-03-15', avgScore: 91,
    description: 'AI research and deployment company. GPT-4o, GPT-4o-mini, and OpenAI API ecosystem.',
    subscribed: true,
    attestations: [
      { id: 'A-001', type: 'SOC2', title: 'SOC 2 Type II Report 2025', issuer: 'Deloitte & Touche', issuedAt: '2025-11-01', expiresAt: '2026-11-01', frameworks: ['SOC 2', 'ISO 27001'], hash: 'a3f4d2c1b8e7...', downloads: 1240, description: 'System and Organization Controls Type II covering security, availability, and confidentiality.' },
      { id: 'A-002', type: 'DPA', title: 'OpenAI Data Processing Agreement v4.1', issuer: 'OpenAI Inc', issuedAt: '2026-01-10', expiresAt: '2027-01-10', frameworks: ['GDPR Art.28', 'UK GDPR'], hash: 'b5c6d7e8f9a0...', downloads: 2100, description: 'Standard contractual clauses for EU data processing.' },
      { id: 'A-003', type: 'ISO42001', title: 'ISO/IEC 42001:2023 Conformity Statement', issuer: 'BSI Group', issuedAt: '2026-02-01', expiresAt: '2029-02-01', frameworks: ['ISO 42001', 'EU AI Act'], hash: 'c9d0e1f2a3b4...', downloads: 876, description: 'AI management system certification under ISO/IEC 42001:2023.' },
    ],
  },
  {
    id: 'MV-002', name: 'Anthropic', category: 'Foundation Model', verified: true,
    attestationCount: 6, subscriberCount: 218, lastUpdated: '2026-03-20', avgScore: 94,
    description: 'AI safety company. Claude 3.5 Sonnet, Claude 3 Haiku, and Constitutional AI models.',
    subscribed: true,
    attestations: [
      { id: 'A-004', type: 'SOC2', title: 'Anthropic SOC 2 Type II 2025', issuer: 'Ernst & Young', issuedAt: '2025-10-15', expiresAt: '2026-10-15', frameworks: ['SOC 2'], hash: 'd1e2f3a4b5c6...', downloads: 930, description: 'Annual SOC 2 Type II audit covering all security principles.' },
      { id: 'A-005', type: 'ModelCard', title: 'Claude 3.5 Sonnet Model Card', issuer: 'Anthropic', issuedAt: '2026-01-20', expiresAt: '2027-01-20', frameworks: ['EU AI Act Art.13', 'NIST AI RMF'], hash: 'e3f4a5b6c7d8...', downloads: 2450, description: 'Comprehensive model card covering capabilities, limitations, and safety evaluations.' },
    ],
  },
  {
    id: 'MV-003', name: 'Pinecone', category: 'Infrastructure', verified: true,
    attestationCount: 4, subscriberCount: 145, lastUpdated: '2026-02-28', avgScore: 88,
    description: 'Vector database infrastructure for AI applications. High-performance similarity search at scale.',
    subscribed: false,
    attestations: [
      { id: 'A-006', type: 'SOC2', title: 'Pinecone SOC 2 Type II', issuer: 'Vanta', issuedAt: '2025-09-01', expiresAt: '2026-09-01', frameworks: ['SOC 2'], hash: 'f5a6b7c8d9e0...', downloads: 445, description: 'Security and availability controls for vector database operations.' },
      { id: 'A-007', type: 'ISO27001', title: 'ISO 27001:2022 Certificate', issuer: 'TÜV SÜD', issuedAt: '2026-01-05', expiresAt: '2029-01-05', frameworks: ['ISO 27001'], hash: 'a7b8c9d0e1f2...', downloads: 320, description: 'Information security management system certification.' },
    ],
  },
  {
    id: 'MV-004', name: 'Hugging Face', category: 'Foundation Model', verified: true,
    attestationCount: 5, subscriberCount: 289, lastUpdated: '2026-03-10', avgScore: 82,
    description: 'Open-source AI model hub. 500,000+ models and datasets with inference API.',
    subscribed: false,
    attestations: [
      { id: 'A-008', type: 'DPA', title: 'Hugging Face DPA EU 2025', issuer: 'Hugging Face Inc', issuedAt: '2025-08-01', expiresAt: '2026-08-01', frameworks: ['GDPR Art.28', 'EU AI Act'], hash: 'b8c9d0e1f2a3...', downloads: 680, description: 'Data processing agreement for EU data subjects.' },
    ],
  },
  {
    id: 'MV-005', name: 'Scale AI', category: 'Data Provider', verified: true,
    attestationCount: 7, subscriberCount: 167, lastUpdated: '2026-04-01', avgScore: 89,
    description: 'AI data platform providing training data, RLHF, and model evaluation services.',
    subscribed: false,
    attestations: [
      { id: 'A-009', type: 'ISO27001', title: 'Scale AI ISO 27001 2025', issuer: 'PwC', issuedAt: '2025-07-15', expiresAt: '2028-07-15', frameworks: ['ISO 27001', 'SOC 2'], hash: 'c0d1e2f3a4b5...', downloads: 390, description: 'ISMS certification for data labeling and AI services.' },
      { id: 'A-010', type: 'PenTest', title: 'Annual Penetration Test Report 2025', issuer: 'Coalfire', issuedAt: '2025-11-01', expiresAt: '2026-11-01', frameworks: ['ISO 27001', 'NIST CSF'], hash: 'd2e3f4a5b6c7...', downloads: 210, description: 'External and internal penetration testing of Scale AI infrastructure.' },
    ],
  },
  {
    id: 'MV-006', name: 'Weights & Biases', category: 'Tool', verified: false,
    attestationCount: 2, subscriberCount: 89, lastUpdated: '2026-02-15', avgScore: 77,
    description: 'MLOps platform for experiment tracking, model versioning, and dataset management.',
    subscribed: false,
    attestations: [
      { id: 'A-011', type: 'SOC2', title: 'W&B SOC 2 Type I 2025', issuer: 'A-LIGN', issuedAt: '2025-06-01', expiresAt: '2026-06-01', frameworks: ['SOC 2'], hash: 'e4f5a6b7c8d9...', downloads: 165, description: 'Type I security controls assessment for W&B cloud services.' },
    ],
  },
];

// ── Type badge styles ─────────────────────────────────────────────────────────

function typeStyle(t: AttestationType) {
  switch (t) {
    case 'SOC2': return { bg: '#10b98115', color: '#10b981' };
    case 'ISO27001': return { bg: '#3b82f615', color: '#60a5fa' };
    case 'ISO42001': return { bg: '#6366f115', color: '#a5b4fc' };
    case 'PenTest': return { bg: '#ef444415', color: '#f87171' };
    case 'DPA': return { bg: '#f9731615', color: '#fb923c' };
    case 'ModelCard': return { bg: '#8b5cf615', color: '#c4b5fd' };
    default: return { bg: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))' };
  }
}

const ALL_TYPES: AttestationType[] = ['SOC2', 'ISO27001', 'ISO42001', 'PenTest', 'DPA', 'ModelCard'];
const ALL_CATEGORIES: VendorCategory[] = ['Foundation Model', 'Infrastructure', 'Data Provider', 'Tool'];

// ── Component ─────────────────────────────────────────────────────────────────

export default function Marketplace() {
  const { orgName } = useSettingsStore();
  const [vendors, setVendors] = useState<MarketplaceVendor[]>(VENDORS);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<AttestationType | 'All'>('All');
  const [catFilter, setCatFilter] = useState<VendorCategory | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Verified' | 'Pending'>('All');
  const [selectedVendor, setSelectedVendor] = useState<MarketplaceVendor | null>(null);
  const [selectedAttestation, setSelectedAttestation] = useState<MarketplaceAttestation | null>(null);
  const [activeTab, setActiveTab] = useState<'browse' | 'mine' | 'submit'>('browse');
  const [submitForm, setSubmitForm] = useState({ company: '', type: 'SOC2', frameworks: '', description: '' });

  const filtered = useMemo(() => vendors.filter(v => {
    const q = search.toLowerCase();
    const matchSearch = !q || v.name.toLowerCase().includes(q) || v.category.toLowerCase().includes(q);
    const matchCat = catFilter === 'All' || v.category === catFilter;
    const matchStatus = statusFilter === 'All' || (statusFilter === 'Verified' ? v.verified : !v.verified);
    const matchType = typeFilter === 'All' || v.attestations.some(a => a.type === typeFilter);
    return matchSearch && matchCat && matchStatus && matchType;
  }), [vendors, search, typeFilter, catFilter, statusFilter]);

  const subscribed = vendors.filter(v => v.subscribed);
  const totalAttestations = vendors.reduce((s, v) => s + v.attestationCount, 0);
  const totalSubscribers = Math.max(...vendors.map(v => v.subscriberCount));

  function handleSubscribe(vendorId: string) {
    setVendors(prev => prev.map(v => v.id === vendorId ? { ...v, subscribed: true, subscriberCount: v.subscriberCount + 1 } : v));
    const vendor = vendors.find(v => v.id === vendorId);
    toast.success(`${vendor?.name} added to your vendor registry — ${vendor?.attestationCount} attestations imported`);
    if (selectedVendor?.id === vendorId) setSelectedVendor(prev => prev ? { ...prev, subscribed: true } : null);
  }

  function handleImportToVault(att: MarketplaceAttestation) {
    toast.success(`${att.title} imported to Evidence Vault — chain entry appended`);
  }

  const tabStyle = (tab: typeof activeTab) => ({
    padding: '8px 16px',
    fontSize: 13,
    background: activeTab === tab ? 'hsl(var(--brand))' : 'transparent',
    color: activeTab === tab ? 'white' : 'hsl(var(--text-3))',
    border: 'none',
    cursor: 'pointer',
      });

  return (
    <div className="space-y-6">
      {/* ── Hero ── */}
      <div style={{ background: 'hsl(var(--brand) / 0.05)', border: '1px solid hsl(var(--brand) / 0.2)', padding: '20px 24px' }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Storefront size={22} style={{ color: 'hsl(var(--brand))' }} />
              <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Sentinel Vendor Attestation Marketplace</h1>
            </div>
            <p className="text-sm mb-3" style={{ color: 'hsl(var(--text-3))' }}>
              The only platform where AI vendors publish compliance attestations once — and every enterprise pulls them instantly.
            </p>
            <div className="flex gap-4">
              {[
                { label: `${vendors.length} vendors`, icon: Shield },
                { label: `${totalAttestations} attestations`, icon: Certificate },
                { label: `${totalSubscribers}+ enterprise clients`, icon: Star },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <s.icon size={14} style={{ color: 'hsl(var(--brand))' }} />
                  <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-2))' }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ borderBottom: '1px solid hsl(var(--border))' }}>
        <div className="flex">
          {([['browse', 'Browse Vendors'], ['mine', `My Vendors (${subscribed.length})`], ['submit', 'Submit Attestations']] as const).map(([tab, label]) => (
            <button key={tab} style={tabStyle(tab)} onClick={() => setActiveTab(tab)}>{label}</button>
          ))}
        </div>
      </div>

      {/* ── Browse Tab ── */}
      {activeTab === 'browse' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-3))' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendors or attestation types…"
                className="pl-8 pr-3 py-2 text-sm" style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-1))', borderRadius: 0, minWidth: 280 }} />
            </div>
            <div className="flex gap-1">
              {(['All', ...ALL_TYPES] as const).map(t => (
                <button key={t} onClick={() => setTypeFilter(t as any)} className="px-2.5 py-1.5 text-xs transition-colors"
                  style={typeFilter === t ? { background: 'hsl(var(--brand))', color: 'white', border: '1px solid hsl(var(--brand))' } : { border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-3))' }}>
                  {t}
                </button>
              ))}
            </div>
            <div className="flex gap-1 ml-auto">
              {(['All', ...ALL_CATEGORIES] as const).map(c => (
                <button key={c} onClick={() => setCatFilter(c as any)} className="px-2 py-1 text-xs"
                  style={catFilter === c ? { background: '#6366f1', color: 'white', border: '1px solid #6366f1' } : { border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-3))' }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Vendor cards */}
          <div className="grid grid-cols-3 gap-4">
            {filtered.map(v => (
              <div key={v.id} className="cursor-pointer" style={{ background: 'hsl(var(--bg-surface))', border: `1px solid ${v.subscribed ? 'hsl(var(--brand) / 0.4)' : 'hsl(var(--border))'}`, padding: '16px', transition: 'border-color 0.15s' }}
                onMouseEnter={el => !v.subscribed && (el.currentTarget.style.borderColor = 'hsl(var(--border-mid))')}
                onMouseLeave={el => !v.subscribed && (el.currentTarget.style.borderColor = 'hsl(var(--border))')}
                onClick={() => setSelectedVendor(v)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 flex items-center justify-center font-bold text-sm" style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--brand))' }}>
                    {v.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    {v.verified && (
                      <span className="flex items-center gap-1 text-xs px-1.5 py-0.5" style={{ background: '#10b98115', color: '#10b981', border: '1px solid #10b98130' }}>
                        <CheckCircle size={10} /> Verified
                      </span>
                    )}
                    {v.subscribed && (
                      <span className="text-xs px-1.5 py-0.5" style={{ background: 'hsl(var(--brand) / 0.1)', color: 'hsl(var(--brand))', border: '1px solid hsl(var(--brand) / 0.3)' }}>
                        ✓ In Registry
                      </span>
                    )}
                  </div>
                </div>
                <h3 className="text-sm font-semibold mb-0.5" style={{ color: 'hsl(var(--text-1))' }}>{v.name}</h3>
                <p className="text-xs mb-2" style={{ color: 'hsl(var(--brand))' }}>{v.category}</p>
                <p className="text-xs mb-3 line-clamp-2" style={{ color: 'hsl(var(--text-3))' }}>{v.description}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {v.attestations.slice(0, 3).map(a => (
                    <span key={a.id} className="text-xs px-1.5 py-0.5" style={typeStyle(a.type)}>{a.type}</span>
                  ))}
                  {v.attestationCount > 3 && <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>+{v.attestationCount - 3}</span>}
                </div>
                <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid hsl(var(--border))' }}>
                  <div className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                    {v.attestationCount} attestations · {v.subscriberCount} clients
                  </div>
                  {!v.subscribed && (
                    <button onClick={e => { e.stopPropagation(); handleSubscribe(v.id); }}
                      className="text-xs px-2.5 py-1 hover:opacity-80" style={{ background: 'hsl(var(--brand))', color: 'white' }}>
                      Subscribe
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── My Vendors Tab ── */}
      {activeTab === 'mine' && (
        <div className="space-y-4">
          {subscribed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: 'hsl(var(--text-3))' }}>
              <Storefront size={40} /><p className="mt-3 text-sm">No subscribed vendors yet</p>
              <button onClick={() => setActiveTab('browse')} className="mt-3 px-4 py-2 text-sm" style={{ background: 'hsl(var(--brand))', color: 'white' }}>Browse Marketplace</button>
            </div>
          ) : (
            <>
              <div className="p-3 flex items-center gap-2" style={{ background: '#f9731610', border: '1px solid #f9731630' }}>
                <Warning size={14} style={{ color: '#f97316' }} />
                <p className="text-xs" style={{ color: '#f97316' }}>3 attestations expire in 30 days — review and renew</p>
              </div>
              {subscribed.map(v => (
                <div key={v.id} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', padding: '16px' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center text-xs font-bold" style={{ background: 'hsl(var(--brand) / 0.1)', color: 'hsl(var(--brand))' }}>
                        {v.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{v.name}</h3>
                        <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{v.category} · Updated {v.lastUpdated}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => toast.success(`Auto-import enabled for ${v.name}`)} className="text-xs px-2 py-1 border" style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-2))' }}>

                        Auto-Import: On
                      </button>
                      <button onClick={() => setSelectedVendor(v)} className="text-xs px-2 py-1" style={{ background: 'hsl(var(--bg-raised))', color: 'hsl(var(--text-2))' }}>
                        <Eye size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {v.attestations.map(a => (
                      <div key={a.id} style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', padding: '10px' }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs px-1.5 py-0.5" style={typeStyle(a.type)}>{a.type}</span>
                          <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Exp: {a.expiresAt}</span>
                        </div>
                        <p className="text-xs font-medium line-clamp-1 mb-2" style={{ color: 'hsl(var(--text-1))' }}>{a.title}</p>
                        <button onClick={() => handleImportToVault(a)} className="text-xs flex items-center gap-1" style={{ color: 'hsl(var(--brand))' }}>
                          Import to Vault <ArrowRight size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Submit Tab ── */}
      {activeTab === 'submit' && (
        <div className="max-w-2xl">
          <div className="mb-6">
            <h2 className="text-base font-semibold mb-1" style={{ color: 'hsl(var(--text-1))' }}>Submit Your Attestations</h2>
            <p className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>
              AI vendors can submit compliance attestations once — all Sentinel clients can pull them. Submitted documents reviewed within 5 business days.
            </p>
          </div>
          <div className="space-y-4" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', padding: '24px' }}>
            {[
              { label: 'Company Name', key: 'company', placeholder: 'Your company name' },
              { label: 'Frameworks Covered', key: 'frameworks', placeholder: 'e.g. GDPR Art.28, EU AI Act Art.13, SOC 2' },
              { label: 'Description', key: 'description', placeholder: 'Brief description of the attestation…' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                {f.key === 'description' ? (
                  <textarea value={(submitForm as any)[f.key]} onChange={e => setSubmitForm(p => ({ ...p, [f.key]: e.target.value }))}
                    rows={3} placeholder={f.placeholder} className="w-full px-3 py-2 text-sm resize-none"
                    style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))', color: 'hsl(var(--text-1))', borderRadius: 0 }} />
                ) : (
                  <input value={(submitForm as any)[f.key]} onChange={e => setSubmitForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder} className="w-full px-3 py-2 text-sm"
                    style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))', color: 'hsl(var(--text-1))', borderRadius: 0 }} />
                )}
              </div>
            ))}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Attestation Type</label>
              <select value={submitForm.type} onChange={e => setSubmitForm(p => ({ ...p, type: e.target.value }))}
                className="w-full px-3 py-2 text-sm" style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))', color: 'hsl(var(--text-1))', borderRadius: 0 }}>
                {ALL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex flex-col items-center justify-center py-6 cursor-pointer"
              style={{ border: '2px dashed hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
              <Upload size={24} style={{ color: 'hsl(var(--text-3))' }} />
              <p className="text-sm mt-2" style={{ color: 'hsl(var(--text-2))' }}>Upload attestation document</p>
              <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>PDF, max 50MB — SHA-256 hash will be computed on upload</p>
            </div>
            <button onClick={() => { toast.success('Attestation submitted — Sentinel team will review within 5 business days'); setSubmitForm({ company: '', type: 'SOC2', frameworks: '', description: '' }); }}
              className="w-full py-2.5 text-sm font-medium" style={{ background: 'hsl(var(--brand))', color: 'white' }}>
              Submit for Review
            </button>
          </div>
        </div>
      )}

      {/* ── Vendor Detail Drawer ── */}
      {selectedVendor && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelectedVendor(null)} />
          <div className="w-[520px] bg-surface border-l border-[hsl(var(--border))] flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center font-bold" style={{ background: 'hsl(var(--brand) / 0.1)', color: 'hsl(var(--brand))', border: '1px solid hsl(var(--brand) / 0.2)' }}>
                  {selectedVendor.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{selectedVendor.name}</h2>
                    {selectedVendor.verified && <CheckCircle size={14} style={{ color: '#10b981' }} />}
                  </div>
                  <p className="text-xs" style={{ color: 'hsl(var(--brand))' }}>{selectedVendor.category}</p>
                </div>
              </div>
              <button onClick={() => setSelectedVendor(null)}><X size={18} style={{ color: 'hsl(var(--text-4))' }} /></button>
            </div>
            <div className="p-4 space-y-4 flex-1">
              <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{selectedVendor.description}</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Attestations', value: selectedVendor.attestationCount },
                  { label: 'Enterprise Clients', value: selectedVendor.subscriberCount },
                  { label: 'Avg Score', value: `${selectedVendor.avgScore}/100` },
                ].map(s => (
                  <div key={s.label} style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', padding: '10px', textAlign: 'center' }}>
                    <p className="text-xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>{s.value}</p>
                    <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{s.label}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'hsl(var(--text-3))' }}>
                  Attestations ({selectedVendor.attestations.length})
                </p>
                <div className="space-y-2">
                  {selectedVendor.attestations.map(a => (
                    <div key={a.id} style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', padding: '12px' }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs px-1.5 py-0.5 font-medium" style={typeStyle(a.type)}>{a.type}</span>
                        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Expires: {a.expiresAt}</span>
                      </div>
                      <p className="text-sm font-medium mb-1" style={{ color: 'hsl(var(--text-1))' }}>{a.title}</p>
                      <p className="text-xs mb-2" style={{ color: 'hsl(var(--text-3))' }}>Issuer: {a.issuer}</p>
                      <p className="text-xs mb-2" style={{ color: 'hsl(var(--text-3))' }}>{a.description}</p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {a.frameworks.map(f => <span key={f} className="text-xs px-1.5 py-0.5" style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))', border: '1px solid hsl(var(--border))' }}>{f}</span>)}
                      </div>
                      <p className="text-xs font-mono mb-3" style={{ color: 'hsl(var(--text-4))' }}>SHA-256: {a.hash}</p>
                      <div className="flex gap-2">
                        <button onClick={() => toast.success(`${a.title} downloaded`)} className="flex items-center gap-1 px-2.5 py-1 text-xs" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-2))' }}>
                          <Download size={12} /> Download
                        </button>
                        <button onClick={() => handleImportToVault(a)} className="flex items-center gap-1 px-2.5 py-1 text-xs" style={{ background: 'hsl(var(--brand))', color: 'white' }}>
                          Import to Vault <ArrowRight size={10} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4" style={{ borderTop: '1px solid hsl(var(--border))' }}>
              {selectedVendor.subscribed ? (
                <div className="flex items-center gap-2 px-3 py-2" style={{ background: 'hsl(var(--brand) / 0.08)', border: '1px solid hsl(var(--brand) / 0.2)' }}>
                  <CheckCircle size={14} style={{ color: 'hsl(var(--brand))' }} />
                  <span className="text-sm" style={{ color: 'hsl(var(--brand))' }}>Subscribed — attestations auto-importing to your vault</span>
                </div>
              ) : (
                <button onClick={() => handleSubscribe(selectedVendor.id)} className="w-full py-2.5 text-sm font-medium flex items-center justify-center gap-2" style={{ background: 'hsl(var(--brand))', color: 'white' }}>
                  <Plus size={14} /> Subscribe & Import Attestations
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
