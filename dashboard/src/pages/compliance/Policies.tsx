import { useState } from "react";
import { usePolicyData } from "../../lib/hooks/usePolicyData";

type Tab = "all" | "drafts" | "pending" | "approved" | "archived";

export default function Policies() {
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [frameworkFilter, setFrameworkFilter] = useState("");
  const [selectedPolicy, setSelectedPolicy] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const { policies, isLoading, frameworks } = usePolicyData();

  const filtered = (policies || []).filter((p: any) => {
    if (activeTab !== "all" && p.status?.toLowerCase() !== activeTab) return false;
    if (search && !p.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (frameworkFilter && p.framework !== frameworkFilter) return false;
    return true;
  });

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: "All Policies" },
    { key: "drafts", label: "Drafts" },
    { key: "pending", label: "Pending Review" },
    { key: "approved", label: "Approved" },
    { key: "archived", label: "Archived" },
  ];

  const statusColor: Record<string, string> = {
    DRAFT: "hsl(var(--warning))",
    PENDING_REVIEW: "hsl(var(--info))",
    APPROVED: "hsl(var(--success))",
    ARCHIVED: "hsl(var(--muted))",
  };

  return (
    <div style={{ padding: "1.5rem", fontFamily: "Outfit, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0, color: "hsl(var(--foreground))" }}>
            Policy Management
          </h1>
          <p style={{ color: "hsl(var(--muted-foreground))", margin: "0.25rem 0 0" }}>
            Manage compliance policies across {frameworks?.length || 0} frameworks
          </p>
        </div>
        <button
          onClick={() => setShowEditor(true)}
          style={{
            background: "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
            border: "none",
            borderRadius: "0.5rem",
            padding: "0.5rem 1rem",
            cursor: "pointer",
            fontFamily: "Outfit, sans-serif",
            fontWeight: 500,
          }}
        >
          + New Policy
        </button>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", borderBottom: "1px solid hsl(var(--border))" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: "0.5rem 1rem",
              background: "none",
              border: "none",
              borderBottom: activeTab === t.key ? "2px solid hsl(var(--primary))" : "2px solid transparent",
              color: activeTab === t.key ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
              cursor: "pointer",
              fontFamily: "Outfit, sans-serif",
              fontWeight: activeTab === t.key ? 600 : 400,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Search policies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            padding: "0.5rem 0.75rem",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.375rem",
            fontFamily: "Outfit, sans-serif",
            background: "hsl(var(--background))",
            color: "hsl(var(--foreground))",
          }}
        />
        <select
          value={frameworkFilter}
          onChange={(e) => setFrameworkFilter(e.target.value)}
          style={{
            padding: "0.5rem 0.75rem",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.375rem",
            fontFamily: "Outfit, sans-serif",
            background: "hsl(var(--background))",
            color: "hsl(var(--foreground))",
          }}
        >
          <option value="">All Frameworks</option>
          {(frameworks || []).map((fw: string) => (
            <option key={fw} value={fw}>{fw}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "hsl(var(--muted-foreground))" }}>
          Loading policies...
        </div>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {filtered.map((policy: any) => (
            <div
              key={policy.id}
              onClick={() => setSelectedPolicy(policy.id)}
              style={{
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
                padding: "1rem",
                cursor: "pointer",
                background: "hsl(var(--card))",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "hsl(var(--primary))")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "hsl(var(--border))")}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, color: "hsl(var(--foreground))" }}>
                    {policy.name}
                  </h3>
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "hsl(var(--muted-foreground))" }}>
                    {policy.framework} \u00b7 v{policy.version}
                  </p>
                </div>
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    padding: "0.15rem 0.5rem",
                    borderRadius: "1rem",
                    background: statusColor[policy.status] || "hsl(var(--muted))",
                    color: "white",
                  }}
                >
                  {policy.status}
                </span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "3rem", color: "hsl(var(--muted-foreground))" }}>
              No policies found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
