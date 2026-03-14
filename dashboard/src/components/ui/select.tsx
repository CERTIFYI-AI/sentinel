import React from 'react';
import { cn } from '../../lib/utils';
export const Select = ({children,...p}:any) => <div {...p}>{children}</div>;
export const SelectTrigger = React.forwardRef<HTMLButtonElement,any>(({className,children,...p},r)=>(<button ref={r} className={cn("flex h-9 w-full items-center justify-between rounded-sm border border-border bg-card px-3 py-2 text-sm",className)} {...p}>{children}</button>));
SelectTrigger.displayName="SelectTrigger";
export const SelectValue = ({placeholder,...p}:any)=><span {...p}>{placeholder}</span>;
export const SelectContent = ({children,...p}:any)=><div className="bg-card border border-border rounded-sm p-1" {...p}>{children}</div>;
export const SelectItem = ({children,value,...p}:any)=><div className="px-2 py-1.5 text-sm cursor-pointer hover:bg-muted" data-value={value} {...p}>{children}</div>;
