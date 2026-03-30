import { useState } from "react";
import { ChartBar, Export, Funnel, Calendar, FileText, Download, Printer, Eye } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const complianceTrend = [
  { month: "Aug", score: 72 },
  { month: "Sep", score: 75 },
  { month: "Oct", score: 78 },
  { month: "Nov", score: 74 },
  { month: "Dec", score: 80 },
  { month: "Jan", score: 83 },
];

const riskByCategory = [
  { name: "Model Risk", value: 35, color: "#ef4444" },
  { name: "Data Privacy", value: 25, color: "#f97316" },
  { name: "Compliance", value: 20, color: "#eab308" },
  { name: "Operational", value: 15, color: "#22c55e" },
  { name: "Vendor", value: 5, color: "#3b82f6" },
];

const controlEffectiveness = [
  { framework: "ISO 27001", implemented: 42, partial: 8, missing: 3 },
  { framework: "SOC2", implemented: 38, partial: 12, missing: 5 },
  { framework: "EU AI Act", implemented: 28, partial: 15, missing: 10 },
  { framework: "NIST AI RMF", implemented: 35, partial: 10, missing: 8 },
];

const reports = [
  { id: "RPT-001", name: "Q4 2024 Compliance Summary", type: "Compliance", generated: "2025-01-10", status: "ready", pages: 24 },
  { id: "RPT-002", name: "AI Model Risk Assessment", type: "Risk", generated: "2025-01-08", status: "ready", pages: 18 },
  { id: "RPT-003", name: "SOC2 Type II Evidence Pack", type: "Audit", generated: "2025-01-05", status: "ready", pages: 56 },
  { id: "RPT-004", name: "EU AI Act Readiness Report", type: "Compliance", generated: "2025-01-03", status: "generating", pages: 0 },
  { id: "RPT-005", name: "Vendor Risk Assessment Summary", type: "Vendor", generated: "2024-12-28", status: "ready", pages: 12 },
  { id: "RPT-006", name: "Monthly Incident Report", type: "Incident", generated: "2025-01-01", status: "ready", pages: 8 },
];

export default function Reporting() {
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reporting & Analytics</h1>
          <p className="text-sm text-muted-foreground">Acme Financial Corp - Compliance & Risk Reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Calendar className="h-4 w-4 mr-1" />Schedule</Button>
          <Button size="sm"><Export className="h-4 w-4 mr-1" />Generate Report</Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4 space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Overall Score</div><div className="text-2xl font-bold text-green-600">83%</div></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Open Risks</div><div className="text-2xl font-bold text-orange-600">14</div></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Controls Active</div><div className="text-2xl font-bold">143</div></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Reports Generated</div><div className="text-2xl font-bold">{reports.length}</div></CardContent></Card>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Compliance Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={complianceTrend}>
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis fontSize={12} domain={[60, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6" }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Risk Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={riskByCategory} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                      {riskByCategory.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Control Effectiveness by Framework</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={controlEffectiveness}>
                  <XAxis dataKey="framework" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="implemented" stackId="a" fill="#22c55e" />
                  <Bar dataKey="partial" stackId="a" fill="#eab308" />
                  <Bar dataKey="missing" stackId="a" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2">
                {reports.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.id} · {r.type} · Generated {r.generated}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={r.status === "ready" ? "default" : "secondary"}>{r.status}</Badge>
                      {r.status === "ready" && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm"><Download className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm"><Printer className="h-4 w-4" /></Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold text-green-600">92%</div><div className="text-sm text-muted-foreground mt-1">ISO 27001 Coverage</div></CardContent></Card>
            <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold text-blue-600">87%</div><div className="text-sm text-muted-foreground mt-1">SOC2 Readiness</div></CardContent></Card>
            <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold text-orange-600">71%</div><div className="text-sm text-muted-foreground mt-1">EU AI Act Compliance</div></CardContent></Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
