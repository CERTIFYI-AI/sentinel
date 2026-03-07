import os, pathlib

BASE = pathlib.Path(__file__).parent / 'dashboard'

def w(p, c):
    f = BASE / p
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(c)
    print(f'  wrote {p}')

    # ━━━ SECTION 1: index.css (brand color replacement) ━━━
w('src/index.css', '''@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222 84% 5%;
    --card: 0 0% 100%;
    --card-foreground: 222 84% 5%;
    --popover: 0 0% 100%;
    --popover-foreground: 222 84% 5%;
    --primary: 136 45% 38%;
    --primary-foreground: 0 0% 100%;
    --secondary: 220 15% 96%;
    --secondary-foreground: 222 47% 11%;
    --muted: 220 15% 96%;
    --muted-foreground: 220 9% 46%;
    --accent: 220 15% 96%;
    --accent-foreground: 222 47% 11%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 98%;
    --border: 220 13% 91%;
    --input: 220 13% 91%;
    --ring: 136 45% 38%;
    --radius: 0.4rem;
    --trust-high: 142 71% 45%;
    --trust-medium: 38 92% 50%;
    --trust-low: 0 72% 51%;
    --intervention-none: 220 9% 46%;
    --intervention-regen: 217 91% 60%;
    --intervention-upgrade: 38 92% 50%;
    --intervention-hitl: 0 72% 51%;
  }

  .dark {
    --primary: 136 45% 38%;
    --primary-foreground: 0 0% 100%;
    --ring: 136 45% 38%;
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 6% 6%;
    --card-foreground: 0 0% 98%;
    --popover: 240 6% 6%;
    --popover-foreground: 0 0% 98%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --radius: 0.4rem;
    --trust-high: 142 71% 45%;
    --trust-medium: 38 92% 50%;
    --trust-low: 0 72% 51%;
    --intervention-none: 220 9% 46%;
    --intervention-regen: 217 91% 60%;
    --intervention-upgrade: 38 92% 50%;
    --intervention-hitl: 0 72% 51%;
    --brand: 136 45% 38%;
    --brand-subtle: 136 45% 12%;
    --brand-foreground: 136 45% 80%;
    --status-mandatory: 0 72% 51%;
    --status-certifiable: 217 91% 60%;
    --status-voluntary: 136 45% 45%;
    --status-guide: 220 9% 46%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-family: "IBM Plex Sans", system-ui, sans-serif;
  }
}

.font-mono {
  font-family: "IBM Plex Mono", monospace;
}

@keyframes trust-counter {
  from { --n: 0; }
  to { --n: 9247; }
}

.trust-animate {
  animation: trust-counter 1.8s ease-out forwards;
  counter-reset: n var(--n, 0);
}

.recharts-tooltip-wrapper .recharts-default-tooltip {
  background: hsl(var(--card)) !important;
  border: 1px solid hsl(var(--border)) !important;
  border-radius: var(--radius);
}
''')

# ━━━ chart-colors.ts ━━━
w('src/lib/chart-colors.ts', '''// src/lib/chart-colors.ts
export const chartColors = {
  brand: "hsl(var(--brand))",
  brandSubtle: "hsl(var(--brand-subtle))",
  trustHigh: "hsl(var(--trust-high))",
  trustMedium: "hsl(var(--trust-medium))",
  trustLow: "hsl(var(--trust-low))",
  interventionNone: "hsl(var(--intervention-none))",
  interventionRegen: "hsl(var(--intervention-regen))",
  interventionUpgrade: "hsl(var(--intervention-upgrade))",
  interventionHitl: "hsl(var(--intervention-hitl))",
  muted: "hsl(var(--muted-foreground))",
  grid: "hsl(var(--border))",
} as const;

export function trustScoreColor(score: number): string {
  if (score >= 0.85) return chartColors.trustHigh;
  if (score >= 0.70) return chartColors.trustMedium;
  return chartColors.trustLow;
}

export function trustScoreClass(score: number): string {
  if (score >= 0.85) return "text-[hsl(var(--trust-high))]";
  if (score >= 0.70) return "text-[hsl(var(--trust-medium))]";
  return "text-[hsl(var(--trust-low))]";
}
''')

# ━━━ api/client.ts ━━━
w('src/api/client.ts', '''// src/api/client.ts
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
export const fetchModels = () => api<ModelConfig[]>("/models");
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
''')

