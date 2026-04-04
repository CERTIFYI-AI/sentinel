import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Progress } from "../../components/ui/progress";
import { Input } from "../../components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../../components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Target, Layers, AlertTriangle, FileCheck, CheckCircle2, XCircle, MinusCircle, Eye, Download, Plus, Search, Upload, Play } from "lucide-react";
import { controlSeedData, Control } from "../../data/controlSeedData";
import { cn } from "../../lib/utils";

interface EvidenceItem { id: string; name: string; type: "PDF"|"CSV"|"LOG"|"IMG"|"JSON"; source: string; date: string; status: "Valid"|"Expired"|"Pending"; }

function generateEvidenceForControl(ctrl: Control): EvidenceItem[] {
  const sources = ["Drata Sync","Manual Upload","Sentinel Runtime","Cobalt.io","Internal Scan","Okta Sync"];
  const templates: { name: string; type: EvidenceItem["type"] }[] = ctrl.automationType === "Automated"
    ? [{ name: `${ctrl.id}_runtime_test_report.pdf`, type: "PDF" }, { name: `${ctrl.id}_scan_results.json`, type: "JSON" }, { name: `${ctrl.id}_guardrail_logs_30d.csv`, type: "CSV" }]
    : ctrl.automationType === "Semi-Automated"
    ? [{ name: `${ctrl.id}_assessment_report.pdf`, type: "PDF" }, { name: `${ctrl.id}_monitoring_data.csv`, type: "CSV" }, { name: `${ctrl.id}_config_audit.json`, type: "JSON" }]
    : [{ name: `${ctrl.id}_manual_review.pdf`, type: "PDF" }, { name: `${ctrl.id}_attestation_signed.pdf`, type: "PDF" }, { name: `${ctrl.id}_audit_notes.pdf`, type: "PDF" }];
  return templates.map((t, i) => ({ id: `EV-${ctrl.id}-${String(i+1).padStart(3,"0")}`, name: t.name, type: t.type, source: sources[i % sources.length], date: `2026-03-${String(28 - i * 5).padStart(2,"0")}`, status: i === 0 ? "Valid" as const : i === templates.length - 1 ? "Pending" as const : "Valid" as const }));
}

interface CrossMapping { framework: string; clauseRef: string; requirement: string; alignment: "Full"|"Partial"|"Gap"; }

function getCrossFrameworkMappings(ctrl: Control): CrossMapping[] {
  const mappings: Record<string, CrossMapping[]> = {
    "Risk Management": [{ framework: "ISO 42001", clauseRef: "Annex A.5.3", requirement: "AI System Risk Assessment", alignment: "Full" }, { framework: "EU AI Act", clauseRef: "Article 9", requirement: "Risk Management System", alignment: "Partial" }, { framework: "NIST AI RMF", clauseRef: "MAP 1.1", requirement: "Context Established", alignment: "Full" }, { framework: "SOC 2", clauseRef: "CC3.1", requirement: "Risk Assessment Process", alignment: "Full" }],
    "Human Oversight": [{ framework: "ISO 42001", clauseRef: "Annex A.8.3", requirement: "Human Oversight of AI", alignment: "Full" }, { framework: "EU AI Act", clauseRef: "Article 14", requirement: "Human Oversight Measures", alignment: "Partial" }, { framework: "NIST AI RMF", clauseRef: "GOVERN 1.3", requirement: "Oversight Mechanisms", alignment: "Full" }],
    "Access Control": [{ framework: "ISO 27001", clauseRef: "A.9.1.1", requirement: "Access Control Policy", alignment: "Full" }, { framework: "SOC 2", clauseRef: "CC6.1", requirement: "Logical Access Controls", alignment: "Full" }],
    "Data Governance": [{ framework: "ISO 42001", clauseRef: "Annex A.7.2", requirement: "Data Quality Management", alignment: "Full" }, { framework: "EU AI Act", clauseRef: "Article 10", requirement: "Data Governance", alignment: "Partial" }, { framework: "NIST AI RMF", clauseRef: "MAP 2.3", requirement: "Data Characterization", alignment: "Full" }],
  };
  return [...(mappings[ctrl.category] || []), { framework: ctrl.framework, clauseRef: ctrl.clauseRef, requirement: ctrl.name, alignment: "Full" as const }].filter(m => m.framework !== ctrl.framework || m.clauseRef !== ctrl.clauseRef);
}

