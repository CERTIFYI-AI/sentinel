import { useLocation, Link } from 'react-router-dom';
import { useState } from 'react';

interface NavItem {
  label: string;
  to: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV: NavSection[] = [
  {
    title: 'SECURITY',
    items: [
      { label: 'Security Overview', to: '/security' },
      { label: 'Threat Intelligence', to: '/security/threats' },
      { label: 'Scan Center', to: '/security/scans' },
      { label: 'Attack Surface', to: '/security/attack-surface' },
      { label: 'Vulnerabilities', to: '/security/vulnerabilities' },
      { label: 'Red Team Lab', to: '/security/red-team' },
      { label: 'Policy Firewall', to: '/security/policies' },
      { label: 'Keys Vault', to: '/security/keys' },
      { label: 'Model Arena', to: '/security/model-arena' },
      { label: 'Board Reports', to: '/security/reports' },
    ],
  },
  {
    title: 'EVALS',
    items: [
      { label: 'Quality Metrics', to: '/evals/quality-metrics' },
      { label: 'Eval Techniques', to: '/evals/techniques' },
      { label: 'Benchmark', to: '/evals/benchmark' },
      { label: 'Datasets', to: '/evals/datasets' },
      { label: 'Results', to: '/evals/results' },
    ],
  },
  {
    title: 'COMPLIANCE',
    items: [
      { label: 'Dashboard', to: '/compliance' },
      { label: 'Controls', to: '/compliance/controls' },
      { label: 'Evidence Hub', to: '/compliance/evidence' },
      { label: 'Gap Analysis', to: '/compliance/gap-analysis' },
    ],
  },
  {
    title: 'RISK',
    items: [
      { label: 'Risk Matrix', to: '/risk' },
      { label: 'Vendor Register', to: '/risk/vendors' },
      { label: 'Incident Log', to: '/risk/incidents' },
      { label: 'Remediation', to: '/risk/remediation' },
    ],
  },
  {
    title: 'MODELS',
    items: [
      { label: 'Inventory', to: '/models/inventory' },
      { label: 'Lifecycle', to: '/models/lifecycle' },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { label: 'Audit Log', to: '/audit-log' },
      { label: 'Evidence Vault', to: '/evidence-vault' },
      { label: 'HITL Queue', to: '/hitl-queue' },
      { label: 'Policy Editor', to: '/policy-editor' },
      { label: 'Export Center', to: '/export' },
      { label: 'Notifications', to: '/notifications' },
      { label: 'Settings', to: '/settings' },
    ],
  },
];

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleSection = (title: string) => {
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const isActive = (path: string): boolean => location.pathname === path;

  return (
    <aside className="w-60 border-r border-[var(--border)] min-h-screen flex flex-col bg-white" style={{ fontFamily: 'Outfit' }}>
      {/* Brand */}
      <div className="p-4 border-b border-[var(--border)]">
        <Link to="/security" className="text-lg font-bold" style={{ color: 'var(--brand)' }}>
          Certifyi Sentinel
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV.map((section) => (
          <div key={section.title}>
            <button
              onClick={() => toggleSection(section.title)}
              className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold tracking-wider hover:bg-[var(--brand-subtle)] transition-colors"
              style={{ color: 'var(--muted-foreground)' }}
            >
              {section.title}
              <span className="text-[10px]">{collapsed[section.title] ? '+' : '-'}</span>
            </button>
            {!collapsed[section.title] && (
              <ul className="pb-1">
                {section.items.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={`block px-6 py-1.5 text-sm transition-colors ${
                        isActive(item.to)
                          ? 'bg-[var(--brand-subtle)] font-medium border-r-2 border-[var(--brand)]'
                          : 'hover:bg-[var(--brand-subtle)]'
                      }`}
                      style={{
                        color: isActive(item.to) ? 'var(--brand)' : 'var(--foreground)',
                      }}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--border)]">
        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Sentinel v1.0</p>
      </div>
    </aside>
  );
}