# ━━━ api/types.ts ━━━
w('src/api/types.ts', '''// src/api/types.ts
export interface TenantConfig {
  id: string; org_name: string; display_name: string;
  plan: "free" | "pro" | "enterprise"; timezone: string; date_format: string;
  trust_threshold: number; injection_threshold: number; drift_sigma: number;
  hitl_response: string; cb_failure_threshold: number; cb_recovery_timeout: number;
  pii_mode: "full" | "regex"; pii_entities: string[];
  pii_redaction_style: "entity_type" | "hash" | "fixed";
  pii_custom_patterns: { regex: string; entity_type: string }[]; created_at: string;
}
export interface ApiKey {
  id: string; name: string; role: "admin" | "reviewer" | "api";
  prefix: string; created_at: string; last_used: string | null;
  expires_at: string | null; status: "active" | "expired" | "revoked";
}
export interface ApiKeyCreateResponse {
  id: string; name: string; role: string; key: string;
  prefix: string; created_at: string; expires_at: string | null;
}
export interface TeamMember {
  id: string; email: string; name: string; role: "admin" | "reviewer" | "api";
  joined_at: string; last_active: string | null; status: "active" | "pending";
}
export interface TeamInvite { id: string; email: string; role: string; created_at: string; }
export interface MetricsSummary {
  total_requests: number; avg_trust_score: number; avg_latency_ms: number;
  intervention_rate: number; pii_detection_rate: number; requests_24h: number;
}
export interface TrustDataPoint { timestamp: string; score: number; count: number; }
export interface AuditEntry {
  id: string; timestamp: string; action: string; actor: string;
  resource: string; details: string; trust_score: number | null;
  chain_hash: string; prev_hash: string;
}
export interface HitlItem {
  id: string; created_at: string; prompt: string; response: string;
  trust_score: number; intervention: string;
  status: "pending" | "approved" | "rejected";
  reviewer: string | null; reviewed_at: string | null;
}
export interface ComplianceFramework {
  id: string; name: string; description: string; status_label: string;
  status_type: "mandatory" | "certifiable" | "voluntary" | "guide";
  flag: string; enabled: boolean; controls_met: number; controls_total: number;
}
export interface ModelConfig {
  id: string; provider: "openai" | "anthropic" | "azure" | "local" | "custom";
  model_name: string; display_name: string; version: string;
  role: "primary" | "fallback" | "evaluation" | "disabled";
  status: "active" | "degraded" | "unavailable";
  api_key_set: boolean; created_at: string;
}
export interface ModelHealth {
  model_id: string; cb_state: "CLOSED" | "OPEN" | "HALF_OPEN";
  failure_count: number; last_failure: string | null;
  avg_trust_7d: number; avg_latency_p95: number; cost_per_1k: number;
  requests_7d: number; last_used: string | null;
}
export interface ModelTestResult {
  trust_score: number;
  sub_scores: { rag: number; cross_check: number; pii: number; drift: number };
  intervention: string; latency_ms: number;
  latency_breakdown: { sanitize: number; verify: number; circuit_breaker: number };
  cost: number; pii_found: string[]; response_text: string;
  blocked: boolean; block_reason: string | null;
}
export interface NotificationConfig {
  trust_degradation: { enabled: boolean; threshold: number };
  cb_opened: { enabled: boolean };
  hitl_depth: { enabled: boolean; count: number };
  audit_violation: { enabled: boolean };
  pii_spike: { enabled: boolean; percentage: number };
  channel: "email" | "webhook" | "slack" | "none";
  channel_target: string;
}
export interface AuthTokenResponse { access_token: string; token_type: string; }
''')

# ━━━ hooks/use-auth.ts ━━━
w('src/hooks/use-auth.ts', '''// src/hooks/use-auth.ts
import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, setToken, clearToken } from "../api/client";

function decodePayload(token: string): Record<string, unknown> {
  try {
    const base64 = token.split(".")[1];
    return JSON.parse(atob(base64));
  } catch { return {}; }
}

export function useAuth() {
  const token = getToken();
  const user = useMemo(() => token ? decodePayload(token) : null, [token]);
  const isAuthenticated = Boolean(token);

  const loginFn = useCallback((t: string) => { setToken(t); }, []);
  const logout = useCallback(() => {
    clearToken();
    window.location.href = "/login";
  }, []);

  return { token, user, isAuthenticated, login: loginFn, logout };
}

export function useRequireAuth() {
  const navigate = useNavigate();
  const { token, user, isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    navigate("/login", { replace: true });
  }
  return { user, tenant: (user as Record<string, unknown>)?.tenant as string | undefined };
}
''')

# ━━━ hooks/use-models.ts ━━━
w('src/hooks/use-models.ts', '''// src/hooks/use-models.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchModels, fetchModelHealthAll, updateModel, resetCircuitBreaker, testModel } from "../api/client";
import type { ModelConfig, ModelHealth, ModelTestResult } from "../api/types";
import { toast } from "sonner";

export function useModels() {
  return useQuery<ModelConfig[]>({ queryKey: ["models"], queryFn: fetchModels, staleTime: 30_000 });
}

export function useModelHealth() {
  return useQuery<Record<string, ModelHealth>>({ queryKey: ["models", "health"], queryFn: fetchModelHealthAll, staleTime: 10_000 });
}

export function useSetModelRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => updateModel(id, { role: role as ModelConfig["role"] }),
    onMutate: async ({ id, role }) => {
      await qc.cancelQueries({ queryKey: ["models"] });
      const prev = qc.getQueryData<ModelConfig[]>(["models"]);
      qc.setQueryData<ModelConfig[]>(["models"], old => old?.map(m => m.id === id ? { ...m, role: role as ModelConfig["role"] } : (role === "primary" && m.role === "primary") ? { ...m, role: "fallback" } : m) ?? []);
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(["models"], ctx.prev); toast.error("Failed to update model role"); },
    onSettled: () => qc.invalidateQueries({ queryKey: ["models"] }),
  });
}

export function useResetCircuitBreaker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resetCircuitBreaker(id),
    onSuccess: (_d, id) => { toast.success("Circuit breaker reset"); qc.invalidateQueries({ queryKey: ["models", "health"] }); },
  });
}

export function useTestModel() {
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => testModel(id, data) });
}
''')

# ━━━ hooks/use-settings.ts ━━━
w('src/hooks/use-settings.ts', '''// src/hooks/use-settings.ts
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
''')

