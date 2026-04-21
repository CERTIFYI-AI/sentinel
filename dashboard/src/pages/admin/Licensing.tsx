import { useState } from 'react';
import {
  Certificate, CheckCircle, Lock, Crown, Users, Robot,
  Link as LinkIcon, ShieldCheck, ArrowRight, Sparkle,
  CalendarCheck, ChartBar, Warning,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useSettingsStore } from '../../stores/settingsStore';
import { MODELS, EVIDENCE, USERS } from '../../data/seed';

// ── Feature matrix data ───────────────────────────────────────────────────────

const OPEN_CORE_FEATURES = [
  { key: 'model_inventory', name: 'Model Inventory', desc: 'Track all AI models in your organization' },
  { key: 'risk_register', name: 'Risk Register', desc: 'Identify, assess, and monitor AI risks' },
  { key: 'compliance_dashboard', name: 'Compliance Dashboard', desc: 'Framework compliance overview' },
  { key: 'bias_audits', name: 'Bias Audits', desc: 'Run fairness assessments across models' },
  { key: 'agent_discovery', name: 'Agent Discovery', desc: 'Discover authorized and shadow AI agents' },
  { key: 'basic_reporting', name: 'Basic Reporting', desc: 'Standard compliance reports' },
  { key: 'control_tracking', name: 'Control Tracking', desc: 'Monitor implementation of controls' },
  { key: 'incident_log', name: 'Incident Log', desc: 'Track and investigate AI incidents' },
];

const ENTERPRISE_FEATURES = [
  { key: 'evidence_chain', name: 'Cryptographic Evidence Chain', desc: 'SHA-256 tamper-evident audit ledger', roi: '14h/month saved on audit prep', enabled: true },
  { key: 'risk_intelligence', name: 'Sentinel Risk Intelligence', desc: 'Industry benchmarks + predictive gap detection', roi: '8h/month on gap analysis', enabled: true },
  { key: 'marketplace', name: 'Vendor Attestation Marketplace', desc: 'Pull vendor attestations from network', roi: '12h/month on vendor reviews', enabled: true },
  { key: 'multi_tenant', name: 'Multi-Tenant Org Isolation', desc: 'Separate environments per business unit', roi: 'Required for enterprise compliance', enabled: true },
  { key: 'sso_saml', name: 'SSO / SAML Authentication', desc: 'Integrate with Okta, Azure AD, Google', roi: 'Zero-touch user provisioning', enabled: true },
  { key: 'scim_provisioning', name: 'SCIM User Provisioning', desc: 'Automated lifecycle management', roi: '3h/month on access management', enabled: true },
  { key: 'cicd_gate', name: 'CI/CD Model Deployment Gate', desc: 'Block non-compliant model deployments', roi: 'Prevents costly remediation', enabled: true },
  { key: 'board_report', name: 'Board-Ready PDF Reports', desc: 'Executive and regulator-grade reporting', roi: '6h/month on board prep', enabled: true },
  { key: 'ai_advisor', name: 'AI Advisor (Claude)', desc: 'GPT-4 powered compliance guidance', roi: '20h/month on compliance Q&A', enabled: true },
  { key: 'predictive_gaps', name: 'Predictive Gap Detection', desc: 'ML-based risk signal analysis', roi: '5h/month on gap reviews', enabled: true },
  { key: 'supply_chain_graph', name: 'AI Supply Chain Graph', desc: 'Interactive provenance visualization', roi: 'Regulator-ready supply chain audit', enabled: true },
  { key: 'integrations_hub', name: 'Integration Hub (CI/CD, SIEM, ITSM)', desc: 'Deep operational integration', roi: 'Switching cost: ~240 hours', enabled: true },
];

const USAGE = {
  users: { used: USERS.length, limit: 50 },
  models: { used: MODELS.length, limit: -1 },
  evidence: { used: EVIDENCE.length, limit: -1 },
  auditCycles: { used: 3, limit: -1 },
  apiCalls: { used: 124500, limit: -1 },
  chainEntries: { used: 847, limit: -1 },
};

type Plan = 'open_core' | 'trial' | 'enterprise';

function UsageBar({ used, limit }: { used: number; limit: number }) {
  if (limit < 0) return <span className="text-xs" style={{ color: '#10b981' }}>Unlimited</span>;
  const pct = Math.min(100, (used / limit) * 100);
  const color = pct > 90 ? '#ef4444' : pct > 70 ? '#f97316' : '#10b981';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5" style={{ background: 'hsl(var(--bg-muted))' }}>
        <div className="h-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-medium" style={{ color }}>{used}/{limit}</span>
    </div>
  );
}

