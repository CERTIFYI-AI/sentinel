import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GitBranch, ChevronRight, Clock, CheckCircle2, AlertTriangle, XCircle, PlayCircle, ArrowRight, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Stage = "development" | "testing" | "staging" | "production" | "monitoring" | "deprecated" | "retired";
type GateStatus = "approved" | "pending" | "rejected";

interface Approval { stage: string; approver: string; date: string; status: GateStatus }
interface LifecycleModel {
  id: string; name: string; provider: string; stage: Stage;
  approvals: Approval[]; lastTransition: string; nextReview: string; owner: string;
}

const LIFECYCLE_MODELS: LifecycleModel[] = [
  {
    id: "MDL-001", name: "GPT-4o", provider: "OpenAI", stage: "monitoring", owner: "ML Platform",
    lastTransition: "2025-01-10", nextReview: "2025-02-10",
    approvals: [
      { stage: "Development", approver: "Alice Chen", date: "2024-11-15", status: "approved" },
      { stage: "Testing", approver: "Bob Kim", date: "2024-12-01", status: "approved" },
      { stage: "Staging", approver: "Risk Committee", date: "2024-12-15", status: "approved" },
      { stage: "Production", approver: "CISO", date: "2025-01-05", status: "approved" },
      { stage: "Monitoring", approver: "System", date: "2025-01-10", status: "approved" },
    ],
  },
  {
    id: "MDL-003", name: "Claude 3.5 Sonnet", provider: "Anthropic", stage: "production", owner: "Legal Tech",
    lastTransition: "2025-01-08", nextReview: "2025-02-08",
    approvals: [
      { stage: "Development", approver: "Carol Davis", date: "2024-11-20", status: "approved" },
      { stage: "Testing", approver: "Dave Wilson", date: "2024-12-10", status: "approved" },
      { stage: "Staging", approver: "Ethics Board", date: "2024-12-28", status: "approved" },
      { stage: "Production", approver: "CTO", date: "2025-01-08", status: "approved" },
    ],
  },
  {
    id: "MDL-007", name: "Mistral Large 2", provider: "Mistral AI", stage: "testing", owner: "Innovation Lab",
    lastTransition: "2025-01-12", nextReview: "2025-01-22",
    approvals: [
      { stage: "Development", approver: "Eve Martinez", date: "2025-01-02", status: "approved" },
      { stage: "Testing", approver: "Security Team", date: "2025-01-12", status: "pending" },
    ],
  },
  {
    id: "MDL-008", name: "DALL-E 3", provider: "OpenAI", stage: "deprecated", owner: "Marketing",
    lastTransition: "2025-01-14", nextReview: "2025-03-01",
    approvals: [
      { stage: "Development", approver: "Frank Liu", date: "2024-06-10", status: "approved" },
      { stage: "Testing", approver: "QA Team", date: "2024-07-01", status: "approved" },
      { stage: "Production", approver: "VP Eng", date: "2024-07-15", status: "approved" },
      { stage: "Deprecation", approver: "Risk Committee", date: "2025-01-14", status: "approved" },
    ],
  },
];

const STAGES: Stage[] = ["development", "testing", "staging", "production", "monitoring", "deprecated", "retired"];

