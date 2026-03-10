import { useQuery } from "@tanstack/react-query";
import { api } from "../queryClient";
import { QK } from "../queryKeys";

/* ── Types ── */
export interface SecurityFinding {
  id: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  title: string;
  description: string;
  source: string;
  status: "OPEN" | "MITIGATED" | "ACCEPTED";
  detectedAt: string;
  mitigatedAt: string | null;
}

export interface SecurityOverview {
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  mitigatedCount: number;
  meanTimeToRemediate: number;
}

export interface ThreatEvent {
  id: string;
  type: string;
  source: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  timestamp: string;
  blocked: boolean;
}

/* ── Hooks ── */
export function useSecurityOverview() {
  return useQuery({
    queryKey: QK.securityOverview,
    queryFn: () =>
      api<SecurityOverview>("dashboard/security/overview"),
    refetchInterval: 30_000,
  });
}

export function useSecurityFindings(status?: string) {
  return useQuery({
    queryKey: [...QK.securityFindings, status ?? "ALL"],
    queryFn: () =>
      api<SecurityFinding[]>(
        `dashboard/security/findings${status ? `?status=${status}` : ""}`
      ),
    refetchInterval: 30_000,
  });
}

export function useThreatFeed() {
  return useQuery({
    queryKey: QK.threatFeed,
    queryFn: () =>
      api<ThreatEvent[]>("dashboard/security/threats"),
    refetchInterval: 10_000,
  });
}