# ━━━ components/auth/AuthLayout.tsx ━━━
w('src/components/auth/AuthLayout.tsx', '''// src/components/auth/AuthLayout.tsx
import { type ReactNode, useEffect, useState } from "react";

function AnimatedCounter() {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 1800;
    const target = 0.9247;
    function tick(now: number) {
      const t = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(ease * target);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, []);
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Live Trust Score</p>
      <p className="font-mono text-[88px] font-bold leading-none" style={{ color: "hsl(var(--brand))", textShadow: "0 0 40px hsl(136 45% 38% / 0.4)" }}>
        {val.toFixed(4)}
      </p>
    </div>
  );
}

const proofs = [
  "TAMPER-PROOF SHA-256 AUDIT CHAIN",
  "7 PREBUILT COMPLIANCE FRAMEWORKS",
  "REAL-TIME PIPELINE TRUST SCORING",
];

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen">
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-between p-10" style={{ background: "hsl(var(--brand-subtle))" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-white" style={{ background: "hsl(var(--brand))" }}>S</div>
          <div><span className="font-semibold text-foreground">Sentinel</span> <span className="text-muted-foreground">by Certifyi</span></div>
        </div>
        <div className="flex flex-col items-center gap-10">
          <AnimatedCounter />
          <div className="space-y-3">
            {proofs.map(p => (
              <div key={p} className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(var(--brand))" }} />{p}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">certifyi.ai</p>
      </div>
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-[380px]">{children}</div>
      </div>
    </div>
  );
}
''')

# ━━━ components/auth/LoginForm.tsx ━━━
w('src/components/auth/LoginForm.tsx', '''// src/components/auth/LoginForm.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { login } from "../../api/client";

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [tab, setTab] = useState<"apikey" | "email">("apikey");
  const [apiKey, setApiKey] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const body = tab === "apikey" ? { api_key: apiKey } : { email, password };
      const res = await login(body);
      localStorage.setItem("sentinel_token", res.access_token);
      onSuccess();
    } catch (err: unknown) {
      setError("Invalid credentials. Please try again.");
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Sign in to Sentinel</h1>
        <p className="text-sm text-muted-foreground mt-1">AI governance platform</p>
      </div>

      <div className="flex border-b border-border">
        {(["apikey", "email"] as const).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {t === "apikey" ? "API Key" : "Email & Password"}
          </button>
        ))}
      </div>

      {error && <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md p-3">{error}</div>}

      {tab === "apikey" ? (
        <div className="relative">
          <input type={show ? "text" : "password"} value={apiKey} onChange={e => setApiKey(e.target.value)}
            placeholder="sk-sentinel-..." className="w-full h-10 rounded-md border border-input bg-background px-3 pr-10 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-2 text-muted-foreground hover:text-foreground">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Work email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com" className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <div className="flex justify-between"><label className="text-sm font-medium">Password</label>
              <button type="button" className="text-xs text-muted-foreground hover:text-[hsl(var(--brand-foreground))]">Forgot password?</button></div>
            <div className="relative mt-1">
              <input type={show ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-2 text-muted-foreground hover:text-foreground">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      <button type="submit" disabled={loading}
        className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Signing in...</> : tab === "apikey" ? "Continue" : "Sign in"}
      </button>

      <div className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link to="/signup" className="text-[hsl(var(--brand-foreground))] hover:underline">Create one &rarr;</Link>
      </div>
    </form>
  );
}
''')

# ━━━ components/auth/SignupForm.tsx ━━━
w('src/components/auth/SignupForm.tsx', '''// src/components/auth/SignupForm.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { register, login } from "../../api/client";

function strengthLevel(pw: string): number {
  if (pw.length < 8) return 0;
  let s = 1;
  if (/[0-9]/.test(pw) || /[^a-zA-Z0-9]/.test(pw)) s = 2;
  if (pw.length >= 12 && /[0-9]/.test(pw) && /[^a-zA-Z0-9]/.test(pw)) s = 3;
  return s;
}
const strengthColors = ["bg-destructive", "bg-[hsl(var(--trust-medium))]", "bg-[hsl(var(--trust-high))]", "bg-primary"];
const plans = [
  { id: "free", label: "FREE", price: "$0/month", features: "1,000 requests/mo \u00b7 1 tenant \u00b7 Community support" },
  { id: "pro", label: "MOST POPULAR", price: "$49/month", features: "50,000 requests/mo \u00b7 5 tenants \u00b7 Email support \u00b7 All frameworks" },
  { id: "enterprise", label: "ENTERPRISE", price: "Contact sales", features: "Unlimited \u00b7 Custom tenants \u00b7 SLA \u00b7 Dedicated support" },
] as const;

export function SignupForm({ onSuccess }: { onSuccess: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [plan, setPlan] = useState("pro");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const strength = strengthLevel(password);
  const canStep1 = orgName.length >= 2 && /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) && password === confirm && strength >= 1;

  async function handleSubmit() {
    setLoading(true); setErrors({});
    try {
      await register({ org_name: orgName, email, password, plan });
      const tok = await login({ email, password });
      localStorage.setItem("sentinel_token", tok.access_token);
      onSuccess();
    } catch (err: unknown) {
      const e = err as { status?: number };
      if (e.status === 409) setErrors({ email: "An account with this email already exists" });
      else setErrors({ form: "Registration failed. Please try again." });
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{step === 1 ? "Create your account" : "Choose your plan"}</h1>
        <p className="text-sm text-muted-foreground mt-1">{step === 1 ? "Get started in under 2 minutes" : "All plans include a 14-day free trial"}</p>
      </div>
      {errors.form && <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md p-3">{errors.form}</div>}
      {step === 1 ? (
        <div className="space-y-4">
          <div><label className="text-sm font-medium">Organization name</label>
            <input value={orgName} onChange={e => setOrgName(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div><label className="text-sm font-medium">Work email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
          </div>
          <div><label className="text-sm font-medium">Create password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <div className="flex gap-1 mt-2">{[0,1,2,3].map(i => <div key={i} className={`h-1 flex-1 rounded-full ${i <= strength ? strengthColors[strength] : "bg-muted"}`} />)}</div>
          </div>
          <div><label className="text-sm font-medium">Confirm password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            {confirm && confirm !== password && <p className="text-xs text-destructive mt-1">Passwords do not match</p>}
          </div>
          <button onClick={() => setStep(2)} disabled={!canStep1}
            className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
            Continue <ArrowRight className="w-4 h-4" /></button>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map(p => (
            <button key={p.id} type="button" onClick={() => setPlan(p.id)}
              className={`w-full text-left rounded-lg border p-4 transition-colors ${plan === p.id ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] uppercase tracking-widest font-medium ${p.id === "pro" ? "text-primary" : "text-muted-foreground"}`}>{p.label}</span>
                {plan === p.id && <Check className="w-4 h-4 text-primary" />}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{p.features}</p>
              <p className="font-mono text-sm font-semibold mt-2">{p.price}</p>
            </button>
          ))}
          <p className="text-[11px] text-muted-foreground">By creating an account you agree to our <span className="underline">Terms of Service</span> and <span className="underline">Privacy Policy</span>.</p>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="h-10 px-4 rounded-md border border-border text-sm hover:bg-accent flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back</button>
            <button onClick={handleSubmit} disabled={loading}
              className="flex-1 h-10 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</> : "Create account"}</button>
          </div>
        </div>
      )}
      <div className="text-center text-sm text-muted-foreground">
        Already have an account? <Link to="/login" className="text-[hsl(var(--brand-foreground))] hover:underline">Sign in</Link>
      </div>
    </div>
  );
}
''')

