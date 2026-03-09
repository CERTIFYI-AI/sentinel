import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/Badge";

const SCAN_TYPES = [
  { id: "safety", name: "Safety & Alignment", desc: "Harmful content, bias, toxicity, and alignment probes", probes: 120 },
  { id: "injection", name: "Prompt Injection", desc: "Direct/indirect injection, jailbreaks, and DAN attacks", probes: 85 },
  { id: "privacy", name: "Privacy & PII", desc: "PII leakage, membership inference, data extraction", probes: 65 },
  { id: "agentic", name: "Agentic Security", desc: "Tool-use abuse, privilege escalation, chain attacks", probes: 95 },
  { id: "hallucination", name: "Hallucination", desc: "Factual accuracy, confabulation, and grounding tests", probes: 70 },
  { id: "compliance", name: "Compliance", desc: "EU AI Act, NIST AI RMF, and regulatory alignment", probes: 50 },
];

const MODELS = ["GPT-4o", "Claude 3.5 Sonnet", "Llama 3.1 70B", "Mistral Large", "Gemini 1.5 Pro", "Custom API"];

export default function ScanCenter() {
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedScans, setSelectedScans] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const toggleScan = (id: string) => setSelectedScans((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  const totalProbes = SCAN_TYPES.filter((s) => selectedScans.includes(s.id)).reduce((sum, s) => sum + s.probes, 0);

  return (
    <PageWrapper title="Scan Center" subtitle="Configure and launch security scans against AI models">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="font-semibold text-slate-900 text-sm mb-3">Select Target Model</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {MODELS.map((m) => (
                <button key={m} onClick={() => setSelectedModel(m)} className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                  selectedModel === m ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}>{m}</button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="font-semibold text-slate-900 text-sm mb-3">Select Scan Categories</h3>
            <div className="space-y-2">
              {SCAN_TYPES.map((s) => (
                <button key={s.id} onClick={() => toggleScan(s.id)} className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                  selectedScans.includes(s.id) ? "bg-blue-50 border-blue-300" : "bg-white border-slate-200 hover:bg-slate-50"
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{s.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
                    </div>
                    <Badge variant="none" className="text-xs">{s.probes} probes</Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5 sticky top-4">
            <h3 className="font-semibold text-slate-900 text-sm mb-4">Scan Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Target</span><span className="font-medium text-slate-900">{selectedModel || "Not selected"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Categories</span><span className="font-medium text-slate-900">{selectedScans.length} selected</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Total Probes</span><span className="font-medium text-slate-900">{totalProbes}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Est. Duration</span><span className="font-medium text-slate-900">{Math.ceil(totalProbes / 10)} min</span></div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <Button className="w-full" disabled={!selectedModel || selectedScans.length === 0 || running} onClick={() => setRunning(true)}>
                {running ? "Scan Running..." : "Launch Scan"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
