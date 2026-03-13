// src/components/settings/sections/ComplianceSettings.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";

const FRAMEWORKS = [
  { id: "eu-ai-act", name: "EU AI Act (2024/1689)", status: "MANDATORY LAW", sc: "text-red-400", desc: "Articles 9-17, enforced August 2026" },
  { id: "gdpr", name: "GDPR (2016/679)", status: "MANDATORY LAW", sc: "text-red-400", desc: "Hard law for EU personal data" },
  { id: "china-genai", name: "China GenAI Regulations", status: "MANDATORY LAW", sc: "text-red-400", desc: "CAC-enforced since August 2023" },
  { id: "iso42001", name: "ISO/IEC 42001:2023", status: "CERTIFIABLE", sc: "text-blue-400", desc: "Certifiable AI management system" },
  { id: "nist-ai-rmf", name: "NIST AI RMF 1.0", status: "VOLUNTARY", sc: "text-green-400", desc: "US de facto standard" },
  { id: "oecd", name: "OECD AI Principles", status: "POLICY GUIDE", sc: "text-zinc-400", desc: "Adopted by 40+ countries" },
  { id: "ieee7000", name: "IEEE 7000-2021", status: "TECH STANDARD", sc: "text-zinc-400", desc: "Design-time standard" },
];

export function ComplianceSettings() {
  const qc = useQueryClient();
  const { data: enabled, isLoading } = useQuery<Record<string, boolean>>({
    queryKey: ["compliance-fw"],
    queryFn: () => apiClient.get("/compliance/frameworks") as Promise<Record<string, boolean>>,
    staleTime: 60_000,
  });
  const toggle = useMutation({
    mutationFn: (args: { id: string; on: boolean }) =>
      apiClient.patch("/compliance/frameworks/" + args.id, { enabled: args.on }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compliance-fw"] }),
  });

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded" />)}</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold">Compliance Frameworks</h2>
        <p className="text-sm text-gray-500">Enable frameworks to accumulate real-time evidence.</p>
      </div>
      <div className="space-y-2">
        {FRAMEWORKS.map(fw => {
          const isOn = enabled?.[fw.id] ?? false;
          return (
            <div key={fw.id} className={"flex items-center justify-between p-4 rounded border" + (isOn ? " border-l-2 border-l-[hsl(var(--brand))]" : "")}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{fw.name}</span>
                  <span className={"text-xs px-2 py-0.5 rounded bg-muted " + fw.sc}>{fw.status}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{fw.desc}</p>
              </div>
              <button
                onClick={() => toggle.mutate({ id: fw.id, on: !isOn })}
                className={"w-11 h-6 rounded-full relative transition-colors " + (isOn ? "bg-[hsl(var(--brand))]" : "bg-muted")}
              >
                <span className={"block w-4 h-4 rounded-full bg-white absolute top-1 transition-transform " + (isOn ? "translate-x-6" : "translate-x-1")} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
