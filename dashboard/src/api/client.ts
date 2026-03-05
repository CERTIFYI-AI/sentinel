// dashboard/src/api/client.ts

import type {
  AuditEntry,
  HitlJob,
  HitlReviewPayload,
  LoginRequest,
  LoginResponse,
  PaginatedResponse,
  TenantConfig,
  TrustMetricsSummary,
  ApiKey,
} from "./types";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const TOKEN_KEY = "sentinel_token";

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
  });
  if (res.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// Auth
export function login(data: LoginRequest): Promise<LoginResponse> {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Metrics
export function fetchMetrics(hours?: number): Promise<TrustMetricsSummary> {
  const params = hours ? `?hours=${hours}` : "";
  return request<TrustMetricsSummary>(`/dashboard/metrics${params}`);
}

// Audit Log
export function fetchAuditLog(
  page = 1,
  pageSize = 25
): Promise<PaginatedResponse<AuditEntry>> {
  return request<PaginatedResponse<AuditEntry>>(
    `/dashboard/audit?page=${page}&page_size=${pageSize}`
  );
}

// HITL Queue
export function fetchHitlQueue(
  status?: string
): Promise<PaginatedResponse<HitlJob>> {
  const params = status ? `?status=${status}` : "";
  return request<PaginatedResponse<HitlJob>>(`/dashboard/hitl${params}`);
}

export function reviewHitlJob(
  jobId: string,
  payload: HitlReviewPayload
): Promise<HitlJob> {
  return request<HitlJob>(`/dashboard/hitl/${jobId}/review`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Config
export function fetchConfig(): Promise<TenantConfig> {
  return request<TenantConfig>("/dashboard/config");
}

export function updateConfig(
  config: Partial<TenantConfig>
): Promise<TenantConfig> {
  return request<TenantConfig>("/dashboard/config", {
    method: "PATCH",
    body: JSON.stringify(config),
  });
}

// API Keys
export function fetchApiKeys(): Promise<ApiKey[]> {
  return request<ApiKey[]>("/dashboard/keys");
}

export function createApiKey(name: string): Promise<ApiKey & { key: string }> {
  return request<ApiKey & { key: string }>("/dashboard/keys", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function revokeApiKey(keyId: string): Promise<void> {
  return request<void>(`/dashboard/keys/${keyId}`, {
    method: "DELETE",
  });
}

// WebSocket
export function createMetricsSocket(
  onMessage: (data: TrustMetricsSummary) => void
): WebSocket {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${new URL(BASE_URL).host}/ws/metrics`;
  const token = getToken();
  const ws = new WebSocket(token ? `${wsUrl}?token=${token}` : wsUrl);
  ws.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data as string) as TrustMetricsSummary;
      onMessage(parsed);
    } catch {
      // ignore malformed messages
    }
  };
  return ws;
}