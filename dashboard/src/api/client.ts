// src/api/client.ts
import type {
  TenantConfig, ApiKey, ApiKeyCreateResponse, TeamMember, TeamInvite,
  MetricsSummary, TrustDataPoint, AuditEntry, HitlItem,
  ComplianceFramework, ModelConfig, ModelHealth, ModelTestResult,
  NotificationConfig, AuthTokenResponse,
} from "./types";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

let _token: string | null = localStorage.getItem("sentinel_token");

export function setToken(t: string) {
  _token = t;
  localStorage.setItem("sentinel_token", t);
}
export function clearToken() {
  _token = null;
  localStorage.removeItem("sentinel_token");
}
export function getToken() { return _token; }

async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string> || {}),
  };
  if (_token) headers["Authorization"] = `Bearer ${_token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error((body as Record<string, unknown>).detail as string || res.statusText);
    (err as unknown as Record<string, unknown>).status = res.status;
    throw err;
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// Auth
export const login = (body: Record<string, unknown>) =>
  api<AuthTokenResponse>("/auth/token", { method: "POST", body: JSON.stringify(body) });
export const register = (body: Record<string, unknown>) =>
  api<AuthTokenResponse>("/auth/register", { method: "POST", body: JSON.stringify(body) });

// Metrics
export const fetchMetrics = () => api<MetricsSummary>("/dashboard/metrics");
export const fetchTrustTimeline = () => api<TrustDataPoint[]>("/dashboard/trust-timeline");

// Audit
export const fetchAuditLog = () => api<AuditEntry[]>("/audit");

// HITL
export const fetchHitlQueue = () => api<HitlItem[]>("/hitl/queue");
export const reviewHitl = (id: string, action: string) =>
  api<HitlItem>(`/hitl/queue/${id}/review`, { method: "POST", body: JSON.stringify({ action }) });

// Config
export const fetchConfig = () => api<TenantConfig>("/tenants/config");
export const updateConfig = (data: Partial<TenantConfig>) =>
  api<TenantConfig>("/tenants/config", { method: "PATCH", body: JSON.stringify(data) });

// API Keys
export const fetchApiKeys = () => api<ApiKey[]>("/auth/keys");
export const createApiKey = (data: { name: string; role: string; expires_in?: string }) =>
  api<ApiKeyCreateResponse>("/auth/keys", { method: "POST", body: JSON.stringify(data) });
export const revokeApiKey = (id: string) =>
  api<{ ok: boolean }>(`/auth/keys/${id}`, { method: "DELETE" });

// Compliance
export const fetchFrameworks = () => api<ComplianceFramework[]>("/compliance/frameworks");
export const toggleFramework = (id: string, enabled: boolean) =>
  api<ComplianceFramework>(`/compliance/frameworks/${id}`, { method: "PATCH", body: JSON.stringify({ enabled }) });

// Models
export const fetchModels = async (): Promise<ModelConfig[]> => {
  try {
    return await api<ModelConfig[]>("/models");
  } catch {
    return [
      { id: "gpt-4o", display_name: "GPT-4o", model_name: "gpt-4o", provider: "openai", role: "primary", status: "active", created_at: "2026-01-15", version: "2026-05-13", description: "Latest multimodal model from OpenAI" },
      { id: "claude-35-sonnet", display_name: "Claude 3.5 Sonnet", model_name: "claude-3-5-sonnet", provider: "anthropic", role: "fallback", status: "active", created_at: "2026-03-01", version: "20241022", description: "Advanced reasoning and coding model" },
      { id: "llama-3-70b", display_name: "Llama 3 70B", model_name: "llama-3-70b", provider: "local", role: "fallback", status: "active", created_at: "2026-04-18", version: "3.0", description: "Open-source large language model" },
      { id: "gemini-pro", display_name: "Gemini Pro", model_name: "gemini-pro", provider: "custom", role: "fallback", status: "active", created_at: "2026-02-08", version: "1.5", description: "Google multimodal AI model" },
    ] as ModelConfig[];
  }
};
export const createModel = (data: Partial<ModelConfig> & { api_key?: string; base_url?: string }) =>
  api<ModelConfig>("/models", { method: "POST", body: JSON.stringify(data) });
export const updateModel = (id: string, data: Partial<ModelConfig>) =>
  api<ModelConfig>(`/models/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteModel = (id: string) =>
  api<{ ok: boolean }>(`/models/${id}`, { method: "DELETE" });
export const fetchModelHealthAll = () => api<Record<string, ModelHealth>>("/models/health/all");
export const testModel = (id: string, data: Record<string, unknown>) =>
  api<ModelTestResult>(`/models/${id}/test`, { method: "POST", body: JSON.stringify(data) });
export const resetCircuitBreaker = (id: string) =>
  api<{ ok: boolean }>(`/models/${id}/reset-cb`, { method: "POST" });

// Team
export const fetchTeamMembers = () => api<TeamMember[]>("/team/members");
export const inviteMember = (data: { email: string; role: string }) =>
  api<TeamInvite>("/team/invites", { method: "POST", body: JSON.stringify(data) });
export const removeMember = (id: string) =>
  api<{ ok: boolean }>(`/team/members/${id}`, { method: "DELETE" });
export const updateMemberRole = (id: string, role: string) =>
  api<TeamMember>(`/team/members/${id}`, { method: "PATCH", body: JSON.stringify({ role }) });

// Notifications
export const fetchNotifications = () => api<NotificationConfig>("/notifications/config");
export const updateNotifications = (data: Partial<NotificationConfig>) =>
  api<NotificationConfig>("/notifications/config", { method: "PATCH", body: JSON.stringify(data) });
export const testWebhook = (url: string) =>
  api<{ ok: boolean }>("/notifications/test-webhook", { method: "POST", body: JSON.stringify({ url }) });
