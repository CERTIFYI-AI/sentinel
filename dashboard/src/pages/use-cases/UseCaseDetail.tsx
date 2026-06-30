import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { USE_CASES, MODELS, RISKS, formatDate } from '../../data/seed';
import {
  Briefcase, Warning, ShieldCheck, ListChecks, Clock,
  ChartLineUp, Gear, Plus, DownloadSimple, User, GlobeHemisphereWest,
  Buildings, FileText, Cpu, Database, Eye, MagnifyingGlass
} from '@phosphor-icons/react';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    'Completed': { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
    'In Progress': { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(var(--s-wn-tx))' },
    'Under Review': { bg: 'hsl(220 90% 56% / 0.12)', color: 'hsl(var(--s-in-tx))' },
    'Not Started': { bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))' },
    'On Hold': { bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))' },
    'Rejected': { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' },
  };
  const style = map[status] || map['Not Started'];
  return <Badge style={{ background: style.bg, color: style.color, borderRadius: 0, fontSize: 10 }}>{status}</Badge>;
}

function RiskBadge({ riskClass }: { riskClass: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    'High-Risk': { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' },
    'Limited': { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(var(--s-wn-tx))' },
    'Minimal': { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
    'Prohibited': { bg: 'hsl(0 72% 51% / 0.25)', color: 'hsl(var(--destructive))' },
  };
  const style = map[riskClass] || map['Minimal'];
  return <Badge style={{ background: style.bg, color: style.color, borderRadius: 0, fontSize: 10 }}>{riskClass}</Badge>;
}

export default function UseCaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const uc = useMemo(() => USE_CASES.find(u => u.id === id), [id]);

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

  const linkedModels = MODELS.filter(m => uc.linkedModels.includes(m.id));
  const linkedRisks = RISKS.filter(r => uc.linkedModels.includes(r.linkedModel));

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
            <Button variant="outline" size="sm" style={{ borderRadius: 0 }}>
              <DownloadSimple size={14} /> Export PDF
            </Button>
            <Button size="sm" style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
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
                <Button size="sm" style={{ borderRadius: 0 }}><Plus size={14} /> Log Risk</Button>
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
                            background: r.severity === 'critical' ? 'hsl(0 72% 51% / 0.12)' : r.severity === 'high' ? 'hsl(45 93% 47% / 0.12)' : 'hsl(var(--s-nt-bg))',
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
                <Button size="sm" variant="outline" style={{ borderRadius: 0 }}><Briefcase size={14} /> Link Existing Model</Button>
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
                    <Button variant="outline" size="sm" className="mt-4" style={{ borderRadius: 0 }}>Start Questionnaire</Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>

          {/* TAB 5: CE MARKING */}
          <TabsContent value="ce" className="mt-0">
             <div className="bg-surface border border-[hsl(var(--border))] p-8 text-center">
              <ShieldCheck size={48} className="mx-auto text-[hsl(var(--brand))] mb-4" />
              <h3 className="text-lg font-bold mb-2">CE Marking Conformity Assessment</h3>
              <p className="text-[hsl(var(--text-3))] mb-6 max-w-lg mx-auto">
                Generate the technical documentation and declaration of conformity required by the EU AI Act before deploying this high-risk use case.
              </p>
              <Button style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>Start Assessment Checklist</Button>
            </div>
          </TabsContent>

          {/* TAB 6: ACTIVITY */}
          <TabsContent value="activity" className="mt-0">
             <div className="bg-surface border border-[hsl(var(--border))] p-6">
               <h3 className="font-semibold mb-6">Audit Log</h3>
               <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-[hsl(var(--border))]">
                  {[
                    { action: 'Status changed to Under Review', date: '2026-03-20T14:30:00', actor: 'James Patel' },
                    { action: 'Framework EU AI Act added', date: '2026-03-01T09:15:00', actor: 'Raj Gupta' },
                    { action: 'Use case created', date: '2026-02-01T11:00:00', actor: uc.owner }
                  ].map((log, i) => (
                    <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-[hsl(var(--bg-surface))] bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-3))] shadow shrink-0 z-10 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                        <Clock size={16} />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 border border-[hsl(var(--border))] bg-raised shadow-sm">
                        <div className="flex items-center justify-between space-x-2 mb-1">
                          <div className="font-bold text-[hsl(var(--text-1))] text-sm">{log.action}</div>
                          <time className="font-mono text-xs text-[hsl(var(--text-4))]">{new Date(log.date).toLocaleDateString()}</time>
                        </div>
                        <div className="text-[hsl(var(--text-3))] text-xs">by {log.actor}</div>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </TabsContent>

          {/* TAB 7: MONITORING */}
          <TabsContent value="monitoring" className="mt-0">
            <div className="bg-surface border border-[hsl(var(--border))] p-8 text-center">
              <ChartLineUp size={48} className="mx-auto text-[hsl(var(--text-4))] mb-4" />
              <h3 className="text-lg font-bold mb-2">Post-Market Monitoring</h3>
              <p className="text-[hsl(var(--text-3))] mb-6 max-w-lg mx-auto">
                No telemetry data available yet. Link an active model to this use case and deploy to production to start monitoring performance and incidents.
              </p>
            </div>
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
                  <Button variant="outline" size="sm" style={{ borderRadius: 0 }}>Transfer</Button>
                </div>
                <hr className="border-[hsl(var(--border))]" />
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[hsl(var(--s-er-tx))]">Delete Use Case</h4>
                    <p className="text-xs text-[hsl(var(--text-4))] mt-1">Permanently delete this use case and all assessments.</p>
                  </div>
                  <Button variant="outline" size="sm" style={{ borderRadius: 0, color: 'hsl(var(--s-er-tx))', borderColor: 'hsl(var(--s-er-br))' }}>Delete</Button>
                </div>
              </div>
             </div>
          </TabsContent>

        </div>
      </Tabs>
    </div>
  );
}
