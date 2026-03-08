// src/api/types.ts
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
  intervention_counts: { none: number; regen: number; upgrade: number; hitl: number; };
  trust_score_histogram: Array<{ bucket: string; count: number }>;
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
