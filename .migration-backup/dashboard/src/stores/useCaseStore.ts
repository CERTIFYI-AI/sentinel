import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UseCase, UCRisk, ActivityEntry, UCStatus, ApprovalStatus, RiskLevel } from '../data/useCases';
import { seedUseCases, seedActivityLogs } from '../data/useCases';

interface UseCaseState {
  items: UseCase[];
  activityLogs: Record<string, ActivityEntry[]>;
  selectedId: string | null;
  isDetailOpen: boolean;
  activeTab: string;
  createUseCase: (data: Partial<UseCase>) => string;
  updateUseCase: (id: string, patch: Partial<UseCase>) => void;
  deleteUseCase: (id: string) => void;
  submitForApproval: (id: string, actor: string) => void;
  approveUseCase: (id: string, actor: string) => void;
  rejectUseCase: (id: string, actor: string, reason: string) => void;
  addRisk: (ucId: string, risk: UCRisk) => void;
  updateRisk: (ucId: string, riskId: string, patch: Partial<UCRisk>) => void;
  deleteRisk: (ucId: string, riskId: string) => void;
  linkModel: (ucId: string, modelId: string) => void;
  unlinkModel: (ucId: string, modelId: string) => void;
  addActivityEntry: (ucId: string, entry: Omit<ActivityEntry, 'id'>) => void;
  getEffectiveStatus: (id: string) => UCStatus | undefined;
  getApprovalStatus: (id: string) => ApprovalStatus | undefined;
  isTabLocked: (id: string) => boolean;
  setSelectedId: (id: string | null) => void;
  setDetailOpen: (open: boolean) => void;
  setActiveTab: (tab: string) => void;
  calculateScopeRisk: (scope: UseCase['scope']) => { riskLevel: RiskLevel; requirements: string[] };
}

