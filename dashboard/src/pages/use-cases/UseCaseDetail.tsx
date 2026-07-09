import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { USE_CASES, MODELS, RISKS, formatDate } from '../../data/seed';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import {
  Briefcase, Warning, ShieldCheck, ListChecks, Clock,
  ChartLineUp, Gear, Plus, DownloadSimple, User, GlobeHemisphereWest,
  Buildings, FileText, Cpu, Database, Eye, MagnifyingGlass
} from '@phosphor-icons/react';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    'Completed': { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
    'In Progress': { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
    'Under Review': { bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
    'Not Started': { bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))' },
    'On Hold': { bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))' },
    'Rejected': { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
  };
  const style = map[status] || map['Not Started'];
  return <Badge style={{ background: style.bg, color: style.color, borderRadius: 0, fontSize: 10 }}>{status}</Badge>;
}

function RiskBadge({ riskClass }: { riskClass: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    'High-Risk': { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
    'Limited': { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
    'Minimal': { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
    'Prohibited': { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
  };
  const style = map[riskClass] || map['Minimal'];
  return <Badge style={{ background: style.bg, color: style.color, borderRadius: 0, fontSize: 10 }}>{riskClass}</Badge>;
}

export default function UseCaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const uc = useMemo(() => USE_CASES.find(u => u.id === id), [id]);

  // Functional state (optimistic; persists to Supabase once the tables exist).
  const [linkedModelIds, setLinkedModelIds] = useState<string[]>(() => USE_CASES.find(u => u.id === id)?.linkedModels ?? []);
  const [extraRisks, setExtraRisks] = useState<{ id: string; title: string; category: string; severity: string; score: number }[]>([]);
  const [ceItems, setCeItems] = useState([
    { id: 'ce-1', label: 'Technical documentation (Annex IV) complete', done: true },
    { id: 'ce-2', label: 'Conformity assessment (Art. 43) performed', done: false },
    { id: 'ce-3', label: 'Quality management system (Art. 17) in place', done: true },
    { id: 'ce-4', label: 'Human oversight mechanism (Art. 14) implemented', done: true },
    { id: 'ce-5', label: 'Accuracy, robustness & cybersecurity (Art. 15) verified', done: false },
    { id: 'ce-6', label: 'Post-market monitoring plan (Art. 72) exists', done: false },
    { id: 'ce-7', label: 'EU declaration of conformity (Art. 47) signed', done: false },
    { id: 'ce-8', label: 'EU database registration (Art. 49) complete', done: false },
  ]);
  const [activity, setActivity] = useState<{ action: string; date: string; actor: string }[]>([
    { action: 'Status changed to Under Review', date: '2026-03-20T14:30:00', actor: 'James Patel' },
    { action: 'Risk classification confirmed as High-Risk (Annex III)', date: '2026-03-15T10:00:00', actor: 'Maria Santos' },
    { action: 'Framework EU AI Act attached', date: '2026-03-01T09:15:00', actor: 'Raj Gupta' },
    { action: 'Model MDL-001 linked', date: '2026-02-20T16:45:00', actor: 'Maria Santos' },
    { action: 'DPIA initiated', date: '2026-02-10T11:20:00', actor: 'Sarah Chen' },
    { action: 'Use case created', date: '2026-02-01T11:00:00', actor: 'Sarah Chen' },
  ]);
  const [showAddRisk, setShowAddRisk] = useState(false);
  const [showLinkModel, setShowLinkModel] = useState(false);
  const [riskForm, setRiskForm] = useState({ title: '', category: 'Fairness', severity: 'high', score: 12 });
  const logActivity = (action: string) => setActivity(prev => [{ action, date: new Date().toISOString(), actor: 'You' }, ...prev]);

  const handleDelete = () => {
    setConfirmDelete(false);
    toast.success(`Use case ${id} deleted`);
    navigate('/use-cases');
  };
  const handleTransfer = () => {
    const owner = window.prompt('Transfer ownership to (name or email):');
    if (owner && owner.trim()) toast.success(`Ownership transferred to ${owner.trim()}`);
  };

  if (!uc) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <Warning size={48} className="text-[hsl(var(--text-4))] mb-4" />
        <h2 className="text-xl font-bold text-[hsl(var(--text-1))]">Use Case Not Found</h2>
        <p className="text-[hsl(var(--text-3))] mb-6">The use case {id} could not be located.</p>
        <Button onClick={() => navigate('/use-cases')} style={{ borderRadius: 0 }}>Back to Use Cases</Button>
      </div>
    );
  }

  const linkedModels = MODELS.filter(m => linkedModelIds.includes(m.id));
  const availableModels = MODELS.filter(m => !linkedModelIds.includes(m.id));
  const linkedRisks = [
    ...RISKS.filter(r => linkedModelIds.includes(r.linkedModel)).map(r => ({ id: r.id, title: r.title, category: r.category, severity: r.severity, score: r.score })),
    ...extraRisks,
  ];

  const addRisk = () => {
    if (!riskForm.title.trim()) { toast.error('Risk title is required'); return; }
    const rid = `UCR-${String(extraRisks.length + 1).padStart(3, '0')}`;
    setExtraRisks(prev => [...prev, { id: rid, ...riskForm, title: riskForm.title.trim() }]);
    logActivity(`Risk "${riskForm.title.trim()}" logged`);
    toast.success(`Risk ${rid} logged`);
    setRiskForm({ title: '', category: 'Fairness', severity: 'high', score: 12 });
    setShowAddRisk(false);
  };
  const linkModel = (mid: string, mname: string) => {
    setLinkedModelIds(prev => [...prev, mid]);
    logActivity(`Model ${mid} linked`);
    toast.success(`Linked ${mname}`);
    setShowLinkModel(false);
  };
  const toggleCe = (cid: string) => setCeItems(prev => prev.map(c => c.id === cid ? { ...c, done: !c.done } : c));
  const ceComplete = ceItems.filter(c => c.done).length;

  return (
    <div className="space-y-6">
      {/* Header section with Breadcrumbs */}
      <div>
        <PageHeader
          title={uc.title}
          subtitle={`Goal: ${uc.goal}`}
          breadcrumbs={[
            { label: 'AI Governance' },
            { label: 'Use Cases', href: '/use-cases' },
            { label: uc.id }
          ]}
        />
        <div className="flex items-center gap-3 mt-4">
          <Badge variant="outline" style={{ borderRadius: 0, fontFamily: 'monospace' }}>{uc.id}</Badge>
          <StatusBadge status={uc.status} />
          <RiskBadge riskClass={uc.riskClass} />
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" style={{ borderRadius: 0 }} onClick={() => toast.success('Use case dossier exported (PDF)')}>
              <DownloadSimple size={14} /> Export PDF
            </Button>
            <Button size="sm" style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }} onClick={() => toast.success('Submitted for Model Risk Committee review')}>
              Submit for Review
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Navigation Tabs */}
        <div className="border-b border-[hsl(var(--border))]">
          <TabsList className="bg-transparent h-12 p-0 w-full justify-start overflow-x-auto flex-nowrap hide-scrollbar">
            {[
              { id: 'overview', icon: FileText, label: 'Overview' },
              { id: 'risks', icon: Warning, label: 'Use case risks' },
              { id: 'models', icon: Briefcase, label: 'Linked models' },
              { id: 'frameworks', icon: ListChecks, label: 'Frameworks & regulations' },
              { id: 'ce', icon: ShieldCheck, label: 'CE marking' },
              { id: 'activity', icon: Clock, label: 'Activity' },
              { id: 'monitoring', icon: ChartLineUp, label: 'Monitoring' },
              { id: 'settings', icon: Gear, label: 'Settings' }
            ].map(tab => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--brand))] data-[state=active]:bg-transparent px-6 font-medium whitespace-nowrap"
              >
                <tab.icon size={16} className="mr-2 opacity-70" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="py-6">
          {/* TAB 1: OVERVIEW */}
          <TabsContent value="overview" className="mt-0 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Main Details */}
              <div className="md:col-span-2 space-y-6">
                <div className="bg-surface border border-[hsl(var(--border))] p-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-[hsl(var(--text-3))] mb-4">Description</h3>
                  <p className="text-sm leading-relaxed text-[hsl(var(--text-2))]">{uc.description || 'No detailed description provided.'}</p>
                </div>
                
                <div className="bg-surface border border-[hsl(var(--border))] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-[hsl(var(--text-3))]">Framework Compliance Status</h3>
                    <Button variant="ghost" size="sm" className="h-8">View All</Button>
                  </div>
                  <div className="space-y-4">
                    {uc.frameworks.map(fw => (
                      <div key={fw} className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{fw}</span>
                          <span className="text-xs text-[hsl(var(--text-4))]">85% Complete</span>
                        </div>
                        <div className="h-2 w-full bg-[hsl(var(--bg-muted))] overflow-hidden">
                          <div className="h-full bg-[hsl(var(--brand))]" style={{ width: '85%' }} />
                        </div>
                      </div>
                    ))}
                    {uc.frameworks.length === 0 && <p className="text-sm text-[hsl(var(--text-4))]">No frameworks attached.</p>}
                  </div>
                </div>

                {/* Scope Definition */}
                <div className="bg-surface border border-[hsl(var(--border))] p-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-[hsl(var(--text-3))] mb-4">System Scope</h3>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                    <div className="flex items-start gap-3">
                      <Database size={16} className="text-[hsl(var(--text-4))] mt-0.5" />
                      <div>
                        <p className="text-xs text-[hsl(var(--text-4))]">Environment</p>
                        <p className="text-sm font-medium">{uc.aiEnvironment || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Cpu size={16} className="text-[hsl(var(--text-4))] mt-0.5" />
                      <div>
                        <p className="text-xs text-[hsl(var(--text-4))]">Technology Type</p>
                        <p className="text-sm font-medium">{uc.technologyType || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="col-span-2 flex items-center gap-6 pt-2">
                      <Badge variant="outline" style={{ borderRadius: 0, opacity: uc.novelTechnology ? 1 : 0.4 }}>
                        {uc.novelTechnology ? '✓' : '✗'} Novel Technology
                      </Badge>
                      <Badge variant="outline" style={{ borderRadius: 0, opacity: uc.personalData ? 1 : 0.4 }}>
                        {uc.personalData ? '✓' : '✗'} Personal Data
                      </Badge>
                      <Badge variant="outline" style={{ borderRadius: 0, opacity: uc.monitoring ? 1 : 0.4 }}>
                        {uc.monitoring ? '✓' : '✗'} Active Monitoring
                      </Badge>
                    </div>
                  </div>
                  {uc.unintendedOutcomes && (
                    <div className="mt-6 p-4 bg-[hsl(var(--bg-muted))] border-l-2 border-[hsl(var(--s-wn-tx))]">
                      <p className="text-xs font-bold text-[hsl(var(--s-wn-tx))] mb-1 flex items-center gap-1"><Warning size={14} /> Unintended Outcomes</p>
                      <p className="text-sm text-[hsl(var(--text-3))]">{uc.unintendedOutcomes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar Details */}
              <div className="space-y-6">
                <div className="bg-surface border border-[hsl(var(--border))] p-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-[hsl(var(--text-3))] mb-4">Properties</h3>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <User size={16} className="text-[hsl(var(--text-4))] mt-0.5" />
                      <div>
                        <p className="text-xs text-[hsl(var(--text-4))]">Owner</p>
                        <p className="text-sm font-medium">{uc.owner}</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <Briefcase size={16} className="text-[hsl(var(--text-4))] mt-0.5" />
                      <div>
                        <p className="text-xs text-[hsl(var(--text-4))]">High Risk Role</p>
                        <p className="text-sm font-medium">{uc.role || 'Deployer'}</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <GlobeHemisphereWest size={16} className="text-[hsl(var(--text-4))] mt-0.5" />
                      <div>
                        <p className="text-xs text-[hsl(var(--text-4))]">Geography</p>
                        <p className="text-sm font-medium">{uc.geography}</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <Buildings size={16} className="text-[hsl(var(--text-4))] mt-0.5" />
                      <div>
                        <p className="text-xs text-[hsl(var(--text-4))]">Industry</p>
                        <p className="text-sm font-medium">{uc.industry}</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <Clock size={16} className="text-[hsl(var(--text-4))] mt-0.5" />
                      <div>
                        <p className="text-xs text-[hsl(var(--text-4))]">Current Stage</p>
                        <p className="text-sm font-medium">{uc.stage}</p>
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="bg-surface border border-[hsl(var(--border))] p-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-[hsl(var(--text-3))] mb-4">Dates</h3>
                  <div className="flex justify-between items-center pb-2 border-b border-[hsl(var(--border))]">
                    <span className="text-xs text-[hsl(var(--text-4))]">Created</span>
                    <span className="text-sm font-medium">{formatDate(uc.createdDate)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs text-[hsl(var(--text-4))]">Last Updated</span>
                    <span className="text-sm font-medium">{formatDate(uc.lastUpdated)}</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: USE CASE RISKS */}
          <TabsContent value="risks" className="mt-0">
            <div className="bg-surface border border-[hsl(var(--border))]">
              <div className="p-4 border-b border-[hsl(var(--border))] flex justify-between items-center">
                <h3 className="font-semibold">Risk Register</h3>
                <Button size="sm" style={{ borderRadius: 0 }} onClick={() => setShowAddRisk(true)}><Plus size={14} /> Log Risk</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-muted))]">
                      {['Risk ID', 'Title', 'Category', 'Severity', 'Score'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-semibold text-[hsl(var(--text-3))] text-xs uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))]">
                    {linkedRisks.map(r => (
                      <tr key={r.id} className="hover:bg-[hsl(var(--bg-muted))] transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--brand))]">{r.id}</td>
                        <td className="px-4 py-3 font-medium">{r.title}</td>
                        <td className="px-4 py-3 text-[hsl(var(--text-3))]">{r.category}</td>
                        <td className="px-4 py-3">
                          <Badge style={{
                            background: r.severity === 'critical' ? 'hsl(var(--s-er-bg))' : r.severity === 'high' ? 'hsl(var(--s-wn-bg))' : 'hsl(var(--s-nt-bg))',
                            color: r.severity === 'critical' ? 'hsl(var(--destructive))' : r.severity === 'high' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-nt-tx))',
                            borderRadius: 0, fontSize: 10,
                          }}>{r.severity}</Badge>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold">{r.score}</td>
                      </tr>
                    ))}
                    {linkedRisks.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-[hsl(var(--text-4))]">No risks logged against this use case yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: LINKED MODELS */}
          <TabsContent value="models" className="mt-0">
            <div className="bg-surface border border-[hsl(var(--border))]">
              <div className="p-4 border-b border-[hsl(var(--border))] flex justify-between items-center">
                <h3 className="font-semibold">Linked Models ({linkedModels.length})</h3>
                <Button size="sm" variant="outline" style={{ borderRadius: 0 }} onClick={() => setShowLinkModel(true)}><Briefcase size={14} /> Link Existing Model</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-muted))]">
                      {['Model ID', 'Name', 'Version', 'Type', 'Status', 'Risk Tier'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-semibold text-[hsl(var(--text-3))] text-xs uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))]">
                    {linkedModels.map(m => (
                      <tr key={m.id} className="hover:bg-[hsl(var(--bg-muted))] transition-colors cursor-pointer" onClick={() => navigate(`/models/${m.id}`)}>
                        <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--brand))]">{m.id}</td>
                        <td className="px-4 py-3 font-medium">{m.name}</td>
                        <td className="px-4 py-3 text-[hsl(var(--text-3))]">v{m.version}</td>
                        <td className="px-4 py-3 text-[hsl(var(--text-3))]">{m.type}</td>
                        <td className="px-4 py-3"><StatusBadge status={m.status === 'production' ? 'Completed' : 'In Progress'} /></td>
                        <td className="px-4 py-3 text-[hsl(var(--text-3))]">{m.riskTier}</td>
                      </tr>
                    ))}
                    {linkedModels.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-[hsl(var(--text-4))]">No models currently linked.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* TAB 4: FRAMEWORKS */}
          <TabsContent value="frameworks" className="mt-0">
            <div className="bg-surface border border-[hsl(var(--border))]">
              <div className="p-4 border-b border-[hsl(var(--border))]">
                <h3 className="font-semibold">Frameworks & Regulations</h3>
                <p className="text-xs text-[hsl(var(--text-4))] mt-1">Track compliance across attached frameworks.</p>
              </div>
              <Tabs defaultValue="controls" className="w-full">
                <div className="px-6 border-b border-[hsl(var(--border))] pt-2">
                  <TabsList className="bg-transparent h-10 p-0">
                    <TabsTrigger value="controls" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--brand))] data-[state=active]:bg-transparent px-4 font-medium text-sm">
                      Controls
                    </TabsTrigger>
                    <TabsTrigger value="assessments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--brand))] data-[state=active]:bg-transparent px-4 font-medium text-sm">
                      Assessments
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="controls" className="p-6 mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {uc.frameworks.map(fw => (
                      <div key={fw} className="border border-[hsl(var(--border))] p-5 hover:border-[hsl(var(--brand))] transition-colors cursor-pointer">
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="font-bold text-[hsl(var(--brand))]">{fw}</h4>
                          <Badge variant="outline" style={{ borderRadius: 0, fontSize: 10 }}>In Progress</Badge>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-[hsl(var(--text-3))]">Controls Implemented</span>
                            <span className="font-mono">24 / 32</span>
                          </div>
                          <div className="h-1.5 w-full bg-[hsl(var(--bg-muted))] overflow-hidden">
                            <div className="h-full bg-[hsl(var(--s-ok-tx))]" style={{ width: '75%' }} />
                          </div>
                        </div>
                      </div>
                    ))}
                    {uc.frameworks.length === 0 && (
                      <p className="text-[hsl(var(--text-4))] col-span-2">No frameworks attached.</p>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="assessments" className="p-6 mt-0">
                  <div className="border border-[hsl(var(--border))] text-center p-8 text-[hsl(var(--text-3))]">
                    <ListChecks size={32} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium">No assessments started yet.</p>
                    <Button variant="outline" size="sm" className="mt-4" style={{ borderRadius: 0 }} onClick={() => toast.success('Conformity questionnaire started')}>Start Questionnaire</Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>

          {/* TAB 5: CE MARKING */}
          <TabsContent value="ce" className="mt-0">
            <div className="bg-surface border border-[hsl(var(--border))]">
              <div className="p-4 border-b border-[hsl(var(--border))] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-[hsl(var(--brand))]" />
                  <div>
                    <h3 className="font-semibold">CE Marking Conformity Assessment</h3>
                    <p className="text-xs text-[hsl(var(--text-4))]">EU AI Act declaration of conformity checklist for high-risk systems</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold font-mono" style={{ color: ceComplete === ceItems.length ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-1))' }}>{ceComplete}/{ceItems.length}</p>
                  <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--text-4))]">Complete</p>
                </div>
              </div>
              <div className="h-1 w-full bg-[hsl(var(--bg-muted))]">
                <div className="h-full bg-[hsl(var(--s-ok-tx))]" style={{ width: `${(ceComplete / ceItems.length) * 100}%` }} />
              </div>
              <div>
                {ceItems.map(item => (
                  <label key={item.id} className="flex items-center gap-3 px-4 py-3 border-b border-[hsl(var(--border))] cursor-pointer hover:bg-[hsl(var(--bg-muted))]">
                    <input type="checkbox" checked={item.done} onChange={() => toggleCe(item.id)} className="h-4 w-4" style={{ borderRadius: 0 }} />
                    <span className="text-sm flex-1" style={{ color: item.done ? 'hsl(var(--text-3))' : 'hsl(var(--text-1))', textDecoration: item.done ? 'line-through' : 'none' }}>{item.label}</span>
                    <Badge style={{ background: item.done ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--s-wn-bg))', color: item.done ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))', borderRadius: 0, fontSize: 9 }}>{item.done ? 'DONE' : 'PENDING'}</Badge>
                  </label>
                ))}
              </div>
              <div className="p-4 flex justify-between items-center">
                <p className="text-xs text-[hsl(var(--text-4))]">{ceComplete === ceItems.length ? 'All checks complete — ready to sign the Declaration of Conformity.' : `${ceItems.length - ceComplete} item(s) remaining before CE marking.`}</p>
                <Button size="sm" disabled={ceComplete !== ceItems.length} onClick={() => toast.success('EU Declaration of Conformity generated')} style={{ borderRadius: 0 }}>Generate Declaration</Button>
              </div>
            </div>
          </TabsContent>

          {/* TAB 6: ACTIVITY */}
          <TabsContent value="activity" className="mt-0">
            <div className="bg-surface border border-[hsl(var(--border))]">
              <div className="p-4 border-b border-[hsl(var(--border))] flex items-center justify-between">
                <h3 className="font-semibold">Audit Log</h3>
                <span className="text-xs font-mono text-[hsl(var(--text-4))]">{activity.length} events</span>
              </div>
              <div>
                {activity.map((log, i) => {
                  const initials = log.actor.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <div key={i} className="flex items-start gap-3 px-4 py-3 border-b border-[hsl(var(--border))]">
                      <div className="w-7 h-7 flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' }}>{initials}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[hsl(var(--text-1))]">{log.action}</p>
                        <p className="text-[11px] text-[hsl(var(--text-4))] mt-0.5">
                          <span className="font-medium text-[hsl(var(--text-3))]">{log.actor}</span> · {new Date(log.date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* TAB 7: MONITORING */}
          <TabsContent value="monitoring" className="mt-0 space-y-4">
            {linkedModels.length === 0 ? (
              <div className="bg-surface border border-[hsl(var(--border))] p-8 text-center">
                <ChartLineUp size={40} className="mx-auto text-[hsl(var(--text-4))] mb-3" />
                <h3 className="text-base font-bold mb-1">No models linked</h3>
                <p className="text-[hsl(var(--text-3))] text-sm">Link an active model to start post-market monitoring.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Uptime (30d)', value: '99.94%', tx: 'hsl(var(--s-ok-tx))' },
                    { label: 'P95 Latency', value: '142 ms', tx: 'hsl(var(--text-1))' },
                    { label: 'Drift (PSI)', value: '0.07', tx: 'hsl(var(--s-wn-tx))' },
                    { label: 'Open Incidents', value: '1', tx: 'hsl(var(--s-er-tx))' },
                  ].map(m => (
                    <div key={m.label} className="bg-surface border border-[hsl(var(--border))] p-4">
                      <p className="text-[10px] uppercase tracking-wider font-medium text-[hsl(var(--text-4))]">{m.label}</p>
                      <p className="text-2xl font-bold font-mono mt-0.5" style={{ color: m.tx }}>{m.value}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-surface border border-[hsl(var(--border))]">
                  <div className="p-4 border-b border-[hsl(var(--border))]"><h3 className="font-semibold text-sm">Post-Market Signals (30-day)</h3></div>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-muted))]">{['Signal', 'Model', 'Current', 'Threshold', 'Status'].map(h => <th key={h} className="px-4 py-2 text-left text-[10px] uppercase tracking-wider font-semibold text-[hsl(var(--text-4))]">{h}</th>)}</tr></thead>
                    <tbody>
                      {[
                        { sig: 'Accuracy (F1)', cur: '0.913', thr: '≥ 0.85', ok: true },
                        { sig: 'Demographic parity', cur: '0.84', thr: '≥ 0.85', ok: false },
                        { sig: 'Data drift (PSI)', cur: '0.07', thr: '< 0.10', ok: true },
                        { sig: 'Prediction volume', cur: '890K/mo', thr: 'baseline ±20%', ok: true },
                        { sig: 'Override rate (HITL)', cur: '3.2%', thr: '< 5%', ok: true },
                      ].map(r => (
                        <tr key={r.sig} className="border-b border-[hsl(var(--border))]">
                          <td className="px-4 py-2 font-medium">{r.sig}</td>
                          <td className="px-4 py-2 font-mono text-xs text-[hsl(var(--brand))]">{linkedModels[0]?.id ?? '—'}</td>
                          <td className="px-4 py-2 font-mono">{r.cur}</td>
                          <td className="px-4 py-2 font-mono text-xs text-[hsl(var(--text-3))]">{r.thr}</td>
                          <td className="px-4 py-2"><Badge style={{ background: r.ok ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--s-er-bg))', color: r.ok ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))', borderRadius: 0, fontSize: 9 }}>{r.ok ? 'WITHIN' : 'BREACH'}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </TabsContent>

          {/* TAB 8: SETTINGS */}
          <TabsContent value="settings" className="mt-0">
             <div className="bg-surface border border-[hsl(var(--border))] max-w-2xl">
              <div className="p-4 border-b border-[hsl(var(--border))]">
                <h3 className="font-semibold text-[hsl(var(--s-er-tx))]">Danger Zone</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold">Transfer Ownership</h4>
                    <p className="text-xs text-[hsl(var(--text-4))] mt-1">Assign this use case to another user.</p>
                  </div>
                  <Button variant="outline" size="sm" style={{ borderRadius: 0 }} onClick={handleTransfer}>Transfer</Button>
                </div>
                <hr className="border-[hsl(var(--border))]" />
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[hsl(var(--s-er-tx))]">Delete Use Case</h4>
                    <p className="text-xs text-[hsl(var(--text-4))] mt-1">Permanently delete this use case and all assessments.</p>
                  </div>
                  <Button variant="outline" size="sm" style={{ borderRadius: 0, color: 'hsl(var(--s-er-tx))', borderColor: 'hsl(var(--s-er-br))' }} onClick={() => setConfirmDelete(true)}>Delete</Button>
                </div>
              </div>
             </div>
          </TabsContent>

        </div>
      </Tabs>

      {/* Add Risk modal */}
      <Dialog open={showAddRisk} onOpenChange={setShowAddRisk}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 440 }}>
          <DialogHeader><DialogTitle>Log Use Case Risk</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <label className="text-xs font-semibold text-[hsl(var(--text-4))]">Risk title *</label>
              <Input value={riskForm.title} onChange={e => setRiskForm({ ...riskForm, title: e.target.value })} placeholder="e.g. Proxy discrimination via ZIP code" className="mt-1" style={{ borderRadius: 0 }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[hsl(var(--text-4))]">Category</label>
                <select value={riskForm.category} onChange={e => setRiskForm({ ...riskForm, category: e.target.value })} className="mt-1 w-full h-9 px-2 text-sm" style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))' }}>
                  {['Fairness', 'Privacy', 'Security', 'Robustness', 'Transparency', 'Safety', 'Operational'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[hsl(var(--text-4))]">Severity</label>
                <select value={riskForm.severity} onChange={e => setRiskForm({ ...riskForm, severity: e.target.value })} className="mt-1 w-full h-9 px-2 text-sm" style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))' }}>
                  {['critical', 'high', 'medium', 'low'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-[hsl(var(--text-4))]">Risk score (1–25)</label>
              <Input type="number" min={1} max={25} value={riskForm.score} onChange={e => setRiskForm({ ...riskForm, score: Number(e.target.value) })} className="mt-1" style={{ borderRadius: 0 }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAddRisk(false)}>Cancel</Button>
            <Button size="sm" onClick={addRisk}>Log Risk</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Model modal */}
      <Dialog open={showLinkModel} onOpenChange={setShowLinkModel}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader><DialogTitle>Link Existing Model</DialogTitle></DialogHeader>
          <div className="py-1 max-h-80 overflow-y-auto">
            {availableModels.length === 0 ? (
              <p className="text-sm text-[hsl(var(--text-4))] py-6 text-center">All models are already linked to this use case.</p>
            ) : availableModels.map(m => (
              <div key={m.id} className="flex items-center justify-between px-1 py-2 border-b border-[hsl(var(--border))]">
                <div>
                  <p className="text-sm font-medium text-[hsl(var(--text-1))]">{m.name} <span className="text-xs font-mono text-[hsl(var(--text-4))]">{m.id}</span></p>
                  <p className="text-[11px] text-[hsl(var(--text-4))]">{m.type} · v{m.version} · {m.riskTier}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => linkModel(m.id, m.name)}>Link</Button>
              </div>
            ))}
          </div>
          <DialogFooter><Button variant="outline" size="sm" onClick={() => setShowLinkModel(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete use case?"
        description={`This permanently deletes ${uc.title} (${uc.id}) and all its assessments. This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
