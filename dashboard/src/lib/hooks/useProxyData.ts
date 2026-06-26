import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../../api/client";
import { queryClient } from "../queryClient";
import { QK } from "../queryKeys";

export interface OverviewStats {
  trustScoreAvg: number;
  totalRequests24h: number;
  blockedRequests24h: number;
  hitlQueueDepth: number;
  circuitBreakerState: "CLOSED" | "OPEN";
  activePiiEntities: number;
  costPerTruth: number;
  auditLedgerIntegrity: boolean;
}

export interface TrustScoreHistory {
  timestamp: string;
  score: number;
  interventionLevel: "NONE" | "REGENERATE" | "UPGRADE" | "HITL" | "BLOCKED";
}

export interface HitlItem {
  id: string;
  sessionId: string;
  requestPreview: string;
  trustScore: number;
  interventionReason: string;
  createdAt: string;
  assignee: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "ESCALATED";
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

export function useOverview() {
  return useQuery({
    queryKey: QK.overview,
    queryFn: () => api<OverviewStats>("dashboard/overview"),
    refetchInterval: 15_000,
  });
}

export function useTrustScoreHistory(hours = 24) {
  return useQuery({
    queryKey: [...QK.trustScore, hours],
    queryFn: () =>
      api<TrustScoreHistory[]>(`dashboard/trust-score/history?hours=${hours}`),
    staleTime: 60_000,
  });
}

export function useHitlQueue(status: "PENDING" | "ALL" = "PENDING") {
  return useQuery({
    queryKey: QK.hitlQueue(status),
    queryFn: () => api<HitlItem[]>(`dashboard/hitl?status=${status}`),
    refetchInterval: 10_000,
  });
}

export function useHitlDecision() {
  return useMutation({
    mutationFn: ({
      id,
      decision,
      note,
    }: {
      id: string;
      decision: "APPROVED" | "REJECTED";
      note?: string;
    }) => api(`dashboard/hitl/${id}/decide`, {
      method: "POST",
      body: JSON.stringify({ decision, note }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.hitlQueue("PENDING") });
      queryClient.invalidateQueries({ queryKey: QK.overview });
    },
  });
}

export function useCircuitBreaker() {
  return useQuery({
    queryKey: QK.circuitBreaker,
    queryFn: () =>
      api<{
        state: "CLOSED" | "OPEN";
        openedAt: string | null;
        failureCount: number;
      }>("dashboard/circuit-breaker"),
    refetchInterval: 5_000,
  });
}

export function useResetCircuitBreaker() {
  return useMutation({
    mutationFn: () =>
      api("dashboard/circuit-breaker/reset", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.circuitBreaker });
    },
  });
}
