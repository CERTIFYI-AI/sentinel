import { Export, Plus, MagnifyingGlass } from '@phosphor-icons/react';
// dashboard/src/pages/ciso/BoardReport.tsx
// Board report generation page — Sprint 2 #14
// CONFIG -> LOADING -> PREVIEW state machine, PDF export via postBlob()

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client";
import { QK } from "../../lib/queryKeys";
import { useState } from "react";

type ReportState = "CONFIG" | "LOADING" | "PREVIEW" | "ERROR";

interface ReportConfig {
  tenantId: string;
  period: "30d" | "60d" | "90d" | "custom";
  includeFindings: boolean;
  includeCompliance: boolean;
  includeEvals: boolean;
  includeTrend: boolean;
}

interface BoardReportData {
  generatedAt: string;
  period: string;
  overallScore: number;
  trend: string;
  trendDelta: number;
  executiveSummary: string;
  sections: Array<{
    title: string;
    content: string;
    score?: number;
  }>;
  topRisks: Array<{
    id: string;
    title: string;
    severity: string;
    recommendation: string;
  }>;
}

function ConfigStep({
  config,
  onChange,
  onGenerate,
}: {
  config: ReportConfig;
  onChange: (patch: Partial<ReportConfig>) => void;
  onGenerate: () => void;
}) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="font-outfit text-xl font-semibold text-[hsl(var(--foreground))]">Report Configuration</h2>
        <p className="font-outfit text-sm text-[hsl(var(--muted-foreground))] mt-1">
          Configure the board report parameters before generating.
        </p>
      </div>

      <div className="rounded-none border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 space-y-4">
        <div>
          <label className="font-outfit text-sm font-medium text-[hsl(var(--foreground))]">Reporting Period</label>
          <select
            className="mt-1 w-full font-outfit text-sm rounded-none border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-[hsl(var(--foreground))]"
            value={config.period}
            onChange={(e) => onChange({ period: e.target.value as ReportConfig["period"] })}
          >
            <option value="30d">Last 30 days</option>
            <option value="60d">Last 60 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>

        <div className="space-y-3">
          <label className="font-outfit text-sm font-medium text-[hsl(var(--foreground))]">Include Sections</label>
          {([
            { key: "includeFindings", label: "Security Findings" },
            { key: "includeCompliance", label: "Compliance Status" },
            { key: "includeEvals", label: "Eval Quality Metrics" },
            { key: "includeTrend", label: "Risk Trend Analysis" },
          ] as const).map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config[key]}
                onChange={(e) => onChange({ [key]: e.target.checked })}
                className="rounded border-[hsl(var(--border))]"
              />
              <span className="font-outfit text-sm text-[hsl(var(--foreground))]">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={onGenerate}
        className="w-full font-outfit text-sm font-medium py-3 rounded-none bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"
      >
        Generate Report
      </button>
    </div>
  );
}

function LoadingStep() {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <div className="h-8 w-8 rounded-full border-2 border-[hsl(var(--primary))] border-t-transparent animate-spin" />
      <p className="font-outfit text-sm text-[hsl(var(--muted-foreground))]">Generating board report...</p>
    </div>
  );
}

