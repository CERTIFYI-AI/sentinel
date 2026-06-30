import { useState } from 'react';
import {
  Siren, Plus, Eye, Play, CheckCircle, Warning, Clock,
  ArrowRight, MagnifyingGlass, Export, User, Bell, FileText,
  ShieldWarning, Brain, Lock, Database,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Progress } from '../../components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { formatDate } from '../../data/seed';


type PlaybookStatus = 'Draft' | 'Active' | 'Deprecated';
type IncidentPhase = 'Detection' | 'Containment' | 'Eradication' | 'Recovery' | 'Post-Incident';

interface EscalationTier {
  tier: number; role: string; name: string; contact: string; slaMinutes: number;
}
interface PlaybookStep {
  id: string; phase: IncidentPhase; title: string; description: string;
  owner: string; timeboxMinutes: number; checkboxes: string[];
}
interface RegulatoryNotification {
  authority: string; deadline: string; trigger: string; template: string;
}
interface Playbook {
  id: string; name: string; category: string; icon: typeof Siren;
  status: PlaybookStatus; version: string; lastUpdated: string; testedDate: string;
  description: string; triggerConditions: string[];
  escalationChain: EscalationTier[];
  steps: PlaybookStep[];
  regulatoryNotifications: RegulatoryNotification[];
  timeToContainSLA: number;
}

interface ActiveIncident {
  id: string; playbookId: string; playbookName: string; startedAt: string;
  currentPhase: IncidentPhase; completedSteps: string[]; severity: string;
  incidentCommander: string; collaborators: string[];
  lessonsLearned?: string; closedAt?: string;
}