# ━━━ pages/Login.tsx & Signup.tsx ━━━
w('src/pages/Login.tsx', '''// src/pages/Login.tsx
import { useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/auth/AuthLayout";
import { LoginForm } from "../components/auth/LoginForm";

export default function Login() {
  const navigate = useNavigate();
  return <AuthLayout><LoginForm onSuccess={() => navigate("/overview")} /></AuthLayout>;
}
''')

w('src/pages/Signup.tsx', '''// src/pages/Signup.tsx
import { useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/auth/AuthLayout";
import { SignupForm } from "../components/auth/SignupForm";

export default function Signup() {
  const navigate = useNavigate();
  return <AuthLayout><SignupForm onSuccess={() => navigate("/overview")} /></AuthLayout>;
}
''')

# ━━━ Model components ━━━
w('src/components/models/ProviderBadge.tsx', '''// src/components/models/ProviderBadge.tsx
const cfg: Record<string, { bg: string; text: string; label: string }> = {
  openai: { bg: "bg-green-900/30", text: "text-green-400", label: "OpenAI" },
  anthropic: { bg: "bg-orange-900/30", text: "text-orange-400", label: "Anthropic" },
  azure: { bg: "bg-blue-900/30", text: "text-blue-400", label: "Azure" },
  local: { bg: "bg-zinc-800", text: "text-zinc-400", label: "Local" },
  custom: { bg: "bg-purple-900/30", text: "text-purple-400", label: "Custom" },
};
export function ProviderBadge({ provider, size = "sm" }: { provider: string; size?: "sm" | "md" }) {
  const c = cfg[provider] || cfg.custom;
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 font-medium ${c.bg} ${c.text} ${size === "md" ? "text-xs" : "text-[10px]"}`}>{c.label}</span>;
}
''')

w('src/components/models/ModelCard.tsx', '''// src/components/models/ModelCard.tsx
import { MoreHorizontal } from "lucide-react";
import { ProviderBadge } from "./ProviderBadge";
import { trustScoreColor } from "../../lib/chart-colors";
import type { ModelConfig, ModelHealth } from "../../api/types";

const roleBadge: Record<string, string> = {
  primary: "bg-primary/20 text-primary border-primary/30",
  fallback: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  evaluation: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  disabled: "bg-destructive/20 text-destructive border-destructive/30",
};
const cbDot: Record<string, string> = {
  CLOSED: "bg-[hsl(var(--trust-high))]",
  OPEN: "bg-destructive animate-pulse",
  HALF_OPEN: "bg-[hsl(var(--trust-medium))]",
};

export function ModelCard({ model, health, selected, onSelect, onSetRole, onTest }:
  { model: ModelConfig; health?: ModelHealth; selected: boolean; onSelect: () => void;
    onSetRole: (r: string) => void; onTest: () => void }) {
  const h = health;
  return (
    <div className={`rounded-lg border p-4 space-y-3 transition-colors ${selected ? "border-primary bg-primary/5" : "border-border"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={selected} onChange={onSelect} className="rounded border-border" />
          <ProviderBadge provider={model.provider} />
        </div>
        <span className={`w-2 h-2 rounded-full ${model.status === "active" ? "bg-[hsl(var(--trust-high))]" : model.status === "degraded" ? "bg-[hsl(var(--trust-medium))]" : "bg-destructive"}`} />
      </div>
      <div>
        <p className="font-mono text-base font-bold">{model.display_name}</p>
        <p className="text-xs text-muted-foreground font-mono">{model.model_name}@{model.version}</p>
      </div>
      {h && (
        <div className="grid grid-cols-4 gap-2">
          {[["Trust", h.avg_trust_7d.toFixed(4), trustScoreColor(h.avg_trust_7d)],
            ["Lat", h.avg_latency_p95 + "ms", h.avg_latency_p95 > 1000 ? "hsl(var(--trust-low))" : h.avg_latency_p95 > 500 ? "hsl(var(--trust-medium))" : undefined],
            ["Reqs", h.requests_7d >= 1000 ? (h.requests_7d / 1000).toFixed(1) + "k" : String(h.requests_7d), undefined],
            ["Cost", "$" + h.cost_per_1k.toFixed(4), undefined],
          ].map(([label, val, color]) => (
            <div key={String(label)} className="text-center">
              <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
              <p className="font-mono text-sm" style={color ? { color: String(color) } : undefined}>{val}</p>
            </div>
          ))}
        </div>
      )}
      {h && (
        <div className="flex items-center gap-2 text-xs">
          <span className={`w-1.5 h-1.5 rounded-full ${cbDot[h.cb_state]}`} />
          <span className="font-mono">{h.cb_state}</span>
          <span className="text-muted-foreground">{h.failure_count} failures</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium uppercase ${roleBadge[model.role]}`}>{model.role}</span>
        <div className="flex gap-1">
          {model.role !== "primary" && <button onClick={() => onSetRole("primary")} className="text-xs px-2 py-1 rounded border border-border hover:bg-accent">Set Primary</button>}
          <button onClick={onTest} className="text-xs px-2 py-1 rounded border border-border hover:bg-accent">Test</button>
          <button className="p-1 rounded hover:bg-accent"><MoreHorizontal className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}
''')

