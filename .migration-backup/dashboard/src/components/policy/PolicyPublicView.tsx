export default function PolicyPublicView({ policyId }: { policyId: string }) {
  return (
    <div style={{ maxWidth: "800px", margin: "2rem auto", padding: "2rem", }}>
      <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", padding: "2rem" }}>
        <h1 style={{ margin: "0 0 1rem", fontSize: "1.5rem", fontWeight: 600, color: "hsl(var(--foreground))" }}>Policy Document</h1>
        <p style={{ color: "hsl(var(--muted-foreground))" }}>Policy ID: {policyId}</p>
        <p style={{ color: "hsl(var(--muted-foreground))" }}>Loading public policy view...</p>
      </div>
    </div>
  );
}
