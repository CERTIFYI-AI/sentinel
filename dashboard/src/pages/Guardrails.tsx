import { Lock } from 'lucide-react';
export default function Guardrails() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Lock className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Guardrails</h1>
          <p className="text-muted-foreground">Manage and monitor guardrails</p>
        </div>
      </div>
      <div className="rounded-lg border bg-card p-8 text-center">
        <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No guardrails data available yet.</p>
      </div>
    </div>
  );
}
