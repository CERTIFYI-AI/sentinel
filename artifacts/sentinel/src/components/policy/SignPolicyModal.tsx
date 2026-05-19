import { useState } from "react";

interface Props {
  policyId: string;
  onClose: () => void;
  onSign: (signature: string) => void;
}

export default function SignPolicyModal({ policyId, onClose, onSign }: Props) {
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "hsl(var(--card))", borderRadius: "0.75rem", padding: "1.5rem", width: "400px", }}>
        <h2 style={{ margin: "0 0 1rem", fontSize: "1.25rem", fontWeight: 600 }}>Sign Policy</h2>
        <p style={{ color: "hsl(var(--muted-foreground))", marginBottom: "1rem" }}>By signing, you acknowledge that you have read and agree to comply with this policy.</p>
        <input placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} style={{ width: "100%", padding: "0.5rem", marginBottom: "0.75rem", border: "1px solid hsl(var(--border))", borderRadius: "0.375rem", }} />
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", cursor: "pointer" }}>
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
          <span style={{ fontSize: "0.85rem" }}>I agree to comply with this policy</span>
        </label>
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "0.5rem 1rem", border: "1px solid hsl(var(--border))", borderRadius: "0.375rem", background: "none", cursor: "pointer", }}>Cancel</button>
          <button onClick={() => agreed && name && onSign(name)} disabled={!agreed || !name} style={{ padding: "0.5rem 1rem", background: agreed && name ? "hsl(var(--primary))" : "hsl(var(--muted))", color: "hsl(var(--primary-foreground))", border: "none", borderRadius: "0.375rem", cursor: agreed && name ? "pointer" : "not-allowed", }}>Sign</button>
        </div>
      </div>
    </div>
  );
}
