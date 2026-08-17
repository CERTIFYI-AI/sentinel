import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Settings as SettingsIcon, User, Shield, Bell, Key, Users, Database, Globe, Lock } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { PageHeader } from "../components/ui/PageHeader";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import {
  fetchDemoDataStatus, importDemoData, removeDemoData,
  type DemoImportStep,
} from "../services/demoImportService";

type Tab = "general" | "team" | "api-keys" | "notifications" | "compliance" | "integrations" | "demo-data";

const TABS: { id: Tab; label: string; icon: typeof User }[] = [
  { id: "general", label: "General", icon: User },
  { id: "team", label: "Team", icon: Users },
  { id: "api-keys", label: "API Keys", icon: Key },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "compliance", label: "Compliance", icon: Shield },
  { id: "integrations", label: "Integrations", icon: Globe },
  { id: "demo-data", label: "Demo data", icon: Database },
];

// ── Demo data section ────────────────────────────────────────────────────────

const STEP_GLYPH: Record<DemoImportStep["status"], { glyph: string; cls: string }> = {
  pending: { glyph: "○", cls: "text-[hsl(var(--text-4))]" },
  running: { glyph: "◔", cls: "text-[hsl(var(--s-in-tx))] animate-pulse" },
  done:    { glyph: "✓", cls: "text-[hsl(var(--s-ok-tx))]" },
  skipped: { glyph: "–", cls: "text-[hsl(var(--s-wn-tx))]" },
  failed:  { glyph: "✕", cls: "text-[hsl(var(--destructive))]" },
};

