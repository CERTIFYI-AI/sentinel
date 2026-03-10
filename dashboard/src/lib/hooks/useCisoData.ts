import { useQuery } from "@tanstack/react-query";
import { api } from "../queryClient";
import { QK } from "../queryKeys";

/* ── Types ── */
export interface CisoMetrics {
  overallRiskScore: number;
  complianceScore: number;
  openFindings: number;
  criticalFindings: number;
  pendingTasks: number;
  policiesActive: number;
  lastAssessmentDate: string | null;
  nextAssessmentDate: string | null;
}

export interface RiskTrend {
  date: string;
  score: number;
}

export interface ComplianceFramework {
  id: string;
  name: string;
  coverage: number;
  status: "COMPLIANT" | "PARTIAL" | "NON_COMPLIANT";
  lastAudit: string | null;
}

export interface ExecutiveSummary {
  highlights: string[];
  risks: string[];
  recommendations: string[];
  generatedAt: string;
}

/* ── Hooks ── */
export function useCisoMetrics() {
  return useQuery({
    queryKey: QK.cisoMetrics,
    queryFn: () =>
      api<CisoMetrics>("dashboard/ciso/metrics"),
    refetchInterval: 60_000,
  });
}

export function useRiskTrend(days = 30) {
  return useQuery({
    queryKey: [...QK.riskTrend, days],
    queryFn: () =>
      api<RiskTrend[]>(`dashboard/ciso/risk-trend?days=${days}`),
    refetchInterval: 60_000,
  });
}

export function useComplianceFrameworks() {
  return useQuery({
    queryKey: QK.complianceFrameworks,
    queryFn: () =>
      api<ComplianceFramework[]>("dashboard/ciso/frameworks"),
    refetchInterval: 5 * 60_000,
  });
}

export function useExecutiveSummary() {
  return useQuery({
    queryKey: QK.executiveSummary,
    queryFn: () =>
      api<ExecutiveSummary>("dashboard/ciso/executive-summary"),
    staleTime: 5 * 60_000,
  });
}
