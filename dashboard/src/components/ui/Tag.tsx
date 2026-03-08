// dashboard/src/components/ui/Tag.tsx
import React from "react";
import { clsx } from "clsx";
import { X } from "lucide-react";

type TagColor = "blue"|"green"|"amber"|"red"|"purple"|"orange"|"zinc";
type TagSize = "sm"|"md"|"lg";

interface TagProps {
  color?: TagColor;
  size?: TagSize;
  removable?: boolean;
  clickable?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

const colorStyles: Record<TagColor, string> = {
  blue: "bg-[hsl(var(--tag-blue-bg))] text-[hsl(var(--tag-blue))] border-[hsl(var(--tag-blue-border))]",
  green: "bg-[hsl(var(--tag-green-bg))] text-[hsl(var(--tag-green))] border-[hsl(var(--tag-green-border))]",
  amber: "bg-[hsl(var(--tag-amber-bg))] text-[hsl(var(--tag-amber))] border-[hsl(var(--tag-amber-border))]",
  red: "bg-[hsl(var(--tag-red-bg))] text-[hsl(var(--tag-red))] border-[hsl(var(--tag-red-border))]",
  purple: "bg-[hsl(var(--tag-purple-bg))] text-[hsl(var(--tag-purple))] border-[hsl(var(--tag-purple-border))]",
  orange: "bg-[hsl(var(--tag-orange-bg))] text-[hsl(var(--tag-orange))] border-[hsl(var(--tag-orange-border))]",
  zinc: "bg-[hsl(var(--tag-zinc-bg))] text-[hsl(var(--tag-zinc))] border-[hsl(var(--tag-zinc-border))]",
};

const sizeStyles: Record<TagSize, string> = {
  sm: "text-[10px] px-[6px] py-[1px]",
  md: "text-[11px] px-2 py-[2px]",
  lg: "text-[12px] px-[10px] py-[3px]",
};

export function Tag({ color="zinc", size="md", removable, clickable, onRemove, onClick, children, className }: TagProps) {
  return (
    <span
      onClick={clickable ? onClick : undefined}
      className={clsx(
        "inline-flex items-center gap-1 border rounded-[4px] font-medium",
        colorStyles[color],
        sizeStyles[size],
        clickable && "cursor-pointer hover:opacity-80",
        removable && "pr-[4px]",
        className
      )}
    >
      {children}
      {removable && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
          className="flex-shrink-0 w-[14px] h-[14px] flex items-center justify-center hover:opacity-70 focus:outline-none"
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
}

export default Tag;
