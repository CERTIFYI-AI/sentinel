import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Extend tailwind-merge to recognise our custom design-system colour tokens.
// Without this, twMerge doesn't know that `bg-surface` / `bg-raised` / `bg-sunken`
// conflict with `bg-background` / `bg-card`, so both classes end up in the output
// and whichever one appears last in the CSS wins — causing transparent modals.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "bg-color": [
        "bg-surface",
        "bg-raised",
        "bg-sunken",
        { "bg-surface": ["DEFAULT", "1", "2", "3"] },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}