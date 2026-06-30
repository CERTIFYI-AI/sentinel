import { useState, useCallback } from 'react';
import {
  Sword, Eye, PencilSimple, Trash, Plus, ShieldWarning, Fire,
  CheckCircle, Warning, Lightning, Target, Clock, Flask,
  ArrowRight, Crosshair, MagnifyingGlass,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { RED_TEAM_EXERCISES, RedTeamExercise, severityColor, statusColor, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useRedTeamFindingsData } from '../../hooks/useRedTeamFindingsData';
import { PageSkeleton } from '../../components/ui/PageSkeleton';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import React from 'react';

const EMPTY_EXERCISE = {
  name: '', attackVector: 'Prompt Injection', targetModel: 'MDL-001',
  lead: '', startDate: new Date().toISOString().split('T')[0], endDate: '',
  description: '', methodology: 'Black-box',
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

interface Finding {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'mitigated' | 'accepted';
  owaspCategory?: string;
}

interface ExtExercise extends RedTeamExercise {
  findings_list: Finding[];
  recommendations: string[];
  attackVectors: string[];
}

// ── Extended Data ─────────────────────────────────────────────────────────────

const EXTENDED_EXERCISES: ExtExercise[] = [
  {
    ...RED_TEAM_EXERCISES[0],
    findings_list: [
      { id: 'F-001', title: 'DAN prompt bypasses safety filter', severity: 'critical', status: 'mitigated', owaspCategory: 'LLM01: Prompt Injection' },
      { id: 'F-002', title: 'AIM jailbreak extracts system prompt', severity: 'critical', status: 'open', owaspCategory: 'LLM01: Prompt Injection' },
      { id: 'F-003', title: 'Role-play bypass leaks PII context', severity: 'critical', status: 'open', owaspCategory: 'LLM06: Sensitive Info Disclosure' },
      { id: 'F-004', title: 'Base64 encoded injection passes filter', severity: 'high', status: 'mitigated', owaspCategory: 'LLM01: Prompt Injection' },
      { id: 'F-005', title: 'Multi-turn attack degrades safety', severity: 'high', status: 'open', owaspCategory: 'LLM01: Prompt Injection' },
      { id: 'F-006', title: 'Token manipulation bypasses word filter', severity: 'medium', status: 'mitigated' },
      { id: 'F-007', title: 'System prompt extraction via completion', severity: 'high', status: 'open', owaspCategory: 'LLM07: Insecure Plugin Design' },
      { id: 'F-008', title: 'Indirect injection via RAG context', severity: 'high', status: 'open', owaspCategory: 'LLM01: Prompt Injection' },
      { id: 'F-009', title: 'Safety degradation after 10+ turns', severity: 'medium', status: 'open' },
      { id: 'F-010', title: 'Prompt prefix override via markdown', severity: 'medium', status: 'mitigated' },
      { id: 'F-011', title: 'Emoji encoding bypasses toxicity filter', severity: 'low', status: 'mitigated' },
      { id: 'F-012', title: 'Context window stuffing weakens guard', severity: 'medium', status: 'open' },
    ],
    recommendations: ['Implement layered guardrail architecture', 'Add BERT-based injection classifier', 'Rotate system prompts monthly', 'Enable multi-turn safety evaluation'],
    attackVectors: ['Prompt Injection', 'Jailbreak', 'Data Extraction', 'Model Inversion', 'Adversarial Input'],
  },
  {
    ...RED_TEAM_EXERCISES[1],
    findings_list: [
      { id: 'F-013', title: 'Missing rate limiting on auth endpoint', severity: 'critical', status: 'mitigated' },
      { id: 'F-014', title: 'JWT token lifetime too long (24h)', severity: 'high', status: 'open' },
      { id: 'F-015', title: 'API key rotation not enforced', severity: 'high', status: 'mitigated' },
      { id: 'F-016', title: 'CORS misconfiguration allows wildcard', severity: 'medium', status: 'mitigated' },
      { id: 'F-017', title: 'Missing MFA on admin endpoints', severity: 'medium', status: 'open' },
    ],
    recommendations: ['Enforce JWT max lifetime of 1h', 'Implement API key rotation policy', 'Restrict CORS to known origins', 'Add MFA for privileged operations'],
    attackVectors: ['Authentication Bypass', 'Token Manipulation', 'CORS Exploitation'],
  },
  {
    ...RED_TEAM_EXERCISES[2],
    findings_list: [
      { id: 'F-018', title: 'DNS exfiltration not detected', severity: 'critical', status: 'open' },
      { id: 'F-019', title: 'Large file upload bypass via chunking', severity: 'critical', status: 'mitigated' },
      { id: 'F-020', title: 'Steganography in API responses', severity: 'high', status: 'open' },
      { id: 'F-021', title: 'Webhook exfiltration to shadow endpoint', severity: 'high', status: 'mitigated' },
      { id: 'F-022', title: 'Log data leakage via debug endpoints', severity: 'high', status: 'mitigated' },
      { id: 'F-023', title: 'Timing-based data extraction', severity: 'medium', status: 'open' },
      { id: 'F-024', title: 'Metadata exfiltration in error messages', severity: 'medium', status: 'mitigated' },
      { id: 'F-025', title: 'Covert channel via model latency', severity: 'low', status: 'open' },
    ],
    recommendations: ['Implement DNS query monitoring', 'Add DLP on all egress points', 'Scrub error messages of metadata', 'Deploy network segmentation'],
    attackVectors: ['Data Exfiltration', 'DNS Tunneling', 'Covert Channel'],
  },
  {
    ...RED_TEAM_EXERCISES[3],
    findings_list: [
      { id: 'F-026', title: 'Direct prompt injection via user input', severity: 'critical', status: 'open', owaspCategory: 'LLM01: Prompt Injection' },
      { id: 'F-027', title: 'Indirect injection via document upload', severity: 'critical', status: 'open', owaspCategory: 'LLM01: Prompt Injection' },
      { id: 'F-028', title: 'Model outputs unsafe SQL in tool call', severity: 'critical', status: 'open', owaspCategory: 'LLM02: Insecure Output' },
      { id: 'F-029', title: 'Training data extraction via probing', severity: 'critical', status: 'open', owaspCategory: 'LLM06: Sensitive Info Disclosure' },
      { id: 'F-030', title: 'Adversarial suffix causes hallucination', severity: 'high', status: 'open', owaspCategory: 'LLM03: Training Data Poisoning' },
      { id: 'F-031', title: 'Context manipulation via long prefix', severity: 'high', status: 'open', owaspCategory: 'LLM01: Prompt Injection' },
      { id: 'F-032', title: 'Model inversion leaks training samples', severity: 'high', status: 'open', owaspCategory: 'LLM06: Sensitive Info Disclosure' },
      { id: 'F-033', title: 'Recursive tool calling DoS', severity: 'medium', status: 'open', owaspCategory: 'LLM04: Model Denial of Service' },
      { id: 'F-034', title: 'Output manipulation via format injection', severity: 'medium', status: 'open', owaspCategory: 'LLM02: Insecure Output' },
    ],
    recommendations: ['Deploy input/output classifier pipeline', 'Implement strict tool call authorization', 'Add adversarial input detection layer', 'Rate-limit recursive agent loops'],
    attackVectors: ['Prompt Injection', 'Jailbreak', 'Data Extraction', 'Model Inversion', 'Adversarial Input'],
  },
];

// ── Status Badge Colors ───────────────────────────────────────────────────────

function campaignStatusBadge(status: string) {
  const map: Record<string, { bg: string; color: string }> = {
    'Planning': { bg: 'hsl(220 90% 56% / 0.12)', color: 'hsl(var(--s-in-tx))' },
    'Active': { bg: 'hsl(45 93% 47% / 0.15)', color: 'hsl(var(--s-wn-tx))' },
    'Completed': { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
    'Archived': { bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))' },
  };
  const normalized = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  const s = map[normalized] || map['Planning'];
  return (
    <Badge style={{ background: s.bg, color: s.color, borderRadius: 0, fontSize: 10 }}>
      {normalized}
    </Badge>
  );
}

// ── Metric Tile ───────────────────────────────────────────────────────────────

function MetricTile({ label, value, variant, icon, sub }: {
  label: string; value: string; variant: 'ok' | 'warn' | 'error' | 'info'; icon: React.ReactNode; sub?: string;
}) {
  const vs = {
    ok: { bg: 'hsl(142 71% 45% / 0.10)', color: 'hsl(var(--s-ok-tx))' },
    warn: { bg: 'hsl(45 93% 47% / 0.10)', color: 'hsl(var(--s-wn-tx))' },
    error: { bg: 'hsl(0 72% 51% / 0.10)', color: 'hsl(var(--destructive))' },
    info: { bg: 'hsl(220 90% 56% / 0.10)', color: 'hsl(var(--s-in-tx))' },
  };
  const s = vs[variant];
  return (
    <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>{label}</span>
          <div className="p-1.5" style={{ background: s.bg, borderRadius: 0 }}>{icon}</div>
        </div>
        <div className="text-2xl font-bold" style={{ color: s.color }}>{value}</div>
        {sub && <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function RedTeamLab() {
  const { orgName } = useSettingsStore();
  const { items: redTeamFindings, isLoading: rtLoading, error, saveRedTeamFindings, removeRedTeamFindings } = useRedTeamFindingsData();
  const [exercises, setExercises] = useState<ExtExercise[]>(EXTENDED_EXERCISES);

  React.useEffect(() => {
    if (redTeamFindings && redTeamFindings.length > 0) {
      setExercises(redTeamFindings as any);
    }
  }, [redTeamFindings]);
  const [selected, setSelected] = useState<ExtExercise | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ExtExercise | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [formEx, setFormEx] = useState({ ...EMPTY_EXERCISE });

  const toast = useCallback((text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // All hooks called above — safe to do early return now
  if (rtLoading) return <PageSkeleton />;
  if (error) return <ErrorState title="Failed to load Red Team Lab" description="We couldn't load the campaign data. Please try again." onRetry={() => window.location.reload()} />;

  const totalFindings = exercises.reduce((a, e) => a + e.findings, 0);
  const criticalFindings = exercises.reduce((a, e) => a + e.criticalFindings, 0);
  const activeCampaigns = exercises.filter(e => e.status === 'active').length;
  const mitigatedFindings = exercises.reduce((a, e) => a + e.findings_list.filter(f => f.status === 'mitigated').length, 0);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setExercises(prev => prev.filter(e => e.id !== deleteTarget.id));
    await removeRedTeamFindings(deleteTarget.id).catch(() => {});
    toast(`Campaign ${deleteTarget.id} deleted`, 'info');
    setDeleteTarget(null);
  };

  const openDetail = (ex: ExtExercise) => { setSelected(ex); setSheetOpen(true); };

  const handleCreate = async () => {
    if (!formEx.name.trim()) return;
    const newExercise: ExtExercise = {
      id: `RT-${String(exercises.length + 1).padStart(3, '0')}`,
      name: formEx.name,
      attackVector: formEx.attackVector,
      status: 'planned',
      findings: 0,
      criticalFindings: 0,
      lead: formEx.lead,
      startDate: formEx.startDate,
      endDate: formEx.endDate,
      targetModel: formEx.targetModel,
      description: formEx.description,
      score: 0,
      findings_list: [],
      recommendations: [],
      attackVectors: [],
    };
    setExercises(prev => [newExercise, ...prev]);
    await saveRedTeamFindings(newExercise).catch(() => {});
    toast(`Exercise "${formEx.name}" created`, 'success');
    setFormEx({ ...EMPTY_EXERCISE });
    setCreateOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="px-4 py-2 text-sm font-medium shadow-lg pointer-events-auto" style={{
            background: t.type === 'success' ? 'hsl(var(--s-ok-tx))' : t.type === 'error' ? 'hsl(var(--destructive))' : 'hsl(var(--s-in-tx))',
            color: 'hsl(var(--bg-surface))', borderRadius: 0, minWidth: 300,
          }}>{t.text}</div>
        ))}
      </div>

      <PageHeader
        title="Red Team Lab"
        subtitle={`${orgName} — Adversarial testing campaigns and AI security exercises`}
        breadcrumbs={[{ label: 'Home', href: '/overview' }, { label: 'Security', href: '/security' }, { label: 'Red Team Lab' }]}
        badge={<Sword size={22} weight="fill" className="text-destructive ml-2" />}
        actions={
          <>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => { setFormEx({ ...EMPTY_EXERCISE }); setCreateOpen(true); }}>
              <Plus size={14} className="mr-2" />Create Exercise
            </Button>
            <Button style={{ borderRadius: 0, background: 'hsl(var(--destructive))', color: 'hsl(var(--bg-surface))' }}>
              <Lightning size={14} className="mr-2" />Launch Campaign
            </Button>
          </>
        }
      />

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricTile label="Total Campaigns" value={String(exercises.length)} variant="info" icon={<Sword size={16} weight="fill" className="text-blue-600 dark:text-blue-400" />} />
        <MetricTile label="Active" value={String(activeCampaigns)} variant="warn" icon={<Lightning size={16} weight="fill" style={{ color: 'hsl(var(--s-wn-tx))' }} />} sub="In progress" />
        <MetricTile label="Critical Findings" value={String(criticalFindings)} variant="error" icon={<Fire size={16} weight="fill" className="text-destructive" />} sub="Require remediation" />
        <MetricTile label="Mitigated Findings" value={String(mitigatedFindings)} variant="ok" icon={<CheckCircle size={16} weight="fill" className="text-green-600 dark:text-green-400" />} />
      </div>

      {/* Table / Empty State */}
      {exercises.length === 0 ? (
        <EmptyState
          icon={<Sword size={32} weight="duotone" />}
          title="No Red Team campaigns yet"
          description="Create your first test to track adversarial evaluations, jailbreak tests, and attack scenarios."
          action={<Button onClick={() => setCreateOpen(true)}><Plus size={14} className="mr-2" />Create Exercise</Button>}
        />
      ) : (
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {['ID', 'Campaign', 'Attack Vector', 'Findings', 'Status', 'Lead', 'Started', 'Completed', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {exercises.map(ex => (
                  <tr key={ex.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{ex.id}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{ex.name}</span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{ex.attackVector}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold" style={{ color: 'hsl(var(--text-1))' }}>{ex.findings}</span>
                        {ex.criticalFindings > 0 && (
                          <Badge style={{ background: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 9 }}>
                            {ex.criticalFindings} critical
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">{campaignStatusBadge(ex.status)}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-1))' }}>{ex.lead}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{formatDate(ex.startDate)}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{ex.endDate ? formatDate(ex.endDate) : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openDetail(ex)}>
                          <Eye size={14} style={{ color: 'hsl(var(--brand))' }} />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openDetail(ex)}>
                          <PencilSimple size={14} style={{ color: 'hsl(var(--text-4))' }} />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteTarget(ex)}>
                          <Trash size={14} className="text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Create Exercise Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0, maxWidth: 580 }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Create Red Team Exercise</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Exercise Name *</Label>
                <Input
                  placeholder="e.g. LLM Jailbreak Campaign Q2 2026"
                  value={formEx.name}
                  onChange={e => setFormEx(p => ({ ...p, name: e.target.value }))}
                  style={{ borderRadius: 0 }}
                />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Attack Vector</Label>
                <select value={formEx.attackVector} onChange={e => setFormEx(p => ({ ...p, attackVector: e.target.value }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '8px 10px', borderRadius: 0, fontSize: 13 }}>
                  {['Prompt Injection', 'Jailbreak / DAN', 'Data Exfiltration', 'Authentication Bypass', 'Model Inversion', 'Adversarial Input', 'Supply Chain Attack', 'API Abuse'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Methodology</Label>
                <select value={formEx.methodology} onChange={e => setFormEx(p => ({ ...p, methodology: e.target.value }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '8px 10px', borderRadius: 0, fontSize: 13 }}>
                  {['Black-box', 'White-box', 'Grey-box', 'Automated Fuzzing', 'Human-in-the-loop'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Target Model</Label>
                <select value={formEx.targetModel} onChange={e => setFormEx(p => ({ ...p, targetModel: e.target.value }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '8px 10px', borderRadius: 0, fontSize: 13 }}>
                  {['MDL-001', 'MDL-002', 'MDL-003', 'MDL-004', 'MDL-005', 'MDL-006', 'All Models'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Team Lead</Label>
                <select value={formEx.lead} onChange={e => setFormEx(p => ({ ...p, lead: e.target.value }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '8px 10px', borderRadius: 0, fontSize: 13 }}>
                  <option value="">Select lead...</option>
                  {['Sarah Chen', 'Maria Santos', 'David Kim', 'Raj Gupta', 'Emma Wilson', 'James Patel'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Start Date</Label>
                <Input type="date" value={formEx.startDate} onChange={e => setFormEx(p => ({ ...p, startDate: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>End Date (optional)</Label>
                <Input type="date" value={formEx.endDate} onChange={e => setFormEx(p => ({ ...p, endDate: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Description / Objectives</Label>
                <Textarea
                  placeholder="Describe the objectives, scope, and success criteria of this exercise..."
                  value={formEx.description}
                  onChange={e => setFormEx(p => ({ ...p, description: e.target.value }))}
                  style={{ borderRadius: 0, minHeight: 80 }}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button
              style={{ borderRadius: 0, background: 'hsl(var(--destructive))', color: 'hsl(var(--bg-surface))' }}
              onClick={handleCreate}
              disabled={!formEx.name.trim()}
            >
              <Plus size={14} className="mr-2" />Create Exercise
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete ConfirmDialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        type="danger"
        title="Delete Campaign"
        message={<p>Delete <strong>{deleteTarget?.id} — {deleteTarget?.name}</strong>? All findings and reports will be archived.</p>}
        confirmLabel="Delete Campaign"
      />

      {/* Campaign Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[640px] sm:max-w-[640px] overflow-y-auto" style={{ borderRadius: 0 }}>
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
                  <Sword size={18} weight="fill" className="text-destructive" />
                  {selected.id} — {selected.name}
                </SheetTitle>
              </SheetHeader>
              <Tabs defaultValue="overview" className="mt-4">
                <TabsList style={{ borderRadius: 0 }}>
                  <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
                  <TabsTrigger value="vectors" style={{ borderRadius: 0 }}>Attack Vectors</TabsTrigger>
                  <TabsTrigger value="findings" style={{ borderRadius: 0 }}>Findings</TabsTrigger>
                  <TabsTrigger value="recommendations" style={{ borderRadius: 0 }}>Recommendations</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Status</span>
                      <div className="mt-1">{campaignStatusBadge(selected.status)}</div>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Security Score</span>
                      <p className="text-lg font-bold mt-1" style={{ color: selected.score >= 70 ? 'hsl(var(--s-ok-tx))' : selected.score >= 50 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--destructive))' }}>
                        {selected.score}/100
                      </p>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Lead</span>
                      <p className="text-sm font-medium mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selected.lead}</p>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Target Model</span>
                      <p className="text-sm font-mono mt-1" style={{ color: 'hsl(var(--brand))' }}>{selected.targetModel || 'Platform-wide'}</p>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Duration</span>
                      <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-1))' }}>
                        {formatDate(selected.startDate)} — {selected.endDate ? formatDate(selected.endDate) : 'Ongoing'}
                      </p>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Total Findings</span>
                      <p className="text-lg font-bold mt-1" style={{ color: 'hsl(var(--text-1))' }}>
                        {selected.findings} <span className="text-xs font-normal text-destructive">({selected.criticalFindings} critical)</span>
                      </p>
                    </div>
                  </div>
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Description</span>
                    <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selected.description}</p>
                  </div>
                </TabsContent>

                <TabsContent value="vectors" className="space-y-3 mt-4">
                  {selected.attackVectors.map((vec, i) => (
                    <div key={i} className="flex items-center gap-3 p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <Crosshair size={14} className="text-destructive" />
                      <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{vec}</span>
                    </div>
                  ))}
                  {selected.targetModel === 'MDL-004' && (
                    <div className="p-3 mt-2" style={{ background: 'hsl(45 93% 47% / 0.08)', border: '1px solid hsl(45 93% 47% / 0.3)', borderRadius: 0 }}>
                      <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--s-wn-tx))' }}>OWASP LLM Top 10 Coverage</p>
                      <div className="flex flex-wrap gap-2">
                        {['LLM01: Prompt Injection', 'LLM02: Insecure Output', 'LLM03: Training Data Poisoning', 'LLM04: Model DoS', 'LLM06: Sensitive Info Disclosure', 'LLM07: Insecure Plugin Design'].map(cat => (
                          <Badge key={cat} style={{ background: 'hsl(45 93% 47% / 0.15)', color: 'hsl(var(--s-wn-tx))', borderRadius: 0, fontSize: 10 }}>{cat}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="findings" className="space-y-2 mt-4">
                  {selected.findings_list.map(f => {
                    const sc = severityColor(f.severity);
                    const fstc = statusColor(f.status);
                    return (
                      <div key={f.id} className="flex items-center justify-between p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{f.id}</span>
                            <Badge style={{ background: sc.bg, color: sc.text, borderRadius: 0, fontSize: 9 }}>{f.severity.toUpperCase()}</Badge>
                            <Badge style={{ background: fstc.bg, color: fstc.text, borderRadius: 0, fontSize: 9 }}>{f.status}</Badge>
                          </div>
                          <p className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{f.title}</p>
                          {f.owaspCategory && (
                            <Badge className="mt-1" style={{ background: 'hsl(220 90% 56% / 0.10)', color: 'hsl(var(--s-in-tx))', borderRadius: 0, fontSize: 9 }}>
                              {f.owaspCategory}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </TabsContent>

                <TabsContent value="recommendations" className="space-y-3 mt-4">
                  {selected.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <div className="flex items-center justify-center w-5 h-5 text-xs font-bold" style={{ background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))', borderRadius: 0, minWidth: 20 }}>
                        {i + 1}
                      </div>
                      <span className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{rec}</span>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
