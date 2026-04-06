import os

def w(path, content):
    d = os.path.dirname(path)
    if d:
        os.makedirs(d, exist_ok=True)
    with open(path, 'w') as f:
        f.write(content)
    print(f'  wrote {path}')

BASE = '/workspaces/sentinel/dashboard/src'
os.chdir(BASE)

print('=== Phase 2: All remaining fixes ===')

# 1. Breadcrumbs component
w('components/Breadcrumbs.tsx', r"""import { useLocation, Link } from 'react-router-dom';
import { CaretRight, House } from '@phosphor-icons/react';

const ROUTE_TITLES: Record<string, string> = {
  overview: 'Overview', compliance: 'Compliance', 'gap-analysis': 'Gap Analysis',
  controls: 'Controls', evidence: 'Evidence Hub', frameworks: 'Frameworks',
  policies: 'Policies', 'policy-templates': 'Policy Templates',
  risk: 'Risk Register', matrix: 'Risk Matrix', vendors: 'Vendors',
  incidents: 'Incidents', remediation: 'Remediation',
  models: 'Model Inventory', inventory: 'Inventory', lifecycle: 'Lifecycle',
  agents: 'Agent Discovery', 'shadow-ai': 'Shadow AI',
  'trust-engine': 'Trust Engine', guardrails: 'Guardrails',
  traces: 'Live Traces', costs: 'Cost & Tokens',
  fallbacks: 'Fallback Log', tools: 'Tool Calls', config: 'Configuration',
  'access-control': 'Access Control', roles: 'Roles', users: 'Users',
  'audit-log': 'Audit Log', 'evidence-vault': 'Evidence Vault',
  export: 'Export Center', settings: 'Settings', 'ai-advisor': 'AI Advisor',
  reporting: 'Reporting', 'bias-audits': 'Bias Audits', datasets: 'Datasets',
  'reg-radar': 'Reg Radar', hitl: 'HITL Queue', 'evidence-sync': 'Evidence Sync',
  explainability: 'Explainability', conformity: 'Conformity Assessment',
  'incident-workflow': 'Incident Workflow', evals: 'Evaluations', security: 'Security',
};

export default function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;
  return (
    <nav className="flex items-center gap-1 text-sm text-[hsl(var(--text-3))] mb-4">
      <Link to="/overview" className="hover:text-[hsl(var(--text-1))] transition-colors">
        <House size={16} />
      </Link>
      {segments.map((seg, i) => {
        const path = '/' + segments.slice(0, i + 1).join('/');
        const title = ROUTE_TITLES[seg] || seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const isLast = i === segments.length - 1;
        return (
          <span key={path} className="flex items-center gap-1">
            <CaretRight size={12} />
            {isLast ? (
              <span className="text-[hsl(var(--text-1))] font-medium">{title}</span>
            ) : (
              <Link to={path} className="hover:text-[hsl(var(--text-1))] transition-colors">{title}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
""")

print('  Breadcrumbs done')

