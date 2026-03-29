import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Search, Plus } from "lucide-react";
const sc = (s: string): string => ({ active: "bg-green-500/10 text-green-400", success: "bg-green-500/10 text-green-400", verified: "bg-green-500/10 text-green-400", compliant: "bg-green-500/10 text-green-400", passing: "bg-green-500/10 text-green-400", pass: "bg-green-500/10 text-green-400", production: "bg-green-500/10 text-green-400", resolved: "bg-green-500/10 text-green-400", closed: "bg-green-500/10 text-green-400", enabled: "bg-green-500/10 text-green-400", approved: "bg-green-500/10 text-green-400", low: "bg-green-500/10 text-green-400", warning: "bg-yellow-500/10 text-yellow-400", review: "bg-yellow-500/10 text-yellow-400", pending: "bg-yellow-500/10 text-yellow-400", investigating: "bg-yellow-500/10 text-yellow-400", "in-progress": "bg-yellow-500/10 text-yellow-400", flagged: "bg-yellow-500/10 text-yellow-400", staging: "bg-yellow-500/10 text-yellow-400", draft: "bg-yellow-500/10 text-yellow-400", partial: "bg-yellow-500/10 text-yellow-400", medium: "bg-yellow-500/10 text-yellow-400", open: "bg-red-500/10 text-red-400", failing: "bg-red-500/10 text-red-400", fail: "bg-red-500/10 text-red-400", critical: "bg-red-500/10 text-red-400", high: "bg-red-500/10 text-red-400", inactive: "bg-gray-500/10 text-gray-400", deprecated: "bg-gray-500/10 text-gray-400", retired: "bg-gray-500/10 text-gray-400", disabled: "bg-gray-500/10 text-gray-400", expired: "bg-red-500/10 text-red-400" } as Record<string, string>)[s] || "bg-blue-500/10 text-blue-400";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
const mockData = [
  { id: "BA-001", model: "GPT-4-Turbo", date: "2026-03-15", attrs: "gender,race,age", biasScore: 12, fairness: "Equalized Odds", status: "pass", auditor: "Alice Chen" },
  { id: "BA-002", model: "Resume Screener", date: "2026-03-10", attrs: "gender,race", biasScore: 78, fairness: "Demographic Parity", status: "fail", auditor: "Bob Kumar" },
  { id: "BA-003", model: "Claude-3-Opus", date: "2026-03-08", attrs: "gender,religion", biasScore: 18, fairness: "Equal Opportunity", status: "pass", auditor: "Carol Davis" },
  { id: "BA-004", model: "Loan Predictor", date: "2026-03-05", attrs: "race,income,age", biasScore: 65, fairness: "Calibration", status: "review", auditor: "Dave Wilson" },
  { id: "BA-005", model: "Gemini-Pro", date: "2026-02-28", attrs: "gender", biasScore: 8, fairness: "Individual Fairness", status: "pass", auditor: "Eve Sharma" },
  { id: "BA-006", model: "Content Moderator", date: "2026-02-25", attrs: "religion,ethnicity", biasScore: 45, fairness: "Demographic Parity", status: "review", auditor: "Frank Li" },
  { id: "BA-007", model: "Fraud Detector", date: "2026-02-20", attrs: "race,age", biasScore: 22, fairness: "Equalized Odds", status: "pass", auditor: "Grace Kim" },
  { id: "BA-008", model: "Llama-3-70B", date: "2026-02-15", attrs: "gender,religion", biasScore: 31, fairness: "Equal Opportunity", status: "pass", auditor: "Henry Zhang" },
  { id: "BA-009", model: "Pricing Model v2", date: "2026-02-10", attrs: "race,income", biasScore: 82, fairness: "Calibration", status: "fail", auditor: "Iris Patel" },
  { id: "BA-010", model: "Medical Diagnosis AI", date: "2026-02-05", attrs: "gender,race,age", biasScore: 55, fairness: "Individual Fairness", status: "review", auditor: "Jack Brown" },
];
const chartData = mockData.map(d => ({ model: d.model.split(" ")[0], score: d.biasScore }));
export default function BiasAuditResults() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const filtered = mockData.filter(r => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Bias Audit Results</h1><Button className="bg-green-600 hover:bg-green-700"><Plus className="h-4 w-4 mr-2" />New Audit</Button></div>
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-border/50"><CardContent className="p-4 text-center"><div className="text-2xl font-bold">10</div><div className="text-xs text-muted-foreground">Total Audits</div></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-green-400">5</div><div className="text-xs text-muted-foreground">Pass</div></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-red-400">2</div><div className="text-xs text-muted-foreground">Fail</div></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-yellow-400">3</div><div className="text-xs text-muted-foreground">Review</div></CardContent></Card>
      </div>
      <Card className="border-border/50"><CardHeader><CardTitle className="text-sm">Bias Score by Model</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={200}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#333" /><XAxis dataKey="model" tick={{ fontSize: 10, fill: "#888" }} /><YAxis tick={{ fontSize: 10, fill: "#888" }} domain={[0, 100]} /><Tooltip /><Bar dataKey="score" fill="#f59e0b" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></CardContent></Card>
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search audits..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
      <Card className="border-border/50"><Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Model</TableHead><TableHead>Date</TableHead><TableHead>Attributes Tested</TableHead><TableHead>Bias Score</TableHead><TableHead>Fairness Metric</TableHead><TableHead>Status</TableHead><TableHead>Auditor</TableHead></TableRow></TableHeader>
        <TableBody>{filtered.map(r => (<TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(r)}><TableCell className="font-mono text-sm">{r.id}</TableCell><TableCell className="font-medium">{r.model}</TableCell><TableCell>{r.date}</TableCell><TableCell className="text-xs">{r.attrs}</TableCell><TableCell><Badge className={r.biasScore >= 60 ? "bg-red-500/10 text-red-400" : r.biasScore >= 30 ? "bg-yellow-500/10 text-yellow-400" : "bg-green-500/10 text-green-400"}>{r.biasScore}</Badge></TableCell><TableCell>{r.fairness}</TableCell><TableCell><Badge className={sc(r.status)}>{r.status}</Badge></TableCell><TableCell>{r.auditor}</TableCell></TableRow>))}</TableBody></Table></Card>
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}><DialogContent><DialogHeader><DialogTitle>{selected?.model} - Bias Audit</DialogTitle></DialogHeader>{selected && <div className="space-y-2 text-sm">{Object.entries(selected).map(([k, v]) => <div key={k}><span className="text-muted-foreground">{k}:</span> {String(v)}</div>)}<div className="flex gap-2 pt-2"><Button size="sm" variant="outline">View Report</Button><Button size="sm" variant="destructive">Flag Model</Button></div></div>}</DialogContent></Dialog>
    </div>
  );
}
