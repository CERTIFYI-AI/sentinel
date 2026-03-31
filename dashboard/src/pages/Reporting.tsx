
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { FileText, Download, Clock, Calendar, Send, Eye, Plus, Search, Filter, BarChart3, FileCheck, AlertTriangle, CheckCircle2 } from "lucide-react";

interface ReportTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  sections: string[];
  frequency: string;
  lastGenerated: string;
  format: string;
  pages: number;
  recipients: string[];
}

interface ScheduledReport {
  reportId: string;
  nextRun: string;
  status: string;
  delivery: string;
}
const reportTemplates: ReportTemplate[] = [
  { id: "RPT-001", name: "Board AI Governance Summary", category: "Executive", description: "Quarterly board-level overview: AI trust score trends, risk posture, compliance status, key incidents, investment ROI", sections: ["AI Trust Score", "Risk Heat Map", "Compliance Progress", "Incident Summary", "Model Portfolio Status"], frequency: "Quarterly", lastGenerated: "2026-01-15", format: "PDF", pages: 12, recipients: ["board@company.com", "ciso@company.com"] },
  { id: "RPT-002", name: "SOC 2 Type II Audit Pack", category: "Audit", description: "Complete evidence package for SOC 2 Type II audit: control descriptions, test results, evidence artifacts, gap remediation", sections: ["Control Matrix", "Test Results", "Evidence Index", "Exception Log", "Management Response"], frequency: "Annual", lastGenerated: "2025-11-20", format: "PDF + CSV", pages: 85, recipients: ["auditor@deloitte.com", "compliance@company.com"] },
  { id: "RPT-003", name: "EU AI Act Conformity Assessment", category: "Regulatory", description: "Article 9 conformity assessment for high-risk AI systems: risk management, data governance, transparency, human oversight", sections: ["System Description", "Risk Classification", "Risk Management Measures", "Data Governance", "Transparency Obligations", "Human Oversight", "Accuracy & Robustness"], frequency: "Per-model (on change)", lastGenerated: "2026-03-10", format: "PDF", pages: 24, recipients: ["legal@company.com", "ai-governance@company.com"] },
  { id: "RPT-004", name: "Bias Audit Summary \xe2\x80\x93 NYC LL144", category: "Regulatory", description: "Annual bias audit for automated employment decision tools per NYC Local Law 144: impact ratios, scoring rates by category", sections: ["AEDT Inventory", "Impact Ratio Analysis", "Scoring Rate by Category", "Intersectional Analysis", "Published Summary", "Auditor Attestation"], frequency: "Annual", lastGenerated: "2026-01-05", format: "PDF + Public Summary", pages: 18, recipients: ["legal@company.com", "hr@company.com"] },
  { id: "RPT-005", name: "Weekly Guardrails Activity Report", category: "Operational", description: "Weekly summary of guardrail triggers: violation counts, top violation types, false positive rates, model-level breakdown", sections: ["Violation Summary", "Top Triggers", "False Positive Analysis", "Model Breakdown", "Threshold Recommendations"], frequency: "Weekly", lastGenerated: "2026-03-28", format: "PDF + CSV", pages: 8, recipients: ["ml-ops@company.com", "security@company.com"] },
];

const scheduledReports: ScheduledReport[] = [
  { reportId: "RPT-005", nextRun: "2026-04-04T08:00:00Z", status: "Scheduled", delivery: "Email + Slack #guardrails-alerts" },
  { reportId: "RPT-001", nextRun: "2026-04-15T09:00:00Z", status: "Scheduled", delivery: "Email" },
];

const categoryIcon = (cat: string) => {
  switch (cat) {
    case "Executive": return <BarChart3 className="h-5 w-5 text-teal-400" />;
    case "Audit": return <FileCheck className="h-5 w-5 text-blue-400" />;
    case "Regulatory": return <AlertTriangle className="h-5 w-5 text-amber-400" />;
    case "Operational": return <Clock className="h-5 w-5 text-emerald-400" />;
    default: return <FileText className="h-5 w-5 text-slate-400" />;
  }
};

