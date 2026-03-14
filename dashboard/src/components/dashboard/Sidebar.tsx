import { Link, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";

const modules = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard", path: "/overview", icon: "\u2302" },
    ],
  },
  {
    label: "Trust & Safety",
    items: [
      { name: "Audit Log", path: "/audit-log", icon: "\u2637" },
      { name: "HITL Queue", path: "/hitl-queue", icon: "\u2691" },
      { name: "Incident Log", path: "/incidents", icon: "\u26a0" },
    ],
  },
  {
    label: "Compliance",
    items: [
      { name: "Compliance", path: "/compliance", icon: "\u2611" },
      { name: "Evidence Vault", path: "/evidence", icon: "\u2603" },
      { name: "Policy Editor", path: "/policies", icon: "\u270e" },
    ],
  },
  {
    label: "Risk & Models",
    items: [
      { name: "Model Inventory", path: "/models", icon: "\u2699" },
      { name: "Risk Matrix", path: "/risk-matrix", icon: "\u25a6" },
      { name: "Benchmark", path: "/benchmark", icon: "\u2261" },
    ],
  },
  {
    label: "Operations",
    items: [
      { name: "Remediation", path: "/remediation", icon: "\u2692" },
      { name: "Export Center", path: "/exports", icon: "\u21e9" },
      { name: "Notifications", path: "/notifications", icon: "\u266a" },
      { name: "Settings", path: "/settings", icon: "\u2699" },
    ],
  },
];

export function Sidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="w-56 border-r bg-card flex flex-col h-full">
      <div className="p-4 border-b">
        <Link to="/overview" className="flex items-center gap-2">
          <span className="text-xl font-bold text-[#1A6B5A]">Sentinel</span>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {modules.map((mod) => (
          <div key={mod.label}>
            <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {mod.label}
            </p>
            <div className="space-y-0.5">
              {mod.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 rounded-none px-3 py-2 text-sm transition-colors",
                    pathname === item.path
                      ? "bg-[#1A6B5A] text-white"
                      : "text-muted-foreground hover:bg-muted hover:text-accent-foreground"
                  )}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
