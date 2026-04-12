import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Warning, ChartBar, Eye, Globe, Lock,
  ArrowRight, Download, CheckCircle, Certificate, Star,
  Buildings, Scales, Robot, BookOpen,
} from '@phosphor-icons/react';

const PILLARS = [
  {
    id: 1, title: 'AI Governance', icon: Scales, color: '#6366f1',
    description: 'Establish clear accountability, ownership, and decision-making structures for AI systems across the organization.',
    euAiAct: ['Art. 5 — Prohibited AI Practices', 'Art. 9 — Risk Management System', 'Art. 14 — Human Oversight'],
    iso42001: ['Clause 5.1 — Leadership', 'Clause 6.1 — Risk Planning', 'Clause 7.3 — Awareness'],
  },
  {
    id: 2, title: 'Risk Management', icon: Warning, color: '#f97316',
    description: 'Identify, assess, treat, and monitor risks from AI systems throughout their lifecycle.',
    euAiAct: ['Art. 9 — Risk Management', 'Art. 10 — Data Governance', 'Art. 17 — Quality Management'],
    iso42001: ['Clause 6.1 — Risk Assessment', 'Clause 8.3 — Risk Treatment', 'Clause 10.1 — Nonconformity'],
  },
  {
    id: 3, title: 'Compliance', icon: CheckCircle, color: '#10b981',
    description: 'Demonstrate conformity with EU AI Act, ISO 42001, NIST AI RMF, GDPR, and sector-specific regulations.',
    euAiAct: ['Art. 40 — Harmonized Standards', 'Art. 43 — Conformity Assessment', 'Art. 49 — Registration'],
    iso42001: ['Clause 9.2 — Internal Audit', 'Clause 9.3 — Management Review', 'Annex A — Controls'],
  },
  {
    id: 4, title: 'Trust & Fairness', icon: Star, color: '#eab308',
    description: 'Ensure AI systems are fair, unbiased, and operate within defined ethical boundaries.',
    euAiAct: ['Art. 10 — Training Data Quality', 'Art. 15 — Accuracy & Robustness', 'Annex III — High-Risk Systems'],
    iso42001: ['Clause 8.4 — AI System Lifecycle', 'Clause 8.5 — Data for AI', 'Clause 8.6 — Information for AI'],
  },
  {
    id: 5, title: 'Security', icon: Lock, color: '#ef4444',
    description: 'Protect AI systems from adversarial attacks, data poisoning, prompt injection, and unauthorized access.',
    euAiAct: ['Art. 15 — Accuracy, Robustness & Cybersecurity', 'Art. 9 — Security Risk Management'],
    iso42001: ['Clause 8.2 — AI System Requirements', 'Clause 8.3 — AI System Design'],
  },
  {
    id: 6, title: 'Transparency', icon: Eye, color: '#3b82f6',
    description: 'Provide meaningful explanations of AI decisions, maintain audit trails, and publish model cards.',
    euAiAct: ['Art. 13 — Transparency & Information', 'Art. 14 — Human Oversight', 'Art. 50 — Transparency Obligations'],
    iso42001: ['Clause 7.4 — Communication', 'Clause 7.5 — Documented Information'],
  },
];

const CERTIFIED_ORGS = [
  { name: 'FinBank Corp', framework: 'ISO 42001', date: '2026-02-14', badge: 'FB' },
  { name: 'HealthAI Systems', framework: 'EU AI Act', date: '2026-03-01', badge: 'HA' },
  { name: 'LegalTech Pro', framework: 'ISO 42001 + EU AI Act', date: '2026-01-20', badge: 'LT' },
];

