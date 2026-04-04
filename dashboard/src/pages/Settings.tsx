import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Switch } from "../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Building2, Globe, Shield, Key, Bell, Database, Plug, Save, Plus, Copy, Eye, EyeOff, RefreshCw, Trash2, CheckCircle2, XCircle, ChevronRight, AlertTriangle, Mail } from "lucide-react";

const orgSettings = {
  companyName: "Acme AI Corp",
  domain: "acmeai.com",
  industry: "Financial Services",
  companySize: "500-1000",
  primaryContact: "admin@acmeai.com",
  timezone: "America/New_York",
  fiscalYearStart: "January",
};

const authSettings = {
  ssoEnabled: true,
  ssoProvider: "Okta",
  samlEndpoint: "https://acmeai.okta.com/app/sentinel/sso/saml",
  scimProvisioning: true,
  mfaRequired: true,
  mfaMethods: ["TOTP", "WebAuthn"],
  sessionTimeout: "8 hours",
  passwordPolicy: { minLength: 14, requireMFA: true, maxAge: "90 days" },
};

const apiKeysData = [
  { id: "key-1", name: "Production ML Pipeline", prefix: "sk-prod-7a3f", created: "2026-08-12", lastUsed: "2026-03-30", scopes: ["models:read", "guardrails:read", "guardrails:write"], status: "Active" as const },
  { id: "key-2", name: "Staging Integration Tests", prefix: "sk-stg-2b1c", created: "2026-01-05", lastUsed: "2026-03-29", scopes: ["models:read", "models:write", "risks:read"], status: "Active" as const },
  { id: "key-3", name: "Deprecated Legacy System", prefix: "sk-leg-9d4e", created: "2026-03-01", lastUsed: "2026-06-15", scopes: [] as string[], status: "Revoked" as const },
];

const notificationChannels = [
  { type: "Email", configured: true, detail: "team-leads@acmeai.com", icon: Mail },
  { type: "Slack", configured: true, detail: "#sentinel-alerts, #compliance-updates", icon: Bell },
  { type: "PagerDuty", configured: true, detail: "AI Platform On-Call", icon: AlertTriangle },
  { type: "Jira", configured: true, detail: "Project: SENT, Auto-create on critical", icon: CheckCircle2 },
];

const notificationPrefs = [
  { event: "Critical Risk", channels: ["Email", "Slack", "PagerDuty"] },
  { event: "Compliance Deadline", channels: ["Email", "Slack"] },
  { event: "Guardrail Violation", channels: ["Slack"] },
  { event: "Weekly Digest", channels: ["Email"] },
];

const retentionPolicies = [
  { dataType: "Audit Logs", retention: "7 years", note: "Immutable" },
  { dataType: "Evidence Artifacts", retention: "5 years", note: "Post-audit" },
  { dataType: "Model Artifacts", retention: "3 years", note: "Post-retirement" },
  { dataType: "Incident Records", retention: "7 years", note: "" },
  { dataType: "User Activity Logs", retention: "2 years", note: "" },
];

const integrationsData = [
  { name: "Drata", type: "Compliance Automation", status: "Connected" as const, lastSync: "2026-03-30 14:00", frequency: "Every 6 hours" },
  { name: "Jira", type: "Issue Tracking", status: "Connected" as const, lastSync: "2026-03-30 15:30", frequency: "Real-time webhook" },
  { name: "Slack", type: "Communication", status: "Connected" as const, lastSync: "Real-time", frequency: "Real-time" },
  { name: "PagerDuty", type: "Incident Management", status: "Connected" as const, lastSync: "2026-03-30 12:00", frequency: "Real-time webhook" },
  { name: "Okta", type: "Identity Provider", status: "Connected" as const, lastSync: "2026-03-30 08:00", frequency: "Every 15 min (SCIM)" },
  { name: "AWS S3", type: "Evidence Storage", status: "Connected" as const, lastSync: "2026-03-30 16:00", frequency: "On upload" },
  { name: "GitHub", type: "Source Control", status: "Disconnected" as const, lastSync: "2026-02-15 10:00", frequency: "N/A" },
];

