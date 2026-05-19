import React from "react";

interface ControlHeatmapProps {
  controls: Array<{ controlId: string; status: "PASS" | "FAIL" | "NA"; category: string }>;
  onControlClick?: (controlId: string) => void;
}

const STATUS_COLORS: Record<string, string> = { PASS: "#16a34a", FAIL: "#dc2626", NA: "#9ca3af" };

export const ControlHeatmap: React.FC<ControlHeatmapProps> = ({ controls, onControlClick }) => {
  const grouped = controls.reduce((acc, c) => { (acc[c.category] = acc[c.category] || []).push(c); return acc; }, {} as Record<string, typeof controls>);
  return (
    <div style={{ padding: 16 }}>
      <h4 style={{ margin: "0 0 12px 0" }}>Control Status Heatmap</h4>
      {Object.entries(grouped).map(([cat, ctrls]) => (
        <div key={cat} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#374151" }}>{cat}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {ctrls.map((c) => (
              <div key={c.controlId} onClick={() => onControlClick?.(c.controlId)} title={`${c.controlId}: ${c.status}`} style={{ width: 24, height: 24, borderRadius: 4, background: STATUS_COLORS[c.status] || "#e5e7eb", cursor: onControlClick ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "#fff", fontWeight: 600 }}>{c.status[0]}</div>
            ))}
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 12, marginTop: 12, fontSize: 11, color: "#6b7280" }}>
        <span><span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 2, background: "#16a34a", verticalAlign: "middle", marginRight: 4 }} />Pass</span>
        <span><span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 2, background: "#dc2626", verticalAlign: "middle", marginRight: 4 }} />Fail</span>
        <span><span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 2, background: "#9ca3af", verticalAlign: "middle", marginRight: 4 }} />N/A</span>
      </div>
    </div>
  );
};
