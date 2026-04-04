import { Bot } from 'lucide-react';
export default function AgentDiscovery() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Bot className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Agent Discovery</h1>
      </div>
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">No data available yet.</p>
      </div>
    </div>
  );
}