# 2. P2: Explainability Center
w('pages/ExplainabilityCenter.tsx', r"""import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { MagnifyingGlass, Brain, TreeStructure, ChartBar, Export } from '@phosphor-icons/react';
import Breadcrumbs from '../components/Breadcrumbs';

const EXPLANATIONS = [
  { id: 'EXP-001', model: 'GPT-4o Risk Scorer', method: 'SHAP', status: 'Complete', score: 0.92, date: '2025-01-15' },
  { id: 'EXP-002', model: 'Fraud Detection v3', method: 'LIME', status: 'Running', score: null, date: '2025-01-16' },
  { id: 'EXP-003', model: 'Credit Scoring', method: 'Anchors', status: 'Complete', score: 0.87, date: '2025-01-14' },
  { id: 'EXP-004', model: 'NLP Classifier', method: 'Attention Maps', status: 'Failed', score: null, date: '2025-01-13' },
];

export default function ExplainabilityCenter() {
  const [search, setSearch] = useState('');
  const filtered = EXPLANATIONS.filter(e => e.model.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <Breadcrumbs />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))]">Explainability Center</h1>
          <p className="text-sm text-[hsl(var(--text-3))]">Model decision transparency & interpretability</p>
        </div>
        <Button className="gap-2"><Brain size={16} /> New Explanation Run</Button>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[{ label: 'Total Explanations', value: '47', icon: TreeStructure },
          { label: 'Models Covered', value: '12/15', icon: Brain },
          { label: 'Avg Fidelity', value: '0.89', icon: ChartBar },
          { label: 'Pending Reviews', value: '3', icon: MagnifyingGlass }].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <kpi.icon size={24} className="text-[hsl(var(--accent))]" />
              <div>
                <p className="text-2xl font-bold text-[hsl(var(--text-1))]">{kpi.value}</p>
                <p className="text-xs text-[hsl(var(--text-3))]">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Explanation Runs</CardTitle></CardHeader>
        <CardContent>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search models..." className="w-full mb-4 p-2 border border-[hsl(var(--border))] bg-transparent text-[hsl(var(--text-1))]" />
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[hsl(var(--border))] text-[hsl(var(--text-3))]">
              <th className="text-left p-2">ID</th><th className="text-left p-2">Model</th>
              <th className="text-left p-2">Method</th><th className="text-left p-2">Status</th>
              <th className="text-left p-2">Fidelity</th><th className="text-left p-2">Date</th>
              <th className="text-left p-2">Actions</th>
            </tr></thead>
            <tbody>{filtered.map(e => (
              <tr key={e.id} className="border-b border-[hsl(var(--border))]">
                <td className="p-2 font-mono text-[hsl(var(--text-2))]">{e.id}</td>
                <td className="p-2 text-[hsl(var(--text-1))]">{e.model}</td>
                <td className="p-2"><Badge variant="outline">{e.method}</Badge></td>
                <td className="p-2"><Badge className={e.status === 'Complete' ? 'bg-emerald-500/20 text-emerald-400' : e.status === 'Running' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}>{e.status}</Badge></td>
                <td className="p-2 text-[hsl(var(--text-1))]">{e.score ?? '—'}</td>
                <td className="p-2 text-[hsl(var(--text-3))]">{e.date}</td>
                <td className="p-2"><Button variant="ghost" size="sm"><Export size={14} /></Button></td>
              </tr>
            ))}</tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
""")
print('  ExplainabilityCenter done')

