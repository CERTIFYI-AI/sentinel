import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";
import PageWrapper from "@/components/layout/PageWrapper";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/Badge";

const RISK_COLORS = [
  { max: 30, bg: "bg-green-100", text: "text-green-800", bar: "#22c55e", label: "Low" },
  { max: 60, bg: "bg-amber-100", text: "text-amber-800", bar: "#f59e0b", label: "Medium" },
  { max: 80, bg: "bg-orange-100", text: "text-orange-800", bar: "#f97316", label: "High" },
  { max: 100, bg: "bg-red-100", text: "text-red-800", bar: "#ef4444", label: "Critical" },
];

function getRiskTier(score: number) {
  return RISK_COLORS.find((r) => score <= r.max) ?? RISK_COLORS[3];
}

const CAMPAIGNS = [
  { name: "GPT-4o Pre-Deploy", target: "GPT-4o", scope: "Comprehensive", probes: 850, riskScore: 42, status: "Complete", date: "2025-06-28" },
  { name: "Claude 3.5 Baseline", target: "Claude 3.5", scope: "Foundation", probes: 260, riskScore: 31, status: "Running", date: "2025-07-01" },
  { name: "Llama 3.1 RAG Audit", target: "Llama 3.1 70B", scope: "Application", probes: 420, riskScore: 67, status: "Complete", date: "2025-06-25" },
  { name: "Mistral Agentic Scan", target: "Mistral Large", scope: "Comprehensive", probes: 510, riskScore: 55, status: "Running", date: "2025-07-02" },
  { name: "Internal API Gateway", target: "Custom API", scope: "Application", probes: 300, riskScore: 78, status: "Complete", date: "2025-06-20" },
];

const POSTURE = [
  { category: "Safety", pass: 91 },
  { category: "Privacy", pass: 78 },
  { category: "Access Control", pass: 65 },
  { category: "Agentic", pass: 54 },
  { category: "Compliance", pass: 83 },
];

export default function SecurityOverview() {
  const navigate = useNavigate();
  const avgRisk = useMemo(() => Math.round(CAMPAIGNS.reduce((s, c) => s + c.riskScore, 0) / CAMPAIGNS.length), []);
  const tier = getRiskTier(avgRisk);

  return (
    <PageWrapper title="Security Intelligence" subtitle="Unified view of AI security posture, active scans, and threat landscape">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Active Scans", value: CAMPAIGNS.filter((c) => c.status === "Running").length, color: "text-blue-600" },
          { label: "Avg Risk Score", value: avgRisk, color: tier.text },
          { label: "Total Probes", value: CAMPAIGNS.reduce((s, c) => s + c.probes, 0).toLocaleString(), color: "text-slate-900" },
          { label: "Completed", value: CAMPAIGNS.filter((c) => c.status === "Complete").length, color: "text-green-600" },
        ].map((card) => (
          <div key={card.label} className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-xs text-slate-500 mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg mb-6">
        <div className="px-5 py-4 border-b border-slate-100"><h3 className="font-semibold text-slate-900 text-sm">Recent Campaigns</h3></div>
        <div className="divide-y divide-slate-100">
          {CAMPAIGNS.map((c) => {
            const cTier = getRiskTier(c.riskScore);
            return (
              <div key={c.name} className="px-5 py-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 truncate">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.target} &middot; {c.scope} &middot; {c.date}</p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${cTier.bg} ${cTier.text}`}>{c.riskScore}</span>
                  <Badge variant={c.status === "Complete" ? "healthy" : "regen"} className="text-xs">{c.status}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900 text-sm">Risk Posture by Category</h3>
          <p className="text-xs text-slate-500 mt-0.5">% of probes passing across all models</p>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={POSTURE} layout="vertical" margin={{ left: 8, right: 8 }}>
              {/* @ts-expect-error Recharts v2 types */}
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
              {/* @ts-expect-error Recharts v2 types */}
              <YAxis dataKey="category" type="category" tick={{ fontSize: 10 }} width={85} />
              <RechartsTooltip formatter={(v: number) => [`${v}%`, "Pass Rate"]} />
              <Bar dataKey="pass" radius={[0, 4, 4, 0]}>
                {POSTURE.map((e) => (<Cell key={e.category} fill={e.pass >= 85 ? "#22c55e" : e.pass >= 70 ? "#f59e0b" : "#ef4444"} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {[
          { title: "Scan a model before deployment", desc: "Run adversarial probes to assess model safety.", action: "Start Scan", route: "/security/scan-center", color: "border-l-blue-500" },
          { title: "Scan a model file for backdoors", desc: "Static analysis of PyTorch, ONNX, or SafeTensors files.", action: "Analyze File", route: "/security/vuln-tracker", color: "border-l-amber-500" },
          { title: "View board-ready risk report", desc: "Aggregate posture, deployment gates, and compliance.", action: "View Report", route: "/security/attack-surface", color: "border-l-green-500" },
        ].map((qa) => (
          <div key={qa.title} className={`border rounded-lg p-5 ${qa.color} border-l-4`}>
            <h4 className="font-semibold text-slate-900 text-sm">{qa.title}</h4>
            <p className="text-xs text-slate-600 mt-1 mb-3">{qa.desc}</p>
            <Button size="sm" onClick={() => navigate(qa.route)}>{qa.action}</Button>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
