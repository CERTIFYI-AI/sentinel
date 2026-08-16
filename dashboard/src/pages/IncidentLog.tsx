// SPDX-License-Identifier: Apache-2.0
// Incident Log — real org-scoped `incidents` backend (incidentResponseService
// via useIncidents). No demo table, no fabricated rows: every KPI, row and
// detail field is derived from persisted records, writes throw on failure and
// the dialog closes only after the save resolves (the hook owns the toasts).
import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, Plus, Search, Filter, Download, X, Eye } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "../components/ui/card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { InterlinkChip } from "@/components/ui/InterlinkChip";
import { useIncidents, usePlaybooks } from "@/hooks/useRiskIncidents";
import type { IncidentRecord } from "@/services/incidentResponseService";
import { useModelsData } from "@/hooks/useModelsData";
import { useRisksData } from "@/hooks/useRisksData";
import { exportCsv } from "@/lib/exportUtils";
import { formatDate } from "../data/seed";

const SEVERITIES = ["critical", "high", "medium", "low"] as const;
const CATEGORIES = ["Data Leakage", "Model Behavior", "Bias / Fairness", "Security", "Availability", "Compliance", "Other"] as const;

// Severity pill — same visual as before, keyed off the service's lowercase values.
const sevColor: Record<string, string> = {
  critical: "bg-[hsl(var(--s-er-tx))] text-[hsl(var(--bg-surface))]",
  high: "bg-[hsl(var(--s-er-tx))] text-[hsl(var(--bg-surface))]",
  medium: "bg-[hsl(var(--s-wn-tx))] text-[hsl(var(--bg-surface))]",
  low: "bg-[hsl(var(--text-4))] text-[hsl(var(--bg-surface))]",
};

// Status dot/label colors for the service's lowercase status set.
const statusConfig: Record<string, { color: string; dot: string }> = {
  open: { color: "text-[hsl(var(--s-wn-tx))]", dot: "bg-[hsl(var(--s-wn-tx))]" },
  investigating: { color: "text-[hsl(var(--s-er-tx))]", dot: "bg-[hsl(var(--s-er-tx))] animate-pulse" },
  containment: { color: "text-[hsl(var(--s-in-tx))]", dot: "bg-[hsl(var(--s-in-tx))]" },
  remediation: { color: "text-[hsl(var(--s-in-tx))]", dot: "bg-[hsl(var(--s-in-tx))]" },
  resolved: { color: "text-[hsl(var(--s-ok-tx))]", dot: "bg-[hsl(var(--s-ok-tx))]" },
  closed: { color: "text-[hsl(var(--text-4))]", dot: "bg-[hsl(var(--text-4))]" },
};

const ACTIVE_STATUSES = ["open", "investigating", "containment", "remediation"];
const NONE = "__none__";

const EMPTY_FORM = {
  title: "",
  description: "",
  severity: "high" as string,
  category: CATEGORIES[0] as string,
  modelId: NONE,
  assignee: "",
  regulatoryReportable: false,
  playbookId: NONE,
};

const incidentRef = (inc: IncidentRecord) => inc.incidentId || (inc.id ? inc.id.slice(0, 8) : "—");

