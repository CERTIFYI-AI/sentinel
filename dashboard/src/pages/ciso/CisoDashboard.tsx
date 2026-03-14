import { ShieldCheck, Plus, MagnifyingGlass } from '@phosphor-icons/react';
// dashboard/src/pages/ciso/CisoDashboard.tsx
// Dedicated CISO executive dashboard — Sprint 3 #19
// Aggregated risk posture, trend analysis, and board report generation

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client";
import { QK } from "../../lib/queryKeys";
import { useSentinelStore } from "../../lib/store";
import { useState } from "react";
import Badge from '../../components/ui/badge';

interface PostureData {
  overallScore: number;
  securityScore: number;
  complianceScore: number;
  qualityScore: number;
  hitlScore: number;
  trend: "improving" | "stable" | "declining";
  trendDelta: number;
  topFindings: Array<{
    id: string;
    title: string;
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    module: string;
  }>;
  openTasks: number;
  overdueTasks: number;
}

interface PostureHistory {
  entries: Array<{
    timestamp: string;
    overallScore: number;
    securityScore: number;
    complianceScore: number;
    qualityScore: number;
  }>;
}

function PostureSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 bg-[hsl(var(--muted))] rounded w-48" />
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-[hsl(var(--muted))] rounded-none" />
        ))}
      </div>
      <div className="h-64 bg-[hsl(var(--muted))] rounded-none" />
    </div>
  );
}

function PostureError({ message }: { message: string }) {
  return (
    <div className="rounded-none border border-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/0.1)] p-6">
      <h3 className="font-outfit text-lg font-semibold text-[hsl(var(--destructive))]">
        Failed to load posture data
      </h3>
      <p className="font-outfit text-sm text-[hsl(var(--muted-foreground))] mt-2">{message}</p>
    </div>
  );
}

function ScoreCard({
  label,
  score,
  weight,
}: {
  label: string;
  score: number;
  weight: string;
}) {
  const color =
    score >= 80
      ? "hsl(var(--success))"
      : score >= 60
        ? "hsl(var(--warning))"
        : "hsl(var(--destructive))";

  return (
    <div className="rounded-none border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
      <p className="font-outfit text-sm text-[hsl(var(--muted-foreground))]">{label}</p>
      <p className="font-outfit text-3xl font-bold mt-1" style={{ color }}>
        {score.toFixed(1)}
      </p>
      <p className="font-outfit text-xs text-[hsl(var(--muted-foreground))] mt-1">
        Weight: {weight}
      </p>
    </div>
  );
}

function TrendBadge({ trend, delta }: { trend: string; delta: number }) {
  const config: Record<string, { label: string; className: string }> = {
    improving: {
      label: `+${delta.toFixed(1)}`,
      className: "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]",
    },
    declining: {
      label: `${delta.toFixed(1)}`,
      className: "bg-[hsl(var(--destructive)/0.15)] text-[hsl(var(--destructive))]",
    },
    stable: {
      label: "Stable",
      className: "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
    },
  };

  const { label, className } = config[trend] ?? config.stable;

  return (
    <span className={`font-outfit text-xs font-medium px-2 py-1 rounded-full ${className}`}>
      {label}
    </span>
  );
}