const PLAYBOOKS: Playbook[] = [
  {
    id: 'PB-001', name: 'AI Model Failure', category: 'Model Incident', icon: Brain,
    status: 'Active', version: 'v2.1', lastUpdated: '2026-03-15', testedDate: '2026-03-01',
    description: 'Structured response for AI model performance degradation, errors exceeding SLA, or unexpected outputs affecting end users.',
    triggerConditions: ['Error rate > 5%', 'Trust score drop > 20 points', 'P99 latency > 5× baseline', 'HITL override rate > 30%'],
    timeToContainSLA: 60,
    escalationChain: [
      { tier: 1, role: 'On-Call ML Engineer', name: 'Maria Santos', contact: '+1-555-0101', slaMinutes: 15 },
      { tier: 2, role: 'Model Risk Manager', name: 'Raj Gupta', contact: '+1-555-0102', slaMinutes: 30 },
      { tier: 3, role: 'CISO', name: 'Sarah Chen', contact: '+1-555-0103', slaMinutes: 60 },
      { tier: 4, role: 'CTO', name: 'Marcus Johnson', contact: '+1-555-0104', slaMinutes: 90 },
    ],
    steps: [
      { id: 'S-001', phase: 'Detection', title: 'Confirm and scope the incident', description: 'Verify alert is not a false positive. Identify affected model(s), endpoints, and estimated user impact.', owner: 'On-Call ML Engineer', timeboxMinutes: 10, checkboxes: ['Alert verified — not a false positive', 'Affected model(s) identified', 'User impact estimated', 'Incident ticket created in Jira'] },
      { id: 'S-002', phase: 'Containment', title: 'Activate kill switch or traffic routing', description: 'Route traffic to fallback model or suspend endpoint. Update API gateway rules to prevent further impact.', owner: 'On-Call ML Engineer', timeboxMinutes: 15, checkboxes: ['Kill switch activated or traffic rerouted', 'Fallback model confirmed operational', 'API gateway rules updated', 'Impacted users notified (internal)'] },
      { id: 'S-003', phase: 'Eradication', title: 'Root cause analysis', description: 'Analyze logs, traces, and model metrics to identify root cause. Review recent code changes, data pipeline updates, or upstream API changes.', owner: 'ML Engineer + Model Risk Mgr', timeboxMinutes: 120, checkboxes: ['Logs and traces reviewed', 'Root cause identified', 'Timeline of events documented', 'Contributing factors listed'] },
      { id: 'S-004', phase: 'Recovery', title: 'Remediate and restore service', description: 'Apply fix (rollback, retrain, or patch). Validate in staging before production promotion. Monitor for 30 minutes post-recovery.', owner: 'ML Engineer', timeboxMinutes: 60, checkboxes: ['Fix applied and tested in staging', 'Promoted to production with canary traffic', 'Monitoring active — no regressions', 'Stakeholders notified of recovery'] },
      { id: 'S-005', phase: 'Post-Incident', title: 'Post-incident review and lessons learned', description: 'Conduct blameless post-mortem within 5 business days. Document root cause, timeline, impact, and corrective actions.', owner: 'Incident Commander', timeboxMinutes: 90, checkboxes: ['Post-mortem meeting scheduled', 'Root cause and timeline documented', 'Corrective actions assigned with owners', 'Post-mortem report filed in evidence vault', 'Playbook updated if gaps found'] },
    ],
    regulatoryNotifications: [
      { authority: 'AI Ethics Board', deadline: 'Within 4 hours', trigger: 'Any model incident affecting >1000 users', template: 'Notify AI Ethics Board via email with incident ID, affected model, impact estimate, and containment status.' },
      { authority: 'EU Notified Body', deadline: 'Within 72 hours', trigger: 'Incident involving Annex III high-risk AI system', template: 'File incident report per EU AI Act Article 62 via EASA/Market Surveillance Authority portal.' },
    ],
  },
  {
    id: 'PB-002', name: 'Bias Incident', category: 'Fairness Incident', icon: ShieldWarning,
    status: 'Active', version: 'v1.3', lastUpdated: '2026-02-28', testedDate: '2026-02-15',
    description: 'Response for detected bias violations or fairness threshold breaches in production AI systems, particularly those subject to ECOA, GDPR, or EU AI Act.',
    triggerConditions: ['Demographic parity gap > 15%', 'Adverse impact ratio < 0.8', 'Bias audit FAIL', 'Automated bias alert from trust engine'],
    timeToContainSLA: 120,
    escalationChain: [
      { tier: 1, role: 'On-Call ML Engineer', name: 'Maria Santos', contact: '+1-555-0101', slaMinutes: 15 },
      { tier: 2, role: 'VP Compliance', name: 'James Patel', contact: '+1-555-0105', slaMinutes: 30 },
      { tier: 3, role: 'General Counsel', name: 'Linda Park', contact: '+1-555-0106', slaMinutes: 60 },
      { tier: 4, role: 'CISO + CEO', name: 'Sarah Chen + CEO', contact: '+1-555-0107', slaMinutes: 120 },
    ],
    steps: [
      { id: 'S-101', phase: 'Detection', title: 'Quantify bias violation', description: 'Run full bias audit to quantify the gap. Identify which protected classes are affected and estimate how many decisions were impacted.', owner: 'ML Engineer', timeboxMinutes: 30, checkboxes: ['Full bias audit completed', 'Affected protected classes identified', 'Number of impacted decisions estimated', 'Legal counsel notified'] },
      { id: 'S-102', phase: 'Containment', title: 'Suspend or restrict model', description: 'Activate kill switch or route to human reviewers for all affected decision types. Do not continue automated decisions until bias is remediated.', owner: 'ML Engineer + Compliance', timeboxMinutes: 30, checkboxes: ['Automated decisions suspended for affected cohort', 'Human review queue activated', 'Customer-facing notifications prepared'] },
      { id: 'S-103', phase: 'Eradication', title: 'Root cause and remediation plan', description: 'Identify training data bias, feature proxy, or model weighting issue. Develop remediation plan reviewed by AI Ethics Board.', owner: 'ML Engineer + AI Ethics Board', timeboxMinutes: 480, checkboxes: ['Root cause identified', 'Remediation plan drafted', 'AI Ethics Board approval obtained', 'Regulatory notification filed if required'] },
      { id: 'S-104', phase: 'Recovery', title: 'Re-train, validate, and restore', description: 'Apply remediation. Run full bias audit and fairness validation before restoring production traffic.', owner: 'ML Engineer', timeboxMinutes: 240, checkboxes: ['Re-training completed with debiased data', 'Bias audit PASSED on new model', 'Model Validation Lab sign-off obtained', 'Gradual traffic restoration with monitoring'] },
      { id: 'S-105', phase: 'Post-Incident', title: 'Remediation review and regulatory reporting', description: 'File required regulatory reports. Review all past decisions that may have been affected. Implement monitoring improvements.', owner: 'Compliance + Legal', timeboxMinutes: 480, checkboxes: ['Past affected decisions reviewed and corrected', 'Regulatory reports filed', 'Post-mortem completed', 'Enhanced bias monitoring deployed'] },
    ],
    regulatoryNotifications: [
      { authority: 'EC Market Surveillance Authority', deadline: 'Within 72 hours', trigger: 'Bias incident in Annex III high-risk AI system', template: 'Report per EU AI Act Article 62. Include: incident description, root cause, affected users, corrective actions taken.' },
      { authority: 'CFPB / FRB', deadline: 'Within 15 business days', trigger: 'Fair lending violation detected', template: 'Self-disclosure to CFPB via HMDA reporting channel. Include statistical analysis and remediation plan.' },
    ],
  },
  {
    id: 'PB-003', name: 'Data Breach', category: 'Security Incident', icon: Lock,
    status: 'Active', version: 'v3.0', lastUpdated: '2026-01-10', testedDate: '2026-01-05',
    description: 'Response for unauthorized access, exfiltration, or exposure of personal data used in AI training or inference pipelines.',
    triggerConditions: ['Unauthorized data access detected', 'PII exfiltration alert', 'Anomalous model query patterns suggesting extraction', 'Third-party vendor breach involving AI data'],
    timeToContainSLA: 30,
    escalationChain: [
      { tier: 1, role: 'Security Engineer', name: 'On-Call Security', contact: '+1-555-0200', slaMinutes: 10 },
      { tier: 2, role: 'CISO', name: 'Sarah Chen', contact: '+1-555-0103', slaMinutes: 20 },
      { tier: 3, role: 'General Counsel', name: 'Linda Park', contact: '+1-555-0106', slaMinutes: 30 },
      { tier: 4, role: 'CEO + Board Chair', name: 'Executive Team', contact: 'exec@acme.com', slaMinutes: 60 },
    ],
    steps: [
      { id: 'S-201', phase: 'Detection', title: 'Isolate and preserve evidence', description: 'Immediately isolate affected systems. Preserve logs and forensic evidence before containment actions.', owner: 'Security Engineer', timeboxMinutes: 15, checkboxes: ['Affected systems isolated', 'Logs preserved and tamper-proofed', 'CISO and Legal notified', 'Breach scope initially assessed'] },
      { id: 'S-202', phase: 'Containment', title: 'Revoke access and patch vector', description: 'Revoke compromised credentials. Patch the attack vector. Block exfiltration channels.', owner: 'Security + CISO', timeboxMinutes: 30, checkboxes: ['Compromised credentials revoked', 'Attack vector patched', 'Exfiltration channels blocked', 'External comms to attackers cut'] },
      { id: 'S-203', phase: 'Eradication', title: 'Full forensic investigation', description: 'Conduct forensic investigation. Identify all data accessed/exfiltrated, root cause, and attacker methods.', owner: 'Security + External Forensics', timeboxMinutes: 480, checkboxes: ['Forensic investigation complete', 'All affected data catalogued', 'Attack timeline reconstructed', 'No persistence mechanisms remain'] },
      { id: 'S-204', phase: 'Recovery', title: 'Restore and harden', description: 'Restore systems from clean backups. Implement additional controls. Monitor for re-attack indicators.', owner: 'Security + IT', timeboxMinutes: 240, checkboxes: ['Systems restored from clean backups', 'Additional security controls deployed', 'Continuous monitoring active', 'All access reviewed and re-provisioned'] },
      { id: 'S-205', phase: 'Post-Incident', title: 'Regulatory notification and remediation', description: 'File all required data breach notifications. Notify affected individuals. Complete post-mortem and security hardening.', owner: 'Legal + Compliance', timeboxMinutes: 2880, checkboxes: ['GDPR 72h notification filed (if applicable)', 'SEC 4-day notification filed (if applicable)', 'Affected individuals notified', 'Post-mortem completed and published'] },
    ],
    regulatoryNotifications: [
      { authority: 'ICO / EU DPA', deadline: '72 hours from discovery', trigger: 'Any breach involving EU resident personal data', template: 'GDPR Article 33 notification. Required fields: nature of breach, categories/approximate number of data subjects, likely consequences, measures taken.' },
      { authority: 'SEC', deadline: '4 business days', trigger: 'Material cybersecurity incident (public company)', template: 'SEC Form 8-K Item 1.05 filing. Describe incident, material impact, and remediation steps.' },
    ],
  },
];

