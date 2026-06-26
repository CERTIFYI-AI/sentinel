import React from "react";
import { LegalWeightBadge } from "./LegalWeightBadge";
import { ComplianceScoreGauge } from "./ComplianceScoreGauge";

interface Props {
  frameworkId: string;
  displayName: string;
  legalWeight: "mandatory-law" | "best-practice" | "voluntary-standard";
  version: string;
  totalControls: number;
  inScopeControls: number;
  passCount: number;
  failCount: number;
  naCount: number;
  lastEvaluated: string | null;
  onSelect?: (id: string) => void;
}

const WEIGHT_COLORS: Record<string, string> = {
  "mandatory-law": "#dc2626",
  "best-practice": "#2563eb",
  "voluntary-standard": "#059669",
};

export const FrameworkStatusCard: React.FC<Props> = ({
  frameworkId, displayName, legalWeight, version,
  totalControls, inScopeControls, passCount, failCount, naCount,
  lastEvaluated, onSelect,
}) => {
  const score = inScopeControls > 0 ? Math.round((passCount / inScopeControls) * 100) : 0;
  const borderColor = WEIGHT_COLORS[legalWeight] || "#6b7280";
  return (
    <div onClick={() => onSelect?.(frameworkId)} style={{ border: `2px solid ${borderColor}`, borderRadius: 8, padding: 16, cursor: onSelect ? "pointer" : "default", background: "#fff" }} role="button" tabIndex={0}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div><h3 style={{ margin: 0 }}>{displayName}</h3><span style={{ fontSize: 12, color: "#6b7280" }}>v{version}</span></div>
        <LegalWeightBadge weight={legalWeight} />
      </div>
      <div style={{ margin: "12px 0", textAlign: "center" }}><ComplianceScoreGauge score={score} size={80} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center", fontSize: 13 }}>
        <div><div style={{ fontWeight: 600, color: "#16a34a" }}>{passCount}</div><div style={{ color: "#6b7280" }}>Pass</div></div>
        <div><div style={{ fontWeight: 600, color: "#dc2626" }}>{failCount}</div><div style={{ color: "#6b7280" }}>Fail</div></div>
        <div><div style={{ fontWeight: 600, color: "#9ca3af" }}>{naCount}</div><div style={{ color: "#6b7280" }}>N/A</div></div>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: "#9ca3af", textAlign: "center" }}>{totalControls} total | {inScopeControls} in scope</div>
      {legalWeight === "mandatory-law" && <div style={{ marginTop: 8, padding: "6px 8px", background: "#fef3c7", borderRadius: 4, fontSize: 11, color: "#92400e" }}>Legal counsel review recommended</div>}
      {frameworkId === "ieee7000" && <div style={{ marginTop: 8, padding: "6px 8px", background: "#dbeafe", borderRadius: 4, fontSize: 11, color: "#1e40af" }}>Design-time controls require manual evidence</div>}
      {lastEvaluated && <div style={{ marginTop: 8, fontSize: 11, color: "#9ca3af", textAlign: "right" }}>Last: {new Date(lastEvaluated).toLocaleString()}</div>}
      <div style={{ marginTop: 4, fontSize: 10, color: "#9ca3af", textAlign: "center", fontStyle: "italic" }}>Sentinel provides evidence, not a legal opinion</div>
    </div>
  );
};
