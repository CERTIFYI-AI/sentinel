import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  ArrowLeft, Robot, ShieldSlash, Clock, Database, ChartLine, Warning,
  Skull, X, Shield, Lock, Key, Network, CheckCircle,
} from '@phosphor-icons/react';
import { Card } from '../../components/ui/card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { AGENTS, severityColor, statusColor, formatDate, formatNumber } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';


const riskAssessmentData: Record<string, { category: string; level: string; description: string }[]> = {
  'AGT-001': [
    { category: 'Data Access Scope', level: 'low', description: 'Access limited to model metrics and logs. No PII exposure.' },
    { category: 'Network Exposure', level: 'low', description: 'Internal-only communication. No external API calls.' },
    { category: 'Model Impact', level: 'medium', description: 'Can trigger model retraining pipelines if thresholds breached.' },
  ],
  'AGT-003': [
    { category: 'Data Access Scope', level: 'high', description: 'Access to customer queries and loan applications containing PII.' },
    { category: 'Network Exposure', level: 'high', description: 'External API calls to OpenAI endpoints with customer data.' },
    { category: 'Rate Limiting', level: 'medium', description: 'Cost controls in place but no strict rate limiting per user.' },
  ],
  'AGT-009': [
    { category: 'Data Access Scope', level: 'high', description: 'Access to HR records and resume PII. Protected attribute exposure.' },
    { category: 'Decision Impact', level: 'high', description: 'Outputs influence hiring decisions for protected class applicants.' },
    { category: 'Bias Risk', level: 'critical', description: 'Historical bias in training data. Under bias audit review.' },
  ],
  'AGT-010': [
    { category: 'Authorization', level: 'critical', description: 'No authorization controls. Deployed without IT approval.' },
    { category: 'Data Access Scope', level: 'critical', description: 'Unauthorized access to customer PII and marketing data.' },
    { category: 'Exfiltration Risk', level: 'critical', description: 'Sending customer data to external endpoints unencrypted.' },
  ],
  'AGT-011': [
    { category: 'Authorization', level: 'high', description: 'Deployed without IT review. No data governance controls.' },
    { category: 'IP Protection', level: 'high', description: 'Source code and internal docs sent to external GPT endpoint.' },
    { category: 'Data Classification', level: 'medium', description: 'Internal confidential data being processed externally.' },
  ],
  'AGT-012': [
    { category: 'Authorization', level: 'critical', description: 'Fully autonomous with uncontrolled internet access.' },
    { category: 'Scope Creep', level: 'critical', description: 'Can access internal APIs and external internet simultaneously.' },
    { category: 'Containment', level: 'critical', description: 'No sandboxing or resource limits applied.' },
  ],
};

const activityTimeline: Record<string, { date: string; event: string; type: 'info' | 'warning' | 'error' }[]> = {
  default: [
    { date: '2026-03-31', event: 'Agent health check completed. All systems nominal.', type: 'info' },
    { date: '2026-03-28', event: 'Configuration update applied.', type: 'info' },
    { date: '2026-03-20', event: 'API rate limit warning triggered.', type: 'warning' },
    { date: '2026-03-15', event: 'Routine audit log snapshot captured.', type: 'info' },
  ],
  shadow: [
    { date: '2026-03-31', event: 'Active API traffic detected — 560 calls in last 24h.', type: 'error' },
    { date: '2026-03-29', event: 'Attempted access to restricted internal APIs.', type: 'error' },
    { date: '2026-03-25', event: 'Unauthorized data transfer detected.', type: 'error' },
    { date: '2026-03-20', event: 'First detected by network scan.', type: 'warning' },
  ],
};

const IAM_PERMISSIONS = [
  { resource: 'Model Registry', read: true, write: false, execute: false, admin: false },
  { resource: 'Customer PII', read: false, write: false, execute: false, admin: false },
  { resource: 'Audit Logs', read: true, write: false, execute: false, admin: false },
  { resource: 'Risk Register', read: true, write: false, execute: false, admin: false },
  { resource: 'Inference API', read: true, write: false, execute: true, admin: false },
  { resource: 'Training Data', read: false, write: false, execute: false, admin: false },
  { resource: 'Policy Store', read: true, write: false, execute: false, admin: false },
  { resource: 'Alert Manager', read: true, write: true, execute: false, admin: false },
];

