// dashboard/src/components/ui/Button.tsx
import React from "react";
import { clsx } from "clsx";

type Variant = "primary"|"secondary"|"ghost"|"danger"|"outline"|"brand-outline"|"default";
type Size = "xs"|"sm"|"md"|"lg"|"xl"|"icon";

interface ButtonProps {
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  iconOnly?: boolean;
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: "button"|"submit"|"reset";
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  "aria-label"?: string;
}

const variants: Record<Variant, string> = {
  primary: "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary-hover))] active:bg-[hsl(var(--primary-active))] focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2",
  secondary: "bg-[hsl(var(--surface-3))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]",
  ghost: "bg-transparent text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]",
  danger: "bg-[hsl(var(--destructive-bg))] text-[hsl(var(--destructive))] border border-[hsl(var(--destructive))/30] hover:bg-[hsl(var(--destructive))]/10",
  outline: "bg-transparent border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]",
  "brand-outline": "bg-transparent border border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--brand-subtle))]",
  default: "bg-[hsl(var(--surface-3))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]",
};

const sizes: Record<Size, string> = {
  xs: "h-6 px-2 text-[11px] rounded-[4px]",
  sm: "h-[30px] px-3 text-[12px] rounded-[5px]",
  md: "h-9 px-4 text-[13px] rounded-[6px]",
  lg: "h-[42px] px-5 text-[14px] rounded-[6px]",
  xl: "h-12 px-6 text-[15px] rounded-[8px]",
  icon: "h-9 w-9 p-0",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>((
  { variant="primary", size="md", disabled, loading, fullWidth, leftIcon, rightIcon, iconOnly, children, onClick, type="button", className, style, title, "aria-label": ariaLabel },
  ref
) => {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={ariaLabel}
      title={title}
      disabled={disabled || loading}
      onClick={disabled || loading ? undefined : onClick}
      style={style}
      className={clsx(
        "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 focus:outline-none select-none",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        (disabled || loading) && "opacity-50 cursor-not-allowed",
        iconOnly && "aspect-square px-0",
        className
      )}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
      ) : leftIcon ? (
        <span className="flex-shrink-0">{leftIcon}</span>
      ) : null}
      {!iconOnly && <span className={loading ? "invisible" : ""}>{children}</span>}
      {!loading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
    </button>
  );
});

Button.displayName = "Button";
export default Button;
