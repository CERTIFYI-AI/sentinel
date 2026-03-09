import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/Badge";

const SCENARIOS = [
  { id: 1, name: "Multi-turn Jailbreak", desc: "Gradually escalate through conversation to bypass safety filters", difficulty: "Hard", category: "Injection", successRate: 23 },
  { id: 2, name: "Tool-use Privilege Escalation", desc: "Exploit agentic tool-calling to access unauthorized resources", difficulty: "Expert", category: "Agentic", successRate: 12 },
  { id: 3, name: "System Prompt Extraction", desc: "Extract hidden system prompts via various probing techniques", difficulty: "Medium", category: "Privacy", successRate: 45 },
  { id: 4, name: "RAG Poisoning", desc: "Inject adversarial content into retrieval pipeline", difficulty: "Hard", category: "Data", successRate: 18 },
  { id: 5, name: "Unicode Obfuscation", desc: "Use Unicode homoglyphs and encoding tricks to bypass filters", difficulty: "Easy", category: "Injection", successRate: 67 },
  { id: 6, name: "Chain-of-Thought Manipulation", desc: "Exploit reasoning chains to produce harmful outputs", difficulty: "Expert", category: "Safety", successRate: 8 },
];

const DIFF_COLORS: Record<string, string> = { Easy: "healthy", Medium: "regen", Hard: "degraded", Expert: "critical" };

export default function RedTeamLab() {
  const [active, setActive] = useState<number | null>(null);

  return (
    <PageWrapper title="Red Team Lab" subtitle="Adversarial testing scenarios for AI model security evaluation">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SCENARIOS.map((s) => (
          <div key={s.id} className={`bg-white border rounded-lg p-5 transition-colors ${
            active === s.id ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-slate-300"
          }`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">{s.name}</h4>
                <p className="text-xs text-slate-500 mt-1">{s.desc}</p>
              </div>
              <Badge variant={DIFF_COLORS[s.difficulty] as any} className="text-xs">{s.difficulty}</Badge>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>Category: {s.category}</span>
                <span>Bypass rate: <span className={s.successRate > 30 ? "text-red-600 font-bold" : "text-green-600 font-bold"}>{s.successRate}%</span></span>
              </div>
              <Button size="sm" variant={active === s.id ? "default" : "outline"} onClick={() => setActive(active === s.id ? null : s.id)}>
                {active === s.id ? "Running..." : "Run Test"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
