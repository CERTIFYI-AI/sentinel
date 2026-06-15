// @ts-nocheck
import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Robot, ArrowRight, Clock, ChartBar, CheckCircle, Warning, 
  ArrowsClockwise, MagnifyingGlass, Filter, Prohibit, Info, 
  FolderSimple, ShieldCheck, ShieldWarning, ArrowUpRight
} from '@phosphor-icons/react';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { 
  RiskBadge, StatusPill, InterlinkChip, ContextualAlert, SlideOverPanel 
} from '../components/ui';
import { MODELS } from '../data/seed';
import { useModelsData } from '@/hooks/useModelsData';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { toast } from 'sonner';

export default function ModelLifecycle() {
  const { models: items, isLoading, saveModel } = useModelsData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Sorting state
  const [sortCol, setSortCol] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Unified models merging Supabase data and mock seed data
  const unifiedModels = useMemo(() => {
    const activeItems = items && items.length > 0 ? items : MODELS;
    return activeItems.map(m => {
      // Parse last validated date and calculate if overdue (> 90 days)
      const lastValDate = m.lastValidated || m.last_validated || '2026-03-15';
      const lastVal = new Date(lastValDate);
      const today = new Date('2026-06-15');
      const diffTime = Math.abs(today.getTime() - lastVal.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const overdueValidation = diffDays > 90;

      return {
        id: m.id || m.model_id || 'MDL-UNKNOWN',
        name: m.name || m.display_name || 'Unnamed Model',
        version: m.version || 'v1.0.0',
        owner_team: m.owner_team || m.department || m.technical_owner || 'Lending',
        business_unit: m.business_unit || 'Financial Services',
        purpose: m.description || m.purpose || 'No description provided.',
        framework: m.framework || 'sklearn',
        risk_tier: (m.risk_tier || m.riskClass || m.riskTier || 'MEDIUM').toUpperCase().replace('_RISK', ''),
        regulatory_scope: m.regulatory_scope || (m.framework === 'EU AI Act' ? ['EU AI Act'] : ['GDPR']),
        lifecycle_stage: (m.lifecycle_stage || m.lifecyclePhase || m.status || 'DRAFT').toUpperCase(),
        last_validated: lastValDate,
        next_review: m.nextReviewDate || m.next_review || '2026-09-15',
        aiia_ref: m.aiiaRef || m.aiia_ref || null,
        mrc_approval_id: m.mrc_approval_id || m.mrcApprovalId || 'MRC-882',
        validation_status: m.validation_status || (overdueValidation ? 'FAILED' : 'PASSED'),
        last_eval_score: m.lastEvalScore || 85,
        explainability_method: m.explainability_method || 'SHAP',
        active_agents_using: m.activeAgentsCount || 2,
        deployed_guardrails: m.guardrails?.length || 3,
        genai_risk_score: m.genai_risk_score || 0.12,
        deprecation_reason: m.deprecation_reason || '',
        is_kill_switched: m.is_kill_switched || (m.driftStatus === 'critical') || false,
        overdueValidation,
        input_schema: m.input_schema || '{\n  "features": ["income", "age", "loan_amount"]\n}',
        output_schema: m.output_schema || '{\n  "probability": 0.12,\n  "decision": "APPROVED"\n}'
      };
    });
  }, [items]);

  // Read multi-select URL parameters
  const activeStatuses = useSearchParams()[0].getAll('status');
  const activeRiskTiers = useSearchParams()[0].getAll('risk_tier');
  const activeOwnerTeams = useSearchParams()[0].getAll('owner_team');
  const activeScopes = useSearchParams()[0].getAll('regulatory_scope');
  const activeFrameworks = useSearchParams()[0].getAll('framework');

  const toggleFilter = (key: string, value: string) => {
    const nextParams = new URLSearchParams(searchParams);
    const currentValues = nextParams.getAll(key);
    nextParams.delete(key);
    
    if (currentValues.includes(value)) {
      currentValues.filter(v => v !== value).forEach(v => nextParams.append(key, v));
    } else {
      [...currentValues, value].forEach(v => nextParams.append(key, v));
    }
    setSearchParams(nextParams);
  };

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  // Filtered and sorted list
  const filteredModels = useMemo(() => {
    return unifiedModels
      .filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.id.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = activeStatuses.length === 0 || activeStatuses.includes(m.lifecycle_stage);
        const matchesRisk = activeRiskTiers.length === 0 || activeRiskTiers.includes(m.risk_tier);
        const matchesOwner = activeOwnerTeams.length === 0 || activeOwnerTeams.includes(m.owner_team);
        const matchesScope = activeScopes.length === 0 || m.regulatory_scope.some(s => activeScopes.includes(s));
        const matchesFramework = activeFrameworks.length === 0 || activeFrameworks.includes(m.framework);
        
        return matchesSearch && matchesStatus && matchesRisk && matchesOwner && matchesScope && matchesFramework;
      })
      .sort((a, b) => {
        let valA = a[sortCol as keyof typeof a];
        let valB = b[sortCol as keyof typeof b];
        
        if (typeof valA === 'string') {
          return sortDir === 'asc' 
            ? (valA as string).localeCompare(valB as string)
            : (valB as string).localeCompare(valA as string);
        }
        return 0;
      });
  }, [unifiedModels, search, activeStatuses, activeRiskTiers, activeOwnerTeams, activeScopes, activeFrameworks, sortCol, sortDir]);

  const selectedModel = useMemo(() => {
    return unifiedModels.find(m => m.id === selectedId) || null;
  }, [unifiedModels, selectedId]);

  // Promote workflow gating checks
  const gates = useMemo(() => {
    if (!selectedModel) return { meetsAll: false, aiia: false, validation: false, mrc: false };
    const aiia = !!selectedModel.aiia_ref;
    const validation = selectedModel.validation_status === 'PASSED';
    const mrc = !!selectedModel.mrc_approval_id;
    return {
      meetsAll: aiia && validation && mrc,
      aiia,
      validation,
      mrc
    };
  }, [selectedModel]);

  const handlePromote = async () => {
    if (!selectedModel) return;
    if (!gates.meetsAll) {
      toast.error('Cannot promote model: unmet deployment gates checklist');
      return;
    }

    let nextStage = 'PRODUCTION';
    if (selectedModel.lifecycle_stage === 'DRAFT') nextStage = 'IN_REVIEW';
    else if (selectedModel.lifecycle_stage === 'IN_REVIEW') nextStage = 'APPROVED';
    else if (selectedModel.lifecycle_stage === 'APPROVED') nextStage = 'DEPLOYED';
    else if (selectedModel.lifecycle_stage === 'DEPLOYED') nextStage = 'PRODUCTION';

    try {
      await saveModel({
        id: selectedModel.id,
        lifecycle_stage: nextStage
      });
      toast.success(`Model successfully promoted to ${nextStage}`);
    } catch {
      toast.error('Failed to promote lifecycle stage');
    }
  };

  const handleRetire = async () => {
    if (!selectedModel) return;
    try {
      await saveModel({
        id: selectedModel.id,
        lifecycle_stage: 'RETIRED'
      });
      toast.success('Model successfully retired');
    } catch {
      toast.error('Failed to retire model');
    }
  };

  const handleFlagMRC = () => {
    toast.success('Model flagged for MRC agenda review');
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen bg-bg-page font-sans">
      <ContextualAlert module="lifecycle" />
      
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Robot size={24} weight="duotone" className="text-[hsl(var(--brand))]" />
            Model Inventory & Lifecycle
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            Operational registry, compliance checks, and phase transition gates
          </p>
        </div>
      </div>

      {/* KPI Stats Block */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="rounded-none border border-border bg-surface">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="mt-0.5 text-[hsl(var(--brand))]">
              <Robot size={24} weight="duotone" />
            </div>
            <div>
              <div className="text-2xl font-bold text-text-primary">{unifiedModels.length}</div>
              <div className="text-xs text-text-muted mt-0.5 uppercase tracking-wide font-semibold">Total Models</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none border border-border bg-surface">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="mt-0.5 text-emerald-600">
              <ShieldCheck size={24} weight="duotone" />
            </div>
            <div>
              <div className="text-2xl font-bold text-text-primary">
                {unifiedModels.filter(m => m.lifecycle_stage === 'DEPLOYED' || m.lifecycle_stage === 'PRODUCTION').length}
              </div>
              <div className="text-xs text-text-muted mt-0.5 uppercase tracking-wide font-semibold">Live Deployments</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none border border-border bg-surface">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="mt-0.5 text-red-600">
              <ShieldWarning size={24} weight="duotone" />
            </div>
            <div>
              <div className="text-2xl font-bold text-text-primary">
                {unifiedModels.filter(m => m.risk_tier === 'CRITICAL' || m.risk_tier === 'HIGH').length}
              </div>
              <div className="text-xs text-text-muted mt-0.5 uppercase tracking-wide font-semibold">High/Critical Risk</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none border border-border bg-surface">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="mt-0.5 text-amber-600">
              <Clock size={24} weight="duotone" />
            </div>
            <div>
              <div className="text-2xl font-bold text-text-primary">
                {unifiedModels.filter(m => m.lifecycle_stage === 'IN_REVIEW' || m.lifecycle_stage === 'DRAFT').length}
              </div>
              <div className="text-xs text-text-muted mt-0.5 uppercase tracking-wide font-semibold">Under Review</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Two-Panel Workspace */}
      <div className="flex gap-6 items-start">
        {/* Left Side: Filterable Table */}
        <div className="flex-1 flex flex-col gap-4 bg-surface border border-border p-4 rounded-none">
          {/* Top filter inputs */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search models..."
                className="pl-9 h-8 text-sm rounded-none border border-border"
              />
            </div>
            
            {/* Filter selectors */}
            <div className="flex gap-2 items-center text-xs">
              {/* Status filter */}
              <div className="flex gap-1 items-center border border-border px-2 py-1 bg-bg-sunken">
                <span className="text-text-muted font-bold">STATUS:</span>
                {['DRAFT', 'IN_REVIEW', 'APPROVED', 'DEPLOYED', 'DEPRECATED'].map(status => (
                  <button
                    key={status}
                    onClick={() => toggleFilter('status', status)}
                    className={`px-1.5 py-0.5 text-[10px] font-semibold border ${
                      activeStatuses.includes(status) 
                        ? 'bg-brand text-white border-brand' 
                        : 'bg-white text-text-secondary border-border'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              {/* Risk Tier Filter */}
              <div className="flex gap-1 items-center border border-border px-2 py-1 bg-bg-sunken">
                <span className="text-text-muted font-bold">RISK:</span>
                {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(tier => (
                  <button
                    key={tier}
                    onClick={() => toggleFilter('risk_tier', tier)}
                    className={`px-1.5 py-0.5 text-[10px] font-semibold border ${
                      activeRiskTiers.includes(tier)
                        ? 'bg-brand text-white border-brand'
                        : 'bg-white text-text-secondary border-border'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Model Registry List Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-bg-raised border-b border-border">
                <tr>
                  <th 
                    className="p-3 font-semibold uppercase tracking-wider text-text-muted cursor-pointer hover:text-text-primary"
                    onClick={() => handleSort('name')}
                  >
                    Name
                  </th>
                  <th className="p-3 font-semibold uppercase tracking-wider text-text-muted">Version</th>
                  <th className="p-3 font-semibold uppercase tracking-wider text-text-muted">Owner Team</th>
                  <th className="p-3 font-semibold uppercase tracking-wider text-text-muted">Risk Tier</th>
                  <th className="p-3 font-semibold uppercase tracking-wider text-text-muted">Framework</th>
                  <th className="p-3 font-semibold uppercase tracking-wider text-text-muted">Status</th>
                  <th className="p-3 font-semibold uppercase tracking-wider text-text-muted">Last Validated</th>
                  <th className="p-3 font-semibold uppercase tracking-wider text-text-muted">Next Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredModels.map(model => (
                  <tr 
                    key={model.id}
                    className={`hover:bg-bg-raised cursor-pointer transition-colors ${selectedId === model.id ? 'bg-bg-sunken' : ''}`}
                    onClick={() => setSelectedId(model.id)}
                  >
                    <td className="p-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-text-primary flex items-center gap-1.5">
                          {model.name}
                          {model.is_kill_switched && (
                            <span className="bg-red-100 text-red-800 text-[9px] px-1 py-0.5 uppercase tracking-wide font-extrabold animate-pulse">
                              KILL-SWITCHED
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-text-muted font-mono">{model.id}</span>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-text-secondary">{model.version}</td>
                    <td className="p-3 text-text-secondary">{model.owner_team}</td>
                    <td className="p-3">
                      <RiskBadge level={model.risk_tier} pulse={model.is_kill_switched} />
                    </td>
                    <td className="p-3 text-text-secondary font-mono uppercase">{model.framework}</td>
                    <td className="p-3">
                      <StatusPill status={model.lifecycle_stage} />
                    </td>
                    <td className="p-3 text-text-secondary flex flex-col gap-1">
                      <span>{model.last_validated}</span>
                      {model.overdueValidation && (
                        <span className="text-[10px] text-red-600 font-semibold flex items-center gap-1">
                          <Warning size={10} weight="fill" /> Overdue &gt;90d
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-text-secondary">{model.next_review}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right Side: Detail Slide-Over Panel */}
      <SlideOverPanel
        open={!!selectedId}
        onOpenChange={(open) => !open && setSelectedId(null)}
        title="Model GRC Detail panel"
        entityType="model"
        entityId={selectedId || ''}
      >
        {selectedModel && (
          <div className="space-y-6 text-xs text-text-secondary">
            {/* Inline Action Bar */}
            <div className="flex flex-wrap gap-2 border-b border-border pb-4">
              <Button 
                size="sm"
                onClick={handlePromote}
                className="bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-hover))] text-white rounded-none text-xs font-semibold px-3 h-8"
              >
                Promote Stage
              </Button>
              <Button 
                size="sm"
                variant="outline"
                onClick={() => toast.success('Validation request dispatched')}
                className="border-border text-text-primary rounded-none text-xs px-3 h-8"
              >
                Request Validation
              </Button>
              <Button 
                size="sm"
                variant="outline"
                onClick={handleFlagMRC}
                className="border-border text-text-primary rounded-none text-xs px-3 h-8"
              >
                Flag for MRC
              </Button>
              <Button 
                size="sm"
                variant="destructive"
                onClick={handleRetire}
                className="rounded-none text-xs px-3 h-8 bg-red-600 hover:bg-red-700 text-white"
              >
                Retire
              </Button>
            </div>

            {/* Warning Cards (Gates Checks) */}
            {selectedModel.lifecycle_stage === 'APPROVED' && (
              <div className="bg-amber-50 border border-amber-200 p-3 flex flex-col gap-2 rounded-none">
                <p className="font-bold text-amber-800 flex items-center gap-1">
                  <Info size={14} weight="fill" /> Promotion to DEPLOYED Gated Checklist
                </p>
                <ul className="space-y-1 ml-4 list-disc text-amber-700">
                  <li className="flex items-center gap-1.5 justify-between">
                    <span>AIIA Reference linked</span>
                    {gates.aiia ? (
                      <span className="text-emerald-700 font-semibold uppercase">✓ MET</span>
                    ) : (
                      <span className="text-red-700 font-semibold uppercase">✗ MISSING</span>
                    )}
                  </li>
                  <li className="flex items-center gap-1.5 justify-between">
                    <span>Validation Status = PASSED</span>
                    {gates.validation ? (
                      <span className="text-emerald-700 font-semibold uppercase">✓ MET</span>
                    ) : (
                      <span className="text-red-700 font-semibold uppercase">✗ FAILED / PENDING</span>
                    )}
                  </li>
                  <li className="flex items-center gap-1.5 justify-between">
                    <span>MRC Approval ID linked</span>
                    {gates.mrc ? (
                      <span className="text-emerald-700 font-semibold uppercase">✓ MET</span>
                    ) : (
                      <span className="text-red-700 font-semibold uppercase">✗ MISSING</span>
                    )}
                  </li>
                </ul>
              </div>
            )}

            {/* Full Lifecycle Fields */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <p className="font-bold text-text-primary">Model ID</p>
                <p className="font-mono text-text-secondary mt-0.5">{selectedModel.id}</p>
              </div>
              <div>
                <p className="font-bold text-text-primary">Display Name</p>
                <p className="mt-0.5 text-text-secondary">{selectedModel.name}</p>
              </div>
              <div>
                <p className="font-bold text-text-primary">Version</p>
                <p className="mt-0.5 font-mono text-text-secondary">{selectedModel.version}</p>
              </div>
              <div>
                <p className="font-bold text-text-primary">Owner Team</p>
                <p className="mt-0.5 text-text-secondary">{selectedModel.owner_team}</p>
              </div>
              <div>
                <p className="font-bold text-text-primary">Business Unit</p>
                <p className="mt-0.5 text-text-secondary">{selectedModel.business_unit}</p>
              </div>
              <div>
                <p className="font-bold text-text-primary">Risk Tier</p>
                <div className="mt-1">
                  <RiskBadge level={selectedModel.risk_tier} />
                </div>
              </div>
              <div>
                <p className="font-bold text-text-primary">Framework</p>
                <p className="mt-0.5 font-mono text-text-secondary uppercase">{selectedModel.framework}</p>
              </div>
              <div>
                <p className="font-bold text-text-primary">Lifecycle Stage</p>
                <div className="mt-1">
                  <StatusPill status={selectedModel.lifecycle_stage} />
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="font-bold text-text-primary">Purpose & Description</p>
              <p className="mt-1 text-text-secondary leading-relaxed bg-bg-muted p-2 border border-border">
                {selectedModel.purpose}
              </p>
            </div>

            {/* Input & Output Schemas */}
            <div className="space-y-3 border-t border-border pt-4">
              <p className="font-bold text-text-primary uppercase tracking-wider">Data Schema Definitions</p>
              <div>
                <p className="font-semibold text-text-secondary">Input Schema</p>
                <pre className="mt-1 text-[10px] font-mono bg-bg-sunken p-2 border border-border whitespace-pre-wrap">
                  {selectedModel.input_schema}
                </pre>
              </div>
              <div>
                <p className="font-semibold text-text-secondary">Output Schema</p>
                <pre className="mt-1 text-[10px] font-mono bg-bg-sunken p-2 border border-border whitespace-pre-wrap">
                  {selectedModel.output_schema}
                </pre>
              </div>
            </div>

            {/* Interlink Chips Map */}
            <div className="border-t border-border pt-4 space-y-3">
              <p className="font-bold text-text-primary uppercase tracking-wider">Connected GRC Modules</p>
              <div className="flex flex-wrap gap-2">
                <InterlinkChip label="Model DNA Lineage" to="/models/dna" />
                <InterlinkChip label="Validation Lab" to="/model-validation" />
                <InterlinkChip label="Explainability Center" to="/explainability" />
                <InterlinkChip label="Eval Results Viewer" to="/evals/results" />
                <InterlinkChip label="Agent Registry" to="/agent-registry" />
                <InterlinkChip label="Guardrail Rules" to="/trust-engine/guardrails" />
                <InterlinkChip label="Model Risk Committee" to="/mrc" />
                <InterlinkChip label="GenAI Risks Profile" to="/genai-risks" />
              </div>
            </div>
            
            {selectedModel.aiia_ref && (
              <div className="border-t border-border pt-4">
                <p className="font-bold text-text-primary">AIIA Assessment Ref</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-text-secondary bg-bg-sunken px-1.5 py-0.5 border border-border">
                    {selectedModel.aiia_ref}
                  </span>
                  <InterlinkChip label="View AIIA Dossier" to="/aiia" />
                </div>
              </div>
            )}

            {selectedModel.deprecation_reason && (
              <div className="border-t border-border pt-4 bg-zinc-50 p-2 border border-zinc-200 text-zinc-800">
                <p className="font-bold">Deprecation Reason</p>
                <p className="mt-1 italic">{selectedModel.deprecation_reason}</p>
              </div>
            )}
          </div>
        )}
      </SlideOverPanel>
    </div>
  );
}
