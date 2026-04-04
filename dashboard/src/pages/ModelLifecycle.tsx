import { useState } from "react";
import { Badge } from "../components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowRight, Clock, CheckCircle2, AlertTriangle } from "lucide-react";

const phases = ["Problem Definition","Data Collection","Development","Validation","Deployment","Monitoring","Retirement"] as const;
const phaseColors = ["#6366f1","#8b5cf6","#a78bfa","#f59e0b","#10b981","#06b6d4","#6b7280"];
const models = [
  { name: "CreditScorer v2.1", phase: "Monitoring", entry: "2026-01-15", days: 79, nextGate: "Annual Review", owner: "Dr. Sarah Chen", status: "Active" },
  { name: "GPT-4-Turbo (Acme)", phase: "Deployment", entry: "2026-03-01", days: 34, nextGate: "Production Readiness", owner: "James Park", status: "In Progress" },
  { name: "HiringFilter v1.3", phase: "Validation", entry: "2026-02-20", days: 43, nextGate: "Bias Audit Sign-off", owner: "David Kim", status: "Blocked" },
  { name: "FraudDetector v3.0", phase: "Monitoring", entry: "2025-11-10", days: 145, nextGate: "Quarterly Review", owner: "Michael Torres", status: "Active" },
  { name: "ContentModerator v2.0", phase: "Development", entry: "2026-03-15", days: 20, nextGate: "Code Review", owner: "Amara Okafor", status: "In Progress" },
  { name: "InsuranceRisk v1.5", phase: "Data Collection", entry: "2026-03-25", days: 10, nextGate: "Data Quality Gate", owner: "Lisa Wang", status: "In Progress" },
];
const pieData = phases.map((p, i) => ({ name: p, value: models.filter((m) => m.phase === p).length, color: phaseColors[i] })).filter((d) => d.value > 0);

export default function ModelLifecycle() {
  const [sel, setSel] = useState<string | null>(null);
  const avgDays = Math.round(models.reduce((a, m) => a + m.days, 0) / models.length);
  const pending = models.filter((m) => m.status !== "Active").length;
  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold text-white">Model Lifecycle</h1><p className="text-sm text-gray-400">Track AI models through governance lifecycle phases</p></div>
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#12121a] border border-gray-800 rounded-xl p-4 col-span-1">
          <span className="text-sm text-gray-400">Models by Phase</span>
          <div className="h-32 mt-2"><ResponsiveContainer><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" paddingAngle={3}>{pieData.map((d, i) => <Cell key={i} fill={d.color}/>)}</Pie><Tooltip contentStyle={{background:"#1a1a2e",border:"1px solid #333",borderRadius:8}} labelStyle={{color:"#fff"}} itemStyle={{color:"#ccc"}}/></PieChart></ResponsiveContainer></div>
          <div className="space-y-1 mt-2">{pieData.map((d) => <div key={d.name} className="flex items-center gap-2 text-xs"><div className="w-2 h-2 rounded-full" style={{background:d.color}}/><span className="text-gray-400">{d.name}: {d.value}</span></div>)}</div>
        </div>
        {[["Total Models", models.length, "text-white"], ["Avg Days in Phase", avgDays, "text-blue-400"], ["Pending Transitions", pending, "text-amber-400"]].map(([l, v, c]: any, i) => (
          <div key={i} className="bg-[#12121a] border border-gray-800 rounded-xl p-4"><span className="text-sm text-gray-400">{l}</span><p className={`text-2xl font-bold mt-2 ${c}`}>{v}</p></div>
        ))}
      </div>
      <div className="bg-[#12121a] border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-medium text-gray-300 mb-4">Pipeline View</h3>
        {models.map((m) => {
          const idx = phases.indexOf(m.phase as any);
          return (
            <div key={m.name} className="mb-4 last:mb-0">
              <div className="flex items-center gap-3 mb-2"><span className="text-sm text-white w-48 truncate">{m.name}</span><Badge variant={m.status==="Active"?"default":m.status==="Blocked"?"destructive":"secondary"} className="text-xs">{m.status}</Badge></div>
              <div className="flex gap-1">{phases.map((p, i) => <div key={p} className={`h-2 flex-1 rounded-full ${i <= idx ? "bg-emerald-500" : "bg-gray-700"} ${i === idx ? "ring-2 ring-emerald-400/50" : ""}`} title={p}/>)}</div>
            </div>
          );
        })}
      </div>
      <div className="bg-[#12121a] border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-800 text-gray-400">{["Model","Current Phase","Entry Date","Days","Next Gate","Owner","Status"].map((h) => <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>)}</tr></thead>
          <tbody>{models.map((m) => (
            <tr key={m.name} className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer" onClick={() => setSel(sel === m.name ? null : m.name)}>
              <td className="px-4 py-3 text-white font-medium">{m.name}</td>
              <td className="px-4 py-3"><Badge variant="outline">{m.phase}</Badge></td>
              <td className="px-4 py-3 text-gray-400">{m.entry}</td>
              <td className="px-4 py-3"><span className={m.days > 60 ? "text-amber-400" : "text-gray-300"}>{m.days}d</span></td>
              <td className="px-4 py-3 text-gray-300">{m.nextGate}</td>
              <td className="px-4 py-3 text-gray-400">{m.owner}</td>
              <td className="px-4 py-3"><Badge variant={m.status==="Active"?"default":m.status==="Blocked"?"destructive":"secondary"}>{m.status}</Badge></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
