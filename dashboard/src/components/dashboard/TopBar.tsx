
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlass, Bell } from '@phosphor-icons/react';
import { ThemeToggle } from '../../providers/theme';

const routeTitles: Record<string, string> = {
  '/overview': 'Dashboard',
  '/tasks': 'Task Management',
  '/notifications': 'Notifications',
  '/compliance': 'Compliance Dashboard',
  '/policies': 'Policy Manager',
  '/compliance/controls': 'Controls',
  '/compliance/frameworks': 'Frameworks',
  '/reg-radar': 'Reg Radar',
  '/hitl': 'HITL Reviews',
  '/models/inventory': 'Model Inventory',
  '/agents': 'Agent Discovery',
  '/datasets': 'Datasets',
  '/use-cases': 'Use Cases',
  '/vendors': 'Vendor List',
  '/prompt-registry': 'Prompt Registry',
  '/risk': 'Risk Register',
  '/bias-audits': 'Bias Audits',
  '/evidence-sync': 'Evidence Sync',
  '/incidents': 'Incidents',
  '/reporting': 'Reporting',
  '/trust-engine': 'Trust Engine',
  '/trust-engine/guardrails': 'Guardrails',
  '/evals': 'LLM Evals',
  '/ai-advisor': 'AI Advisor',
  '/access-control': 'Access Control',
  '/settings': 'Settings',
  '/system': 'System',
};

interface TopBarProps { pathname: string; }
export function TopBar({ pathname }: TopBarProps) {
  const navigate = useNavigate();
  const title = Object.entries(routeTitles).sort((a,b) => b[0].length - a[0].length).find(([k]) => pathname.startsWith(k))?.[1] || 'Sentinel AI';
  return (
    <header style={{ height: 48, background: 'hsl(var(--bg-surface))', borderBottom: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, flexShrink: 0 }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--text-3))' }}>{title}</span>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          onClick={() => navigate('/search')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-4))', fontSize: 12, cursor: 'pointer' }}
        >
          <MagnifyingGlass size={13}/>
          <span>Quick search...</span>
          <kbd style={{ background: 'hsl(var(--bg-sunken))', border: '1px solid hsl(var(--border-mid))', padding: '0 4px', fontSize: 10, color: 'hsl(var(--text-4))' }}>⌘K</kbd>
        </button>
        <ThemeToggle />
        <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, color: 'hsl(var(--text-3))' }} onClick={() => navigate('/notifications')}>
          <Bell size={16}/>
        </button>
        <div data-avatar style={{ width: 28, height: 28, background: 'hsl(var(--brand))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, cursor: 'pointer' }} onClick={() => navigate('/settings')}>
          BA
        </div>
      </div>
    </header>
  );
}
