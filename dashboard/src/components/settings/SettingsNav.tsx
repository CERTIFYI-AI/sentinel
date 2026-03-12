// src/components/settings/SettingsNav.tsx
import { NavLink } from "react-router-dom";
import { SlidersHorizontal, Shield, EyeOff, Cpu, Key, ShieldCheck, Bell, Users, CreditCard } from "lucide-react";

const sections = [
  { to: "general", label: "General", icon: SlidersHorizontal },
  { to: "trust", label: "Trust & Safety", icon: Shield },
  { to: "pii", label: "PII Detection", icon: EyeOff },
  { to: "api-keys", label: "API Keys", icon: Key },
  { to: "compliance", label: "Compliance", icon: ShieldCheck },
  { to: "notifications", label: "Notifications", icon: Bell },
  { to: "team", label: "Team", icon: Users },
];

export function SettingsNav() {
  return (
    <nav className="w-[200px] shrink-0 space-y-1">
      {sections.map(s => (
        <NavLink key={s.to} to={`/settings/${s.to}`} end
          className={({ isActive }) => `flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
            isActive ? "bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand-foreground))] border-l-2 border-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}>
          <s.icon className="w-4 h-4" />{s.label}
        </NavLink>
      ))}
      <div className="pt-2 border-t border-border mt-2">
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground/50 cursor-not-allowed">
          <CreditCard className="w-4 h-4" />Billing <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">SOON</span>
        </div>
      </div>
    </nav>
  );
}
