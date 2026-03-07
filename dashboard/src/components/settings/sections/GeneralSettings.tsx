// src/components/settings/sections/GeneralSettings.tsx
import { useState, useEffect } from "react";
import { useTenantConfig, useUpdateTenantConfig } from "../../../hooks/use-settings";
import { Copy, Loader2 } from "lucide-react";

export function GeneralSettings() {
  const { data: cfg, isLoading } = useTenantConfig();
  const update = useUpdateTenantConfig();
  const [form, setForm] = useState({ org_name: "", display_name: "", timezone: "UTC", date_format: "ISO 8601" });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (cfg) { setForm({ org_name: cfg.org_name, display_name: cfg.display_name, timezone: cfg.timezone, date_format: cfg.date_format }); setDirty(false); }
  }, [cfg]);

  function change(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); setDirty(true); }

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />)}</div>;

  return (
    <div className="space-y-6 max-w-lg">
      <div><h2 className="text-lg font-semibold">General</h2><p className="text-sm text-muted-foreground">Organization settings</p></div>
      <div><label className="text-sm font-medium">Organization name</label>
        <input value={form.org_name} onChange={e => change("org_name", e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div><label className="text-sm font-medium">Display name</label>
        <input value={form.display_name} onChange={e => change("display_name", e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div><label className="text-sm font-medium">Tenant ID</label>
        <div className="flex gap-2 mt-1"><input readOnly value={cfg?.id ?? ""} className="flex-1 h-10 rounded-md border border-input bg-muted px-3 font-mono text-sm" />
          <button onClick={() => navigator.clipboard.writeText(cfg?.id ?? "")} className="h-10 px-3 rounded-md border border-border hover:bg-accent"><Copy className="w-4 h-4" /></button></div>
      </div>
      <div><label className="text-sm font-medium">Plan</label>
        <span className="ml-2 text-xs uppercase bg-primary/20 text-primary px-2 py-0.5 rounded">{cfg?.plan}</span>
      </div>
      <div><label className="text-sm font-medium">Timezone</label>
        <select value={form.timezone} onChange={e => change("timezone", e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
          {["UTC","America/New_York","America/Chicago","America/Los_Angeles","Europe/London","Europe/Berlin","Asia/Tokyo","Asia/Kathmandu","Australia/Sydney"].map(tz => <option key={tz}>{tz}</option>)}
        </select>
      </div>
      <button onClick={() => update.mutate(form)} disabled={!dirty || update.isPending}
        className="h-10 px-6 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
        {update.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}Save Changes
      </button>
    </div>
  );
}
