import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Settings as SettingsIcon, User, Bell, Database, Lock, Brain } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { PageHeader } from "../components/ui/PageHeader";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import {
  fetchDemoDataStatus, importDemoData, removeDemoData,
  type DemoImportStep,
} from "../services/demoImportService";
import { useOrganization, useUpdateOrganization } from "../hooks/useOrganization";
import {
  UNNAMED_ORGANIZATION, type OrganizationPatch,
} from "../services/organizationService";
import {
  useNotificationPrefs, useObservedEventTypes, useNotificationPrefMutations,
} from "../hooks/useNotificationPrefs";
import {
  NOTIFICATION_CHANNELS, CHANNEL_LABEL, byEventType,
  type NotificationChannel,
} from "../services/notificationPrefsService";
import { useAiBrainConfig, useSaveAiBrainConfig } from "../hooks/useAiBrainConfig";
import type { AiBrainSaveInput } from "../services/aiBrainConfigService";

// "team", "api-keys" and "compliance" are retired: each rendered a hardcoded
// array with buttons that did nothing, duplicating a module that already exists
// and works. They stay routable so old links and bookmarks land somewhere that
// says where the subject went, but they are no longer offered in the sidebar.
type Tab = "general" | "notifications" | "ai-brain" | "demo-data";
type RetiredTab = "team" | "api-keys" | "compliance";
type AnyTab = Tab | RetiredTab;

const TABS: { id: Tab; label: string; icon: typeof User }[] = [
  { id: "general", label: "General", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "ai-brain", label: "AI Brain", icon: Brain },
  { id: "demo-data", label: "Demo data", icon: Database },
];

// ── Organization settings ────────────────────────────────────────────────────

const TIMEZONES = [
  'UTC', 'Europe/London', 'Europe/Dublin', 'Europe/Berlin', 'Europe/Paris',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney',
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const FIELD_CLS =
  "w-full max-w-sm border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm " +
  "bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand))] " +
  "disabled:bg-[hsl(var(--bg-muted))] disabled:text-[hsl(var(--text-3))]";

function Field({
  label, children, hint,
}: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[hsl(var(--text-3))] mb-1">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-[hsl(var(--text-4))] max-w-sm leading-relaxed">{hint}</p>}
    </div>
  );
}

/**
 * Organization settings, bound to the `organizations` row.
 *
 * This section used to render `defaultValue="CertifyI"`, a made-up tenant id
 * and a Save button wired to nothing, while the real org name lived as a
 * hardcoded string in a browser localStorage store. Everything here now reads
 * and writes the tenant's own record.
 *
 * Saving is gated by RLS on `org.update`, so a non-admin gets the database's
 * refusal as a real error rather than a toast over a change that did not
 * happen.
 */