export const useUseCaseStore = create<UseCaseState>()(
  persist(
    (set, get) => ({
      items: seedUseCases,
      activityLogs: seedActivityLogs,
      selectedId: null,
      isDetailOpen: false,
      activeTab: 'overview',

      createUseCase: (data) => {
        const items = get().items;
        const nextNum = items.length + 1;
        const id = `UC-${String(nextNum).padStart(3, '0')}`;
        const now = new Date().toISOString().split('T')[0];
        const newUC: UseCase = {
          id, title: data.title || 'Untitled', goal: data.goal || '',
          description: data.description, owner: data.owner || '',
          members: data.members || [], status: 'Not Started',
          riskClassification: data.riskClassification || 'Minimal Risk',
          highRiskRole: data.highRiskRole || 'Deployer',
          geography: data.geography || [], targetIndustry: data.targetIndustry || '',
          startDate: data.startDate || now, lastUpdated: now,
          approvalWorkflow: data.approvalWorkflow, approvalStatus: 'None',
          approvalLockedTabs: false,
          scope: data.scope || { novelTechnology: false, handlesPersonalData: false, hasMonitoring: false },
          frameworks: data.frameworks || [], risks: [], linkedModels: [],
          vendors: data.vendors || [], controlsProgress: 0, assessmentProgress: 0,
        };
        set((s) => ({ items: [...s.items, newUC] }));
        get().addActivityEntry(id, { timestamp: new Date().toISOString(), actor: newUC.owner, action: `Created use case ${id}` });
        return id;
      },

      updateUseCase: (id, patch) => {
        set((s) => ({
          items: s.items.map((uc) => uc.id === id ? { ...uc, ...patch, lastUpdated: new Date().toISOString().split('T')[0] } : uc),
        }));
        Object.keys(patch).forEach((field) => {
          const uc = get().items.find((u) => u.id === id);
          if (uc) {
            get().addActivityEntry(id, {
              timestamp: new Date().toISOString(), actor: uc.owner,
              action: `Updated ${field}`, field,
            });
          }
        });
      },

      deleteUseCase: (id) => set((s) => ({ items: s.items.filter((uc) => uc.id !== id) })),

      submitForApproval: (id, actor) => {
        set((s) => ({ items: s.items.map((uc) => uc.id === id ? { ...uc, approvalStatus: 'Pending' as ApprovalStatus, approvalLockedTabs: true } : uc) }));
        get().addActivityEntry(id, { timestamp: new Date().toISOString(), actor, action: 'Submitted for approval', field: 'approvalStatus', oldValue: 'None', newValue: 'Pending' });
      },

      approveUseCase: (id, actor) => {
        set((s) => ({ items: s.items.map((uc) => uc.id === id ? { ...uc, approvalStatus: 'Approved' as ApprovalStatus, approvalLockedTabs: false } : uc) }));
        get().addActivityEntry(id, { timestamp: new Date().toISOString(), actor, action: 'Approved use case', field: 'approvalStatus', oldValue: 'Pending', newValue: 'Approved' });
      },

      rejectUseCase: (id, actor, reason) => {
        set((s) => ({ items: s.items.map((uc) => uc.id === id ? { ...uc, approvalStatus: 'Rejected' as ApprovalStatus, approvalLockedTabs: true } : uc) }));
        get().addActivityEntry(id, { timestamp: new Date().toISOString(), actor, action: `Rejected: ${reason}`, field: 'approvalStatus', oldValue: 'Pending', newValue: 'Rejected' });
      },

      addRisk: (ucId, risk) => {
        set((s) => ({ items: s.items.map((uc) => uc.id === ucId ? { ...uc, risks: [...uc.risks, risk] } : uc) }));
        get().addActivityEntry(ucId, { timestamp: new Date().toISOString(), actor: risk.owner, action: `Added risk ${risk.id}: ${risk.title}`, field: 'risks' });
      },

      updateRisk: (ucId, riskId, patch) => set((s) => ({ items: s.items.map((uc) => uc.id === ucId ? { ...uc, risks: uc.risks.map((r) => r.id === riskId ? { ...r, ...patch } : r) } : uc) })),
      deleteRisk: (ucId, riskId) => set((s) => ({ items: s.items.map((uc) => uc.id === ucId ? { ...uc, risks: uc.risks.filter((r) => r.id !== riskId) } : uc) })),
      linkModel: (ucId, modelId) => set((s) => ({ items: s.items.map((uc) => uc.id === ucId && !uc.linkedModels.includes(modelId) ? { ...uc, linkedModels: [...uc.linkedModels, modelId] } : uc) })),
      unlinkModel: (ucId, modelId) => set((s) => ({ items: s.items.map((uc) => uc.id === ucId ? { ...uc, linkedModels: uc.linkedModels.filter((m) => m !== modelId) } : uc) })),

      addActivityEntry: (ucId, entry) => {
        const id = `ACT-${Date.now()}`;
        set((s) => ({ activityLogs: { ...s.activityLogs, [ucId]: [{ ...entry, id }, ...(s.activityLogs[ucId] || [])] } }));
      },

      getEffectiveStatus: (id) => get().items.find((u) => u.id === id)?.status,
      getApprovalStatus: (id) => get().items.find((u) => u.id === id)?.approvalStatus,
      isTabLocked: (id) => get().items.find((u) => u.id === id)?.approvalLockedTabs ?? false,
      setSelectedId: (id) => set({ selectedId: id }),
      setDetailOpen: (open) => set({ isDetailOpen: open }),
      setActiveTab: (tab) => set({ activeTab: tab }),

      calculateScopeRisk: (scope) => {
        const requirements: string[] = [];
        let riskLevel: RiskLevel = 'Low';
        if (scope.handlesPersonalData) { requirements.push('GDPR compliance required (personal data)'); requirements.push('DPIA required (automated decisions on personal data)'); riskLevel = 'Medium'; }
        if (scope.novelTechnology) { requirements.push('ISO 42001 clause 8.5 assessment required (novel technology)'); riskLevel = 'High'; }
        if (!scope.hasMonitoring) { requirements.push('Post-deployment monitoring system required'); }
        if (scope.handlesPersonalData && scope.novelTechnology) { riskLevel = 'High'; }
        return { riskLevel, requirements };
      },
    }),
    { name: 'sentinel-usecase-store' }
  )
);
