import { useState } from "react";
import { Bell, AlertTriangle, Shield, CheckCircle2, Clock, Info, Filter, CheckCheck } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";

interface Notification {
  id: string;
  type: "critical" | "warning" | "info" | "success";
  title: string;
  description: string;
  source: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: "n1", type: "critical", title: "PII detected in GPT-4o output", description: "Trust score dropped below threshold. HITL review triggered for request req_a3f2. Patient SSN potentially exposed.", source: "Trust Engine", timestamp: "2 min ago", read: false, actionUrl: "/hitl-queue" },
  { id: "n2", type: "critical", title: "EU AI Act compliance deadline approaching", description: "3 critical controls remain unmet for Art.9 (Risk Management) and Art.13 (Transparency). Deadline: Feb 2, 2025.", source: "Compliance", timestamp: "15 min ago", read: false, actionUrl: "/gap-analysis" },
  { id: "n3", type: "warning", title: "Model drift detected — GPT-4o-mini", description: "Trust score deviation of -0.034 over last 24h. Accuracy benchmark dropped below 90% threshold.", source: "Monitoring", timestamp: "1 hour ago", read: false, actionUrl: "/benchmark" },
  { id: "n4", type: "warning", title: "Vendor contract expiring — Mistral AI", description: "Contract expires June 30, 2025. DPA renewal pending. Status: Under Review.", source: "Vendor Mgmt", timestamp: "2 hours ago", read: true, actionUrl: "/vendors" },
  { id: "n5", type: "info", title: "Benchmark suite completed", description: "Scheduled benchmark run completed for 4 models. Claude 3.5 Sonnet passed all checks. Llama 3.1 70B has 3 failures.", source: "Eval Engine", timestamp: "3 hours ago", read: true, actionUrl: "/benchmark" },
  { id: "n6", type: "success", title: "Evidence auto-collected — GDPR", description: "12 new evidence artifacts collected for GDPR framework. Compliance score updated to 92%.", source: "Evidence Engine", timestamp: "4 hours ago", read: true },
  { id: "n7", type: "info", title: "New model registered — Whisper Large V3", description: "Speech-to-text model registered by Voice Team. Risk tier: Limited. Pending initial benchmark.", source: "Model Registry", timestamp: "6 hours ago", read: true, actionUrl: "/models" },
  { id: "n8", type: "warning", title: "Remediation item overdue — REM-005", description: "Red-teaming standardization blocked. Security team dependency unresolved. Original due: Jan 15.", source: "Remediation", timestamp: "8 hours ago", read: true, actionUrl: "/remediation" },
  { id: "n9", type: "success", title: "Incident INC-004 resolved", description: "Latency spike on inference endpoint resolved. Root cause: connection pool exhaustion. P95 latency back to normal.", source: "Incident Mgmt", timestamp: "12 hours ago", read: true, actionUrl: "/incident-log" },
  { id: "n10", type: "info", title: "Weekly compliance digest ready", description: "Your weekly compliance summary report is ready for download. Overall governance score: 83%.", source: "Export Center", timestamp: "1 day ago", read: true, actionUrl: "/export" },
];

const typeConfig: Record<string, { color: string; bg: string; borderColor: string; icon: typeof Bell }> = {
  critical: { color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30", borderColor: "border-l-red-500", icon: AlertTriangle },
  warning: { color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", borderColor: "border-l-amber-500", icon: Shield },
  info: { color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30", borderColor: "border-l-blue-500", icon: Info },
  success: { color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30", borderColor: "border-l-green-500", icon: CheckCircle2 },
};

export default function Notifications() {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [typeFilter, setTypeFilter] = useState("all");

  const unreadCount = notifications.filter(n => !n.read).length;
  const filtered = typeFilter === "all" ? notifications : notifications.filter(n => n.type === typeFilter);

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const markRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 dark:bg-violet-950 rounded-lg"><Bell size={20} className="text-violet-600 dark:text-violet-400" /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Notifications</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {unreadCount > 0 ? `${unreadCount} unread notifications` : "All caught up"} · Alerts from trust engine, compliance, and monitoring
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 hover:underline font-medium">
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter size={14} className="text-slate-400" />
        {["all", "critical", "warning", "info", "success"].map(f => (
          <button key={f} onClick={() => setTypeFilter(f)} className={`px-3 py-1.5 text-xs rounded-lg capitalize font-medium transition-colors ${
            typeFilter === f ? "bg-green-600 text-white" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}>{f}</button>
        ))}
      </div>

      {/* Notification List */}
      <div className="space-y-2">
        {filtered.map(n => {
          const tc = typeConfig[n.type];
          const Icon = tc.icon;
          return (
            <Card key={n.id} className={`border-l-4 ${tc.borderColor} ${!n.read ? tc.bg : "bg-white dark:bg-slate-900"} border-slate-200 dark:border-slate-700 hover:shadow-sm transition-shadow cursor-pointer`} onClick={() => markRead(n.id)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex-shrink-0 ${tc.color}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-semibold ${!n.read ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"}`}>{n.title}</h3>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{n.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                      <span className="flex items-center gap-1"><Clock size={10} /> {n.timestamp}</span>
                      <span>{n.source}</span>
                      {n.actionUrl && <span className="text-green-600 dark:text-green-400 hover:underline font-medium">View Details</span>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
