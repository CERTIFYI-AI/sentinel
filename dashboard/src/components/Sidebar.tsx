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
      { label: 'Campaign Manager', to: '/security/campaigns' },
      { label: 'Attack Surface Scanner', to: '/security/scanner' },
      { label: 'Model File Auditor', to: '/security/model-auditor' },
      { label: 'Model Arena', to: '/security/model-arena' },
      { label: 'Framework Intelligence', to: '/security/frameworks' },
      { label: 'Strategy & Risk', to: '/security/strategy' },
      { label: 'Board Reports', to: '/security/reports' },
    ],
  },
  {
    title: 'EVALS',
    items: [
      { label: 'Eval Workbench', to: '/evals' },
      { label: 'Quality Metrics', to: '/evals/quality-metrics' },
      { label: 'Eval Techniques', to: '/evals/techniques' },
      { label: 'Benchmark Results', to: '/evals/results' },
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
          <div key={section.title} className="mb-1">
            <button
              onClick={() => toggleSection(section.title)}
              className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold tracking-wider hover:bg-[var(--brand-subtle)] transition-colors"
              style={{ color: 'var(--muted-foreground)' }}
            >
              {section.title}
              <span className="text-xs">{collapsed[section.title] ? '+' : '-'}</span>
            </button>
            {!collapsed[section.title] && (
              <ul>
                {section.items.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={`block px-4 py-1.5 text-sm transition-colors ${
                        isActive(item.to)
                          ? 'font-medium'
                          : 'hover:bg-[var(--brand-subtle)]'
                      }`}
                      style={{
                        color: isActive(item.to) ? 'var(--brand-foreground)' : 'var(--foreground)',
                        backgroundColor: isActive(item.to) ? 'var(--brand-subtle)' : undefined,
                        borderLeft: isActive(item.to) ? '3px solid var(--brand)' : '3px solid transparent',
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
      <div className="p-4 border-t border-[var(--border)] text-xs" style={{ color: 'var(--muted-foreground)' }}>
        Sentinel v1.0
      </div>
    </aside>
  );
}