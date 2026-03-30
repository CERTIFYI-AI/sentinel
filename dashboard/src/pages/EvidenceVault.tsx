import { useState } from "react";
import { Vault, Upload, MagnifyingGlass, Download, Eye, CheckCircle, Clock } from "@phosphor-icons/react";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

const evidence = [
  { id: "EVD-001", name: "Access Review Q4 2024", framework: "SOC2", control: "CTL-001", type: "PDF", size: "2.4 MB", uploaded: "2025-01-10", uploader: "Alex Kumar", status: "approved" },
  { id: "EVD-002", name: "Encryption Configuration Audit", framework: "ISO 27001", control: "CTL-002", type: "PDF", size: "1.8 MB", uploaded: "2025-01-08", uploader: "James Wilson", status: "approved" },
  { id: "EVD-003", name: "Bias Test Results - Credit Model", framework: "EU AI Act", control: "CTL-004", type: "CSV", size: "5.2 MB", uploaded: "2025-01-05", uploader: "Dr. Sarah Chen", status: "pending" },
  { id: "EVD-004", name: "Incident Response Drill Report", framework: "ISO 27001", control: "CTL-005", type: "DOCX", size: "3.1 MB", uploaded: "2025-01-03", uploader: "Mike Johnson", status: "approved" },
  { id: "EVD-005", name: "Vendor Security Questionnaire", framework: "SOC2", control: "CTL-007", type: "PDF", size: "890 KB", uploaded: "2024-12-28", uploader: "Mike Johnson", status: "approved" },
  { id: "EVD-006", name: "Model Training Data Lineage", framework: "NIST AI RMF", control: "CTL-009", type: "JSON", size: "12.4 MB", uploaded: "2025-01-12", uploader: "Dr. Sarah Chen", status: "reviewing" },
];

export default function EvidenceVault() {
  const [search, setSearch] = useState("");
  const filtered = evidence.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()) || e.framework.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Evidence Vault</h1><p className="text-sm text-muted-foreground">Acme Financial Corp - Compliance Evidence Repository</p></div>
        <Button size="sm"><Upload className="h-4 w-4 mr-1" />Upload Evidence</Button>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Total Evidence</div><div className="text-2xl font-bold">{evidence.length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Approved</div><div className="text-2xl font-bold text-green-600">{evidence.filter(e => e.status === "approved").length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Pending</div><div className="text-2xl font-bold text-yellow-600">{evidence.filter(e => e.status === "pending").length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Reviewing</div><div className="text-2xl font-bold text-blue-600">{evidence.filter(e => e.status === "reviewing").length}</div></CardContent></Card>
      </div>
      <div className="relative"><MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search evidence..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <Card><CardContent className="pt-4">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left"><th className="p-2">ID</th><th className="p-2">Evidence</th><th className="p-2">Framework</th><th className="p-2">Type</th><th className="p-2">Size</th><th className="p-2">Status</th><th className="p-2">Uploaded</th><th className="p-2"></th></tr></thead>
          <tbody>{filtered.map((e) => (
            <tr key={e.id} className="border-b hover:bg-muted/50">
              <td className="p-2 font-mono text-xs">{e.id}</td><td className="p-2 font-medium">{e.name}</td>
              <td className="p-2"><Badge variant="outline">{e.framework}</Badge></td>
              <td className="p-2">{e.type}</td><td className="p-2">{e.size}</td>
              <td className="p-2"><Badge variant={e.status === "approved" ? "default" : e.status === "reviewing" ? "secondary" : "outline"}>{e.status}</Badge></td>
              <td className="p-2">{e.uploaded}</td>
              <td className="p-2"><div className="flex gap-1"><Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button><Button variant="ghost" size="sm"><Download className="h-4 w-4" /></Button></div></td>
            </tr>))}</tbody>
        </table>
      </CardContent></Card>
    </div>
  );
}