function exportControlMatrix() {
  let csv = "Control ID,Name,Framework,Clause Reference,Category,Status,Score,Test Result,Risk Level,Automation,Owner,Evidence Count,Last Tested,Linked Policies,Linked Models\n";
  controlSeedData.forEach(c => {
    csv += `"${c.id}","${c.name}","${c.framework}","${c.clauseRef}","${c.category}","${c.status}",${c.score},"${c.testResult}","${c.riskLevel}","${c.automationType}","${c.owner}",${c.evidenceCount},"${c.lastTested}","${c.linkedPolicies.join("; ")}","${c.linkedModels.join("; ")}"\n`;
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `sentinel-control-matrix-${new Date().toISOString().split("T")[0]}.csv`;
  a.click(); URL.revokeObjectURL(url);
}


const FRAMEWORKS = ["All","ISO 42001","ISO 27001","SOC 2","EU AI Act","NIST AI RMF","OWASP LLM"];

const statusColors: Record<string, string> = {
  Implemented: "bg-primary/10 text-primary border-primary/20",
  Partial: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Planned: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Not Applicable": "bg-zinc-500/10 text-muted-foreground border-zinc-500/20",
};

const testIcons: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  Pass: { icon: CheckCircle2, color: "text-primary" },
  Fail: { icon: XCircle, color: "text-red-400" },
  Warning: { icon: MinusCircle, color: "text-amber-400" },
  "Not Tested": { icon: MinusCircle, color: "text-muted-foreground" },
};

export default function ComplianceControls() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialFw = searchParams.get("framework") || "All";
  const [frameworkFilter, setFrameworkFilter] = useState(initialFw);
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const [selectedControl, setSelectedControl] = useState<Control | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filtered = controlSeedData.filter((c) => {
    if (frameworkFilter !== "All" && c.framework !== frameworkFilter) return false;
    if (statusFilter !== "All" && c.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !c.id.toLowerCase().includes(q) && !c.owner.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const implCount = controlSeedData.filter(c => c.status === "Implemented").length;
  const totalCount = controlSeedData.length;
  const coverage = Math.round((implCount / totalCount) * 100);
  const openGaps = controlSeedData.filter(c => c.status === "Partial" || c.status === "Planned").length;
  const totalEvidence = controlSeedData.reduce((s, c) => s + c.evidenceCount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Control Library</h1>
          <p className="text-muted-foreground text-sm">{totalCount} controls across 6 frameworks — real-time enforcement status</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportControlMatrix}><Download className="h-4 w-4 mr-1" />Export Matrix</Button>
          <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Control</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[{label:"Control Coverage",value:`${coverage}%`,sub:`${implCount} of ${totalCount} implemented`,icon:Target,trend:"+2.3%",up:true},
          {label:"Total Controls",value:totalCount,sub:"Across 6 frameworks",icon:Layers,trend:"+14",up:true},
          {label:"Open Gaps",value:openGaps,sub:`${controlSeedData.filter(c=>c.status==="Planned").length} planned`,icon:AlertTriangle,trend:"-3",up:false},
          {label:"Evidence Items",value:totalEvidence,sub:"44 pending review",icon:FileCheck,trend:"+89",up:true}].map((s,i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">{s.sub}</span>
              <span className={cn("text-xs",s.up?"text-primary":"text-red-400")}>{s.trend}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 flex-wrap">
          {FRAMEWORKS.map(fw => {
            const count = fw === "All" ? controlSeedData.length : controlSeedData.filter(c => c.framework === fw).length;
            return (
              <Button key={fw} variant={frameworkFilter === fw ? "default" : "outline"} size="sm"
                onClick={() => { setFrameworkFilter(fw); setPage(1); }}>
                {fw} <Badge variant="secondary" className="ml-1 text-xs">{count}</Badge>
              </Button>
            );
          })}
        </div>
        <div className="flex gap-2 ml-auto">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search controls..." className="pl-8 h-9 w-[200px]" value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} />
          </div>
          {["All","Implemented","Partial","Planned"].map(s => (
            <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm"
              onClick={() => { setStatusFilter(s); setPage(1); }}>{s}</Button>
          ))}
        </div>
      </div>

      {/* Controls Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Control ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Framework</TableHead>
              <TableHead>Clause</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Test</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Evidence</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((ctrl) => {
              const TIcon = testIcons[ctrl.testResult] || testIcons["Not Tested"];
              return (
                <TableRow key={ctrl.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedControl(ctrl); setDetailOpen(true); }}>
                  <TableCell className="font-mono text-xs">{ctrl.id}</TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{ctrl.name}</div>
                    <div className="text-xs text-muted-foreground">{ctrl.category} · {ctrl.owner}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{ctrl.framework}</Badge></TableCell>
                  <TableCell className="text-xs font-mono">{ctrl.clauseRef}</TableCell>
                  <TableCell><Badge className={cn("text-xs border",statusColors[ctrl.status])}>{ctrl.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={ctrl.score} className="h-1.5 w-16" />
                      <span className="text-xs">{ctrl.score}%</span>
                    </div>
                  </TableCell>
                  <TableCell><TIcon.icon className={cn("h-4 w-4",TIcon.color)} /></TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{ctrl.automationType}</Badge></TableCell>
                  <TableCell className="text-right text-xs">{ctrl.evidenceCount}</TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedControl(ctrl); setDetailOpen(true); }}><Eye className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t">
          <span className="text-sm text-muted-foreground">Showing {(page-1)*pageSize+1}–{Math.min(page*pageSize,filtered.length)} of {filtered.length} controls</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page<=1} onClick={() => setPage(p=>p-1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page>=totalPages} onClick={() => setPage(p=>p+1)}>Next</Button>
          </div>
        </div>
      </Card>

      {/* Control Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedControl?.name}</SheetTitle>
            <SheetDescription>{selectedControl?.id} — {selectedControl?.framework} {selectedControl?.clauseRef}</SheetDescription>
          </SheetHeader>
          {selectedControl && (
            <Tabs defaultValue="detail" className="mt-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="detail">Detail</TabsTrigger>
                <TabsTrigger value="evidence">Evidence</TabsTrigger>
                <TabsTrigger value="testing">Testing</TabsTrigger>
                <TabsTrigger value="mapping">Mapping</TabsTrigger>
              </TabsList>
              <TabsContent value="detail" className="space-y-4 mt-4">
                <div className="flex gap-2">
                  <Badge className={cn("border",statusColors[selectedControl.status])}>{selectedControl.status}</Badge>
                  <Badge variant="outline">{selectedControl.automationType}</Badge>
                  <Badge variant="outline">{selectedControl.riskLevel} Risk</Badge>
                </div>
                <div><Progress value={selectedControl.score} className="h-2" /><span className="text-xs text-muted-foreground mt-1 block">{selectedControl.score}% implemented</span></div>
                <p className="text-sm text-muted-foreground">{selectedControl.description}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Owner:</span> {selectedControl.owner}</div>
                  <div><span className="text-muted-foreground">Category:</span> {selectedControl.category}</div>
                  <div><span className="text-muted-foreground">Last Tested:</span> {selectedControl.lastTested}</div>
                  <div><span className="text-muted-foreground">Test Result:</span> {selectedControl.testResult}</div>
                  <div><span className="text-muted-foreground">Evidence:</span> {selectedControl.evidenceCount} items</div>
                  <div><span className="text-muted-foreground">Risk Level:</span> {selectedControl.riskLevel}</div>
                </div>
                {selectedControl.linkedModels.length > 0 && <div><h4 className="text-sm font-medium mb-1">Linked Models</h4><div className="flex flex-wrap gap-1">{selectedControl.linkedModels.map(m => <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>)}</div></div>}
                {selectedControl.linkedPolicies.length > 0 && <div><h4 className="text-sm font-medium mb-1">Linked Policies</h4><div className="flex flex-wrap gap-1">{selectedControl.linkedPolicies.map(p => <span key={p} className="cursor-pointer" onClick={() => navigate(`/policy-editor?id=${p}`)}><Badge variant="outline" className="text-xs hover:bg-muted">{p}</Badge></span>)}</div></div>}
              </TabsContent>
              <TabsContent value="evidence" className="space-y-3 mt-4">
                {generateEvidenceForControl(selectedControl).map((ev, i) => (
                  <Card key={i} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><Upload className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">{ev.name}</span></div>
                      <Badge variant="outline" className="text-xs">{ev.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{ev.type} · Uploaded {ev.date}</div>
                  </Card>
                ))}
              </TabsContent>
              <TabsContent value="testing" className="space-y-3 mt-4">
                <Card className="p-3"><div className="flex items-center gap-2"><Play className="h-4 w-4 text-primary" /><div><div className="text-sm font-medium">Latest Test Run</div><div className="text-xs text-muted-foreground">{selectedControl.lastTested} — Result: {selectedControl.testResult}</div></div></div></Card>
                <Card className="p-3"><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-muted-foreground" /><div><div className="text-sm font-medium">Previous Run</div><div className="text-xs text-muted-foreground">2025-12-01 — Result: Pass</div></div></div></Card>
              </TabsContent>
              <TabsContent value="mapping" className="space-y-3 mt-4">
                {getCrossFrameworkMappings(selectedControl).map((m, i) => (
                  <Card key={i} className="p-3">
                    <div className="flex items-center justify-between">
                      <div><div className="text-sm font-medium">{m.framework}</div><div className="text-xs text-muted-foreground">{m.clauseRef} — {m.requirement}</div></div>
                      <Badge variant="outline" className="text-xs">{m.alignment}</Badge>
                    </div>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
