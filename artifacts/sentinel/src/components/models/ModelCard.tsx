// src/components/models/ModelCard.tsx
import { DotsThree } from "@phosphor-icons/react";
import { ProviderBadge } from "./ProviderBadge";
import { trustScoreColor } from "../../lib/chart-colors";
import type { ModelConfig, ModelHealth } from "../../api/types";

const roleBadge: Record<string, string> = {
  primary: "bg-emerald-50 text-[#1A6B5A] border-primary/30",
  fallback: "bg-primary/20 text-blue-400 border-blue-500/30",
  evaluation: "bg-zinc-500/20 text-muted-foreground border-zinc-500/30",
  disabled: "bg-destructive/20 text-destructive border-destructive/30",
};
const cbDot: Record<string, string> = {
  CLOSED: "bg-[hsl(var(--trust-high))]",
  OPEN: "bg-destructive animate-pulse",
  HALF_OPEN: "bg-[hsl(var(--trust-medium))]",
};

export function ModelCard({ model, health, selected, onSelect, onSetRole, onTest }:
  { model: ModelConfig; health?: ModelHealth; selected: boolean; onSelect: () => void;
    onSetRole: (r: string) => void; onTest: () => void }) {
  const h = health;
  return (
    <div className={`rounded-none border p-4 space-y-3 transition-colors ${selected ? "border-primary bg-[#1A6B5A]/5" : "border-border"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={selected} onChange={onSelect} className="rounded border-border" />
          <ProviderBadge provider={model.provider} />
        </div>
        <span className={`w-2 h-2 rounded-full ${model.status === "active" ? "bg-[hsl(var(--trust-high))]" : model.status === "degraded" ? "bg-[hsl(var(--trust-medium))]" : "bg-destructive"}`} />
      </div>
      <div>
        <p className="font-mono text-base font-bold text-foreground">{model.display_name}</p>
        <p className="text-xs text-muted-foreground font-mono">{model.model_name}@{model.version}</p>
      </div>
      {h && (
        <div className="grid grid-cols-4 gap-2">
          {[["Trust", h.avg_trust_7d.toFixed(4), trustScoreColor(h.avg_trust_7d)],
            ["Lat", h.avg_latency_p95 + "ms", h.avg_latency_p95 > 1000 ? "hsl(var(--trust-low))" : h.avg_latency_p95 > 500 ? "hsl(var(--trust-medium))" : undefined],
            ["Reqs", h.requests_7d >= 1000 ? (h.requests_7d / 1000).toFixed(1) + "k" : String(h.requests_7d), undefined],
            ["Cost", "$" + h.cost_per_1k.toFixed(4), undefined],
          ].map(([label, val, color]) => (
            <div key={String(label)} className="text-center">
              <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
              <p className="font-mono text-sm text-foreground" style={color ? { color: String(color) } : undefined}>{val}</p>
            </div>
          ))}
        </div>
      )}
      {h && (
        <div className="flex items-center gap-2 text-xs">
          <span className={`w-1.5 h-1.5 rounded-full ${cbDot[h.cb_state]}`} />
          <span className="font-mono">{h.cb_state}</span>
          <span className="text-muted-foreground">{h.failure_count} failures</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium uppercase ${roleBadge[model.role]}`}>{model.role}</span>
        <div className="flex gap-1">
          {model.role !== "primary" && <button onClick={() => onSetRole("primary")} className="text-xs px-2 py-1 rounded border border-border hover:bg-muted">Set Primary</button>}
          <button onClick={onTest} className="text-xs px-2 py-1 rounded border border-border hover:bg-muted">Test</button>
          <button className="p-1 rounded hover:bg-muted"><DotsThree className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}
