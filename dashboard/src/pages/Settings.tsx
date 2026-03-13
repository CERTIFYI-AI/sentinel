import { useState } from "react";
import { Settings as SettingsIcon, Key, Shield, Bell, Database, Globe, Users, Moon, Sun, Save, RotateCcw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { useTheme } from "../context/ThemeContext";

const TABS = [
  { id: "general", label: "General", icon: SettingsIcon },
  { id: "api-keys", label: "API Keys", icon: Key },
  { id: "security", label: "Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "data", label: "Data & Storage", icon: Database },
  { id: "team", label: "Team", icon: Users },
] as const;

type TabId = typeof TABS[number]["id"];

export default function Settings() {
  const { theme, toggle } = useTheme();
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [trustThreshold, setTrustThreshold] = useState("0.85");
  const [driftAlert, setDriftAlert] = useState("2.0");
  const [driftBlock, setDriftBlock] = useState("3.5");
  const [retentionDays, setRetentionDays] = useState("90");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [slackAlerts, setSlackAlerts] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="p-6 space-y-6 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <SettingsIcon size={24} className="text-green-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-500">Platform configuration and preferences</p>
          </div>
        </div>
        <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors">
          <Save size={16} />{saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <nav className="w-48 flex-shrink-0 space-y-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeTab === t.id ? "bg-green-600/20 text-green-400 font-medium" : "text-gray-500 hover:bg-muted"
              }`}>
              <t.icon size={16} />{t.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 space-y-4">
          {activeTab === "general" && (
            <>
              <Card>
                <CardHeader><CardTitle className="text-sm">Appearance</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm font-medium">Theme</p><p className="text-xs text-gray-500">Switch between light and dark mode</p></div>
                    <button onClick={toggle} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors">
                      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Trust Thresholds</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div><label className="text-xs text-gray-500">Trust Pass Threshold</label>
                      <input value={trustThreshold} onChange={e => setTrustThreshold(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm" /></div>
                    <div><label className="text-xs text-gray-500">Drift Alert Threshold</label>
                      <input value={driftAlert} onChange={e => setDriftAlert(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm" /></div>
                    <div><label className="text-xs text-gray-500">Drift Block Threshold</label>
                      <input value={driftBlock} onChange={e => setDriftBlock(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm" /></div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === "api-keys" && (
            <Card>
              <CardHeader><CardTitle className="text-sm">API Keys</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm font-medium font-mono">sk-sentinel-****-****-7f3a</p>
                      <p className="text-xs text-gray-500">Created 2 days ago &middot; Last used 1 hour ago</p></div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1 text-xs rounded border border-border hover:bg-muted">Reveal</button>
                      <button className="px-3 py-1 text-xs rounded border border-red-500/30 text-red-400 hover:bg-red-500/10">Revoke</button>
                    </div>
                  </div>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border text-sm text-gray-500 hover:border-green-500 hover:text-green-400 transition-colors">
                  <Key size={14} />Generate New Key
                </button>
              </CardContent>
            </Card>
          )}

          {activeTab === "security" && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Security</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {["Enforce HTTPS only", "Enable audit log immutability", "Require MFA for admin actions", "Auto-block on 3+ HITL escalations"].map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm">{s}</span>
                    <div className={`w-10 h-5 rounded-full cursor-pointer transition-colors ${
                      i < 2 ? "bg-green-500" : "bg-zinc-600"
                    }`}><div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      i < 2 ? "translate-x-5" : "translate-x-0"
                    }`} /></div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {activeTab === "notifications" && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Notification Channels</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <div><p className="text-sm font-medium">Email Alerts</p><p className="text-xs text-gray-500">Receive compliance and HITL alerts via email</p></div>
                  <div onClick={() => setEmailAlerts(!emailAlerts)} className={`w-10 h-5 rounded-full cursor-pointer transition-colors ${emailAlerts ? "bg-green-500" : "bg-zinc-600"}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${emailAlerts ? "translate-x-5" : "translate-x-0"}`} />
                  </div>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div><p className="text-sm font-medium">Slack Integration</p><p className="text-xs text-gray-500">Post alerts to a Slack channel</p></div>
                  <div onClick={() => setSlackAlerts(!slackAlerts)} className={`w-10 h-5 rounded-full cursor-pointer transition-colors ${slackAlerts ? "bg-green-500" : "bg-zinc-600"}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${slackAlerts ? "translate-x-5" : "translate-x-0"}`} />
                  </div>
                </div>
                <div><label className="text-xs text-gray-500">Webhook URL</label>
                  <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://hooks.slack.com/services/..." className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "data" && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Data &amp; Storage</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><label className="text-xs text-gray-500">Evidence Retention (days)</label>
                  <input value={retentionDays} onChange={e => setRetentionDays(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border border-border">
                    <p className="text-xs text-gray-500">Evidence Records</p>
                    <p className="text-2xl font-bold text-gray-900">14,820</p>
                  </div>
                  <div className="p-4 rounded-lg border border-border">
                    <p className="text-xs text-gray-500">Storage Used</p>
                    <p className="text-2xl font-bold text-gray-900">2.3 GB</p>
                  </div>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-colors">
                  <RotateCcw size={14} />Purge Expired Records
                </button>
              </CardContent>
            </Card>
          )}

          {activeTab === "team" && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Team Members</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[{ name: "Admin", email: "admin@certifyi.ai", role: "Owner" }, { name: "Bhaskar", email: "bhaskar@certifyi.ai", role: "Admin" }, { name: "Dev Team", email: "dev@certifyi.ai", role: "Viewer" }].map((m, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-600/20 flex items-center justify-center text-green-400 text-xs font-bold">{m.name[0]}</div>
                      <div><p className="text-sm font-medium">{m.name}</p><p className="text-xs text-gray-500">{m.email}</p></div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-muted">{m.role}</span>
                  </div>
                ))}
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border text-sm text-gray-500 hover:border-green-500 hover:text-green-400 transition-colors">
                  <Users size={14} />Invite Member
                </button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
