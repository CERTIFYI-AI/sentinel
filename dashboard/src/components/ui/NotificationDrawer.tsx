// dashboard/src/components/ui/NotificationDrawer.tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { AlertCircle, TrendingDown, Users, Shield, CheckCircle } from "lucide-react";

interface Notification {
  id: string;
  type: "cb_open" | "trust_drop" | "hitl_depth" | "chain_violation" | "report_ready";
  title: string;
  description: string;
  link: string;
  ago: string;
  read: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: "1", type: "cb_open", title: "Circuit breaker opened", description: "Provider: Llama 3.1 8B \u2014 7 consecutive failures", link: "/models", ago: "2m ago", read: false },
  { id: "2", type: "trust_drop", title: "Trust score degradation", description: "Average trust dropped to 0.82 (below 0.85)", link: "/overview", ago: "15m ago", read: false },
  { id: "3", type: "hitl_depth", title: "HITL queue growing", description: "3 pending reviews \u2014 avg wait 4 minutes", link: "/hitl", ago: "22m ago", read: true },
  { id: "4", type: "chain_violation", title: "Chain integrity verified", description: "14,820 entries \u2014 no tampering detected", link: "/audit", ago: "1h ago", read: true },
  { id: "5", type: "report_ready", title: "EU AI Act report ready", description: "Q1 2026 compliance report generated", link: "/compliance", ago: "3h ago", read: true },
];

const iconMap = {
  cb_open: AlertCircle,
  trust_drop: TrendingDown,
  hitl_depth: Users,
  chain_violation: Shield,
  report_ready: CheckCircle,
};

const colorMap = {
  cb_open: "text-red-500",
  trust_drop: "text-amber-500",
  hitl_depth: "text-red-500",
  chain_violation: "text-red-500",
  report_ready: "text-[hsl(136,45%,38%)]",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationDrawer({ open, onOpenChange }: Props) {
  const navigate = useNavigate();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[360px] sm:w-[360px] p-0">
        <SheetHeader className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">Notifications</SheetTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7">Mark all as read</Button>
          </div>
        </SheetHeader>
        <div className="divide-y divide-border">
          {MOCK_NOTIFICATIONS.map((n) => {
            const Icon = iconMap[n.type];
            return (
              <button
                key={n.id}
                onClick={() => { navigate(n.link); onOpenChange(false); }}
                className={`w-full text-left px-4 py-3 hover:bg-accent transition-colors ${n.read ? "opacity-60" : ""}`}
              >
                <div className="flex gap-3">
                  <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${colorMap[n.type]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      <span className="text-[11px] text-muted-foreground shrink-0 ml-2">{n.ago}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