# ━━━ pages/ModelInventory.tsx ━━━
w('src/pages/ModelInventory.tsx', '''// src/pages/ModelInventory.tsx
import { useState } from "react";
import { Plus, Search, LayoutGrid, Table } from "lucide-react";
import { useModels, useModelHealth, useSetModelRole } from "../hooks/use-models";
import { ModelCard } from "../components/models/ModelCard";
import type { ModelConfig } from "../api/types";

export default function ModelInventory() {
  const { data: models, isLoading } = useModels();
  const { data: health } = useModelHealth();
  const setRole = useSetModelRole();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [view, setView] = useState<"grid" | "table">("grid");

  const providers = ["all", "openai", "anthropic", "azure", "local", "custom"];
  const filtered = (models ?? []).filter(m =>
    (providerFilter === "all" || m.provider === providerFilter) &&
    (search === "" || m.display_name.toLowerCase().includes(search.toLowerCase()) || m.model_name.toLowerCase().includes(search.toLowerCase()))
  );

  function toggle(id: string) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  if (isLoading) return <div className="p-8"><div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />)}</div></div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Model Inventory</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage LLM providers, monitor health, compare performance</p>
        </div>
        <div className="flex gap-2">
          {selected.size >= 2 && <button className="h-9 px-3 rounded-md border border-border text-sm hover:bg-accent">Compare ({selected.size})</button>}
          <button className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 flex items-center gap-2"><Plus className="w-4 h-4" />Add Model</button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sticky top-0 z-10 bg-background py-2">
        <div className="flex gap-1">
          {providers.map(p => (
            <button key={p} onClick={() => setProviderFilter(p)}
              className={`px-3 py-1.5 text-xs rounded-md capitalize transition-colors ${providerFilter === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>{p}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative"><Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search models..."
              className="h-9 w-56 rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex border border-border rounded-md">
            <button onClick={() => setView("grid")} className={`p-2 ${view === "grid" ? "bg-accent" : ""}`}><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={() => setView("table")} className={`p-2 ${view === "table" ? "bg-accent" : ""}`}><Table className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">No models found</p>
          <p className="text-sm mt-1">Add your first LLM provider to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(m => (
            <ModelCard key={m.id} model={m} health={health?.[m.id]}
              selected={selected.has(m.id)} onSelect={() => toggle(m.id)}
              onSetRole={r => setRole.mutate({ id: m.id, role: r })} onTest={() => {}} />
          ))}
        </div>
      )}
    </div>
  );
}
''')

# ━━━ Settings components ━━━
w('src/components/settings/SettingsNav.tsx', '''// src/components/settings/SettingsNav.tsx
import { NavLink } from "react-router-dom";
import { SlidersHorizontal, Shield, EyeOff, Cpu, Key, ShieldCheck, Bell, Users, CreditCard } from "lucide-react";

const sections = [
  { to: "general", label: "General", icon: SlidersHorizontal },
  { to: "trust", label: "Trust & Safety", icon: Shield },
  { to: "pii", label: "PII Detection", icon: EyeOff },
  { to: "api-keys", label: "API Keys", icon: Key },
  { to: "compliance", label: "Compliance", icon: ShieldCheck },
  { to: "notifications", label: "Notifications", icon: Bell },
  { to: "team", label: "Team", icon: Users },
];

export function SettingsNav() {
  return (
    <nav className="w-[200px] shrink-0 space-y-1">
      {sections.map(s => (
        <NavLink key={s.to} to={`/settings/${s.to}`} end
          className={({ isActive }) => `flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
            isActive ? "bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand-foreground))] border-l-2 border-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}>
          <s.icon className="w-4 h-4" />{s.label}
        </NavLink>
      ))}
      <div className="pt-2 border-t border-border mt-2">
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground/50 cursor-not-allowed">
          <CreditCard className="w-4 h-4" />Billing <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">SOON</span>
        </div>
      </div>
    </nav>
  );
}
''')

