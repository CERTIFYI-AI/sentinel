// @ts-nocheck

import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  House, ShieldCheck, Book, Sliders, Globe, Bell, Briefcase,
  Robot, Database, Users, ChartBar, AlertTriangle, Shield,
  Gear, Eye, Scales, FileText, Brain, Lock, MagnifyingGlass,
  ArrowsClockwise, ClipboardText, SealCheck, FlaskConquer,
  CaretDown, CaretRight, List, X, SignOut
} from '@phosphor-icons/react';
import { ThemeToggle } from '../../providers/theme';

const groups = [
  {
    label: 'OVERVIEW',
    items: [
      { label: 'Dashboard', href: '/overview', icon: House },
      { label: 'Tasks', href: '/tasks', icon: ClipboardText },
      { label: 'Notifications', href: '/notifications', icon: Bell },
    ]
  },
  {
    label: 'GOVERNANCE',
    items: [
      { label: 'Compliance', href: '/compliance', icon: ShieldCheck },
      { label: 'Policy Manager', href: '/policies', icon: Book },
      { label: 'Controls', href: '/compliance/controls', icon: Sliders },
      { label: 'Frameworks', href: '/compliance/frameworks', icon: Globe },
      { label: 'Reg Radar', href: '/reg-radar', icon: Scales },
      { label: 'HITL Reviews', href: '/hitl', icon: Eye, badge: 3 },
    ]
  },
  {
    label: 'AI INVENTORY',
    items: [
      { label: 'Model Inventory', href: '/models/inventory', icon: Brain },
      { label: 'Agent Discovery', href: '/agents', icon: Robot, badge: 12 },
      { label: 'Datasets', href: '/datasets', icon: Database },
      { label: 'Use Cases', href: '/use-cases', icon: Briefcase },
      { label: 'Vendor List', href: '/vendors', icon: Users },
      { label: 'Prompt Registry', href: '/prompt-registry', icon: FileText },
    ]
  },
  {
    label: 'RISK & COMPLIANCE',
    items: [
      { label: 'Risk Register', href: '/risk', icon: AlertTriangle },
      { label: 'Bias Audits', href: '/bias-audits', icon: ChartBar },
      { label: 'Evidence Sync', href: '/evidence-sync', icon: ArrowsClockwise },
      { label: 'Incidents', href: '/incidents', icon: AlertTriangle },
      { label: 'Reporting', href: '/reporting', icon: FileText },
    ]
  },
  {
    label: 'TRUST ENGINE',
    items: [
      { label: 'Trust Engine', href: '/trust-engine', icon: SealCheck },
      { label: 'Guardrails', href: '/trust-engine/guardrails', icon: Lock },
      { label: 'LLM Evals', href: '/evals', icon: FlaskConquer },
      { label: 'AI Advisor', href: '/ai-advisor', icon: Brain },
    ]
  },
  {
    label: 'ADMINISTRATION',
    items: [
      { label: 'Access Control', href: '/access-control', icon: Shield },
      { label: 'Settings', href: '/settings', icon: Gear },
      { label: 'System', href: '/system', icon: Sliders },
    ]
  },
];

export function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === '/overview') return location.pathname === href || location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  return (
    <aside style={{
      width: collapsed ? 56 : 240,
      minWidth: collapsed ? 56 : 240,
      background: 'hsl(var(--bg-surface))',
      borderRight: '1px solid hsl(var(--border))',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
      transition: 'width 0.2s',
      position: 'relative',
      zIndex: 10,
    }}>
      {/* Logo */}
      <div style={{ padding: collapsed ? '14px 0' : '14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid hsl(var(--border))', flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, background: 'hsl(var(--brand))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0, marginLeft: collapsed ? 14 : 0 }}>S</div>
        {!collapsed && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'hsl(var(--text-1))', lineHeight: 1.2 }}>Sentinel AI</div>
            <div style={{ fontSize: 10, color: 'hsl(var(--text-4))', lineHeight: 1.2 }}>GRC Platform</div>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-4))', padding: 2, display: 'flex' }}>
          {collapsed ? <List size={16}/> : <X size={14}/>}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 0' }}>
        {groups.map(group => (
          <div key={group.label}>
            {!collapsed && (
              <div style={{ fontSize: 10, fontWeight: 600, color: 'hsl(var(--text-4))', padding: '8px 16px 4px', letterSpacing: '0.08em' }}>
                {group.label}
              </div>
            )}
            {group.items.map(item => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: collapsed ? '8px 0' : '7px 16px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    textDecoration: 'none',
                    color: active ? 'hsl(var(--brand))' : 'hsl(var(--text-3))',
                    background: active ? 'hsl(var(--brand-subtle))' : 'transparent',
                    borderLeft: active ? '2px solid hsl(var(--brand))' : '2px solid transparent',
                    fontSize: 13,
                    fontWeight: active ? 500 : 400,
                    transition: 'all 0.1s',
                    position: 'relative',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'hsl(var(--bg-raised))'; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <Icon size={16} weight={active ? 'fill' : 'regular'} style={{ flexShrink: 0 }}/>
                  {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                  {!collapsed && (item as any).badge && (
                    <span style={{ background: 'hsl(var(--brand))', color: '#fff', fontSize: 10, fontWeight: 600, padding: '1px 5px', minWidth: 18, textAlign: 'center' }}>
                      {(item as any).badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: '1px solid hsl(var(--border))', padding: collapsed ? '8px 0' : '8px 12px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {!collapsed && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-1))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Bhaskar Admin</div>
            <div style={{ fontSize: 10, color: 'hsl(var(--text-4))' }}>CISO</div>
          </div>
        )}
        <ThemeToggle />
      </div>
    </aside>
  );
}
