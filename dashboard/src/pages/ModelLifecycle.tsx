import { useState } from "react";
import { useSupabaseTable } from "@/hooks/useSupabaseTable";
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
}

const LIFECYCLE_MODELS: LifecycleModel[] = [
  {
    id: "MDL-001", name: "GPT-4o", provider: "OpenAI", stage: "monitoring", owner: "ML Platform",
    lastTransition: "2025-01-10", nextReview: "2025-02-10",
    approvals: [
      { stage: "Development", kind: "promotion", approver: "Alice Chen", date: "2024-11-15", status: "approved", note: "Initial build signed off; scope limited to internal eval." },
      { stage: "Testing", kind: "promotion", approver: "Bob Kim", date: "2024-12-01", status: "approved", note: "Passed functional + red-team test suite (0 criticals)." },
      { stage: "Staging", kind: "promotion", approver: "Risk Committee", date: "2024-12-15", status: "approved", note: "Bias metrics within threshold; DPIA completed." },
      { stage: "Production", kind: "promotion", approver: "CISO", date: "2025-01-05", status: "approved", note: "Go-live approved with human-oversight control active." },
      { stage: "Monitoring", kind: "promotion", approver: "System", date: "2025-01-10", status: "approved", note: "Continuous drift + fairness monitoring enabled." },
    ],
  },
  {
    id: "MDL-003", name: "Claude 3.5 Sonnet", provider: "Anthropic", stage: "production", owner: "Legal Tech",
    lastTransition: "2025-01-08", nextReview: "2025-02-08",
    approvals: [
      { stage: "Development", kind: "promotion", approver: "Carol Davis", date: "2024-11-20", status: "approved", note: "Contract-analysis prototype approved." },
      { stage: "Testing", kind: "promotion", approver: "Dave Wilson", date: "2024-12-10", status: "approved", note: "Accuracy 94.5% on hold-out; hallucination guardrail added." },
      { stage: "Staging", kind: "promotion", approver: "Ethics Board", date: "2024-12-28", status: "approved", note: "Legal review passed; confidentiality controls verified." },
      { stage: "Production", kind: "promotion", approver: "CTO", date: "2025-01-08", status: "approved", note: "Production release approved for Legal dept only." },
    ],
  },
  {
    id: "MDL-007", name: "Mistral Large 2", provider: "Mistral AI", stage: "testing", owner: "Innovation Lab",
    lastTransition: "2025-01-12", nextReview: "2025-01-22",
    approvals: [
      { stage: "Development", kind: "promotion", approver: "Eve Martinez", date: "2025-01-02", status: "approved", note: "Code-gen PoC approved for sandbox." },
      { stage: "Testing", kind: "promotion", approver: "Security Team", requestedBy: "Eve Martinez", date: "2025-01-12", status: "pending", note: "Awaiting prompt-injection test results before staging." },
    ],
  },
  {
    id: "MDL-008", name: "DALL-E 3", provider: "OpenAI", stage: "deprecated", owner: "Marketing",
    lastTransition: "2025-01-14", nextReview: "2025-03-01",
    approvals: [
      { stage: "Development", kind: "promotion", approver: "Frank Liu", date: "2024-06-10", status: "approved", note: "Marketing asset generation PoC." },
      { stage: "Testing", kind: "promotion", approver: "QA Team", date: "2024-07-01", status: "approved", note: "Passed content-safety review." },
      { stage: "Production", kind: "promotion", approver: "VP Eng", date: "2024-07-15", status: "approved", note: "Live for marketing use." },
      { stage: "Deprecated", kind: "decommission", approver: "Risk Committee", date: "2025-01-14", status: "approved", note: "Superseded by internal model; usage frozen, 90-day retention before retirement." },
    ],
  },
];

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

export default function ModelLifecycle() {
  const navigate = useNavigate();
  const { data: models, setData: setModels } = useSupabaseTable<LifecycleModel>('modellifecycle_table', LIFECYCLE_MODELS);
  const [selectedId, setSelectedId] = useState<string>(LIFECYCLE_MODELS[0].id);
  const [transitionOpen, setTransitionOpen] = useState(false);

  const model = models.find(m => m.id === selectedId)!;
  const currentStageIdx = STAGES.indexOf(model.stage);
  const hasPendingGate = model.approvals.some(a => a.status === "pending");

  const update = (fn: (m: LifecycleModel) => LifecycleModel) =>
    setModels(prev => prev.map(m => (m.id === selectedId ? fn(m) : m)));

  const submitTransition = (target: Stage, kind: GateKind, approver: string, effective: string, note: string) => {
    update(m => ({
      ...m,
      stage: target,
      lastTransition: effective,
      approvals: [...m.approvals, { stage: cap(target), kind, approver, requestedBy: "You", date: effective, status: "pending", note }],
    }));
    toast.success(`Transition to ${target} requested — gate pending ${approver}'s approval`);
    setTransitionOpen(false);
  };

  const setGate = (idx: number, status: GateStatus) => {
    const decision = status === "approved" ? window.prompt("Approval remarks (recorded on the audit trail):", "Approved — criteria met.") : window.prompt("Rejection reason (required):", "");
    if (status === "rejected" && !decision) { toast.error("A rejection reason is required."); return; }
    update(m => ({ ...m, approvals: m.approvals.map((a, i) => (i === idx ? { ...a, status, date: today(), note: decision ? `${a.note ? a.note + " — " : ""}${status === "approved" ? "APPROVED" : "REJECTED"}: ${decision}` : a.note } : a)) }));
    toast.success(status === "approved" ? "Gate approved (logged)" : "Gate rejected (logged)");
  };

  const counts = {
    production: models.filter(m => m.stage === "production" || m.stage === "monitoring").length,
    pending: models.reduce((n, m) => n + m.approvals.filter(a => a.status === "pending").length, 0),
    review: models.filter(m => m.stage === "deprecated" || m.stage === "retired").length,
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Model Lifecycle"
        subtitle={`${models.length} models tracked · ${counts.production} in production · ${counts.pending} gate(s) pending approval`}
        icon={GitBranch}
        actions={
          <Button size="sm" leftIcon={<ArrowRight size={14} />} disabled={hasPendingGate}
            title={hasPendingGate ? "Resolve the pending gate before requesting another transition" : "Request a stage transition"}
            onClick={() => setTransitionOpen(true)}>
            Request Transition
          </Button>
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
              <Button variant="outline" size="sm" fullWidth onClick={() => navigate(`/models/inventory/${model.id}`)}>View Full Model Card</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <TransitionDialog open={transitionOpen} onOpenChange={setTransitionOpen} model={model} currentIdx={currentStageIdx} onSubmit={submitTransition} />
    </div>
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
