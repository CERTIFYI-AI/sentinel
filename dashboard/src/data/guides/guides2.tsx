import React from 'react';
import { Collection } from '../moduleGuides';
import { 
  ShieldCheck, Scroll, Warning
} from '@phosphor-icons/react';

export const guides2: Collection[] = [
  {
    id: 'security',
    title: 'Security',
    description: 'Threat detection, red teaming, and defensive policies for AI systems.',
    icon: ShieldCheck,
    articles: [
      {
        id: 'threats-scans',
        title: 'Threats & Scans',
        description: 'Continuous monitoring of AI attack surfaces and vulnerabilities.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Unlike traditional software, AI systems expose unique attack surfaces, such as prompt injection, data poisoning, and model inversion. This module provides continuous, automated scanning to detect and mitigate these AI-specific threats before they can be exploited.</p>
          },
          {
            id: 'capabilities',
            title: 'Key Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Threat Feed & Scan Center:</strong> Aggregates real-time AI threat intelligence (like the MITRE ATLAS matrix) and automatically schedules regular vulnerability scans against your deployed models and APIs.</li>
                <li><strong>Attack Surface Mapping:</strong> Visually identifies exposed endpoints, unprotected model weights, and insecure dependencies across your AI infrastructure.</li>
                <li><strong>Vulnerabilities Tracker:</strong> A centralized dashboard to prioritize, assign, and track the remediation of identified security flaws, ensuring critical patches are applied rapidly.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'red-teaming',
        title: 'Red Teaming',
        description: 'Adversarial testing and vulnerability simulation.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Proactive defense requires thinking like an attacker. The Red Teaming module provides a secure sandbox for security teams to actively assault AI models, attempting jailbreaks and data extraction to uncover hidden weaknesses.</p>
          },
          {
            id: 'capabilities',
            title: 'Key Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Red Team Lab & Model Arena:</strong> An isolated environment where internal or third-party testers can systematically bombard models with malicious prompts, tracking success rates and failure modes.</li>
                <li><strong>Findings Log:</strong> A structured repository for documenting successful bypasses. Developers are alerted immediately, allowing them to adjust system prompts or implement defensive guardrails.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'defense-policies',
        title: 'Defense & Policies',
        description: 'Security rules and cryptographic key management.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">This module enforces the defensive perimeter around your AI operations, ensuring that access to models and sensitive data is strictly controlled through robust policies and secure key management.</p>
          },
          {
            id: 'capabilities',
            title: 'Key Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Policy Firewall:</strong> Defines and enforces strict access control rules (e.g., denying API requests originating from unauthorized geographic regions or blocking known malicious IPs).</li>
                <li><strong>Keys Vault:</strong> Secure, encrypted storage for API keys and service accounts used by AI agents, preventing credential leakage in source code or plaintext configuration files.</li>
                <li><strong>Security Reports:</strong> Generates comprehensive summaries of the organization's defensive posture, suitable for presentation to auditors and executive leadership.</li>
              </ul>
            )
          }
        ]
      }
    ]
  },
  {
    id: 'compliance',
    title: 'Compliance',
    description: 'Framework mapping, evidence collection, and regulatory adherence.',
    icon: Scroll,
    articles: [
      {
        id: 'standards-controls',
        title: 'Standards & Controls',
        description: 'Map internal practices to external regulatory frameworks.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Navigating overlapping global AI regulations is complex. This module allows you to define technical controls once and map them across multiple frameworks (EU AI Act, NIST AI RMF, ISO 42001), significantly reducing audit fatigue.</p>
          },
          {
            id: 'capabilities',
            title: 'Key Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Frameworks & Controls Registry:</strong> A central repository of pre-loaded regulatory frameworks and the specific internal controls designed to satisfy them.</li>
                <li><strong>Gap Analysis & Testing:</strong> Automated tools to identify missing controls against newly imported regulations, coupled with a testing suite to verify that existing controls are functioning as intended.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'evidence-audits',
        title: 'Evidence & Audits',
        description: 'Secure, immutable storage for compliance artifacts.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Compliance requires undeniable proof. The Evidence Hub provides a cryptographically secure vault where organizations store reports, logs, and testing results to present to external auditors.</p>
          },
          {
            id: 'capabilities',
            title: 'Key Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Evidence Vault & Chain of Custody:</strong> Uploaded documents (like DPIAs or pen-test results) are cryptographically hashed, guaranteeing to auditors that the files have not been tampered with since their creation.</li>
                <li><strong>Audit Trails:</strong> Maintains a comprehensive, immutable ledger of all system activity and governance decisions, making forensic investigations and compliance audits seamless.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'policies-docs',
        title: 'Policies & Docs',
        description: 'Centralized authoring and management of governance policies.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Replaces fragmented word documents and spreadsheets with a centralized, version-controlled Policy Editor, ensuring all teams operate under the most current AI guidelines.</p>
          },
          {
            id: 'capabilities',
            title: 'Key Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Policy Editor & Templates:</strong> Draft new rules using built-in, expert-drafted templates for Acceptable AI Use, Data Handling, and Vendor Risk, complete with mandatory approval workflows.</li>
                <li><strong>Document Management:</strong> Organize, version, and distribute approved policies across the organization from a single source of truth.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'privacy-frameworks',
        title: 'Privacy & Frameworks',
        description: 'Deep-dive privacy assessments and regulatory monitoring.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Ensures that AI operations do not violate data privacy laws (like GDPR or CCPA). It provides structured workflows for assessing privacy impacts and monitoring global legislative changes.</p>
          },
          {
            id: 'capabilities',
            title: 'Key Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Reg Radar & Governance Mesh:</strong> Actively monitors upcoming AI legislation globally and visualizes how these new laws will impact your existing governance architecture.</li>
                <li><strong>Assessments (DPIA, TIA, RoPA):</strong> Digitized workflows for mandatory Data Protection Impact Assessments, Transfer Impact Assessments, and maintaining Records of Processing Activities.</li>
                <li><strong>Transparency & Conformity:</strong> Automates the generation of legally required transparency reports and conformity declarations (e.g., for the EU AI Act) pulling live data directly from the inventory.</li>
              </ul>
            )
          }
        ]
      }
    ]
  },
  {
    id: 'risk-response',
    title: 'Risk & Response',
    description: 'Centralized risk tracking and incident management workflows.',
    icon: Warning,
    articles: [
      {
        id: 'risk-management',
        title: 'Risk Management',
        description: 'Comprehensive tracking and scoring of AI vulnerabilities.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Provides a unified view of all identified risks across the enterprise. It allows risk officers to categorize, score, and prioritize vulnerabilities to ensure resources are focused on the most critical threats.</p>
          },
          {
            id: 'capabilities',
            title: 'Key Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Risks Registry & Matrix:</strong> A central ledger for logging risks. The dynamic Risk Matrix visually plots these vulnerabilities based on Likelihood and Impact, highlighting critical issues in the red zones.</li>
                <li><strong>Financial Risk Intelligence:</strong> Quantifies the potential financial exposure of AI failures (e.g., regulatory fines, IP lawsuits, operational downtime) to help prioritize mitigation efforts.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'incident-response',
        title: 'Incident Response',
        description: 'Workflows for handling AI failures and security breaches.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">When an AI system fails—whether through a data leak, biased output, or malicious attack—organizations need a structured, rapid response protocol. This module manages incidents from initial triage to post-mortem review.</p>
          },
          {
            id: 'capabilities',
            title: 'Key Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Incidents Log & Playbooks:</strong> A dedicated portal for reporting AI failures, accompanied by pre-defined playbooks that guide response teams through containment, eradication, and recovery.</li>
                <li><strong>Tabletop Exercises:</strong> Run simulated catastrophe scenarios (e.g., "Rogue agent deletes customer database") to test team readiness and identify gaps in existing response procedures.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'remediation-exempts',
        title: 'Remediation & Exempts',
        description: 'Tracking fixes and managing policy exceptions.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Finding a risk is only half the battle; fixing it is the objective. This module ensures accountability by tracking remediation tasks and strictly managing temporary exceptions when a fix cannot be immediately applied.</p>
          },
          {
            id: 'capabilities',
            title: 'Key Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Remediation Tracker:</strong> A centralized Kanban board assigning specific vulnerability fixes to developers, tracking progress through to completion and verification.</li>
                <li><strong>Exception Management:</strong> Workflows for requesting and approving temporary waivers for policy violations, ensuring that all exceptions have a documented expiration date and mitigating controls in place.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'operations-flows',
        title: 'Operations & Flows',
        description: 'Human-in-the-loop oversight and automated governance routing.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Connects governance rules with daily operations, ensuring that compliance requirements do not become bottlenecks by utilizing intelligent routing and automation.</p>
          },
          {
            id: 'capabilities',
            title: 'Key Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>HITL Reviews:</strong> Automatically flags high-stakes or low-confidence AI decisions and routes them to a specialized queue for mandatory human review before execution.</li>
                <li><strong>Automation Studio & Workflows:</strong> A no-code builder to automate governance processes, such as automatically sending a Slack alert to Legal when a high-risk model is proposed, or auto-generating Regulator Filings upon deployment.</li>
              </ul>
            )
          }
        ]
      }
    ]
  }
];
