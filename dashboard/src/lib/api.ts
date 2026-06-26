// @ts-nocheck
/**
 * Sentinel API Client
 * Centralised HTTP layer — every page imports from here.
 * Uses authStore for JWT, handles 401 refresh, masks API keys.
 */
import { useAuthStore } from "@/stores/authStore";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const auth = useAuthStore.getState();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string>),
  };
  if (auth.accessToken) headers["Authorization"] = `Bearer ${auth.accessToken}`;

  let res = await fetch(`${BASE}${path}`, { ...opts, headers });

  // 401 → try refresh once
  if (res.status === 401 && auth.refreshToken) {
    const refreshRes = await fetch(`${BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: auth.refreshToken }),
    });
    if (refreshRes.ok) {
      const data = await refreshRes.json();
      auth.setTokens(data.access_token, data.refresh_token);
      headers["Authorization"] = `Bearer ${data.access_token}`;
      res = await fetch(`${BASE}${path}`, { ...opts, headers });
    } else {
      auth.logout();
      throw new ApiError(401, "Session expired");
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body.detail ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

// ── Auth ─────────────────────────────────────────────
export const auth = {
  login: (email: string, password: string) =>
    request<{ access_token: string; refresh_token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (email: string, password: string, tenant_id: string) =>
    request<{ id: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, tenant_id }),
    }),
  me: () => request<{ id: string; email: string; role: string }>("/api/auth/me"),
};

// ── Dashboard ────────────────────────────────────────
export const dashboard = {
  summary: () => request<DashboardSummary>("/api/dashboard/summary"),
};

// ── Compliance ───────────────────────────────────────
export const compliance = {
  list: () => request<ComplianceItem[]>("/api/compliance/findings"),
  getNC: (id: string) => request<NCDetail>(`/api/compliance/nc/${id}`),
  updateNC: (id: string, data: Partial<NCDetail>) =>
    request<NCDetail>(`/api/compliance/nc/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

// ── Approvals ────────────────────────────────────────
export const approvals = {
  list: () => request<ApprovalItem[]>("/api/approvals"),
  approve: (id: string) =>
    request<void>(`/api/approvals/${id}/approve`, { method: "POST" }),
  reject: (id: string, reason: string) =>
    request<void>(`/api/approvals/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
};

// ── Audit Logs ───────────────────────────────────────
export const auditLogs = {
  list: (params?: { page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    return request<{ items: AuditLogEntry[]; total: number }>(
      `/api/audit-logs?${qs}`
    );
  },
};

// ── CISO ─────────────────────────────────────────────
export const ciso = {
  overview: () => request<CISOOverview>("/api/ciso/overview"),
};

// ── Evaluations ──────────────────────────────────────
export const evals = {
  list: () => request<EvalRun[]>("/api/evals"),
  run: (id: string) => request<EvalRun>(`/api/evals/${id}`),
  trigger: (config: EvalConfig) =>
    request<EvalRun>("/api/evals/trigger", {
      method: "POST",
      body: JSON.stringify(config),
    }),
};

// ── Events ───────────────────────────────────────────
export const events = {
  list: () => request<EventItem[]>("/api/events"),
};

// ── Health ───────────────────────────────────────────
export const health = {
  check: () => request<{ status: string }>("/api/health"),
};

// ── Security ─────────────────────────────────────────
export const security = {
  scan: () => request<SecurityScan>("/api/security/scan"),
  findings: () => request<SecurityFinding[]>("/api/security/findings"),
};

// ── Tasks ────────────────────────────────────────────
export const tasks = {
  list: () => request<TaskItem[]>("/api/tasks"),
  update: (id: string, data: Partial<TaskItem>) =>
    request<TaskItem>(`/api/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

// ── Notifications ────────────────────────────────────
export const notifications = {
  list: () => request<NotificationItem[]>("/api/notifications"),
  markRead: (id: string) =>
    request<void>(`/api/notifications/${id}/read`, { method: "POST" }),
  markAllRead: () =>
    request<void>("/api/notifications/read-all", { method: "POST" }),
  count: () => request<{ unread: number }>("/api/notifications/count"),
};

// ── HITL ─────────────────────────────────────────────
export const hitl = {
  pending: () => request<HITLItem[]>("/api/hitl/pending"),
  decide: (id: string, decision: "approve" | "reject", note?: string) =>
    request<void>(`/api/hitl/${id}/decide`, {
      method: "POST",
      body: JSON.stringify({ decision, note }),
    }),
};

// ── Types ────────────────────────────────────────────
export interface DashboardSummary {
  trust_score: number;
  total_findings: number;
  open_ncs: number;
  pending_approvals: number;
  recent_events: EventItem[];
}

export interface ComplianceItem {
  id: string;
  framework: string;
  control: string;
  status: string;
  severity: string;
}

export interface NCDetail {
  id: string;
  title: string;
  status: "open" | "in_review" | "resolved" | "accepted";
  severity: "low" | "medium" | "high" | "critical";
  assignee?: string;
  description: string;
  created_at: string;
}

export interface ApprovalItem {
  id: string;
  type: string;
  requester: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  details: Record<string, unknown>;
}

export interface CISOOverview {
  trust_score: number;
  risk_level: string;
  compliance_posture: Record<string, number>;
  top_risks: { id: string; title: string; severity: string }[];
}

export interface EvalRun {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  model: string;
  scores: Record<string, number>;
  created_at: string;
}

export interface EvalConfig {
  model: string;
  dataset: string;
  metrics: string[];
}

export interface EventItem {
  id: string;
  type: string;
  message: string;
  timestamp: string;
}

export interface SecurityScan {
  id: string;
  status: string;
  findings_count: number;
  started_at: string;
}

export interface SecurityFinding {
  id: string;
  severity: string;
  title: string;
  description: string;
}

export interface TaskItem {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  assignee?: string;
  due_date?: string;
}

export interface NotificationItem {
  id: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface HITLItem {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}
