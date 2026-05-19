// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// WS5 — Framework catalog seeder.
//
// Generates one YAML file per framework under /frameworks/, each with a
// canonical header and a representative sample of controls. These are
// seed stubs — full control populations are maintained in follow-on PRs
// by the compliance team. Every file carries the framework's
// authoritative source URL.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "..", "frameworks");
fs.mkdirSync(OUT, { recursive: true });

const FRAMEWORKS = [
  {
    id: "soc2-tsc-2017",
    name: "SOC 2 Trust Services Criteria",
    version: "2017 (incl. 2022 revisions)",
    authority: "AICPA",
    url: "https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria",
    domain: "attestation",
    controls: [
      { id: "CC1.1", title: "Integrity and ethical values" },
      { id: "CC2.1", title: "Internal communications" },
      { id: "CC6.1", title: "Logical access controls" },
      { id: "CC7.2", title: "Detection of anomalies" },
      { id: "CC8.1", title: "Change management" },
    ],
  },
  {
    id: "iso-27001-2022",
    name: "ISO/IEC 27001:2022",
    version: "2022",
    authority: "ISO/IEC",
    url: "https://www.iso.org/standard/27001",
    domain: "infosec",
    controls: [
      { id: "A.5.1", title: "Policies for information security" },
      { id: "A.6.1", title: "Screening" },
      { id: "A.8.1", title: "User endpoint devices" },
      { id: "A.8.15", title: "Logging" },
      { id: "A.8.23", title: "Web filtering" },
    ],
  },
  {
    id: "iso-27701-2019",
    name: "ISO/IEC 27701:2019 (PIMS)",
    version: "2019",
    authority: "ISO/IEC",
    url: "https://www.iso.org/standard/71670.html",
    domain: "privacy",
    controls: [
      { id: "7.2.1", title: "Identify lawful basis" },
      { id: "7.3.2", title: "Determining information for PII principals" },
      { id: "8.2.1", title: "Customer obligations" },
    ],
  },
  {
    id: "nist-csf-2.0",
    name: "NIST Cybersecurity Framework 2.0",
    version: "2.0",
    authority: "NIST",
    url: "https://www.nist.gov/cyberframework",
    domain: "cybersecurity",
    controls: [
      { id: "GV.OC-01", title: "Organizational mission and stakeholders" },
      { id: "ID.AM-01", title: "Physical device inventory" },
      { id: "PR.AC-01", title: "Identity and credentials issued" },
      { id: "DE.CM-01", title: "Network monitored" },
      { id: "RS.AN-01", title: "Notifications from detection systems" },
      { id: "RC.RP-01", title: "Recovery plan executed" },
    ],
  },
  {
    id: "nist-800-53-rev5",
    name: "NIST SP 800-53 Rev 5",
    version: "Rev 5",
    authority: "NIST",
    url: "https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final",
    domain: "federal",
    controls: [
      { id: "AC-2", title: "Account management" },
      { id: "AU-6", title: "Audit record review" },
      { id: "CM-8", title: "System component inventory" },
      { id: "IR-4", title: "Incident handling" },
    ],
  },
  {
    id: "nist-800-171-rev3",
    name: "NIST SP 800-171 Rev 3",
    version: "Rev 3",
    authority: "NIST",
    url: "https://csrc.nist.gov/pubs/sp/800/171/r3/final",
    domain: "federal",
    controls: [
      { id: "3.1.1", title: "Limit system access" },
      { id: "3.3.1", title: "Create and retain audit logs" },
      { id: "3.13.1", title: "Monitor and protect communications" },
    ],
  },
  {
    id: "pci-dss-4.0",
    name: "PCI DSS",
    version: "4.0",
    authority: "PCI SSC",
    url: "https://www.pcisecuritystandards.org/document_library/",
    domain: "payments",
    controls: [
      { id: "1.2", title: "Network security controls" },
      { id: "3.5", title: "PAN rendered unreadable" },
      { id: "8.3", title: "Strong authentication" },
      { id: "10.2", title: "Audit logs" },
    ],
  },
  {
    id: "hipaa-security-rule",
    name: "HIPAA Security Rule",
    version: "45 CFR Part 164 Subpart C",
    authority: "HHS OCR",
    url: "https://www.hhs.gov/hipaa/for-professionals/security/index.html",
    domain: "healthcare",
    controls: [
      { id: "164.308(a)(1)", title: "Security management process" },
      { id: "164.308(a)(5)", title: "Security awareness training" },
      { id: "164.312(a)(1)", title: "Access control" },
    ],
  },
  {
    id: "hitrust-csf-v11",
    name: "HITRUST CSF",
    version: "v11.2",
    authority: "HITRUST Alliance",
    url: "https://hitrustalliance.net/hitrust-csf",
    domain: "healthcare",
    controls: [
      { id: "01.a", title: "Access control policy" },
      { id: "06.c", title: "Data protection and privacy" },
      { id: "10.m", title: "Control of technical vulnerabilities" },
    ],
  },
  {
    id: "gdpr",
    name: "General Data Protection Regulation",
    version: "Regulation (EU) 2016/679",
    authority: "European Parliament",
    url: "https://eur-lex.europa.eu/eli/reg/2016/679/oj",
    domain: "privacy",
    controls: [
      { id: "Art.5", title: "Principles relating to processing" },
      { id: "Art.17", title: "Right to erasure" },
      { id: "Art.25", title: "Data protection by design and by default" },
      { id: "Art.30", title: "Records of processing activities" },
      { id: "Art.32", title: "Security of processing" },
      { id: "Art.33", title: "Breach notification" },
    ],
  },
  {
    id: "ccpa-cpra",
    name: "California Consumer Privacy Act (as amended by CPRA)",
    version: "Cal. Civ. Code § 1798.100 et seq.",
    authority: "California AG / CPPA",
    url: "https://cppa.ca.gov/regulations/",
    domain: "privacy",
    controls: [
      { id: "1798.100", title: "Right to know" },
      { id: "1798.105", title: "Right to delete" },
      { id: "1798.120", title: "Right to opt-out of sale" },
      { id: "1798.150", title: "Private right of action" },
    ],
  },
  {
    id: "pipeda",
    name: "Personal Information Protection and Electronic Documents Act",
    version: "S.C. 2000, c. 5",
    authority: "Office of the Privacy Commissioner of Canada",
    url: "https://laws-lois.justice.gc.ca/ENG/ACTS/P-8.6/index.html",
    domain: "privacy",
    controls: [
      { id: "Sch.1-4.1", title: "Accountability" },
      { id: "Sch.1-4.7", title: "Safeguards" },
      { id: "Sch.1-4.9", title: "Individual access" },
    ],
  },
  {
    id: "lgpd",
    name: "Lei Geral de Proteção de Dados (Brazil)",
    version: "Lei Nº 13.709/2018",
    authority: "ANPD",
    url: "https://www.gov.br/anpd/pt-br",
    domain: "privacy",
    controls: [
      { id: "Art.6", title: "Principles" },
      { id: "Art.46", title: "Security" },
      { id: "Art.48", title: "Incident communication" },
    ],
  },
  {
    id: "eu-ai-act",
    name: "EU AI Act",
    version: "Regulation (EU) 2024/1689",
    authority: "European Parliament",
    url: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj",
    domain: "ai-governance",
    controls: [
      { id: "Art.9", title: "Risk management system" },
      { id: "Art.10", title: "Data and data governance" },
      { id: "Art.13", title: "Transparency for high-risk AI" },
      { id: "Art.15", title: "Accuracy, robustness and cybersecurity" },
      { id: "Art.52", title: "Transparency obligations for certain AI systems" },
    ],
  },
  {
    id: "nist-ai-rmf-1.0",
    name: "NIST AI Risk Management Framework",
    version: "1.0",
    authority: "NIST",
    url: "https://www.nist.gov/itl/ai-risk-management-framework",
    domain: "ai-governance",
    controls: [
      { id: "GOVERN-1.1", title: "Legal and regulatory requirements" },
      { id: "MAP-2.3", title: "Scientific integrity" },
      { id: "MEASURE-2.7", title: "Validity and reliability" },
      { id: "MANAGE-4.2", title: "Impact mitigation strategies" },
    ],
  },
  {
    id: "iso-42001-2023",
    name: "ISO/IEC 42001:2023 (AI Management System)",
    version: "2023",
    authority: "ISO/IEC",
    url: "https://www.iso.org/standard/81230.html",
    domain: "ai-governance",
    controls: [
      { id: "A.5.2", title: "AI policy" },
      { id: "A.6.2.4", title: "Reporting concerns about the AI system" },
      { id: "A.8.4", title: "AI system verification and validation" },
    ],
  },
  {
    id: "cis-controls-v8",
    name: "CIS Controls",
    version: "v8.1",
    authority: "Center for Internet Security",
    url: "https://www.cisecurity.org/controls/v8",
    domain: "cybersecurity",
    controls: [
      { id: "1", title: "Inventory and control of enterprise assets" },
      { id: "3", title: "Data protection" },
      { id: "8", title: "Audit log management" },
      { id: "16", title: "Application software security" },
    ],
  },
  {
    id: "sox-itgc",
    name: "Sarbanes-Oxley IT General Controls",
    version: "SOX 404",
    authority: "SEC / PCAOB",
    url: "https://pcaobus.org/oversight/standards/auditing-standards/details/AS2201",
    domain: "financial",
    controls: [
      { id: "ITGC-01", title: "Change management" },
      { id: "ITGC-02", title: "Logical access" },
      { id: "ITGC-03", title: "Computer operations" },
      { id: "ITGC-04", title: "Program development" },
    ],
  },
  {
    id: "cmmc-2.0",
    name: "Cybersecurity Maturity Model Certification",
    version: "2.0",
    authority: "US Department of Defense",
    url: "https://dodcio.defense.gov/CMMC/",
    domain: "federal",
    controls: [
      { id: "AC.L2-3.1.1", title: "Authorized access control" },
      { id: "IR.L2-3.6.1", title: "Incident handling" },
      { id: "SI.L2-3.14.2", title: "Malicious code protection" },
    ],
  },
  {
    id: "fedramp-rev5",
    name: "FedRAMP",
    version: "Rev 5 (aligned to NIST 800-53 Rev 5)",
    authority: "GSA / JAB",
    url: "https://www.fedramp.gov/rev5/",
    domain: "federal",
    controls: [
      { id: "AC-2", title: "Account management" },
      { id: "CA-2", title: "Control assessments" },
      { id: "RA-5", title: "Vulnerability scanning" },
    ],
  },
  {
    id: "dora",
    name: "Digital Operational Resilience Act",
    version: "Regulation (EU) 2022/2554",
    authority: "European Parliament",
    url: "https://eur-lex.europa.eu/eli/reg/2022/2554/oj",
    domain: "financial",
    controls: [
      { id: "Art.6", title: "ICT risk management framework" },
      { id: "Art.17", title: "Major ICT-related incident reporting" },
      { id: "Art.28", title: "ICT third-party risk management" },
    ],
  },
  {
    id: "ffiec-cat",
    name: "FFIEC Cybersecurity Assessment Tool",
    version: "May 2017",
    authority: "FFIEC",
    url: "https://www.ffiec.gov/cyberassessmenttool.htm",
    domain: "financial",
    controls: [
      { id: "D1", title: "Cyber risk management and oversight" },
      { id: "D2", title: "Threat intelligence and collaboration" },
      { id: "D3", title: "Cybersecurity controls" },
    ],
  },
];

