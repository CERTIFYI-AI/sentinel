import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Bell, Warning, ShieldCheck, Robot, FileText, CheckCircle,
  X, Eye, Funnel, ArrowRight, Archive, SealCheck, Lightning,
  Virus, Gear, ChartBar, ClipboardText, CalendarBlank, Lock,
  MagnifyingGlass, CaretDown,
} from '@phosphor-icons/react';
import { severityColor } from '../data/seed';
import type { Severity } from '../data/seed';

// WIRED_BY_PHASE_COMPLETE — Supabase hooks available, mock data kept as fallback

// ── notification seed ──────────────────────────────────────────────────────

interface Notification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  severity: Severity | 'info' | 'system';
  category: 'model' | 'security' | 'compliance' | 'hitl' | 'risk' | 'bias' | 'incident' | 'vendor' | 'policy' | 'redteam' | 'export' | 'system' | 'guardrail';
  read: boolean;
  link: string;
  group: 'Today' | 'Yesterday' | 'This Week' | 'Older';
}

const NOTIFICATIONS: Notification[] = [
  {
    id: 'NTF-001',
    title: 'Critical: Bias threshold exceeded',
    description: 'MDL-004 Loan Approval Assistant — gender fairness score dropped to 0.62, below 0.85 threshold. Immediate review required.',
    timestamp: '2026-04-05T13:47:00Z',
    severity: 'critical',
    category: 'model',
    read: false,
    link: '/models',
    group: 'Today',
  },
  {
    id: 'NTF-002',
    title: 'High: Shadow AI agent detected',
    description: 'AGT-010 in Marketing department — unauthorized LangChain agent accessing customer PII without approval. Agent quarantined.',
    timestamp: '2026-04-05T11:22:00Z',
    severity: 'high',
    category: 'security',
    read: false,
    link: '/agents',
    group: 'Today',
  },
  {
    id: 'NTF-003',
    title: 'Medium: Evidence EV-005 GDPR DPA expired',
    description: 'GDPR Data Processing Agreement with OpenAI (EV-005) has expired. Renewal required before continued EU data processing.',
    timestamp: '2026-04-05T09:15:00Z',
    severity: 'medium',
    category: 'compliance',
    read: false,
    link: '/evidence',
    group: 'Today',
  },
  {
    id: 'NTF-004',
    title: 'New HITL review assigned',
    description: 'HITL-001 — Bias review for Loan Approval Assistant assigned to you. SLA: 4h remaining. Priority: Critical.',
    timestamp: '2026-04-05T08:05:00Z',
    severity: 'critical',
    category: 'hitl',
    read: false,
    link: '/hitl/HITL-001',
    group: 'Today',
  },
  {
    id: 'NTF-005',
    title: 'Risk RSK-004 escalated to Critical',
    description: 'OpenAI DPA gap for EU data — risk score elevated to Critical (20/25). Owner: James Patel. Trending upward.',
    timestamp: '2026-04-04T16:30:00Z',
    severity: 'critical',
    category: 'risk',
    read: false,
    link: '/risks',
    group: 'Yesterday',
  },
  {
    id: 'NTF-006',
    title: 'Model MDL-002 drift status changed to Stable',
    description: 'Fraud Detection Engine drift monitoring shows return to stable after 3-week elevated period. No action required.',
    timestamp: '2026-04-04T14:18:00Z',
    severity: 'low' as Severity,
    category: 'model',
    read: true,
    link: '/models',
    group: 'Yesterday',
  },
  {
    id: 'NTF-007',
    title: 'Compliance control CTRL-003 test result: FAILED',
    description: 'Automated control CTRL-003 (Risk Assessment Procedure) failed scheduled test. Evidence gap identified under NIST AI RMF.',
    timestamp: '2026-04-04T11:00:00Z',
    severity: 'high',
    category: 'compliance',
    read: false,
    link: '/controls',
    group: 'Yesterday',
  },
  {
    id: 'NTF-008',
    title: 'Vendor V-007 C3.ai flagged as HIGH RISK',
    description: 'C3.ai vendor score dropped to 55/100. DPA unsigned. Data residency concerns identified. Enhanced due diligence required.',
    timestamp: '2026-04-03T15:45:00Z',
    severity: 'high',
    category: 'vendor',
    read: true,
    link: '/vendors',
    group: 'This Week',
  },
  {
    id: 'NTF-009',
    title: 'Bias audit BA-005 completed — FAILED',
    description: 'Loan Approval Assistant (MDL-004) on DS-001 — GDPR framework. All 4 dimensions failed. Remediation blocked. External audit mandatory.',
    timestamp: '2026-04-03T10:20:00Z',
    severity: 'critical',
    category: 'bias',
    read: false,
    link: '/bias-audits',
    group: 'This Week',
  },
  {
    id: 'NTF-010',
    title: 'Incident INC-005 LLM hallucination — mitigating',
    description: 'Loan Approval Assistant fabricated regulatory citations. RAG pipeline implementation in progress. Human review gate enabled.',
    timestamp: '2026-04-02T09:10:00Z',
    severity: 'high',
    category: 'incident',
    read: true,
    link: '/incidents',
    group: 'This Week',
  },
  {
    id: 'NTF-011',
    title: 'Policy POL-005 EU AI Act framework submitted',
    description: 'EU AI Act governance framework policy submitted for review by Emma Wilson. 3 reviewers required before publication.',
    timestamp: '2026-04-01T14:55:00Z',
    severity: 'medium',
    category: 'policy',
    read: true,
    link: '/policies',
    group: 'This Week',
  },
  {
    id: 'NTF-012',
    title: 'Red team exercise RT-004 — 4 critical findings',
    description: 'Latest red team exercise completed. 4 critical vulnerabilities found including prompt injection on MDL-004 and data exfiltration path.',
    timestamp: '2026-04-01T08:30:00Z',
    severity: 'critical',
    category: 'redteam',
    read: false,
    link: '/security',
    group: 'This Week',
  },
  {
    id: 'NTF-013',
    title: 'Export completed: Risk Register CSV',
    description: 'Your requested export of the Risk Register (12 risks, all frameworks) is ready for download. File expires in 24 hours.',
    timestamp: '2026-03-30T16:00:00Z',
    severity: 'low' as Severity,
    category: 'export',
    read: true,
    link: '/reporting',
    group: 'Older',
  },
  {
    id: 'NTF-014',
    title: 'System: Scheduled maintenance window',
    description: 'Platform maintenance scheduled for Apr 10, 02:00–04:00 UTC. Evidence sync, model monitoring, and HITL queue will be paused.',
    timestamp: '2026-03-29T10:00:00Z',
    severity: 'info' as any,
    category: 'system',
    read: true,
    link: '/system',
    group: 'Older',
  },
  {
    id: 'NTF-015',
    title: 'Guardrail blocked: PII detected in ComplianceBot output',
    description: 'PII Detection guardrail blocked ComplianceBot response. Customer SSN detected in draft output. Event logged to audit trail.',
    timestamp: '2026-03-28T17:35:00Z',
    severity: 'high',
    category: 'guardrail',
    read: true,
    link: '/guardrails',
    group: 'Older',
  },
];