const settingsTabs = [
  { id: "organization", label: "Organization", icon: Building2 },
  { id: "authentication", label: "Authentication", icon: Shield },
  { id: "api-keys", label: "API Keys", icon: Key },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "data-retention", label: "Data Retention", icon: Database },
  { id: "integrations", label: "Integrations", icon: Plug },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState("organization");
  const [org, setOrg] = useState(orgSettings);
  const [auth, setAuth] = useState(authSettings);
  const [keys] = useState(apiKeysData);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 1200);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your organization, security, and platform configuration</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left side vertical tabs */}
        <div className="w-56 shrink-0 space-y-1">
          {settingsTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                    : "text-muted-foreground hover:text-slate-200 hover:bg-muted/50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right side content */}
        <div className="flex-1 min-w-0">
          {/* Organization Tab */}
          {activeTab === "organization" && (
            <Card className="bg-[#1a1f2e] border-border/50">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2"><Building2 className="h-5 w-5 text-teal-400" /> Organization Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Company Name</label>
                    <Input value={org.companyName} onChange={(e) => setOrg({...org, companyName: e.target.value})} className="bg-muted border-slate-600 text-foreground mt-1" />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Domain</label>
                    <Input value={org.domain} onChange={(e) => setOrg({...org, domain: e.target.value})} className="bg-muted border-slate-600 text-foreground mt-1" />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Industry</label>
                    <Input value={org.industry} onChange={(e) => setOrg({...org, industry: e.target.value})} className="bg-muted border-slate-600 text-foreground mt-1" />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Company Size</label>
                    <Input value={org.companySize} onChange={(e) => setOrg({...org, companySize: e.target.value})} className="bg-muted border-slate-600 text-foreground mt-1" />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Primary Contact</label>
                    <Input value={org.primaryContact} onChange={(e) => setOrg({...org, primaryContact: e.target.value})} className="bg-muted border-slate-600 text-foreground mt-1" />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Timezone</label>
                    <Input value={org.timezone} onChange={(e) => setOrg({...org, timezone: e.target.value})} className="bg-muted border-slate-600 text-foreground mt-1" />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Fiscal Year Start</label>
                    <Input value={org.fiscalYearStart} onChange={(e) => setOrg({...org, fiscalYearStart: e.target.value})} className="bg-muted border-slate-600 text-foreground mt-1" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
                  <Button variant="outline" className="border-slate-600 text-foreground">Cancel</Button>
                  <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700 text-foreground">
                    {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {/* Authentication Tab */}
          {activeTab === "authentication" && (
            <Card className="bg-[#1a1f2e] border-border/50">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2"><Shield className="h-5 w-5 text-teal-400" /> Authentication & Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-foreground font-medium">Single Sign-On (SSO)</p>
                      <p className="text-sm text-muted-foreground">Provider: {auth.ssoProvider} | SAML Endpoint configured</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-[hsl(var(--brand))]/10 text-[hsl(var(--brand))] border-primary/20">Enabled</Badge>
                      <Switch checked={auth.ssoEnabled} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-foreground font-medium">SCIM Provisioning</p>
                      <p className="text-sm text-muted-foreground">Auto-provision users from {auth.ssoProvider}</p>
                    </div>
                    <Switch checked={auth.scimProvisioning} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-foreground font-medium">Multi-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground">Methods: {auth.mfaMethods.join(", ")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-[hsl(var(--brand))]/10 text-[hsl(var(--brand))] border-primary/20">Required</Badge>
                      <Switch checked={auth.mfaRequired} />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                  <div>
                    <label className="text-sm text-muted-foreground">Session Timeout</label>
                    <Input value={auth.sessionTimeout} className="bg-muted border-slate-600 text-foreground mt-1" readOnly />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Password Min Length</label>
                    <Input value={String(auth.passwordPolicy.minLength)} className="bg-muted border-slate-600 text-foreground mt-1" readOnly />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Password Max Age</label>
                    <Input value={auth.passwordPolicy.maxAge} className="bg-muted border-slate-600 text-foreground mt-1" readOnly />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
                  <Button variant="outline" className="border-slate-600 text-foreground">Cancel</Button>
                  <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700 text-foreground">
                    <Save className="h-4 w-4 mr-2" /> Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {/* API Keys Tab */}
          {activeTab === "api-keys" && (
            <Card className="bg-[#1a1f2e] border-border/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-foreground flex items-center gap-2"><Key className="h-5 w-5 text-teal-400" /> API Keys</CardTitle>
                <Button onClick={() => setShowKeyDialog(true)} className="bg-teal-600 hover:bg-teal-700 text-foreground" size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Generate New Key
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {keys.map((key) => (
                    <div key={key.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-foreground font-medium">{key.name}</p>
                          <Badge className={key.status === "Active" ? "bg-[hsl(var(--brand))]/10 text-[hsl(var(--brand))] border-primary/20" : "bg-red-500/10 text-red-400 border-red-500/20"}>{key.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground font-mono">{key.prefix}...****</p>
                        <div className="flex gap-2 mt-1">
                          {key.scopes.map((s) => (
                            <Badge key={s} variant="outline" className="text-xs border-slate-600 text-muted-foreground">{s}</Badge>
                          ))}
                        </div>
                        <p className="text-xs text-slate-500">Created: {key.created} | Last used: {key.lastUsed}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground"><Copy className="h-4 w-4" /></Button>
                        {key.status === "Active" && (
                          <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300"><Trash2 className="h-4 w-4" /></Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <Card className="bg-[#1a1f2e] border-border/50">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2"><Bell className="h-5 w-5 text-teal-400" /> Notification Channels</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {notificationChannels.map((ch) => {
                      const Icon = ch.icon;
                      return (
                        <div key={ch.type} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="text-foreground font-medium">{ch.type}</p>
                              <p className="text-sm text-muted-foreground">{ch.detail}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-[hsl(var(--brand))]/10 text-[hsl(var(--brand))] border-primary/20">Configured</Badge>
                            <Switch checked={ch.configured} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#1a1f2e] border-border/50">
                <CardHeader>
                  <CardTitle className="text-foreground text-base">Routing Preferences</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {notificationPrefs.map((pref) => (
                      <div key={pref.event} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <p className="text-sm text-foreground">{pref.event}</p>
                        <div className="flex gap-1">
                          {pref.channels.map((c) => (
                            <Badge key={c} variant="outline" className="text-xs border-slate-600 text-muted-foreground">{c}</Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          {/* Data Retention Tab */}
          {activeTab === "data-retention" && (
            <Card className="bg-[#1a1f2e] border-border/50">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2"><Database className="h-5 w-5 text-teal-400" /> Data Retention Policies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {retentionPolicies.map((p) => (
                    <div key={p.dataType} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-foreground font-medium">{p.dataType}</p>
                        {p.note && <p className="text-xs text-slate-500">{p.note}</p>}
                      </div>
                      <Badge variant="outline" className="border-slate-600 text-foreground">{p.retention}</Badge>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-muted/30 rounded-lg space-y-2">
                  <p className="text-sm text-foreground font-medium">Additional Settings</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Deletion Policy:</span> <span className="text-foreground">Automated purge with 30-day grace period</span></div>
                    <div><span className="text-muted-foreground">Backup Frequency:</span> <span className="text-foreground">Daily incremental, weekly full</span></div>
                    <div><span className="text-muted-foreground">Data Residency:</span> <span className="text-foreground">US-East primary, EU-West replica</span></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Integrations Tab */}
          {activeTab === "integrations" && (
            <Card className="bg-[#1a1f2e] border-border/50">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2"><Plug className="h-5 w-5 text-teal-400" /> Connected Integrations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {integrationsData.map((int) => (
                    <div key={int.name} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${int.status === "Connected" ? "bg-emerald-400" : "bg-red-400"}`} />
                        <div>
                          <p className="text-foreground font-medium">{int.name}</p>
                          <p className="text-sm text-muted-foreground">{int.type}</p>
                          <p className="text-xs text-slate-500">Last sync: {int.lastSync} | {int.frequency}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={int.status === "Connected" ? "bg-[hsl(var(--brand))]/10 text-[hsl(var(--brand))] border-primary/20" : "bg-red-500/10 text-red-400 border-red-500/20"}>{int.status}</Badge>
                        <Button variant="outline" size="sm" className="border-slate-600 text-foreground">
                          {int.status === "Connected" ? "Configure" : "Connect"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Generate Key Dialog */}
      <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
        <DialogContent className="bg-[#1a1f2e] border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Generate New API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Key Name</label>
              <Input placeholder="e.g., Production Pipeline" className="bg-muted border-slate-600 text-foreground mt-1" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Scopes</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {["models:read", "models:write", "risks:read", "risks:write", "guardrails:read", "guardrails:write", "evidence:read", "reports:read"].map((scope) => (
                  <label key={scope} className="flex items-center gap-2 text-sm text-foreground">
                    <input type="checkbox" className="rounded" />
                    <span className="font-mono text-xs">{scope}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Expiration</label>
              <Input type="date" className="bg-muted border-slate-600 text-foreground mt-1" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="border-slate-600 text-foreground" onClick={() => setShowKeyDialog(false)}>Cancel</Button>
              <Button className="bg-teal-600 hover:bg-teal-700 text-foreground" onClick={() => setShowKeyDialog(false)}>
                <Key className="h-4 w-4 mr-2" /> Generate Key
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
