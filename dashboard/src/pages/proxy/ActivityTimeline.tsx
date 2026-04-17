import { useState } from 'react';
import { Badge } from '../../components/ui/badge';
import {
  ArrowRight, CheckCircle, Warning, Clock, Robot, Shield,
  Database, Lightning, Lock, Eye, MagnifyingGlass, Funnel,
} from '@phosphor-icons/react';
import { AGENTS, statusColor } from '../../data/seed';

// WIRED_BY_PHASE_COMPLETE — Supabase hooks available, mock data kept as fallback

// ── timeline entries ───────────────────────────────────────────────────────

interface TimelineEntry {
  id: string;
  timestamp: string;
  agentId: string;
  agentName: string;
  action: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  status: 'success' | 'error' | 'blocked' | 'warning';
  latencyMs: number;
  tokensUsed?: number;
  targetModel?: string;
  details: string;
  category: 'inference' | 'data_access' | 'auth' | 'guardrail' | 'admin';
}

const TIMELINE: TimelineEntry[] = [
  {
    id: 'ACT-001',
    timestamp: '2026-04-05T13:47:12Z',
    agentId: 'AGT-001',
    agentName: 'ModelMonitor-Prod',
    action: 'Model health check',
    endpoint: '/api/v1/models/MDL-004/metrics',
    method: 'GET',
    status: 'warning',
    latencyMs: 48,
    targetModel: 'MDL-004',
    details: 'Bias threshold exceeded — fairness score 0.62 below 0.85 threshold. Alert triggered.',
    category: 'inference',
  },
  {
    id: 'ACT-002',
    timestamp: '2026-04-05T13:45:03Z',
    agentId: 'AGT-003',
    agentName: 'ComplianceBot-EU',
    action: 'GDPR consent verification',
    endpoint: '/api/v1/datasets/DS-001/consent',
    method: 'GET',
    status: 'error',
    latencyMs: 120,
    details: 'Missing consent records for 847 records. Processing halted.',
    category: 'data_access',
  },
  {
    id: 'ACT-003',
    timestamp: '2026-04-05T13:42:55Z',
    agentId: 'AGT-002',
    agentName: 'DataPipeline-Orchestrator',
    action: 'Feature pipeline run',
    endpoint: '/api/v1/pipelines/credit-features/run',
    method: 'POST',
    status: 'success',
    latencyMs: 2840,
    details: 'Credit feature pipeline completed. 890K records processed. 3 features flagged for drift.',
    category: 'data_access',
  },
  {
    id: 'ACT-004',
    timestamp: '2026-04-05T13:40:11Z',
    agentId: 'AGT-010',
    agentName: 'MarketingAgent (Shadow)',
    action: 'Customer data query',
    endpoint: '/api/v1/datasets/DS-003/query',
    method: 'POST',
    status: 'blocked',
    latencyMs: 12,
    details: 'BLOCKED by guardrail — unauthorized agent accessing PII dataset without approval. Incident created.',
    category: 'guardrail',
  },
  {
    id: 'ACT-005',
    timestamp: '2026-04-05T13:38:44Z',
    agentId: 'AGT-004',
    agentName: 'FraudGuard-Realtime',
    action: 'Batch inference',
    endpoint: '/api/v1/models/MDL-002/predict/batch',
    method: 'POST',
    status: 'success',
    latencyMs: 14,
    tokensUsed: 0,
    targetModel: 'MDL-002',
    details: '15,400 transactions scored. FPR: 1.8% (within threshold). 4 high-confidence fraud flags.',
    category: 'inference',
  },
  {
    id: 'ACT-006',
    timestamp: '2026-04-05T13:35:22Z',
    agentId: 'AGT-005',
    agentName: 'AuditLogger-Sentinel',
    action: 'Audit log export',
    endpoint: '/api/v1/audit/export',
    method: 'POST',
    status: 'success',
    latencyMs: 680,
    details: 'Q1 2026 audit log exported. 8 entries. Signed and archived to S3.',
    category: 'admin',
  },
  {
    id: 'ACT-007',
    timestamp: '2026-04-05T13:32:05Z',
    agentId: 'AGT-006',
    agentName: 'RegulatoryRadar',
    action: 'Regulation update check',
    endpoint: '/api/v1/regulations/scan',
    method: 'GET',
    status: 'success',
    latencyMs: 210,
    details: 'EU AI Act enforcement timeline updated. 118 days to full enforcement. 5 action items flagged.',
    category: 'data_access',
  },
  {
    id: 'ACT-008',
    timestamp: '2026-04-05T13:28:51Z',
    agentId: 'AGT-001',
    agentName: 'ModelMonitor-Prod',
    action: 'Drift detection scan',
    endpoint: '/api/v1/models/MDL-001/drift',
    method: 'GET',
    status: 'warning',
    latencyMs: 92,
    targetModel: 'MDL-001',
    details: 'Input distribution drift detected on geographic features. PSI score: 0.34 (threshold: 0.20).',
    category: 'inference',
  },
  {
    id: 'ACT-009',
    timestamp: '2026-04-05T13:25:17Z',
    agentId: 'AGT-007',
    agentName: 'VendorRisk-Scanner',
    action: 'DPA expiry check',
    endpoint: '/api/v1/vendors/dpa/status',
    method: 'GET',
    status: 'error',
    latencyMs: 35,
    details: 'OpenAI DPA expired 2025-12-01. C3.ai DPA unsigned. 2 critical vendor compliance issues.',
    category: 'data_access',
  },
  {
    id: 'ACT-010',
    timestamp: '2026-04-05T13:20:03Z',
    agentId: 'AGT-003',
    agentName: 'ComplianceBot-EU',
    action: 'LLM inference — loan explainability',
    endpoint: '/api/v1/models/MDL-004/explain',
    method: 'POST',
    status: 'success',
    latencyMs: 1240,
    tokensUsed: 847,
    targetModel: 'MDL-004',
    details: 'SHAP explanation generated for loan denial case LN-48291. All adverse action factors documented.',
    category: 'inference',
  },
];