function OrganizationSection() {
  const { data: org, isLoading, isError, error, refetch } = useOrganization();
  const save = useUpdateOrganization();
  const [form, setForm] = useState<OrganizationPatch | null>(null);

  // Hydrate the form from the record once it arrives, and again after a save,
  // so the fields show what was stored rather than what was typed.
  useEffect(() => {
    if (!org) return;
    setForm({
      name: org.name,
      domain: org.domain ?? '',
      industry: org.industry ?? '',
      companySize: org.companySize ?? '',
      primaryContact: org.primaryContact ?? '',
      timezone: org.timezone,
      fiscalYearStart: org.fiscalYearStart,
    });
  }, [org]);

  if (isLoading) {
    return (
      <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
        <CardHeader><CardTitle className="text-sm">Organization Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-14 max-w-sm animate-pulse rounded-lg bg-[hsl(var(--bg-muted))]" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
        <CardHeader><CardTitle className="text-sm">Organization Settings</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-[hsl(var(--s-er-tx))]">
            Could not load the organisation record: {error?.message}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-3 text-xs px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-muted))]"
          >
            Try again
          </button>
        </CardContent>
      </Card>
    );
  }

  if (!org || !form) {
    return (
      <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
        <CardHeader><CardTitle className="text-sm">Organization Settings</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-[hsl(var(--text-3))] leading-relaxed max-w-lg">
            Your account is not linked to an organisation, so there is nothing to configure yet.
            An organisation is created when the first administrator signs up; until then the
            platform shows &ldquo;{UNNAMED_ORGANIZATION}&rdquo; wherever the name would appear.
          </p>
        </CardContent>
      </Card>
    );
  }

  const set = (patch: OrganizationPatch) => setForm(f => ({ ...f, ...patch }));
  const nameBlank = !(form.name ?? '').trim();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameBlank) return;
    save.mutate(
      { id: org.id, patch: form, previous: org },
      {
        // Only after the write resolves — never before.
        onSuccess: (updated) => toast.success(`Saved. This workspace is now “${updated.name}”.`),
        onError: (err: any) => toast.error(err?.message ?? 'Could not save organisation settings.'),
      },
    );
  };

  return (
    <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
      <CardHeader><CardTitle className="text-sm">Organization Settings</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <Field
            label="Organization Name"
            hint="Shown across the platform — page subtitles, the board report, and generated narrative. Changing it updates all of them."
          >
            <input
              value={form.name ?? ''}
              onChange={e => set({ name: e.target.value })}
              className={FIELD_CLS}
              required
              aria-invalid={nameBlank}
            />
          </Field>

          <Field label="Tenant ID" hint="Assigned at creation and immutable — every record in this workspace is scoped to it.">
            <input
              value={org.id}
              readOnly
              className="w-full max-w-sm border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-3))] font-mono"
            />
          </Field>

          <Field label="Primary Domain">
            <input
              value={form.domain ?? ''}
              onChange={e => set({ domain: e.target.value })}
              placeholder="example.com"
              className={FIELD_CLS}
            />
          </Field>

          <Field label="Primary Contact">
            <input
              type="email"
              value={form.primaryContact ?? ''}
              onChange={e => set({ primaryContact: e.target.value })}
              placeholder="admin@example.com"
              className={FIELD_CLS}
            />
          </Field>

          <Field label="Industry">
            <input
              value={form.industry ?? ''}
              onChange={e => set({ industry: e.target.value })}
              placeholder="Financial Services"
              className={FIELD_CLS}
            />
          </Field>

          <Field label="Company Size">
            <input
              value={form.companySize ?? ''}
              onChange={e => set({ companySize: e.target.value })}
              placeholder="500-1000"
              className={FIELD_CLS}
            />
          </Field>

          <Field label="Timezone" hint="Used when a report states the moment its figures were measured.">
            <select
              value={form.timezone ?? 'UTC'}
              onChange={e => set({ timezone: e.target.value })}
              className={FIELD_CLS}
            >
              {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>

          <Field label="Fiscal Year Start">
            <select
              value={form.fiscalYearStart ?? 'January'}
              onChange={e => set({ fiscalYearStart: e.target.value })}
              className={FIELD_CLS}
            >
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={save.isPending || nameBlank}
              className="bg-[hsl(var(--s-ok-tx))] text-[hsl(var(--bg-surface))] px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand))]"
            >
              {save.isPending ? 'Saving…' : 'Save Changes'}
            </button>
            {nameBlank && (
              <span className="text-[11px] text-[hsl(var(--text-4))]">
                A name is required — the platform will not show a blank organisation.
              </span>
            )}
          </div>

          <p className="text-[11px] text-[hsl(var(--text-4))] leading-relaxed max-w-lg">
            Only an organisation administrator can change these. Saving as anyone else is refused
            by the database and reported here — nothing is silently dropped.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

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

// TEAM_MEMBERS and API_KEYS used to live here: two hardcoded arrays rendered as
// if they were this org's people and this org's credentials. Team is covered by
// IAM & Roles (/access-control/*, real user_profiles + RBAC) and API keys by the
// Keys Vault (/security/keys, real api_keys table) — see the retired tabs below.

// ── Notification preferences ─────────────────────────────────────────────────

/**
 * Which governance events reach which channel, backed by `notification_prefs`.
 *
 * This tab used to render six toggles whose on/off state was a literal in the
 * JSX and whose clicks went nowhere, while the real org-scoped table sat with
 * zero readers. Every switch here now writes.
 *
 * The event types offered are the ones this organisation has actually emitted.
 * Shipping a menu of events the platform might one day raise would put rules
 * in front of an operator for things that never fire — coverage the platform
 * does not have.
 */
function NotificationsSection() {
  const prefs = useNotificationPrefs();
  const observed = useObservedEventTypes();
  const { create, toggle, remove } = useNotificationPrefMutations();

  const [eventType, setEventType] = useState("");
  const [channel, setChannel] = useState<NotificationChannel>("in_app");

  const grouped = useMemo(() => byEventType(prefs.data), [prefs.data]);
  const canAdd = eventType.trim().length > 0 && !create.isPending;

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAdd) return;
    create.mutate(
      { channel, eventType: eventType.trim() },
      {
        onSuccess: () => { setEventType(""); toast.success("Notification rule added."); },
        onError: (err: any) => toast.error(err?.message ?? "Could not add the rule."),
      },
    );
  };

  return (
    <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
      <CardHeader><CardTitle className="text-sm">Notification Preferences</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={add} className="flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor="np-event" className="block text-xs font-medium text-[hsl(var(--text-3))] mb-1">
              Governance event
            </label>
            <input
              id="np-event"
              list="np-observed-events"
              value={eventType}
              onChange={e => setEventType(e.target.value)}
              placeholder={observed.data.length ? observed.data[0] : "MODEL_REGISTERED"}
              className={FIELD_CLS + " font-mono"}
            />
            <datalist id="np-observed-events">
              {observed.data.map(t => <option key={t} value={t} />)}
            </datalist>
          </div>
          <div>
            <label htmlFor="np-channel" className="block text-xs font-medium text-[hsl(var(--text-3))] mb-1">
              Channel
            </label>
            <select
              id="np-channel"
              value={channel}
              onChange={e => setChannel(e.target.value as NotificationChannel)}
              className={FIELD_CLS + " max-w-[10rem]"}
            >
              {NOTIFICATION_CHANNELS.map(c => (
                <option key={c} value={c}>{CHANNEL_LABEL[c]}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={!canAdd}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-[hsl(var(--s-ok-tx))] text-[hsl(var(--bg-surface))] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand))]"
          >
            {create.isPending ? "Adding…" : "Add rule"}
          </button>
        </form>

        <p className="text-[11px] text-[hsl(var(--text-4))] leading-relaxed max-w-lg">
          {observed.data.length > 0
            ? `Suggestions come from the ${observed.data.length} event ${observed.data.length === 1 ? "type" : "types"} this workspace has actually emitted.`
            : "No governance events have been emitted in this workspace yet, so there is nothing to suggest — type an event name to create a rule ahead of the first one."}
        </p>

        {prefs.isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-[hsl(var(--bg-muted))]" />
            ))}
          </div>
        ) : prefs.isError ? (
          <div>
            <p className="text-sm text-[hsl(var(--s-er-tx))]">
              Could not load notification preferences: {prefs.error?.message}
            </p>
            <button
              onClick={() => prefs.refetch()}
              className="mt-2 text-xs px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-muted))]"
            >
              Try again
            </button>
          </div>
        ) : grouped.length === 0 ? (
          <p className="text-sm text-[hsl(var(--text-3))] leading-relaxed max-w-lg">
            No notification rules yet. Nothing is being sent — this is the real state, not a
            default set we have hidden from you.
          </p>
        ) : (
          <div className="divide-y divide-[hsl(var(--border))] border-t border-[hsl(var(--border))]">
            {grouped.map(group => (
              <div key={group.eventType} className="py-3">
                <p className="text-sm font-medium font-mono text-[hsl(var(--text-1))]">{group.eventType}</p>
                <div className="mt-2 space-y-1.5">
                  {group.prefs.map(p => (
                    <div key={p.id} className="flex items-center justify-between gap-4">
                      <span className="text-[12px] text-[hsl(var(--text-2))]">{CHANNEL_LABEL[p.channel]}</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={p.isEnabled}
                          aria-label={`${CHANNEL_LABEL[p.channel]} notifications for ${group.eventType}`}
                          disabled={toggle.isPending}
                          onClick={() =>
                            toggle.mutate(
                              { pref: p, isEnabled: !p.isEnabled },
                              { onError: (err: any) => toast.error(err?.message ?? "Could not save.") },
                            )
                          }
                          className={`w-10 h-5 rounded-full relative transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand))] ${
                            p.isEnabled ? "bg-[hsl(var(--s-ok-tx))]" : "bg-[hsl(var(--bg-muted))]"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-[hsl(var(--bg-surface))] absolute top-0.5 transition-all ${p.isEnabled ? "left-5" : "left-0.5"}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            remove.mutate(p, {
                              onSuccess: () => toast.success("Rule removed."),
                              onError: (err: any) => toast.error(err?.message ?? "Could not remove the rule."),
                            })
                          }
                          className="text-[11px] text-[hsl(var(--text-4))] hover:text-[hsl(var(--s-er-tx))] underline-offset-2 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── AI Brain configuration ──────────────────────────────────────────────────

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google AI' },
  { value: 'azure', label: 'Azure OpenAI' },
] as const;

const JUDGE_MODELS: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  ],
  anthropic: [
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
  ],
  google: [
    { value: 'gemini/gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { value: 'gemini/gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  ],
  azure: [
    { value: 'azure/gpt-4o-mini', label: 'Azure GPT-4o Mini' },
    { value: 'azure/gpt-4o', label: 'Azure GPT-4o' },
  ],
};

const EMBEDDING_MODELS: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: 'text-embedding-3-small', label: 'text-embedding-3-small' },
    { value: 'text-embedding-3-large', label: 'text-embedding-3-large' },
  ],
  anthropic: [
    { value: 'text-embedding-3-small', label: 'text-embedding-3-small (via OpenAI-compat)' },
  ],
  google: [
    { value: 'gemini/text-embedding-004', label: 'text-embedding-004' },
  ],
  azure: [
    { value: 'azure/text-embedding-3-small', label: 'Azure text-embedding-3-small' },
  ],
};

const AI_BRAIN_FEATURES = [
  {
    title: 'Automated compliance evaluation',
    desc: 'Evaluates AI model compliance against EU AI Act, ISO 42001, and internal policies using an LLM judge.',
  },
  {
    title: 'Semantic search across governance records',
    desc: 'Embeds policies, controls, risk descriptions and evidence so the platform can surface relevant context automatically.',
  },
  {
    title: 'Auto-action on routine findings',
    desc: 'When evaluation confidence exceeds the threshold, low-risk findings are triaged automatically — flagged, routed or resolved — without waiting for human review.',
  },
  {
    title: 'Trust Engine scoring',
    desc: 'Powers the continuous trust-score computation that feeds the Trust Engine dashboard, Safety Firewall and Guardrail Studio.',
  },
  {
    title: 'Intelligent evidence mapping',
    desc: 'Maps incoming integration evidence to the correct compliance controls, reducing manual tagging.',
  },
];

function AiBrainSection() {
  const { data: config, isLoading, isError, error, refetch } = useAiBrainConfig();
  const save = useSaveAiBrainConfig();

  const [provider, setProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [judgeModel, setJudgeModel] = useState('gpt-4o-mini');
  const [embeddingModel, setEmbeddingModel] = useState('text-embedding-3-small');
  const [confidence, setConfidence] = useState(0.85);
  const [enabled, setEnabled] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!config || hydrated) return;
    setProvider(config.provider);
    setJudgeModel(config.judgeModel);
    setEmbeddingModel(config.embeddingModel);
    setConfidence(config.autoActionConfidence);
    setEnabled(config.enabled);
    setHydrated(true);
  }, [config, hydrated]);

  const handleProviderChange = (p: string) => {
    setProvider(p);
    const judges = JUDGE_MODELS[p];
    if (judges?.length) setJudgeModel(judges[0].value);
    const embeds = EMBEDDING_MODELS[p];
    if (embeds?.length) setEmbeddingModel(embeds[0].value);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const input: AiBrainSaveInput = {
      provider,
      judgeModel,
      embeddingModel,
      autoActionConfidence: confidence,
      enabled,
    };
    if (apiKey.trim()) input.apiKey = apiKey.trim();

    save.mutate(input, {
      onSuccess: (res) => {
        toast.success(res.message);
        setApiKey('');
        setHydrated(false);
      },
      onError: (err: Error) => toast.error(err.message),
    });
  };

  if (isLoading) {
    return (
      <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
        <CardHeader><CardTitle className="text-sm">AI Brain Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-14 max-w-sm animate-pulse rounded-lg bg-[hsl(var(--bg-muted))]" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
        <CardHeader><CardTitle className="text-sm">AI Brain Configuration</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-[hsl(var(--s-er-tx))]">
            Could not load AI Brain configuration: {error?.message}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-3 text-xs px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-muted))]"
          >
            Try again
          </button>
        </CardContent>
      </Card>
    );
  }

  const judges = JUDGE_MODELS[provider] ?? JUDGE_MODELS.openai;
  const embeds = EMBEDDING_MODELS[provider] ?? EMBEDDING_MODELS.openai;

  return (
    <div className="space-y-5">
      {/* Feature explanation */}
      <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain size={16} className="text-[hsl(var(--brand))]" />
            What AI Brain enables
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[hsl(var(--text-3))] leading-relaxed mb-4 max-w-xl">
            AI Brain is the platform&rsquo;s evaluation and reasoning engine. Connecting a provider
            API key activates real-time compliance checks, semantic search, and autonomous
            triage across all governed AI systems. Without a key, these capabilities remain
            dormant and the platform operates in manual-only mode.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {AI_BRAIN_FEATURES.map(f => (
              <div
                key={f.title}
                className="rounded-lg border border-[hsl(var(--border))] px-3 py-2.5"
              >
                <p className="text-xs font-medium text-[hsl(var(--text-1))] mb-0.5">{f.title}</p>
                <p className="text-[11px] text-[hsl(var(--text-4))] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Configuration form */}
      <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
        <CardHeader><CardTitle className="text-sm">Provider Configuration</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <Field label="AI Provider">
              <select
                value={provider}
                onChange={e => handleProviderChange(e.target.value)}
                className={FIELD_CLS}
              >
                {PROVIDERS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </Field>

            <Field
              label="API Key"
              hint={
                config?.keyPrefix
                  ? `Current key: ${config.keyPrefix} — leave blank to keep it. Enter a new key to replace it.`
                  : 'Your API key is encrypted with AES-256-GCM before storage. The plaintext never reaches the database.'
              }
            >
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={config?.keyPrefix ? `${config.keyPrefix} (stored)` : 'sk-...'}
                autoComplete="off"
                className={FIELD_CLS + " font-mono"}
              />
            </Field>

            <Field
              label="Judge Model"
              hint="The LLM used for compliance evaluation, risk scoring, and policy-check reasoning."
            >
              <select
                value={judgeModel}
                onChange={e => setJudgeModel(e.target.value)}
                className={FIELD_CLS}
              >
                {judges.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </Field>

            <Field
              label="Embedding Model"
              hint="Used for semantic search across policies, controls, evidence and risk descriptions."
            >
              <select
                value={embeddingModel}
                onChange={e => setEmbeddingModel(e.target.value)}
                className={FIELD_CLS}
              >
                {embeds.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </Field>

            <Field
              label={`Auto-action confidence threshold: ${(confidence * 100).toFixed(0)}%`}
              hint="Findings above this confidence are triaged automatically. Lower values mean more automation; higher values require more human review."
            >
              <input
                type="range"
                min={0.5}
                max={1.0}
                step={0.01}
                value={confidence}
                onChange={e => setConfidence(parseFloat(e.target.value))}
                className="w-full max-w-sm accent-[hsl(var(--brand))]"
              />
              <div className="flex justify-between text-[10px] text-[hsl(var(--text-4))] max-w-sm mt-0.5">
                <span>50% — more auto</span>
                <span>100% — manual only</span>
              </div>
            </Field>

            <Field label="Enable AI Brain">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-label="Enable AI Brain"
                  onClick={() => setEnabled(e => !e)}
                  className={`w-10 h-5 rounded-full relative transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand))] ${
                    enabled ? "bg-[hsl(var(--s-ok-tx))]" : "bg-[hsl(var(--bg-muted))]"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-[hsl(var(--bg-surface))] absolute top-0.5 transition-all ${enabled ? "left-5" : "left-0.5"}`} />
                </button>
                <span className="text-xs text-[hsl(var(--text-3))]">
                  {enabled ? 'AI Brain is active — evaluations will run automatically.' : 'AI Brain is disabled — all evaluations require manual action.'}
                </span>
              </div>
            </Field>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={save.isPending}
                className="bg-[hsl(var(--s-ok-tx))] text-[hsl(var(--bg-surface))] px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand))]"
              >
                {save.isPending ? 'Saving…' : 'Save Configuration'}
              </button>
            </div>

            <p className="text-[11px] text-[hsl(var(--text-4))] leading-relaxed max-w-lg">
              The API key is encrypted server-side with AES-256-GCM before reaching the database.
              Only the Python evaluation backend decrypts it at runtime — the key is never
              returned to the browser and never appears in any log.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Retired tabs ─────────────────────────────────────────────────────────────
//
// Team, API Keys and Compliance each rendered a hardcoded array with buttons
// that did nothing, duplicating a module that already exists and works. A
// second, fake copy of a real screen is worse than no copy: it splits where
// people look and it invents state.
//
// They are not simply deleted — a Settings tab people have used should say
// where its subject went rather than vanish (no dead ends).

function MovedTo({
  what, why, links,
}: { what: string; why: string; links: { to: string; label: string }[] }) {
  return (
    <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
      <CardHeader><CardTitle className="text-sm">{what}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-[hsl(var(--text-3))] leading-relaxed max-w-lg">{why}</p>
        <div className="flex flex-wrap gap-2">
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className="text-xs px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand))]"
            >
              {l.label} →
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// The Integrations register lives at /integrations (real org-scoped
// `integrations` table + the 219-product integration_catalog). The tab that
// used to be here rendered a hardcoded six-item array with connect buttons
// that did nothing — a fake-success surface duplicating a real module.

// Retired ids are still accepted so a bookmark or an old link lands on the
// explanation rather than silently on General, which would look like the
// setting had been removed without trace.
const TAB_IDS = new Set<AnyTab>([
  "general", "notifications", "ai-brain", "demo-data", "team", "api-keys", "compliance",
]);

export default function SettingsPage() {
  // Deep link support (e.g. the Get-started checklist links ?tab=demo-data).
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab: AnyTab = requestedTab && TAB_IDS.has(requestedTab as AnyTab) ? (requestedTab as AnyTab) : "general";
  const [activeTab, setActiveTab] = useState<AnyTab>(initialTab);

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
          {activeTab === "general" && <OrganizationSection />}

          {activeTab === "team" && (
            <MovedTo
              what="Team"
              why="People and their permissions live in IAM & Roles, against the real user records and role bindings this workspace is scoped by. The list that used to be here was a fixed five-person example that no invite could change."
              links={[
                { to: "/access-control/users", label: "Users Registry" },
                { to: "/access-control/roles", label: "Roles Management" },
                { to: "/access-control/departments", label: "Departments" },
              ]}
            />
          )}

          {activeTab === "api-keys" && (
            <MovedTo
              what="API Keys"
              why="Keys are managed in the Keys Vault, which holds the real records with rotation, expiry and revocation. The four keys listed here were fixed strings, and Generate Key produced nothing."
              links={[{ to: "/security/keys", label: "Keys Vault" }]}
            />
          )}

          {activeTab === "notifications" && <NotificationsSection />}
          {activeTab === "ai-brain" && <AiBrainSection />}

          {activeTab === "compliance" && (
            <MovedTo
              what="Compliance Configuration"
              why="The switches here described how the platform behaves rather than anything it stores — the audit chain is append-only by construction, not by preference, and evidence collection is configured per source. Nothing was ever saved. The real controls are below."
              links={[
                { to: "/compliance/controls", label: "Controls" },
                { to: "/evidence-vault", label: "Evidence Vault" },
                { to: "/integrations", label: "Evidence sources" },
                { to: "/autopilot", label: "Autopilot" },
              ]}
            />
          )}

          {activeTab === "demo-data" && <DemoDataSection />}
        </div>
      </div>
    </div>
  );
}
