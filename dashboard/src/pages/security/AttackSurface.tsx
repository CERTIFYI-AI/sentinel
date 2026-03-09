import PageWrapper from "@/components/layout/PageWrapper";
import Badge from "@/components/ui/Badge";

const ENDPOINTS = [
  { name: "GPT-4o Production API", type: "LLM", exposure: "External", risk: "High", controls: 4, gaps: 2, lastScan: "2025-07-01" },
  { name: "RAG Pipeline (Vector DB)", type: "Retrieval", exposure: "Internal", risk: "Medium", controls: 6, gaps: 1, lastScan: "2025-06-30" },
  { name: "Claude 3.5 Agentic Workflow", type: "Agent", exposure: "External", risk: "Critical", controls: 3, gaps: 4, lastScan: "2025-06-28" },
  { name: "Fine-tuning Data Pipeline", type: "Data", exposure: "Internal", risk: "Medium", controls: 5, gaps: 0, lastScan: "2025-06-25" },
  { name: "Embedding Service", type: "LLM", exposure: "Internal", risk: "Low", controls: 7, gaps: 0, lastScan: "2025-07-02" },
  { name: "Customer-facing Chatbot", type: "Agent", exposure: "External", risk: "High", controls: 5, gaps: 3, lastScan: "2025-06-29" },
];

const RISK_VARIANT: Record<string, string> = { Critical: "critical", High: "degraded", Medium: "regen", Low: "healthy" };

export default function AttackSurface() {
  const totalGaps = ENDPOINTS.reduce((s, e) => s + e.gaps, 0);
  const criticalCount = ENDPOINTS.filter((e) => e.risk === "Critical" || e.risk === "High").length;

  return (
    <PageWrapper title="Attack Surface" subtitle="Map and monitor all AI-exposed endpoints and their security posture">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Endpoints", value: ENDPOINTS.length, color: "text-slate-900" },
          { label: "External Exposure", value: ENDPOINTS.filter((e) => e.exposure === "External").length, color: "text-blue-600" },
          { label: "Open Gaps", value: totalGaps, color: "text-amber-600" },
          { label: "High/Critical Risk", value: criticalCount, color: "text-red-600" },
        ].map((c) => (
          <div key={c.label} className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-xs text-slate-500 mb-1">{c.label}</p>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900 text-sm">AI Endpoints</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 text-left">
              <th className="px-5 py-3 text-xs font-medium text-slate-500">Endpoint</th>
              <th className="px-5 py-3 text-xs font-medium text-slate-500">Type</th>
              <th className="px-5 py-3 text-xs font-medium text-slate-500">Exposure</th>
              <th className="px-5 py-3 text-xs font-medium text-slate-500">Risk</th>
              <th className="px-5 py-3 text-xs font-medium text-slate-500">Controls</th>
              <th className="px-5 py-3 text-xs font-medium text-slate-500">Gaps</th>
              <th className="px-5 py-3 text-xs font-medium text-slate-500">Last Scan</th>
            </tr></thead>
            <tbody>
              {ENDPOINTS.map((e) => (
                <tr key={e.name} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-900">{e.name}</td>
                  <td className="px-5 py-3 text-slate-600">{e.type}</td>
                  <td className="px-5 py-3"><Badge variant={e.exposure === "External" ? "degraded" : "none"} className="text-xs">{e.exposure}</Badge></td>
                  <td className="px-5 py-3"><Badge variant={RISK_VARIANT[e.risk] as any} className="text-xs">{e.risk}</Badge></td>
                  <td className="px-5 py-3 text-slate-600">{e.controls}</td>
                  <td className="px-5 py-3"><span className={e.gaps > 0 ? "text-red-600 font-bold" : "text-green-600"}>{e.gaps}</span></td>
                  <td className="px-5 py-3 text-slate-500">{e.lastScan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageWrapper>
  );
}
