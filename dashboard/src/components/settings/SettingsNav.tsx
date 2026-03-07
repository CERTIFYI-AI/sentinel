// src/components/settings/SettingsNav.tsx
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal, Shield, EyeOff, Key, ShieldCheck, Bell, Users, ScrollText, CreditCard } from "lucide-react";

const sections = [
  { id: "general", label: "General", icon: SlidersHorizontal },
  { id: "trust-safety", label: "Trust & Safety", icon: Shield },
  { id: "pii", label: "PII Detection", icon: EyeOff },
  { id: "api-keys", label: "API Keys", icon: Key },
  { id: "team", label: "Team", icon: Users },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "compliance", label: "Compliance", icon: ShieldCheck },
  { id: "audit-log", label: "Audit Log", icon: ScrollText },
];

export function SettingsNav() {
  const [params, setParams] = useSearchParams();
  const active = params.get("tab") || "general";
  return (
    <nav className="w-[200px] shrink-0 space-y-1">
      {sections.map((s) => {
        const isActive = active === s.id;
        return (
          <button
            key={s.id}
            onClick={() => setParams({ tab: s.id })}
            className={`flex w-full items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
              isActive
                ? "bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand-foreground))] border-l-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            <s.icon className="w-4 h-4" />{s.label}
          </button>
        );
      })}
      <div className="pt-2 border-t border-border mt-2">
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground/50 cursor-not-allowed">
          <CreditCard className="w-4 h-4" />Billing <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">SOON</span>
        </div>
      </div>
    </nav>
  );
}
