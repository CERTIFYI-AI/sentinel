import React from 'react';
import { cn } from '../../lib/utils';
type Variant="default"|"destructive"|"outline"|"secondary"|"ghost"|"link";
type Size="default"|"sm"|"lg"|"icon";
const variants:Record<Variant,string>={default:"bg-primary text-foreground hover:bg-primary/90",destructive:"bg-red-600 text-foreground hover:bg-red-700",outline:"border border-border bg-transparent hover:bg-muted",secondary:"bg-muted text-foreground hover:bg-muted",ghost:"hover:bg-muted",link:"text-primary underline-offset-4 hover:underline"};
const sizes:Record<Size,string>={default:"h-9 px-4 py-2",sm:"h-8 rounded-sm px-3 text-xs",lg:"h-10 rounded-sm px-8",icon:"h-9 w-9"};
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>{variant?:Variant;size?:Size;}
export const Button=React.forwardRef<HTMLButtonElement,ButtonProps>(({className,variant="default",size="default",...p},r)=>(<button ref={r} className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-sm text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",variants[variant],sizes[size],className)} {...p}/>));
Button.displayName="Button";
export default Button;
