import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { toast } from 'sonner';
import { formatDate } from '../../data/seed';
import { useUseCase, useUseCases, useModelOptions } from '@/hooks/useAiiaData';
import { RISK_CLASS_OPTIONS, type UseCaseRiskClass } from '@/services/useCaseService';
import {
  Briefcase, Warning, ListChecks, Clock, ChartLineUp, Gear,
  DownloadSimple, User, GlobeHemisphereWest, Buildings, FileText,
  Trash, CircleNotch, ArrowSquareOut, ShieldCheck,
} from '@phosphor-icons/react';

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  draft:         { label: 'Draft',        bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))' },
  under_review:  { label: 'Under Review', bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
  active:        { label: 'Active',       bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  approved:      { label: 'Approved',     bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  retired:       { label: 'Retired',      bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))' },
};
const RISK_META: Record<string, { bg: string; color: string }> = {
  high:         { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
  limited:      { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  minimal:      { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  unacceptable: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
};
const riskLabel = (v: string) => RISK_CLASS_OPTIONS.find(o => o.value === v)?.label ?? v;

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))' };
  return <Badge style={{ background: meta.bg, color: meta.color, borderRadius: 0, fontSize: 10 }}>{meta.label}</Badge>;
}
function RiskBadge({ riskClass }: { riskClass: UseCaseRiskClass }) {
  const style = RISK_META[riskClass] ?? RISK_META.minimal;
  return <Badge style={{ background: style.bg, color: style.color, borderRadius: 0, fontSize: 10 }}>{riskLabel(riskClass)}</Badge>;
}

function EmptyState({ icon: Icon, title, hint }: { icon: any; title: string; hint?: string }) {
  return (
    <div className="border border-[hsl(var(--border))] text-center p-10">
      <Icon size={32} className="mx-auto mb-3" style={{ color: 'hsl(var(--text-4))' }} />
      <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{title}</p>
      {hint && <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>{hint}</p>}
    </div>
  );
}

export default function UseCaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: uc, isLoading, error } = useUseCase(id);
  const { update, remove } = useUseCases();
  const { models } = useModelOptions();

  const handleDelete = () => {
    if (!id) return;
    remove.mutate(id, {
      onSuccess: () => { toast.success('Use case deleted'); navigate('/use-cases'); },
      onError: (err) => toast.error((err as Error).message),
    });
    setConfirmDelete(false);
  };

  const handleTransfer = () => {
    if (!uc) return;
    const owner = window.prompt('Transfer ownership to (name or email):');
    if (!owner || !owner.trim()) return;
    update.mutate({ id: uc.id, patch: { owner: owner.trim() } }, {
      onSuccess: () => toast.success(`Ownership transferred to ${owner.trim()}`),
      onError: (err) => toast.error((err as Error).message),
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center" style={{ color: 'hsl(var(--text-4))' }}>
        <CircleNotch size={32} className="animate-spin mb-3" />
        <p className="text-sm">Loading use case…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <Warning size={48} className="text-[hsl(var(--destructive))] mb-4" />
        <h2 className="text-xl font-bold text-[hsl(var(--text-1))]">Failed to load use case</h2>
        <p className="text-[hsl(var(--text-3))] mb-6">{error.message}</p>
        <Button onClick={() => navigate('/use-cases')} style={{ borderRadius: 0 }}>Back to Use Cases</Button>
      </div>
    );
  }

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

  const linkedModels = uc.linkedModelIds.map(mid => ({ id: mid, name: models.find(m => m.id === mid)?.name ?? mid, meta: models.find(m => m.id === mid) }));
  const hasScore = uc.complianceScore > 0;

  return (
    <div className="space-y-6">
      <div>
        <PageHeader
          title={uc.title}
          subtitle={uc.goal ? `Goal: ${uc.goal}` : 'AI use case'}
          breadcrumbs={[
            { label: 'AI Governance' },
            { label: 'Use Cases', href: '/use-cases' },
            { label: uc.id.slice(0, 8) },
          ]}
        />
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <Badge variant="outline" style={{ borderRadius: 0, fontFamily: 'monospace' }}>{uc.id.slice(0, 8)}</Badge>
          <StatusBadge status={uc.status} />
          <RiskBadge riskClass={uc.riskClass} />
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" style={{ borderRadius: 0 }} onClick={() => navigate('/use-cases')}>
              Back to Registry
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b border-[hsl(var(--border))]">
          <TabsList className="bg-transparent h-12 p-0 w-full justify-start overflow-x-auto flex-nowrap hide-scrollbar">
            {[
              { id: 'overview', icon: FileText, label: 'Overview' },
              { id: 'models', icon: Briefcase, label: 'Linked models' },
              { id: 'frameworks', icon: ListChecks, label: 'Frameworks & regulations' },
              { id: 'compliance', icon: ShieldCheck, label: 'Compliance' },
              { id: 'monitoring', icon: ChartLineUp, label: 'Monitoring' },
              { id: 'settings', icon: Gear, label: 'Settings' },
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
          {/* OVERVIEW */}
          <TabsContent value="overview" className="mt-0 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                <div className="bg-surface border border-[hsl(var(--border))] p-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-[hsl(var(--text-3))] mb-4">Description</h3>
                  <p className="text-sm leading-relaxed text-[hsl(var(--text-2))]">{uc.description || 'No detailed description provided.'}</p>
                </div>

                <div className="bg-surface border border-[hsl(var(--border))] p-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-[hsl(var(--text-3))] mb-4">Compliance Score</h3>
                  {hasScore ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[hsl(var(--text-2))]">Recorded compliance score</span>
                        <span className="text-sm font-mono font-bold text-[hsl(var(--text-1))]">{uc.complianceScore}%</span>
                      </div>
                      <div className="h-2 w-full bg-[hsl(var(--bg-muted))] overflow-hidden">
                        <div className="h-full bg-[hsl(var(--brand))]" style={{ width: `${Math.min(100, uc.complianceScore)}%` }} />
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-[hsl(var(--text-4))]">Not yet measured — no compliance score has been recorded for this use case.</p>
                  )}
                </div>

                <div className="bg-surface border border-[hsl(var(--border))] p-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-[hsl(var(--text-3))] mb-4">Applicable Regulations</h3>
                  {uc.regulations.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {uc.regulations.map(r => (
                        <Badge key={r} variant="outline" style={{ borderRadius: 0 }}>{r}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[hsl(var(--text-4))]">No regulations attached.</p>
                  )}
                </div>

                <div className="bg-surface border border-[hsl(var(--border))] p-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-[hsl(var(--text-3))] mb-4">Team Members</h3>
                  {uc.teamMembers.length > 0 ? (
                    <ul className="space-y-2">
                      {uc.teamMembers.map(tm => (
                        <li key={tm} className="flex items-center gap-2 text-sm text-[hsl(var(--text-2))]">
                          <User size={14} className="text-[hsl(var(--text-4))]" /> {tm}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[hsl(var(--text-4))]">No team members assigned.</p>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-surface border border-[hsl(var(--border))] p-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-[hsl(var(--text-3))] mb-4">Properties</h3>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <User size={16} className="text-[hsl(var(--text-4))] mt-0.5" />
                      <div><p className="text-xs text-[hsl(var(--text-4))]">Owner</p><p className="text-sm font-medium">{uc.owner || '—'}</p></div>
                    </li>
                    <li className="flex items-start gap-3">
                      <Briefcase size={16} className="text-[hsl(var(--text-4))] mt-0.5" />
                      <div><p className="text-xs text-[hsl(var(--text-4))]">High Risk Role</p><p className="text-sm font-medium">{uc.highRiskRole || '—'}</p></div>
                    </li>
                    <li className="flex items-start gap-3">
                      <GlobeHemisphereWest size={16} className="text-[hsl(var(--text-4))] mt-0.5" />
                      <div><p className="text-xs text-[hsl(var(--text-4))]">Geography</p><p className="text-sm font-medium">{uc.geography || '—'}</p></div>
                    </li>
                    <li className="flex items-start gap-3">
                      <Buildings size={16} className="text-[hsl(var(--text-4))] mt-0.5" />
                      <div><p className="text-xs text-[hsl(var(--text-4))]">Industry</p><p className="text-sm font-medium">{uc.industry || '—'}</p></div>
                    </li>
                    <li className="flex items-start gap-3">
                      <ListChecks size={16} className="text-[hsl(var(--text-4))] mt-0.5" />
                      <div><p className="text-xs text-[hsl(var(--text-4))]">Approval Workflow</p><p className="text-sm font-medium capitalize">{uc.approvalWorkflow || '—'}</p></div>
                    </li>
                  </ul>
                </div>

                <div className="bg-surface border border-[hsl(var(--border))] p-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-[hsl(var(--text-3))] mb-4">Dates</h3>
                  <div className="flex justify-between items-center pb-2 border-b border-[hsl(var(--border))]">
                    <span className="text-xs text-[hsl(var(--text-4))]">Start</span>
                    <span className="text-sm font-medium">{uc.startDate ? formatDate(uc.startDate) : '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[hsl(var(--border))]">
                    <span className="text-xs text-[hsl(var(--text-4))]">Created</span>
                    <span className="text-sm font-medium">{formatDate(uc.createdAt)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs text-[hsl(var(--text-4))]">Last Updated</span>
                    <span className="text-sm font-medium">{formatDate(uc.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* LINKED MODELS */}
          <TabsContent value="models" className="mt-0">
            <div className="bg-surface border border-[hsl(var(--border))]">
              <div className="p-4 border-b border-[hsl(var(--border))]">
                <h3 className="font-semibold">Linked Models ({linkedModels.length})</h3>
                <p className="text-xs text-[hsl(var(--text-4))] mt-1">Registry models governed by this use case.</p>
              </div>
              {linkedModels.length === 0 ? (
                <div className="p-6">
                  <EmptyState icon={Briefcase} title="No models linked" hint="Link models to this use case from the Create form or the model registry." />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-muted))]">
                        {['Model ID', 'Name', 'Risk Tier', 'Lifecycle', ''].map(h => (
                          <th key={h} className="px-4 py-3 text-left font-semibold text-[hsl(var(--text-3))] text-xs uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[hsl(var(--border))]">
                      {linkedModels.map(m => (
                        <tr key={m.id} className="hover:bg-[hsl(var(--bg-muted))] transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--brand))]">{m.id.slice(0, 8)}</td>
                          <td className="px-4 py-3 font-medium">{m.name}</td>
                          <td className="px-4 py-3 text-[hsl(var(--text-3))]">{m.meta?.riskTier ?? '—'}</td>
                          <td className="px-4 py-3 text-[hsl(var(--text-3))]">{m.meta?.lifecycle ?? '—'}</td>
                          <td className="px-4 py-3 text-right">
                            <Link to={`/models/${m.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-[hsl(var(--brand))] hover:underline">
                              View model <ArrowSquareOut size={12} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* FRAMEWORKS */}
          <TabsContent value="frameworks" className="mt-0">
            <div className="bg-surface border border-[hsl(var(--border))]">
              <div className="p-4 border-b border-[hsl(var(--border))]">
                <h3 className="font-semibold">Frameworks & Regulations</h3>
                <p className="text-xs text-[hsl(var(--text-4))] mt-1">Regulations attached to this use case.</p>
              </div>
              <div className="p-6">
                {uc.regulations.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {uc.regulations.map(fw => (
                      <div key={fw} className="border border-[hsl(var(--border))] p-5">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-bold text-[hsl(var(--brand))]">{fw}</h4>
                        </div>
                        <p className="text-xs text-[hsl(var(--text-4))]">Control-level tracking not yet measured for this framework.</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={ListChecks} title="No frameworks attached" hint="Attach applicable regulations when editing this use case." />
                )}
              </div>
            </div>
          </TabsContent>

          {/* COMPLIANCE */}
          <TabsContent value="compliance" className="mt-0">
            <div className="bg-surface border border-[hsl(var(--border))] p-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-[hsl(var(--text-3))] mb-4">Compliance Score</h3>
              {hasScore ? (
                <div className="flex items-center gap-6">
                  <div className="text-4xl font-bold font-mono" style={{ color: 'hsl(var(--brand))' }}>{uc.complianceScore}%</div>
                  <div className="flex-1">
                    <div className="h-3 w-full bg-[hsl(var(--bg-muted))] overflow-hidden">
                      <div className="h-full bg-[hsl(var(--brand))]" style={{ width: `${Math.min(100, uc.complianceScore)}%` }} />
                    </div>
                    <p className="text-xs text-[hsl(var(--text-4))] mt-2">Overall compliance score recorded for this use case.</p>
                  </div>
                </div>
              ) : (
                <EmptyState icon={ShieldCheck} title="Not yet measured" hint="No compliance score has been recorded. Complete an assessment to populate this metric." />
              )}
            </div>
          </TabsContent>

          {/* MONITORING */}
          <TabsContent value="monitoring" className="mt-0">
            <EmptyState
              icon={ChartLineUp}
              title="Not yet measured"
              hint={linkedModels.length === 0
                ? 'Link an active model to begin post-market monitoring.'
                : 'Post-market monitoring signals have not been collected for the linked models yet.'}
            />
          </TabsContent>

          {/* SETTINGS */}
          <TabsContent value="settings" className="mt-0">
            <div className="max-w-2xl space-y-6">
              <div className="bg-surface border border-[hsl(var(--border))] p-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-[hsl(var(--text-3))] mb-4">Ownership &amp; Access</h3>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-[hsl(var(--text-1))]">Transfer ownership</h4>
                    <p className="text-xs text-[hsl(var(--text-4))] mt-1">
                      Currently owned by <span className="font-medium text-[hsl(var(--text-2))]">{uc.owner || 'unassigned'}</span>. Reassign this use case to another user.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0" style={{ borderRadius: 0 }} loading={update.isPending} disabled={update.isPending} onClick={handleTransfer}>
                    <User size={14} /> Transfer
                  </Button>
                </div>
              </div>

              <div className="border border-[hsl(var(--s-er-br))]" style={{ background: 'hsl(var(--bg-surface))' }}>
                <div className="flex items-center gap-2 px-6 py-3 border-b border-[hsl(var(--s-er-br))]" style={{ background: 'hsl(var(--s-er-bg))' }}>
                  <Warning size={16} weight="fill" style={{ color: 'hsl(var(--destructive))' }} />
                  <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'hsl(var(--destructive))' }}>Danger Zone</h3>
                </div>
                <div className="flex items-center justify-between gap-4 p-6">
                  <div>
                    <h4 className="text-sm font-semibold text-[hsl(var(--text-1))]">Delete use case</h4>
                    <p className="text-xs text-[hsl(var(--text-4))] mt-1">
                      Soft-delete <span className="font-medium text-[hsl(var(--text-2))]">{uc.title}</span>. It can be restored by an administrator.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0" style={{ borderRadius: 0, color: 'hsl(var(--destructive))', borderColor: 'hsl(var(--s-er-br))' }} loading={remove.isPending} disabled={remove.isPending} onClick={() => setConfirmDelete(true)}>
                    <Trash size={14} /> Delete
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete use case?"
        description={`This soft-deletes ${uc.title}. It can be restored by an administrator.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