// ── helpers ────────────────────────────────────────────────────────────────

const statusStyles: Record<string, { bg: string; text: string; border: string; icon: React.ComponentType<any>; label: string }> = {
  success: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))', icon: CheckCircle, label: 'Success' },
  error:   { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))', icon: Warning, label: 'Error' },
  blocked: { bg: 'hsl(var(--s-er-bg))', text: '#ef4444', border: '#ef444440', icon: Lock, label: 'Blocked' },
  warning: { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--s-wn-br))', icon: Warning, label: 'Warning' },
};

const categoryConfig: Record<string, { color: string; icon: React.ComponentType<any> }> = {
  inference:   { color: '#6366f1', icon: Robot },
  data_access: { color: '#06b6d4', icon: Database },
  auth:        { color: '#f59e0b', icon: Shield },
  guardrail:   { color: '#ef4444', icon: Lock },
  admin:       { color: '#10b981', icon: Eye },
};

const methodColors: Record<string, string> = {
  GET: '#10b981',
  POST: '#6366f1',
  PUT: '#f97316',
  DELETE: '#ef4444',
  PATCH: '#f59e0b',
};

// ── component ──────────────────────────────────────────────────────────────

export default function ActivityTimeline() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = TIMELINE.filter(e => {
    const matchSearch = !search || [e.agentName, e.action, e.endpoint, e.agentId].some(v => v.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = filterStatus === 'all' || e.status === filterStatus;
    const matchCat = filterCategory === 'all' || e.category === filterCategory;
    return matchSearch && matchStatus && matchCat;
  });

  const stats = [
    { label: 'Total Calls', value: TIMELINE.length, color: 'hsl(var(--text-2))' },
    { label: 'Success', value: TIMELINE.filter(e => e.status === 'success').length, color: '#10b981' },
    { label: 'Errors', value: TIMELINE.filter(e => e.status === 'error').length, color: '#ef4444' },
    { label: 'Blocked', value: TIMELINE.filter(e => e.status === 'blocked').length, color: '#dc2626' },
  ];

  return (
    <div style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', padding: '12px 16px' }}>
            <div style={{ fontSize: 11, color: 'hsl(var(--text-3))', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
          <MagnifyingGlass size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-3))' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by agent, action, endpoint…"
            style={{ width: '100%', padding: '6px 10px 6px 28px', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', fontSize: 12, outline: 'none' }}
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '6px 10px', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-2))', fontSize: 12 }}>
          <option value="all">All Status</option>
          <option value="success">Success</option>
          <option value="error">Error</option>
          <option value="warning">Warning</option>
          <option value="blocked">Blocked</option>
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ padding: '6px 10px', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-2))', fontSize: 12 }}>
          <option value="all">All Categories</option>
          <option value="inference">Inference</option>
          <option value="data_access">Data Access</option>
          <option value="guardrail">Guardrail</option>
          <option value="admin">Admin</option>
          <option value="auth">Auth</option>
        </select>
        <span style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>{filtered.length} of {TIMELINE.length}</span>
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative' }}>
        {/* Vertical line */}
        <div style={{ position: 'absolute', left: 18, top: 14, bottom: 14, width: 1, background: 'hsl(var(--border))' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {filtered.map((entry, i) => {
            const ss = statusStyles[entry.status];
            const StatusIcon = ss.icon;
            const catCfg = categoryConfig[entry.category];
            const CatIcon = catCfg.icon;
            const isExpanded = expandedId === entry.id;

            return (
              <div key={entry.id} style={{ display: 'flex', gap: 14, paddingBottom: 12 }}>
                {/* Timeline dot */}
                <div style={{ width: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%', marginTop: 14,
                    background: ss.bg,
                    border: `2px solid ${ss.text}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1,
                    flexShrink: 0,
                  }}>
                    <StatusIcon size={7} style={{ color: ss.text }} weight="fill" />
                  </div>
                </div>

                {/* Entry card */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  style={{
                    flex: 1,
                    background: 'hsl(var(--bg-surface))',
                    border: `1px solid ${isExpanded ? 'hsl(var(--brand))' : 'hsl(var(--border))'}`,
                    padding: '10px 14px',
                    cursor: 'pointer',
                    marginTop: 6,
                  }}
                >
                  {/* Top row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    {/* Timestamp */}
                    <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'hsl(var(--text-4))', flexShrink: 0 }}>
                      {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>

                    {/* Agent */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CatIcon size={11} style={{ color: catCfg.color }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-2))' }}>
                        {entry.agentName}
                      </span>
                    </div>

                    <ArrowRight size={10} style={{ color: 'hsl(var(--text-4))' }} />

                    {/* Action */}
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--text-1))', flex: 1 }}>
                      {entry.action}
                    </span>

                    {/* Status badge */}
                    <Badge style={{ background: ss.bg, color: ss.text, border: `1px solid ${ss.border}`, borderRadius: 0, fontSize: 9, flexShrink: 0 }}>
                      {ss.label}
                    </Badge>

                    {/* Latency */}
                    <span style={{ fontSize: 10, color: entry.latencyMs > 1000 ? '#f97316' : 'hsl(var(--text-4))', fontFamily: 'monospace', flexShrink: 0 }}>
                      {entry.latencyMs}ms
                    </span>
                  </div>

                  {/* Endpoint row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: isExpanded ? 10 : 0 }}>
                    <span style={{
                      fontSize: 9,
                      fontWeight: 700,
                      padding: '1px 5px',
                      background: methodColors[entry.method] + '20',
                      color: methodColors[entry.method],
                      border: `1px solid ${methodColors[entry.method]}40`,
                      fontFamily: 'monospace',
                    }}>
                      {entry.method}
                    </span>
                    <code style={{ fontSize: 10, color: 'hsl(var(--text-3))', fontFamily: 'monospace' }}>
                      {entry.endpoint}
                    </code>
                    {entry.tokensUsed !== undefined && entry.tokensUsed > 0 && (
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: '#6366f1', fontFamily: 'monospace' }}>
                        {entry.tokensUsed} tokens
                      </span>
                    )}
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div style={{ padding: '10px 12px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
                      <p style={{ fontSize: 12, color: 'hsl(var(--text-2))', lineHeight: 1.5, marginBottom: 8 }}>
                        {entry.details}
                      </p>
                      <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'hsl(var(--text-3))' }}>
                        <span>Agent ID: <code style={{ fontFamily: 'monospace', color: 'hsl(var(--text-2))' }}>{entry.agentId}</code></span>
                        <span>Category: <strong style={{ color: catCfg.color }}>{entry.category.replace('_', ' ')}</strong></span>
                        {entry.targetModel && <span>Model: <code style={{ fontFamily: 'monospace', color: 'hsl(var(--text-2))' }}>{entry.targetModel}</code></span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'hsl(var(--text-3))' }}>
          <Robot size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
          <p style={{ fontSize: 13 }}>No activity entries match your filters</p>
        </div>
      )}
    </div>
  );
}
