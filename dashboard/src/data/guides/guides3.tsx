import React from 'react';
import { Collection } from '../moduleGuides';
import { 
  BuildingOffice, Database, ChartBar, Lock
} from '@phosphor-icons/react';

export const guides3: Collection[] = [
  {
    id: 'vendors-privacy',
    title: 'Vendors & Privacy',
    description: 'Third-party risk management and data subject rights.',
    icon: BuildingOffice,
    articles: [
      {
        id: 'third-party-risk',
        title: 'Third-Party Risk (TPRM)',
        description: 'Vendor oversight and SLA monitoring.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Organizations rely heavily on external APIs (like OpenAI) and third-party SaaS tools. This module extends your governance perimeter to these external vendors, ensuring they meet your internal security and compliance standards.</p>
          },
          {
            id: 'capabilities',
            title: 'Key Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Vendor Registry & Workspace:</strong> A central directory of all external AI providers, tracking contracts, data processing addendums (DPAs), and overall vendor risk scores.</li>
                <li><strong>TPRM Assessments & SLA Monitoring:</strong> Dispatch automated security questionnaires to vendors and actively monitor their uptime and response times to ensure strict SLA compliance.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'privacy-rights',
        title: 'Privacy & Rights',
        description: 'Data subject rights and consent management.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Training AI on personal data carries massive regulatory risk. This module ensures that user data is legally sourced and provides workflows to respect user privacy rights under GDPR and CCPA.</p>
          },
          {
            id: 'capabilities',
            title: 'Key Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Consent Registry:</strong> Tracks the explicit user consent attached to specific datasets, flagging models if the underlying consent is subsequently revoked by the user.</li>
                <li><strong>DSR / Rights Management:</strong> Automates the fulfillment of Data Subject Rights (DSR) requests, ensuring that "Right to be Forgotten" requests result in verifiable data purging from both training datasets and active models.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'ai-supply-chain',
        title: 'AI Supply Chain (AIBOM)',
        description: 'Dependency mapping and supply chain attestations.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">AI systems are built on complex stacks of open-source weights, libraries, and APIs. This module provides total visibility into this supply chain, allowing for rapid patching when a foundational dependency is compromised.</p>
          },
          {
            id: 'capabilities',
            title: 'Key Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Supply Chain & Provenance Graph:</strong> Dynamic visual maps tracing exactly which internal applications rely on which external vendor APIs, instantly highlighting single points of failure.</li>
                <li><strong>Supply Chain Attestations:</strong> Secure portal (Vendor Upload) for third parties to upload their own SOC2 reports or AI BOMs to verify their security posture.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'marketplace-integrations',
        title: 'Marketplace, Integrations & Export',
        description: 'Connecting Sentinel to your broader tech stack.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Governance should not exist in a silo. This module connects Sentinel to the operational tools where your developers and security teams already work.</p>
          },
          {
            id: 'capabilities',
            title: 'Key Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Marketplace & Integrations:</strong> Pre-built connectors for AWS SageMaker, MLflow, Jira, and Slack. Pull model metadata automatically or push remediation tasks directly to developer queues.</li>
                <li><strong>Export Center:</strong> Securely export filtered governance data for external BI tools or offline regulatory review.</li>
              </ul>
            )
          }
        ]
      }
    ]
  },
  {
    id: 'data-sustainability',
    title: 'Data & Sustainability',
    description: 'Data governance, quality, and environmental impact tracking.',
    icon: Database,
    articles: [
      {
        id: 'data-trust-gov',
        title: 'Data Trust & Gov',
        description: 'Dataset registry, lineage, and quality metrics.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">An AI model is only as safe and accurate as the data it was trained on. This module governs the raw datasets, ensuring they are high-quality, legally sourced, and free from malicious poisoning.</p>
          },
          {
            id: 'capabilities',
            title: 'Key Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Datasets Registry & Quality:</strong> Catalogs all training and evaluation datasets, monitoring them for data drift, missing values, and statistical anomalies before training begins.</li>
                <li><strong>Data Lineage:</strong> Visually maps how raw data moves through preprocessing pipelines (e.g., anonymization scripts) into the final model, ensuring provenance is strictly maintained.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'sustainability-esg',
        title: 'Sustainability & ESG',
        description: 'Tracking the carbon footprint of AI compute.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Training large foundational models consumes massive amounts of electricity. This module tracks this environmental impact, allowing organizations to report on their sustainability goals.</p>
          },
          {
            id: 'capabilities',
            title: 'Key Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Carbon Ledger & Energy Efficiency:</strong> Integrates with cloud providers to calculate the kilowatt-hours and carbon tonnage resulting from both training runs and daily inference operations.</li>
                <li><strong>ESG Reports:</strong> Formats the energy data into standardized reports suitable for inclusion in corporate Environmental, Social, and Governance (ESG) disclosures.</li>
              </ul>
            )
          }
        ]
      }
    ]
  },
  {
    id: 'enterprise-intelligence',
    title: 'Enterprise Intelligence',
    description: 'Advanced analytics, benchmarking, and regulatory forecasting.',
    icon: ChartBar,
    articles: [
      {
        id: 'intelligence',
        title: 'Intelligence & Benchmarking',
        description: 'Insights driven by aggregated platform data.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Leverages the vast amount of governance data collected by Sentinel to provide predictive insights, peer comparisons, and automated compliance mapping.</p>
          },
          {
            id: 'capabilities',
            title: 'Key Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Peer Benchmarking:</strong> Opt-in, anonymized data sharing that allows you to compare your organization's AI risk posture and incident rates against industry peers.</li>
                <li><strong>Knowledge Graph & Narrative Engine:</strong> Uses internal AI to query your governance data, answering complex questions like "Which of our customer-facing models are affected by the new EU AI Act amendments?"</li>
                <li><strong>Compliance Autopilot & Reg Velocity:</strong> Actively scans pending global legislation, predicting how new laws will impact your current control structure and automatically highlighting required gaps.</li>
              </ul>
            )
          }
        ]
      }
    ]
  },
  {
    id: 'organization',
    title: 'Organization',
    description: 'IAM, business continuity, and ethics management.',
    icon: Lock,
    articles: [
      {
        id: 'iam-roles',
        title: 'IAM & Roles',
        description: 'Access control and identity governance.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Strictly controls who can view, edit, or approve governance data within the Sentinel platform, enforcing the principle of least privilege.</p>
          },
          {
            id: 'capabilities',
            title: 'Key Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Access Control & Roles Management:</strong> Granular RBAC (Role-Based Access Control) allowing custom permissions. (e.g., Data Scientists can register models, but only the CISO can approve exceptions).</li>
                <li><strong>Identity Governance (IGA):</strong> Regular auditing workflows to review user access rights, ensuring that employees who change departments lose access to sensitive model IP.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'operational-resilience',
        title: 'Operational Resilience',
        description: 'Business continuity and asset tracking.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Ensures that critical business functions relying on AI can survive systemic shocks, vendor outages, or cyberattacks.</p>
          },
          {
            id: 'capabilities',
            title: 'Key Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Business Impact (BIA) & Continuity:</strong> Workflows to assess the financial impact of AI downtime and document explicit recovery plans (e.g., falling back to manual processing if an agent fails).</li>
                <li><strong>Asset Registry:</strong> A broader inventory tracking the physical and virtual infrastructure (GPUs, databases) that support the AI models.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'ethics-governance',
        title: 'Ethics & Governance',
        description: 'Ethics reporting, training, and GRC maturity tracking.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Fosters a culture of responsible AI by providing tools for employee training, ethical oversight, and long-term program maturity tracking.</p>
          },
          {
            id: 'capabilities',
            title: 'Key Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Ethics Reporting:</strong> An anonymous portal for employees to blow the whistle on unsafe AI development practices or biased model deployments without fear of retaliation.</li>
                <li><strong>Training & Committee Management:</strong> Tracks employee completion of required AI safety training and manages the agendas, meeting minutes, and voting records of the internal AI ethics committee.</li>
                <li><strong>GRC Maturity:</strong> Long-term tracking of the organization's governance maturity, providing a roadmap for progressing from reactive compliance to proactive, automated risk management.</li>
              </ul>
            )
          }
        ]
      }
    ]
  }
];
