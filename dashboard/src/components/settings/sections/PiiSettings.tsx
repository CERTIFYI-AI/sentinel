// src/components/settings/sections/PiiSettings.tsx
import { useState } from "react";
import { useTenantConfig, useUpdateTenantConfig } from "../../../hooks/use-settings";
import { Loader2 } from "lucide-react";

export function PiiSettings() {
  const { data: config, isLoading } = useTenantConfig();
  const update = useUpdateTenantConfig();
  const [mode, setMode] = useState<"full" | "regex">("full");
  const [entities, setEntities] = useState<string[]>([
    "PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER", "CREDIT_CARD",
    "US_SSN", "IBAN_CODE", "IP_ADDRESS", "MEDICAL_LICENSE"
  ]);
  const [redactionStyle, setRedactionStyle] = useState("entity_type");

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded" />)}</div>;

  const allEntities = [
    "PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER", "CREDIT_CARD",
    "US_SSN", "IBAN_CODE", "IP_ADDRESS", "MEDICAL_LICENSE",
    "LOCATION", "DATE_TIME", "NRP", "ORGANIZATION"
  ];

  function save() {
    update.mutate({ pii_mode: mode, pii_entities: entities, redaction_style: redactionStyle });
  }

  return (
    <div className="space-y-8 max-w-lg">
      <div><h2 className="text-lg font-semibold">PII Detection</h2></div>
      <div className="space-y-4">
        <label className="text-sm font-medium">Detection mode</label>
        <div className="space-y-2">
          <div
            onClick={() => setMode("full")}
            className={`p-4 rounded border cursor-pointer ${mode === "full" ? "border-[hsl(var(--brand))] bg-[hsl(var(--brand-subtle))]" : "border-border"}`}
          >
            <div className="font-medium">Full detection (Presidio + spaCy)</div>
            <div className="text-sm text-muted-foreground">18 entity types. Highest accuracy.</div>
          </div>
          <div
            onClick={() => setMode("regex")}
            className={`p-4 rounded border cursor-pointer ${mode === "regex" ? "border-[hsl(var(--brand))] bg-[hsl(var(--brand-subtle))]" : "border-border"}`}
          >
            <div className="font-medium">Regex fallback</div>
            <div className="text-sm text-muted-foreground">5 entity types. No additional dependencies.</div>
          </div>
        </div>
      </div>
      {mode === "full" && (
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-medium">Enabled entity types</label>
            <div className="space-x-2 text-xs">
              <button className="text-[hsl(var(--brand-foreground))]" onClick={() => setEntities([...allEntities])}>Select all</button>
              <button className="text-muted-foreground" onClick={() => setEntities([])}>Deselect all</button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {allEntities.map(e => (
              <label key={e} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={entities.includes(e)}
                  onChange={() => setEntities(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e])}
                  className="accent-[hsl(var(--brand))]"
                />
                {e}
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-2">
        <label className="text-sm font-medium">Redaction style</label>
        <select
          value={redactionStyle}
          onChange={e => setRedactionStyle(e.target.value)}
          className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="entity_type">Replace with entity type: [EMAIL_ADDRESS]</option>
          <option value="hash">Replace with hash: [3f9a2b...]</option>
          <option value="fixed">Replace with fixed: [REDACTED]</option>
        </select>
      </div>
      <button onClick={save} disabled={update.isPending} className="h-10 px-6 rounded-md bg-primary text-primary-foreground text-sm">
        {update.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save PII Settings"}
      </button>
    </div>
  );
}
