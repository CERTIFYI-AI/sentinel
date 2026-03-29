import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { AlertTriangle } from "lucide-react";

const mockRisks = [
  { id: "RSK-001", name: "Model hallucination in production", category: "AI Security", likelihood: 4, impact: 5, status: "open", owner: "Alice Chen" },
  { id: "RSK-002", name: "PII leakage via prompt injection", category: "Data Privacy", likelihood: 3, impact: 5, status: "mitigated", owner: "Bob Kumar" },
  { id: "RSK-003", name: "Biased hiring recommendations", category: "Compliance", likelihood: 3, impact: 4, status: "open", owner: "Carol Davis" },
  { id: "RSK-004", name: "API key exposure in logs", category: "AI Security", likelihood: 2, impact: 4, status: "mitigated", owner: "Dave Wilson" },
  { id: "RSK-005", name: "Model drift detection failure", category: "Operational", likelihood: 3, impact: 3, status: "open", owner: "Eve Sharma" },
  { id: "RSK-006", name: "Vendor lock-in with OpenAI", category: "Operational", likelihood: 4, impact: 3, status: "accepted", owner: "Frank Li" },
  { id: "RSK-007", name: "Data poisoning attack", category: "AI Security", likelihood: 2, impact: 5, status: "open", owner: "Grace Kim" },
  { id: "RSK-008", name: "GDPR non-compliance in training data", category: "Compliance", likelihood: 3, impact: 4, status: "open", owner: "Henry Zhang" },
  { id: "RSK-009", name: "Shadow AI usage by employees", category: "Operational", likelihood: 5, impact: 3, status: "open", owner: "Iris Patel" },
  { id: "RSK-010", name: "Inadequate model documentation", category: "Compliance", likelihood: 4, impact: 2, status: "open", owner: "Jack Brown" },
];

const cellColor = (score: number) => score >= 20 ? "bg-red-500/30" : score >= 12 ? "bg-orange-500/30" : score >= 6 ? "bg-yellow-500/30" : "bg-green-500/30";
const statusColor = (s: string) => s === "open" ? "bg-red-500/10 text-red-400" : s === "mitigated" ? "bg-green-500/10 text-green-400" : "bg-blue-500/10 text-blue-400";

export default function RiskMatrix() {
  const [selected, setSelected] = useState<any>(null);
  const matrix: Record<string, typeof mockRisks> = {};
  mockRisks.forEach(r => { const key = `${r.likelihood}-${r.impact}`; if (!matrix[key]) matrix[key] = []; matrix[key].push(r); });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Risk Matrix</h1>
      <Card className="border-border/50"><CardHeader><CardTitle className="text-sm">5x5 Risk Heat Map (Likelihood x Impact)</CardTitle></CardHeader><CardContent>
        <div className="grid grid-cols-6 gap-1 text-xs">
          <div />{[1,2,3,4,5].map(i => <div key={i} className="text-center font-bold p-1">Impact {i}</div>)}
          {[5,4,3,2,1].map(l => (<>
            <div key={`l${l}`} className="font-bold p-1 flex items-center">L{l}</div>
            {[1,2,3,4,5].map(i => { const risks = matrix[`${l}-${i}`] || []; const score = l * i; return (
              <div key={`${l}-${i}`} className={`${cellColor(score)} rounded p-1 min-h-[40px] flex flex-col items-center justify-center cursor-pointer hover:opacity-80`} onClick={() => risks.length && setSelected(risks[0])}>
                {risks.length > 0 && <div className="font-bold">{risks.length}</div>}
                <div className="text-[9px] opacity-60">{score}</div>
              </div>
            );})}
          </>))}
        </div>
      </CardContent></Card>
      <Card className="border-border/50"><Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Risk</TableHead><TableHead>Category</TableHead><TableHead>L</TableHead><TableHead>I</TableHead><TableHead>Score</TableHead><TableHead>Status</TableHead><TableHead>Owner</TableHead></TableRow></TableHeader>
        <TableBody>{mockRisks.map(r => (
          <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(r)}><TableCell className="font-mono">{r.id}</TableCell><TableCell>{r.name}</TableCell><TableCell>{r.category}</TableCell><TableCell>{r.likelihood}</TableCell><TableCell>{r.impact}</TableCell><TableCell><Badge className={cellColor(r.likelihood*r.impact)}>{r.likelihood*r.impact}</Badge></TableCell><TableCell><Badge className={statusColor(r.status)}>{r.status}</Badge></TableCell><TableCell>{r.owner}</TableCell></TableRow>
        ))}</TableBody></Table></Card>
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}><DialogContent><DialogHeader><DialogTitle>{selected?.name}</DialogTitle></DialogHeader>{selected && <div className="space-y-2 text-sm"><div>ID: {selected.id}</div><div>Score: {selected.likelihood * selected.impact}</div><div>Status: <Badge className={statusColor(selected.status)}>{selected.status}</Badge></div><div>Owner: {selected.owner}</div></div>}</DialogContent></Dialog>
    </div>
  );
}