function TopFindings({ findings }: { findings: PostureData["topFindings"] }) {
  const severityColor: Record<string, string> = {
    CRITICAL: "hsl(var(--destructive))",
    HIGH: "hsl(var(--warning))",
    MEDIUM: "hsl(var(--accent-foreground))",
    LOW: "hsl(var(--muted-foreground))",
  };

  return (
    <div className="rounded-none border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
      <h3 className="font-outfit text-lg font-semibold text-[hsl(var(--foreground))] mb-4">
        Top Findings
      </h3>
      {findings.length === 0 ? (
        <p className="font-outfit text-sm text-[hsl(var(--muted-foreground))]">No open findings</p>
      ) : (
        <ul className="space-y-3">
          {findings.map((f) => (
            <li key={f.id} className="flex items-center justify-between">
              <div>
                <p className="font-outfit text-sm font-medium text-[hsl(var(--foreground))]">
                  {f.title}
                </p>
                <p className="font-outfit text-xs text-[hsl(var(--muted-foreground))]">
                  {f.module}
                </p>
              </div>
              <span
                className="font-outfit text-xs font-semibold px-2 py-1 rounded"
                style={{ color: severityColor[f.severity] }}
              >
                {f.severity}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TaskSummary({ open, overdue }: { open: number; overdue: number }) {
  return (
    <div className="rounded-none border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
      <h3 className="font-outfit text-lg font-semibold text-[hsl(var(--foreground))] mb-4">
        Task Summary
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="font-outfit text-3xl font-bold text-[hsl(var(--foreground))]">{open}</p>
          <p className="font-outfit text-sm text-[hsl(var(--muted-foreground))]">Open Tasks</p>
        </div>
        <div>
          <p
            className="font-outfit text-3xl font-bold"
            style={{ color: overdue > 0 ? "hsl(var(--destructive))" : "hsl(var(--foreground))" }}
          >
            {overdue}
          </p>
          <p className="font-outfit text-sm text-[hsl(var(--muted-foreground))]">Overdue</p>
        </div>
      </div>
    </div>
  );
}

function TrendChart({ history }: { history: PostureHistory["entries"] }) {
  if (history.length === 0) {
    return (
      <div className="rounded-none border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
        <p className="font-outfit text-sm text-[hsl(var(--muted-foreground))]">No historical data available yet.</p>
      </div>
    );
  }

  const maxScore = 100;
  const chartHeight = 200;

  return (
    <div className="rounded-none border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
      <h3 className="font-outfit text-lg font-semibold text-[hsl(var(--foreground))] mb-4">
        90-Day Risk Trend
      </h3>
      <svg
        viewBox={`0 0 ${history.length * 10} ${chartHeight}`}
        className="w-full"
        preserveAspectRatio="none"
      >
        <polyline
          points={history
            .map((e, i) => `${i * 10},${chartHeight - (e.overallScore / maxScore) * chartHeight}`)
            .join(" ")}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
        />
      </svg>
      <div className="flex justify-between mt-2">
        <span className="font-outfit text-xs text-[hsl(var(--muted-foreground))]">
          {history[0]?.timestamp?.slice(0, 10)}
        </span>
        <span className="font-outfit text-xs text-[hsl(var(--muted-foreground))]">
          {history[history.length - 1]?.timestamp?.slice(0, 10)}
        </span>
      </div>
    </div>
  );
}

export default function CisoDashboard() {
  const [historyDays] = useState(90);

  const postureQuery = useQuery<PostureData>({
    queryKey: QK.cisoPosture?.() ?? ["ciso", "posture"],
    queryFn: () => apiClient.get<PostureData>("/ciso/posture"),
  });

  const historyQuery = useQuery<PostureHistory>({
    queryKey: QK.cisoPostureHistory?.(historyDays) ?? ["ciso", "posture", "history", historyDays],
    queryFn: () =>
      apiClient.get<PostureHistory>("/ciso/posture/history", { days: historyDays }),
  });

  if (postureQuery.isLoading) return <PostureSkeleton />;
  if (postureQuery.isError) {
    return <PostureError message={(postureQuery.error as Error).message} />;
  }

  const posture = postureQuery.data!;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-outfit text-2xl font-bold text-[hsl(var(--foreground))]">
            CISO Dashboard
          </h1>
          <p className="font-outfit text-sm text-[hsl(var(--muted-foreground))]">
            Aggregated risk posture and executive overview
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TrendBadge trend={posture.trend} delta={posture.trendDelta} />
          <a
            href="/ciso/board-report"
            className="font-outfit text-sm px-4 py-2 rounded-none bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"
          >
            Generate Board Report
          </a>
        </div>
      </div>

      {/* Overall posture score */}
      <div className="rounded-none border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 text-center">
        <p className="font-outfit text-sm text-[hsl(var(--muted-foreground))]">Overall Posture Score</p>
        <p
          className="font-outfit text-6xl font-bold mt-2"
          style={{
            color:
              posture.overallScore >= 80
                ? "hsl(var(--success))"
                : posture.overallScore >= 60
                  ? "hsl(var(--warning))"
                  : "hsl(var(--destructive))",
          }}
        >
          {posture.overallScore.toFixed(1)}
        </p>
        <p className="font-outfit text-xs text-[hsl(var(--muted-foreground))] mt-1">
          Weighted composite: 40% Security + 30% Compliance + 20% Quality + 10% HITL
        </p>
      </div>

      {/* Component scores */}
      <div className="grid grid-cols-4 gap-4">
        <ScoreCard label="Security" score={posture.securityScore} weight="40%" />
        <ScoreCard label="Compliance" score={posture.complianceScore} weight="30%" />
        <ScoreCard label="Quality (Evals)" score={posture.qualityScore} weight="20%" />
        <ScoreCard label="HITL Resolution" score={posture.hitlScore} weight="10%" />
      </div>

      {/* Trend chart + findings + tasks */}
      <div className="grid grid-cols-2 gap-4">
        <TrendChart history={historyQuery.data?.entries ?? []} />
        <TaskSummary open={posture.openTasks} overdue={posture.overdueTasks} />
      </div>

      <TopFindings findings={posture.topFindings} />
    </div>
  );
}
