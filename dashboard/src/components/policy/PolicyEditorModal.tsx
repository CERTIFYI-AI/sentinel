import { useState } from "react";

interface Props {
  policyId?: string;
  onClose: () => void;
  onSave: (data: any) => void;
}

export default function PolicyEditorModal({ policyId, onClose, onSave }: Props) {
  const [name, setName] = useState("");
  const [framework, setFramework] = useState("");
  const [body, setBody] = useState("");

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "hsl(var(--card))", borderRadius: "0.75rem", padding: "1.5rem", width: "640px", maxHeight: "80vh", overflowY: "auto", fontFamily: "Outfit, sans-serif" }}>
        <h2 style={{ margin: "0 0 1rem", fontSize: "1.25rem", fontWeight: 600 }}>{policyId ? "Edit" : "New"} Policy</h2>
        <input placeholder="Policy Name" value={name} onChange={e => setName(e.target.value)} style={{ width: "100%", padding: "0.5rem", marginBottom: "0.75rem", border: "1px solid hsl(var(--border))", borderRadius: "0.375rem", fontFamily: "Outfit, sans-serif" }} />
        <input placeholder="Framework" value={framework} onChange={e => setFramework(e.target.value)} style={{ width: "100%", padding: "0.5rem", marginBottom: "0.75rem", border: "1px solid hsl(var(--border))", borderRadius: "0.375rem", fontFamily: "Outfit, sans-serif" }} />
        <textarea placeholder="Policy body (Markdown)" value={body} onChange={e => setBody(e.target.value)} rows={12} style={{ width: "100%", padding: "0.5rem", marginBottom: "1rem", border: "1px solid hsl(var(--border))", borderRadius: "0.375rem", fontFamily: "Outfit, sans-serif", resize: "vertical" }} />
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "0.5rem 1rem", border: "1px solid hsl(var(--border))", borderRadius: "0.375rem", background: "none", cursor: "pointer", fontFamily: "Outfit, sans-serif" }}>Cancel</button>
          <button onClick={() => onSave({ name, framework, body })} style={{ padding: "0.5rem 1rem", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", border: "none", borderRadius: "0.375rem", cursor: "pointer", fontFamily: "Outfit, sans-serif" }}>Save</button>
        </div>
      </div>
    </div>
  );
}
