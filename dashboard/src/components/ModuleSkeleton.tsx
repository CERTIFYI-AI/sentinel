import { LucideIcon } from 'lucide-react';
export function ModuleSkeleton({title,description,icon:Icon}:{title:string;description:string;icon:LucideIcon}) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-1">{description}</p>
      </div>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Icon className="h-8 w-8 text-primary"/>
        </div>
        <h2 className="text-lg font-semibold mb-1">Module Under Development</h2>
        <p className="text-sm text-muted-foreground max-w-md">This module is being built. Core data models and API contracts are defined.</p>
      </div>
    </div>
  );
}
