import { useState, useCallback } from 'react';
import {
  Eye, MagnifyingGlass, Export, Funnel, Wrench, Lightning,
  ArrowCounterClockwise, Warning, CheckCircle,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ToolCall {
  id: string; timestamp: string; agent: string; tool: string;
  args: string; result: 'success' | 'error' | 'timeout' | 'blocked';
  latencyMs: number; output: string; error?: string; traceId?: string;
  authCheck?: string; isIdempotent?: boolean;
}

interface AuthRule {
  agent: string; tool: string; permission: 'allowed' | 'blocked' | 'conditional';
  condition?: string;
}

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

// ── Data ──────────────────────────────────────────────────────────────────────

const TOOL_CALLS: ToolCall[] = [
  {
    id: 'TC-001', timestamp: '2026-04-05T14:23:01.234Z', agent: 'ComplianceBot',
    tool: 'search_policy_database',
    args: '{\n  "query": "EU AI Act Article 11",\n  "scope": "active",\n  "limit": 10\n}',
    result: 'success', latencyMs: 142, traceId: 'TR-001',
    output: 'Found 3 matching policy documents: POL-001 (AI Acceptable Use), POL-005 (EU AI Act Framework), POL-010 (Model Documentation Standard).',
    authCheck: 'Authorized — ComplianceBot has read access to policy_database', isIdempotent: true,
  },
  {
    id: 'TC-002', timestamp: '2026-04-05T14:22:58.891Z', agent: 'LoanAssistant',
    tool: 'get_customer_profile',
    args: '{\n  "customer_id": "CUST-4892",\n  "fields": ["credit_score", "income", "ssn"]\n}',
    result: 'blocked', latencyMs: 8, traceId: 'TR-002',
    output: '[BLOCKED — PII guardrail: fields array contains "ssn" — unauthorized PII field access]',
    authCheck: 'BLOCKED — LoanAssistant not authorized to access ssn field for CUST-* records', isIdempotent: true,
  },
  {
    id: 'TC-003', timestamp: '2026-04-05T14:22:55.100Z', agent: 'RiskAnalyzer',
    tool: 'fetch_vendor_risk_score',
    args: '{\n  "vendor_id": "V-006",\n  "framework": "ISO27001",\n  "include_subitems": true\n}',
    result: 'success', latencyMs: 312, traceId: 'TR-011',
    output: 'Vendor V-006 (Pinecone) risk score: 61/100. Status: in_review. Critical gaps: expired SOC 2, pending DPA.',
    authCheck: 'Authorized — RiskAnalyzer has read access to vendor_risk_scores', isIdempotent: true,
  },
  {
    id: 'TC-004', timestamp: '2026-04-05T14:22:50.445Z', agent: 'DataLabeler-v2',
    tool: 'write_label_store',
    args: '{\n  "batch_id": "DS-0044",\n  "records": [...500 records],\n  "overwrite": false\n}',
    result: 'timeout', latencyMs: 30000,
    output: '[TIMEOUT — write_label_store exceeded 30s SLA — partial write state unknown]',
    error: 'Database connection pool exhausted after 30000ms. Rollback state: UNKNOWN — 500 records may be partially written.',
    authCheck: 'Authorized — DataLabeler-v2 has write access to label_store (batch mode)',
  },
  {
    id: 'TC-005', timestamp: '2026-04-05T14:22:45.200Z', agent: 'AuditLog-Streamer',
    tool: 'stream_to_siem',
    args: '{\n  "events": [...12 entries],\n  "destination": "splunk://siem.internal:8088",\n  "priority": "high"\n}',
    result: 'success', latencyMs: 45, traceId: 'TR-006',
    output: '12 audit events streamed to SIEM (Splunk) successfully. Event IDs: AE-0041 through AE-0052.',
    authCheck: 'Authorized — AuditLog-Streamer has stream access to siem.internal',
  },
  {
    id: 'TC-006', timestamp: '2026-04-05T14:22:40.100Z', agent: 'VendorRisk-Scanner',
    tool: 'run_vendor_questionnaire',
    args: '{\n  "vendor_id": "V-004",\n  "template": "ISO27001_v2",\n  "notify_vendor": true\n}',
    result: 'error', latencyMs: 890,
    output: '[ERROR — Vendor portal API returned 502 Bad Gateway — questionnaire not sent]',
    error: 'Remote endpoint https://vendor-portal.api/v1/questionnaire returned 502 Bad Gateway. DPA for V-004 (Pinecone) remains in "In Review" state.',
    authCheck: 'Authorized — VendorRisk-Scanner has invoke access to vendor_questionnaire',
  },
  {
    id: 'TC-007', timestamp: '2026-04-05T13:55:20.000Z', agent: 'ComplianceBot',
    tool: 'search_policy_database',
    args: '{\n  "query": "SOC 2 CC6.1 access controls",\n  "scope": "controls",\n  "limit": 20\n}',
    result: 'success', latencyMs: 198, traceId: 'TR-019',
    output: 'Found 8 controls matching SOC 2 CC6.1: CTRL-001, CTRL-007, CTRL-008, CTRL-010, CTRL-011 and 3 more.',
    authCheck: 'Authorized — read access confirmed', isIdempotent: true,
  },
  {
    id: 'TC-008', timestamp: '2026-04-05T13:30:10.000Z', agent: 'RiskAnalyzer',
    tool: 'fetch_vendor_risk_score',
    args: '{\n  "vendor_id": "V-012",\n  "framework": "GDPR",\n  "include_dpa_status": true\n}',
    result: 'success', latencyMs: 287,
    output: 'Vendor V-012 GDPR risk: HIGH. DPA status: Missing. Sub-processors: undisclosed. Recommendation: Do not proceed.',
    authCheck: 'Authorized — read access confirmed', isIdempotent: true,
  },
  {
    id: 'TC-009', timestamp: '2026-04-05T12:48:50.000Z', agent: 'FraudAlert-Watcher',
    tool: 'get_customer_profile',
    args: '{\n  "customer_id": "CUST-7712",\n  "fields": ["account_balance", "transaction_history"]\n}',
    result: 'blocked', latencyMs: 6,
    output: '[BLOCKED — FraudAlert-Watcher not in authorized agent list for get_customer_profile]',
    authCheck: 'BLOCKED — Authorization matrix does not include FraudAlert-Watcher for customer_profile access', isIdempotent: true,
  },
  {
    id: 'TC-010', timestamp: '2026-04-05T11:20:40.000Z', agent: 'AuditLog-Streamer',
    tool: 'stream_to_siem',
    args: '{\n  "events": [...48 entries],\n  "destination": "splunk://siem.internal:8088",\n  "batch_mode": true\n}',
    result: 'success', latencyMs: 78, traceId: 'TR-015',
    output: '48 audit events streamed to SIEM in batch mode. Batch ID: AE-BATCH-0012.',
    authCheck: 'Authorized — stream access confirmed',
  },
  {
    id: 'TC-011', timestamp: '2026-04-05T10:15:20.000Z', agent: 'LoanAssistant',
    tool: 'search_policy_database',
    args: '{\n  "query": "loan approval eligibility criteria 2026",\n  "scope": "policies",\n  "limit": 5\n}',
    result: 'success', latencyMs: 167,
    output: 'Found 3 policies: POL-001 (AI Acceptable Use), POL-003 (Data Privacy), POL-009 (Human Oversight). Key: All loan decisions require human oversight per Art. 14.',
    authCheck: 'Authorized — read access confirmed', isIdempotent: true,
  },
  {
    id: 'TC-012', timestamp: '2026-04-05T09:45:00.000Z', agent: 'DataLabeler-v2',
    tool: 'write_label_store',
    args: '{\n  "batch_id": "DS-0043",\n  "records": [...200 records],\n  "overwrite": false\n}',
    result: 'success', latencyMs: 8900,
    output: '200 records successfully written to label_store. Batch DS-0043 committed. Avg confidence: 0.94.',
    authCheck: 'Authorized — write access confirmed',
  },
];

// Authorization Matrix data
const AUTH_MATRIX: AuthRule[] = [
  { agent: 'ComplianceBot', tool: 'search_policy_database', permission: 'allowed' },
  { agent: 'ComplianceBot', tool: 'get_customer_profile', permission: 'blocked' },
  { agent: 'ComplianceBot', tool: 'fetch_vendor_risk_score', permission: 'allowed' },
  { agent: 'ComplianceBot', tool: 'write_label_store', permission: 'blocked' },
  { agent: 'ComplianceBot', tool: 'stream_to_siem', permission: 'conditional', condition: 'Read-only audit events' },
  { agent: 'ComplianceBot', tool: 'run_vendor_questionnaire', permission: 'blocked' },
  { agent: 'LoanAssistant', tool: 'search_policy_database', permission: 'allowed' },
  { agent: 'LoanAssistant', tool: 'get_customer_profile', permission: 'conditional', condition: 'Non-PII fields only (no ssn, dob)' },
  { agent: 'LoanAssistant', tool: 'fetch_vendor_risk_score', permission: 'blocked' },
  { agent: 'LoanAssistant', tool: 'write_label_store', permission: 'blocked' },
  { agent: 'LoanAssistant', tool: 'stream_to_siem', permission: 'blocked' },
  { agent: 'LoanAssistant', tool: 'run_vendor_questionnaire', permission: 'blocked' },
  { agent: 'RiskAnalyzer', tool: 'search_policy_database', permission: 'allowed' },
  { agent: 'RiskAnalyzer', tool: 'get_customer_profile', permission: 'blocked' },
  { agent: 'RiskAnalyzer', tool: 'fetch_vendor_risk_score', permission: 'allowed' },
  { agent: 'RiskAnalyzer', tool: 'write_label_store', permission: 'blocked' },
  { agent: 'RiskAnalyzer', tool: 'stream_to_siem', permission: 'blocked' },
  { agent: 'RiskAnalyzer', tool: 'run_vendor_questionnaire', permission: 'conditional', condition: 'Read-only questionnaire templates' },
  { agent: 'DataLabeler-v2', tool: 'search_policy_database', permission: 'allowed' },
  { agent: 'DataLabeler-v2', tool: 'get_customer_profile', permission: 'blocked' },
  { agent: 'DataLabeler-v2', tool: 'fetch_vendor_risk_score', permission: 'blocked' },
  { agent: 'DataLabeler-v2', tool: 'write_label_store', permission: 'allowed' },
  { agent: 'DataLabeler-v2', tool: 'stream_to_siem', permission: 'blocked' },
  { agent: 'DataLabeler-v2', tool: 'run_vendor_questionnaire', permission: 'blocked' },
  { agent: 'FraudAlert-Watcher', tool: 'search_policy_database', permission: 'blocked' },
  { agent: 'FraudAlert-Watcher', tool: 'get_customer_profile', permission: 'blocked' },
  { agent: 'FraudAlert-Watcher', tool: 'fetch_vendor_risk_score', permission: 'blocked' },
  { agent: 'FraudAlert-Watcher', tool: 'write_label_store', permission: 'blocked' },
  { agent: 'FraudAlert-Watcher', tool: 'stream_to_siem', permission: 'conditional', condition: 'Fraud alerts only' },
  { agent: 'FraudAlert-Watcher', tool: 'run_vendor_questionnaire', permission: 'blocked' },
];

const AUTH_AGENTS = [...new Set(AUTH_MATRIX.map(r => r.agent))];
const AUTH_TOOLS = [...new Set(AUTH_MATRIX.map(r => r.tool))];

const IDEMPOTENT_TOOLS = ['search_policy_database', 'get_customer_profile', 'fetch_vendor_risk_score'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function resultBadge(result: ToolCall['result']) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    success: { bg: 'hsl(142 71% 45% / 0.15)', color: 'hsl(var(--s-ok-tx))', label: 'Success' },
    error: { bg: 'hsl(0 72% 51% / 0.15)', color: 'hsl(var(--destructive))', label: 'Error' },
    timeout: { bg: 'hsl(25 95% 53% / 0.15)', color: 'hsl(var(--s-wn-tx))', label: 'Timeout' },
    blocked: { bg: 'hsl(45 93% 47% / 0.15)', color: 'hsl(var(--s-wn-tx))', label: 'Blocked' },
  };
  const s = map[result] ?? map.success;
  return <Badge style={{ background: s.bg, color: s.color, borderRadius: 0, fontSize: 11 }}>{s.label}</Badge>;
}

