
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Globe, AlertTriangle, Clock, CheckCircle2, Search, Filter, Calendar, ArrowRight, ExternalLink, ChevronRight, Landmark, Shield } from "lucide-react";

interface Regulation {
  id: string; name: string; jurisdiction: string; effectiveDate: string; status: string;
  impactLevel: string; affectedFrameworks: string[]; affectedModels: string[];
  summary: string; requiredActions: string[]; source: string;
}

const regulations: Regulation[] = [
  { id: "REG-001", name: "EU AI Act Article 6 \xe2\x80\x93 High-Risk Classification", jurisdiction: "EU", effectiveDate: "2026-08-02", status: "Upcoming", impactLevel: "Critical", affectedFrameworks: ["EU AI Act"], affectedModels: ["GPT-4-Turbo", "CreditScorer", "HiringFilter"], summary: "Providers of high-risk AI systems must complete conformity assessments before market placement.", requiredActions: ["Complete conformity assessment", "Update technical documentation", "Register in EU database"], source: "Official Journal of the EU" },
  { id: "REG-002", name: "NIST AI 600-1 \xe2\x80\x93 Generative AI Risk Profile", jurisdiction: "US", effectiveDate: "2026-04-15", status: "Published", impactLevel: "High", affectedFrameworks: ["NIST AI RMF"], affectedModels: ["GPT-4-Turbo", "Claude-3-Sonnet"], summary: "Companion resource to AI RMF addressing unique risks of GAI including hallucination, CSAM, data privacy.", requiredActions: ["Map GAI risks to controls", "Update risk register", "Implement content filtering guardrails"], source: "NIST" },
  { id: "REG-003", name: "Colorado AI Act SB 205 \xe2\x80\x93 Algorithmic Discrimination", jurisdiction: "US-CO", effectiveDate: "2026-02-01", status: "Enacted", impactLevel: "High", affectedFrameworks: ["NIST AI RMF", "ISO 42001"], affectedModels: ["CreditScorer", "HiringFilter", "InsuranceRisk"], summary: "Developers and deployers of high-risk AI must use reasonable care to avoid algorithmic discrimination.", requiredActions: ["Conduct bias audit", "Publish impact assessment", "Implement consumer notification"], source: "Colorado Legislature" },
  { id: "REG-004", name: "ISO/IEC 42001:2023 Amendment 1", jurisdiction: "International", effectiveDate: "2026-06-01", status: "Draft", impactLevel: "Medium", affectedFrameworks: ["ISO 42001"], affectedModels: ["All"], summary: "Proposed amendments to AI management system standard addressing generative AI and foundation models.", requiredActions: ["Review gap analysis", "Update AIMS documentation", "Schedule transition audit"], source: "ISO/IEC JTC 1/SC 42" },
  { id: "REG-005", name: "Singapore AI Verify Foundation \xe2\x80\x93 Model Governance Framework v2", jurisdiction: "SG", effectiveDate: "2026-03-30", status: "Published", impactLevel: "Medium", affectedFrameworks: ["ISO 42001"], affectedModels: ["FraudDetector", "ChatBot-v2"], summary: "Updated testing framework for AI systems with new fairness and robustness benchmarks.", requiredActions: ["Run AI Verify toolkit", "Update model cards", "Submit assessment report"], source: "IMDA Singapore" },
];

const impactColor = (level: string) => {
  switch (level) {
    case "Critical": return "bg-red-500/10 text-red-400 border-red-500/20";
    case "High": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "Medium": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  }
};

const statusColor = (status: string) => {
  switch (status) {
    case "Enacted": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "Published": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "Upcoming": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "Draft": return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  }
};