// ── 2-step Kill Switch Dialog ──────────────────────────────────────────────────
function KillSwitchModal({ agent, onClose }: { agent: NonNullable<typeof AGENTS[0]>; onClose: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState('');
  const [reason, setReason] = useState('');
  const expected = `DISABLE ${agent.id}`;

  function handleConfirm() {
    toast.success(`Agent ${agent.id} killed. All network connections severed.`);
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'hsl(var(--bg-page)/70%)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
      <div style={{ width: 480, background: 'hsl(var(--bg-surface))', border: '2px solid hsl(var(--s-er-br))', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid hsl(var(--s-er-br))', background: 'hsl(var(--s-er-bg))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Skull size={18} style={{ color: 'hsl(var(--s-er-tx))' }} />
            <span style={{ fontWeight: 700, color: 'hsl(var(--s-er-tx))', fontSize: 14 }}>
              Emergency Kill Switch — Step {step} of 2
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--s-er-tx))' }}><X size={16} /></button>
        </div>
        <div style={{ padding: 20 }}>
          {step === 1 ? (
            <>
              <div style={{ marginBottom: 16, padding: 12, background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-br))' }}>
                <p style={{ fontSize: 13, color: 'hsl(var(--s-er-tx))', lineHeight: 1.6 }}>
                  This will immediately terminate <strong>{agent.name}</strong> ({agent.id}), revoke all API credentials, and sever all network connections. This action is logged and audited.
                </p>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-2))', display: 'block', marginBottom: 6 }}>Reason for termination (required)</label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Enter justification for kill switch activation..."
                  rows={3}
                  style={{ width: '100%', padding: '8px 10px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={onClose} style={{ flex: 1, padding: 8, background: 'none', border: '1px solid hsl(var(--border))', cursor: 'pointer', color: 'hsl(var(--text-2))', fontSize: 13 }}>Cancel</button>
                <button onClick={() => setStep(2)} disabled={reason.trim().length < 10}
                  style={{ flex: 1, padding: 8, background: reason.trim().length < 10 ? 'hsl(var(--bg-muted))' : 'hsl(var(--s-er-tx))', border: 'none', cursor: reason.trim().length < 10 ? 'not-allowed' : 'pointer', color: reason.trim().length < 10 ? 'hsl(var(--text-4))' : 'hsl(var(--bg-surface))', fontSize: 13, fontWeight: 600 }}>
                  Continue → Step 2
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ fontSize: 13, color: 'hsl(var(--text-2))', marginBottom: 14, lineHeight: 1.6 }}>
                To confirm, type exactly: <code style={{ fontFamily: 'monospace', fontWeight: 700, color: 'hsl(var(--s-er-tx))' }}>{expected}</code>
              </p>
              <input
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder={expected}
                style={{ width: '100%', padding: '8px 10px', background: 'hsl(var(--bg-muted))', border: `1px solid ${confirmText === expected ? 'hsl(var(--s-ok-br))' : 'hsl(var(--border))'}`, color: 'hsl(var(--text-1))', fontSize: 13, fontFamily: 'monospace', boxSizing: 'border-box', marginBottom: 14 }}
              />
              {confirmText === expected && (
                <p style={{ fontSize: 11, color: 'hsl(var(--s-ok-tx))', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle size={12} /> Confirmation matches
                </p>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setStep(1)} style={{ flex: 1, padding: 8, background: 'none', border: '1px solid hsl(var(--border))', cursor: 'pointer', color: 'hsl(var(--text-2))', fontSize: 13 }}>← Back</button>
                <button onClick={handleConfirm} disabled={confirmText !== expected}
                  style={{ flex: 1, padding: 8, background: confirmText !== expected ? 'hsl(var(--bg-muted))' : 'hsl(var(--s-er-tx))', border: 'none', cursor: confirmText !== expected ? 'not-allowed' : 'pointer', color: confirmText !== expected ? 'hsl(var(--text-4))' : 'hsl(var(--bg-surface))', fontSize: 13, fontWeight: 700 }}>
                  KILL AGENT NOW
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Agent Topology SVG ─────────────────────────────────────────────────────────
function AgentTopology({ agent }: { agent: typeof AGENTS[0] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const nodes = [
    { id: 'user', label: 'End Users', x: 80, y: 120, color: 'hsl(var(--text-3))' },
    { id: 'api', label: 'API Gateway', x: 220, y: 120, color: 'hsl(var(--brand))' },
    { id: 'agent', label: agent?.name?.split(' ')[0] ?? 'Agent', x: 380, y: 120, color: agent?.status === 'shadow' ? 'hsl(var(--s-er-tx))' : 'hsl(var(--s-ok-tx))' },
    { id: 'model', label: agent?.model ?? 'LLM', x: 540, y: 60, color: 'hsl(var(--tag-purple))' },
    { id: 'data', label: 'Data Store', x: 540, y: 180, color: 'hsl(var(--s-wn-tx))' },
    { id: 'ext', label: 'External API', x: 680, y: 120, color: agent?.status === 'shadow' ? 'hsl(var(--s-er-tx))' : 'hsl(var(--text-4))' },
  ];
  const edges = [
    { from: nodes[0], to: nodes[1], color: 'hsl(var(--border))' },
    { from: nodes[1], to: nodes[2], color: 'hsl(var(--brand))' },
    { from: nodes[2], to: nodes[3], color: 'hsl(var(--tag-purple))' },
    { from: nodes[2], to: nodes[4], color: 'hsl(var(--s-wn-tx))' },
    { from: nodes[2], to: nodes[5], color: agent?.status === 'shadow' ? 'hsl(var(--s-er-tx))' : 'hsl(var(--border))', dashed: agent?.status !== 'shadow' },
  ];
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={800} height={240} style={{ display: 'block', minWidth: 700 }}>
        <defs>
          {edges.map((e, i) => (
            <marker key={i} id={`ta${i}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={e.color} />
            </marker>
          ))}
        </defs>
        {edges.map((e, i) => {
          const dx = e.to.x - e.from.x;
          const dy = e.to.y - e.from.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const nx = dx / len;
          const ny = dy / len;
          const r = 32;
          return (
            <line
              key={i}
              x1={e.from.x + nx * r} y1={e.from.y + ny * r}
              x2={e.to.x - nx * r} y2={e.to.y - ny * r}
              stroke={e.color} strokeWidth={2}
              strokeDasharray={e.dashed ? '5,4' : undefined}
              markerEnd={`url(#ta${i})`}
            />
          );
        })}
        {nodes.map(n => (
          <g key={n.id} onMouseEnter={() => setHovered(n.id)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
            <circle cx={n.x} cy={n.y} r={32}
              fill={hovered === n.id ? 'hsl(var(--bg-raised))' : 'hsl(var(--bg-surface))'}
              stroke={hovered === n.id ? n.color : 'hsl(var(--border))'}
              strokeWidth={hovered === n.id ? 2 : 1}
            />
            <text x={n.x} y={n.y - 2} textAnchor="middle" fontSize={9} fontWeight={600} fill={n.color}>{n.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const orgName = useSettingsStore(s => s.orgName);
  const [showKillSwitch, setShowKillSwitch] = useState(false);
  const [killInitiated, setKillInitiated] = useState(false);

  const agent = AGENTS.find(a => a.id === id);

  if (!agent) {
    return (
      <div style={{ padding: 24 }}>
        <Button variant="outline" onClick={() => navigate('/agents')} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          <ArrowLeft size={16} /> Back to Agents
        </Button>
        <div style={{ color: 'hsl(var(--text-4))' }}>Agent not found: {id}</div>
      </div>
    );
  }

  const isShadow = agent.status === 'shadow';
  const sc = statusColor(agent.status);
  const rc = severityColor(agent.risk);
  const riskItems = riskAssessmentData[agent.id] || riskAssessmentData['AGT-001'];
  const timeline = isShadow ? activityTimeline['shadow'] : activityTimeline['default'];

  const riskLevelStyle = (level: string) => ({
    background: level === 'critical' ? 'hsl(var(--r-cr-bg))' : level === 'high' ? 'hsl(var(--s-er-bg))' : level === 'medium' ? 'hsl(var(--s-wn-bg))' : 'hsl(var(--s-ok-bg))',
    color: level === 'critical' ? 'hsl(var(--r-cr-tx))' : level === 'high' ? 'hsl(var(--s-er-tx))' : level === 'medium' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-ok-tx))',
    border: `1px solid ${level === 'critical' ? 'hsl(var(--r-cr-br))' : level === 'high' ? 'hsl(var(--s-er-br))' : level === 'medium' ? 'hsl(var(--s-wn-br))' : 'hsl(var(--s-ok-br))'}`,
  });

  return (
    <div>
      <PageHeader 
        title={agent.name}
        description={agent.description}
        icon={isShadow ? ShieldSlash : Robot}
        actions={
          <div className="flex items-center gap-2">
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'hsl(var(--text-4))' }}>{agent.id}</span>
            <span style={{ padding: '1px 7px', fontSize: 11, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>{agent.status}</span>
            <span style={{ padding: '1px 7px', fontSize: 11, background: rc.bg, color: rc.text, border: `1px solid ${rc.border}` }}>{agent.risk} risk</span>
            <div style={{ textAlign: 'right', fontSize: 12, color: 'hsl(var(--text-4))', marginLeft: 12 }}>
              <div>Last Active: {formatDate(agent.lastActive)}</div>
            </div>
            {(isShadow || agent.risk === 'critical' || agent.risk === 'high') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowKillSwitch(true)}
                style={{ marginLeft: 8, background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-br))', color: 'hsl(var(--s-er-tx))' }}
              >
                <Skull size={14} style={{ marginRight: 6 }} /> Kill Switch
              </Button>
            )}
          </div>
        }
      />

      {isShadow && (
        <div style={{ marginBottom: 20, padding: 14, border: '1px solid hsl(var(--s-er-br))', background: 'hsl(var(--s-er-bg))', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Warning size={18} style={{ color: 'hsl(var(--s-er-tx))', flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: 'hsl(var(--s-er-tx))', margin: 0, lineHeight: 1.5 }}>
            <strong>Shadow AI Alert:</strong> This agent has not been registered or approved. It is operating outside governance controls and may be exfiltrating data.
          </p>
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
          <TabsTrigger value="iam">IAM & Permissions</TabsTrigger>
          <TabsTrigger value="topology">Topology</TabsTrigger>
          <TabsTrigger value="data">Data Access</TabsTrigger>
          <TabsTrigger value="activity">Activity Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'Type', value: agent.type },
              { label: 'Base Model', value: agent.model },
              { label: 'Owner', value: agent.owner },
              { label: 'Department', value: agent.department },
            ].map(item => (
              <Card key={item.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <div style={{ padding: 12 }}>
                  <p style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>{item.label}</p>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--text-1))' }}>{item.value}</p>
                </div>
              </Card>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <div style={{ padding: 12 }}>
                <p style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>API Calls (7d)</p>
                <p style={{ fontSize: 24, fontWeight: 700, color: 'hsl(var(--brand))' }}>{formatNumber(agent.apiCalls7d)}</p>
              </div>
            </Card>
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <div style={{ padding: 12 }}>
                <p style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>First Seen</p>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--text-1))' }}>{formatDate(agent.firstSeen)}</p>
              </div>
            </Card>
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <div style={{ padding: 12 }}>
                <p style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>Last Active</p>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--text-1))' }}>{formatDate(agent.lastActive)}</p>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="risk" className="space-y-3 mt-4">
          <p style={{ fontSize: 12, color: 'hsl(var(--text-4))', marginBottom: 8 }}>Risk factors identified for {agent.name}</p>
          {riskItems.map((item, i) => (
            <Card key={i} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <div style={{ padding: 14, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--text-1))' }}>{item.category}</p>
                  <p style={{ fontSize: 12, color: 'hsl(var(--text-3))', marginTop: 4, lineHeight: 1.5 }}>{item.description}</p>
                </div>
                <span style={{ padding: '2px 8px', fontSize: 11, fontWeight: 600, flexShrink: 0, ...riskLevelStyle(item.level) }}>{item.level}</span>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="iam" className="mt-4">
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Key size={16} style={{ color: 'hsl(var(--brand))' }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-1))', margin: 0 }}>IAM Permission Matrix — {agent.id}</p>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      {['Resource', 'Read', 'Write', 'Execute', 'Admin'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Resource' ? 'left' : 'center', borderBottom: '1px solid hsl(var(--border))', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--text-4))' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {IAM_PERMISSIONS.map(row => {
                      const override = isShadow && (row.resource === 'Customer PII' || row.resource === 'Training Data');
                      return (
                        <tr key={row.resource} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 500, color: 'hsl(var(--text-1))' }}>
                            {row.resource}
                            {override && <span style={{ marginLeft: 6, fontSize: 10, color: 'hsl(var(--s-er-tx))', fontWeight: 600 }}>VIOLATED</span>}
                          </td>
                          {(['read', 'write', 'execute', 'admin'] as const).map(perm => {
                            const val = override ? true : row[perm];
                            return (
                              <td key={perm} style={{ padding: '8px 12px', textAlign: 'center' }}>
                                {val ? (
                                  <span style={{ fontSize: 14, color: override ? 'hsl(var(--s-er-tx))' : 'hsl(var(--s-ok-tx))' }}>●</span>
                                ) : (
                                  <span style={{ fontSize: 14, color: 'hsl(var(--border))' }}>○</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 16, fontSize: 11, color: 'hsl(var(--text-4))' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: 'hsl(var(--s-ok-tx))' }}>●</span> Authorized
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: 'hsl(var(--border))' }}>○</span> Not authorized
                </span>
                {isShadow && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ color: 'hsl(var(--s-er-tx))' }}>●</span> Unauthorized access detected
                  </span>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="topology" className="mt-4">
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Network size={16} style={{ color: 'hsl(var(--brand))' }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-1))', margin: 0 }}>Agent Communication Topology</p>
              </div>
              <AgentTopology agent={agent} />
              {isShadow && (
                <div style={{ marginTop: 12, padding: 10, background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-br))' }}>
                  <p style={{ fontSize: 12, color: 'hsl(var(--s-er-tx))', margin: 0 }}>
                    ⚠ Shadow agent detected communicating with external APIs outside authorized network boundaries.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="mt-4">
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <div style={{ padding: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--text-1))', marginBottom: 12 }}>Authorized Data Access</p>
              {agent.dataAccess.map(d => (
                <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: `1px solid ${isShadow ? 'hsl(var(--s-er-br))' : 'hsl(var(--border))'}`, background: isShadow ? 'hsl(var(--s-er-bg))' : 'hsl(var(--bg-muted))', marginBottom: 6 }}>
                  <Database size={13} style={{ color: isShadow ? 'hsl(var(--s-er-tx))' : 'hsl(var(--brand))', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'hsl(var(--text-1))' }}>{d}</span>
                  {isShadow && <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: 'hsl(var(--s-er-tx))', border: '1px solid hsl(var(--s-er-br))', padding: '1px 6px' }}>UNAUTHORIZED</span>}
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <div style={{ padding: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--text-1))', marginBottom: 16 }}>Activity Timeline</p>
              {timeline.map((event, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 10, height: 10, marginTop: 2, flexShrink: 0, borderRadius: '50%', background: event.type === 'error' ? 'hsl(var(--s-er-tx))' : event.type === 'warning' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--brand))' }} />
                    {i < timeline.length - 1 && <div style={{ width: 1, flex: 1, marginTop: 4, background: 'hsl(var(--border))' }} />}
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>{formatDate(event.date)}</p>
                    <p style={{ fontSize: 13, color: event.type === 'error' ? 'hsl(var(--s-er-tx))' : event.type === 'warning' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-1))', lineHeight: 1.4 }}>{event.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {showKillSwitch && <KillSwitchModal agent={agent} onClose={() => setShowKillSwitch(false)} />}
    </div>
  );
}