export default function GovernanceFramework() {
  const navigate = useNavigate();

  return (
    <div className="space-y-10" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* ── Hero ── */}
      <div style={{ background: 'hsl(var(--brand) / 0.05)', border: '1px solid hsl(var(--brand) / 0.15)', padding: '40px 32px', textAlign: 'center' }}>
        <div className="flex justify-center mb-4">
          <ShieldCheck size={48} style={{ color: 'hsl(var(--brand))' }} />
        </div>
        <h1 className="text-3xl font-black mb-2" style={{ color: 'hsl(var(--text-1))' }}>
          The Sentinel AI Governance Framework
        </h1>
        <p className="text-lg mb-2" style={{ color: 'hsl(var(--text-2))' }}>
          An open standard for enterprise AI governance
        </p>
        <p className="text-sm mb-6 max-w-2xl mx-auto" style={{ color: 'hsl(var(--text-3))' }}>
          Natively implemented in Sentinel AI GRC. Aligned with EU AI Act, ISO/IEC 42001:2023, NIST AI RMF, and GDPR. 
          Used by leading financial services, healthcare, and legal AI teams.
        </p>
        <div className="flex justify-center gap-3">
          <button className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium" style={{ background: 'hsl(var(--brand))', color: 'white' }}
            onClick={() => navigate('/signup')}>
            <Robot size={14} /> Implement with Sentinel
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 text-sm border" style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-2))' }}>
            <Download size={14} /> Download Framework PDF
          </button>
        </div>
      </div>

      {/* ── 6 Pillars ── */}
      <div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'hsl(var(--text-1))' }}>Framework Pillars</h2>
        <p className="text-sm mb-6" style={{ color: 'hsl(var(--text-3))' }}>
          Six interconnected pillars covering every dimension of enterprise AI governance
        </p>
        <div className="grid grid-cols-3 gap-4">
          {PILLARS.map(p => (
            <div key={p.id} style={{ background: 'hsl(var(--bg-surface))', border: `1px solid hsl(var(--border))`, padding: '20px', borderTop: `3px solid ${p.color}` }}>
              <div className="flex items-center gap-3 mb-3">
                <div style={{ background: `${p.color}15`, padding: '8px', border: `1px solid ${p.color}30` }}>
                  <p.icon size={20} style={{ color: p.color }} />
                </div>
                <h3 className="text-sm font-bold" style={{ color: 'hsl(var(--text-1))' }}>{p.title}</h3>
              </div>
              <p className="text-xs mb-4 leading-relaxed" style={{ color: 'hsl(var(--text-3))' }}>{p.description}</p>
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: '#6366f1' }}>EU AI Act</p>
                  {p.euAiAct.map(a => (
                    <p key={a} className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>· {a}</p>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1 mt-2 uppercase tracking-wide" style={{ color: '#10b981' }}>ISO 42001</p>
                  {p.iso42001.map(a => (
                    <p key={a} className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>· {a}</p>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Certified Organizations ── */}
      <div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'hsl(var(--text-1))' }}>Sentinel-Certified Organizations</h2>
        <p className="text-sm mb-6" style={{ color: 'hsl(var(--text-3))' }}>
          Organizations that complete ISO 42001 certification through Sentinel receive a publicly verifiable badge
        </p>
        <div className="grid grid-cols-3 gap-4">
          {CERTIFIED_ORGS.map(org => (
            <div key={org.name} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', padding: '16px' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 flex items-center justify-center font-bold text-sm" style={{ background: 'hsl(var(--brand) / 0.1)', color: 'hsl(var(--brand))', border: '1px solid hsl(var(--brand) / 0.2)' }}>
                  {org.badge}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{org.name}</p>
                  <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Certified: {org.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <Certificate size={14} style={{ color: '#10b981' }} />
                <span className="text-xs font-medium" style={{ color: '#10b981' }}>{org.framework}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs p-2" style={{ background: '#10b98108', border: '1px solid #10b98120' }}>
                <ShieldCheck size={12} style={{ color: '#10b981' }} />
                <span style={{ color: '#10b981' }}>ISO 42001 Certified · Powered by Sentinel AI GRC</span>
              </div>
              <p className="text-xs mt-2" style={{ color: 'hsl(var(--text-4))' }}>
                sentinel.ai/verify/{org.name.toLowerCase().replace(/\s/g, '-')}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Download & CTA ── */}
      <div className="grid grid-cols-2 gap-6">
        <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', padding: '24px' }}>
          <BookOpen size={28} style={{ color: 'hsl(var(--brand))' }} className="mb-3" />
          <h3 className="text-base font-semibold mb-2" style={{ color: 'hsl(var(--text-1))' }}>
            Download the Framework
          </h3>
          <p className="text-sm mb-4" style={{ color: 'hsl(var(--text-3))' }}>
            The complete Sentinel AI Governance Framework — 47 pages covering all 6 pillars, mapped to EU AI Act articles and ISO 42001 clauses.
          </p>
          <button className="flex items-center gap-2 px-4 py-2 text-sm border" style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-2))' }}>
            <Download size={14} /> Download PDF (Free)
          </button>
        </div>
        <div style={{ background: 'hsl(var(--brand) / 0.06)', border: '2px solid hsl(var(--brand) / 0.25)', padding: '24px' }}>
          <Globe size={28} style={{ color: 'hsl(var(--brand))' }} className="mb-3" />
          <h3 className="text-base font-semibold mb-2" style={{ color: 'hsl(var(--text-1))' }}>
            Implement with Sentinel
          </h3>
          <p className="text-sm mb-4" style={{ color: 'hsl(var(--text-3))' }}>
            The framework is natively implemented in Sentinel AI GRC. Start your ISO 42001 certification journey in minutes.
          </p>
          <button onClick={() => navigate('/signup')} className="flex items-center gap-2 px-4 py-2 text-sm font-medium" style={{ background: 'hsl(var(--brand))', color: 'white' }}>
            Get Started Free <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
