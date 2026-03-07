// src/components/settings/sections/TrustSafetySettings.tsx
import { useState, useEffect } from "react";
import { useTenantConfig, useUpdateTenantConfig } from "../../../hooks/use-settings";
import { Loader2 } from "lucide-react";

function ThresholdSlider({ label, description, value, onChange, min, max, step }: { label: string; description: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number }) {
  const pct = ((value - min) / (max - min)) * 100;
  const zone = value >= 0.85 ? "HEALTHY" : value >= 0.70 ? "DEGRADED" : "CRITICAL";
  const zoneColor = value >= 0.85 ? "text-[hsl(var(--trust-high))]" : value >= 0.70 ? "text-[hsl(var(--trust-medium))]" : "text-[hsl(var(--trust-low))]";
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <p className="text-xs text-muted-foreground">{description}</p>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[hsl(var(--brand))]" />
      <div className="flex justify-between"><span className={`font-mono text-lg font-bold ${zoneColor}`}>{value.toFixed(2)}</span><span className={`text-xs uppercase ${zoneColor}`}>{zone}</span></div>
    </div>
  );
}

const presets = [{ label: "Healthcare (0.92)", v: 0.92 }, { label: "Finance (0.88)", v: 0.88 }, { label: "General (0.85)", v: 0.85 }];

export function TrustSafetySettings() {
  const { data: cfg, isLoading } = useTenantConfig();
  const update = useUpdateTenantConfig();
  const [threshold, setThreshold] = useState(0.85);
  const [injection, setInjection] = useState(0.80);
  const [drift, setDrift] = useState(2.5);
  const [hitlResp, setHitlResp] = useState("");
  const [cbFailure, setCbFailure] = useState(5);
  const [cbTimeout, setCbTimeout] = useState(60);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (cfg) { setThreshold(cfg.trust_threshold); setInjection(cfg.injection_threshold); setDrift(cfg.drift_sigma); setHitlResp(cfg.hitl_response); setCbFailure(cfg.cb_failure_threshold); setCbTimeout(cfg.cb_recovery_timeout); setDirty(false); }
  }, [cfg]);

  function save() {
    update.mutate({ trust_threshold: threshold, injection_threshold: injection, drift_sigma: drift, hitl_response: hitlResp, cb_failure_threshold: cbFailure, cb_recovery_timeout: cbTimeout });
    setDirty(false);
  }

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-md" />)}</div>;

  return (
    <div className="space-y-8 max-w-lg">
      <div><h2 className="text-lg font-semibold">Trust & Safety</h2></div>
      <ThresholdSlider label="Block threshold" description="Responses below this score trigger the intervention cascade." value={threshold} onChange={v => { setThreshold(v); setDirty(true); }} min={0.60} max={0.99} step={0.01} />
      <div className="flex gap-2">{presets.map(p => <button key={p.label} onClick={() => { setThreshold(p.v); setDirty(true); }} className={`text-xs px-3 py-1 rounded border ${threshold === p.v ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"}`}>{p.label}</button>)}</div>
      <ThresholdSlider label="Injection block threshold" description="Prompts scoring above this are blocked as injections." value={injection} onChange={v => { setInjection(v); setDirty(true); }} min={0.50} max={0.99} step={0.01} />
      <div><label className="text-sm font-medium">Semantic drift alert (&sigma;)</label><p className="text-xs text-muted-foreground">Alert when response embedding drifts this far from baseline.</p>
        <input type="number" step={0.1} value={drift} onChange={e => { setDrift(Number(e.target.value)); setDirty(true); }} className="mt-1 w-32 h-10 rounded-md border border-input bg-background px-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div><label className="text-sm font-medium">HITL canned response</label>
        <textarea rows={3} value={hitlResp} onChange={e => { setHitlResp(e.target.value); setDirty(true); }} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <p className="text-xs text-muted-foreground text-right">{hitlResp.length} / 500</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="text-sm font-medium">CB failure threshold</label>
          <input type="number" value={cbFailure} onChange={e => { setCbFailure(Number(e.target.value)); setDirty(true); }} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 font-mono text-sm" /></div>
        <div><label className="text-sm font-medium">Recovery timeout (s)</label>
          <input type="number" value={cbTimeout} onChange={e => { setCbTimeout(Number(e.target.value)); setDirty(true); }} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 font-mono text-sm" /></div>
      </div>
      <button onClick={save} disabled={!dirty || update.isPending} className="h-10 px-6 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
        {update.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}Save Trust Settings
      </button>
    </div>
  );
}
