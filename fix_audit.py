import pathlib, textwrap

BASE = pathlib.Path('dashboard')

def w(p, c):
    f = BASE / p
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(textwrap.dedent(c).lstrip())
    print(f'  wrote {p}')

    # ── 1. TeamSettings ──
w('src/components/settings/sections/TeamSettings.tsx', '''
    // src/components/settings/sections/TeamSettings.tsx
    import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
    import { api } from "../../../api/client";
    import type { TeamMember } from "../../../api/types";
    import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
    import { Button } from "../../ui/button";
    import { Input } from "../../ui/input";
    import { Label } from "../../ui/label";
    import { Badge } from "../../ui/badge";
    import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
    import { useForm } from "react-hook-form";
    import { z } from "zod";
    import { zodResolver } from "@hookform/resolvers/zod";
    import { UserPlus, Trash2, Shield } from "lucide-react";

    const inviteSchema = z.object({
      email: z.string().email("Valid email required"),
      role: z.enum(["admin", "editor", "viewer"]),
    });
    type InviteForm = z.infer<typeof inviteSchema>;

    export function TeamSettings() {
      const qc = useQueryClient();
      const { data: members = [], isLoading } = useQuery<TeamMember[]>({
        queryKey: ["team-members"],
        queryFn: () => api<TeamMember[]>("/api/team/members"),
      });
      const invite = useMutation({
        mutationFn: (data: InviteForm) =>
          api("/api/team/invites", { method: "POST", body: JSON.stringify(data) }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["team-members"] }),
      });
      const { register, handleSubmit, reset, formState: { errors } } = useForm<InviteForm>({
        resolver: zodResolver(inviteSchema),
        defaultValues: { role: "viewer" },
      });
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Invite Member</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit((d) => { invite.mutate(d); reset(); })} className="flex items-end gap-4">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="inv-email">Email</Label>
                  <Input id="inv-email" placeholder="name@company.com" {...register("email")} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
                <div className="w-36 space-y-1">
                  <Label htmlFor="inv-role">Role</Label>
                  <select id="inv-role" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" {...register("role")}>
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <Button type="submit" disabled={invite.isPending}>Send Invite</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Members</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
                  <TableBody>
                    {members.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-mono text-sm">{m.name}</TableCell>
                        <TableCell className="font-mono text-sm">{m.email}</TableCell>
                        <TableCell><Badge variant="outline">{m.role}</Badge></TableCell>
                        <TableCell><Badge variant={m.status === "active" ? "default" : "secondary"}>{m.status}</Badge></TableCell>
                        <TableCell><Button variant="ghost" size="sm"><Trash2 className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }
''')

# ── 2. NotificationSettings ──
w('src/components/settings/sections/NotificationSettings.tsx', '''
    // src/components/settings/sections/NotificationSettings.tsx
    import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
    import { api } from "../../../api/client";
    import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
    import { Button } from "../../ui/button";
    import { Label } from "../../ui/label";
    import { Bell, Mail, MessageSquare } from "lucide-react";
    import { useState } from "react";

    interface NotificationPrefs {
      email_alerts: boolean;
      slack_enabled: boolean;
      slack_webhook: string;
      digest_frequency: "realtime" | "hourly" | "daily";
      alert_on_high_risk: boolean;
      alert_on_pii_detection: boolean;
      alert_on_threshold_breach: boolean;
    }

    export function NotificationSettings() {
      const qc = useQueryClient();
      const { data: prefs } = useQuery<NotificationPrefs>({
        queryKey: ["notification-prefs"],
        queryFn: () => api<NotificationPrefs>("/api/settings/notifications"),
      });
      const update = useMutation({
        mutationFn: (data: Partial<NotificationPrefs>) =>
          api("/api/settings/notifications", { method: "PATCH", body: JSON.stringify(data) }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["notification-prefs"] }),
      });
      const [local, setLocal] = useState<Partial<NotificationPrefs>>({});
      const merged = { ...prefs, ...local } as NotificationPrefs;
      const toggle = (key: keyof NotificationPrefs) => {
        const val = !merged[key];
        setLocal((p) => ({ ...p, [key]: val }));
        update.mutate({ [key]: val });
      };
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Email Alerts</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Enable email alerts</Label>
                <button type="button" role="switch" aria-checked={merged.email_alerts} onClick={() => toggle("email_alerts")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${merged.email_alerts ? "bg-primary" : "bg-muted"}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${merged.email_alerts ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <Label>Digest frequency</Label>
                <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={merged.digest_frequency}
                  onChange={(e) => { const v = e.target.value as NotificationPrefs["digest_frequency"]; setLocal((p) => ({...p, digest_frequency: v})); update.mutate({digest_frequency: v}); }}>
                  <option value="realtime">Realtime</option>
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                </select>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Slack Integration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Enable Slack notifications</Label>
                <button type="button" role="switch" aria-checked={merged.slack_enabled} onClick={() => toggle("slack_enabled")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${merged.slack_enabled ? "bg-primary" : "bg-muted"}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${merged.slack_enabled ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Alert Triggers</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(["alert_on_high_risk", "alert_on_pii_detection", "alert_on_threshold_breach"] as const).map((key) => (
                <div key={key} className="flex items-center justify-between">
                  <Label>{key.replace("alert_on_", "").replace(/_/g, " ").replace(/^\\w/, (c: string) => c.toUpperCase())}</Label>
                  <button type="button" role="switch" aria-checked={!!merged[key]} onClick={() => toggle(key)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${merged[key] ? "bg-primary" : "bg-muted"}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${merged[key] ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      );
    }
''')

