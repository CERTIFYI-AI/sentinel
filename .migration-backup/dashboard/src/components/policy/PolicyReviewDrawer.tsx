interface Props {
  policyId: string;
  onClose: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
}

export default function PolicyReviewDrawer({ policyId, onClose, onApprove, onReject }: Props) {
  return (
    <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "480px", background: "hsl(var(--card))", borderLeft: "1px solid hsl(var(--border))", zIndex: 50, padding: "1.5rem", overflowY: "auto", }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>Review Policy</h2>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "hsl(var(--muted-foreground))" }}>&times;</button>
      </div>
      <p style={{ color: "hsl(var(--muted-foreground))", marginBottom: "1rem" }}>Review policy {policyId} and approve or reject.</p>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button onClick={onApprove} style={{ flex: 1, padding: "0.5rem", background: "hsl(var(--success, 142 76% 36%))", color: "white", border: "none", borderRadius: "0.375rem", cursor: "pointer", }}>Approve</button>
        <button onClick={() => onReject("Needs revision")} style={{ flex: 1, padding: "0.5rem", background: "hsl(var(--destructive, 0 84% 60%))", color: "white", border: "none", borderRadius: "0.375rem", cursor: "pointer", }}>Reject</button>
      </div>
    </div>
  );
}
