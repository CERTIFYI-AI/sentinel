import { Search } from 'lucide-react';
export default function BiasAudits() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Search className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bias Audits</h1>
          <p className="text-muted-foreground">Manage and monitor bias audits</p>
        </div>
      </div>
      <div className="rounded-lg border bg-card p-8 text-center">
        <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No bias audits data available yet.</p>
      </div>
    </div>
  );
}
