import { useState } from "react";
import { complianceGaps } from "../data/complianceGapData";
import { Badge } from "../components/ui/badge";
import { Search } from "lucide-react";

export default function GapAnalysis() {
  const [search, setSearch] = useState("");
  const [fw, setFw] = useState("All");
  const frameworks = ["All", ...Array.from(new Set(complianceGaps.map((g) => g.framework)))];
  const filtered = complianceGaps.filter((g) =>
    (fw === "All" || g.framework === fw) &&
    (g.title.toLowerCase().includes(search.toLowerCase()) || g.controlRef.toLowerCase().includes(search.toLowerCase()))
  );
  const critical = filtered.filter((g) => g.severity === "Critical").length;
  const high = filtered.filter((g) => g.severity === "High").length;
  const sev = (s: string) => (s === "Critical" ? "destructive" : s === "High" ? "default" : "secondary");
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gap Analysis</h1>
          <p className="text-sm text-gray-500">Identify and track compliance gaps across frameworks</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="destructive">{critical} Critical</Badge>
          <Badge variant="secondary">{high} High</Badge>
          <Badge variant="outline">{filtered.length} Total</Badge>
        </div>
      </div>
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" placeholder="Search gaps..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="border rounded-lg px-3 py-2 text-sm bg-white" value={fw} onChange={(e) => setFw(e.target.value)}>
          {frameworks.map((f) => (<option key={f} value={f}>{f}</option>))}
        </select>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Gap</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Framework</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Control Ref</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Severity</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Progress</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Due Date</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Owner</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((g) => (
              <tr key={g.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium max-w-xs truncate">{g.title}</td>
                <td className="px-4 py-3 text-gray-500">{g.framework}</td>
                <td className="px-4 py-3"><code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{g.controlRef}</code></td>
                <td className="px-4 py-3"><Badge variant={sev(g.severity) as any}>{g.severity}</Badge></td>
                <td className="px-4 py-3 w-36">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: g.progress + "%" }} />
                    </div>
                    <span className="text-xs text-gray-500 w-8">{g.progress}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{g.dueDate}</td>
                <td className="px-4 py-3 text-gray-500">{g.owner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
