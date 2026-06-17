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
    <nav aria-label="breadcrumb">
      <ol className="flex items-center flex-wrap gap-1.5 text-xs text-[hsl(var(--text-4))] mb-4">
        {/* Home crumb */}
        <li className="flex items-center">
          <Link
            to="/overview"
            aria-label="Home"
            className="flex items-center text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-1))] transition-colors"
          >
            <House size={14} />
          </Link>
        </li>

        {segments.map((seg, i) => {
          const path = '/' + segments.slice(0, i + 1).join('/');
          const title = ROUTE_TITLES[seg] || seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          const isLast = i === segments.length - 1;

          return (
            <li
              key={path}
              className="flex items-center gap-1.5"
              aria-current={isLast ? 'page' : undefined}
            >
              <CaretRight size={11} className="text-[hsl(var(--text-4))] shrink-0" aria-hidden />
              {isLast ? (
                <span className="text-[hsl(var(--text-2))] font-medium whitespace-nowrap">
                  {title}
                </span>
              ) : (
                <Link
                  to={path}
                  className="text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-1))] transition-colors whitespace-nowrap"
                >
                  {title}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
