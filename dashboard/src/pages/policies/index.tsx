import { Shield } from 'lucide-react';
export default function Policies() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compliance Policies</h1>
          <p className="text-muted-foreground">Manage and monitor compliance policies</p>
        </div>
      </div>
      <div className="rounded-lg border bg-card p-8 text-center">
        <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No compliance policies data available yet.</p>
      </div>
    </div>
  );
}