function DemoDataSection() {
  const qc = useQueryClient();
  const statusQuery = useQuery({ queryKey: ["demo-data-status"], queryFn: fetchDemoDataStatus });

  const [running, setRunning] = useState<null | "import" | "remove">(null);
  const [steps, setSteps] = useState<DemoImportStep[] | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | "import" | "remove">(null);

  const busy = running !== null;
  const imported = statusQuery.data?.imported ?? false;

  const finish = async () => {
    setRunning(null);
    // Every module reads these tables — refresh the whole cache so the
    // imported (or removed) data shows up live across the platform.
    await qc.invalidateQueries();
  };

  const runImport = async () => {
    setRunning("import");
    setLastError(null);
    setSteps(null);
    try {
      await importDemoData(setSteps);
      // Toast only after the whole import resolved — never before.
      toast.success("Demo data imported. Every module now shows the linked demo dataset.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLastError(msg);
      toast.error(msg);
    } finally {
      await finish();
    }
  };

  const runRemove = async () => {
    setRunning("remove");
    setLastError(null);
    setSteps(null);
    try {
      await removeDemoData(setSteps);
      toast.success("Demo data removed. Only rows carrying the demo marker were deleted.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLastError(msg);
      toast.error(msg);
    } finally {
      await finish();
    }
  };

  return (
    <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
      <CardHeader><CardTitle className="text-sm">Demo data</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-[hsl(var(--text-3))]">
          Seeds this organization with a small, coherent, <strong>clearly-fictional</strong> dataset
          — models, vendors, risks, an incident, assessments, SLAs, an AIBOM, attestations,
          a provenance graph, cited carbon/energy estimates, a draft ESG report and tasks —
          all interlinked through the real service layer. Every record is labelled
          "(Demo)" and carries a removable <code className="font-mono text-xs">demo_seed</code> marker.
        </p>

        {/* Status line */}
        {statusQuery.isLoading ? (
          <p className="text-xs text-[hsl(var(--text-4))]">Checking for existing demo data…</p>
        ) : statusQuery.isError ? (
          <p className="text-xs text-[hsl(var(--destructive))]">
            Could not check demo-data status: {(statusQuery.error as Error).message}
          </p>
        ) : imported ? (
          <p className="text-xs font-medium text-[hsl(var(--s-ok-tx))]">
            Demo data is already imported ({statusQuery.data!.modelCount} demo model{statusQuery.data!.modelCount === 1 ? "" : "s"} found).
            Remove it before re-importing.
          </p>
        ) : (
          <p className="text-xs text-[hsl(var(--text-4))]">No demo data found for this organization.</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setConfirm("import")}
            disabled={busy || imported || statusQuery.isLoading || statusQuery.isError}
            className="bg-[hsl(var(--s-ok-tx))] text-[hsl(var(--bg-surface))] px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {running === "import" ? "Importing…" : "Import demo data"}
          </button>
          <button
            onClick={() => setConfirm("remove")}
            disabled={busy || !imported || statusQuery.isLoading}
            className="border border-[hsl(var(--border))] text-[hsl(var(--destructive))] px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[hsl(var(--s-er-bg))] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {running === "remove" ? "Removing…" : "Remove demo data"}
          </button>
        </div>

        {/* Step-by-step progress */}
        {steps && (
          <div className="border border-[hsl(var(--border))] rounded-lg divide-y divide-[hsl(var(--border))]">
            {steps.map((s) => {
              const g = STEP_GLYPH[s.status];
              return (
                <div key={s.key} className="flex items-start gap-2 px-3 py-1.5">
                  <span className={`w-4 text-sm font-bold ${g.cls}`} aria-hidden>{g.glyph}</span>
                  <div className="min-w-0 flex-1">
                    <span className={`text-xs ${s.status === "pending" ? "text-[hsl(var(--text-4))]" : "text-[hsl(var(--text-2))]"}`}>
                      {s.label}
                    </span>
                    {s.detail && (
                      <p className={`text-[11px] ${s.status === "failed" ? "text-[hsl(var(--destructive))]" : "text-[hsl(var(--text-4))]"}`}>
                        {s.detail}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Error surfaced verbatim */}
        {lastError && (
          <div className="border border-[hsl(var(--destructive))] bg-[hsl(var(--s-er-bg))] rounded-lg px-3 py-2">
            <p className="text-xs text-[hsl(var(--destructive))] font-mono break-words">{lastError}</p>
            <p className="text-[11px] text-[hsl(var(--text-3))] mt-1">
              The run stopped at the failed step — records created by earlier steps remain and can be
              cleaned up with "Remove demo data".
            </p>
          </div>
        )}

        <ConfirmDialog
          open={confirm === "import"}
          onClose={() => setConfirm(null)}
          type="info"
          title="Import demo data?"
          message="This writes clearly-labelled fictional records into this organization's live tables, step by step. Nothing is fabricated as measured: estimates cite emission factors, and approvals/attestations stay pending or draft."
          confirmLabel="Import"
          onConfirm={() => { setConfirm(null); void runImport(); }}
        />
        <ConfirmDialog
          open={confirm === "remove"}
          onClose={() => setConfirm(null)}
          isDestructive
          title="Remove demo data?"
          message="Deletes only rows carrying the demo_seed marker, children before parents. Real records are never touched."
          confirmLabel="Remove"
          onConfirm={() => { setConfirm(null); void runRemove(); }}
        />
      </CardContent>
    </Card>
  );
}

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

const TAB_IDS = new Set<Tab>(["general", "team", "api-keys", "notifications", "compliance", "integrations", "demo-data"]);

export default function SettingsPage() {
  // Deep link support (e.g. the Get-started checklist links ?tab=demo-data).
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab: Tab = requestedTab && TAB_IDS.has(requestedTab as Tab) ? (requestedTab as Tab) : "general";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        subtitle="Platform configuration and team management"
      />

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setActiveTab(t.id)} className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                  activeTab === t.id
                    ? "bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))] font-medium"
                    : "text-[hsl(var(--text-3))] hover:bg-[hsl(var(--bg-muted))]"
                }`}>
                  <Icon size={14} /> {t.label}
                </button>
              );
            })}
            {/* SSO provider management lives on its own page (role-gated
                sso:manage) — linked here so it is reachable without typing
                the route by hand. */}
            <Link
              to="/settings/sso"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors text-[hsl(var(--text-3))] hover:bg-[hsl(var(--bg-muted))]"
            >
              <Lock size={14} /> SSO Providers
            </Link>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === "general" && (
            <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
              <CardHeader><CardTitle className="text-sm">Organization Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[hsl(var(--text-3))] mb-1">Organization Name</label>
                  <input defaultValue="CertifyI" className="w-full max-w-sm border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] dark:text-[hsl(var(--bg-surface))]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[hsl(var(--text-3))] mb-1">Tenant ID</label>
                  <input defaultValue="tenant_certifyi_prod" readOnly className="w-full max-w-sm border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-3))] font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[hsl(var(--text-3))] mb-1">Default Trust Threshold</label>
                  <input defaultValue="0.85" type="number" step="0.01" className="w-full max-w-sm border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] dark:text-[hsl(var(--bg-surface))] font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[hsl(var(--text-3))] mb-1">Data Retention (days)</label>
                  <input defaultValue="90" type="number" className="w-full max-w-sm border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] dark:text-[hsl(var(--bg-surface))] font-mono" />
                </div>
                <button className="bg-[hsl(var(--s-ok-tx))] hover:bg-[hsl(var(--s-ok-tx))] text-[hsl(var(--bg-surface))] px-4 py-2 rounded-lg text-sm font-medium transition-colors">Save Changes</button>
              </CardContent>
            </Card>
          )}

          {activeTab === "team" && (
            <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Team Members</CardTitle>
                  <button className="text-xs bg-[hsl(var(--s-ok-tx))] hover:bg-[hsl(var(--s-ok-tx))] text-[hsl(var(--bg-surface))] px-3 py-1.5 rounded-lg font-medium transition-colors">Invite Member</button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-[hsl(var(--border))]">
                  {TEAM_MEMBERS.map(m => (
                    <div key={m.email} className="flex items-center justify-between px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[hsl(var(--s-ok-bg))] flex items-center justify-center text-xs font-bold text-[hsl(var(--s-ok-tx))]">{m.name.split(" ").map(n => n[0]).join("")}</div>
                        <div>
                          <p className="text-sm font-medium text-[hsl(var(--text-1))] dark:text-[hsl(var(--bg-surface))]">{m.name}</p>
                          <p className="text-[11px] text-[hsl(var(--text-3))]">{m.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-3))] font-medium">{m.role}</span>
                        <span className="text-[11px] text-[hsl(var(--text-4))]">{m.lastActive}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "api-keys" && (
            <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">API Keys</CardTitle>
                  <button className="text-xs bg-[hsl(var(--s-ok-tx))] hover:bg-[hsl(var(--s-ok-tx))] text-[hsl(var(--bg-surface))] px-3 py-1.5 rounded-lg font-medium transition-colors">Generate Key</button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-[hsl(var(--border))]">
                  {API_KEYS.map(k => (
                    <div key={k.prefix} className="flex items-center justify-between px-6 py-3">
                      <div>
                        <p className="text-sm font-medium text-[hsl(var(--text-1))] dark:text-[hsl(var(--bg-surface))]">{k.name}</p>
                        <p className="text-[11px] font-mono text-[hsl(var(--text-3))]">{k.prefix}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[11px] text-[hsl(var(--text-4))]">Last used: {k.lastUsed}</span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded capitalize ${
                          k.status === "active" ? "bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]" : "bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))] line-through"
                        }`}>{k.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "notifications" && (
            <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
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
                      <p className="text-sm font-medium text-[hsl(var(--text-1))] dark:text-[hsl(var(--bg-surface))]">{n.label}</p>
                      <p className="text-[11px] text-[hsl(var(--text-3))]">{n.description}</p>
                    </div>
                    <button className={`w-10 h-5 rounded-full relative transition-colors ${n.enabled ? "bg-[hsl(var(--s-ok-tx))]" : "bg-[hsl(var(--bg-muted))]"}`}>
                      <div className={`w-4 h-4 rounded-full bg-[hsl(var(--bg-surface))] absolute top-0.5 transition-all ${n.enabled ? "left-5" : "left-0.5"}`} />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {activeTab === "compliance" && (
            <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
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
                      <p className="text-sm font-medium text-[hsl(var(--text-1))] dark:text-[hsl(var(--bg-surface))]">{c.label}</p>
                      <p className="text-[11px] text-[hsl(var(--text-3))]">{c.description}</p>
                    </div>
                    <button className={`w-10 h-5 rounded-full relative transition-colors ${c.enabled ? "bg-[hsl(var(--s-ok-tx))]" : "bg-[hsl(var(--bg-muted))]"}`}>
                      <div className={`w-4 h-4 rounded-full bg-[hsl(var(--bg-surface))] absolute top-0.5 transition-all ${c.enabled ? "left-5" : "left-0.5"}`} />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {activeTab === "integrations" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {INTEGRATIONS.map(int => (
                <Card key={int.name} className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{int.icon}</span>
                        <div>
                          <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] dark:text-[hsl(var(--bg-surface))]">{int.name}</h3>
                          <p className="text-[11px] text-[hsl(var(--text-3))]">{int.description}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded capitalize ${
                        int.status === "connected"
                          ? "bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]"
                          : "bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-3))]"
                      }`}>{int.status}</span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-[hsl(var(--border))]">
                      <button className={`text-xs font-medium ${
                        int.status === "connected" ? "text-[hsl(var(--text-3))] hover:text-[hsl(var(--s-er-tx))]" : "text-[hsl(var(--s-ok-tx))] hover:underline"
                      }`}>
                        {int.status === "connected" ? "Disconnect" : "Connect"}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {activeTab === "demo-data" && <DemoDataSection />}
        </div>
      </div>
    </div>
  );
}
