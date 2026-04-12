import { Lock, ArrowRight, Crown } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';

interface EnterpriseGateProps {
  feature: string;
  name?: string;
  description?: string;
  roi?: string;
  children: React.ReactNode;
  /** Set to true to always show the content (when licensed) */
  unlocked?: boolean;
}

const FEATURE_DETAILS: Record<string, { name: string; description: string; roi: string }> = {
  evidence_chain: {
    name: 'Cryptographic Evidence Chain',
    description: 'SHA-256 tamper-evident ledger for every compliance action. Compliance Continuity Score shows regulators 847 days of unbroken history.',
    roi: 'Estimated 14h/month saved on audit preparation',
  },
  risk_intelligence: {
    name: 'Sentinel Risk Intelligence',
    description: 'Industry benchmark radar charts, predictive gap detection with confidence scores, and control failure correlation analysis.',
    roi: 'Estimated 8h/month saved on gap analysis',
  },
  marketplace: {
    name: 'Vendor Attestation Marketplace',
    description: 'Pull vendor SOC2, ISO42001, and DPA attestations from the Sentinel network. Vendors publish once — you pull instantly.',
    roi: 'Estimated 12h/month saved on vendor reviews',
  },
  supply_chain_graph: {
    name: 'AI Supply Chain Graph',
    description: 'Interactive provenance visualization: Data Sources → Datasets → Models → Agents → Use Cases. Impact analysis and AIBOM export.',
    roi: 'Regulator-ready supply chain audit in minutes',
  },
  cicd_gate: {
    name: 'CI/CD Model Deployment Gate',
    description: 'Block non-compliant model deployments at the pipeline level. POST /api/v1/model-gate/{modelId} returns PASS or BLOCK.',
    roi: 'Prevents costly post-deployment remediation',
  },
  integrations_hub: {
    name: 'Integration Hub',
    description: 'Deep operational integration with SIEM, ITSM, IAM, CI/CD, and Cloud ML platforms. Integration depth score shows switching costs.',
    roi: 'Switching cost: ~240 hours to reconnect manually',
  },
};

export function EnterpriseGate({ feature, name, description, roi, children, unlocked = true }: EnterpriseGateProps) {
  const navigate = useNavigate();

  // In this demo, all enterprise features are unlocked
  if (unlocked) return <>{children}</>;

  const details = FEATURE_DETAILS[feature] ?? {
    name: name ?? 'Enterprise Feature',
    description: description ?? 'This feature is available on the Enterprise plan.',
    roi: roi ?? '',
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-64 px-8 py-16"
      style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
      <div className="flex flex-col items-center text-center max-w-lg">
        <div className="w-14 h-14 flex items-center justify-center mb-4"
          style={{ background: 'hsl(var(--brand) / 0.08)', border: '2px solid hsl(var(--brand) / 0.2)' }}>
          <Lock size={24} style={{ color: 'hsl(var(--brand))' }} />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'hsl(var(--text-1))' }}>{details.name}</h2>
        <p className="text-sm mb-2" style={{ color: 'hsl(var(--text-3))' }}>{details.description}</p>
        {details.roi && (
          <p className="text-sm font-medium mb-6" style={{ color: '#10b981' }}>↗ {details.roi}</p>
        )}
        <div className="flex items-center gap-2 mb-2 text-xs px-3 py-1.5"
          style={{ background: 'hsl(var(--brand) / 0.06)', border: '1px solid hsl(var(--brand) / 0.2)', color: 'hsl(var(--brand))' }}>
          <Crown size={12} />
          Available in: Enterprise Plan
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={() => navigate('/admin/licensing')}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium"
            style={{ background: 'hsl(var(--brand))', color: 'white' }}>
            <Crown size={14} /> Upgrade to Enterprise
          </button>
          <button onClick={() => navigate('/admin/licensing')}
            className="flex items-center gap-2 px-4 py-2.5 text-sm"
            style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-2))' }}>
            Request Demo <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