// ── helpers ────────────────────────────────────────────────────────────────

const categoryIcon: Record<string, React.ComponentType<any>> = {
  model: Robot,
  security: Lock,
  compliance: ShieldCheck,
  hitl: Eye,
  risk: Warning,
  bias: ChartBar,
  incident: Virus,
  vendor: SealCheck,
  policy: FileText,
  redteam: Lightning,
  export: Archive,
  system: Gear,
  guardrail: Lock,
};

const categoryColor: Record<string, string> = {
  model: '#6366f1',
  security: '#ef4444',
  compliance: '#06b6d4',
  hitl: '#a855f7',
  risk: '#f97316',
  bias: '#f59e0b',
  incident: '#dc2626',
  vendor: '#84cc16',
  policy: '#3b82f6',
  redteam: '#ec4899',
  export: '#10b981',
  system: 'hsl(var(--text-3))',
  guardrail: '#ef4444',
};

const GROUPS = ['Today', 'Yesterday', 'This Week', 'Older'] as const;
const CATEGORIES = ['all', 'model', 'security', 'compliance', 'hitl', 'risk', 'bias', 'incident', 'vendor', 'policy', 'redteam', 'system', 'guardrail', 'export'] as const;

function SevBadge({ severity }: { severity: string }) {
  if (severity === 'info' || severity === 'system') {
    return (
      <Badge style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))', border: '1px solid hsl(var(--border))', borderRadius: 0, fontSize: 9, fontWeight: 600 }}>
        INFO
      </Badge>
    );
  }
  const sc = severityColor(severity as Severity);
  return (
    <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 9, fontWeight: 600 }}>
      {severity.toUpperCase()}
    </Badge>
  );
}

// ── component ──────────────────────────────────────────────────────────────

