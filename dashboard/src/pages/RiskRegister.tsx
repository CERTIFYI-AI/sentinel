import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { AlertTriangle, Shield, Search, Plus, Download, Eye, CheckCircle, TrendingUp, TrendingDown, BarChart2, Clock, XCircle, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

type RiskStatus = 'open' | 'in-progress' | 'mitigated' | 'accepted' | 'closed';
type RiskSeverity = 'critical' | 'high' | 'medium' | 'low';
type RiskCategory = 'AI/ML' | 'Compliance' | 'Security' | 'Operational' | 'Privacy' | 'Third-Party' | 'Governance';

interface Risk {
  id: string;
  title: string;
  category: RiskCategory;
  status: RiskStatus;
  severity: RiskSeverity;
  likelihood: number;
  impact: number;
  score: number;
  owner: string;
  dueDate: string;
  createdDate: string;
  frameworks: string[];
  description: string;
  mitigationPlan: string;
  residualRisk: string;
  aiSystem: string;
  regulation: string;
  trend: 'up' | 'down' | 'stable';
}

const risks: Risk[] = [
  {
    id: 'RSK-001',
    title: 'LLM Hallucination in Credit Decisions',
    category: 'AI/ML',
    status: 'open',
    severity: 'critical',
    likelihood: 4,
    impact: 5,
    score: 20,
    owner: 'Dr. Maya Chen',
    dueDate: '2025-03-15',
    createdDate: '2024-10-01',
    frameworks: ['EU AI Act', 'SR 11-7', 'NIST AI RMF'],
    description: 'The LLM-based credit scoring assistant generates confident but factually incorrect risk assessments, leading to unfair credit denials or approvals for high-risk applicants.',
    mitigationPlan: 'Implement hallucination detection layer, require human-in-the-loop for all credit decisions over $50K, deploy retrieval-augmented generation to ground outputs in verified financial data.',
    residualRisk: 'Medium - human review covers high-value cases but edge cases remain',
    aiSystem: 'CreditSense LLM v2.1',
    regulation: 'Fair Credit Reporting Act, EU AI Act Art. 10',
    trend: 'down',
  },
  {
    id: 'RSK-002',
    title: 'Training Data PII Leakage via Model Inversion',
    category: 'Privacy',
    status: 'in-progress',
    severity: 'critical',
    likelihood: 3,
    impact: 5,
    score: 15,
    owner: 'Raj Patel',
    dueDate: '2025-02-28',
    createdDate: '2024-09-15',
    frameworks: ['GDPR', 'CCPA', 'NIST AI RMF'],
    description: 'Adversarial model inversion attacks can reconstruct PII from training data embedded in the fraud detection model, exposing customer account details.',
    mitigationPlan: 'Apply differential privacy (epsilon=1.0) to training pipeline, implement membership inference defenses, quarterly red-team exercises for data extraction attacks.',
    residualRisk: 'Low - differential privacy significantly reduces reconstruction risk',
    aiSystem: 'FraudGuard ML v3.4',
    regulation: 'GDPR Art. 25 (Privacy by Design), CCPA Sec. 1798.100',
    trend: 'down',
  },
  {
    id: 'RSK-003',
    title: 'Demographic Bias in Loan Approval Model',
    category: 'AI/ML',
    status: 'in-progress',
    severity: 'high',
    likelihood: 4,
    impact: 4,
    score: 16,
    owner: 'Dr. Aisha Williams',
    dueDate: '2025-04-01',
    createdDate: '2024-08-20',
    frameworks: ['EU AI Act', 'ECOA', 'SR 11-7'],
    description: 'Disparate impact analysis reveals the loan approval model denies applications from minority zip codes at 2.3x the rate of equivalent-risk applications from other areas.',
    mitigationPlan: 'Retrain model with fairness constraints (equalized odds), implement bias monitoring dashboard, establish quarterly bias audits with external auditor.',
    residualRisk: 'Medium - fairness constraints reduce disparity but systemic correlations persist',
    aiSystem: 'LoanOptimizer AI v1.8',
    regulation: 'Equal Credit Opportunity Act, EU AI Act Art. 10(3)',
    trend: 'stable',
  },
  {
    id: 'RSK-004',
    title: 'Third-Party API Data Exposure',
    category: 'Third-Party',
    status: 'open',
    severity: 'high',
    likelihood: 3,
    impact: 4,
    score: 12,
    owner: 'Carlos Rivera',
    dueDate: '2025-03-30',
    createdDate: '2024-11-05',
    frameworks: ['SOC 2', 'ISO 27001', 'NIST CSF'],
    description: 'The AI platform vendor (DataVend Inc.) has access to raw customer transaction data for model training purposes with insufficient contractual data protection obligations.',
    mitigationPlan: 'Renegotiate DPA with DataVend, implement data anonymization before sending to vendor, conduct vendor security assessment, consider federated learning architecture.',
    residualRisk: 'High - contract renegotiation in progress, interim anonymization deployed',
    aiSystem: 'Behavioral Analytics Suite',
    regulation: 'GDPR Art. 28 (Processor obligations), SOC 2 CC6.7',
    trend: 'stable',
  },
  {
    id: 'RSK-005',
    title: 'EU AI Act Non-compliance: High-Risk System',
    category: 'Compliance',
    status: 'open',
    severity: 'critical',
    likelihood: 5,
    impact: 5,
    score: 25,
    owner: 'Sophie Laurent',
    dueDate: '2025-08-01',
    createdDate: '2024-12-01',
    frameworks: ['EU AI Act'],
    description: 'The credit scoring AI system qualifies as a high-risk AI system under EU AI Act Annex III but lacks required conformity assessment, technical documentation, and human oversight mechanisms.',
    mitigationPlan: 'Engage notified body for conformity assessment, complete technical documentation (Art. 11), deploy human oversight interface, register in EU AI database by August 2025.',
    residualRisk: 'Critical - August 2025 deadline, significant fines if non-compliant',
    aiSystem: 'CreditSense LLM v2.1',
    regulation: 'EU AI Act Art. 9, 11, 14, 26 - effective August 2025',
    trend: 'up',
  },
  {
    id: 'RSK-006',
    title: 'Adversarial Attack on Fraud Detection Model',
    category: 'Security',
    status: 'in-progress',
    severity: 'high',
    likelihood: 3,
    impact: 5,
    score: 15,
    owner: 'Marcus Johnson',
    dueDate: '2025-05-15',
    createdDate: '2024-10-20',
    frameworks: ['NIST AI RMF', 'NIST CSF', 'ISO 27001'],
    description: 'Sophisticated threat actors are using adversarial examples to bypass the real-time fraud detection model, allowing fraudulent transactions to be approved.',
    mitigationPlan: 'Implement adversarial training with FGSM/PGD attacks, deploy ensemble detection, add anomaly detection layer outside ML pipeline, conduct red-team exercises.',
    residualRisk: 'Medium - adversarial training reduces attack success rate to <5%',
    aiSystem: 'FraudGuard ML v3.4',
    regulation: 'PCI DSS Requirement 6.3, NIST SP 800-53 SI-3',
    trend: 'down',
  },
  {
    id: 'RSK-007',
    title: 'Model Drift in Production Trading Algorithm',
    category: 'Operational',
    status: 'mitigated',
    severity: 'high',
    likelihood: 3,
    impact: 4,
    score: 12,
    owner: 'Yuki Tanaka',
    dueDate: '2025-01-31',
    createdDate: '2024-07-10',
    frameworks: ['SR 11-7', 'NIST AI RMF'],
    description: 'The algorithmic trading model exhibited significant performance degradation due to distribution shift in market conditions post-2024 election, causing 8% increase in prediction errors.',
    mitigationPlan: 'Deployed automated drift detection (PSI > 0.2 triggers alert), established monthly model retraining pipeline, added champion-challenger framework with shadow model.',
    residualRisk: 'Low - automated monitoring with 4-hour response SLA in place',
    aiSystem: 'AlgoTrade Pro v5.2',
    regulation: 'SR 11-7 Section 4, MiFID II Article 17',
    trend: 'down',
  },
  {
    id: 'RSK-008',
    title: 'Insufficient AI Audit Trail and Explainability',
    category: 'Governance',
    status: 'in-progress',
    severity: 'medium',
    likelihood: 4,
    impact: 4,
    score: 16,
    owner: 'Priya Sharma',
    dueDate: '2025-06-30',
    createdDate: '2024-09-01',
    frameworks: ['EU AI Act', 'SR 11-7', 'ISO 42001'],
    description: 'AI model decisions cannot be adequately explained to regulators or customers, and audit logs do not capture sufficient information to reconstruct decision pathways.',
    mitigationPlan: 'Implement SHAP/LIME explainability layer, deploy immutable audit logging to append-only database, create customer-facing explanation interface, train compliance team on XAI.',
    residualRisk: 'Medium - explainability tools deployed for new models, legacy models still pending',
    aiSystem: 'Multiple AI Systems',
    regulation: 'EU AI Act Art. 13, GDPR Art. 22 (right to explanation)',
    trend: 'down',
  },
  {
    id: 'RSK-009',
    title: 'Supply Chain Attack on ML Dependencies',
    category: 'Security',
    status: 'open',
    severity: 'high',
    likelihood: 2,
    impact: 5,
    score: 10,
    owner: 'Alex Kim',
    dueDate: '2025-04-15',
    createdDate: '2024-11-20',
    frameworks: ['NIST CSF', 'SOC 2', 'SSDF'],
    description: 'Critical ML dependencies (PyTorch, scikit-learn, Hugging Face libraries) sourced from public registries without integrity verification, exposing models to poisoned package attacks.',
    mitigationPlan: 'Implement private package registry with hash verification, scan all dependencies with Dependabot and Snyk, enforce SBOM generation for all model artifacts.',
    residualRisk: 'Medium - private registry in place, historical packages not yet re-verified',
    aiSystem: 'All ML Systems',
    regulation: 'EO 14028 (Software Supply Chain Security), NIST SSDF',
    trend: 'stable',
  },
  {
    id: 'RSK-010',
    title: 'GenAI Prompt Injection in Customer Chatbot',
    category: 'Security',
    status: 'open',
    severity: 'high',
    likelihood: 4,
    impact: 3,
    score: 12,
    owner: 'Fatima Al-Rashid',
    dueDate: '2025-03-01',
    createdDate: '2024-12-10',
    frameworks: ['OWASP LLM Top 10', 'NIST AI RMF'],
    description: 'The customer service GenAI chatbot is vulnerable to prompt injection attacks that can bypass system prompt restrictions, causing the model to divulge internal data or perform unauthorized actions.',
    mitigationPlan: 'Implement prompt sanitization layer, separate privileged and unprivileged execution contexts, add output filtering for PII patterns, conduct regular red-team LLM assessments.',
    residualRisk: 'High - complex to fully mitigate in LLM architectures, defense in depth required',
    aiSystem: 'SentinelChat GPT-4o powered',
    regulation: 'OWASP LLM01:2025, FTC guidance on AI chatbots',
    trend: 'up',
  },
  {
    id: 'RSK-011',
    title: 'Model Governance Gap: Unapproved Production Deployment',
    category: 'Governance',
    status: 'open',
    severity: 'medium',
    likelihood: 3,
    impact: 3,
    score: 9,
    owner: 'Dr. Maya Chen',
    dueDate: '2025-02-15',
    createdDate: '2024-10-30',
    frameworks: ['SR 11-7', 'ISO 42001'],
    description: 'Two ML models were deployed to production without completing the required model risk management (MRM) validation process, bypassing the model governance committee review.',
    mitigationPlan: 'Enforce CI/CD gates requiring MRM approval before production deployment, audit all current production models for compliance, remediate non-compliant deployments.',
    residualRisk: 'Low - CI/CD gates now enforce MRM approval, legacy models under review',
    aiSystem: 'CustomerChurn v1.2, PricingOptimizer v2.0',
    regulation: 'SR 11-7 Section 5, OCC Bulletin 2011-12',
    trend: 'down',
  },
  {
    id: 'RSK-012',
    title: 'Cross-Border Data Transfer for AI Training',
    category: 'Privacy',
    status: 'accepted',
    severity: 'medium',
    likelihood: 3,
    impact: 3,
    score: 9,
    owner: 'Sophie Laurent',
    dueDate: '2025-12-31',
    createdDate: '2024-06-15',
    frameworks: ['GDPR', 'CCPA', 'SCCs'],
    description: 'EU customer data is transferred to US-based ML training infrastructure without adequate Standard Contractual Clauses in place following Schrems II ruling implications.',
    mitigationPlan: 'Risk accepted pending EU-US Data Privacy Framework stability assessment. SCCs implemented as interim measure. Annual review scheduled.',
    residualRisk: 'Medium - SCCs provide legal basis but regulatory landscape evolving',
    aiSystem: 'Global ML Platform',
    regulation: 'GDPR Chapter V, EU-US DPF',
    trend: 'stable',
  },
];

const SEVERITY_COLORS: Record<RiskSeverity, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-green-500/20 text-green-400 border-green-500/30',
};