const ACTIVE_INCIDENTS: ActiveIncident[] = [
  {
    id: 'INC-ACTIVE-001', playbookId: 'PB-001', playbookName: 'AI Model Failure',
    startedAt: '2026-04-10 07:32:00', currentPhase: 'Containment',
    completedSteps: ['S-001'],
    severity: 'critical', incidentCommander: 'Raj Gupta',
    collaborators: ['Maria Santos', 'Sarah Chen'],
  },
];

const PHASE_ORDER: IncidentPhase[] = ['Detection', 'Containment', 'Eradication', 'Recovery', 'Post-Incident'];

const PHASE_COLORS: Record<IncidentPhase, string> = {
  Detection: 'hsl(var(--brand))',
  Containment: 'hsl(var(--s-wn-tx))',
  Eradication: 'hsl(var(--s-er-tx))',
  Recovery: 'hsl(var(--s-ok-tx))',
  'Post-Incident': 'hsl(var(--tag-purple))',
};

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

export default function IncidentPlaybooks() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Playbook | null>(null);
  const [tab, setTab] = useState('steps');
  const [activeIncident, setActiveIncident] = useState<ActiveIncident | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [runPlaybookOpen, setRunPlaybookOpen] = useState(false);

  const addToast = (text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, text, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };

  const filtered = PLAYBOOKS.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Toast */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className="px-4 py-2 rounded text-sm text-white shadow-lg"
            style={{ background: t.type === 'success' ? 'hsl(var(--s-ok-tx))' : t.type === 'error' ? 'hsl(var(--s-er-tx))' : '#3b82f6' }}>
            {t.text}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
            <Siren size={20} weight="duotone" className="text-[hsl(var(--brand))]" />
            Incident Response Playbooks
          </h1>
          <p className="text-sm text-[hsl(var(--text-3))] mt-0.5">Pre-built playbooks · escalation chains · regulatory notification automation</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 rounded-none" onClick={() => addToast('Playbooks exported')}>
            <Export size={14} /> Export
          </Button>
          <Button size="sm" className="gap-1.5 rounded-none bg-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.9)]" onClick={() => setRunPlaybookOpen(true)}>
            <Play size={14} /> Activate Playbook
          </Button>
        </div>
      </div>

      {/* Active Incident Banner */}
      {ACTIVE_INCIDENTS.length > 0 && (
        <div className="border border-[hsl(var(--destructive)/0.5)] bg-[hsl(var(--destructive)/0.08)] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Siren size={18} className="text-[hsl(var(--destructive))]" weight="fill" />
              <div>
                <p className="text-sm font-semibold text-[hsl(var(--destructive))]">ACTIVE INCIDENT — {ACTIVE_INCIDENTS[0].playbookName}</p>
                <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">
                  Commander: {ACTIVE_INCIDENTS[0].incidentCommander} · Phase: {ACTIVE_INCIDENTS[0].currentPhase} · Started: {ACTIVE_INCIDENTS[0].startedAt}
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="rounded-none border-[hsl(var(--destructive))] text-[hsl(var(--destructive))]"
              onClick={() => { setActiveIncident(ACTIVE_INCIDENTS[0]); setSelected(PLAYBOOKS.find(p => p.id === ACTIVE_INCIDENTS[0].playbookId) || null); setTab('steps'); }}>
              Open War Room <ArrowRight size={13} />
            </Button>
          </div>
          <div className="flex items-center gap-1 mt-3">
            {PHASE_ORDER.map((phase, i) => {
              const isComplete = PHASE_ORDER.indexOf(ACTIVE_INCIDENTS[0].currentPhase) > i;
              const isCurrent = ACTIVE_INCIDENTS[0].currentPhase === phase;
              return (
                <div key={phase} className="flex items-center gap-1">
                  <div className="flex items-center gap-1 px-2 py-1 text-xs"
                    style={{ background: isCurrent ? PHASE_COLORS[phase] + '20' : isComplete ? 'hsl(var(--s-ok-tx))' + '20' : 'transparent',
                      color: isCurrent ? PHASE_COLORS[phase] : isComplete ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-4))',
                      border: `1px solid ${isCurrent ? PHASE_COLORS[phase] : isComplete ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--border))'}` }}>
                    {isComplete && <CheckCircle size={10} className="mr-1" />}
                    {phase}
                  </div>
                  {i < PHASE_ORDER.length - 1 && <ArrowRight size={10} className="text-[hsl(var(--text-4))]" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Playbooks', value: PLAYBOOKS.length, color: 'hsl(var(--brand))' },
          { label: 'Active Incidents', value: ACTIVE_INCIDENTS.length, color: ACTIVE_INCIDENTS.length > 0 ? 'hsl(var(--s-er-tx))' : 'hsl(var(--s-ok-tx))' },
          { label: 'Last Tested', value: '32d ago', color: 'hsl(var(--s-wn-tx))' },
          { label: 'Avg Contain SLA', value: `${Math.round(PLAYBOOKS.reduce((s, p) => s + p.timeToContainSLA, 0) / PLAYBOOKS.length)}m`, color: 'hsl(var(--brand))' },
        ].map(s => (
          <Card key={s.label} style={{ borderRadius: 0 }}>
            <CardContent className="px-4 py-3">
              <p className="text-xs text-[hsl(var(--text-4))] mb-1">{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <MagnifyingGlass size={14} className="absolute left-2.5 top-2.5 text-[hsl(var(--text-4))]" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search playbooks..." className="pl-8 rounded-none h-8 text-sm" />
      </div>

      {/* Playbook Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(pb => {
          const Icon = pb.icon;
          return (
            <Card key={pb.id} style={{ borderRadius: 0, cursor: 'pointer' }} onClick={() => { setSelected(pb); setTab('steps'); setActiveIncident(null); }}
              className="hover:border-[hsl(var(--brand))] transition-colors">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={18} className="text-[hsl(var(--brand))]" weight="duotone" />
                    <div>
                      <p className="font-medium text-sm text-[hsl(var(--text-1))]">{pb.name}</p>
                      <p className="text-xs text-[hsl(var(--text-3))]">{pb.category}</p>
                    </div>
                  </div>
                  <Badge style={{ background: pb.status === 'Active' ? 'hsl(142 71% 45% / 0.12)' : 'hsl(220 14% 60% / 0.15)', color: pb.status === 'Active' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-3))', borderRadius: 0, fontSize: 10 }}>{pb.status}</Badge>
                </div>
                <p className="text-xs text-[hsl(var(--text-3))] line-clamp-2">{pb.description}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[hsl(var(--text-4))]">Steps</span>
                    <p className="font-medium text-[hsl(var(--text-2))]">{pb.steps.length} phases</p>
                  </div>
                  <div>
                    <span className="text-[hsl(var(--text-4))]">Contain SLA</span>
                    <p className="font-medium text-[hsl(var(--text-2))]">{pb.timeToContainSLA}min</p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-[hsl(var(--border))] pt-2">
                  <span className="text-xs text-[hsl(var(--text-4))]">{pb.version} · Tested {formatDate(pb.testedDate)}</span>
                  <Button size="sm" variant="outline" className="h-6 text-xs rounded-none gap-1" onClick={e => { e.stopPropagation(); addToast(`${pb.name} playbook activated`, 'info'); }}>
                    <Play size={10} /> Activate
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Playbook Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={v => !v && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto" style={{ borderRadius: 0 }}>
          {selected && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle className="text-base">{selected.name}</SheetTitle>
                    <p className="text-xs text-[hsl(var(--text-3))] mt-1">{selected.category} · {selected.version} · Last updated: {formatDate(selected.lastUpdated)}</p>
                  </div>
                  <Badge style={{ background: selected.status === 'Active' ? 'hsl(142 71% 45% / 0.12)' : 'hsl(220 14% 60% / 0.15)', color: selected.status === 'Active' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-3))', borderRadius: 0, fontSize: 10 }}>{selected.status}</Badge>
                </div>
                <p className="text-xs text-[hsl(var(--text-3))] border-l-2 border-[hsl(var(--brand))] pl-3 py-1">{selected.description}</p>
              </SheetHeader>

              {activeIncident && (
                <div className="mb-4 p-3 border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)]">
                  <p className="text-xs font-semibold text-[hsl(var(--destructive))] mb-1">WAR ROOM — ACTIVE INCIDENT {activeIncident.id}</p>
                  <p className="text-xs text-[hsl(var(--text-3))]">Commander: {activeIncident.incidentCommander} · Collaborators: {activeIncident.collaborators.join(', ')}</p>
                </div>
              )}

              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="rounded-none w-full">
                  <TabsTrigger value="steps" className="rounded-none flex-1 text-xs">Playbook Steps</TabsTrigger>
                  <TabsTrigger value="escalation" className="rounded-none flex-1 text-xs">Escalation Chain</TabsTrigger>
                  <TabsTrigger value="notifications" className="rounded-none flex-1 text-xs">Regulatory Notices</TabsTrigger>
                </TabsList>

                <TabsContent value="steps" className="mt-4 space-y-3">
                  {/* Trigger Conditions */}
                  <div className="p-3 border border-[hsl(var(--border))] bg-surface">
                    <p className="text-xs font-medium text-[hsl(var(--text-3))] mb-2">TRIGGER CONDITIONS</p>
                    <div className="flex flex-wrap gap-2">
                      {selected.triggerConditions.map(tc => (
                        <Badge key={tc} style={{ background: 'hsl(0 72% 51% / 0.1)', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 10 }}>{tc}</Badge>
                      ))}
                    </div>
                  </div>

                  {/* Steps by Phase */}
                  {selected.steps.map((step, i) => {
                    const isCompleted = activeIncident?.completedSteps.includes(step.id);
                    const isCurrent = activeIncident?.currentPhase === step.phase && !isCompleted;
                    return (
                      <div key={step.id} className="border border-[hsl(var(--border))] p-3 space-y-2"
                        style={{ borderLeft: `3px solid ${PHASE_COLORS[step.phase]}`, opacity: activeIncident && !isCompleted && !isCurrent ? 0.6 : 1 }}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <Badge style={{ background: PHASE_COLORS[step.phase] + '20', color: PHASE_COLORS[step.phase], borderRadius: 0, fontSize: 10 }}>{step.phase}</Badge>
                              {isCompleted && <CheckCircle size={14} className="text-[hsl(var(--s-ok-tx))]" weight="fill" />}
                              {isCurrent && <span className="text-xs text-[hsl(var(--s-wn-tx))] font-medium">● CURRENT</span>}
                            </div>
                            <p className="text-sm font-medium text-[hsl(var(--text-1))]">{step.title}</p>
                            <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{step.description}</p>
                          </div>
                          <div className="text-right flex-shrink-0 text-xs text-[hsl(var(--text-3))]">
                            <Clock size={10} className="inline mr-1" />{step.timeboxMinutes}m
                          </div>
                        </div>
                        <div className="space-y-1">
                          {step.checkboxes.map((cb, j) => (
                            <div key={j} className="flex items-start gap-2 text-xs text-[hsl(var(--text-2))]">
                              <div className="w-3 h-3 border border-[hsl(var(--border))] flex-shrink-0 mt-0.5"
                                style={{ background: isCompleted ? 'hsl(var(--s-ok-tx))' : 'transparent' }} />
                              <span>{cb}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-[hsl(var(--text-4))]">Owner: {step.owner}</p>
                      </div>
                    );
                  })}
                </TabsContent>

                <TabsContent value="escalation" className="mt-4 space-y-3">
                  <p className="text-xs text-[hsl(var(--text-3))]">Escalate when the previous tier doesn't respond within SLA. Contact information verified monthly.</p>
                  {selected.escalationChain.map((tier, i) => (
                    <div key={tier.tier} className="flex items-center gap-3 p-3 border border-[hsl(var(--border))]">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: `hsl(${220 + i * 30} 70% 50%)` }}>
                        T{tier.tier}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[hsl(var(--text-1))]">{tier.name}</p>
                        <p className="text-xs text-[hsl(var(--text-3))]">{tier.role}</p>
                        <p className="text-xs font-mono text-[hsl(var(--text-4))]">{tier.contact}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[hsl(var(--brand))]">{tier.slaMinutes}m</p>
                        <p className="text-xs text-[hsl(var(--text-4))]">SLA</p>
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="notifications" className="mt-4 space-y-3">
                  {selected.regulatoryNotifications.map((n, i) => (
                    <div key={i} className="border border-[hsl(var(--border))] p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-[hsl(var(--text-1))]">{n.authority}</p>
                        <Badge style={{ background: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 10 }}>
                          <Clock size={10} className="mr-1" />{n.deadline}
                        </Badge>
                      </div>
                      <p className="text-xs text-[hsl(var(--text-3))]"><strong>Trigger:</strong> {n.trigger}</p>
                      <p className="text-xs text-[hsl(var(--text-3))] bg-surface p-2">{n.template}</p>
                      <Button size="sm" variant="outline" className="gap-1.5 rounded-none h-7 text-xs" onClick={() => addToast(`Notification draft prepared for ${n.authority}`)}>
                        <Bell size={12} /> Generate Notification
                      </Button>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Activate Dialog */}
      <Dialog open={runPlaybookOpen} onOpenChange={setRunPlaybookOpen}>
        <DialogContent className="sm:max-w-md" style={{ borderRadius: 0 }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[hsl(var(--destructive))]">
              <Siren size={16} /> Activate Incident Playbook
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Playbook</Label>
              <Select>
                <SelectTrigger className="rounded-none mt-1 text-sm"><SelectValue placeholder="Select playbook" /></SelectTrigger>
                <SelectContent>
                  {PLAYBOOKS.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Incident Severity</Label>
              <Select>
                <SelectTrigger className="rounded-none mt-1 text-sm"><SelectValue placeholder="Select severity" /></SelectTrigger>
                <SelectContent>
                  {['critical', 'high', 'medium', 'low'].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Incident Commander</Label>
              <Select>
                <SelectTrigger className="rounded-none mt-1 text-sm"><SelectValue placeholder="Assign commander" /></SelectTrigger>
                <SelectContent>
                  {['Sarah Chen', 'James Patel', 'Raj Gupta', 'Maria Santos'].map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="rounded-none" onClick={() => setRunPlaybookOpen(false)}>Cancel</Button>
            <Button size="sm" className="rounded-none bg-[hsl(var(--destructive))]" onClick={() => { setRunPlaybookOpen(false); addToast('Incident playbook activated — war room opened', 'info'); }}>
              Activate & Open War Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
