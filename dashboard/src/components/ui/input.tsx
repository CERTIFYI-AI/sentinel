import React from 'react';
import { cn } from '../../lib/utils';
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement>{}
export const Input=React.forwardRef<HTMLInputElement,InputProps>(({className,...p},r)=>(<input ref={r} className={cn("flex h-9 w-full rounded-sm border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50",className)} {...p}/>));
Input.displayName="Input";
export default Input;