const STATUS_COLORS: Record<RiskStatus, string> = {
  open: 'bg-red-500/20 text-red-400',
  'in-progress': 'bg-blue-500/20 text-blue-400',
  mitigated: 'bg-green-500/20 text-green-400',
  accepted: 'bg-purple-500/20 text-purple-400',
  closed: 'bg-zinc-500/20 text-zinc-400',
};

const CHART_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#6b7280'];

export default function RiskRegister() {
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selected, setSelected] = useState<Risk | null>(null);
  const [sortField, setSortField] = useState<'score' | 'dueDate' | 'severity'>('score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    let r = risks.filter((risk) => {
      const matchSearch = risk.title.toLowerCase().includes(search.toLowerCase()) || risk.id.toLowerCase().includes(search.toLowerCase());
      const matchSev = filterSeverity === 'all' || risk.severity === filterSeverity;
      const matchStatus = filterStatus === 'all' || risk.status === filterStatus;
      const matchCat = filterCategory === 'all' || risk.category === filterCategory;
      return matchSearch && matchSev && matchStatus && matchCat;
    });
    r.sort((a, b) => {
      if (sortField === 'score') return sortDir === 'desc' ? b.score - a.score : a.score - b.score;
      if (sortField === 'severity') {
        const ord: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        return sortDir === 'desc' ? ord[b.severity] - ord[a.severity] : ord[a.severity] - ord[b.severity];
      }
      return sortDir === 'desc' ? b.dueDate.localeCompare(a.dueDate) : a.dueDate.localeCompare(b.dueDate);
    });
    return r;
  }, [search, filterSeverity, filterStatus, filterCategory, sortField, sortDir]);

  const stats = useMemo(() => ({
    total: risks.length,
    critical: risks.filter((r) => r.severity === 'critical').length,
    open: risks.filter((r) => r.status === 'open').length,
    mitigated: risks.filter((r) => r.status === 'mitigated' || r.status === 'closed').length,
    avgScore: Math.round(risks.reduce((s, r) => s + r.score, 0) / risks.length),
    trending_up: risks.filter((r) => r.trend === 'up').length,
  }), []);

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    risks.forEach((r) => { map[r.category] = (map[r.category] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, []);

  const severityData = useMemo(() => [
    { name: 'Critical', count: risks.filter((r) => r.severity === 'critical').length },
    { name: 'High', count: risks.filter((r) => r.severity === 'high').length },
    { name: 'Medium', count: risks.filter((r) => r.severity === 'medium').length },
    { name: 'Low', count: risks.filter((r) => r.severity === 'low').length },
  ], []);

  const toggleSort = (f: 'score' | 'dueDate' | 'severity') => {
    if (sortField === f) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(f); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: string }) => sortField === field
    ? (sortDir === 'desc' ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />)
    : <BarChart2 className="w-3 h-3 opacity-30" />;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Risk Register</h1>
          <p className="text-sm text-muted-foreground">Enterprise AI/ML risk management and compliance tracking</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" />Export</Button>
          <Button size="sm"><Plus className="w-4 h-4 mr-1" />New Risk</Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Shield className="w-5 h-5 text-blue-400" /><div><p className="text-xs text-muted-foreground">Total Risks</p><p className="text-xl font-bold">{stats.total}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-400" /><div><p className="text-xs text-muted-foreground">Critical</p><p className="text-xl font-bold text-red-400">{stats.critical}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><XCircle className="w-5 h-5 text-orange-400" /><div><p className="text-xs text-muted-foreground">Open</p><p className="text-xl font-bold text-orange-400">{stats.open}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-400" /><div><p className="text-xs text-muted-foreground">Mitigated</p><p className="text-xl font-bold text-green-400">{stats.mitigated}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Activity className="w-5 h-5 text-yellow-400" /><div><p className="text-xs text-muted-foreground">Avg Score</p><p className="text-xl font-bold">{stats.avgScore}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-red-400" /><div><p className="text-xs text-muted-foreground">Trending Up</p><p className="text-xl font-bold text-red-400">{stats.trending_up}</p></div></div></CardContent></Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Risks by Category</CardTitle></CardHeader><CardContent>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                {categoryData.map((_, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}
              </Pie><Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #333' }} /><Legend /></PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Severity Distribution</CardTitle></CardHeader><CardContent>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityData}><XAxis dataKey="name" tick={{ fill: '#888', fontSize: 12 }} /><YAxis tick={{ fill: '#888', fontSize: 12 }} /><Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #333' }} /><Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {severityData.map((_, i) => (<Cell key={i} fill={CHART_COLORS[i]} />))}
              </Bar></BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search risks..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="mitigated">Mitigated</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="AI/ML">AI/ML</SelectItem>
                <SelectItem value="Compliance">Compliance</SelectItem>
                <SelectItem value="Security">Security</SelectItem>
                <SelectItem value="Operational">Operational</SelectItem>
                <SelectItem value="Privacy">Privacy</SelectItem>
                <SelectItem value="Third-Party">Third-Party</SelectItem>
                <SelectItem value="Governance">Governance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Risk Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Risk Items ({filtered.length})</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => toggleSort('score')} className="text-xs">Score <SortIcon field="score" /></Button>
              <Button variant="ghost" size="sm" onClick={() => toggleSort('severity')} className="text-xs">Severity <SortIcon field="severity" /></Button>
              <Button variant="ghost" size="sm" onClick={() => toggleSort('dueDate')} className="text-xs">Due Date <SortIcon field="dueDate" /></Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left p-3 text-muted-foreground font-medium">ID</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Risk</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Category</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Severity</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Score</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Owner</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Trend</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Due</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((risk) => (
                  <tr key={risk.id} className="border-b border-border/30 hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(risk)}>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{risk.id}</td>
                    <td className="p-3 max-w-[300px]">
                      <p className="font-medium truncate">{risk.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{risk.aiSystem}</p>
                    </td>
                    <td className="p-3"><Badge variant="outline" className="text-xs">{risk.category}</Badge></td>
                    <td className="p-3"><Badge className={`text-xs ${SEVERITY_COLORS[risk.severity]}`}>{risk.severity}</Badge></td>
                    <td className="p-3"><span className={`font-bold ${risk.score >= 20 ? 'text-red-400' : risk.score >= 12 ? 'text-orange-400' : risk.score >= 6 ? 'text-yellow-400' : 'text-green-400'}`}>{risk.score}</span></td>
                    <td className="p-3"><Badge className={`text-xs ${STATUS_COLORS[risk.status]}`}>{risk.status}</Badge></td>
                    <td className="p-3 text-xs">{risk.owner}</td>
                    <td className="p-3">{risk.trend === 'up' ? <TrendingUp className="w-4 h-4 text-red-400" /> : risk.trend === 'down' ? <TrendingDown className="w-4 h-4 text-green-400" /> : <Clock className="w-4 h-4 text-muted-foreground" />}</td>
                    <td className="p-3 text-xs text-muted-foreground">{risk.dueDate}</td>
                    <td className="p-3"><Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelected(risk); }}><Eye className="w-4 h-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">{selected.id}</span>
                  <Badge className={`text-xs ${SEVERITY_COLORS[selected.severity]}`}>{selected.severity}</Badge>
                  <Badge className={`text-xs ${STATUS_COLORS[selected.status]}`}>{selected.status}</Badge>
                </DialogTitle>
                <p className="text-lg font-semibold mt-1">{selected.title}</p>
              </DialogHeader>
              <Tabs defaultValue="overview" className="mt-4">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="mitigation">Mitigation</TabsTrigger>
                  <TabsTrigger value="compliance">Compliance</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><p className="text-xs text-muted-foreground">AI System</p><p className="text-sm font-medium">{selected.aiSystem}</p></div>
                    <div className="space-y-1"><p className="text-xs text-muted-foreground">Category</p><p className="text-sm">{selected.category}</p></div>
                    <div className="space-y-1"><p className="text-xs text-muted-foreground">Risk Owner</p><p className="text-sm">{selected.owner}</p></div>
                    <div className="space-y-1"><p className="text-xs text-muted-foreground">Due Date</p><p className="text-sm">{selected.dueDate}</p></div>
                    <div className="space-y-1"><p className="text-xs text-muted-foreground">Likelihood x Impact</p><p className="text-sm font-bold">{selected.likelihood} x {selected.impact} = {selected.score}</p></div>
                    <div className="space-y-1"><p className="text-xs text-muted-foreground">Trend</p><p className="text-sm flex items-center gap-1">{selected.trend === 'up' ? <><TrendingUp className="w-4 h-4 text-red-400" /> Increasing</> : selected.trend === 'down' ? <><TrendingDown className="w-4 h-4 text-green-400" /> Decreasing</> : <><Clock className="w-4 h-4" /> Stable</>}</p></div>
                  </div>
                  <div><p className="text-xs text-muted-foreground mb-1">Description</p><p className="text-sm leading-relaxed">{selected.description}</p></div>
                </TabsContent>
                <TabsContent value="mitigation" className="space-y-4 mt-4">
                  <div><p className="text-xs text-muted-foreground mb-1">Mitigation Plan</p><p className="text-sm leading-relaxed">{selected.mitigationPlan}</p></div>
                  <div><p className="text-xs text-muted-foreground mb-1">Residual Risk</p><p className="text-sm leading-relaxed">{selected.residualRisk}</p></div>
                </TabsContent>
                <TabsContent value="compliance" className="space-y-4 mt-4">
                  <div><p className="text-xs text-muted-foreground mb-1">Applicable Regulation</p><p className="text-sm">{selected.regulation}</p></div>
                  <div><p className="text-xs text-muted-foreground mb-1">Mapped Frameworks</p><div className="flex flex-wrap gap-1">{selected.frameworks.map((f) => (<Badge key={f} variant="outline" className="text-xs">{f}</Badge>))}</div></div>
                </TabsContent>
                <TabsContent value="timeline" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    <div className="flex gap-3 items-start"><CheckCircle className="w-4 h-4 text-green-400 mt-0.5" /><div><p className="text-sm font-medium">Risk Identified</p><p className="text-xs text-muted-foreground">{selected.createdDate}</p></div></div>
                    <div className="flex gap-3 items-start"><Clock className="w-4 h-4 text-blue-400 mt-0.5" /><div><p className="text-sm font-medium">Mitigation Due</p><p className="text-xs text-muted-foreground">{selected.dueDate}</p></div></div>
                    <div className="flex gap-3 items-start"><Shield className="w-4 h-4 text-purple-400 mt-0.5" /><div><p className="text-sm font-medium">Current Status: {selected.status}</p><p className="text-xs text-muted-foreground">Owner: {selected.owner}</p></div></div>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
