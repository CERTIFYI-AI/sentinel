// src/hooks/use-settings.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchConfig, updateConfig, fetchApiKeys, createApiKey, revokeApiKey, fetchTeamMembers, inviteMember, fetchNotifications, updateNotifications, fetchFrameworks, toggleFramework } from "../api/client";
import type { TenantConfig, ApiKey, ApiKeyCreateResponse, TeamMember, NotificationConfig, ComplianceFramework } from "../api/types";
import { toast } from "sonner";

export function useTenantConfig() {
  return useQuery<TenantConfig>({ queryKey: ["tenant-config"], queryFn: fetchConfig, staleTime: 60_000 });
}
export function useUpdateTenantConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TenantConfig>) => updateConfig(data),
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: ["tenant-config"] });
      const prev = qc.getQueryData<TenantConfig>(["tenant-config"]);
      if (prev) qc.setQueryData(["tenant-config"], { ...prev, ...data });
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(["tenant-config"], ctx.prev); toast.error("Failed to save settings"); },
    onSuccess: () => toast.success("Settings saved"),
    onSettled: () => qc.invalidateQueries({ queryKey: ["tenant-config"] }),
  });
}
export function useApiKeys() {
  return useQuery<ApiKey[]>({ queryKey: ["api-keys"], queryFn: fetchApiKeys });
}
export function useCreateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; role: string; expires_in?: string }) => createApiKey(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-keys"] }),
  });
}
export function useRevokeApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => revokeApiKey(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["api-keys"] });
      const prev = qc.getQueryData<ApiKey[]>(["api-keys"]);
      qc.setQueryData<ApiKey[]>(["api-keys"], old => old?.filter(k => k.id !== id) ?? []);
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(["api-keys"], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ["api-keys"] }),
  });
}
export function useTeamMembers() {
  return useQuery<TeamMember[]>({ queryKey: ["team"], queryFn: fetchTeamMembers });
}
export function useInviteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; role: string }) => inviteMember(data),
    onSuccess: () => { toast.success("Invitation sent"); qc.invalidateQueries({ queryKey: ["team"] }); },
  });
}
export function useNotificationConfig() {
  return useQuery<NotificationConfig>({ queryKey: ["notifications"], queryFn: fetchNotifications });
}
export function useUpdateNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<NotificationConfig>) => updateNotifications(data),
    onSuccess: () => { toast.success("Notification settings saved"); qc.invalidateQueries({ queryKey: ["notifications"] }); },
  });
}
export function useComplianceFrameworks() {
  return useQuery<ComplianceFramework[]>({ queryKey: ["frameworks"], queryFn: fetchFrameworks });
}
export function useToggleFramework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => toggleFramework(id, enabled),
    onSuccess: (fw) => { toast.success(`${fw.name} ${fw.enabled ? "enabled" : "disabled"}`); qc.invalidateQueries({ queryKey: ["frameworks"] }); },
  });
}
