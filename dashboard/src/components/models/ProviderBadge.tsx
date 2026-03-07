// src/components/models/ProviderBadge.tsx
const cfg: Record<string, { bg: string; text: string; label: string }> = {
  openai: { bg: "bg-green-900/30", text: "text-green-400", label: "OpenAI" },
  anthropic: { bg: "bg-orange-900/30", text: "text-orange-400", label: "Anthropic" },
  azure: { bg: "bg-blue-900/30", text: "text-blue-400", label: "Azure" },
  local: { bg: "bg-zinc-800", text: "text-zinc-400", label: "Local" },
  custom: { bg: "bg-purple-900/30", text: "text-purple-400", label: "Custom" },
};
export function ProviderBadge({ provider, size = "sm" }: { provider: string; size?: "sm" | "md" }) {
  const c = cfg[provider] || cfg.custom;
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 font-medium ${c.bg} ${c.text} ${size === "md" ? "text-xs" : "text-[10px]"}`}>{c.label}</span>;
}