# 3. P2: Conformity Assessment
w('pages/ConformityAssessment.tsx', r"""import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ClipboardText, CheckCircle, Warning, Clock, Plus } from '@phosphor-icons/react';
import Breadcrumbs from '../components/Breadcrumbs';

const ASSESSMENTS = [
  { id: 'CA-001', framework: 'ISO 42001', status: 'In Progress', completion: 72, auditor: 'Internal', due: '2025-02-15' },
  { id: 'CA-002', framework: 'EU AI Act', status: 'Scheduled', completion: 0, auditor: 'Deloitte', due: '2025-03-01' },
  { id: 'CA-003', framework: 'NIST AI RMF', status: 'Complete', completion: 100, auditor: 'Internal', due: '2025-01-10' },
  { id: 'CA-004', framework: 'SOC 2 Type II', status: 'In Progress', completion: 45, auditor: 'EY', due: '2025-04-01' },
];

export default function ConformityAssessment() {
  const [tab, setTab] = useState<'active' | 'completed'>('active');
  const items = ASSESSMENTS.filter(a => tab === 'active' ? a.status !== 'Complete' : a.status === 'Complete');
  return (
    <div>
      <Breadcrumbs />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))]">Conformity Assessment</h1>
          <p className="text-sm text-[hsl(var(--text-3))]">Track certification & audit readiness</p>
        </div>
        <Button className="gap-2"><Plus size={16} /> New Assessment</Button>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <CheckCircle size={24} className="text-emerald-400" />
          <div><p className="text-2xl font-bold text-[hsl(var(--text-1))]">1</p><p className="text-xs text-[hsl(var(--text-3))]">Completed</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Clock size={24} className="text-amber-400" />
          <div><p className="text-2xl font-bold text-[hsl(var(--text-1))]">2</p><p className="text-xs text-[hsl(var(--text-3))]">In Progress</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Warning size={24} className="text-red-400" />
          <div><p className="text-2xl font-bold text-[hsl(var(--text-1))]">1</p><p className="text-xs text-[hsl(var(--text-3))]">Overdue</p></div>
        </CardContent></Card>
      </div>
      <div className="flex gap-2 mb-4">
        {(['active', 'completed'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1 text-sm border-b-2 ${tab === t ? 'border-[hsl(var(--accent))] text-[hsl(var(--text-1))]' : 'border-transparent text-[hsl(var(--text-3))]'}`}>
            {t === 'active' ? 'Active' : 'Completed'}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {items.map(a => (
          <Card key={a.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <ClipboardText size={20} className="text-[hsl(var(--accent))]" />
                <div>
                  <p className="font-medium text-[hsl(var(--text-1))]">{a.framework}</p>
                  <p className="text-xs text-[hsl(var(--text-3))]">{a.id} &middot; Auditor: {a.auditor}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-32 h-2 bg-[hsl(var(--bg-surface))] rounded-full overflow-hidden">
                  <div className="h-full bg-[hsl(var(--accent))]" style={{ width: `${a.completion}%` }} />
                </div>
                <span className="text-sm text-[hsl(var(--text-2))]">{a.completion}%</span>
                <Badge className={a.status === 'Complete' ? 'bg-emerald-500/20 text-emerald-400' : a.status === 'In Progress' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}>{a.status}</Badge>
                <span className="text-xs text-[hsl(var(--text-3))]">Due: {a.due}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
""")
print('  ConformityAssessment done')

# 4. P2: Incident Notification Workflow
w('pages/IncidentWorkflow.tsx', r"""import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Bell, Warning, ArrowRight, CheckCircle, Clock, Plus } from '@phosphor-icons/react';
import Breadcrumbs from '../components/Breadcrumbs';

const INCIDENTS = [
  { id: 'INC-001', title: 'Model Drift Detected - Credit Scorer', severity: 'High', status: 'Notifying', assignee: 'Risk Team', created: '2025-01-16', sla: '4h' },
  { id: 'INC-002', title: 'PII Leak in Agent Response', severity: 'Critical', status: 'Investigating', assignee: 'Security', created: '2025-01-15', sla: '2h' },
  { id: 'INC-003', title: 'Bias Alert - Hiring Model', severity: 'Medium', status: 'Resolved', assignee: 'ML Ops', created: '2025-01-14', sla: '24h' },
  { id: 'INC-004', title: 'Guardrail Bypass Attempt', severity: 'High', status: 'Escalated', assignee: 'CISO', created: '2025-01-16', sla: '1h' },
];

const SEVERITY_COLORS: Record<string, string> = {
  Critical: 'bg-red-500/20 text-red-400',
  High: 'bg-orange-500/20 text-orange-400',
  Medium: 'bg-amber-500/20 text-amber-400',
  Low: 'bg-blue-500/20 text-blue-400',
};

const STATUS_COLORS: Record<string, string> = {
  Notifying: 'bg-blue-500/20 text-blue-400',
  Investigating: 'bg-amber-500/20 text-amber-400',
  Escalated: 'bg-red-500/20 text-red-400',
  Resolved: 'bg-emerald-500/20 text-emerald-400',
};

export default function IncidentWorkflow() {
  const [filter, setFilter] = useState('all');
  const items = filter === 'all' ? INCIDENTS : INCIDENTS.filter(i => i.status.toLowerCase() === filter);
  return (
    <div>
      <Breadcrumbs />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))]">Incident Notification Workflow</h1>
          <p className="text-sm text-[hsl(var(--text-3))]">AI incident response & notification management</p>
        </div>
        <Button className="gap-2"><Plus size={16} /> Report Incident</Button>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[{ label: 'Open Incidents', value: '3', icon: Warning, color: 'text-red-400' },
          { label: 'Avg Response Time', value: '1.2h', icon: Clock, color: 'text-amber-400' },
          { label: 'Resolved (30d)', value: '12', icon: CheckCircle, color: 'text-emerald-400' },
          { label: 'Notifications Sent', value: '47', icon: Bell, color: 'text-blue-400' }].map(kpi => (
          <Card key={kpi.label}><CardContent className="p-4 flex items-center gap-3">
            <kpi.icon size={24} className={kpi.color} />
            <div><p className="text-2xl font-bold text-[hsl(var(--text-1))]">{kpi.value}</p>
              <p className="text-xs text-[hsl(var(--text-3))]">{kpi.label}</p></div>
          </CardContent></Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Incident Queue</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {items.map(inc => (
              <div key={inc.id} className="flex items-center justify-between p-3 border border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-surface))] transition-colors">
                <div className="flex items-center gap-3">
                  <Warning size={18} className={inc.severity === 'Critical' ? 'text-red-400' : 'text-amber-400'} />
                  <div>
                    <p className="font-medium text-[hsl(var(--text-1))]">{inc.title}</p>
                    <p className="text-xs text-[hsl(var(--text-3))]">{inc.id} &middot; {inc.created} &middot; SLA: {inc.sla}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={SEVERITY_COLORS[inc.severity]}>{inc.severity}</Badge>
                  <Badge className={STATUS_COLORS[inc.status]}>{inc.status}</Badge>
                  <span className="text-xs text-[hsl(var(--text-3))]">{inc.assignee}</span>
                  <Button variant="ghost" size="sm"><ArrowRight size={14} /></Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
""")
print('  IncidentWorkflow done')

