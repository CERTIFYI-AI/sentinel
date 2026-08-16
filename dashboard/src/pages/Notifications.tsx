// SPDX-License-Identifier: Apache-2.0
// Notifications — the full-page view over the REAL org-scoped `notifications`
// table (the same rows the drawer and the mesh's notificationAgent use;
// broadcast rows carry user_id='system' under the org-broadcast RLS policy).
// The former demo `notifications_table` + hardcoded seed list were removed:
// every card below is a stored row, mark-as-read is a checked write, and an
// empty inbox says so honestly.
import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, AlertTriangle, Shield, Clock, Info, Filter, CheckCheck } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  useNotificationsData,
  notificationTone,
  type NotificationRow,
} from "@/components/ui/NotificationDrawer";
import { formatDate } from "../data/seed";

const toneConfig: Record<"critical" | "warning" | "info", { color: string; bg: string; borderColor: string; icon: typeof Bell }> = {
  critical: { color: "text-[hsl(var(--s-er-tx))]", bg: "bg-[hsl(var(--s-er-bg))]", borderColor: "border-l-[hsl(var(--s-er-tx))]", icon: AlertTriangle },
  warning: { color: "text-[hsl(var(--s-wn-tx))]", bg: "bg-[hsl(var(--s-wn-bg))]", borderColor: "border-l-[hsl(var(--s-wn-tx))]", icon: Shield },
  info: { color: "text-[hsl(var(--s-in-tx))]", bg: "bg-[hsl(var(--s-in-bg))]", borderColor: "border-l-[hsl(var(--s-in-tx))]", icon: Info },
};

export default function Notifications() {
  const { items, isLoading, error, markRead, markAllRead } = useNotificationsData(100);
  const [filter, setFilter] = useState<"all" | "unread" | "critical" | "warning" | "info">("all");

  const unread = items.filter(n => !n.isRead);
  const unreadCount = unread.length;
  const filtered = items.filter(n => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.isRead;
    return notificationTone(n.notificationType) === filter;
  });

  const handleMarkRead = (n: NotificationRow) => {
    if (!n.isRead) markRead(n.id).catch(() => { /* hook toasts the error */ });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Notifications"
        subtitle={
          isLoading
            ? "Loading…"
            : error
              ? "Notifications unavailable"
              : `${unreadCount > 0 ? `${unreadCount} unread` : "All caught up"} · Governance events recorded by the platform and the agent mesh`
        }
        icon={Bell}
        actions={unreadCount > 0 ? (
          <button
            onClick={() => markAllRead(unread.map(n => n.id)).catch(() => { /* hook toasts */ })}
            className="flex items-center gap-1.5 text-xs text-[hsl(var(--s-ok-tx))] hover:underline font-medium"
          >
            <CheckCheck size={14} /> Mark all read
          </button>
        ) : undefined}
      />

      {/* Real query error state */}
      {error && (
        <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load notifications</p>
          <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{(error as Error).message}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter size={14} className="text-[hsl(var(--text-4))]" />
        {(["all", "unread", "critical", "warning", "info"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-xs rounded-lg capitalize font-medium transition-colors ${
            filter === f ? "bg-[hsl(var(--s-ok-tx))] text-[hsl(var(--bg-surface))]" : "bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border))] text-[hsl(var(--text-3))] hover:bg-[hsl(var(--bg-muted))]"
          }`}>{f}</button>
        ))}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-[hsl(var(--bg-raised))] animate-pulse" />
          ))}
        </div>
      )}

      {/* Honest empty states */}
      {!isLoading && !error && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 border border-[hsl(var(--border))]" style={{ color: "hsl(var(--text-4))" }}>
          <Bell size={32} className="mb-2 opacity-40" />
          <p className="text-sm font-medium" style={{ color: "hsl(var(--text-3))" }}>No notifications yet</p>
          <p className="text-xs mt-1 max-w-md text-center">
            Governance events — new incidents, detected risks, HITL reviews, regulator notifications —
            appear here as the platform and the agent mesh record them.
          </p>
        </div>
      )}
      {!isLoading && !error && items.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 border border-[hsl(var(--border))]" style={{ color: "hsl(var(--text-4))" }}>
          <Bell size={28} className="mb-2 opacity-40" />
          <p className="text-sm">No notifications match this filter</p>
        </div>
      )}

      {/* Notification List — real rows only */}
      <div className="space-y-2">
        {filtered.map(n => {
          const tone = notificationTone(n.notificationType);
          const tc = toneConfig[tone];
          const Icon = tc.icon;
          return (
            <Card key={n.id} className={`border-l-4 ${tc.borderColor} ${!n.isRead ? tc.bg : "bg-[hsl(var(--bg-surface))]"} border-[hsl(var(--border))] hover:shadow-sm transition-shadow cursor-pointer`} onClick={() => handleMarkRead(n)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex-shrink-0 ${tc.color}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-semibold ${!n.isRead ? "text-[hsl(var(--text-1))]" : "text-[hsl(var(--text-2))]"}`}>{n.title}</h3>
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-[hsl(var(--s-in-tx))] flex-shrink-0" />}
                    </div>
                    {n.message && <p className="text-xs text-[hsl(var(--text-3))] mt-0.5 break-words">{n.message}</p>}
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-[hsl(var(--text-4))]">
                      <span className="flex items-center gap-1"><Clock size={10} /> {formatDate(n.createdAt)}</span>
                      <span className="capitalize">{n.notificationType.replace(/_/g, " ").toLowerCase()}</span>
                      {n.urlPath && (
                        <Link
                          to={n.urlPath}
                          onClick={e => { e.stopPropagation(); handleMarkRead(n); }}
                          className="text-[hsl(var(--brand))] hover:underline font-medium"
                        >
                          View {n.entityType ?? "record"} →
                        </Link>
                      )}
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
