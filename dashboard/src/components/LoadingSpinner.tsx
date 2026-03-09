// src/components/LoadingSpinner.tsx
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
}

const sizes = { sm: "w-4 h-4", md: "w-8 h-8", lg: "w-12 h-12" };

export default function LoadingSpinner({
  className,
  size = "md",
  label = "Loading...",
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 min-h-[200px]",
        className
      )}
      role="status"
      aria-label={label}
    >
      <Loader2 className={cn("animate-spin text-emerald-600", sizes[size])} />
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
    </div>
  );
}