function toYaml(fw) {
  const lines = [];
  lines.push(`# Licensed to CERTIFYI-AI under the Apache License, Version 2.0.`);
  lines.push(`# Source: ${fw.url}`);
  lines.push(`id: ${fw.id}`);
  lines.push(`name: "${fw.name.replace(/"/g, '\\"')}"`);
  lines.push(`version: "${fw.version}"`);
  lines.push(`authority: "${fw.authority}"`);
  lines.push(`url: "${fw.url}"`);
  lines.push(`domain: ${fw.domain}`);
  lines.push(`controls:`);
  for (const c of fw.controls) {
    lines.push(`  - id: "${c.id}"`);
    lines.push(`    title: "${c.title.replace(/"/g, '\\"')}"`);
  }
  lines.push("");
  return lines.join("\n");
}

let count = 0;
let controlCount = 0;
for (const fw of FRAMEWORKS) {
  const file = path.join(OUT, `${fw.id}.yaml`);
  fs.writeFileSync(file, toYaml(fw));
  count += 1;
  controlCount += fw.controls.length;
}

// Emit a manifest used by the UI and tests.
const manifest = {
  generated_at: new Date().toISOString(),
  framework_count: count,
  control_count: controlCount,
  frameworks: FRAMEWORKS.map((f) => ({
    id: f.id,
    name: f.name,
    version: f.version,
    authority: f.authority,
    url: f.url,
    domain: f.domain,
    control_count: f.controls.length,
  })),
};
fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));

console.log(`Wrote ${count} frameworks (${controlCount} seed controls) to ${path.relative(path.resolve(__dirname, ".."), OUT)}`);