export default function Licensing() {
  const { orgName } = useSettingsStore();
  const [plan, setPlan] = useState<Plan>('enterprise');
  const [trialDays] = useState(14);

  const totalROI = ENTERPRISE_FEATURES.reduce((s, f) => {
    const match = f.roi.match(/(\d+)h\/month/);
    return s + (match ? parseInt(match[1]) : 0);
  }, 0);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Certificate size={22} style={{ color: 'hsl(var(--brand))' }} />
            <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Licensing & Feature Access</h1>
          </div>
          <p className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · Open Core + Enterprise plan management
          </p>
        </div>
        {/* Plan badge */}
        <div className="flex flex-col items-end gap-2">
          {plan === 'enterprise' && (
            <div className="flex items-center gap-2 px-3 py-2" style={{ background: 'hsl(var(--brand) / 0.08)', border: '2px solid hsl(var(--brand) / 0.3)' }}>
              <Crown size={18} style={{ color: 'hsl(var(--brand))' }} />
              <div>
                <p className="text-xs font-bold" style={{ color: 'hsl(var(--brand))' }}>ENTERPRISE PLAN</p>
                <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>All features unlocked</p>
              </div>
            </div>
          )}
          {plan === 'trial' && (
            <div className="flex items-center gap-2 px-3 py-2" style={{ background: '#f9731610', border: '2px solid #f9731630' }}>
              <CalendarCheck size={18} style={{ color: '#f97316' }} />
              <div>
                <p className="text-xs font-bold" style={{ color: '#f97316' }}>ENTERPRISE TRIAL</p>
                <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{trialDays} days remaining</p>
              </div>
            </div>
          )}
          {plan === 'open_core' && (
            <div className="flex items-center gap-2 px-3 py-2" style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}>
              <Certificate size={18} style={{ color: 'hsl(var(--text-3))' }} />
              <div>
                <p className="text-xs font-bold" style={{ color: 'hsl(var(--text-2))' }}>OPEN CORE</p>
                <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Community edition</p>
              </div>
            </div>
          )}
          {/* Demo toggle — dev only */}
          <div className="flex gap-1">
            {(['open_core', 'trial', 'enterprise'] as const).map(p => (
              <button key={p} onClick={() => setPlan(p)} className="text-xs px-2 py-1" style={{ background: plan === p ? 'hsl(var(--bg-raised))' : 'transparent', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-3))' }}>
                {p === 'open_core' ? 'Open Core' : p === 'trial' ? 'Trial' : 'Enterprise'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Trial countdown ── */}
      {plan === 'trial' && (
        <div style={{ background: '#f9731610', border: '1px solid #f9731630', padding: '12px 16px' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Warning size={16} style={{ color: '#f97316' }} />
              <p className="text-sm font-medium" style={{ color: '#f97316' }}>
                {trialDays} days remaining in your Enterprise trial
              </p>
            </div>
            <button onClick={() => toast.info('Opening upgrade flow')} className="text-xs px-3 py-1.5" style={{ background: '#f97316', color: 'white' }}>
              Upgrade Now
            </button>
          </div>
          <div className="mt-2 h-1.5" style={{ background: '#f9731620' }}>
            <div className="h-full" style={{ width: `${(trialDays / 30) * 100}%`, background: '#f97316' }} />
          </div>
        </div>
      )}

      {/* ── Usage Metrics ── */}
      {plan !== 'open_core' && (
        <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', padding: '20px' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'hsl(var(--text-1))' }}>Usage Metrics</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Users', used: USAGE.users.used, limit: USAGE.users.limit, icon: Users },
              { label: 'AI Models', used: USAGE.models.used, limit: USAGE.models.limit, icon: Robot },
              { label: 'Evidence Files', used: USAGE.evidence.used, limit: USAGE.evidence.limit, icon: LinkIcon },
              { label: 'Audit Cycles', used: USAGE.auditCycles.used, limit: USAGE.auditCycles.limit, icon: CalendarCheck },
              { label: 'Chain Entries', used: USAGE.chainEntries.used, limit: USAGE.chainEntries.limit, icon: ShieldCheck },
              { label: 'API Calls / mo', used: USAGE.apiCalls.used, limit: USAGE.apiCalls.limit, icon: ChartBar },
            ].map(s => (
              <div key={s.label} style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', padding: '14px' }}>
                <div className="flex items-center gap-2 mb-2">
                  <s.icon size={14} style={{ color: 'hsl(var(--brand))' }} />
                  <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-2))' }}>{s.label}</p>
                </div>
                <p className="text-2xl font-bold mb-2" style={{ color: 'hsl(var(--text-1))' }}>
                  {s.limit < 0 ? s.used.toLocaleString() : s.used}
                </p>
                <UsageBar used={s.used} limit={s.limit} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Feature Matrix ── */}
      <div className="grid grid-cols-2 gap-6">
        {/* Open Core */}
        <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Open Core — Free Forever</h2>
            <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>Community-licensed features available to all users</p>
          </div>
          <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
            {OPEN_CORE_FEATURES.map(f => (
              <div key={f.key} className="flex items-start gap-3 px-5 py-3">
                <CheckCircle size={15} style={{ color: '#10b981', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{f.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Enterprise */}
        <div style={{ background: 'hsl(var(--bg-surface))', border: `2px solid ${plan === 'enterprise' ? 'hsl(var(--brand) / 0.4)' : 'hsl(var(--border))'}` }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid hsl(var(--border))', background: plan === 'enterprise' ? 'hsl(var(--brand) / 0.05)' : 'hsl(var(--bg-raised))' }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                  Enterprise — {plan === 'open_core' ? '$2,400/year' : 'Subscribed'}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>
                  {plan === 'enterprise' ? `All ${ENTERPRISE_FEATURES.length} features unlocked · Est. ${totalROI}h/month saved` : `Unlock ${ENTERPRISE_FEATURES.length} additional features`}
                </p>
              </div>
              {plan !== 'enterprise' && (
                <button onClick={() => toast.info('Opening enterprise upgrade flow')} className="text-xs px-3 py-1.5" style={{ background: 'hsl(var(--brand))', color: 'white' }}>
                  Upgrade
                </button>
              )}
            </div>
          </div>
          <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
            {ENTERPRISE_FEATURES.map(f => {
              const locked = plan === 'open_core';
              return (
                <div key={f.key} className="flex items-start gap-3 px-5 py-3" style={{ opacity: locked ? 0.5 : 1 }}>
                  {locked ? (
                    <Lock size={15} style={{ color: 'hsl(var(--text-4))', flexShrink: 0, marginTop: 2 }} />
                  ) : (
                    <CheckCircle size={15} style={{ color: 'hsl(var(--brand))', flexShrink: 0, marginTop: 2 }} />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{f.name}</p>
                      {!locked && (
                        <span className="text-xs px-1 py-0.5" style={{ background: 'hsl(var(--brand) / 0.1)', color: 'hsl(var(--brand))' }}>Active</span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>{f.desc}</p>
                    {!locked && f.roi && (
                      <p className="text-xs mt-0.5 font-medium" style={{ color: '#10b981' }}>↗ {f.roi}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Upgrade CTA (if open core) ── */}
      {plan === 'open_core' && (
        <div style={{ background: 'hsl(var(--brand) / 0.04)', border: '2px solid hsl(var(--brand) / 0.2)', padding: '24px' }}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Crown size={20} style={{ color: 'hsl(var(--brand))' }} />
                <h2 className="text-lg font-bold" style={{ color: 'hsl(var(--text-1))' }}>Upgrade to Enterprise</h2>
              </div>
              <p className="text-sm mb-4" style={{ color: 'hsl(var(--text-3))' }}>
                Unlock cryptographic evidence chains, risk intelligence, vendor marketplace, and full operational integrations. Estimated {totalROI}+ hours saved per month.
              </p>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { value: `${totalROI}h`, label: 'hours/month saved', color: '#10b981' },
                  { value: '$2,400', label: 'per org / year', color: 'hsl(var(--brand))' },
                  { value: '847', label: 'compliance days carried over', color: '#6366f1' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', padding: '12px', textAlign: 'center' }}>
                    <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => toast.info('Opening enterprise checkout')} className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium" style={{ background: 'hsl(var(--brand))', color: 'white' }}>
                  <Crown size={14} /> Start Enterprise Trial
                </button>
                <button onClick={() => toast.info('Sales team will contact you shortly')} className="flex items-center gap-2 px-5 py-2.5 text-sm border" style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-2))' }}>
                  <ArrowRight size={14} /> Contact Sales
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Sentinel Certified badge ── */}
      {plan === 'enterprise' && (
        <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', padding: '20px' }}>
          <div className="flex items-center gap-3">
            <div style={{ background: '#10b98110', border: '2px solid #10b98130', padding: '12px' }}>
              <ShieldCheck size={32} style={{ color: '#10b981' }} />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold mb-0.5" style={{ color: 'hsl(var(--text-1))' }}>Sentinel-Certified Organization</h2>
              <p className="text-xs mb-2" style={{ color: 'hsl(var(--text-3))' }}>
                {orgName} has completed ISO 42001 certification via Sentinel AI GRC. Share your compliance badge publicly.
              </p>
              <p className="text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>
                sentinel.ai/verify/{orgName.toLowerCase().replace(/\s/g, '-')}-iso42001
              </p>
            </div>
            <button onClick={() => toast.success('Badge URL copied to clipboard')} className="text-xs px-3 py-2 border" style={{ border: '1px solid #10b98140', color: '#10b981' }}>
              Copy Badge URL
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
