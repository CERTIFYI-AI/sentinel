import React from 'react';
import { cn } from '../../lib/utils';
type Variant="default"|"destructive"|"outline"|"secondary"|"ghost"|"link";
type Size="default"|"sm"|"lg"|"icon";
const variants:Record<Variant,string>={default:"bg-emerald-600 text-white hover:bg-emerald-700",destructive:"bg-red-600 text-white hover:bg-red-700",outline:"border border-border bg-transparent hover:bg-muted",secondary:"bg-zinc-800 text-white hover:bg-zinc-700",ghost:"hover:bg-muted",link:"text-emerald-400 underline-offset-4 hover:underline"};
const sizes:Record<Size,string>={default:"h-9 px-4 py-2",sm:"h-8 rounded-sm px-3 text-xs",lg:"h-10 rounded-sm px-8",icon:"h-9 w-9"};
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>{variant?:Variant;size?:Size;}
export const Button=React.forwardRef<HTMLButtonElement,ButtonProps>(({className,variant="default",size="default",...p},r)=>(<button ref={r} className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-sm text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",variants[variant],sizes[size],className)} {...p}/>));
Button.displayName="Button";
export default Button;