# ━━━ Settings sections ━━━
w('src/components/settings/sections/GeneralSettings.tsx', '''// src/components/settings/sections/GeneralSettings.tsx
import { useState, useEffect } from "react";
import { useTenantConfig, useUpdateTenantConfig } from "../../../hooks/use-settings";
import { Copy, Loader2 } from "lucide-react";

export function GeneralSettings() {
  const { data: cfg, isLoading } = useTenantConfig();
  const update = useUpdateTenantConfig();
  const [form, setForm] = useState({ org_name: "", display_name: "", timezone: "UTC", date_format: "ISO 8601" });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (cfg) { setForm({ org_name: cfg.org_name, display_name: cfg.display_name, timezone: cfg.timezone, date_format: cfg.date_format }); setDirty(false); }
  }, [cfg]);

  function change(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); setDirty(true); }

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />)}</div>;

  return (
    <div className="space-y-6 max-w-lg">
      <div><h2 className="text-lg font-semibold">General</h2><p className="text-sm text-muted-foreground">Organization settings</p></div>
      <div><label className="text-sm font-medium">Organization name</label>
        <input value={form.org_name} onChange={e => change("org_name", e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div><label className="text-sm font-medium">Display name</label>
        <input value={form.display_name} onChange={e => change("display_name", e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div><label className="text-sm font-medium">Tenant ID</label>
        <div className="flex gap-2 mt-1"><input readOnly value={cfg?.id ?? ""} className="flex-1 h-10 rounded-md border border-input bg-muted px-3 font-mono text-sm" />
          <button onClick={() => navigator.clipboard.writeText(cfg?.id ?? "")} className="h-10 px-3 rounded-md border border-border hover:bg-accent"><Copy className="w-4 h-4" /></button></div>
      </div>
      <div><label className="text-sm font-medium">Plan</label>
        <span className="ml-2 text-xs uppercase bg-primary/20 text-primary px-2 py-0.5 rounded">{cfg?.plan}</span>
      </div>
      <div><label className="text-sm font-medium">Timezone</label>
        <select value={form.timezone} onChange={e => change("timezone", e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
          {["UTC","America/New_York","America/Chicago","America/Los_Angeles","Europe/London","Europe/Berlin","Asia/Tokyo","Asia/Kathmandu","Australia/Sydney"].map(tz => <option key={tz}>{tz}</option>)}
        </select>
      </div>
      <button onClick={() => update.mutate(form)} disabled={!dirty || update.isPending}
        className="h-10 px-6 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
        {update.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}Save Changes
      </button>
    </div>
  );
}
''')

w('src/components/settings/sections/TrustSafetySettings.tsx', '''// src/components/settings/sections/TrustSafetySettings.tsx
import { useState, useEffect } from "react";
import { useTenantConfig, useUpdateTenantConfig } from "../../../hooks/use-settings";
import { Loader2 } from "lucide-react";

function ThresholdSlider({ label, description, value, onChange, min, max, step }: { label: string; description: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number }) {
  const pct = ((value - min) / (max - min)) * 100;
  const zone = value >= 0.85 ? "HEALTHY" : value >= 0.70 ? "DEGRADED" : "CRITICAL";
  const zoneColor = value >= 0.85 ? "text-[hsl(var(--trust-high))]" : value >= 0.70 ? "text-[hsl(var(--trust-medium))]" : "text-[hsl(var(--trust-low))]";
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <p className="text-xs text-muted-foreground">{description}</p>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[hsl(var(--brand))]" />
      <div className="flex justify-between"><span className={`font-mono text-lg font-bold ${zoneColor}`}>{value.toFixed(2)}</span><span className={`text-xs uppercase ${zoneColor}`}>{zone}</span></div>
    </div>
  );
}

const presets = [{ label: "Healthcare (0.92)", v: 0.92 }, { label: "Finance (0.88)", v: 0.88 }, { label: "General (0.85)", v: 0.85 }];

export function TrustSafetySettings() {
  const { data: cfg, isLoading } = useTenantConfig();
  const update = useUpdateTenantConfig();
  const [threshold, setThreshold] = useState(0.85);
  const [injection, setInjection] = useState(0.80);
  const [drift, setDrift] = useState(2.5);
  const [hitlResp, setHitlResp] = useState("");
  const [cbFailure, setCbFailure] = useState(5);
  const [cbTimeout, setCbTimeout] = useState(60);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (cfg) { setThreshold(cfg.trust_threshold); setInjection(cfg.injection_threshold); setDrift(cfg.drift_sigma); setHitlResp(cfg.hitl_response); setCbFailure(cfg.cb_failure_threshold); setCbTimeout(cfg.cb_recovery_timeout); setDirty(false); }
  }, [cfg]);

  function save() {
    update.mutate({ trust_threshold: threshold, injection_threshold: injection, drift_sigma: drift, hitl_response: hitlResp, cb_failure_threshold: cbFailure, cb_recovery_timeout: cbTimeout });
    setDirty(false);
  }

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-md" />)}</div>;

  return (
    <div className="space-y-8 max-w-lg">
      <div><h2 className="text-lg font-semibold">Trust & Safety</h2></div>
      <ThresholdSlider label="Block threshold" description="Responses below this score trigger the intervention cascade." value={threshold} onChange={v => { setThreshold(v); setDirty(true); }} min={0.60} max={0.99} step={0.01} />
      <div className="flex gap-2">{presets.map(p => <button key={p.label} onClick={() => { setThreshold(p.v); setDirty(true); }} className={`text-xs px-3 py-1 rounded border ${threshold === p.v ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"}`}>{p.label}</button>)}</div>
      <ThresholdSlider label="Injection block threshold" description="Prompts scoring above this are blocked as injections." value={injection} onChange={v => { setInjection(v); setDirty(true); }} min={0.50} max={0.99} step={0.01} />
      <div><label className="text-sm font-medium">Semantic drift alert (&sigma;)</label><p className="text-xs text-muted-foreground">Alert when response embedding drifts this far from baseline.</p>
        <input type="number" step={0.1} value={drift} onChange={e => { setDrift(Number(e.target.value)); setDirty(true); }} className="mt-1 w-32 h-10 rounded-md border border-input bg-background px-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div><label className="text-sm font-medium">HITL canned response</label>
        <textarea rows={3} value={hitlResp} onChange={e => { setHitlResp(e.target.value); setDirty(true); }} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <p className="text-xs text-muted-foreground text-right">{hitlResp.length} / 500</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="text-sm font-medium">CB failure threshold</label>
          <input type="number" value={cbFailure} onChange={e => { setCbFailure(Number(e.target.value)); setDirty(true); }} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 font-mono text-sm" /></div>
        <div><label className="text-sm font-medium">Recovery timeout (s)</label>
          <input type="number" value={cbTimeout} onChange={e => { setCbTimeout(Number(e.target.value)); setDirty(true); }} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 font-mono text-sm" /></div>
      </div>
      <button onClick={save} disabled={!dirty || update.isPending} className="h-10 px-6 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
        {update.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}Save Trust Settings
      </button>
    </div>
  );
}
''')

