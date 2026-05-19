// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// WS2 scaffold generator — produces 25 new page files with consistent
// loading/error/empty states, a11y landmarks, and auth-guarded routes.
//
// Each page is a thin shell backed by ModuleScaffold. Real data wiring
// is intentionally out-of-scope for WS2 — callers in WS3/WS5/WS6 plug in
// services as the underlying tables / RPCs land.

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const pagesDir = join(here, "..", "dashboard", "src", "pages", "scaffold");
mkdirSync(pagesDir, { recursive: true });

const LICENSE = `// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.`;

/**
 * 25 enterprise-GRC pages that large customers expect and are currently
 * missing from the routing table. Each entry: [componentName, routePath,
 * title, subtitle, iconName (phosphor), category].
 */
const PAGES = [
  ["BoardReports", "/board/reports", "Board Reports", "Quarterly governance reports for the board and audit committee.", "Buildings", "Governance"],
  ["CommitteeCalendar", "/board/committee-calendar", "Committee Calendar", "Upcoming audit, risk, and compliance committee meetings.", "Calendar", "Governance"],
  ["PolicyLibrary", "/governance/policies", "Policy Library", "Published policies, versions, and attestation status.", "BookOpen", "Governance"],
  ["PolicyAttestation", "/governance/attestation", "Policy Attestation", "Employee attestation campaigns and completion tracking.", "CheckCircle", "Governance"],
  ["RegulatoryHorizon", "/governance/regulatory-horizon", "Regulatory Horizon", "Upcoming regulations mapped to products and controls.", "Compass", "Governance"],
  ["ThirdPartyInventory", "/vendors/inventory", "Third-Party Inventory", "Registered vendors, data-sharing scope, and risk tier.", "UsersThree", "Vendors"],
  ["VendorAssessments", "/vendors/assessments", "Vendor Assessments", "Questionnaires, evidence, and residual-risk scoring.", "ClipboardText", "Vendors"],
  ["VendorContractReview", "/vendors/contracts", "Vendor Contract Review", "DPA, SLA, and subprocessor clauses tracked per vendor.", "FileText", "Vendors"],
  ["IncidentResponsePlaybooks", "/incidents/playbooks", "IR Playbooks", "Executable incident response playbooks and ownership.", "Siren", "Incidents"],
  ["PostIncidentReviews", "/incidents/post-mortems", "Post-Incident Reviews", "Blameless post-mortems and corrective actions.", "Notebook", "Incidents"],
  ["ThreatIntelFeed", "/threat/intel-feed", "Threat Intel Feed", "Curated indicators from MISP, ISAC, and OSINT sources.", "Lightning", "Threats"],
  ["VulnerabilityProgram", "/threat/vulnerability-program", "Vulnerability Program", "CVE tracking, SLA compliance, and patch cadence.", "Bug", "Threats"],
  ["PrivacyDpiaBuilder", "/privacy/dpia", "DPIA Builder", "Data-protection impact assessments per processing activity.", "ShieldChevron", "Privacy"],
  ["PrivacyRopa", "/privacy/ropa", "Records of Processing", "Article 30 ROPA register and review status.", "ListChecks", "Privacy"],
  ["PrivacyTransferLog", "/privacy/transfers", "Cross-Border Transfers", "SCC/IDTA agreements and transfer impact assessments.", "Globe", "Privacy"],
  ["DataMap", "/data/data-map", "Data Map", "Systems, stores, and data flows across the estate.", "Graph", "Data"],
  ["DataLineage", "/data/lineage", "Data Lineage", "Upstream-downstream lineage for datasets and pipelines.", "TreeStructure", "Data"],
  ["DataQualityMetrics", "/data/quality-metrics", "Data Quality Metrics", "Freshness, completeness, and validity trends per domain.", "ChartLineUp", "Data"],
  ["AiRedTeam", "/ai/red-team", "AI Red Team", "Adversarial test campaigns and regression tracking.", "Target", "AI"],
  ["AiModelRegistry", "/ai/model-registry", "Model Registry", "Registered models, owners, and production status.", "Robot", "AI"],
  ["AiPromptLibrary", "/ai/prompt-library", "Prompt Library", "Versioned prompts, evaluations, and approved use cases.", "ChatText", "AI"],
  ["TrainingPrograms", "/training/programs", "Training Programs", "Role-based training catalog and completion metrics.", "GraduationCap", "Training"],
  ["AwarenessCampaigns", "/training/awareness", "Awareness Campaigns", "Phishing, security, and privacy awareness campaigns.", "Megaphone", "Training"],
  ["SoxItGc", "/assurance/sox-itgc", "SOX IT General Controls", "Change, access, and operations controls for SOX programs.", "ShieldCheck", "Assurance"],
  ["InsuranceCoverage", "/assurance/insurance", "Insurance Coverage", "Cyber, E&O, and D&O policies with renewal dates.", "Shield", "Assurance"],
];

function tpl({ componentName, title, subtitle, iconName, category }) {
  return `${LICENSE}
//
// WS2 — ${title} (scaffolded page).
// Category: ${category}
//
// Real data binding is wired in subsequent workstreams as the backing
// services and tables land. This scaffold enforces the uniform
// loading / error / empty a11y contract.

import { useEffect, useRef, useState } from "react";
import { ${iconName} } from "@phosphor-icons/react";
import ModuleScaffold from "@/components/ModuleScaffold";
import { isSupabaseConfigured } from "@/lib/supabase";

interface Row {
  id: string;
  label: string;
}

export default function ${componentName}() {
  const abortRef = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (!isSupabaseConfigured()) {
          // No backing service yet; render an empty-state cleanly.
          setRows([]);
          return;
        }
        // Real query plugged in WS3/WS5/WS6.
        setRows([]);
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, []);

  return (
    <ModuleScaffold
      title="${title}"
      subtitle="${subtitle}"
      icon={${iconName}}
      breadcrumb={[{ label: "${category}" }, { label: "${title}" }]}
      state={{ loading, error, empty: !loading && !error && rows.length === 0 }}
      emptyMessage="Nothing to show yet. Connect a data source or import records to get started."
    >
      <section aria-label="${title} records">
        <ul role="list" className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded border px-4 py-3 text-sm"
              style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--bg-raised))" }}
            >
              {r.label}
            </li>
          ))}
        </ul>
      </section>
    </ModuleScaffold>
  );
}
`;
}

const routes = [];
const imports = [];
for (const [componentName, routePath, title, subtitle, iconName, category] of PAGES) {
  const fileName = `${componentName}.tsx`;
  writeFileSync(join(pagesDir, fileName), tpl({ componentName, title, subtitle, iconName, category }));
  imports.push(`const ${componentName} = lazy(() => import('./pages/scaffold/${componentName}'));`);
  routes.push(`          <Route path="${routePath}" element={<Suspense fallback={<Loading />}><${componentName} /></Suspense>} />`);
}

writeFileSync(join(pagesDir, "_routes.generated.txt"),
  `// WS2-generated route fragments. Merge manually into App.tsx.\n\n${imports.join("\n")}\n\n${routes.join("\n")}\n`);

console.log(`Generated ${PAGES.length} scaffold pages in ${pagesDir}`);
