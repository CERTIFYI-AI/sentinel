// @ts-nocheck
/**
 * usePolicyData – React Query hooks for the Policy Management module.
 * All data fetching for policies goes through here; components stay clean.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  Policy,
  PolicyTemplate,
  PolicyVersion,
  PolicySignature,
  PolicyComment,
  PolicyAuditLog,
  PolicyListParams,
  PolicyListResponse,
  CreatePolicyPayload,
  UpdatePolicyPayload,
  ApproveRejectPayload,
  SharePolicyPayload,
} from "@/types/policy";

/* ─── Query key factory ──────────────────────────────────────────────── */
export const policyKeys = {
  all:       () => ["policies"] as const,
  list:      (p: PolicyListParams) => ["policies", "list", p] as const,
  detail:    (id: string) => ["policies", id] as const,
  versions:  (id: string) => ["policies", id, "versions"] as const,
  signatures:(id: string) => ["policies", id, "signatures"] as const,
  comments:  (id: string) => ["policies", id, "comments"] as const,
  audit:     (id: string) => ["policies", id, "audit"] as const,
  templates: (fw?: string) => ["policy-templates", fw ?? "all"] as const,
  stats:     () => ["policies", "stats"] as const,
};

/* ─── List / search ──────────────────────────────────────────────────── */
export function usePolicies(params: PolicyListParams = {}) {
  return useQuery({
    queryKey: policyKeys.list(params),
    queryFn: () =>
      api.get<PolicyListResponse>("/policies", { params }),
    staleTime: 30_000,
    keepPreviousData: true,
  });
}

/* ─── Single policy ──────────────────────────────────────────────────── */
export function usePolicy(id: string) {
  return useQuery({
    queryKey: policyKeys.detail(id),
    queryFn: () => api.get<Policy>(`/policies/${id}`),
    enabled: !!id,
    staleTime: 30_000,
  });
}

/* ─── Templates ──────────────────────────────────────────────────────── */
export function usePolicyTemplates(framework?: string) {
  return useQuery({
    queryKey: policyKeys.templates(framework),
    queryFn: () =>
      api.get<PolicyTemplate[]>("/policies/templates", {
        params: framework ? { framework } : undefined,
      }),
    staleTime: 5 * 60_000,
  });
}

/* ─── Version history ────────────────────────────────────────────────── */
export function usePolicyVersions(policyId: string) {
  return useQuery({
    queryKey: policyKeys.versions(policyId),
    queryFn: () =>
      api.get<PolicyVersion[]>(`/policies/${policyId}/versions`),
    enabled: !!policyId,
  });
}

/* ─── Signatures ─────────────────────────────────────────────────────── */
export function usePolicySignatures(policyId: string) {
  return useQuery({
    queryKey: policyKeys.signatures(policyId),
    queryFn: () =>
      api.get<PolicySignature[]>(`/policies/${policyId}/signatures`),
    enabled: !!policyId,
  });
}

/* ─── Comments ───────────────────────────────────────────────────────── */
export function usePolicyComments(policyId: string) {
  return useQuery({
    queryKey: policyKeys.comments(policyId),
    queryFn: () =>
      api.get<PolicyComment[]>(`/policies/${policyId}/comments`),
    enabled: !!policyId,
    refetchInterval: 15_000,
  });
}

/* ─── Audit log ──────────────────────────────────────────────────────── */
export function usePolicyAudit(policyId: string) {
  return useQuery({
    queryKey: policyKeys.audit(policyId),
    queryFn: () =>
      api.get<PolicyAuditLog[]>(`/policies/${policyId}/audit`),
    enabled: !!policyId,
  });
}

/* ─── Stats / dashboard cards ────────────────────────────────────────── */
export function usePolicyStats() {
  return useQuery({
    queryKey: policyKeys.stats(),
    queryFn: () =>
      api.get<{
        total: number;
        active: number;
        draft: number;
        pending_review: number;
        expired: number;
        expiring_soon: number;
      }>("/policies/stats"),
    staleTime: 60_000,
  });
}

/* ─── Mutations ──────────────────────────────────────────────────────── */
export function useCreatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePolicyPayload) =>
      api.post<Policy>("/policies", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: policyKeys.all() }),
  });
}

export function useCreatePolicyFromTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { template_id: string; title?: string }) =>
      api.post<Policy>("/policies/from-template", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: policyKeys.all() }),
  });
}

export function useUpdatePolicy(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdatePolicyPayload) =>
      api.patch<Policy>(`/policies/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: policyKeys.detail(id) });
      qc.invalidateQueries({ queryKey: policyKeys.all() });
    },
  });
}

export function useDeletePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/policies/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: policyKeys.all() }),
  });
}

export function useSubmitPolicyForReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`/policies/${id}/submit-review`),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: policyKeys.detail(id) });
      qc.invalidateQueries({ queryKey: policyKeys.all() });
    },
  });
}

export function useApproveRejectPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: ApproveRejectPayload & { id: string }) =>
      api.post(`/policies/${id}/review-decision`, payload),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: policyKeys.detail(id) });
      qc.invalidateQueries({ queryKey: policyKeys.all() });
    },
  });
}

export function useSignPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, signature }: { id: string; signature: string }) =>
      api.post<PolicySignature>(`/policies/${id}/sign`, { signature }),
    onSuccess: (_d, { id }) =>
      qc.invalidateQueries({ queryKey: policyKeys.signatures(id) }),
  });
}

export function useSharePolicy() {
  return useMutation({
    mutationFn: ({ id, ...payload }: SharePolicyPayload & { id: string }) =>
      api.post(`/policies/${id}/share`, payload),
  });
}

export function useAddPolicyComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      api.post<PolicyComment>(`/policies/${id}/comments`, { body }),
    onSuccess: (_d, { id }) =>
      qc.invalidateQueries({ queryKey: policyKeys.comments(id) }),
  });
}

export function useExportPolicyPdf() {
  return useMutation({
    mutationFn: (id: string) =>
      api.get<Blob>(`/policies/${id}/export/pdf`, {
        responseType: "blob",
      }),
    onSuccess: (blob, id) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `policy-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}

export function usePublishPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/policies/${id}/publish`),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: policyKeys.detail(id) });
      qc.invalidateQueries({ queryKey: policyKeys.all() });
    },
  });
}

export function useArchivePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/policies/${id}/archive`),
    onSuccess: () => qc.invalidateQueries({ queryKey: policyKeys.all() }),
  });
}

export function useRestorePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/policies/${id}/restore`),
    onSuccess: () => qc.invalidateQueries({ queryKey: policyKeys.all() }),
  });
}

export function useClonePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Policy>(`/policies/${id}/clone`),
    onSuccess: () => qc.invalidateQueries({ queryKey: policyKeys.all() }),
  });
}