# — PII Settings —
w('src/components/settings/sections/PiiSettings.tsx', '''// src/components/settings/sections/PiiSettings.tsx
import { useState } from "react";
import { useTenantConfig, useUpdateTenantConfig } from "../../../hooks/use-settings";
import { Loader2 } from "lucide-react";

export function PiiSettings() {
  const { data: config, isLoading } = useTenantConfig();
  const update = useUpdateTenantConfig();
  const [mode, setMode] = useState<"full" | "regex">("full");
  const [entities, setEntities] = useState<string[]>([
    "PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER", "CREDIT_CARD",
    "US_SSN", "IBAN_CODE", "IP_ADDRESS", "MEDICAL_LICENSE"
  ]);
  const [redactionStyle, setRedactionStyle] = useState("entity_type");

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded" />)}</div>;

  const allEntities = [
    "PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER", "CREDIT_CARD",
    "US_SSN", "IBAN_CODE", "IP_ADDRESS", "MEDICAL_LICENSE",
    "LOCATION", "DATE_TIME", "NRP", "ORGANIZATION"
  ];

  function save() {
    update.mutate({ pii_mode: mode, pii_entities: entities, redaction_style: redactionStyle });
  }

  return (
    <div className="space-y-8 max-w-lg">
      <div><h2 className="text-lg font-semibold">PII Detection</h2></div>
      <div className="space-y-4">
        <label className="text-sm font-medium">Detection mode</label>
        <div className="space-y-2">
          <div
            onClick={() => setMode("full")}
            className={`p-4 rounded border cursor-pointer ${mode === "full" ? "border-[hsl(var(--brand))] bg-[hsl(var(--brand-subtle))]" : "border-border"}`}
          >
            <div className="font-medium">Full detection (Presidio + spaCy)</div>
            <div className="text-sm text-muted-foreground">18 entity types. Highest accuracy.</div>
          </div>
          <div
            onClick={() => setMode("regex")}
            className={`p-4 rounded border cursor-pointer ${mode === "regex" ? "border-[hsl(var(--brand))] bg-[hsl(var(--brand-subtle))]" : "border-border"}`}
          >
            <div className="font-medium">Regex fallback</div>
            <div className="text-sm text-muted-foreground">5 entity types. No additional dependencies.</div>
          </div>
        </div>
      </div>
      {mode === "full" && (
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-medium">Enabled entity types</label>
            <div className="space-x-2 text-xs">
              <button className="text-[hsl(var(--brand-foreground))]" onClick={() => setEntities([...allEntities])}>Select all</button>
              <button className="text-muted-foreground" onClick={() => setEntities([])}>Deselect all</button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {allEntities.map(e => (
              <label key={e} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={entities.includes(e)}
                  onChange={() => setEntities(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e])}
                  className="accent-[hsl(var(--brand))]"
                />
                {e}
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-2">
        <label className="text-sm font-medium">Redaction style</label>
        <select
          value={redactionStyle}
          onChange={e => setRedactionStyle(e.target.value)}
          className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="entity_type">Replace with entity type: [EMAIL_ADDRESS]</option>
          <option value="hash">Replace with hash: [3f9a2b...]</option>
          <option value="fixed">Replace with fixed: [REDACTED]</option>
        </select>
      </div>
      <button onClick={save} disabled={update.isPending} className="h-10 px-6 rounded-md bg-primary text-primary-foreground text-sm">
        {update.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save PII Settings"}
      </button>
    </div>
  );
}
''')

