import React, { useState } from "react";

interface Props {
  frameworks: string[];
  onExport: (format: string, frameworkIds: string[]) => void;
}

export const ComplianceExportPanel: React.FC<Props> = ({ frameworks, onExport }) => {
  const [format, setFormat] = useState("pdf");
  const [selected, setSelected] = useState<string[]>(frameworks);
  const toggle = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  return (
    <div style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff" }}>
      <h4 style={{ margin: "0 0 12px 0" }}>Export Compliance Report</h4>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Format</label>
        <select value={format} onChange={e => setFormat(e.target.value)} style={{ padding: "6px 8px", borderRadius: 4, border: "1px solid #d1d5db", fontSize: 13 }}>
          <option value="pdf">PDF</option><option value="csv">CSV</option><option value="json">JSON</option>
        </select>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Frameworks</label>
        {frameworks.map(fw => (
          <label key={fw} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, marginBottom: 4, cursor: "pointer" }}>
            <input type="checkbox" checked={selected.includes(fw)} onChange={() => toggle(fw)} />{fw}
          </label>
        ))}
      </div>
      <button onClick={() => onExport(format, selected)} disabled={selected.length === 0} style={{ padding: "8px 16px", borderRadius: 4, border: "none", background: selected.length > 0 ? "#2563eb" : "#9ca3af", color: "#fff", fontSize: 13, fontWeight: 600, cursor: selected.length > 0 ? "pointer" : "not-allowed" }}>Export {format.toUpperCase()}</button>
      <div style={{ marginTop: 8, fontSize: 10, color: "#9ca3af", fontStyle: "italic" }}>Sentinel provides evidence, not a legal opinion. Reports require human review.</div>
    </div>
  );
};
