import React from 'react';
import { Collection } from '../moduleGuides';
import { 
  ShieldCheck, Scroll, Warning
} from '@phosphor-icons/react';

export const guides2: Collection[] = [
  {
    id: 'security',
    title: 'Security',
    description: 'Advanced offensive and defensive security capabilities.',
    icon: ShieldCheck,
    articles: [
      {
        id: 'threats-scans',
        title: 'Threats & Scans',
        description: 'Vulnerability scanning and attack surface tracking.',
        sections: [
          {
            id: 'threat-feed-core',
            title: 'Threat Feed - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Continuously updated threat intelligence stream ingesting real-time CVEs, OWASP GenAI threat vectors, jailbreak technique signatures, model inversion techniques, and newly discovered zero-day exploits targeting AI infrastructure.</p>
          },
          {
            id: 'threat-feed-regulatory',
            title: 'Threat Feed - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 27001 (Control A.12.6 Management of Technical Vulnerabilities); NIST AI RMF (Measure 2.7).</p>
          },
          {
            id: 'threat-feed-auditor',
            title: 'Threat Feed - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Evaluated to ensure the platform automatically updates its scanning signatures against emerging, global GenAI attack methods.</p>
          },
          {
            id: 'scan-center-core',
            title: 'Scan Center - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Static Application Security Testing (SAST) and Dynamic Application Security Testing (DAST) suite inspecting source code, model file artifacts (PyTorch, Safetensors, ONNX pickle checks), notebook files, and API endpoints for security vulnerabilities.</p>
          },
          {
            id: 'scan-center-regulatory',
            title: 'Scan Center - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 27001 (Control A.14.2); EU AI Act (Article 15 - Cybersecurity).</p>
          },
          {
            id: 'scan-center-auditor',
            title: 'Scan Center - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Verified by checking scan execution history on production repositories and model artifact stores to ensure no unverified binary model files are loaded into memory.</p>
          },
          {
            id: 'attack-surface-core',
            title: 'Attack Surface - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Interactive visualization and tracking tool mapping all internet-facing model endpoints, unauthenticated gateway routes, exposed RAG vector database ports, active MCP servers, and connected third-party model plugins.</p>
          },
          {
            id: 'attack-surface-regulatory',
            title: 'Attack Surface - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 27001 (Control A.13.1); NIST AI RMF (Map 1.6).</p>
          },
          {
            id: 'attack-surface-auditor',
            title: 'Attack Surface - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Cross-referenced against external perimeter scan results to ensure zero unmapped AI entry points exist.</p>
          },
          {
            id: 'vulnerabilities-core',
            title: 'Vulnerabilities - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">CVSS-style vulnerability management matrix aggregating, scoring, prioritizing, and assigning remediation timelines for discovered model weaknesses, jailbreak susceptibilities, component bugs, and configuration flaws.</p>
          },
          {
            id: 'vulnerabilities-regulatory',
            title: 'Vulnerabilities - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 27001 (Control A.12.6); NIST AI RMF (Manage 2.3).</p>
          },
          {
            id: 'vulnerabilities-auditor',
            title: 'Vulnerabilities - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Inspected to verify that high-severity AI vulnerabilities are remediated within mandated organizational SLAs.</p>
          }
        ]
      },
      {
        id: 'red-teaming',
        title: 'Red Teaming',
        description: 'Automated adversarial simulation suite.',
        sections: [
          {
            id: 'red-team-lab-core',
            title: 'Red Team Lab - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Automated adversarial simulation suite executing jailbreak attacks (DAN prompts, Base64 encoding bypasses, multi-language bypasses, roleplay exploits) and automated probe suites (PyRIT, GARAK integrations) against enterprise models.</p>
          },
          {
            id: 'red-team-lab-regulatory',
            title: 'Red Team Lab - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">EU AI Act (Article 15 - Robustness against Cyberattacks); NIST AI RMF (Measure 2.7); OWASP GenAI Top 10.</p>
          },
          {
            id: 'red-team-lab-auditor',
            title: 'Red Team Lab - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Evaluated by reviewing execution reports showing models undergoing systematic adversarial testing prior to production sign-off.</p>
          },
          {
            id: 'red-team-findings-core',
            title: 'Red Team Findings - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Vulnerability tracking workspace detailing successful attack paths, bypass prompt logs, model failure modes, and mitigation verification records resulting from red team simulations.</p>
          },
          {
            id: 'red-team-findings-regulatory',
            title: 'Red Team Findings - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">NIST AI RMF (Manage 2.2); ISO 42001 (Control A.8.3 Testing).</p>
          },
          {
            id: 'red-team-findings-auditor',
            title: 'Red Team Findings - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Reviewed by auditors to confirm that successful jailbreaks identified during red teaming led to documented model or guardrail updates.</p>
          },
          {
            id: 'model-arena-core',
            title: 'Model Arena - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Head-to-head benchmarking suite running identical adversarial attack suites against different model candidates, versions, or guardrail setups to quantify relative security postures before making deployment choices.</p>
          },
          {
            id: 'model-arena-regulatory',
            title: 'Model Arena - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">NIST AI RMF (Measure 2.1).</p>
          },
          {
            id: 'model-arena-auditor',
            title: 'Model Arena - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Assessed to confirm that model migration decisions are backed by empirical security performance data.</p>
          }
        ]
      },
      {
        id: 'defense-policies',
        title: 'Defense & Policies',
        description: 'Dynamic policy firewalls and key vaults.',
        sections: [
          {
            id: 'policy-firewall-core',
            title: 'Policy Firewall - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Low-latency enforcement proxy operating inline to evaluate prompt and completion payloads against corporate security policies, blocking malicious traffic before processing or completion return.</p>
          },
          {
            id: 'policy-firewall-regulatory',
            title: 'Policy Firewall - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">EU AI Act (Article 15); OWASP GenAI Top 10 (LLM01).</p>
          },
          {
            id: 'policy-firewall-auditor',
            title: 'Policy Firewall - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Tested via real-time injection of prohibited instructions to confirm dynamic request termination and event logging.</p>
          },
          {
            id: 'keys-vault-core',
            title: 'Keys Vault - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Hardware Security Module (HSM) or enterprise key management integration (HashiCorp Vault, AWS KMS) managing cryptographic keys, API credentials, and secret storage with strict access auditing.</p>
          },
          {
            id: 'keys-vault-regulatory',
            title: 'Keys Vault - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 27001 (Control A.10 Cryptographic Controls).</p>
          },
          {
            id: 'keys-vault-auditor',
            title: 'Keys Vault - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Checked to ensure no hardcoded API keys exist in codebases, environment files, or deployment pipelines.</p>
          },
          {
            id: 'security-reports-core',
            title: 'Security Reports - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Compliance report builder generating detailed executive and technical security audit documentation aligned to SOC 2 Type II, ISO 27001, NIST SP 800-53, and OWASP recommendations.</p>
          },
          {
            id: 'security-reports-regulatory',
            title: 'Security Reports - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 27001 (Control A.18.2 Compliance with Security Policies).</p>
          },
          {
            id: 'security-reports-auditor',
            title: 'Security Reports - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Primary documentation artifact reviewed by third-party enterprise assessment teams during enterprise procurement security reviews.</p>
          }
        ]
      }
    ]
  },
  {
    id: 'compliance',
    title: 'Compliance',
    description: 'Regulatory tracking engine mapping controls and managing frameworks.',
    icon: Scroll,
    articles: [
      {
        id: 'overview',
        title: 'Overview',
        description: 'Macro-level compliance posture view.',
        sections: [
          {
            id: 'overview-core',
            title: 'Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Macro-level compliance posture view aggregating global regulatory compliance status across operational frameworks (ISO 42001, EU AI Act, NIST AI RMF, HIPAA, SOC 2).</p>
          },
          {
            id: 'overview-regulatory',
            title: 'Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Clause 9.2 Internal Audit); NIST AI RMF (Govern 1.1).</p>
          },
          {
            id: 'overview-auditor',
            title: 'Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Used by audit leads to inspect overall organizational readiness across target compliance frameworks.</p>
          }
        ]
      },
      {
        id: 'standards-controls',
        title: 'Standards & Controls',
        description: 'Cataloging frameworks, mapping controls, and testing gaps.',
        sections: [
          {
            id: 'frameworks-core',
            title: 'Frameworks Catalog - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Managed library housing pre-mapped, up-to-date compliance framework requirements (ISO 42001, EU AI Act, NIST AI RMF, OWASP, US State AI Laws, Singapore Model AI Governance Framework).</p>
          },
          {
            id: 'frameworks-regulatory',
            title: 'Frameworks Catalog - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Clause 4.2 Understanding Needs of Interested Parties); EU AI Act.</p>
          },
          {
            id: 'frameworks-auditor',
            title: 'Frameworks Catalog - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Examined to ensure the enterprise tracks up-to-date framework versions rather than legacy regulatory requirements.</p>
          },
          {
            id: 'controls-reg-core',
            title: 'Controls Registry - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Master database defining internal corporate control activities mapped to underlying requirements across multiple external frameworks simultaneously (one-to-many control mapping).</p>
          },
          {
            id: 'controls-reg-regulatory',
            title: 'Controls Registry - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Annex A Controls); NIST AI RMF (Govern 1.2).</p>
          },
          {
            id: 'controls-reg-auditor',
            title: 'Controls Registry - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Inspected to verify that a single internal operational activity (e.g., Model Registry updates) correctly satisfies requirements across ISO 42001, NIST, and EU AI Act standards.</p>
          },
          {
            id: 'gap-analysis-core',
            title: 'Gap Analysis - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Automated scoring and reporting tool assessing current platform state against selected regulatory frameworks to pinpoint missing policies, untested controls, or uncollected evidence.</p>
          },
          {
            id: 'gap-analysis-regulatory',
            title: 'Gap Analysis - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Clause 9.3 Management Review); NIST AI RMF (Map 2.1).</p>
          },
          {
            id: 'gap-analysis-auditor',
            title: 'Gap Analysis - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Evaluated during initial audit planning phases to review identified deficiencies and associated remediation plans.</p>
          },
          {
            id: 'control-testing-core',
            title: 'Control Testing - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Automated and manual control evaluation engine executing scheduled verification tests against compliance controls to confirm ongoing operational effectiveness.</p>
          },
          {
            id: 'control-testing-regulatory',
            title: 'Control Testing - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Clause 9.2); NIST AI RMF (Measure 1.1).</p>
          },
          {
            id: 'control-testing-auditor',
            title: 'Control Testing - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Evaluated by pulling historical control execution logs to confirm controls were actively tested throughout the annual audit period.</p>
          }
        ]
      },
      {
        id: 'evidence-audits',
        title: 'Evidence & Audits',
        description: 'Secure storage and traceability for compliance artifacts.',
        sections: [
          {
            id: 'evidence-hub-core',
            title: 'Evidence Hub - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Ingestion plane automatically collecting operational evidence artifacts (system logs, training records, code scans, impact assessments, approval signatures) directly from connected platform modules.</p>
          },
          {
            id: 'evidence-hub-regulatory',
            title: 'Evidence Hub - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Clause 7.5 Documented Information); EU AI Act (Article 11).</p>
          },
          {
            id: 'evidence-hub-auditor',
            title: 'Evidence Hub - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Streamlines audit sampling by providing direct, automated links from compliance controls to supporting evidence items.</p>
          },
          {
            id: 'evidence-vault-core',
            title: 'Evidence Vault - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Cryptographically secure, write-once-read-many (WORM) storage system ensuring long-term retention and tamper resistance of compliance evidence artifacts.</p>
          },
          {
            id: 'evidence-vault-regulatory',
            title: 'Evidence Vault - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 27001 (Control A.12.4); EU AI Act (Article 12).</p>
          },
          {
            id: 'evidence-vault-auditor',
            title: 'Evidence Vault - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Inspected to confirm evidence files have not been modified, altered, or backdated after initial creation.</p>
          },
          {
            id: 'evidence-chain-core',
            title: 'Evidence Chain - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Cryptographic hash-linking protocol creating a verifiable provenance chain connecting raw system logs, evidence collection processes, vault storage, and audit reports.</p>
          },
          {
            id: 'evidence-chain-regulatory',
            title: 'Evidence Chain - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 27001 (Control A.18.1 Compliance with Legal Requirements).</p>
          },
          {
            id: 'evidence-chain-auditor',
            title: 'Evidence Chain - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Tested by verifying digital signature chains on exported evidence bundles to ensure zero data tampering during transit or storage.</p>
          },
          {
            id: 'audit-trail-core',
            title: 'Audit Trail - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">The platform's single, append-only activity ledger (at /audit-trail) recording all user actions, policy modifications, approval votes, model state changes, and config updates. It absorbed the former System Audit Log module — there is one audit surface, not two. Not to be confused with Audit Management (/audits), which is engagement management: planning internal/external audit engagements and tracking their findings, not an activity log.</p>
          },
          {
            id: 'audit-trail-regulatory',
            title: 'Audit Trail - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 27001 (Control A.12.4); ISO 42001 (Control A.9.2); EU AI Act (Article 12 Record-keeping).</p>
          },
          {
            id: 'audit-trail-auditor',
            title: 'Audit Trail - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Inspected to establish accountability for specific policy edits or operational state changes made within the system. Append-only at the database level: no update or delete is granted, so entries cannot be altered or backdated.</p>
          },
          {
            id: 'comp-calendar-core',
            title: 'Compliance Calendar - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Scheduling engine tracking critical compliance deadlines, mandatory statutory filing dates, annual re-certification milestones, scheduled risk reviews, and vendor reassessment dates.</p>
          },
          {
            id: 'comp-calendar-regulatory',
            title: 'Compliance Calendar - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Clause 9.2 Internal Audit Planning).</p>
          },
          {
            id: 'comp-calendar-auditor',
            title: 'Compliance Calendar - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Inspected to confirm that required periodic compliance reviews occur at planned, predictable intervals.</p>
          }
        ]
      },
      {
        id: 'policies-docs',
        title: 'Policies & Docs',
        description: 'Document authoring and policy management workspace.',
        sections: [
          {
            id: 'policy-templates-core',
            title: 'Policy Templates - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Pre-authored, legal- and compliance-approved policy templates (Acceptable Use, Data Retention, AI Ethics, Vendor Security, Model Oversight) ready for customization.</p>
          },
          {
            id: 'policy-templates-regulatory',
            title: 'Policy Templates - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Clause 5.2 AI Policy); NIST AI RMF (Govern 2.1).</p>
          },
          {
            id: 'policy-templates-auditor',
            title: 'Policy Templates - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Evaluated to ensure enterprise policies incorporate mandatory baseline framework statements.</p>
          },
          {
            id: 'policy-editor-core',
            title: 'Policy Editor - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Version-controlled document authoring workspace featuring collaborative editing, approval routing, inline commentary, and dynamic token variable replacement.</p>
          },
          {
            id: 'policy-editor-regulatory',
            title: 'Policy Editor - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Clause 7.5 Documented Information).</p>
          },
          {
            id: 'policy-editor-auditor',
            title: 'Policy Editor - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Checked to verify formal document lifecycle practices (draft, review, approved, published) are strictly enforced.</p>
          },
          {
            id: 'doc-management-core',
            title: 'Document Management - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Central repository storing, categorizing, distributing, and tracking acknowledgment sign-offs for all corporate governance policies, standards, and procedures.</p>
          },
          {
            id: 'doc-management-regulatory',
            title: 'Document Management - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 27001 (Control A.5.1 Policy Review); ISO 42001 (Clause 7.5).</p>
          },
          {
            id: 'doc-management-auditor',
            title: 'Document Management - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Inspected to verify employee acknowledgment rates on mandatory policies (e.g., Acceptable Use Policies for GenAI).</p>
          }
        ]
      },
      {
        id: 'privacy-frameworks',
        title: 'Privacy & Frameworks',
        description: 'Tracking privacy regulations and DPIA execution workflows.',
        sections: [
          {
            id: 'reg-radar-core',
            title: 'Reg Radar - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Regulatory intelligence tracker scanning global legislative pipelines, regulatory agency updates, and enforcement actions to alert legal teams to changing AI requirements worldwide.</p>
          },
          {
            id: 'reg-radar-regulatory',
            title: 'Reg Radar - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Clause 4.2 & Control A.5 legal requirement tracking).</p>
          },
          {
            id: 'reg-radar-auditor',
            title: 'Reg Radar - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Examined to ensure legal and compliance teams maintain active tracking over emerging global statutory obligations.</p>
          },
          {
            id: 'gov-framework-core',
            title: 'Gov. Framework - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">High-level blueprint builder defining enterprise AI governance structures, decision rights, escalation pathways, and committee mandates.</p>
          },
          {
            id: 'gov-framework-regulatory',
            title: 'Gov. Framework - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Clause 5 Leadership); NIST AI RMF (Govern 1.2).</p>
          },
          {
            id: 'gov-framework-auditor',
            title: 'Gov. Framework - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Core structural document requested during initial ISO 42001 certification audits.</p>
          },
          {
            id: 'gov-mesh-core',
            title: 'Governance Mesh - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Decentralized policy orchestration layer mapping centralized governance policies to local operational rules across disparate regional business units and software development squads.</p>
          },
          {
            id: 'gov-mesh-regulatory',
            title: 'Governance Mesh - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Clause 4.1Context and Scope).</p>
          },
          {
            id: 'gov-mesh-auditor',
            title: 'Governance Mesh - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Reviewed in multinational deployment contexts to confirm enterprise governance rules are correctly localized across operating units.</p>
          },
          {
            id: 'dpia-workflow-core',
            title: 'DPIA Workflow - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Data Protection Impact Assessment workflow engine specifically tailored for AI, evaluating personal data ingestion, processing legality, automated profiling risks, and storage limits.</p>
          },
          {
            id: 'dpia-workflow-regulatory',
            title: 'DPIA Workflow - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">GDPR (Article 35 - Data Protection Impact Assessment); ISO 27701 (Privacy Information Management).</p>
          },
          {
            id: 'dpia-workflow-auditor',
            title: 'DPIA Workflow - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Primary audit artifact requested during privacy compliance reviews when models process personal identifiable data (PII).</p>
          },
          {
            id: 'tia-core',
            title: 'Transfer Impact (TIA) - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Transfer Impact Assessment module evaluating cross-border data transfer legal risks when routing data across global API endpoints, cloud training clusters, or vendor infrastructures.</p>
          },
          {
            id: 'tia-regulatory',
            title: 'Transfer Impact (TIA) - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">GDPR (Chapter V Transfers of Personal Data); EU Standard Contractual Clauses (SCCs).</p>
          },
          {
            id: 'tia-auditor',
            title: 'Transfer Impact (TIA) - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Crucial for multinational deployments using US-hosted model endpoints; auditors review TIAs to confirm data transfer legality.</p>
          },
          {
            id: 'ropa-registry-core',
            title: 'RoPA Registry - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Record of Processing Activities database updated specifically for AI systems, mapping data subjects, data categories, legal bases, model training usage, data storage locations, and deletion policies.</p>
          },
          {
            id: 'ropa-registry-regulatory',
            title: 'RoPA Registry - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">GDPR (Article 30 - Record of Processing Activities); ISO 27701.</p>
          },
          {
            id: 'ropa-registry-auditor',
            title: 'RoPA Registry - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Inspected by Data Protection Authorities (DPAs) during regulatory inspections to verify lawful bases for processing training and inference data.</p>
          },
          {
            id: 'transparency-core',
            title: 'Transparency Reports - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Automated publishing tool generating public or stakeholder-facing transparency reports disclosing deployed AI use cases, system capabilities, limitations, and evaluation summary results.</p>
          },
          {
            id: 'transparency-regulatory',
            title: 'Transparency Reports - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">EU AI Act (Article 50 - Transparency Obligations); NIST AI RMF (Govern 5.2).</p>
          },
          {
            id: 'transparency-auditor',
            title: 'Transparency Reports - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Verified by checking published disclosures against real-world model operational parameters.</p>
          },
          {
            id: 'framework-map-core',
            title: 'Framework Mapping - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Cross-walk engine automatically translating compliance status across frameworks (e.g., mapping a passed NIST AI RMF Measure requirement to its equivalent ISO 42001 Annex A control).</p>
          },
          {
            id: 'framework-map-regulatory',
            title: 'Framework Mapping - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Cross-framework support engine covering ISO 42001, NIST, EU AI Act, SOC 2.</p>
          },
          {
            id: 'framework-map-auditor',
            title: 'Framework Mapping - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Saves audit cycles by enabling "audit once, satisfy many" proof mapping across regulatory regimes.</p>
          },
          {
            id: 'conformity-core',
            title: 'Conformity - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">EU AI Act Conformity Assessment preparation workspace facilitating internal checks, technical documentation compilation, and Quality Management System (QMS) integration required prior to CE mark application.</p>
          },
          {
            id: 'conformity-regulatory',
            title: 'Conformity - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">EU AI Act (Article 43 & Annex VI/VII Conformity Assessment).</p>
          },
          {
            id: 'conformity-auditor',
            title: 'Conformity - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Mandatory review workspace for high-risk AI deployment in the EU market prior to commercial placement.</p>
          }
        ]
      }
    ]
  },
  {
    id: 'risk-response',
    title: 'Risk & Response',
    description: 'Quantitative risk assessment engine and incident workflows.',
    icon: Warning,
    articles: [
      {
        id: 'risk-management',
        title: 'Risk Management',
        description: 'Tracking, quantifying, and prioritizing enterprise AI risks.',
        sections: [
          {
            id: 'risks-reg-core',
            title: 'Risks Registry - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Enterprise risk catalog capturing identified AI risks, assigning ownership, defining inherent vs residual risk scores, and tracking mitigation status.</p>
          },
          {
            id: 'risks-reg-regulatory',
            title: 'Risks Registry - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Clause 6.1 Actions to Address Risks); NIST AI RMF (Map 2.1).</p>
          },
          {
            id: 'risks-reg-auditor',
            title: 'Risks Registry - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Examined to ensure risk scoring methodology reflects formal enterprise risk management (ERM) guidelines.</p>
          },
          {
            id: 'risk-matrix-core',
            title: 'Risk Matrix - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Dynamic heat-map visualization organizing risks along Likelihood vs Impact axes, enabling visual prioritization and executive risk reporting.</p>
          },
          {
            id: 'risk-matrix-regulatory',
            title: 'Risk Matrix - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Clause 6.1); NIST AI RMF (Map 2.2).</p>
          },
          {
            id: 'risk-matrix-auditor',
            title: 'Risk Matrix - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Reviewed during executive audit meetings to confirm appropriate allocation of risk mitigation resources.</p>
          },
          {
            id: 'risk-intel-core',
            title: 'Risk Intelligence - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Predictive analytics module utilizing live platform telemetry, guardrail breach trends, and external threat intelligence to forecast emerging risk exposures before incidents occur.</p>
          },
          {
            id: 'risk-intel-regulatory',
            title: 'Risk Intelligence - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">NIST AI RMF (Measure 1.2).</p>
          },
          {
            id: 'risk-intel-auditor',
            title: 'Risk Intelligence - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Evaluated as proof of proactive continuous risk monitoring rather than passive annual review processes.</p>
          },
          {
            id: 'financial-risk-core',
            title: 'Financial Risk - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Quantitative modeling engine calculating financial loss exposure (using FAIR methodology concepts) derived from potential regulatory fines, data breach liabilities, brand damage, and operational downtime.</p>
          },
          {
            id: 'financial-risk-regulatory',
            title: 'Financial Risk - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Clause 6.1).</p>
          },
          {
            id: 'financial-risk-auditor',
            title: 'Financial Risk - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Used by CFOs and CROs to evaluate financial provisions and cyber insurance coverage limits for AI operations.</p>
          }
        ]
      },
      {
        id: 'incident-response',
        title: 'Incident Response',
        description: 'Logging incidents, tracking playbooks, and executing tabletops.',
        sections: [
          {
            id: 'incidents-log-core',
            title: 'Incidents Log - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Immutable incident record repository logging all AI safety events, data leaks, severe hallucinations, unauthorized model modifications, and guardrail breaches.</p>
          },
          {
            id: 'incidents-log-regulatory',
            title: 'Incidents Log - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">EU AI Act (Article 73 - Reporting of Serious Incidents); ISO 27001 (Control A.16 Incident Management).</p>
          },
          {
            id: 'incidents-log-auditor',
            title: 'Incidents Log - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Examined during post-incident reviews to verify that all operational anomalies are logged without omission.</p>
          },
          {
            id: 'incident-workflow-core',
            title: 'Incident Workflow - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Triage and response orchestration engine guiding security teams through containment, eradication, forensic investigation, root-cause analysis, and post-incident reporting.</p>
          },
          {
            id: 'incident-workflow-regulatory',
            title: 'Incident Workflow - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 27001 (Control A.16.1); NIST AI RMF (Manage 2.3).</p>
          },
          {
            id: 'incident-workflow-auditor',
            title: 'Incident Workflow - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Tested by running tabletop incident simulations to confirm teams execute steps within established Mean Time to Respond (MTTR) targets.</p>
          },
          {
            id: 'incident-playbooks-core',
            title: 'Incident Playbooks - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Automated runbook execution engine containing pre-configured step-by-step procedures for handling specific AI emergencies (e.g., Prompt Injection Attack, PII Leakage, Hallucinated Contract Terms, Model Drift Event).</p>
          },
          {
            id: 'incident-playbooks-regulatory',
            title: 'Incident Playbooks - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">NIST AI RMF (Manage 2.3); ISO 27001 (Control A.16.1).</p>
          },
          {
            id: 'incident-playbooks-auditor',
            title: 'Incident Playbooks - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Inspected to verify procedural clarity and automated integration with communication and kill-switch capabilities.</p>
          },
          {
            id: 'tabletop-core',
            title: 'Tabletop Exercises - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Simulation module running hypothetical crisis scenarios (e.g., public release of biased model outputs, severe data leak via RAG context) to test organizational readiness and team response protocols.</p>
          },
          {
            id: 'tabletop-regulatory',
            title: 'Tabletop Exercises - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">NIST AI RMF (Manage 2.3); ISO 27001 (Control A.12.1).</p>
          },
          {
            id: 'tabletop-auditor',
            title: 'Tabletop Exercises - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Reviewed via exercise post-mortem documentation to confirm regular testing of incident readiness capabilities.</p>
          }
        ]
      },
      {
        id: 'remediation-exempts',
        title: 'Remediation & Exempts',
        description: 'Tracking corrective actions and risk acceptance workflows.',
        sections: [
          {
            id: 'remediation-tracker-core',
            title: 'Remediation Tracker - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Corrective and Preventive Action (CAPA) tracking tool monitoring task progress, assigned owners, and verified closure of identified security and compliance vulnerabilities.</p>
          },
          {
            id: 'remediation-tracker-regulatory',
            title: 'Remediation Tracker - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Clause 10.1 Non-conformity and Corrective Action).</p>
          },
          {
            id: 'remediation-tracker-auditor',
            title: 'Remediation Tracker - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Evaluated to ensure that identified compliance deficiencies lead to verified, implemented operational fixes.</p>
          },
          {
            id: 'exception-mgmt-core',
            title: 'Exception Management - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Workflow engine handling temporary policy waivers, risk acceptance requests, and governance exception sign-offs with enforced expiration dates, mandatory compensating controls, and executive approvals.</p>
          },
          {
            id: 'exception-mgmt-regulatory',
            title: 'Exception Management - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 27001 (Control A.5.1); ISO 42001 (Control A.5).</p>
          },
          {
            id: 'exception-mgmt-auditor',
            title: 'Exception Management - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Heavily audited; auditors verify that accepted risks have formal executive signatures and active, unexpired timelines.</p>
          }
        ]
      },
      {
        id: 'operations-flows',
        title: 'Operations & Flows',
        description: 'Human-in-the-loop and automation engines.',
        sections: [
          {
            id: 'hitl-core',
            title: 'HITL Reviews - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Operational review queue routing flagged or low-confidence model completions to qualified human reviewers for verification before output transmission to end users.</p>
          },
          {
            id: 'hitl-regulatory',
            title: 'HITL Reviews - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">EU AI Act (Article 14 - Human Oversight); NIST AI RMF (Govern 4.2).</p>
          },
          {
            id: 'hitl-auditor',
            title: 'HITL Reviews - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Inspected to confirm human reviewers possess actual capability and authority to override model decisions.</p>
          },
          {
            id: 'approval-workflows-core',
            title: 'Approval Workflows - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Multi-tiered digital sign-off engine managing formal governance reviews required for deployment promotions, dataset releases, policy changes, and risk waivers.</p>
          },
          {
            id: 'approval-workflows-regulatory',
            title: 'Approval Workflows - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Clause 5.3); NIST AI RMF (Govern 1.2).</p>
          },
          {
            id: 'approval-workflows-auditor',
            title: 'Approval Workflows - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Tested by verifying that production deployments remain programmatically blocked without complete, recorded sign-off approvals.</p>
          },
          {
            id: 'automation-studio-core',
            title: 'Automation Studio - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">No-code workflow builder allowing teams to construct custom governance routines (e.g., "If toxicity score &gt; 0.8, log incident, notify Slack, revoking API key").</p>
          },
          {
            id: 'automation-studio-regulatory',
            title: 'Automation Studio - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Control A.9.1 Operational Procedures).</p>
          },
          {
            id: 'automation-studio-auditor',
            title: 'Automation Studio - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Assessed to confirm automation triggers execute reliably without human intervention delays.</p>
          },
          {
            id: 'regulator-filings-core',
            title: 'Regulator Filings - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Reporting hub hosting standardized templates and export formats required for notifying regulatory authorities (e.g., EU AI Office, FTC, SEC) of serious incidents, registration requirements, or compliance updates.</p>
          },
          {
            id: 'regulator-filings-regulatory',
            title: 'Regulator Filings - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">EU AI Act (Articles 49 & 73).</p>
          },
          {
            id: 'regulator-filings-auditor',
            title: 'Regulator Filings - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Examined to ensure readiness for statutory mandatory incident notification timelines (e.g., 72-hour notifications).</p>
          }
        ]
      }
    ]
  }
];