# — API Key Settings —
w('src/components/settings/sections/ApiKeySettings.tsx', '''// src/components/settings/sections/ApiKeySettings.tsx
import { useState } from "react";
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from "../../../hooks/use-settings";
import { Loader2, Plus, Copy, Check } from "lucide-react";

export function ApiKeySettings() {
  const { data: keys, isLoading } = useApiKeys();
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyRole, setNewKeyRole] = useState("api");
  const [newKeyExpiry, setNewKeyExpiry] = useState("90d");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>;

  async function handleCreate() {
    const result = await createKey.mutateAsync({ name: newKeyName, role: newKeyRole, expiry: newKeyExpiry });
    if (result?.key) setCreatedKey(result.key);
    setShowCreate(false);
    setNewKeyName("");
  }

  function copyKey(text: string) {
    navigator.clipboard.writeText(text);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  }

  const activeKeys = (keys ?? []).filter((k: Record<string, unknown>) => k.status === "active");
  const expiredKeys = (keys ?? []).filter((k: Record<string, unknown>) => k.status !== "active");

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">API Keys</h2>
          <p className="text-sm text-muted-foreground">{activeKeys.length} active keys &middot; {expiredKeys.length} expired</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm">
          <Plus className="w-4 h-4" /> Create New Key
        </button>
      </div>
      {createdKey && (
        <div className="p-4 rounded border border-[hsl(var(--brand))] bg-[hsl(var(--brand-subtle))] space-y-2">
          <p className="text-sm font-medium">Copy this key. It will never be shown again.</p>
          <div className="flex gap-2">
            <input readOnly value={createdKey} className="flex-1 font-mono text-sm bg-background border rounded px-3 py-2" />
            <button onClick={() => { copyKey(createdKey); }} className="px-3 rounded border">
              {keyCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <button onClick={() => setCreatedKey(null)} className="text-sm text-muted-foreground">Done</button>
        </div>
      )}
      {showCreate && (
        <div className="p-4 rounded border space-y-3">
          <input placeholder="Key name" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} className="w-full rounded border px-3 py-2 text-sm bg-background" />
          <select value={newKeyRole} onChange={e => setNewKeyRole(e.target.value)} className="w-full rounded border px-3 py-2 text-sm bg-background">
            <option value="api">API — proxy access only</option>
            <option value="reviewer">Reviewer — proxy + HITL</option>
            <option value="admin">Admin — full access</option>
          </select>
          <select value={newKeyExpiry} onChange={e => setNewKeyExpiry(e.target.value)} className="w-full rounded border px-3 py-2 text-sm bg-background">
            <option value="30d">30 days</option>
            <option value="90d">90 days</option>
            <option value="1y">1 year</option>
            <option value="never">Never</option>
          </select>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={!newKeyName || createKey.isPending} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm">
              {createKey.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Key"}
            </button>
            <button onClick={() => setShowCreate(false)} className="h-9 px-4 rounded-md border text-sm">Cancel</button>
          </div>
        </div>
      )}
      <div className="border rounded">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-medium">Name</th>
            <th className="text-left p-3 font-medium">Role</th>
            <th className="text-left p-3 font-medium">Prefix</th>
            <th className="text-left p-3 font-medium">Created</th>
            <th className="text-left p-3 font-medium">Status</th>
            <th className="text-right p-3 font-medium">Actions</th>
          </tr></thead>
          <tbody>
            {(keys ?? []).map((k: Record<string, unknown>) => (
              <tr key={String(k.id)} className="border-b">
                <td className="p-3">{String(k.name)}</td>
                <td className="p-3"><span className="px-2 py-0.5 rounded text-xs bg-muted">{String(k.role)}</span></td>
                <td className="p-3 font-mono text-xs">{String(k.prefix ?? "sk-...")}</td>
                <td className="p-3 text-muted-foreground">{String(k.created_at ?? "")}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${k.status === "active" ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
                    {String(k.status)}
                  </span>
                </td>
                <td className="p-3 text-right">
                  {k.status === "active" && (
                    <button onClick={() => revokeKey.mutate(String(k.id))} className="text-xs text-red-400 hover:underline">Revoke</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
''')


# — ComplianceSettings —
w('src/components/settings/sections/ComplianceSettings.tsx', '''// src/components/settings/sections/ComplianceSettings.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";

const FRAMEWORKS = [
  { id: "eu-ai-act", name: "EU AI Act (2024/1689)", status: "MANDATORY LAW", sc: "text-red-400", desc: "Articles 9-17, enforced August 2026" },
  { id: "gdpr", name: "GDPR (2016/679)", status: "MANDATORY LAW", sc: "text-red-400", desc: "Hard law for EU personal data" },
  { id: "china-genai", name: "China GenAI Regulations", status: "MANDATORY LAW", sc: "text-red-400", desc: "CAC-enforced since August 2023" },
  { id: "iso42001", name: "ISO/IEC 42001:2023", status: "CERTIFIABLE", sc: "text-blue-400", desc: "Certifiable AI management system" },
  { id: "nist-ai-rmf", name: "NIST AI RMF 1.0", status: "VOLUNTARY", sc: "text-green-400", desc: "US de facto standard" },
  { id: "oecd", name: "OECD AI Principles", status: "POLICY GUIDE", sc: "text-zinc-400", desc: "Adopted by 40+ countries" },
  { id: "ieee7000", name: "IEEE 7000-2021", status: "TECH STANDARD", sc: "text-zinc-400", desc: "Design-time standard" },
];

export function ComplianceSettings() {
  const qc = useQueryClient();
  const { data: enabled, isLoading } = useQuery<Record<string, boolean>>({
    queryKey: ["compliance-fw"],
    queryFn: () => apiClient.get("/compliance/frameworks") as Promise<Record<string, boolean>>,
    staleTime: 60_000,
  });
  const toggle = useMutation({
    mutationFn: (args: { id: string; on: boolean }) =>
      apiClient.patch("/compliance/frameworks/" + args.id, { enabled: args.on }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compliance-fw"] }),
  });

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded" />)}</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold">Compliance Frameworks</h2>
        <p className="text-sm text-muted-foreground">Enable frameworks to accumulate real-time evidence.</p>
      </div>
      <div className="space-y-2">
        {FRAMEWORKS.map(fw => {
          const isOn = enabled?.[fw.id] ?? false;
          return (
            <div key={fw.id} className={"flex items-center justify-between p-4 rounded border" + (isOn ? " border-l-2 border-l-[hsl(var(--brand))]" : "")}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{fw.name}</span>
                  <span className={"text-xs px-2 py-0.5 rounded bg-muted " + fw.sc}>{fw.status}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{fw.desc}</p>
              </div>
              <button
                onClick={() => toggle.mutate({ id: fw.id, on: !isOn })}
                className={"w-11 h-6 rounded-full relative transition-colors " + (isOn ? "bg-[hsl(var(--brand))]" : "bg-muted")}
              >
                <span className={"block w-4 h-4 rounded-full bg-white absolute top-1 transition-transform " + (isOn ? "translate-x-6" : "translate-x-1")} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
''')