# 5. Risk Detail page
w('pages/risk/RiskDetail.tsx', r"""import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { ArrowLeft, Warning, TrendUp, TrendDown, Shield } from '@phosphor-icons/react';
import Breadcrumbs from '../../components/Breadcrumbs';

export default function RiskDetail() {
  const { id } = useParams();
  return (
    <div>
      <Breadcrumbs />
      <div className="flex items-center gap-3 mb-6">
        <Link to="/risk"><Button variant="ghost" size="sm"><ArrowLeft size={16} /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))]">Risk {id}</h1>
          <p className="text-sm text-[hsl(var(--text-3))]">Risk detail & mitigation tracking</p>
        </div>
        <Badge className="bg-red-500/20 text-red-400 ml-auto">High</Badge>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="p-4">
          <p className="text-xs text-[hsl(var(--text-3))]">Likelihood</p>
          <p className="text-2xl font-bold text-[hsl(var(--text-1))]">4/5</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-[hsl(var(--text-3))]">Impact</p>
          <p className="text-2xl font-bold text-[hsl(var(--text-1))]">5/5</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-[hsl(var(--text-3))]">Risk Score</p>
          <p className="text-2xl font-bold text-red-400">20</p>
        </CardContent></Card>
      </div>
      <Card className="mb-4">
        <CardHeader><CardTitle>Description</CardTitle></CardHeader>
        <CardContent><p className="text-[hsl(var(--text-2))]">Uncontrolled model drift in production credit scoring model may lead to discriminatory lending decisions and regulatory non-compliance with fair lending laws.</p></CardContent>
      </Card>
      <Card className="mb-4">
        <CardHeader><CardTitle>Mitigation Plan</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {['Implement automated drift monitoring', 'Weekly bias audits', 'Establish rollback procedures', 'Quarterly model retraining'].map((m, i) => (
              <div key={i} className="flex items-center gap-2 p-2 border border-[hsl(var(--border))]">
                <Shield size={16} className="text-[hsl(var(--accent))]" />
                <span className="text-sm text-[hsl(var(--text-1))]">{m}</span>
                <Badge className="ml-auto" variant="outline">{i < 2 ? 'Done' : 'Pending'}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
""")
print('  RiskDetail done')

