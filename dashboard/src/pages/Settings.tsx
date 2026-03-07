// src/pages/Settings.tsx
import { useSearchParams } from "react-router-dom";
import { SettingsNav } from "../components/settings/SettingsNav";
import { GeneralSettings } from "../components/settings/sections/GeneralSettings";
import { TrustSafetySettings } from "../components/settings/sections/TrustSafetySettings";
import { PiiSettings } from "../components/settings/sections/PiiSettings";
import { ApiKeySettings } from "../components/settings/sections/ApiKeySettings";
import { TeamSettings } from "../components/settings/sections/TeamSettings";
import { NotificationSettings } from "../components/settings/sections/NotificationSettings";
import { AuditLogSettings } from "../components/settings/sections/AuditLogSettings";

const TABS: Record<string, { label: string; Component: React.FC }> = {
  general: { label: "General", Component: GeneralSettings },
  "trust-safety": { label: "Trust & Safety", Component: TrustSafetySettings },
  pii: { label: "PII Detection", Component: PiiSettings },
  "api-keys": { label: "API Keys", Component: ApiKeySettings },
  team: { label: "Team", Component: TeamSettings },
  notifications: { label: "Notifications", Component: NotificationSettings },
  compliance: { label: "Compliance", Component: GeneralSettings },
  "audit-log": { label: "Audit Log", Component: AuditLogSettings },
};

export default function Settings() {
  const [params] = useSearchParams();
  const activeTab = params.get("tab") || "general";
  const { label, Component } = TABS[activeTab] ?? TABS.general;

  return (
    <div className="flex gap-8 p-6">
      <SettingsNav />
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-semibold mb-6">{label}</h1>
        <Component />
      </div>
    </div>
  );
}
