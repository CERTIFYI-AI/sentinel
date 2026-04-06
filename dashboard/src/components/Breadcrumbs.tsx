import { useLocation, Link } from 'react-router-dom';
import { CaretRight, House } from '@phosphor-icons/react';

const ROUTE_TITLES: Record<string, string> = {
  overview: 'Overview', compliance: 'Compliance', 'gap-analysis': 'Gap Analysis',
  controls: 'Controls', evidence: 'Evidence Hub', frameworks: 'Frameworks',
  policies: 'Policies', 'policy-templates': 'Policy Templates',
  risk: 'Risk Register', matrix: 'Risk Matrix', vendors: 'Vendors',
  incidents: 'Incidents', remediation: 'Remediation',
  models: 'Model Inventory', inventory: 'Inventory', lifecycle: 'Lifecycle',
  agents: 'Agent Discovery', 'shadow-ai': 'Shadow AI',
  'trust-engine': 'Trust Engine', guardrails: 'Guardrails',
  traces: 'Live Traces', costs: 'Cost & Tokens',
  fallbacks: 'Fallback Log', tools: 'Tool Calls', config: 'Configuration',
  'access-control': 'Access Control', roles: 'Roles', users: 'Users',
  'audit-log': 'Audit Log', 'evidence-vault': 'Evidence Vault',
  export: 'Export Center', settings: 'Settings', 'ai-advisor': 'AI Advisor',
  reporting: 'Reporting', 'bias-audits': 'Bias Audits', datasets: 'Datasets',
  'reg-radar': 'Reg Radar', hitl: 'HITL Queue', 'evidence-sync': 'Evidence Sync',
  explainability: 'Explainability', conformity: 'Conformity Assessment',
  'incident-workflow': 'Incident Workflow', evals: 'Evaluations', security: 'Security',
};

export default function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;
  return (
    <nav className="flex items-center gap-1 text-sm text-[hsl(var(--text-3))] mb-4">
      <Link to="/overview" className="hover:text-[hsl(var(--text-1))] transition-colors">
        <House size={16} />
      </Link>
      {segments.map((seg, i) => {
        const path = '/' + segments.slice(0, i + 1).join('/');
        const title = ROUTE_TITLES[seg] || seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const isLast = i === segments.length - 1;
        return (
          <span key={path} className="flex items-center gap-1">
            <CaretRight size={12} />
            {isLast ? (
              <span className="text-[hsl(var(--text-1))] font-medium">{title}</span>
            ) : (
              <Link to={path} className="hover:text-[hsl(var(--text-1))] transition-colors">{title}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
