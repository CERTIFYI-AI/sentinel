
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Shield, Activity, Ban, Flag, CheckCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const hourlyData = Array.from({length: 24}, (_, i) => ({ hour: `${i}:00`, requests: Math.floor(Math.random() * 3000) + 1000, blocked: Math.floor(Math.random() * 50) + 5 }));
const recentEvents = [
  { time: "14:32:05", model: "GPT-4-Turbo", action: "generate", policy: "PII Detection", outcome: "blocked" },
  { time: "14:31:52", model: "Claude-3-Opus", action: "chat", policy: "Toxicity Filter", outcome: "passed" },
  { time: "14:31:48", model: "GPT-4-Turbo", action: "generate", policy: "Jailbreak Detection", outcome: "flagged" },
  { time: "14:31:30", model: "Gemini-Pro", action: "analyze", policy: "Rate Limit", outcome: "passed" },
  { time: "14:31:15", model: "Claude-3-Haiku", action: "chat", policy: "Content Safety", outcome: "passed" },
  { time: "14:30:58", model: "GPT-4-Turbo", action: "generate", policy: "PII Detection", outcome: "flagged" },
  { time: "14:30:42", model: "GPT-4-Vision", action: "analyze", policy: "Image Safety", outcome: "passed" },
  { time: "14:30:21", model: "Claude-3-Opus", action: "generate", policy: "Hallucination Check", outcome: "blocked" },
  { time: "14:30:05", model: "Mistral-Large", action: "chat", policy: "Token Limit", outcome: "passed" },
  { time: "14:29:48", model: "GPT-4-Turbo", action: "generate", policy: "Cost Guard", outcome: "passed" },
];
const outcomeColor = (o: string) => o === "passed" ? "text-green-400" : o === "blocked" ? "text-red-400" : "text-yellow-400";

export default function TrustEngineDashboard() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Trust Engine</h1><p className="text-muted-foreground">Real-time AI request monitoring and policy enforcement</p></div>
        <div className="flex items-center gap-2"><span className="flex items-center gap-1 text-green-400 text-sm"><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />LIVE</span></div></div>
      <div className="grid grid-cols-2 gap-4">
        <Card className="col-span-2 md:col-span-1"><CardContent className="pt-6 flex items-center gap-4"><div className="w-24 h-24 rounded-full border-4 border-green-500 flex items-center justify-center"><span className="text-3xl font-bold">78</span></div><div><div className="text-sm text-muted-foreground">Trust Score</div><div className="text-lg font-semibold text-green-400">Healthy</div><p className="text-xs text-muted-foreground">Based on last 24h of activity</p></div></CardContent></Card>
        <div className="grid grid-cols-2 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-2"><Activity className="w-5 h-5 text-blue-400" /><div><div className="text-sm text-muted-foreground">Requests Today</div><div className="text-2xl font-bold">45,231</div></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-2"><Ban className="w-5 h-5 text-red-400" /><div><div className="text-sm text-muted-foreground">Blocked</div><div className="text-2xl font-bold text-red-400">342</div></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-2"><Flag className="w-5 h-5 text-yellow-400" /><div><div className="text-sm text-muted-foreground">Flagged</div><div className="text-2xl font-bold text-yellow-400">89</div></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-400" /><div><div className="text-sm text-muted-foreground">Pass Rate</div><div className="text-2xl font-bold text-green-400">99.2%</div></div></div></CardContent></Card>
        </div>
      </div>
      <Card><CardHeader><CardTitle>Request Volume & Blocks (24h)</CardTitle></CardHeader><CardContent>
        <ResponsiveContainer width="100%" height={250}><LineChart data={hourlyData}><CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="hour" stroke="#888" fontSize={12} /><YAxis stroke="#888" fontSize={12} /><Tooltip contentStyle={{backgroundColor:"#1a1a2e",border:"1px solid #333"}} />
          <Line type="monotone" dataKey="requests" stroke="#16a34a" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="blocked" stroke="#ef4444" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Recent Policy Enforcement</CardTitle></CardHeader><CardContent>
        <Table><TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Model</TableHead><TableHead>Action</TableHead><TableHead>Policy</TableHead><TableHead>Outcome</TableHead></TableRow></TableHeader>
          <TableBody>{recentEvents.map((e, i) => (<TableRow key={i}><TableCell className="font-mono text-sm">{e.time}</TableCell><TableCell>{e.model}</TableCell><TableCell>{e.action}</TableCell><TableCell>{e.policy}</TableCell>
            <TableCell><span className={`font-medium ${outcomeColor(e.outcome)}`}>{e.outcome}</span></TableCell></TableRow>))}</TableBody></Table>
      </CardContent></Card>
    </div>);
}