# 6. Model Detail page
w('pages/models/ModelDetail.tsx', r"""import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { ArrowLeft, Brain, ChartLine, Shield, Warning, Clock, CheckCircle } from '@phosphor-icons/react';
import Breadcrumbs from '../../components/Breadcrumbs';

const TABS = ['Overview', 'Performance', 'Bias & Fairness', 'Lineage', 'Compliance', 'Incidents', 'Config'] as const;

export default function ModelDetail() {
  const { id } = useParams();
  const [tab, setTab] = useState<typeof TABS[number]>('Overview');
  return (
    <div>
      <Breadcrumbs />
      <div className="flex items-center gap-3 mb-6">
        <Link to="/models"><Button variant="ghost" size="sm"><ArrowLeft size={16} /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))]">Model {id}</h1>
          <p className="text-sm text-[hsl(var(--text-3))]">Model card & governance details</p>
        </div>
        <Badge className="bg-emerald-500/20 text-emerald-400 ml-auto">Production</Badge>
      </div>
      <div className="flex gap-1 border-b border-[hsl(var(--border))] mb-6">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px ${tab === t ? 'border-[hsl(var(--accent))] text-[hsl(var(--text-1))]' : 'border-transparent text-[hsl(var(--text-3))] hover:text-[hsl(var(--text-2))]'}`}>{t}</button>
        ))}
      </div>
      {tab === 'Overview' && (
        <div className="grid grid-cols-2 gap-4">
          <Card><CardHeader><CardTitle>Model Info</CardTitle></CardHeader><CardContent>
            <div className="space-y-2 text-sm">
              {[['Type', 'LLM'], ['Version', 'v3.2.1'], ['Framework', 'PyTorch'], ['Last Trained', '2025-01-10'], ['Owner', 'ML Ops Team'], ['Risk Level', 'High']].map(([k, v]) => (
                <div key={k} className="flex justify-between"><span className="text-[hsl(var(--text-3))]">{k}</span><span className="text-[hsl(var(--text-1))]">{v}</span></div>
              ))}
            </div>
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Health Status</CardTitle></CardHeader><CardContent>
            <div className="space-y-3">
              {[{ label: 'Accuracy', value: '94.2%', status: 'green' }, { label: 'Drift', value: '0.03', status: 'green' }, { label: 'Latency', value: '120ms', status: 'amber' }, { label: 'Bias Score', value: '0.08', status: 'green' }].map(m => (
                <div key={m.label} className="flex items-center justify-between">
                  <span className="text-sm text-[hsl(var(--text-2))]">{m.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[hsl(var(--text-1))]">{m.value}</span>
                    <div className={`w-2 h-2 rounded-full ${m.status === 'green' ? 'bg-emerald-400' : m.status === 'amber' ? 'bg-amber-400' : 'bg-red-400'}`} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent></Card>
        </div>
      )}
      {tab !== 'Overview' && (
        <Card><CardContent className="p-8 text-center text-[hsl(var(--text-3))]">
          <Brain size={48} className="mx-auto mb-3 opacity-30" />
          <p>{tab} tab content for Model {id}</p>
        </CardContent></Card>
      )}
    </div>
  );
}
""")
print('  ModelDetail done')