function permBadge(p: AuthRule['permission']) {
  if (p === 'allowed') return <Badge style={{ background: 'hsl(142 71% 45% / 0.15)', color: 'hsl(var(--s-ok-tx))', borderRadius: 0, fontSize: 10 }}>Allowed</Badge>;
  if (p === 'blocked') return <Badge style={{ background: 'hsl(0 72% 51% / 0.15)', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 10 }}>Blocked</Badge>;
  return <Badge style={{ background: 'hsl(45 93% 47% / 0.15)', color: 'hsl(var(--s-wn-tx))', borderRadius: 0, fontSize: 10 }}>Conditional</Badge>;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ToolCallMonitor() {
  const { orgName } = useSettingsStore();
  useChartTheme();
  const [calls, setCalls] = useState<ToolCall[]>(TOOL_CALLS);
  const [authMatrix, setAuthMatrix] = useState<AuthRule[]>(AUTH_MATRIX);
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [toolFilter, setToolFilter] = useState('all');
  const [viewItem, setViewItem] = useState<ToolCall | null>(null);
  const [activeTab, setActiveTab] = useState('calls');
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const toast = useCallback((text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const agents = ['all', ...Array.from(new Set(calls.map(c => c.agent)))];
  const tools = ['all', ...Array.from(new Set(calls.map(c => c.tool)))];

  const filtered = calls.filter(c => {
    const matchSearch = c.agent.toLowerCase().includes(search.toLowerCase()) ||
      c.tool.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.result.toLowerCase().includes(search.toLowerCase());
    const matchResult = resultFilter === 'all' || c.result === resultFilter;
    const matchAgent = agentFilter === 'all' || c.agent === agentFilter;
    const matchTool = toolFilter === 'all' || c.tool === toolFilter;
    return matchSearch && matchResult && matchAgent && matchTool;
  });

  const successCount = calls.filter(c => c.result === 'success').length;
  const errorCount = calls.filter(c => c.result === 'error').length;
  const timeoutCount = calls.filter(c => c.result === 'timeout').length;
  const blockedCount = calls.filter(c => c.result === 'blocked').length;
  const successRate = Math.round((successCount / calls.length) * 100);
  // Exclude timeout from avg latency for healthy calls
  const healthyCalls = calls.filter(c => c.result !== 'timeout');
  const avgLatencyHealthy = Math.round(healthyCalls.reduce((s, c) => s + c.latencyMs, 0) / healthyCalls.length);

  const togglePerm = (agent: string, tool: string) => {
    setAuthMatrix(prev => prev.map(r => {
      if (r.agent === agent && r.tool === tool) {
        const next: AuthRule['permission'] = r.permission === 'allowed' ? 'blocked' : r.permission === 'blocked' ? 'conditional' : 'allowed';
        toast(`${agent} → ${tool}: ${r.permission} → ${next}`);
        return { ...r, permission: next };
      }
      return r;
    }));
  };

  const handleRetry = (c: ToolCall) => {
    if (!IDEMPOTENT_TOOLS.includes(c.tool)) {
      toast(`${c.tool} is not idempotent — retry not available`, 'error');
      return;
    }
    toast(`Retrying ${c.id} — ${c.tool}...`);
    setTimeout(() => toast(`${c.id} retry completed — Success (simulated)`), 1500);
  };

  const handleEscalate = (c: ToolCall) => {
    const incId = `INC-${String(Math.floor(Math.random() * 900) + 100)}`;
    toast(`Incident ${incId} created from ${c.id} — ${c.result.toUpperCase()} on ${c.tool}`, 'info');
  };

  const handleExport = () => {
    const csv = [
      ['ID', 'Timestamp', 'Agent', 'Tool', 'Result', 'Latency(ms)', 'TraceID', 'Authorized', 'Idempotent'].join(','),
      ...calls.map(c => [c.id, c.timestamp, c.agent, c.tool, c.result, c.latencyMs, c.traceId || '—',
        c.result === 'blocked' ? 'NO' : 'YES', IDEMPOTENT_TOOLS.includes(c.tool) ? 'YES' : 'NO'].join(','))
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `tool-calls-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast('Tool call log exported');
  };

  const getPermission = (agent: string, tool: string): AuthRule['permission'] => {
    const rule = authMatrix.find(r => r.agent === agent && r.tool === tool);
    return rule?.permission || 'blocked';
  };

  return (
    <div className="space-y-6">

      {/* Toast layer */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="px-4 py-2 text-sm font-medium shadow-lg pointer-events-auto" style={{
            background: t.type === 'success' ? 'hsl(var(--s-ok-tx))' : t.type === 'error' ? 'hsl(var(--destructive))' : 'hsl(var(--s-in-tx))',
            color: '#fff', borderRadius: 0, minWidth: 300
          }}>{t.text}</div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Tool Call Monitor</h1>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>{orgName} · Agent tool invocation tracking & authorization</p>
        </div>
        <Button variant="outline" onClick={handleExport} style={{ borderRadius: 0 }}>
          <Export className="h-4 w-4 mr-2" />Export CSV
        </Button>
      </div>

      {/* TC-002 GDPR Alert Banner */}
      <div className="flex items-start gap-3 px-4 py-3" style={{ background: 'hsl(0 72% 51% / 0.08)', border: '1px solid hsl(0 72% 51% / 0.5)', borderRadius: 0 }}>
        <Warning size={16} className="mt-0.5 shrink-0 text-destructive" />
        <div>
          <p className="text-sm font-semibold text-destructive">GDPR Alert: TC-002 — Unauthorized PII Access Attempt</p>
          <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>
            LoanAssistant attempted to access customer_id CUST-4892 with PII fields (ssn, income). Blocked by guardrail. No incident created — requires immediate GDPR Art. 33 incident report.
          </p>
        </div>
      </div>

      {/* Stats — separate timeout from error */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Calls', value: calls.length, color: 'hsl(var(--text-1))' },
          { label: 'Success Rate', value: `${successRate}%`, color: 'hsl(var(--s-ok-tx))' },
          { label: 'Errors', value: errorCount, color: 'hsl(var(--destructive))', sub: 'Integration failures' },
          { label: 'Timeouts', value: timeoutCount, color: 'hsl(var(--s-wn-tx))', sub: 'SLA violations' },
          { label: 'Blocked', value: blockedCount, color: 'hsl(var(--s-wn-tx))', sub: 'Auth denied' },
        ].map(stat => (
          <Card key={stat.label} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>{stat.label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
              {'sub' in stat && <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{(stat as { sub: string }).sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-4">
        <div className="px-3 py-2" style={{ border: '1px solid hsl(var(--border))' }}>
          <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Avg Latency (excl. timeouts)</p>
          <p className="text-sm font-bold mt-0.5" style={{ color: avgLatencyHealthy > 500 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-ok-tx))' }}>
            {avgLatencyHealthy}ms
          </p>
        </div>
        <div className="px-3 py-2" style={{ border: '1px solid hsl(var(--border))' }}>
          <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Idempotent Calls</p>
          <p className="text-sm font-bold mt-0.5 text-green-600 dark:text-green-400">
            {calls.filter(c => IDEMPOTENT_TOOLS.includes(c.tool)).length} (retryable)
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <TabsTrigger value="calls" style={{ borderRadius: 0 }}>Tool Calls ({calls.length})</TabsTrigger>
          <TabsTrigger value="matrix" style={{ borderRadius: 0 }}>Authorization Matrix</TabsTrigger>
        </TabsList>

        {/* Tool Calls Tab */}
        <TabsContent value="calls" className="mt-4">
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <div className="relative min-w-52 max-w-xs">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'hsl(var(--text-4))' }} />
              <Input placeholder="Search tool calls..." value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9" style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }} />
            </div>
            <Select value={resultFilter} onValueChange={setResultFilter}>
              <SelectTrigger className="w-36 h-9" style={{ borderRadius: 0 }}>
                <Funnel className="h-3 w-3 mr-1" /><SelectValue />
              </SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                <SelectItem value="all">All Results</SelectItem>
                {['success', 'blocked', 'timeout', 'error'].map(r => (
                  <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="w-44 h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {agents.map(a => <SelectItem key={a} value={a}>{a === 'all' ? 'All Agents' : a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={toolFilter} onValueChange={setToolFilter}>
              <SelectTrigger className="w-52 h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {tools.map(t => <SelectItem key={t} value={t}>{t === 'all' ? 'All Tools' : t}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{filtered.length} calls</span>
          </div>

          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12" style={{ color: 'hsl(var(--text-4))' }}>
                  <Wrench size={32} className="mb-2 opacity-40" />
                  <p className="text-sm">No tool calls match your filters</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                        {['ID', 'Time', 'Agent', 'Tool', 'Args Preview', 'Result', 'Latency', 'Trace', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(c => (
                        <tr key={c.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs" style={{ color: 'hsl(var(--text-4))' }}>{c.id}</td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{timeAgo(c.timestamp)}</td>
                          <td className="px-4 py-3 font-medium text-xs" style={{ color: 'hsl(var(--text-1))' }}>{c.agent}</td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs px-2 py-0.5" style={{ background: 'hsl(var(--brand) / 0.1)', color: 'hsl(var(--brand))', borderRadius: 0 }}>
                              {c.tool}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-48">
                            <span className="text-xs font-mono line-clamp-1" style={{ color: 'hsl(var(--text-4))' }}>
                              {c.args.split('\n')[0].slice(0, 50)}...
                            </span>
                          </td>
                          <td className="px-4 py-3">{resultBadge(c.result)}</td>
                          <td className="px-4 py-3 font-mono text-xs" style={{ color: c.result === 'timeout' ? 'hsl(var(--s-wn-tx))' : c.latencyMs > 1000 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-ok-tx))' }}>
                            {c.latencyMs >= 1000 ? `${(c.latencyMs / 1000).toFixed(1)}s` : `${c.latencyMs}ms`}
                          </td>
                          <td className="px-4 py-3">
                            {c.traceId ? <span className="font-mono text-xs text-blue-600 dark:text-blue-400">{c.traceId}</span> : <span style={{ color: 'hsl(var(--text-4))' }}>—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setViewItem(c)}>
                                <Eye size={14} />
                              </Button>
                              {(c.result === 'error' || c.result === 'timeout') && IDEMPOTENT_TOOLS.includes(c.tool) && (
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-green-600 dark:text-green-400"
                                  onClick={() => handleRetry(c)}>
                                  <ArrowCounterClockwise size={12} className="mr-1" />Retry
                                </Button>
                              )}
                              {(c.result === 'blocked' || c.result === 'error') && (
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive"
                                  onClick={() => handleEscalate(c)}>
                                  <Lightning size={12} className="mr-1" />Escalate
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Authorization Matrix Tab */}
        <TabsContent value="matrix" className="mt-4">
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Agent × Tool Authorization Matrix</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Agent</th>
                      {AUTH_TOOLS.map(t => (
                        <th key={t} className="px-3 py-3 text-center text-xs font-semibold" style={{ color: 'hsl(var(--text-4))', minWidth: 120 }}>
                          <span className="font-mono" style={{ color: 'hsl(var(--brand))' }}>{t.replace('_', ' ')}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {AUTH_AGENTS.map(agent => (
                      <tr key={agent} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium text-xs" style={{ color: 'hsl(var(--text-1))' }}>{agent}</td>
                        {AUTH_TOOLS.map(tool => {
                          const perm = getPermission(agent, tool);
                          return (
                            <td key={tool} className="px-3 py-3 text-center">
                              <div className="flex flex-col items-center gap-1">
                                {permBadge(perm)}
                                <Switch
                                  checked={perm === 'allowed'}
                                  onCheckedChange={() => togglePerm(agent, tool)}
                                  className="scale-75"
                                />
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs px-4 pb-3 pt-2" style={{ color: 'hsl(var(--text-4))' }}>
                Toggle switches to update permissions. Changes create an audit log entry. Conditional = requires approval for each use.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Sheet */}
      <Sheet open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <SheetContent style={{ borderRadius: 0, width: 560 }}>
          <SheetHeader><SheetTitle>Tool Call Detail — {viewItem?.id}</SheetTitle></SheetHeader>
          {viewItem && (
            <div className="mt-6 space-y-4 text-sm overflow-y-auto h-[calc(100vh-100px)]">
              <div className="flex gap-2 flex-wrap">
                {resultBadge(viewItem.result)}
                {viewItem.isIdempotent && <Badge style={{ background: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))', borderRadius: 0, fontSize: 10 }}>Idempotent (retryable)</Badge>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>ID</p><p className="font-mono">{viewItem.id}</p></div>
                <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Timestamp</p><p className="text-xs">{new Date(viewItem.timestamp).toLocaleString()}</p></div>
                <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Agent</p><p className="font-medium">{viewItem.agent}</p></div>
                <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Latency</p>
                  <span className="font-mono" style={{ color: viewItem.result === 'timeout' ? 'hsl(var(--s-wn-tx))' : viewItem.latencyMs > 1000 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-ok-tx))' }}>
                    {viewItem.latencyMs >= 1000 ? `${(viewItem.latencyMs / 1000).toFixed(1)}s` : `${viewItem.latencyMs}ms`}
                  </span>
                </div>
              </div>

              <div><p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Tool</p>
                <span className="font-mono text-xs px-2 py-1 inline-block" style={{ background: 'hsl(var(--brand) / 0.1)', color: 'hsl(var(--brand))', borderRadius: 0 }}>{viewItem.tool}</span>
              </div>

              <div><p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Full Arguments</p>
                <pre className="p-2 text-xs font-mono overflow-auto" style={{ background: 'hsl(var(--border) / 0.3)', borderRadius: 0, maxHeight: 140, whiteSpace: 'pre-wrap' }}>{viewItem.args}</pre>
              </div>

              <div><p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Output / Response</p>
                <p className="p-2 text-xs" style={{ background: 'hsl(var(--border) / 0.3)', borderRadius: 0, lineHeight: 1.5 }}>{viewItem.output}</p>
              </div>

              {viewItem.error && (
                <div><p className="text-xs font-semibold mb-1 text-destructive">Error Details</p>
                  <p className="p-2 text-xs" style={{ background: 'hsl(0 72% 51% / 0.08)', borderRadius: 0, color: 'hsl(var(--destructive))', lineHeight: 1.5 }}>{viewItem.error}</p>
                </div>
              )}

              {viewItem.authCheck && (
                <div><p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Authorization Check</p>
                  <p className="p-2 text-xs" style={{
                    background: viewItem.result === 'blocked' ? 'hsl(0 72% 51% / 0.08)' : 'hsl(142 71% 45% / 0.08)',
                    borderRadius: 0, lineHeight: 1.5,
                    color: viewItem.result === 'blocked' ? 'hsl(var(--destructive))' : 'hsl(var(--s-ok-tx))'
                  }}>{viewItem.authCheck}</p>
                </div>
              )}

              {viewItem.traceId && (
                <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Linked Trace</p>
                  <Badge style={{ background: 'hsl(220 90% 56% / 0.12)', color: 'hsl(var(--s-in-tx))', borderRadius: 0 }}>{viewItem.traceId}</Badge>
                </div>
              )}

              <div className="flex gap-2 pt-2 flex-wrap">
                {(viewItem.result === 'error' || viewItem.result === 'timeout') && IDEMPOTENT_TOOLS.includes(viewItem.tool) && (
                  <Button size="sm" style={{ borderRadius: 0, background: 'hsl(var(--s-ok-tx))', color: '#fff' }}
                    onClick={() => { handleRetry(viewItem); setViewItem(null); }}>
                    <ArrowCounterClockwise size={14} className="mr-1" />Retry
                  </Button>
                )}
                {(viewItem.result === 'blocked' || viewItem.result === 'error') && (
                  <Button size="sm" variant="outline" style={{ borderRadius: 0, color: 'hsl(var(--destructive))' }}
                    onClick={() => { handleEscalate(viewItem); setViewItem(null); }}>
                    <Lightning size={14} className="mr-1" />Escalate to Incident
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
