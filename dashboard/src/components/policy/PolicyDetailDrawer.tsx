import { useState } from "react";

interface Props {
  policyId: string;
  onClose: () => void;
}

export default function PolicyDetailDrawer({ policyId, onClose }: Props) {
  return (
    <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "480px", background: "hsl(var(--card))", borderLeft: "1px solid hsl(var(--border))", zIndex: 50, padding: "1.5rem", overflowY: "auto", fontFamily: "Outfit, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>Policy Details</h2>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "hsl(var(--muted-foreground))" }}>&times;</button>
      </div>
      <div style={{ color: "hsl(var(--muted-foreground))" }}>
        <p>Policy ID: {policyId}</p>
        <p>Loading policy details...</p>
      </div>
    </div>
  );
}
