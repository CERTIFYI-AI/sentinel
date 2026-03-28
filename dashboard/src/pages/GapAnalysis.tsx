
import { useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Search, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const mockGaps = [
  { id: "GAP-001", control: "AI-T-01", requirement: "Model Transparency Documentation", framework: "AI Act", status: "gap", priority: "critical", effort: "High", owner: "eve@company.com", dueDate: "2026-03-01", remediation: "Create model cards for all production AI models" },
  { id: "GAP-002", control: "AI-B-01", requirement: "Bias Testing Protocol", framework: "AI Act", status: "partial", priority: "high", effort: "Medium", owner: "bob@company.com", dueDate: "2026-02-15", remediation: "Implement automated bias testing pipeline" },
  { id: "GAP-003", control: "A.8.1", requirement: "Asset Risk Assessment", framework: "ISO 27001", status: "gap", priority: "high", effort: "High", owner: "carol@company.com", dueDate: "2026-02-01", remediation: "Conduct comprehensive asset risk assessment" },
  { id: "GAP-004", control: "CC-6.3", requirement: "Privileged Access Management", framework: "SOC 2", status: "partial", priority: "medium", effort: "Low", owner: "alice@company.com", dueDate: "2026-01-31", remediation: "Implement PAM solution for privileged accounts" },
  { id: "GAP-005", control: "Art.17", requirement: "Right to Erasure Process", framework: "GDPR", status: "gap", priority: "high", effort: "Medium", owner: "frank@company.com", dueDate: "2026-02-28", remediation: "Implement automated data deletion workflow" },
  { id: "GAP-006", control: "NIST-GV-1.1", requirement: "AI Governance Structure", framework: "NIST AI RMF", status: "partial", priority: "medium", effort: "High", owner: "dave@company.com", dueDate: "2026-03-15", remediation: "Establish AI governance committee" },
];

const gapData = [{name:"SOC 2",gaps:2},{name:"ISO 27001",gaps:5},{name:"GDPR",gaps:3},{name:"AI Act",gaps:7},{name:"NIST",gaps:4}];
const prioColor = (p:string) => p==="critical"?"text-red-400":p==="high"?"text-orange-400":"text-yellow-400";
const statColor = (s:string) => s==="gap"?"bg-red-500/10 text-red-400 border-red-500/30":s==="partial"?"bg-yellow-500/10 text-yellow-400 border-yellow-500/30":"bg-green-500/10 text-green-400 border-green-500/30";

export default function GapAnalysis() {
  const [search, setSearch] = useState("");
  const [fw, setFw] = useState("All");
  const fws = ["All", ...Array.from(new Set(mockGaps.map(g => g.framework)))];
  const filtered = mockGaps.filter(g=>(fw==="All"||g.framework===fw)&&(g.requirement.toLowerCase().includes(search.toLowerCase())));
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Gap Analysis</h1><p className="text-sm text-gray-400">Identify and remediate compliance gaps</p></div>
        <Button className="bg-green-600 hover:bg-green-700 text-white">Run New Assessment</Button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[{label:"Total Gaps",value:mockGaps.length,color:"text-red-400"},{label:"Critical/High",value:mockGaps.filter(g=>g.priority==="critical"||g.priority==="high").length,color:"text-orange-400"},{label:"Partial",value:mockGaps.filter(g=>g.status==="partial").length,color:"text-yellow-400"}].map(s=>(
          <Card key={s.label} className="bg-gray-900 border-gray-800"><CardContent className="p-4"><p className="text-xs text-gray-400">{s.label}</p><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p></CardContent></Card>
        ))}
      </div>
      <Card className="bg-gray-900 border-gray-800"><CardContent className="p-4">
        <h3 className="text-white font-medium mb-3">Gaps by Framework</h3>
        <ResponsiveContainer width="100%" height={200}><BarChart data={gapData}><CartesianGrid strokeDasharray="3 3" stroke="#374151" /><XAxis dataKey="name" tick={{fill:"#9ca3af",fontSize:12}} /><YAxis tick={{fill:"#9ca3af",fontSize:12}} /><Tooltip contentStyle={{backgroundColor:"#1f2937",border:"1px solid #374151",color:"#fff"}} /><Bar dataKey="gaps" fill="#ef4444" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer>
      </CardContent></Card>
      <Card className="bg-gray-900 border-gray-800"><CardContent className="p-4 space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" /><Input placeholder="Search gaps..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-9 bg-gray-800 border-gray-700 text-white" /></div>
          <select value={fw} onChange={e=>setFw(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white">{fws.map(f=><option key={f}>{f}</option>)}</select>
        </div>
        <Table>
          <TableHeader><TableRow className="border-gray-800"><TableHead className="text-gray-400">Control</TableHead><TableHead className="text-gray-400">Requirement</TableHead><TableHead className="text-gray-400">Framework</TableHead><TableHead className="text-gray-400">Priority</TableHead><TableHead className="text-gray-400">Status</TableHead><TableHead className="text-gray-400">Due Date</TableHead><TableHead className="text-gray-400">Owner</TableHead></TableRow></TableHeader>
          <TableBody>{filtered.map(g=>(
            <TableRow key={g.id} className="border-gray-800 hover:bg-gray-800/50">
              <TableCell className="text-green-400 font-mono text-xs">{g.control}</TableCell>
              <TableCell className="text-white font-medium">{g.requirement}</TableCell>
              <TableCell><span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">{g.framework}</span></TableCell>
              <TableCell><span className={`text-xs font-medium ${prioColor(g.priority)}`}>{g.priority}</span></TableCell>
              <TableCell><span className={`text-xs px-2 py-0.5 rounded border ${statColor(g.status)}`}>{g.status}</span></TableCell>
              <TableCell className="text-gray-400 text-xs">{g.dueDate}</TableCell>
              <TableCell className="text-gray-400 text-xs">{g.owner}</TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
