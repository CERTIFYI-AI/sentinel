import { useState } from "react";
import { GitBranch, ChevronRight, Clock, CheckCircle2, AlertTriangle, XCircle, PlayCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

interface LifecycleModel {
  id: string;
  name: string;
  provider: string;
  stage: "development" | "testing" | "staging" | "production" | "monitoring" | "deprecated" | "retired";
  approvals: { stage: string; approver: string; date: string; status: "approved" | "pending" | "rejected" }[];
  lastTransition: string;
  nextReview: string;
  owner: string;
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

const STAGES = ["development", "testing", "staging", "production", "monitoring", "deprecated", "retired"];

const stageColors: Record<string, string> = {
  development: "bg-blue-500",
  testing: "bg-indigo-500",
  staging: "bg-amber-500",
  production: "bg-green-500",
  monitoring: "bg-emerald-500",
  deprecated: "bg-slate-400",
  retired: "bg-slate-300",
};

const stageIcons: Record<string, typeof GitBranch> = {
  development: GitBranch,
  testing: PlayCircle,
  staging: Clock,
  production: CheckCircle2,
  monitoring: CheckCircle2,
  deprecated: AlertTriangle,
  retired: XCircle,
};

export default function ModelLifecycle() {
  const [selectedModel, setSelectedModel] = useState<string>(LIFECYCLE_MODELS[0].id);
  const model = LIFECYCLE_MODELS.find(m => m.id === selectedModel)!;
  const currentStageIdx = STAGES.indexOf(model.stage);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg"><GitBranch size={20} className="text-blue-600 dark:text-blue-400" /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Model Lifecycle</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Track model progression from development to retirement with approval gates</p>
          </div>
        </div>
      </div>

      {/* Model Selector */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {LIFECYCLE_MODELS.map(m => (
          <button key={m.id} onClick={() => setSelectedModel(m.id)}
            className={`flex-shrink-0 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
              selectedModel === m.id
                ? "bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300"
            }`}>
            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${stageColors[m.stage]}`} />
            {m.name}
            <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-2 capitalize">{m.stage}</span>
          </button>
        ))}
      </div>

      {/* Stage Pipeline */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Lifecycle Pipeline — {model.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 overflow-x-auto py-2">
            {STAGES.map((stage, i) => {
              const Icon = stageIcons[stage];
              const isPast = i < currentStageIdx;
              const isCurrent = i === currentStageIdx;
              const isFuture = i > currentStageIdx;
              return (
                <div key={stage} className="flex items-center">
                  <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isCurrent ? `${stageColors[stage]} text-white shadow-sm` :
                    isPast ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400" :
                    "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                  }`}>
                    <Icon size={14} />
                    <span className="capitalize whitespace-nowrap">{stage}</span>
                  </div>
                  {i < STAGES.length - 1 && (
                    <ChevronRight size={16} className={`mx-1 flex-shrink-0 ${isPast ? "text-green-400" : "text-slate-300 dark:text-slate-600"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Approval History */}
        <div className="lg:col-span-2">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Approval Gate History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {model.approvals.map((a, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        a.status === "approved" ? "bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400" :
                        a.status === "pending" ? "bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400" :
                        "bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400"
                      }`}>
                        {a.status === "approved" ? <CheckCircle2 size={16} /> : a.status === "pending" ? <Clock size={16} /> : <XCircle size={16} />}
                      </div>
                      {i < model.approvals.length - 1 && <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mt-1" />}
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{a.stage}</p>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                          a.status === "approved" ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" :
                          a.status === "pending" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" :
                          "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                        }`}>{a.status}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Approved by <span className="font-medium text-slate-700 dark:text-slate-300">{a.approver}</span> on {a.date}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Model Details */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Model Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Model ID", value: model.id },
              { label: "Provider", value: model.provider },
              { label: "Owner", value: model.owner },
              { label: "Current Stage", value: model.stage.charAt(0).toUpperCase() + model.stage.slice(1) },
              { label: "Last Transition", value: model.lastTransition },
              { label: "Next Review", value: model.nextReview },
            ].map((d, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-xs text-slate-500 dark:text-slate-400">{d.label}</span>
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200">{d.value}</span>
              </div>
            ))}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
              <button className="w-full text-center text-xs text-green-600 dark:text-green-400 hover:underline font-medium">
                View Full Model Card
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