// Stage → solid indicator colour (design tokens, no raw Tailwind).
const stageColor: Record<Stage, string> = {
  development: "hsl(var(--s-in-tx))",
  testing:     "hsl(var(--tag-purple))",
  staging:     "hsl(var(--s-wn-tx))",
  production:  "hsl(var(--s-ok-tx))",
  monitoring:  "hsl(var(--s-ok-tx))",
  deprecated:  "hsl(var(--text-4))",
  retired:     "hsl(var(--text-4))",
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

const today = () => new Date().toISOString().slice(0, 10);

export default function ModelLifecycle() {
  const navigate = useNavigate();
  const [models, setModels] = useState<LifecycleModel[]>(LIFECYCLE_MODELS);
  const [selectedId, setSelectedId] = useState<string>(LIFECYCLE_MODELS[0].id);
  const model = models.find(m => m.id === selectedId)!;
  const currentStageIdx = STAGES.indexOf(model.stage);
  const nextStage = STAGES[currentStageIdx + 1];
  const hasPendingGate = model.approvals.some(a => a.status === "pending");

  const update = (fn: (m: LifecycleModel) => LifecycleModel) =>
    setModels(prev => prev.map(m => (m.id === selectedId ? fn(m) : m)));

  const advanceStage = () => {
    if (!nextStage) return;
    update(m => ({
      ...m,
      stage: nextStage,
      lastTransition: today(),
      approvals: [...m.approvals, { stage: nextStage.charAt(0).toUpperCase() + nextStage.slice(1), approver: "Pending assignment", date: today(), status: "pending" }],
    }));
    toast.success(`Transition requested → ${nextStage} (gate pending approval)`);
  };

  const setGate = (idx: number, status: GateStatus) => {
    update(m => ({ ...m, approvals: m.approvals.map((a, i) => (i === idx ? { ...a, status, date: today() } : a)) }));
    toast.success(status === "approved" ? "Gate approved" : "Gate rejected");
  };

  const counts = {
    production: models.filter(m => m.stage === "production" || m.stage === "monitoring").length,
    pending: models.reduce((n, m) => n + m.approvals.filter(a => a.status === "pending").length, 0),
    deprecated: models.filter(m => m.stage === "deprecated" || m.stage === "retired").length,
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Model Lifecycle"
        subtitle={`${models.length} models tracked · ${counts.production} in production · ${counts.pending} gate(s) pending`}
        icon={GitBranch}
        actions={
          <Button
            size="sm"
            leftIcon={<ArrowRight size={14} />}
            disabled={!nextStage || hasPendingGate}
            title={hasPendingGate ? "Resolve the pending gate first" : !nextStage ? "Already at final stage" : `Advance to ${nextStage}`}
            onClick={advanceStage}
          >
            Advance Stage
          </Button>
        }
      />

      {/* Model Selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {models.map(m => {
          const active = selectedId === m.id;
          return (
            <button key={m.id} onClick={() => setSelectedId(m.id)}
              className="flex-shrink-0 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium border transition-colors"
              style={{
                background: active ? "hsl(var(--bg-muted))" : "hsl(var(--bg-surface))",
                borderColor: active ? "hsl(var(--brand))" : "hsl(var(--border))",
                color: active ? "hsl(var(--text-1))" : "hsl(var(--text-2))",
              }}>
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: stageColor[m.stage] }} />
              {m.name}
              <span className="text-[10px] capitalize" style={{ color: "hsl(var(--text-4))" }}>{m.stage}</span>
            </button>
          );
        })}
      </div>

      {/* Stage Pipeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Lifecycle Pipeline — {model.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            {STAGES.map((stage, i) => {
              const Icon = stageIcons[stage];
              const isPast = i < currentStageIdx;
              const isCurrent = i === currentStageIdx;
              return (
                <div key={stage} className="flex items-center">
                  <div className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap"
                    style={
                      isCurrent ? { background: stageColor[stage], color: "hsl(var(--bg-surface))" } :
                      isPast ? { background: "hsl(var(--s-ok-bg))", color: "hsl(var(--s-ok-tx))" } :
                      { background: "hsl(var(--bg-muted))", color: "hsl(var(--text-4))" }
                    }>
                    <Icon size={14} />
                    <span className="capitalize">{stage}</span>
                  </div>
                  {i < STAGES.length - 1 && (
                    <ChevronRight size={15} className="mx-0.5 flex-shrink-0" style={{ color: isPast ? "hsl(var(--s-ok-tx))" : "hsl(var(--border-mid))" }} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Approval History */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Approval Gate History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {model.approvals.map((a, i) => {
                  const g = GATE_STYLE[a.status];
                  const GIcon = g.icon;
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 flex items-center justify-center" style={{ background: g.bg, color: g.tx }}>
                          <GIcon size={15} />
                        </div>
                        {i < model.approvals.length - 1 && <div className="w-px h-7 mt-1" style={{ background: "hsl(var(--border))" }} />}
                      </div>
                      <div className="flex-1 pb-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium" style={{ color: "hsl(var(--text-1))" }}>{a.stage}</p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5" style={{ background: g.bg, color: g.tx }}>{a.status}</span>
                            {a.status === "pending" && (
                              <>
                                <button onClick={() => setGate(i, "approved")} title="Approve gate"
                                  className="inline-flex items-center justify-center w-5 h-5" style={{ color: "hsl(var(--s-ok-tx))", border: "1px solid hsl(var(--s-ok-br))" }}>
                                  <Check size={12} />
                                </button>
                                <button onClick={() => setGate(i, "rejected")} title="Reject gate"
                                  className="inline-flex items-center justify-center w-5 h-5" style={{ color: "hsl(var(--s-er-tx))", border: "1px solid hsl(var(--s-er-br))" }}>
                                  <X size={12} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: "hsl(var(--text-3))" }}>
                          {a.status === "approved" ? "Approved" : a.status === "rejected" ? "Rejected" : "Awaiting"} by <span className="font-medium" style={{ color: "hsl(var(--text-2))" }}>{a.approver}</span> · {a.date}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Model Details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Model Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {[
              { label: "Model ID", value: model.id, mono: true },
              { label: "Provider", value: model.provider },
              { label: "Owner", value: model.owner },
              { label: "Current Stage", value: model.stage.charAt(0).toUpperCase() + model.stage.slice(1) },
              { label: "Last Transition", value: model.lastTransition, mono: true },
              { label: "Next Review", value: model.nextReview, mono: true },
            ].map((d, i) => (
              <div key={i} className="flex justify-between items-center gap-3">
                <span className="text-xs" style={{ color: "hsl(var(--text-4))" }}>{d.label}</span>
                <span className={`text-xs font-medium ${d.mono ? "font-mono" : ""}`} style={{ color: "hsl(var(--text-1))" }}>{d.value}</span>
              </div>
            ))}
            <div className="pt-2.5" style={{ borderTop: "1px solid hsl(var(--border))" }}>
              <Button variant="outline" size="sm" fullWidth onClick={() => navigate(`/models/inventory/${model.id}`)}>
                View Full Model Card
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