export default function IncidentLog() {
  const { items: incidents, isLoading, error, save, isSaving } = useIncidents();
  const { items: playbooks } = usePlaybooks();
  const { models } = useModelsData();
  const { risks } = useRisksData();
  const [searchParams, setSearchParams] = useSearchParams();
  const modelParam = searchParams.get("model");
  const openParam = searchParams.get("open");

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("all");
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [detail, setDetail] = useState<IncidentRecord | null>(null);

  const modelName = (id?: string | null) => (id ? models.find((m) => m.id === id)?.name ?? "Unavailable" : undefined);
  const playbookName = (id?: string | null) => (id ? playbooks.find((p) => p.id === id)?.name ?? "Unavailable" : undefined);
  const riskName = (id: string) => risks.find((r) => r.id === id)?.title ?? "Unavailable";

  // Deep link: ?open=<id> opens that record's detail (matches uuid or business code).
  useEffect(() => {
    if (!openParam || incidents.length === 0) return;
    const match = incidents.find((i) => i.id === openParam || i.incidentId === openParam);
    if (match) setDetail(match);
  }, [openParam, incidents]);

  const closeDetail = () => {
    setDetail(null);
    if (openParam) {
      const next = new URLSearchParams(searchParams);
      next.delete("open");
      setSearchParams(next, { replace: true });
    }
  };

  const clearModelFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("model");
    setSearchParams(next, { replace: true });
  };

  const submit = async () => {
    if (!form.title.trim()) return;
    const selectedModel = form.modelId !== NONE ? models.find((m) => m.id === form.modelId) : undefined;
    try {
      await save({
        incidentId: `INC-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        severity: form.severity,
        category: form.category,
        status: "open",
        modelId: selectedModel?.id ?? null,
        affectedModels: selectedModel?.name ? [selectedModel.name] : [],
        detectedAt: new Date().toISOString(),
        playbookId: form.playbookId !== NONE ? form.playbookId : null,
        assignee: form.assignee.trim() || null,
        regulatoryReportable: form.regulatoryReportable,
      });
      // Only reached when the write persisted — the hook fires the success toast.
      setForm({ ...EMPTY_FORM });
      setShowForm(false);
    } catch {
      /* dialog stays open; the hook already toasted the real error */
    }
  };

  const filtered = incidents.filter((inc) => {
    if (modelParam && inc.modelId !== modelParam) return false;
    if (search && !inc.title.toLowerCase().includes(search.toLowerCase()) && !(inc.incidentId ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    if (sevFilter !== "all" && inc.severity !== sevFilter) return false;
    return true;
  });

  const stats = {
    total: incidents.length,
    active: incidents.filter((i) => ACTIVE_STATUSES.includes(i.status)).length,
    critical: incidents.filter((i) => i.severity === "critical" && ACTIVE_STATUSES.includes(i.status)).length,
    resolved: incidents.filter((i) => i.status === "resolved" || i.status === "closed").length,
  };

  const handleExport = () => {
    exportCsv(
      filtered.map((i) => ({
        incident_id: incidentRef(i),
        title: i.title,
        severity: i.severity,
        status: i.status,
        model: modelName(i.modelId) ?? i.affectedModels?.[0] ?? "",
        assignee: i.assignee ?? "",
        detected_at: i.detectedAt ?? i.createdAt ?? "",
        regulatory_reportable: i.regulatoryReportable ? "yes" : "no",
      })),
      `incidents-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };

  if (isLoading) return <PageSkeleton title="Incident Log" showStats rows={6} />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Incident Log"
        subtitle={`Track and manage AI safety incidents — ${stats.active} active, ${stats.critical} critical`}
        icon={AlertTriangle}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" leftIcon={<Download size={14} />} disabled={filtered.length === 0} onClick={handleExport}>
              Export CSV
            </Button>
            <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowForm(true)}>Report Incident</Button>
          </div>
        }
      />

      {/* Real query error state */}
      {error != null && (
        <div className="border border-[hsl(var(--s-er-br))] bg-[hsl(var(--s-er-bg))] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--s-er-tx))]">Failed to load incidents</p>
          <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{(error as Error).message}</p>
        </div>
      )}

      {/* Model-scoped filter chip (deep-link from a model) */}
      {modelParam && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-[hsl(var(--brand-subtle))] border border-[hsl(var(--brand))/30] text-[hsl(var(--brand))] rounded-none">
            <span>Filtered to <strong>{modelName(modelParam)}</strong></span>
            <button aria-label="Clear model filter" onClick={clearModelFilter} className="inline-flex items-center hover:text-[hsl(var(--text-1))] cursor-pointer">
              <X size={14} />
            </button>
          </span>
        </div>
      )}

      {/* KPI tiles — derived from real rows */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Incidents", value: stats.total },
          { label: "Active", value: stats.active, color: "text-[hsl(var(--s-wn-tx))]" },
          { label: "Critical Open", value: stats.critical, color: "text-[hsl(var(--s-er-tx))]" },
          { label: "Resolved / Closed", value: stats.resolved, color: "text-[hsl(var(--s-ok-tx))]" },
        ].map((s, i) => (
          <Card key={i} className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--text-3))] font-medium">{s.label}</p>
              <p className={`text-2xl font-bold font-mono mt-1 ${s.color || "text-[hsl(var(--text-1))]"}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search incidents..." className="w-full pl-9 pr-3 py-2 text-sm border border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:ring-2 focus:ring-[hsl(var(--s-ok-br))] focus:border-[hsl(var(--s-ok-br))] outline-none" />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-[hsl(var(--text-4))]" />
          {["all", ...SEVERITIES].map((f) => (
            <button key={f} onClick={() => setSevFilter(f)} className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors capitalize ${
              sevFilter === f ? "bg-[hsl(var(--s-ok-tx))] text-[hsl(var(--bg-surface))]" : "bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border))] text-[hsl(var(--text-2))]"
            }`}>{f === "all" ? "All" : f}</button>
          ))}
        </div>
      </div>

      {/* Incident table */}
      <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))]">
                  {["ID", "Title", "Severity", "Status", "Model", "Assignee", "Detected", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider whitespace-nowrap text-[hsl(var(--text-4))]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((inc) => {
                  const sc = statusConfig[inc.status] || statusConfig.open;
                  const resolvedModel = modelName(inc.modelId);
                  return (
                    <tr key={inc.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))] transition-colors cursor-pointer" onClick={() => setDetail(inc)}>
                      <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--brand))] whitespace-nowrap">{incidentRef(inc)}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[hsl(var(--text-1))] max-w-[320px] truncate">{inc.title}</p>
                        {inc.description && <p className="text-xs text-[hsl(var(--text-4))] max-w-[320px] truncate">{inc.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${sevColor[inc.severity] || sevColor.medium}`}>{inc.severity.toUpperCase()}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                          <span className={`text-xs font-medium capitalize ${sc.color}`}>{inc.status}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {inc.modelId
                          ? <InterlinkChip label={resolvedModel ?? "Unavailable"} to={`/models/inventory/${inc.modelId}`} />
                          : inc.affectedModels?.[0]
                            ? <span className="text-xs text-[hsl(var(--text-2))]">{inc.affectedModels[0]}</span>
                            : <span className="text-xs text-[hsl(var(--text-4))]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))] whitespace-nowrap">{inc.assignee || "—"}</td>
                      <td className="px-4 py-3 text-xs text-[hsl(var(--text-4))] whitespace-nowrap">{formatDate(inc.detectedAt ?? inc.createdAt ?? "")}</td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); setDetail(inc); }}>
                          <Eye size={14} className="text-[hsl(var(--brand))]" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="p-8 text-center text-[hsl(var(--text-4))]">
              <AlertTriangle size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {incidents.length === 0
                  ? "No incidents recorded yet. Report an incident to start tracking."
                  : "No incidents match your filters"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Incident dialog — closes ONLY after the write persists */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) setShowForm(false); }}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 560 }}>
          <DialogHeader>
            <DialogTitle>Report New Incident</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--text-3))] mb-1">Title *</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Brief incident title" style={{ borderRadius: 0 }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--text-3))] mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full border border-[hsl(var(--border))] rounded-none px-3 py-2 text-sm bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] focus:ring-2 focus:ring-[hsl(var(--s-ok-br))] focus:border-[hsl(var(--s-ok-br))] outline-none resize-none" placeholder="Detailed description of what happened..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--text-3))] mb-1">Severity</label>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                  <SelectTrigger className="w-full" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--text-3))] mb-1">Category</label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="w-full" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--text-3))] mb-1">Affected Model</label>
                <Select value={form.modelId} onValueChange={(v) => setForm({ ...form, modelId: v })}>
                  <SelectTrigger className="w-full" style={{ borderRadius: 0 }}><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    <SelectItem value={NONE}>None</SelectItem>
                    {models.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--text-3))] mb-1">Assignee</label>
                <Input value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} placeholder="e.g. Jane Doe" style={{ borderRadius: 0 }} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--text-3))] mb-1">Response Playbook (optional)</label>
              <Select value={form.playbookId} onValueChange={(v) => setForm({ ...form, playbookId: v })}>
                <SelectTrigger className="w-full" style={{ borderRadius: 0 }}><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  <SelectItem value={NONE}>None</SelectItem>
                  {playbooks.map((p) => <SelectItem key={p.id} value={p.id!}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={form.regulatoryReportable} onCheckedChange={(c) => setForm({ ...form, regulatoryReportable: c === true })} />
              <span className="text-xs font-medium text-[hsl(var(--text-2))]">Regulatory reportable (EU AI Act Art. 73 serious-incident reporting)</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => setShowForm(false)}>Cancel</Button>
            <Button style={{ borderRadius: 0 }} disabled={!form.title.trim() || isSaving} onClick={submit}>
              {isSaving ? "Submitting..." : "Submit Incident"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail sheet */}
      <Sheet open={!!detail} onOpenChange={(o) => { if (!o) closeDetail(); }}>
        <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto" style={{ borderRadius: 0 }}>
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 text-[hsl(var(--text-1))]">
                  <AlertTriangle size={18} className="text-[hsl(var(--s-er-tx))]" />
                  {incidentRef(detail)} — {detail.title}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <DetailBox label="Severity">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${sevColor[detail.severity] || sevColor.medium}`}>{detail.severity.toUpperCase()}</span>
                  </DetailBox>
                  <DetailBox label="Status">
                    <span className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${(statusConfig[detail.status] || statusConfig.open).dot}`} />
                      <span className={`text-sm font-medium capitalize ${(statusConfig[detail.status] || statusConfig.open).color}`}>{detail.status}</span>
                    </span>
                  </DetailBox>
                  <DetailBox label="Category" value={detail.category || "—"} />
                  <DetailBox label="Assignee" value={detail.assignee || "—"} />
                  <DetailBox label="Detected" value={formatDate(detail.detectedAt ?? detail.createdAt ?? "")} />
                  <DetailBox label="Occurred" value={detail.occurredDate ? formatDate(detail.occurredDate) : "—"} />
                  <DetailBox label="SLA Target" value={detail.slaHours != null ? `${detail.slaHours}h` : "No SLA set"} />
                  <DetailBox label="Regulatory Reportable" value={detail.regulatoryReportable ? "Yes" : "No"} />
                </div>

                <DetailBox label="Affected Model">
                  {detail.modelId
                    ? <InterlinkChip label={modelName(detail.modelId) ?? "Unavailable"} to={`/models/inventory/${detail.modelId}`} />
                    : detail.affectedModels?.length
                      ? <span className="text-sm text-[hsl(var(--text-1))]">{detail.affectedModels.join(", ")}</span>
                      : <span className="text-sm text-[hsl(var(--text-4))]">—</span>}
                </DetailBox>

                <DetailBox label="Response Playbook">
                  {detail.playbookId
                    ? <InterlinkChip label={playbookName(detail.playbookId) ?? "Unavailable"} to="/incidents/playbooks" />
                    : <span className="text-sm text-[hsl(var(--text-4))]">None linked</span>}
                </DetailBox>

                <DetailBox label="Linked Risks">
                  {detail.linkedRiskIds?.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {detail.linkedRiskIds.map((rid) => (
                        <InterlinkChip key={rid} label={riskName(rid)} to={`/risks?open=${rid}`} />
                      ))}
                    </div>
                  ) : <span className="text-sm text-[hsl(var(--text-4))]">None linked</span>}
                </DetailBox>

                {detail.description && <DetailBox label="Description" value={detail.description} />}
                {detail.impactDescription && <DetailBox label="Impact" value={detail.impactDescription} />}
                {detail.rootCause && <DetailBox label="Root Cause" value={detail.rootCause} />}
                {detail.financialImpact != null && <DetailBox label="Financial Impact" value={`$${detail.financialImpact.toLocaleString()}`} />}
                {(detail.responseTeam ?? []).length > 0 && <DetailBox label="Response Team" value={detail.responseTeam!.join(", ")} />}

                <DetailBox label="Workflow">
                  <InterlinkChip label="Open in Workflow" to={`/incident-workflow?open=${detail.id}`} />
                </DetailBox>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DetailBox({ label, value, children }: { label: string; value?: string; children?: ReactNode }) {
  return (
    <div className="p-3 bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border))]">
      <span className="text-xs text-[hsl(var(--text-4))]">{label}</span>
      <div className="mt-1">
        {children ?? <p className="text-sm font-medium text-[hsl(var(--text-1))]">{value}</p>}
      </div>
    </div>
  );
}
