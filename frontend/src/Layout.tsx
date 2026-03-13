import { NavLink, Outlet } from 'react-router-dom';
const nav = [
  { to: '/', label: 'Dashboard', icon: '\u2302' },
  { to: '/policies', label: 'Policies', icon: '\u2263' },
  { to: '/models', label: 'Model Inventory', icon: '\u2699' },
  { to: '/controls', label: 'Controls', icon: '\u2611' },
  { to: '/datasets', label: 'Datasets', icon: '\u25A6' },
  { to: '/agents', label: 'AI Agents', icon: '\u2604' },
  { to: '/vendors', label: 'Vendors', icon: '\u260E' },
  { to: '/security', label: 'Security / Red Team', icon: '\u2620' },
  { to: '/bias-audits', label: 'Bias Audits', icon: '\u2696' },
  { to: '/compliance', label: 'Compliance Scores', icon: '\u2605' },
  { to: '/trust-engine', label: 'Trust Engine', icon: '\u2764' },
  { to: '/shadow-ai', label: 'Shadow AI', icon: '\u263C' },
  { to: '/reg-radar', label: 'Regulatory Radar', icon: '\u2691' },
  { to: '/approvals', label: 'Approvals (HITL)', icon: '\u270E' },
  { to: '/evals', label: 'Evaluations', icon: '\u2713' },
  { to: '/evidence', label: 'Evidence Vault', icon: '\u265F' },
  { to: '/observability', label: 'Observability', icon: '\u2609' },
  { to: '/events', label: 'Event Bus', icon: '\u21C4' },
  { to: '/audit-logs', label: 'Audit Logs', icon: '\u2318' },
  { to: '/ciso', label: 'CISO Dashboard', icon: '\u265A' },
];
export default function Layout() {
  return (
    <div className="layout">
      <nav className="sidebar">
        <h2>Sentinel AI</h2>
        {nav.map(n => (
          <NavLink key={n.to} to={n.to} className={({isActive}) => isActive ? 'active' : ''}>
            <span>{n.icon}</span> {n.label}
          </NavLink>
        ))}
      </nav>
      <main className="main"><Outlet /></main>
    </div>
  );
}
