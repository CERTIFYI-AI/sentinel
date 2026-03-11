import { useState } from "react";

interface Props {
  policyId: string;
  onClose: () => void;
}

export default function SharePolicyModal({ policyId, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const shareUrl = window.location.origin + "/policies/public/" + policyId;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "hsl(var(--card))", borderRadius: "0.75rem", padding: "1.5rem", width: "400px", fontFamily: "Outfit, sans-serif" }}>
        <h2 style={{ margin: "0 0 1rem", fontSize: "1.25rem", fontWeight: 600 }}>Share Policy</h2>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          <input readOnly value={shareUrl} style={{ flex: 1, padding: "0.5rem", border: "1px solid hsl(var(--border))", borderRadius: "0.375rem", fontFamily: "Outfit, sans-serif", fontSize: "0.85rem" }} />
          <button onClick={copyLink} style={{ padding: "0.5rem 1rem", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", border: "none", borderRadius: "0.375rem", cursor: "pointer", fontFamily: "Outfit, sans-serif" }}>{copied ? "Copied!" : "Copy"}</button>
        </div>
        <button onClick={onClose} style={{ width: "100%", padding: "0.5rem", border: "1px solid hsl(var(--border))", borderRadius: "0.375rem", background: "none", cursor: "pointer", fontFamily: "Outfit, sans-serif" }}>Close</button>
      </div>
    </div>
  );
}
