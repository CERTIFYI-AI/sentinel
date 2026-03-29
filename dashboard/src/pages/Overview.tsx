import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AlertTriangle, Shield, Brain, FileWarning, Briefcase, FileText, Users, Database, Layers, Clock } from "lucide-react";

const complianceData = [
  { framework: "ISO 27001", score: 87 },
  { framework: "SOC2", score: 82 },
  { framework: "EU AI Act", score: 71 },
  { framework: "NIST", score: 79 },
  { framework: "OWASP LLM", score: 68 },
];

const riskTrend = [
  { month: "Oct", risks: 18 },
  { month: "Nov", risks: 22 },
  { month: "Dec", risks: 19 },
  { month: "Jan", risks: 15 },
  { month: "Feb", risks: 14 },
  { month: "Mar", risks: 12 },
];

const recentActivity = [
  { id: 1, action: "Control CTL-007 passed re-test", user: "Alice Chen", time: "10 min ago", type: "success" },
  { id: 2, action: "New risk RSK-021 identified: API rate limit bypass", user: "Bob Kumar", time: "25 min ago", type: "warning" },
  { id: 3, action: "Incident INC-008 resolved: Model hallucination", user: "Carol Davis", time: "1 hr ago", type: "info" },
  { id: 4, action: "Policy POL-003 updated to v2.1", user: "Dave Wilson", time: "2 hrs ago", type: "info" },
  { id: 5, action: "Bias audit completed for GPT-4-Turbo", user: "Eve Sharma", time: "3 hrs ago", type: "success" },
];

const overdueTasks = [
  { id: 1, title: "Review EU AI Act gap analysis", due: "2 days overdue", assignee: "Alice Chen" },
  { id: 2, title: "Update data retention policy", due: "5 days overdue", assignee: "Bob Kumar" },
  { id: 3, title: "Complete SOC2 evidence collection", due: "1 day overdue", assignee: "Carol Davis" },
];

const kpis = [
  { label: "Open Tasks", value: 8, icon: Clock, color: "text-blue-400" },
  { label: "Open Risks", value: 12, icon: AlertTriangle, color: "text-yellow-400" },
  { label: "Active Models", value: 23, icon: Brain, color: "text-purple-400" },
  { label: "Critical Incidents", value: 3, icon: FileWarning, color: "text-red-400" },
  { label: "Use Cases", value: 15, icon: Briefcase, color: "text-cyan-400" },
  { label: "Active Policies", value: 31, icon: FileText, color: "text-green-400" },
  { label: "Vendors", value: 7, icon: Users, color: "text-orange-400" },
  { label: "Datasets", value: 44, icon: Database, color: "text-indigo-400" },
  { label: "Frameworks", value: 5, icon: Layers, color: "text-emerald-400" },
];

export default function Overview() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">GRC Executive Dashboard</h1>
        <Badge className="bg-green-500/10 text-green-400 border-green-500/30">Live</Badge>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-border/50">
            <CardContent className="p-3 text-center">
              <kpi.icon className={`h-5 w-5 mx-auto mb-1 ${kpi.color}`} />
              <div className="text-xl font-bold">{kpi.value}</div>
              <div className="text-[10px] text-muted-foreground">{kpi.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader><CardTitle className="text-sm">Compliance Score by Framework</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={complianceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="framework" tick={{ fontSize: 11, fill: '#888' }} />
                <YAxis tick={{ fontSize: 11, fill: '#888' }} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="score" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader><CardTitle className="text-sm">Risk Trend (Last 6 Months)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={riskTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#888' }} />
                <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                <Tooltip />
                <Line type="monotone" dataKey="risks" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader><CardTitle className="text-sm">Recent Activity</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.map((item) => (
              <div key={item.id} className="flex items-start gap-3 text-sm">
                <div className={`w-2 h-2 rounded-full mt-1.5 ${item.type === 'success' ? 'bg-green-400' : item.type === 'warning' ? 'bg-yellow-400' : 'bg-blue-400'}`} />
                <div className="flex-1">
                  <div>{item.action}</div>
                  <div className="text-xs text-muted-foreground">{item.user} · {item.time}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/50 border-red-500/20">
          <CardHeader><CardTitle className="text-sm text-red-400">Overdue Tasks</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {overdueTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between text-sm p-2 rounded bg-red-500/5 border border-red-500/10">
                <div>
                  <div className="font-medium">{task.title}</div>
                  <div className="text-xs text-muted-foreground">{task.assignee}</div>
                </div>
                <Badge variant="destructive" className="text-[10px]">{task.due}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
