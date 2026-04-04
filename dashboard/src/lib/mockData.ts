// Certifyi Sentinel — Mock Data Layer
// Used by Overview, AuditLog, and other pages until real API hooks are connected

export interface MetricSnapshot {
  avg_trust_score: number;
  intervention_rate: number;
  requests_per_min: number;
  cost_per_truth: number;
  chain_integrity: string;
  active_providers: string;
  intervention_counts: Record<string, number>;
  latency_p95: Record<string, number>;
}

export interface LiveFeedEntry {
  id: string;
  model: string;
  trust: number;
  intervention: string;
  latency: number;
  ago: string;
  pii_count: number;
  cost: number;
  chain_hash: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  model: string;
  trust_score: number;
  intervention: string;
  pii_count: number;
  latency_ms: number;
  cost: number;
  chain_hash: string;
}

export interface TrustHistoryPoint {
  timestamp: string;
  score: number;
  p5: number;
  p95: number;
}

export const mockMetrics: MetricSnapshot = {
  avg_trust_score: 0.8934,
  intervention_rate: 4.2,
  requests_per_min: 187,
  cost_per_truth: 0.0004,
  chain_integrity: 'INTACT',
  active_providers: '3 / 4',
  intervention_counts: {
    NONE: 14203,
    REGENERATE: 411,
    UPGRADE: 88,
    HITL: 12,
    BLOCKED: 7,
  },
  latency_p95: {
    Sanitize: 12,
    LLM: 198,
    Verify: 45,
    CB: 3,
  },
};

export const mockLiveFeed: LiveFeedEntry[] = [
  { id: 'req-8f3a', model: 'gpt-4o', trust: 0.9312, intervention: 'NONE', latency: 231, ago: '2s ago', pii_count: 0, cost: 0.00031, chain_hash: 'e3b0c44298fc' },
  { id: 'req-7c2b', model: 'claude-3-5-sonnet', trust: 0.7841, intervention: 'REGENERATE', latency: 418, ago: '5s ago', pii_count: 2, cost: 0.00089, chain_hash: 'a87ff679a2f3' },
  { id: 'req-6d1e', model: 'llama-3.1-70b', trust: 0.9104, intervention: 'NONE', latency: 189, ago: '9s ago', pii_count: 0, cost: 0.00012, chain_hash: 'eccbc87e4b5c' },
  { id: 'req-5a9f', model: 'gpt-4o-mini', trust: 0.6123, intervention: 'HITL', latency: 891, ago: '14s ago', pii_count: 1, cost: 0.00007, chain_hash: 'c4ca4238a0b9' },
  { id: 'req-4b8c', model: 'gpt-4o', trust: 0.9521, intervention: 'NONE', latency: 201, ago: '22s ago', pii_count: 0, cost: 0.00028, chain_hash: '1679091c5a88' },
  { id: 'req-3c7d', model: 'claude-3-5-sonnet', trust: 0.8203, intervention: 'UPGRADE', latency: 344, ago: '31s ago', pii_count: 0, cost: 0.00071, chain_hash: '8f14e45fceea' },
  { id: 'req-2e6a', model: 'gpt-4o', trust: 0.4891, intervention: 'BLOCKED', latency: 112, ago: '38s ago', pii_count: 3, cost: 0.00002, chain_hash: '45c48cce2e2d' },
  { id: 'req-1f5b', model: 'llama-3.1-70b', trust: 0.9789, intervention: 'NONE', latency: 167, ago: '47s ago', pii_count: 0, cost: 0.00009, chain_hash: 'd3d9446802a4' },
];

export const mockAuditEntries: AuditEntry[] = [
  { id: 'req-8f3a2c1b', timestamp: '2026-03-09 11:58:22 UTC', model: 'gpt-4o', trust_score: 0.9312, intervention: 'NONE', pii_count: 0, latency_ms: 231, cost: 0.00031, chain_hash: 'e3b0c44298fc1c14' },
  { id: 'req-7c2b9d4e', timestamp: '2026-03-09 11:57:55 UTC', model: 'claude-3-5-sonnet', trust_score: 0.7841, intervention: 'REGENERATE', pii_count: 2, latency_ms: 418, cost: 0.00089, chain_hash: 'a87ff679a2f3f4b3' },
  { id: 'req-6d1e0a5f', timestamp: '2026-03-09 11:57:11 UTC', model: 'llama-3.1-70b', trust_score: 0.9104, intervention: 'NONE', pii_count: 0, latency_ms: 189, cost: 0.00012, chain_hash: 'eccbc87e4b5ce2fe' },
  { id: 'req-5a9f3c8b', timestamp: '2026-03-09 11:56:44 UTC', model: 'gpt-4o-mini', trust_score: 0.6123, intervention: 'HITL', pii_count: 1, latency_ms: 891, cost: 0.00007, chain_hash: 'c4ca4238a0b92382' },
  { id: 'req-4b8c2e7a', timestamp: '2026-03-09 11:55:30 UTC', model: 'gpt-4o', trust_score: 0.9521, intervention: 'NONE', pii_count: 0, latency_ms: 201, cost: 0.00028, chain_hash: '1679091c5a880faf' },
  { id: 'req-3c7d1f6b', timestamp: '2026-03-09 11:54:21 UTC', model: 'claude-3-5-sonnet', trust_score: 0.8203, intervention: 'UPGRADE', pii_count: 0, latency_ms: 344, cost: 0.00071, chain_hash: '8f14e45fceea1678' },
  { id: 'req-2e6a0b5c', timestamp: '2026-03-09 11:53:08 UTC', model: 'gpt-4o', trust_score: 0.4891, intervention: 'BLOCKED', pii_count: 3, latency_ms: 112, cost: 0.00002, chain_hash: '45c48cce2e2d7fbd' },
  { id: 'req-1f5b9e4d', timestamp: '2026-03-09 11:52:17 UTC', model: 'llama-3.1-70b', trust_score: 0.9789, intervention: 'NONE', pii_count: 0, latency_ms: 167, cost: 0.00009, chain_hash: 'd3d9446802a44259' },
  { id: 'req-0g4c8d3e', timestamp: '2026-03-09 11:51:44 UTC', model: 'gpt-4o-mini', trust_score: 0.8812, intervention: 'NONE', pii_count: 0, latency_ms: 145, cost: 0.00005, chain_hash: '6512bd43d9caa6e0' },
  { id: 'req-9h3b7c2f', timestamp: '2026-03-09 11:51:01 UTC', model: 'gpt-4o', trust_score: 0.7234, intervention: 'UPGRADE', pii_count: 0, latency_ms: 289, cost: 0.00041, chain_hash: 'c20ad4d76fe97759' },
];

export const mockTrustHistory: TrustHistoryPoint[] = [
  { timestamp: '10:00', score: 0.871, p5: 0.801, p95: 0.941 },
  { timestamp: '10:15', score: 0.884, p5: 0.812, p95: 0.946 },
  { timestamp: '10:30', score: 0.879, p5: 0.808, p95: 0.943 },
  { timestamp: '10:45', score: 0.891, p5: 0.821, p95: 0.951 },
  { timestamp: '11:00', score: 0.887, p5: 0.817, p95: 0.948 },
  { timestamp: '11:15', score: 0.903, p5: 0.834, p95: 0.959 },
  { timestamp: '11:30', score: 0.896, p5: 0.826, p95: 0.955 },
  { timestamp: '11:45', score: 0.893, p5: 0.822, p95: 0.953 },
  { timestamp: '12:00', score: 0.893, p5: 0.822, p95: 0.952 },
];