# ── 3. AuditLogSettings ──
w('src/components/settings/sections/AuditLogSettings.tsx', '''
    // src/components/settings/sections/AuditLogSettings.tsx
    import { useQuery } from "@tanstack/react-query";
    import { api } from "../../../api/client";
    import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
    import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
    import { Badge } from "../../ui/badge";
    import { ScrollText } from "lucide-react";

    interface AuditEntry {
      id: string;
      timestamp: string;
      actor: string;
      action: string;
      resource: string;
      detail: string;
    }

    export function AuditLogSettings() {
      const { data: entries = [], isLoading } = useQuery<AuditEntry[]>({
        queryKey: ["settings-audit-log"],
        queryFn: () => api<AuditEntry[]>("/api/settings/audit-log"),
      });
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ScrollText className="h-5 w-5" /> Settings Audit Log</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Time</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead><TableHead>Resource</TableHead><TableHead>Details</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {entries.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono text-xs whitespace-nowrap">{new Date(e.timestamp).toLocaleString()}</TableCell>
                        <TableCell className="font-mono text-sm">{e.actor}</TableCell>
                        <TableCell><Badge variant="outline">{e.action}</Badge></TableCell>
                        <TableCell className="text-sm">{e.resource}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{e.detail}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }
''')

# ── 4. New Settings page with 7 URL-based tabs ──
w('src/pages/Settings.tsx', '''
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

    const TABS = [
      { id: "general", label: "General" },
      { id: "trust-safety", label: "Trust & Safety" },
      { id: "pii", label: "PII Detection" },
      { id: "api-keys", label: "API Keys" },
      { id: "team", label: "Team" },
      { id: "notifications", label: "Notifications" },
      { id: "audit-log", label: "Audit Log" },
    ] as const;

    type TabId = (typeof TABS)[number]["id"];

    const TAB_COMPONENTS: Record<TabId, React.FC> = {
      general: GeneralSettings,
      "trust-safety": TrustSafetySettings,
      pii: PiiSettings,
      "api-keys": ApiKeySettings,
      team: TeamSettings,
      notifications: NotificationSettings,
      "audit-log": AuditLogSettings,
    };

    export default function Settings() {
      const [params, setParams] = useSearchParams();
      const activeTab = (params.get("tab") as TabId) || "general";
      const ActivePanel = TAB_COMPONENTS[activeTab] ?? GeneralSettings;

      return (
        <div className="flex gap-8 p-6">
          <SettingsNav
            tabs={TABS as unknown as readonly { id: string; label: string }[]}
            activeTab={activeTab}
            onTabChange={(id) => setParams({ tab: id })}
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold mb-6">
              {TABS.find((t) => t.id === activeTab)?.label ?? "Settings"}
            </h1>
            <ActivePanel />
          </div>
        </div>
      );
    }
''')

# ── 5. Updated App.tsx with all routes ──
w('src/App.tsx', '''
    // src/App.tsx
    import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
    import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
    import { Sidebar } from "./components/dashboard/Sidebar";
    import { TopBar } from "./components/dashboard/TopBar";
    import Overview from "./pages/Overview";
    import AuditLog from "./pages/AuditLog";
    import HitlQueue from "./pages/HitlQueue";
    import Settings from "./pages/Settings";
    import Login from "./pages/Login";
    import Signup from "./pages/Signup";
    import ModelInventory from "./pages/ModelInventory";
    import ComplianceDashboard from "./pages/ComplianceDashboard";

    const queryClient = new QueryClient({
      defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
    });

    function ProtectedLayout() {
      return (
        <div className="flex h-screen bg-background text-foreground">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <TopBar />
            <main className="flex-1 overflow-y-auto">
              <Outlet />
            </main>
          </div>
        </div>
      );
    }

    export default function App() {
      return (
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route element={<ProtectedLayout />}>
                <Route path="/" element={<Navigate to="/overview" replace />} />
                <Route path="/overview" element={<Overview />} />
                <Route path="/audit-log" element={<AuditLog />} />
                <Route path="/hitl-queue" element={<HitlQueue />} />
                <Route path="/models" element={<ModelInventory />} />
                <Route path="/compliance" element={<ComplianceDashboard />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </QueryClientProvider>
      );
    }
''')

# ── 6. Add missing types to api/types.ts ──
import_types = (BASE / 'src/api/types.ts').read_text()
if 'TeamMember' not in import_types:
    import_types += '''

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  status: "active" | "pending" | "inactive";
}
'''
    (BASE / 'src/api/types.ts').write_text(import_types)
    print('  appended TeamMember to api/types.ts')
else:
    print('  TeamMember already in api/types.ts')

print('\nAll fixes applied.')

# ── 7. Fix SettingsNav to use search params ──
w('src/components/settings/SettingsNav.tsx', '''
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
''')

# ── 8. Fix Settings.tsx - SettingsNav has no props, add compliance tab ──
w('src/pages/Settings.tsx', '''
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
''')

print('\nAll v2 fixes applied.')