import { AlertTriangle } from 'lucide-react';
export default function Incidents() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Incidents</h1>
          <p className="text-muted-foreground">Manage and monitor incidents</p>
        </div>
      </div>
      <div className="rounded-lg border bg-card p-8 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No incidents data available yet.</p>
      </div>
    </div>
  );
}