function PreviewStep({
  data,
  onExport,
  onReset,
  exporting,
}: {
  data: BoardReportData;
  onExport: () => void;
  onReset: () => void;
  exporting: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-outfit text-xl font-semibold text-[hsl(var(--foreground))]">Report Preview</h2>
          <p className="font-outfit text-xs text-[hsl(var(--muted-foreground))]">Generated: {data.generatedAt}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onReset}
            className="font-outfit text-sm px-4 py-2 rounded-none border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
          >
            Reconfigure
          </button>
          <button
            onClick={onExport}
            disabled={exporting}
            className="font-outfit text-sm px-4 py-2 rounded-none bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {exporting ? "Exporting..." : "Export PDF"}
          </button>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="rounded-none border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        <h3 className="font-outfit text-lg font-semibold text-[hsl(var(--foreground))] mb-3">Executive Summary</h3>
        <p className="font-outfit text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">{data.executiveSummary}</p>
      </div>

      {/* Overall score */}
      <div className="rounded-none border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 text-center">
        <p className="font-outfit text-sm text-[hsl(var(--muted-foreground))]">Overall Posture Score ({data.period})</p>
        <p className="font-outfit text-5xl font-bold text-[hsl(var(--primary))] mt-2">{data.overallScore.toFixed(1)}</p>
        <p className="font-outfit text-xs text-[hsl(var(--muted-foreground))] mt-1">
          Trend: {data.trend} ({data.trendDelta >= 0 ? "+" : ""}{data.trendDelta.toFixed(1)} pts)
        </p>
      </div>

      {/* Sections */}
      {data.sections.map((section, i) => (
        <div key={i} className="rounded-none border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-outfit text-lg font-semibold text-[hsl(var(--foreground))]">{section.title}</h3>
            {section.score !== undefined && (
              <span className="font-outfit text-lg font-bold text-[hsl(var(--primary))]">{section.score.toFixed(1)}</span>
            )}
          </div>
          <p className="font-outfit text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">{section.content}</p>
        </div>
      ))}

      {/* Top risks */}
      {data.topRisks.length > 0 && (
        <div className="rounded-none border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <h3 className="font-outfit text-lg font-semibold text-[hsl(var(--foreground))] mb-4">Top Risks & Recommendations</h3>
          <div className="space-y-4">
            {data.topRisks.map((risk) => (
              <div key={risk.id} className="border-l-2 border-[hsl(var(--destructive))] pl-4">
                <div className="flex items-center gap-2">
                  <p className="font-outfit text-sm font-medium text-[hsl(var(--foreground))]">{risk.title}</p>
                  <span className="font-outfit text-xs px-2 py-0.5 rounded bg-[hsl(var(--destructive)/0.15)] text-[hsl(var(--destructive))]">{risk.severity}</span>
                </div>
                <p className="font-outfit text-sm text-[hsl(var(--muted-foreground))] mt-1">{risk.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BoardReport() {
  const [state, setState] = useState<ReportState>("CONFIG");
  const [reportData, setReportData] = useState<BoardReportData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [config, setConfig] = useState<ReportConfig>({
    tenantId: "",
    period: "90d",
    includeFindings: true,
    includeCompliance: true,
    includeEvals: true,
    includeTrend: true,
  });

  const generateMutation = useMutation({
    mutationFn: (cfg: ReportConfig) =>
      apiClient.post<BoardReportData>("/ciso/board-report/data", cfg),
    onSuccess: (data) => {
      setReportData(data);
      setState("PREVIEW");
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
      setState("ERROR");
    },
  });

  const exportMutation = useMutation({
    mutationFn: () => apiClient.postBlob("/ciso/board-report/export", { config }),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sentinel-board-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
    },
  });

  const handleGenerate = () => {
    setState("LOADING");
    generateMutation.mutate(config);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="font-outfit text-2xl font-bold text-[hsl(var(--foreground))]">Board Report</h1>
        <p className="font-outfit text-sm text-[hsl(var(--muted-foreground))]">Generate signed, timestamped executive evidence packages</p>
      </div>

      {state === "CONFIG" && (
        <ConfigStep
          config={config}
          onChange={(patch) => setConfig((c) => ({ ...c, ...patch }))}
          onGenerate={handleGenerate}
        />
      )}
      {state === "LOADING" && <LoadingStep />}
      {state === "PREVIEW" && reportData && (
        <PreviewStep
          data={reportData}
          onExport={() => exportMutation.mutate()}
          onReset={() => setState("CONFIG")}
          exporting={exportMutation.isPending}
        />
      )}
      {state === "ERROR" && (
        <div className="rounded-none border border-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/0.1)] p-6">
          <h3 className="font-outfit text-lg font-semibold text-[hsl(var(--destructive))]">Report generation failed</h3>
          <p className="font-outfit text-sm text-[hsl(var(--muted-foreground))] mt-2">{errorMsg}</p>
          <button
            onClick={() => setState("CONFIG")}
            className="mt-4 font-outfit text-sm px-4 py-2 rounded-none border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
