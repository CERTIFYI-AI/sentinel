// dashboard/src/api/types.ts

export interface ClaimScore {
  claim: string;
  score: number;
  source: string | null;
}

export interface CandidateResponse {
  response: string;
  trust_score: number;
}

export interface HitlJob {
  id: string;
  tenant_id: string;
  created_at: string;
  status: "pending" | "reviewed" | "expired";
  prompt: string;
  original_response: string;
  trust_score: number;
  candidate_responses: CandidateResponse[];
  claim_scores: ClaimScore[];
  model: string;
  priority: "low" | "medium" | "high" | "critical";
}

export interface TenantConfig {
  trust_score_threshold: number;
  injection_block_threshold: number;
  cross_check_trigger_threshold: number;
  fallback_model: string;
  pii_entities: string[];
  custom_pii_patterns: Array<{ name: string; regex: string; score: number }>;
  primary_model: string;
  canned_response: string;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  tenant_id: string;
  prompt: string;
  sanitized_prompt: string;
  response: string;
  trust_score: number;
  injection_score: number;
  pii_detected: string[];
  intervention: "none" | "regen" | "upgrade" | "hitl";
  model: string;
  latency_ms: number;
  claim_scores: ClaimScore[];
}

export interface TrustMetricsSummary {
  average_trust_score: number;
  total_requests: number;
  intervention_counts: {
    none: number;
    regen: number;
    upgrade: number;
    hitl: number;
  };
  pii_detection_count: number;
  injection_block_count: number;
  average_latency_ms: number;
  trust_score_histogram: Array<{ bucket: string; count: number }>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface HitlReviewPayload {
  decision: "approve" | "reject" | "edit";
  edited_response?: string;
  reviewer_notes?: string;
}