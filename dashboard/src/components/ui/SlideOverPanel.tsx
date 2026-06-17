import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { AuditTrail } from './AuditTrail';

export interface SlideOverPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  entityType?: string;
  entityId?: string;
  children: React.ReactNode;
}

export function SlideOverPanel({
  open,
  onOpenChange,
  title,
  entityType,
  entityId,
  children,
}: SlideOverPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-[480px] sm:max-w-[480px] p-0 flex flex-col h-full rounded-none"
        style={{
          background: 'hsl(var(--bg-surface))',
          borderLeft: '1px solid hsl(var(--border))',
        }}
      >
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="text-sm font-bold uppercase tracking-wider text-text-primary">
            {title}
          </SheetTitle>
        </SheetHeader>
        
        {entityType && entityId ? (
          <Tabs defaultValue="form" className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="border-b border-border bg-bg-sunken px-4">
              <TabsList className="h-9 rounded-none bg-transparent p-0 gap-4">
                <TabsTrigger
                  value="form"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand bg-transparent data-[state=active]:bg-transparent px-0 py-2 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-1))]"
                >
                  Editor
                </TabsTrigger>
                <TabsTrigger
                  value="audit"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand bg-transparent data-[state=active]:bg-transparent px-0 py-2 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-1))]"
                >
                  Audit History
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="form" className="flex-1 overflow-y-auto p-4 m-0">
              {children}
            </TabsContent>
            
            <TabsContent value="audit" className="flex-1 overflow-hidden m-0">
              <AuditTrail entityType={entityType} entityId={entityId} className="h-full" />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex-1 overflow-y-auto p-4">
            {children}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default SlideOverPanel;