# 7. Policy Detail page
w('pages/policies/PolicyDetail.tsx', r"""import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { ArrowLeft, FileText, Clock, Users, CheckCircle } from '@phosphor-icons/react';
import Breadcrumbs from '../../components/Breadcrumbs';

const TABS = ['Details', 'Versions', 'Approvals', 'Controls', 'Evidence', 'Audit Trail'] as const;

export default function PolicyDetail() {
  const { id } = useParams();
  const [tab, setTab] = useState<typeof TABS[number]>('Details');
  return (
    <div>
      <Breadcrumbs />
      <div className="flex items-center gap-3 mb-6">
        <Link to="/policies"><Button variant="ghost" size="sm"><ArrowLeft size={16} /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))]">Policy {id}</h1>
          <p className="text-sm text-[hsl(var(--text-3))]">Policy lifecycle & compliance mapping</p>
        </div>
        <Badge className="bg-emerald-500/20 text-emerald-400 ml-auto">Active</Badge>
      </div>
      <div className="flex gap-1 border-b border-[hsl(var(--border))] mb-6">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px ${tab === t ? 'border-[hsl(var(--accent))] text-[hsl(var(--text-1))]' : 'border-transparent text-[hsl(var(--text-3))]'}`}>{t}</button>
        ))}
      </div>
      {tab === 'Details' && (
        <div className="grid grid-cols-2 gap-4">
          <Card><CardHeader><CardTitle>Policy Info</CardTitle></CardHeader><CardContent>
            <div className="space-y-2 text-sm">
              {[['Category', 'AI Governance'], ['Framework', 'ISO 42001'], ['Owner', 'CISO Office'], ['Last Reviewed', '2025-01-10'], ['Next Review', '2025-07-10'], ['Version', 'v2.1']].map(([k, v]) => (
                <div key={k} className="flex justify-between"><span className="text-[hsl(var(--text-3))]">{k}</span><span className="text-[hsl(var(--text-1))]">{v}</span></div>
              ))}
            </div>
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Approval Status</CardTitle></CardHeader><CardContent>
            <div className="space-y-3">
              {[{ role: 'Legal Review', status: 'Approved', date: '2025-01-08' }, { role: 'CISO Approval', status: 'Approved', date: '2025-01-09' }, { role: 'Board Sign-off', status: 'Pending', date: null }].map(a => (
                <div key={a.role} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {a.status === 'Approved' ? <CheckCircle size={16} className="text-emerald-400" /> : <Clock size={16} className="text-amber-400" />}
                    <span className="text-sm text-[hsl(var(--text-1))]">{a.role}</span>
                  </div>
                  <Badge className={a.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}>{a.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent></Card>
        </div>
      )}
      {tab !== 'Details' && (
        <Card><CardContent className="p-8 text-center text-[hsl(var(--text-3))]">
          <FileText size={48} className="mx-auto mb-3 opacity-30" />
          <p>{tab} tab content for Policy {id}</p>
        </CardContent></Card>
      )}
    </div>
  );
}
""")
print('  PolicyDetail done')

# 8. Patch App.tsx to add new routes
import re

app_path = 'App.tsx'
with open(app_path, 'r') as f:
    app = f.read()

# Add new lazy imports before the Loading function
new_imports = """
const ExplainabilityCenter = lazy(() => import('./pages/ExplainabilityCenter'));
const ConformityAssessment = lazy(() => import('./pages/ConformityAssessment'));
const IncidentWorkflow = lazy(() => import('./pages/IncidentWorkflow'));
const RiskDetail = lazy(() => import('./pages/risk/RiskDetail'));
const ModelDetail = lazy(() => import('./pages/models/ModelDetail'));
const PolicyDetail = lazy(() => import('./pages/policies/PolicyDetail'));
"""

if 'ExplainabilityCenter' not in app:
    app = app.replace('function Loading()', new_imports + 'function Loading()')
    print('  Added new lazy imports')

# Add new routes before the catch-all route
new_routes = """
                <Route path="/risk/register" element={<RiskRegister />} />
                <Route path="/risk/:id" element={<RiskDetail />} />
                <Route path="/models/:id" element={<ModelDetail />} />
                <Route path="/policies/:id" element={<PolicyDetail />} />
                <Route path="/reg-radar/:id" element={<RegDetail />} />
                <Route path="/explainability" element={<ExplainabilityCenter />} />
                <Route path="/conformity" element={<ConformityAssessment />} />
                <Route path="/incident-workflow" element={<IncidentWorkflow />} />
"""

if '/explainability' not in app:
    app = app.replace('<Route path="*"', new_routes + '                <Route path="*"')
    print('  Added new routes')

with open(app_path, 'w') as f:
    f.write(app)
print('  App.tsx patched')

print('\n=== All Phase 2 fixes generated ===')
