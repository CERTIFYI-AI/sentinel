
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Shield, AlertTriangle, Bug, Activity, Lock, Scan, Swords, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

const alerts = [
  { time: "10 min ago", msg: "Critical CVE detected in model serving layer", severity: "critical" },
  { time: "25 min ago", msg: "Unusual API access pattern from 203.45.x.x", severity: "high" },
  { time: "1 hr ago", msg: "Failed penetration test on /api/models endpoint", severity: "medium" },
  { time: "2 hr ago", msg: "SSL certificate expiring in 14 days", severity: "low" },
  { time: "3 hr ago", msg: "New vulnerability scan completed", severity: "info" },
];
const sevColor = (s: string) => ({ critical: "text-red-400 bg-red-500/10", high: "text-orange-400 bg-orange-500/10", medium: "text-yellow-400 bg-yellow-500/10", low: "text-blue-400 bg-blue-500/10", info: "text-green-400 bg-green-500/10" })[s] || "";

export default function SecurityHome() {
  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold">Security Operations Center</h1><p className="text-muted-foreground">AI infrastructure security posture overview</p></div>
      <Card className="border-green-500/30"><CardContent className="pt-6 flex items-center gap-6">
        <div className="w-20 h-20 rounded-full border-4 border-green-500 flex items-center justify-center"><span className="text-2xl font-bold">76</span></div>
        <div><div className="text-lg font-semibold">Security Posture Score</div><p className="text-sm text-muted-foreground">Based on vulnerability scans, policy compliance, and incident response</p></div>
      </CardContent></Card>
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-400" /><div><div className="text-sm text-muted-foreground">Critical Vulns</div><div className="text-2xl font-bold text-red-400">3</div></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-2"><Bug className="w-5 h-5 text-yellow-400" /><div><div className="text-sm text-muted-foreground">Open CVEs</div><div className="text-2xl font-bold text-yellow-400">8</div></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-2"><Scan className="w-5 h-5 text-orange-400" /><div><div className="text-sm text-muted-foreground">Failed Scans</div><div className="text-2xl font-bold text-orange-400">2</div></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-2"><Shield className="w-5 h-5 text-blue-400" /><div><div className="text-sm text-muted-foreground">Security Incidents</div><div className="text-2xl font-bold">5</div></div></div></CardContent></Card>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle>Recent Alerts</CardTitle></CardHeader><CardContent className="space-y-3">
          {alerts.map((a, i) => (<div key={i} className="flex items-center gap-3 p-2 rounded border border-border/50">
            <span className={`px-2 py-0.5 rounded text-xs ${sevColor(a.severity)}`}>{a.severity}</span>
            <span className="text-sm flex-1">{a.msg}</span>
            <span className="text-xs text-muted-foreground">{a.time}</span>
          </div>))}
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3">
          {[["Attack Surface","Map exposure points",Swords],["Vulnerability Scan","Run security scan",Scan],["Red Team Lab","Adversarial testing",Bug],["Security Reports","Generate reports",FileText]].map(([title, desc, Icon]: any, i: number) => (
            <div key={i} className="p-4 rounded-lg border border-border/50 hover:border-green-500/30 cursor-pointer transition-colors">
              <Icon className="w-6 h-6 text-green-400 mb-2" /><div className="font-medium text-sm">{title}</div><div className="text-xs text-muted-foreground">{desc}</div>
            </div>
          ))}
        </CardContent></Card>
      </div>
    </div>);
}
