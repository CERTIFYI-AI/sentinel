import { useState } from "react";
import { Settings as SettingsIcon, User, Shield, Bell, Key, Users, Database, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

type Tab = "general" | "team" | "api-keys" | "notifications" | "compliance" | "integrations";

const TABS: { id: Tab; label: string; icon: typeof User }[] = [
  { id: "general", label: "General", icon: User },
  { id: "team", label: "Team", icon: Users },
  { id: "api-keys", label: "API Keys", icon: Key },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "compliance", label: "Compliance", icon: Shield },
  { id: "integrations", label: "Integrations", icon: Globe },
];

const TEAM_MEMBERS = [
  { name: "Alice Chen", email: "alice@certifyi.ai", role: "Admin", lastActive: "2 min ago" },
  { name: "Bob Kim", email: "bob@certifyi.ai", role: "Risk Manager", lastActive: "1 hour ago" },
  { name: "Carol Davis", email: "carol@certifyi.ai", role: "Compliance Officer", lastActive: "3 hours ago" },
  { name: "Dave Wilson", email: "dave@certifyi.ai", role: "ML Engineer", lastActive: "5 hours ago" },
  { name: "Eve Martinez", email: "eve@certifyi.ai", role: "Auditor", lastActive: "1 day ago" },
];

const API_KEYS = [
  { name: "Production Proxy", prefix: "sk-prod-****7a2f", created: "2024-11-15", lastUsed: "2 min ago", status: "active" },
  { name: "Staging Environment", prefix: "sk-stg-****b3e1", created: "2024-12-01", lastUsed: "3 hours ago", status: "active" },
  { name: "CI/CD Pipeline", prefix: "sk-ci-****9d4c", created: "2025-01-05", lastUsed: "1 day ago", status: "active" },
  { name: "Old Integration (deprecated)", prefix: "sk-old-****1f8a", created: "2024-06-10", lastUsed: "30 days ago", status: "revoked" },
];

const INTEGRATIONS = [
  { name: "Slack", description: "Send alerts to #ai-compliance channel", status: "connected", icon: "💬" },
  { name: "Jira", description: "Sync remediation tasks", status: "connected", icon: "📋" },
  { name: "PagerDuty", description: "Critical incident escalation", status: "connected", icon: "🚨" },
  { name: "Datadog", description: "Forward metrics and traces", status: "disconnected", icon: "📊" },
  { name: "AWS CloudTrail", description: "Ingest cloud audit events", status: "connected", icon: "☁️" },
  { name: "Okta", description: "SSO and identity management", status: "disconnected", icon: "🔐" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("general");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg"><SettingsIcon size={20} className="text-slate-600 dark:text-slate-400" /></div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Platform configuration and team management</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setActiveTab(t.id)} className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                  activeTab === t.id
                    ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 font-medium"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}>
                  <Icon size={14} /> {t.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === "general" && (
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
              <CardHeader><CardTitle className="text-sm">Organization Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Organization Name</label>
                  <input defaultValue="CertifyI" className="w-full max-w-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Tenant ID</label>
                  <input defaultValue="tenant_certifyi_prod" readOnly className="w-full max-w-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 text-slate-500 font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Default Trust Threshold</label>
                  <input defaultValue="0.85" type="number" step="0.01" className="w-full max-w-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Data Retention (days)</label>
                  <input defaultValue="90" type="number" className="w-full max-w-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono" />
                </div>
                <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Save Changes</button>
              </CardContent>
            </Card>
          )}

          {activeTab === "team" && (
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Team Members</CardTitle>
                  <button className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">Invite Member</button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {TEAM_MEMBERS.map(m => (
                    <div key={m.email} className="flex items-center justify-between px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center text-xs font-bold text-green-700 dark:text-green-400">{m.name.split(" ").map(n => n[0]).join("")}</div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{m.name}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{m.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">{m.role}</span>
                        <span className="text-[11px] text-slate-400">{m.lastActive}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "api-keys" && (
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">API Keys</CardTitle>
                  <button className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">Generate Key</button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {API_KEYS.map(k => (
                    <div key={k.prefix} className="flex items-center justify-between px-6 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{k.name}</p>
                        <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{k.prefix}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[11px] text-slate-400">Last used: {k.lastUsed}</span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded capitalize ${
                          k.status === "active" ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 line-through"
                        }`}>{k.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "notifications" && (
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
              <CardHeader><CardTitle className="text-sm">Notification Preferences</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Critical trust score violations", description: "When trust score drops below threshold", enabled: true },
                  { label: "PII detection alerts", description: "When PII is detected in model outputs", enabled: true },
                  { label: "Compliance deadline reminders", description: "7 days before control review deadlines", enabled: true },
                  { label: "Model drift warnings", description: "When benchmark scores deviate significantly", enabled: false },
                  { label: "Vendor contract expiry", description: "30 days before vendor contract expiration", enabled: true },
                  { label: "Weekly compliance digest", description: "Summary of governance score changes", enabled: true },
                ].map((n, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{n.label}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{n.description}</p>
                    </div>
                    <button className={`w-10 h-5 rounded-full relative transition-colors ${n.enabled ? "bg-green-500" : "bg-slate-300 dark:bg-slate-700"}`}>
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${n.enabled ? "left-5" : "left-0.5"}`} />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {activeTab === "compliance" && (
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
              <CardHeader><CardTitle className="text-sm">Compliance Configuration</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Auto-collect evidence", description: "Automatically gather compliance evidence from trust engine", enabled: true },
                  { label: "Continuous control monitoring", description: "Real-time monitoring of control status changes", enabled: true },
                  { label: "Audit trail immutability", description: "SHA-256 hash chain for append-only audit records", enabled: true },
                  { label: "PII auto-masking", description: "Automatically mask detected PII in logs and reports", enabled: true },
                  { label: "Model card generation", description: "Auto-generate model cards on model registration", enabled: false },
                ].map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{c.label}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{c.description}</p>
                    </div>
                    <button className={`w-10 h-5 rounded-full relative transition-colors ${c.enabled ? "bg-green-500" : "bg-slate-300 dark:bg-slate-700"}`}>
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${c.enabled ? "left-5" : "left-0.5"}`} />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {activeTab === "integrations" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {INTEGRATIONS.map(int => (
                <Card key={int.name} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{int.icon}</span>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{int.name}</h3>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{int.description}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded capitalize ${
                        int.status === "connected"
                          ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}>{int.status}</span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <button className={`text-xs font-medium ${
                        int.status === "connected" ? "text-slate-600 dark:text-slate-400 hover:text-red-600" : "text-green-600 dark:text-green-400 hover:underline"
                      }`}>
                        {int.status === "connected" ? "Disconnect" : "Connect"}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
