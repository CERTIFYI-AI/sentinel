import React from "react";

interface EvidenceEntry {
  timestamp: string;
  controlId: string;
  status: "PASS" | "FAIL" | "NA";
  signalKey: string;
  signalValue: string | number | null;
  remediation?: string;
  scopeNote?: string;
}

interface Props { entries: EvidenceEntry[]; maxEntries?: number; }

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  PASS: { bg: "#dcfce7", text: "#166534", label: "PASS" },
  FAIL: { bg: "#fef2f2", text: "#991b1b", label: "FAIL" },
  NA: { bg: "#f3f4f6", text: "#4b5563", label: "N/A" },
};

export const EvidenceTimeline: React.FC<Props> = ({ entries, maxEntries = 50 }) => {
  const sorted = [...entries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, maxEntries);
  return (
    <div style={{ padding: 16 }}>
      <h4 style={{ margin: "0 0 12px 0" }}>Evidence Timeline</h4>
      <div style={{ position: "relative", paddingLeft: 24 }}>
        <div style={{ position: "absolute", left: 8, top: 0, bottom: 0, width: 2, background: "#e5e7eb" }} />
        {sorted.map((e, i) => {
          const st = STATUS_STYLES[e.status] || STATUS_STYLES.NA;
          return (
            <div key={i} style={{ marginBottom: 16, position: "relative" }}>
              <div style={{ position: "absolute", left: -20, top: 4, width: 12, height: 12, borderRadius: "50%", background: st.bg, border: `2px solid ${st.text}` }} />
              <div style={{ fontSize: 11, color: "#9ca3af" }}>{new Date(e.timestamp).toLocaleString()}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: st.bg, color: st.text }}>{st.label}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{e.controlId}</span>
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Signal: {e.signalKey} = {String(e.signalValue ?? "n/a")}</div>
              {e.status === "FAIL" && e.remediation && <div style={{ fontSize: 11, color: "#dc2626", marginTop: 2 }}>Remediation: {e.remediation}</div>}
              {e.status === "NA" && e.scopeNote && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2, fontStyle: "italic" }}>Scope: {e.scopeNote}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
