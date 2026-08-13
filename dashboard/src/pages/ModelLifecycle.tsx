import { useState } from "react";
import { useLifecycleData } from "@/hooks/useLifecycleData";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useNavigate } from "react-router-dom";
import { GitBranch, ChevronRight, Clock, CheckCircle2, AlertTriangle, XCircle, PlayCircle, ArrowRight, Check, X, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { toast } from "sonner";

type Stage = "development" | "testing" | "staging" | "production" | "monitoring" | "deprecated" | "retired";
type GateStatus = "approved" | "pending" | "rejected";
type GateKind = "promotion" | "rollback" | "decommission";

interface Gate {
  stage: string;         // stage being entered
  kind: GateKind;
  approver: string;      // accountable reviewer / body
  requestedBy?: string;
  date: string;          // effective / decision date
  status: GateStatus;
  note?: string;         // mandatory justification / decision remarks
}
interface LifecycleModel {
  id: string; name: string; provider: string; stage: Stage;
  approvals: Gate[]; lastTransition: string; nextReview: string; owner: string;
  _rowId?: string;
}

const STAGES: Stage[] = ["development", "testing", "staging", "production", "monitoring", "deprecated", "retired"];

// Senior-GRC reference: what each lifecycle stage means + the gate to enter it.
const STAGE_GUIDE: Record<Stage, string> = {
  development: "Model is being built/trained. No production data. Owner sign-off to proceed.",
  testing: "Functional, bias, robustness & red-team testing. Requires test evidence to advance.",
  staging: "Pre-production validation on prod-like data. Requires DPIA + bias within threshold.",
  production: "Live serving. Requires executive (CISO/CRO) go-live approval + human-oversight control.",
  monitoring: "In production with continuous drift/fairness monitoring and periodic revalidation.",
  deprecated: "Usage frozen pending retirement. Requires risk-committee decommission decision.",
  retired: "Fully decommissioned. Endpoints removed; evidence retained per policy.",
};

const stageColor: Record<Stage, string> = {
  development: "hsl(var(--s-in-tx))", testing: "hsl(var(--tag-purple))", staging: "hsl(var(--s-wn-tx))",
  production: "hsl(var(--s-ok-tx))", monitoring: "hsl(var(--s-ok-tx))", deprecated: "hsl(var(--text-4))", retired: "hsl(var(--text-4))",
};
const stageIcons: Record<Stage, typeof GitBranch> = {
  development: GitBranch, testing: PlayCircle, staging: Clock,
  production: CheckCircle2, monitoring: CheckCircle2, deprecated: AlertTriangle, retired: XCircle,
};
const GATE_STYLE: Record<GateStatus, { bg: string; tx: string; icon: typeof CheckCircle2 }> = {
  approved: { bg: "hsl(var(--s-ok-bg))", tx: "hsl(var(--s-ok-tx))", icon: CheckCircle2 },
  pending:  { bg: "hsl(var(--s-wn-bg))", tx: "hsl(var(--s-wn-tx))", icon: Clock },
  rejected: { bg: "hsl(var(--s-er-bg))", tx: "hsl(var(--s-er-tx))", icon: XCircle },
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const today = () => new Date().toISOString().slice(0, 10);
// A lifecycle model.id now carries the canonical ai_models.id (uuid) for demo
// rows, so it can deep-link into the registry detail route. Legacy rows still
// hold a business code (e.g. MDL-001) and fall back to the registry list.
const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export default function ModelLifecycle() {
  const navigate = useNavigate();
  const { models: rawModels, isLoading, saveModel: saveLifecycle, deleteModel: deleteLifecycle } = useLifecycleData();
  const models = rawModels as LifecycleModel[];
  const [selectedIdState, setSelectedId] = useState<string>("");
  const [transitionOpen, setTransitionOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const persist = (updated: LifecycleModel) => {
    saveLifecycle(updated).catch(() => toast.error("Failed to save lifecycle change"));
  };

  const addModel = (id: string, name: string, provider: string, owner: string) => {
    const rec: LifecycleModel = {
      id, name, provider, owner, stage: "development", lastTransition: today(), nextReview: "",
      approvals: [{ stage: "Development", kind: "promotion", approver: owner || "Owner", requestedBy: "You", date: today(), status: "pending", note: "Onboarded to lifecycle tracking." }],
    };
    saveLifecycle(rec).then(() => { toast.success(`${name} added to lifecycle`); setSelectedId(id); })
      .catch(() => toast.error("Failed to add model"));
    setAddOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Model Lifecycle" subtitle="Loading lifecycle tracking…" icon={GitBranch} />
        <Card><CardContent className="py-16 text-center" style={{ color: "hsl(var(--text-4))" }}>
          <GitBranch className="mx-auto mb-2 opacity-40 animate-pulse" />
          <p className="text-sm">Loading lifecycle…</p>
        </CardContent></Card>
      </div>
    );
  }

  const selectedId = models.some(m => m.id === selectedIdState) ? selectedIdState : (models[0]?.id ?? "");
  const model = models.find(m => m.id === selectedId) ?? null;

  if (!model) {
    return (
      <div className="space-y-4">
        <PageHeader title="Model Lifecycle" subtitle="No models tracked yet" icon={GitBranch}
          actions={<Button onClick={() => setAddOpen(true)}>Track a model</Button>} />
        <Card><CardContent className="py-16 text-center" style={{ color: "hsl(var(--text-4))" }}>
          <GitBranch className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No models are being tracked through the lifecycle yet.</p>
          <Button className="mt-3" onClick={() => setAddOpen(true)}>Track a model</Button>
        </CardContent></Card>
        <AddModelDialog open={addOpen} onOpenChange={setAddOpen} onAdd={addModel} />
      </div>
    );
  }

  const currentStageIdx = STAGES.indexOf(model.stage);
  const hasPendingGate = model.approvals.some(a => a.status === "pending");

  const update = (fn: (m: LifecycleModel) => LifecycleModel) => { persist(fn(model)); };

  const submitTransition = (target: Stage, kind: GateKind, approver: string, effective: string, note: string) => {
    // A requested transition does NOT move the model — it only opens a pending
    // gate. The stage advances only once that gate is approved (see setGate).
    update(m => ({
      ...m,
      approvals: [...m.approvals, { stage: cap(target), kind, approver, requestedBy: "You", date: effective, status: "pending", note }],
    }));
    toast.success(`Transition to ${target} requested — gate pending ${approver}'s approval`);
    setTransitionOpen(false);
  };

  const setGate = (idx: number, status: GateStatus) => {
    const decision = status === "approved" ? window.prompt("Approval remarks (recorded on the audit trail):", "Approved — criteria met.") : window.prompt("Rejection reason (required):", "");
    if (status === "rejected" && !decision) { toast.error("A rejection reason is required."); return; }
    // On approval, advance the model into the gate's target stage; on rejection
    // the stage is left unchanged (nothing to roll back, since request no longer moves it).
    const gate = model.approvals[idx];
    const targetStage = (gate?.stage ?? "").toLowerCase() as Stage;
    const advance = status === "approved" && STAGES.includes(targetStage);
    update(m => ({
      ...m,
      ...(advance ? { stage: targetStage, lastTransition: gate?.date || today() } : {}),
      approvals: m.approvals.map((a, i) => (i === idx ? { ...a, status, date: today(), note: decision ? `${a.note ? a.note + " — " : ""}${status === "approved" ? "APPROVED" : "REJECTED"}: ${decision}` : a.note } : a)),
    }));
    toast.success(status === "approved" ? (advance ? `Gate approved — ${model.name} advanced to ${cap(targetStage)}` : "Gate approved (logged)") : "Gate rejected (logged)");
  };

  const removeModel = () => {
    setDeleteOpen(false);
    if (!model._rowId) return;
    deleteLifecycle(model._rowId).then(() => toast.success(`${model.name} removed from lifecycle`))
      .catch(() => toast.error("Failed to remove model"));
  };

  const counts = {
    production: models.filter(m => m.stage === "production" || m.stage === "monitoring").length,
    pending: models.reduce((n, m) => n + m.approvals.filter(a => a.status === "pending").length, 0),
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Model Lifecycle"
        subtitle={`${models.length} models tracked · ${counts.production} in production · ${counts.pending} gate(s) pending approval`}
        icon={GitBranch}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>Track a model</Button>
            <Button size="sm" variant="outline" onClick={() => setDeleteOpen(true)}
              title="Remove this model from lifecycle tracking">Remove</Button>
            <Button size="sm" leftIcon={<ArrowRight size={14} />} disabled={hasPendingGate}
              title={hasPendingGate ? "Resolve the pending gate before requesting another transition" : "Request a stage transition"}
              onClick={() => setTransitionOpen(true)}>
              Request Transition
            </Button>
          </div>
        }
      />

      {/* Model selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {models.map(m => {
          const active = selectedId === m.id;
          return (
            <button key={m.id} onClick={() => setSelectedId(m.id)}
              className="flex-shrink-0 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium border transition-colors"
              style={{ background: active ? "hsl(var(--bg-muted))" : "hsl(var(--bg-surface))", borderColor: active ? "hsl(var(--brand))" : "hsl(var(--border))", color: active ? "hsl(var(--text-1))" : "hsl(var(--text-2))" }}>
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: stageColor[m.stage] }} />
              {m.name}
              <span className="text-[10px] capitalize" style={{ color: "hsl(var(--text-4))" }}>{m.stage}</span>
            </button>
          );
        })}
      </div>

      {/* Stage pipeline */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Lifecycle Pipeline — {model.name}</CardTitle>
          <span className="text-[11px]" style={{ color: "hsl(var(--text-4))" }}>Current: <span className="font-semibold capitalize" style={{ color: stageColor[model.stage] }}>{model.stage}</span> · next review {model.nextReview}</span>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            {STAGES.map((stage, i) => {
              const Icon = stageIcons[stage];
              const isPast = i < currentStageIdx;
              const isCurrent = i === currentStageIdx;
              return (
                <div key={stage} className="flex items-center">
                  <div className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap" title={STAGE_GUIDE[stage]}
                    style={isCurrent ? { background: stageColor[stage], color: "hsl(var(--bg-surface))" } : isPast ? { background: "hsl(var(--s-ok-bg))", color: "hsl(var(--s-ok-tx))" } : { background: "hsl(var(--bg-muted))", color: "hsl(var(--text-4))" }}>
                    <Icon size={14} />
                    <span className="capitalize">{stage}</span>
                  </div>
                  {i < STAGES.length - 1 && <ChevronRight size={15} className="mx-0.5 flex-shrink-0" style={{ color: isPast ? "hsl(var(--s-ok-tx))" : "hsl(var(--border-mid))" }} />}
                </div>
              );
            })}
          </div>
          {/* Stage guide for the current stage */}
          <div className="mt-2 flex items-start gap-1.5 text-[11px] px-2 py-1.5" style={{ background: "hsl(var(--bg-muted))", color: "hsl(var(--text-3))" }}>
            <Info size={13} className="flex-shrink-0 mt-px" />
            <span><span className="font-semibold capitalize" style={{ color: "hsl(var(--text-2))" }}>{model.stage}:</span> {STAGE_GUIDE[model.stage]}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Approval gate history — with remarks */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Approval Gate History &amp; Transition Log</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {model.approvals.map((a, i) => {
                  const g = GATE_STYLE[a.status];
                  const GIcon = g.icon;
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 flex items-center justify-center" style={{ background: g.bg, color: g.tx }}><GIcon size={15} /></div>
                        {i < model.approvals.length - 1 && <div className="w-px h-full min-h-[16px] mt-1" style={{ background: "hsl(var(--border))" }} />}
                      </div>
                      <div className="flex-1 pb-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium" style={{ color: "hsl(var(--text-1))" }}>
                            {a.stage}
                            <span className="ml-2 text-[9px] font-semibold uppercase tracking-wide px-1 py-0.5" style={{ background: "hsl(var(--bg-muted))", color: "hsl(var(--text-4))" }}>{a.kind}</span>
                          </p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5" style={{ background: g.bg, color: g.tx }}>{a.status}</span>
                            {a.status === "pending" && (
                              <>
                                <button onClick={() => setGate(i, "approved")} title="Approve gate" className="inline-flex items-center justify-center w-5 h-5" style={{ color: "hsl(var(--s-ok-tx))", border: "1px solid hsl(var(--s-ok-br))" }}><Check size={12} /></button>
                                <button onClick={() => setGate(i, "rejected")} title="Reject gate" className="inline-flex items-center justify-center w-5 h-5" style={{ color: "hsl(var(--s-er-tx))", border: "1px solid hsl(var(--s-er-br))" }}><X size={12} /></button>
                              </>
                            )}
                          </div>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: "hsl(var(--text-3))" }}>
                          {a.status === "approved" ? "Approved" : a.status === "rejected" ? "Rejected" : "Awaiting"} by <span className="font-medium" style={{ color: "hsl(var(--text-2))" }}>{a.approver}</span>
                          {a.requestedBy ? <> · requested by {a.requestedBy}</> : null} · {a.date}
                        </p>
                        {a.note && (
                          <p className="text-[11px] mt-1 px-2 py-1" style={{ background: "hsl(var(--bg-sunken))", borderLeft: "2px solid hsl(var(--border-mid))", color: "hsl(var(--text-3))" }}>“{a.note}”</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Model details */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Model Details</CardTitle></CardHeader>
          <CardContent className="space-y-2.5">
            {[
              { label: "Model ID", value: model.id, mono: true },
              { label: "Provider", value: model.provider },
              { label: "Owner", value: model.owner },
              { label: "Current Stage", value: cap(model.stage) },
              { label: "Last Transition", value: model.lastTransition, mono: true },
              { label: "Next Review", value: model.nextReview, mono: true },
              { label: "Gates Approved", value: `${model.approvals.filter(a => a.status === "approved").length}/${model.approvals.length}`, mono: true },
            ].map((d, i) => (
              <div key={i} className="flex justify-between items-center gap-3">
                <span className="text-xs" style={{ color: "hsl(var(--text-4))" }}>{d.label}</span>
                <span className={`text-xs font-medium ${d.mono ? "font-mono" : ""}`} style={{ color: "hsl(var(--text-1))" }}>{d.value}</span>
              </div>
            ))}
            <div className="pt-2.5" style={{ borderTop: "1px solid hsl(var(--border))" }}>
              {/* When model.id is the canonical ai_models uuid, deep-link straight
                  to the model's registry record; otherwise fall back to the list. */}
              <Button
                variant="outline"
                size="sm"
                fullWidth
                leftIcon={<ArrowRight size={14} />}
                title={isUuid(model.id) ? `Open ${model.name} in the model registry` : "Open the model registry (no linked record for this model)"}
                onClick={() => navigate(isUuid(model.id) ? '/models/inventory/' + model.id : '/models/inventory')}
              >
                {isUuid(model.id) ? "Open in Model Registry" : "Open Model Registry"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <TransitionDialog open={transitionOpen} onOpenChange={setTransitionOpen} model={model} currentIdx={currentStageIdx} onSubmit={submitTransition} />
      <AddModelDialog open={addOpen} onOpenChange={setAddOpen} onAdd={addModel} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Remove from lifecycle tracking?"
        description={`“${model.name}” and its gate/transition history will be removed from lifecycle tracking. This does not delete the model from the registry.`}
        confirmLabel="Remove"
        isDestructive
        onConfirm={removeModel}
      />
    </div>
  );
}

// ── Add-to-lifecycle dialog ───────────────────────────────────────────────────
function AddModelDialog({ open, onOpenChange, onAdd }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  onAdd: (id: string, name: string, provider: string, owner: string) => void;
}) {
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [provider, setProvider] = useState("");
  const [owner, setOwner] = useState("");
  const canSubmit = Boolean(name.trim() && id.trim());
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ borderRadius: 0 }}>
        <DialogHeader><DialogTitle>Track a model in the lifecycle</DialogTitle></DialogHeader>
        <div className="space-y-3 py-1">
          <div>
            <label className="text-xs font-semibold" style={{ color: "hsl(var(--text-4))" }}>Model ID</label>
            <Input value={id} onChange={e => setId(e.target.value)} placeholder="MDL-010" className="mt-1" style={{ borderRadius: 0 }} />
          </div>
          <div>
            <label className="text-xs font-semibold" style={{ color: "hsl(var(--text-4))" }}>Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Model name" className="mt-1" style={{ borderRadius: 0 }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold" style={{ color: "hsl(var(--text-4))" }}>Provider</label>
              <Input value={provider} onChange={e => setProvider(e.target.value)} placeholder="OpenAI / Internal" className="mt-1" style={{ borderRadius: 0 }} />
            </div>
            <div>
              <label className="text-xs font-semibold" style={{ color: "hsl(var(--text-4))" }}>Owner</label>
              <Input value={owner} onChange={e => setOwner(e.target.value)} placeholder="Team / owner" className="mt-1" style={{ borderRadius: 0 }} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!canSubmit} onClick={() => onAdd(id.trim(), name.trim(), provider.trim(), owner.trim())}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Transition request dialog (mandatory justification) ───────────────────────
function TransitionDialog({ open, onOpenChange, model, currentIdx, onSubmit }: {
  open: boolean; onOpenChange: (o: boolean) => void; model: LifecycleModel; currentIdx: number;
  onSubmit: (target: Stage, kind: GateKind, approver: string, effective: string, note: string) => void;
}) {
  const [target, setTarget] = useState<Stage>(STAGES[Math.min(currentIdx + 1, STAGES.length - 1)]);
  const [approver, setApprover] = useState("");
  const [effective, setEffective] = useState(today());
  const [note, setNote] = useState("");

  const targetIdx = STAGES.indexOf(target);
  const kind: GateKind = target === "deprecated" || target === "retired" ? "decommission" : targetIdx < currentIdx ? "rollback" : "promotion";
  const isBackward = targetIdx < currentIdx;
  const canSubmit = approver.trim().length > 0 && note.trim().length >= 10;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ borderRadius: 0, maxWidth: 460 }}>
        <DialogHeader><DialogTitle style={{ color: "hsl(var(--text-1))" }}>Request Stage Transition — {model.name}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-1">
          <div className="text-[11px] px-2 py-1.5" style={{ background: "hsl(var(--bg-muted))", color: "hsl(var(--text-3))" }}>
            Current stage: <span className="font-semibold capitalize" style={{ color: "hsl(var(--text-1))" }}>{model.stage}</span>. Every transition creates an auditable approval gate.
          </div>
          <div>
            <label className="text-xs font-semibold" style={{ color: "hsl(var(--text-4))" }}>Target stage *</label>
            <Select value={target} onValueChange={v => setTarget(v as Stage)}>
              <SelectTrigger className="mt-1 w-full" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {STAGES.map(s => <SelectItem key={s} value={s}>{cap(s)}{s === STAGES[currentIdx + 1] ? " (next)" : ""}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-[11px] mt-1" style={{ color: "hsl(var(--text-4))" }}>{STAGE_GUIDE[target]}</p>
          </div>
          {isBackward && (
            <div className="flex items-center gap-1.5 text-[11px] px-2 py-1.5" style={{ background: "hsl(var(--s-wn-bg))", color: "hsl(var(--s-wn-tx))" }}>
              <AlertTriangle size={13} /> Backward transition ({kind}) — a documented reason is mandatory.
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold" style={{ color: "hsl(var(--text-4))" }}>Approver / body *</label>
              <Input value={approver} onChange={e => setApprover(e.target.value)} placeholder="e.g. Risk Committee, CISO" className="mt-1" style={{ borderRadius: 0 }} />
            </div>
            <div>
              <label className="text-xs font-semibold" style={{ color: "hsl(var(--text-4))" }}>Effective date *</label>
              <Input type="date" value={effective} onChange={e => setEffective(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold" style={{ color: "hsl(var(--text-4))" }}>Justification / remarks * (min 10 chars)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Why is this transition warranted? Reference test evidence, DPIA, sign-offs, or risk decisions."
              className="mt-1 w-full text-xs p-2 resize-none" style={{ borderRadius: 0, background: "hsl(var(--bg-surface))", border: "1px solid hsl(var(--border))", color: "hsl(var(--text-1))" }} />
            <p className="text-[11px] mt-0.5" style={{ color: note.trim().length >= 10 ? "hsl(var(--s-ok-tx))" : "hsl(var(--text-4))" }}>{note.trim().length}/10 min · recorded on the audit trail</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" disabled={!canSubmit} onClick={() => onSubmit(target, kind, approver.trim(), effective, note.trim())}>Submit for approval</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
