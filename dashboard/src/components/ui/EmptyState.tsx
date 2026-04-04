// dashboard/src/components/ui/EmptyState.tsx
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  code?: string;
}

export function EmptyState({ icon, title, description, action, code }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] max-w-[480px] mx-auto text-center px-4">
      <span className="text-5xl mb-4">{icon}</span>
      <h3 className="text-base font-bold text-foreground mb-1">{title}</h3>
      <p className="text-[13px] text-muted-foreground mb-4">{description}</p>
      {action && (
        <Button
          onClick={action.onClick}
          className="bg-[hsl(136,45%,38%)] hover:bg-[hsl(136,45%,32%)] text-foreground mb-4"
        >
          {action.label}
        </Button>
      )}
      {code && (
        <pre className="bg-card border border-border rounded-md p-3 text-xs text-left w-full overflow-x-auto">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}
