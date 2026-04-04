
import React from 'react';
import { CircleNotch } from '@phosphor-icons/react';

type Variant = 'primary'|'secondary'|'outline'|'ghost'|'danger'|'danger-solid';
type Size = 'xs'|'sm'|'md'|'lg'|'icon'|'icon-sm';
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<Variant, React.CSSProperties> = {
  primary: { background: 'hsl(var(--brand))', color: '#fff', border: 'none' },
  secondary: { background: 'hsl(var(--bg-raised))', color: 'hsl(var(--text-2))', border: '1px solid hsl(var(--border))' },
  outline: { background: 'transparent', color: 'hsl(var(--text-2))', border: '1px solid hsl(var(--border-mid))' },
  ghost: { background: 'transparent', color: 'hsl(var(--text-3))', border: 'none' },
  danger: { background: 'transparent', color: 'hsl(var(--s-er-tx))', border: '1px solid hsl(var(--s-er-br))' },
  'danger-solid': { background: 'hsl(var(--s-er-tx))', color: '#fff', border: 'none' },
};
const sizeStyles: Record<Size, React.CSSProperties> = {
  xs: { fontSize: 11, padding: '2px 8px', gap: 4 },
  sm: { fontSize: 12, padding: '4px 12px', gap: 6 },
  md: { fontSize: 13, padding: '6px 14px', gap: 6 },
  lg: { fontSize: 14, padding: '8px 18px', gap: 8 },
  icon: { padding: '6px', fontSize: 16 },
  'icon-sm': { padding: '4px', fontSize: 14 },
};

export function SentinelButton({ variant='primary', size='md', isLoading, leftIcon, rightIcon, children, disabled, style, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || isLoading}
      style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', cursor: disabled||isLoading?'not-allowed':'pointer', opacity: disabled?0.5:1, fontWeight:500, transition:'all 0.15s', outline:'none', ...variantStyles[variant], ...sizeStyles[size], ...style }}
    >
      {isLoading ? <CircleNotch size={14} className="animate-spin" /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
}
export { SentinelButton as Btn };
