import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Robot, ShieldSlash, Clock, Database, ChartLine, Warning } from '@phosphor-icons/react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
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

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const orgName = useSettingsStore(s => s.orgName);

  const agent = AGENTS.find(a => a.id === id);

  if (!agent) {
    return (
      <div className="p-6">
        <Button variant="outline" onClick={() => navigate('/agents')} className="gap-2 mb-4">
          <ArrowLeft size={16} /> Back to Agents
        </Button>
        <div className="text-[hsl(var(--text-4))]">Agent not found: {id}</div>
      </div>
    );
  }

  const isShadow = agent.status === 'shadow';
  const sc = statusColor(agent.status);
  const rc = severityColor(agent.risk);
  const riskItems = riskAssessmentData[agent.id] || riskAssessmentData['AGT-001'];
  const timeline = isShadow ? activityTimeline['shadow'] : activityTimeline['default'];

  const riskLevelColor: Record<string, string> = {
    critical: 'text-red-400 bg-red-900/20 border-red-700',
    high: 'text-orange-400 bg-orange-900/20 border-orange-700',
    medium: 'text-yellow-400 bg-yellow-900/20 border-yellow-700',
    low: 'text-green-400 bg-green-900/20 border-green-700',
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <Button variant="outline" onClick={() => navigate('/agents')} className="gap-2 mb-4">
          <ArrowLeft size={16} /> Back to Agents
        </Button>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2 border ${isShadow ? 'bg-red-900/30 border-red-700' : 'bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]'}`}>
              {isShadow ? <ShieldSlash size={24} className="text-red-400" /> : <Robot size={24} className="text-[hsl(var(--brand))]" />}
            </div>
            <div>
              <h1 className={`text-xl font-semibold ${isShadow ? 'text-red-300' : 'text-[hsl(var(--text-1))]'}`}>{agent.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-xs text-[hsl(var(--text-4))]">{agent.id}</span>
                <span className="px-2 py-0.5 text-xs" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>{agent.status}</span>
                <span className="px-2 py-0.5 text-xs" style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}` }}>{agent.risk} risk</span>
              </div>
              <p className="text-sm text-[hsl(var(--text-4))] mt-1">{agent.description}</p>
            </div>
          </div>
          <div className="text-right text-xs text-[hsl(var(--text-4))]">
            <div>Last Active: {formatDate(agent.lastActive)}</div>
            <div className="mt-0.5">API Calls 7d: {formatNumber(agent.apiCalls7d)}</div>
          </div>
        </div>
      </div>

      {isShadow && (
        <div className="border border-red-700 bg-red-950/30 p-4 flex items-center gap-3">
          <Warning size={20} className="text-red-400 shrink-0" />
          <div className="text-sm text-red-300">
            <strong>Shadow AI Alert:</strong> This agent has not been registered or approved. It is operating outside governance controls and may be exfiltrating data.
          </div>
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
          <TabsTrigger value="data">Data Access</TabsTrigger>
          <TabsTrigger value="activity">Activity Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-xs text-[hsl(var(--text-4))]">Type</div>
              <div className="text-sm font-medium text-[hsl(var(--text-1))] mt-1">{agent.type}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-[hsl(var(--text-4))]">Base Model</div>
              <div className="text-sm font-medium text-[hsl(var(--text-1))] mt-1">{agent.model}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-[hsl(var(--text-4))]">Owner</div>
              <div className="text-sm font-medium text-[hsl(var(--text-1))] mt-1">{agent.owner}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-[hsl(var(--text-4))]">Department</div>
              <div className="text-sm font-medium text-[hsl(var(--text-1))] mt-1">{agent.department}</div>
            </Card>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="text-xs text-[hsl(var(--text-4))] mb-1">API Calls (7d)</div>
              <div className="text-2xl font-bold text-[hsl(var(--brand))]">{formatNumber(agent.apiCalls7d)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-[hsl(var(--text-4))] mb-1">First Seen</div>
              <div className="text-sm font-medium text-[hsl(var(--text-1))]">{formatDate(agent.firstSeen)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-[hsl(var(--text-4))] mb-1">Last Active</div>
              <div className="text-sm font-medium text-[hsl(var(--text-1))]">{formatDate(agent.lastActive)}</div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="risk" className="space-y-3 mt-4">
          <div className="text-sm text-[hsl(var(--text-4))] mb-2">Risk factors identified for {agent.name}</div>
          {riskItems.map((item, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium text-[hsl(var(--text-1))]">{item.category}</div>
                  <div className="text-sm text-[hsl(var(--text-3))] mt-1">{item.description}</div>
                </div>
                <span className={`px-2 py-0.5 text-xs border ${riskLevelColor[item.level]}`}>{item.level}</span>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="data" className="mt-4">
          <Card className="p-4">
            <div className="text-sm font-medium text-[hsl(var(--text-1))] mb-3">Authorized Data Access</div>
            <div className="space-y-2">
              {agent.dataAccess.map(d => (
                <div key={d} className={`flex items-center gap-3 p-3 border ${isShadow ? 'border-red-800 bg-red-950/10' : 'border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))]'}`}>
                  <Database size={14} className={isShadow ? 'text-red-400' : 'text-[hsl(var(--brand))]'} />
                  <span className="text-sm text-[hsl(var(--text-1))]">{d}</span>
                  {isShadow && <span className="ml-auto text-xs text-red-400 border border-red-700 px-1.5 py-0.5">unauthorized</span>}
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card className="p-4">
            <div className="text-sm font-medium text-[hsl(var(--text-1))] mb-4">Activity Timeline</div>
            <div className="space-y-3">
              {timeline.map((event, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-2.5 h-2.5 mt-0.5 border-2 ${event.type === 'error' ? 'border-red-500 bg-red-900/30' : event.type === 'warning' ? 'border-yellow-500 bg-yellow-900/30' : 'border-[hsl(var(--brand))] bg-[hsl(var(--brand))/20]'}`} />
                    {i < timeline.length - 1 && <div className="w-px flex-1 mt-1 bg-[hsl(var(--border))]" />}
                  </div>
                  <div className="pb-4">
                    <div className="text-xs text-[hsl(var(--text-4))] mb-0.5">{formatDate(event.date)}</div>
                    <div className={`text-sm ${event.type === 'error' ? 'text-red-300' : event.type === 'warning' ? 'text-yellow-300' : 'text-[hsl(var(--text-1))]'}`}>
                      {event.event}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