export default function Notifications() {
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  const unread = notifications.filter(n => !n.read).length;
  const critical = notifications.filter(n => n.severity === 'critical').length;
  const thisWeek = notifications.filter(n => n.group === 'Today' || n.group === 'Yesterday' || n.group === 'This Week').length;

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const markRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const dismiss = (id: string) => setNotifications(prev => prev.filter(n => n.id !== id));

  const filtered = notifications.filter(n => {
    const matchCat = filter === 'all' || n.category === filter;
    const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const stats = [
    { label: 'Total', value: notifications.length, icon: Bell, color: 'hsl(var(--brand))' },
    { label: 'Unread', value: unread, icon: Eye, color: '#3b82f6' },
    { label: 'Critical', value: critical, icon: Warning, color: '#ef4444' },
    { label: 'This Week', value: thisWeek, icon: CalendarBlank, color: '#10b981' },
  ];

  return (
    <div className="space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Notification Center</h1>
          <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>
            Real-time alerts across compliance, security, and model operations
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={markAllRead}
            disabled={unread === 0}
            style={{ borderRadius: 0, gap: 6 }}
          >
            <CheckCircle size={14} /> Mark All Read
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowFilter(p => !p)}
            style={{ borderRadius: 0, gap: 6 }}
          >
            <Funnel size={14} /> Filter <CaretDown size={10} />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{s.label}</span>
                <s.icon size={16} style={{ color: s.color }} />
              </div>
              <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter panel */}
      {showFilter && (
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-semibold" style={{ color: 'hsl(var(--text-3))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</span>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  style={{
                    padding: '4px 10px',
                    fontSize: 12,
                    fontWeight: filter === cat ? 600 : 400,
                    background: filter === cat ? 'hsl(var(--brand))' : 'hsl(var(--bg-muted))',
                    color: filter === cat ? '#fff' : 'hsl(var(--text-2))',
                    border: '1px solid hsl(var(--border))',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <MagnifyingGlass size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-3))' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search notifications…"
          style={{
            width: '100%',
            padding: '8px 12px 8px 32px',
            background: 'hsl(var(--bg-surface))',
            border: '1px solid hsl(var(--border))',
            color: 'hsl(var(--text-1))',
            fontSize: 13,
            outline: 'none',
          }}
        />
      </div>

      {/* Grouped notifications */}
      {GROUPS.map(group => {
        const groupItems = filtered.filter(n => n.group === group);
        if (groupItems.length === 0) return null;
        return (
          <div key={group}>
            {/* Group header */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-semibold" style={{
                color: 'hsl(var(--text-3))',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}>
                {group}
              </span>
              <div style={{ flex: 1, height: 1, background: 'hsl(var(--border))' }} />
              <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{groupItems.length} notifications</span>
            </div>

            <div className="space-y-2">
              {groupItems.map(n => {
                const Icon = categoryIcon[n.category] || Bell;
                const iconColor = categoryColor[n.category] || 'hsl(var(--text-3))';
                return (
                  <div
                    key={n.id}
                    style={{
                      background: n.read ? 'hsl(var(--bg-surface))' : 'hsl(var(--bg-raised))',
                      border: `1px solid ${n.read ? 'hsl(var(--border))' : 'hsl(var(--border-mid))'}`,
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      position: 'relative',
                    }}
                  >
                    {/* Unread indicator */}
                    {!n.read && (
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 3,
                        background: 'hsl(var(--brand))',
                      }} />
                    )}

                    {/* Icon */}
                    <div style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      background: 'hsl(var(--bg-muted))',
                      border: '1px solid hsl(var(--border))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon size={15} style={{ color: iconColor }} />
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 13,
                          fontWeight: n.read ? 500 : 600,
                          color: 'hsl(var(--text-1))',
                        }}>
                          {n.title}
                        </span>
                        <SevBadge severity={n.severity as string} />
                        <Badge style={{
                          background: 'hsl(var(--bg-muted))',
                          color: 'hsl(var(--text-3))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 0,
                          fontSize: 9,
                          textTransform: 'capitalize',
                        }}>
                          {n.category}
                        </Badge>
                      </div>
                      <p style={{ fontSize: 12, color: 'hsl(var(--text-3))', lineHeight: 1.5, marginBottom: 6 }}>
                        {n.description}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 11, color: 'hsl(var(--text-4))', fontFamily: 'monospace' }}>
                          {new Date(n.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {!n.read && (
                          <button
                            onClick={() => markRead(n.id)}
                            style={{ fontSize: 11, color: 'hsl(var(--brand))', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            Mark as read
                          </button>
                        )}
                        <Link to={n.link} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'hsl(var(--brand))', textDecoration: 'none' }}>
                          View <ArrowRight size={10} />
                        </Link>
                      </div>
                    </div>

                    {/* Dismiss */}
                    <button
                      onClick={() => dismiss(n.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'hsl(var(--text-4))',
                        padding: 2,
                        flexShrink: 0,
                      }}
                      title="Dismiss"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'hsl(var(--text-3))' }}>
          <Bell size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontSize: 14 }}>No notifications match your filter</p>
        </div>
      )}
    </div>
  );
}