export default function RegRadar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string>("all");
  const [selectedImpact, setSelectedImpact] = useState<string>("all");
  const [selectedReg, setSelectedReg] = useState<Regulation | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const jurisdictions = ["all", ...Array.from(new Set(regulations.map(r => r.jurisdiction)))];
  const filtered = regulations.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchJuris = selectedJurisdiction === "all" || r.jurisdiction === selectedJurisdiction;
    const matchImpact = selectedImpact === "all" || r.impactLevel === selectedImpact;
    return matchSearch && matchJuris && matchImpact;
  });

  const daysUntil = (date: string) => {
    const d = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return d > 0 ? d : 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Regulatory Radar</h1>
          <p className="text-muted-foreground">Track upcoming AI regulations, compliance deadlines, and required actions</p>
        </div>
        <Button className="bg-teal-600 hover:bg-teal-700"><Globe className="h-4 w-4 mr-2" /> Add Regulation</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border"><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Tracked</p><p className="text-2xl font-bold">{regulations.length}</p></div><div className="p-2 rounded-lg bg-teal-500/10"><Globe className="h-5 w-5 text-teal-400" /></div></div><p className="text-xs text-muted-foreground mt-1">Across {new Set(regulations.map(r => r.jurisdiction)).size} jurisdictions</p></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Critical Impact</p><p className="text-2xl font-bold text-red-400">{regulations.filter(r => r.impactLevel === "Critical").length}</p></div><div className="p-2 rounded-lg bg-red-500/10"><AlertTriangle className="h-5 w-5 text-red-400" /></div></div><p className="text-xs text-red-400 mt-1">Requires immediate action</p></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Action Items Overdue</p><p className="text-2xl font-bold text-amber-400">3</p></div><div className="p-2 rounded-lg bg-amber-500/10"><Clock className="h-5 w-5 text-amber-400" /></div></div><p className="text-xs text-amber-400 mt-1">Colorado SB 205 actions due</p></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Jurisdictions</p><p className="text-2xl font-bold">{new Set(regulations.map(r => r.jurisdiction)).size}</p></div><div className="p-2 rounded-lg bg-blue-500/10"><Landmark className="h-5 w-5 text-blue-400" /></div></div><p className="text-xs text-muted-foreground mt-1">EU, US, SG, International</p></CardContent></Card>
      </div>

      {/* Timeline Chart */}
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-base">Regulatory Timeline</CardTitle></CardHeader>
        <CardContent>
          <div className="relative">
            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-border" />
            <div className="flex justify-between relative">
              {regulations.sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()).map(reg => (
                <div key={reg.id} className="flex flex-col items-center cursor-pointer group" onClick={() => { setSelectedReg(reg); setShowDetail(true); }}>
                  <div className={`w-4 h-4 rounded-full border-2 z-10 group-hover:scale-125 transition-transform ${reg.impactLevel === "Critical" ? "bg-red-500 border-red-400" : reg.impactLevel === "High" ? "bg-amber-500 border-amber-400" : "bg-blue-500 border-blue-400"}`} />
                  <div className="mt-2 text-center">
                    <p className="text-xs font-medium max-w-[120px] truncate">{reg.name.split(" \xe2\x80\x93 ")[0]}</p>
                    <p className="text-xs text-muted-foreground">{new Date(reg.effectiveDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p>
                    <Badge variant="outline" className={`text-xs mt-1 ${impactColor(reg.impactLevel)}`}>{reg.impactLevel}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search & Filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search regulations..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {jurisdictions.map(j => (
            <Button key={j} variant={selectedJurisdiction === j ? "default" : "outline"} size="sm" onClick={() => setSelectedJurisdiction(j)} className={selectedJurisdiction === j ? "bg-teal-600" : ""}>
              {j === "all" ? "All" : j}
            </Button>
          ))}
        </div>
        <div className="flex gap-1">
          {["all", "Critical", "High", "Medium"].map(i => (
            <Button key={i} variant={selectedImpact === i ? "default" : "outline"} size="sm" onClick={() => setSelectedImpact(i)} className={selectedImpact === i ? "bg-teal-600" : ""}>
              {i === "all" ? "All Impact" : i}
            </Button>
          ))}
        </div>
      </div>

      {/* Regulation Cards */}
      <div className="space-y-3">
        {filtered.map(reg => (
          <Card key={reg.id} className="bg-card border-border hover:border-teal-500/30 transition-colors cursor-pointer" onClick={() => { setSelectedReg(reg); setShowDetail(true); }}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={impactColor(reg.impactLevel)}>{reg.impactLevel}</Badge>
                    <Badge variant="outline" className={statusColor(reg.status)}>{reg.status}</Badge>
                    <Badge variant="outline" className="bg-slate-500/10 text-slate-400 border-slate-500/20">{reg.jurisdiction}</Badge>
                  </div>
                  <h3 className="font-medium">{reg.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{reg.summary}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Effective: {new Date(reg.effectiveDate).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> {reg.affectedFrameworks.join(", ")}</span>
                    <span>{reg.affectedModels.length} models affected</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {reg.affectedModels.map(m => <Badge key={m} variant="secondary" className="text-xs bg-slate-800">{m}</Badge>)}
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className={`text-2xl font-bold ${daysUntil(reg.effectiveDate) < 30 ? "text-red-400" : daysUntil(reg.effectiveDate) < 90 ? "text-amber-400" : "text-emerald-400"}`}>{daysUntil(reg.effectiveDate)}</div>
                  <div className="text-xs text-muted-foreground">days until effective</div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground mt-2 ml-auto" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{selectedReg?.name}</DialogTitle></DialogHeader>
          {selectedReg && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={impactColor(selectedReg.impactLevel)}>{selectedReg.impactLevel}</Badge>
                <Badge variant="outline" className={statusColor(selectedReg.status)}>{selectedReg.status}</Badge>
                <Badge variant="outline">{selectedReg.jurisdiction}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{selectedReg.summary}</p>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Effective Date</p><p className="text-sm font-medium">{new Date(selectedReg.effectiveDate).toLocaleDateString()}</p></div>
                <div><p className="text-xs text-muted-foreground">Source</p><p className="text-sm font-medium">{selectedReg.source}</p></div>
                <div><p className="text-xs text-muted-foreground">Days Until Effective</p><p className="text-sm font-bold text-amber-400">{daysUntil(selectedReg.effectiveDate)} days</p></div>
                <div><p className="text-xs text-muted-foreground">Frameworks</p><p className="text-sm font-medium">{selectedReg.affectedFrameworks.join(", ")}</p></div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Affected Models</p>
                <div className="flex flex-wrap gap-1">
                  {selectedReg.affectedModels.map(m => <Badge key={m} variant="secondary" className="bg-slate-800">{m}</Badge>)}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Required Actions</p>
                <div className="space-y-2">
                  {selectedReg.requiredActions.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded bg-slate-800/50">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">{a}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1 bg-teal-600 hover:bg-teal-700">Create Action Plan</Button>
                <Button variant="outline" className="flex-1"><ExternalLink className="h-4 w-4 mr-2" /> View Source</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