const categoryColor = (cat: string) => {
  switch (cat) {
    case "Executive": return "bg-teal-500/10 text-teal-400 border-teal-500/20";
    case "Audit": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "Regulatory": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "Operational": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  }
};

export default function Reporting() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<ReportTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [generating, setGenerating] = useState(false);

  const filteredReports = reportTemplates.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = selectedCategory === "all" || r.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const categories = ["all", ...Array.from(new Set(reportTemplates.map(r => r.category)))];

  const handleGenerate = (report: ReportTemplate) => {
    setSelectedReport(report);
    setGenerating(true);
    setTimeout(() => setGenerating(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reporting</h1>
          <p className="text-muted-foreground">Generate compliance reports, audit packs, and executive summaries</p>
        </div>
        <Button onClick={() => setShowBuilder(true)} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="h-4 w-4 mr-2" /> Create Custom Report
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reports This Month</p>
                <p className="text-2xl font-bold">12</p>
              </div>
              <div className="p-2 rounded-lg bg-teal-500/10"><FileText className="h-5 w-5 text-teal-400" /></div>
            </div>
            <p className="text-xs text-emerald-400 mt-1">+3 from last month</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Scheduled Reports</p>
                <p className="text-2xl font-bold">{scheduledReports.length}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10"><Calendar className="h-5 w-5 text-blue-400" /></div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Next: Apr 4, 2026</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue Reports</p>
                <p className="text-2xl font-bold text-red-400">1</p>
              </div>
              <div className="p-2 rounded-lg bg-red-500/10"><AlertTriangle className="h-5 w-5 text-red-400" /></div>
            </div>
            <p className="text-xs text-red-400 mt-1">SOC 2 annual due</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Generation Time</p>
                <p className="text-2xl font-bold">4.2s</p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/10"><Clock className="h-5 w-5 text-emerald-400" /></div>
            </div>
            <p className="text-xs text-emerald-400 mt-1">-0.8s improvement</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="templates">Report Templates</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="history">Generation History</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search reports..." className="pl-9 w-64" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <div className="flex gap-1">
              {categories.map(cat => (
                <Button key={cat} variant={selectedCategory === cat ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory(cat)} className={selectedCategory === cat ? "bg-teal-600" : ""}>
                  {cat === "all" ? "All" : cat}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <TabsContent value="templates">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReports.map(report => (
              <Card key={report.id} className="bg-card border-border hover:border-teal-500/30 transition-colors cursor-pointer group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {categoryIcon(report.category)}
                      <Badge variant="outline" className={categoryColor(report.category)}>{report.category}</Badge>
                    </div>
                    <Badge variant="outline" className="text-xs">{report.format}</Badge>
                  </div>
                  <CardTitle className="text-base mt-2">{report.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">{report.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {report.sections.slice(0, 3).map(s => (
                      <Badge key={s} variant="secondary" className="text-xs bg-slate-800">{s}</Badge>
                    ))}
                    {report.sections.length > 3 && <Badge variant="secondary" className="text-xs bg-slate-800">+{report.sections.length - 3}</Badge>}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{report.frequency}</span>
                    <span>{report.pages} pages</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Last: {new Date(report.lastGenerated).toLocaleDateString()}</span>
                    <span>{report.recipients.length} recipients</span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" className="flex-1 bg-teal-600 hover:bg-teal-700" onClick={() => handleGenerate(report)}>
                      <Download className="h-3 w-3 mr-1" /> Generate
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => { setSelectedReport(report); setShowPreview(true); }}>
                      <Eye className="h-3 w-3 mr-1" /> Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="scheduled">
          <Card className="bg-card border-border">
            <CardHeader><CardTitle>Scheduled Reports</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {scheduledReports.map((sr, i) => {
                  const template = reportTemplates.find(r => r.id === sr.reportId);
                  return (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded bg-blue-500/10"><Calendar className="h-4 w-4 text-blue-400" /></div>
                        <div>
                          <p className="font-medium text-sm">{template?.name}</p>
                          <p className="text-xs text-muted-foreground">Next: {new Date(sr.nextRun).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">{sr.status}</Badge>
                        <span className="text-xs text-muted-foreground">{sr.delivery}</span>
                        <Button size="sm" variant="ghost"><Send className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="bg-card border-border">
            <CardHeader><CardTitle>Generation History</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { name: "Weekly Guardrails Activity Report", date: "Mar 28, 2026", status: "Completed", duration: "3.1s", size: "2.4 MB" },
                  { name: "EU AI Act Conformity Assessment", date: "Mar 10, 2026", status: "Completed", duration: "8.2s", size: "5.1 MB" },
                  { name: "Board AI Governance Summary", date: "Jan 15, 2026", status: "Completed", duration: "4.5s", size: "3.8 MB" },
                  { name: "Bias Audit Summary \xe2\x80\x93 NYC LL144", date: "Jan 5, 2026", status: "Completed", duration: "5.7s", size: "4.2 MB" },
                  { name: "SOC 2 Type II Audit Pack", date: "Nov 20, 2025", status: "Completed", duration: "12.3s", size: "18.6 MB" },
                ].map((h, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <div>
                        <p className="font-medium text-sm">{h.name}</p>
                        <p className="text-xs text-muted-foreground">{h.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-muted-foreground">{h.duration}</span>
                      <span className="text-xs text-muted-foreground">{h.size}</span>
                      <Button size="sm" variant="ghost"><Download className="h-3 w-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedReport?.name}</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={categoryColor(selectedReport.category)}>{selectedReport.category}</Badge>
                <Badge variant="outline">{selectedReport.format}</Badge>
                <Badge variant="outline">{selectedReport.pages} pages</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{selectedReport.description}</p>
              <div>
                <p className="text-sm font-medium mb-2">Sections</p>
                <div className="space-y-1">
                  {selectedReport.sections.map((s, i) => (
                    <div key={s} className="flex items-center gap-2 text-sm p-2 rounded bg-slate-800/50">
                      <span className="text-muted-foreground w-6">{i + 1}.</span>{s}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Recipients</p>
                <div className="flex flex-wrap gap-1">
                  {selectedReport.recipients.map(r => <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>)}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1 bg-teal-600 hover:bg-teal-700" onClick={() => { handleGenerate(selectedReport); setShowPreview(false); }}>
                  <Download className="h-4 w-4 mr-2" /> Generate Now
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setShowPreview(false)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Report Builder Dialog */}
      <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Custom Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Report Name</label>
              <Input placeholder="e.g., Monthly AI Risk Summary" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <div className="flex gap-2 mt-1">
                {["Executive", "Audit", "Regulatory", "Operational"].map(cat => (
                  <Button key={cat} variant="outline" size="sm">{cat}</Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Date Range</label>
              <div className="flex gap-2 mt-1">
                <Input type="date" className="flex-1" />
                <Input type="date" className="flex-1" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Include Models</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {["CreditScorer v2.1", "GPT-4-Turbo", "FraudDetector v4.2", "HiringFilter v3.0"].map(m => (
                  <Badge key={m} variant="outline" className="cursor-pointer hover:bg-teal-500/10">{m}</Badge>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Recipients</label>
              <Input placeholder="email@company.com" className="mt-1" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1 bg-teal-600 hover:bg-teal-700">Generate Report</Button>
              <Button variant="outline" onClick={() => setShowBuilder(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generation Toast */}
      {generating && (
        <div className="fixed bottom-4 right-4 bg-card border border-teal-500/30 rounded-lg p-4 shadow-lg flex items-center gap-3">
          <div className="animate-spin h-4 w-4 border-2 border-teal-400 border-t-transparent rounded-full" />
          <span className="text-sm">Generating {selectedReport?.name}...</span>
        </div>
      )}
    </div>
  );
}
