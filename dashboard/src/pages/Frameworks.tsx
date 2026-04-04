import { useState } from "react";
import { Shield, Lock, ShieldCheck, Scale, AlertTriangle, Bug, ChevronRight, Search } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";

interface Framework {
  id: string;
  name: string;
  fullName: string;
  description: string;
  complianceScore: number;
  controlsImplemented: number;
  controlsTotal: number;
  status: "compliant" | "partial" | "non-compliant" | "not-started";
  lastAuditDate: string;
  nextAuditDate: string;
  category: string;
  icon: React.ElementType;
}

const frameworks: Framework[] = [
  {
    id: "iso-42001",
    name: "ISO/IEC 42001",
    fullName: "AI Management System",
    description: "International standard for AI management systems establishing requirements for responsible AI.",
    complianceScore: 78,
    controlsImplemented: 42,
    controlsTotal: 58,
    status: "partial",
    lastAuditDate: "2026-03-15",
    nextAuditDate: "2026-06-15",
    category: "AI Governance",
    icon: Shield,
  },
  {
    id: "iso-27001",
    name: "ISO 27001",
    fullName: "Information Security Management",
    description: "International standard for information security management systems (ISMS).",
    complianceScore: 92,
    controlsImplemented: 89,
    controlsTotal: 93,
    status: "compliant",
    lastAuditDate: "2026-02-20",
    nextAuditDate: "2026-08-20",
    category: "Security",
    icon: Lock,
  },
  {
    id: "soc2",
    name: "SOC 2 Type II",
    fullName: "Service Organization Control",
    description: "Trust service criteria for security, availability, processing integrity, confidentiality, and privacy.",
    complianceScore: 85,
    controlsImplemented: 62,
    controlsTotal: 74,
    status: "partial",
    lastAuditDate: "2026-01-10",
    nextAuditDate: "2026-07-10",
    category: "Trust & Security",
    icon: ShieldCheck,
  },
  {
    id: "eu-ai-act",
    name: "EU AI Act",
    fullName: "European AI Regulation",
    description: "EU regulation establishing harmonized rules on artificial intelligence systems by risk tier.",
    complianceScore: 65,
    controlsImplemented: 28,
    controlsTotal: 45,
    status: "partial",
    lastAuditDate: "2026-03-01",
    nextAuditDate: "2026-06-01",
    category: "AI Regulation",
    icon: Scale,
  },
  {
    id: "nist-ai-rmf",
    name: "NIST AI RMF",
    fullName: "AI Risk Management Framework",
    description: "Framework for managing risks associated with AI systems across the lifecycle.",
    complianceScore: 71,
    controlsImplemented: 34,
    controlsTotal: 48,
    status: "partial",
    lastAuditDate: "2026-02-15",
    nextAuditDate: "2026-05-15",
    category: "Risk Management",
    icon: AlertTriangle,
  },
  {
    id: "owasp-llm-top10",
    name: "OWASP LLM Top 10",
    fullName: "LLM Application Security Risks",
    description: "Top 10 security risks for large language model applications and mitigations.",
    complianceScore: 58,
    controlsImplemented: 19,
    controlsTotal: 35,
    status: "non-compliant",
    lastAuditDate: "2026-01-20",
    nextAuditDate: "2026-04-20",
    category: "LLM Security",
    icon: Bug,
  },
];

function getScoreColor(score: number) {
  if (score >= 80) return { ring: "text-green-500", bg: "bg-green-500/10", label: "Good" };
  if (score >= 60) return { ring: "text-amber-500", bg: "bg-amber-500/10", label: "Warning" };
  return { ring: "text-red-500", bg: "bg-red-500/10", label: "Critical" };
}

function getStatusBadge(status: Framework["status"]) {
  const map = {
    compliant: { variant: "default" as const, label: "Compliant", className: "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20" },
    partial: { variant: "default" as const, label: "Partial", className: "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20" },
    "non-compliant": { variant: "default" as const, label: "Non-Compliant", className: "bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20" },
    "not-started": { variant: "default" as const, label: "Not Started", className: "bg-muted text-muted-foreground" },
  };
  const config = map[status];
  return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
}

function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const color = getScoreColor(score);
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={4} className="text-muted/30" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={4} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className={color.ring} />
      </svg>
      <span className={`absolute text-xs font-semibold tabular-nums ${color.ring}`}>{score}%</span>
    </div>
  );
}

export default function FrameworksPage() {
  const [search, setSearch] = useState("");
  const filtered = frameworks.filter(fw =>
    fw.name.toLowerCase().includes(search.toLowerCase()) ||
    fw.fullName.toLowerCase().includes(search.toLowerCase()) ||
    fw.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Compliance Frameworks</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and track framework implementations</p>
        </div>
        <Button>Add Framework</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search frameworks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(fw => {
          const Icon = fw.icon;
          return (
            <Card key={fw.id} className="group transition-all hover:shadow-md hover:border-primary/20 cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm leading-tight">{fw.name}</h3>
                      <p className="text-xs text-muted-foreground">{fw.fullName}</p>
                    </div>
                  </div>
                  <ScoreRing score={fw.complianceScore} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground line-clamp-2">{fw.description}</p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Controls</span>
                    <span className="font-medium tabular-nums">{fw.controlsImplemented}/{fw.controlsTotal}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(fw.controlsImplemented / fw.controlsTotal) * 100}%` }} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  {getStatusBadge(fw.status)}
                  <span className="text-xs text-muted-foreground tabular-nums">Audit: {new Date(fw.nextAuditDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                  <span>{fw.category}</span>
                  <span className="flex items-center gap-0.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity">View details <ChevronRight className="h-3 w-3" /></span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Shield className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-1">No frameworks found</h3>
          <p className="text-sm text-muted-foreground">Try adjusting your search terms</p>
        </div>
      )}
    </div>
  );
}
