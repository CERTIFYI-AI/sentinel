import React from 'react';
import { 
  RocketLaunch, Brain, Warning, ShieldCheck, 
  Flask, Graph, BookOpen, Buildings,
  UserCircleCheck, Scales, Leaf, Clock,
  FileText, Users, Robot
} from '@phosphor-icons/react';

export interface ArticleSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

export interface Article {
  id: string;
  title: string;
  description: string;
  sections: ArticleSection[];
}

export interface Collection {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  articles: Article[];
}

export const COLLECTIONS: Collection[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    description: 'Learn the basics of Sentinel and get up and running quickly with your AI governance journey.',
    icon: RocketLaunch,
    articles: [
      {
        id: 'welcome',
        title: 'Welcome to Sentinel',
        description: 'An introduction to the Sentinel platform and its core capabilities.',
        sections: [
          {
            id: 'what-is-sentinel',
            title: 'What is Sentinel?',
            content: (
              <>
                <p className="mb-4 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                  Sentinel is an AI governance platform that helps organizations keep track of their AI systems, stay compliant with regulations and manage the risks that come with deploying AI. It covers model inventory, vendor oversight, risk registers, compliance frameworks and policy management in one place.
                </p>
                <p className="mb-4 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                  You deploy it on your own infrastructure (on-premises or private cloud), so your governance data never leaves your security perimeter. There's no SaaS dependency and no data shared with third parties.
                </p>
                <div className="bg-[hsl(var(--brand-subtle))] border-l-4 border-[hsl(var(--brand))] p-4 rounded-r-md my-4">
                  <p className="text-sm text-[hsl(var(--brand))]">
                    Sentinel is source-available. You can read every line of code, audit it internally, and modify it to fit your organization's needs.
                  </p>
                </div>
              </>
            )
          },
          {
            id: 'what-you-can-do',
            title: 'What you can do with it',
            content: (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-[hsl(var(--text-1))] text-sm mb-1">Model inventory</h4>
                  <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Register every AI system in your organization. Track each model from development through deployment to retirement, with approval gates at each stage.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-[hsl(var(--text-1))] text-sm mb-1">Risk management</h4>
                  <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Document risks per model, vendor or use case. Score them, assign owners, track mitigations and monitor residual risk over time.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-[hsl(var(--text-1))] text-sm mb-1">Compliance and controls</h4>
                  <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Map your controls to regulatory frameworks. Track implementation status per control and collect evidence to stay audit-ready.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-[hsl(var(--text-1))] text-sm mb-1">Vendor governance</h4>
                  <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Maintain a registry of third-party AI vendors. Track contracts, conduct due diligence and monitor vendor-specific risks.</p>
                </div>
              </div>
            )
          },
          {
            id: 'supported-frameworks',
            title: 'Supported frameworks',
            content: (
              <>
                <p className="mb-4 text-sm text-[hsl(var(--text-2))] leading-relaxed">Sentinel ships with pre-built control sets for these frameworks:</p>
                <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed mb-4">
                  <li><strong>EU AI Act</strong> — Pre-mapped controls and assessment templates covering high-risk AI system requirements</li>
                  <li><strong>ISO 42001</strong> — Clause-by-clause structure for AI management system certification readiness</li>
                  <li><strong>ISO 27001</strong> — Information security controls mapped to AI-specific concerns</li>
                  <li><strong>NIST AI RMF</strong> — The 4 functions (Govern, Map, Measure, Manage) with subcategory tracking</li>
                </ul>
              </>
            )
          },
          {
            id: 'deployment-options',
            title: 'Deployment',
            content: (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-[hsl(var(--text-1))] text-sm mb-1">Docker Compose</h4>
                  <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Single install script, everything containerized. The fastest way to get running.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-[hsl(var(--text-1))] text-sm mb-1">Kubernetes</h4>
                  <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Helm chart for production clusters with horizontal scaling.</p>
                </div>
              </div>
            )
          }
        ]
      }
    ]
  },
  {
    id: 'risk-management',
    title: 'Risk Management & Assessments',
    description: 'Identify, assess, and mitigate risks across your AI systems through specialized assessments and tiering.',
    icon: Warning,
    articles: [
      {
        id: 'ai-risk-tiering',
        title: 'AI Risk Tiering & Matrix',
        description: 'Automated classification of AI risks and visual matrix plotting.',
        sections: [
          {
            id: 'tiering',
            title: 'Automated Risk Tiering',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Sentinel automatically analyzes model metadata, intended use cases, and input parameters to assign a strict risk tier (e.g., Unacceptable, High, Limited, Minimal). This classification dictates the level of governance required, preventing high-risk models from bypassing crucial compliance checks.</p>
          },
          {
            id: 'matrix',
            title: 'Visual Risk Matrix',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">A dynamic 5x5 matrix visually plots identified risks based on their Likelihood and Impact scores. This instantly highlights critical vulnerabilities in the top-right quadrant, allowing risk officers to prioritize immediate mitigation strategies.</p>
          }
        ]
      },
      {
        id: 'risk-register',
        title: 'Risk Register',
        description: 'Centralized repository for all identified AI risks.',
        sections: [
          {
            id: 'repository',
            title: 'Central Repository',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">The Risk Register serves as the single source of truth for all AI-related risks across the enterprise. Users can log risks, categorize them by domain (e.g., Security, Privacy, Bias), assign dedicated owners, and link them to specific models or business units.</p>
          },
          {
            id: 'mitigation',
            title: 'Mitigation Tracking',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Track the status of mitigation plans and observe the live calculation of Residual Risk scores as compensating controls are successfully implemented.</p>
          }
        ]
      },
      {
        id: 'risk-intelligence',
        title: 'Risk Intelligence',
        description: 'Dashboards for aggregated risk insights and scoring.',
        sections: [
          {
            id: 'dashboards',
            title: 'Aggregated Dashboards',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Provides high-level insights and quantitative scoring on the organization's overall risk posture. Visualizes risk distribution across departments, highlights recurring systemic vulnerabilities, and tracks risk velocity over time.</p>
          }
        ]
      },
      {
        id: 'specialized-assessments',
        title: 'Specialized Assessments (DPIA, TIA, BIA, AIIA)',
        description: 'Conduct deep-dive impact assessments.',
        sections: [
          {
            id: 'dpia',
            title: 'Data Protection Impact Assessments (DPIA)',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Structured workflows to evaluate the privacy impacts of AI systems processing personal data, ensuring strict adherence to GDPR Article 35.</p>
          },
          {
            id: 'tia',
            title: 'Transfer Impact Assessments (TIA)',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Assess the risks associated with transferring data across borders, especially when utilizing cloud-based LLM APIs hosted in foreign jurisdictions.</p>
          },
          {
            id: 'bia',
            title: 'Business Impact Assessments (BIA)',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Evaluate the operational and financial consequences of an AI system failure, determining the required resilience and recovery time objectives.</p>
          },
          {
            id: 'aiia',
            title: 'AI Impact Assessments (AIIA)',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Comprehensive, AI-specific evaluations assessing potential societal harms, algorithmic biases, and fundamental rights impacts before deploying a high-risk model.</p>
          }
        ]
      },
      {
        id: 'genai-risks',
        title: 'GenAI Risks & Red Teaming',
        description: 'Track Generative AI vulnerabilities and attack findings.',
        sections: [
          {
            id: 'tracking',
            title: 'Vulnerability Tracking',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Specific tracking for Generative AI risks, including the OWASP LLM Top 10 (Prompt Injection, Data Leakage, Insecure Output Handling).</p>
          },
          {
            id: 'red-teaming',
            title: 'Red Team Findings',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Log and manage findings from adversarial testing (Red Teaming) exercises, ensuring that discovered jailbreaks or model bypasses are rapidly patched.</p>
          }
        ]
      },
      {
        id: 'financial-risk',
        title: 'Financial Risk Modeling',
        description: 'Track the financial exposure related to AI failures.',
        sections: [
          {
            id: 'modeling',
            title: 'Exposure Calculation',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Tools to quantify the potential financial losses stemming from AI failures, regulatory fines, IP infringement claims, or operational downtime. Helps in determining the ROI of implementing specific governance controls.</p>
          }
        ]
      }
    ]
  },
  {
    id: 'governance',
    title: 'Governance, Policies & Compliance',
    description: 'Manage policies, map controls to regulatory frameworks, and automate compliance gap analysis.',
    icon: ShieldCheck,
    articles: [
      {
        id: 'policy-management',
        title: 'Policy Management',
        description: 'Built-in Policy Editor, Templates, and tracking.',
        sections: [
          {
            id: 'editor',
            title: 'Policy Editor',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">A robust rich-text editor for authoring AI governance policies directly within the platform. Supports versioning, redlining, and mandatory approval workflows.</p>
          },
          {
            id: 'templates',
            title: 'Policy Templates',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Jumpstart your governance program using built-in, expert-drafted templates for Acceptable AI Use, Model Development Standards, and Data Handling Policies.</p>
          }
        ]
      },
      {
        id: 'framework-mapping',
        title: 'Framework Mapping',
        description: 'Map internal controls directly to external frameworks.',
        sections: [
          {
            id: 'mapping',
            title: 'Control Alignment',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Directly link your internal technical and organizational controls to specific clauses in external regulations like the EU AI Act, NIST AI RMF, and ISO 42001. This ensures a "test once, comply many" approach.</p>
          }
        ]
      },
      {
        id: 'compliance-autopilot',
        title: 'Compliance Autopilot',
        description: 'Automated mapping of controls and identification of compliance gaps.',
        sections: [
          {
            id: 'autopilot',
            title: 'Automated Gap Discovery',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">The Autopilot engine scans your current control implementations and automatically identifies missing requirements against your selected regulatory frameworks, generating actionable alerts.</p>
          }
        ]
      },
      {
        id: 'gap-analysis',
        title: 'Gap Analysis',
        description: 'Tools to identify missing controls against selected frameworks.',
        sections: [
          {
            id: 'analysis',
            title: 'Structured Auditing',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Perform structured internal audits to identify exactly which policies, tests, or technical controls are missing to achieve full certification for a specific framework.</p>
          }
        ]
      },
      {
        id: 'regulatory-velocity',
        title: 'Regulatory Velocity',
        description: 'Tracking of upcoming regulatory changes and their impact.',
        sections: [
          {
            id: 'velocity',
            title: 'Monitoring Changes',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Stay ahead of the curve by tracking pending legislation globally. The module assesses how new laws will impact your existing AI portfolio and control structure.</p>
          }
        ]
      },
      {
        id: 'regulator-filings',
        title: 'Regulator Filings & Transparency Reports',
        description: 'Automated generation of reports required by external regulators.',
        sections: [
          {
            id: 'reports',
            title: 'Automated Reporting',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Instantly compile and format mandatory transparency reports and regulatory filings (e.g., EU AI Act conformity declarations) pulling live data directly from your inventory and evidence vault.</p>
          }
        ]
      },
      {
        id: 'governance-mesh',
        title: 'Governance Mesh',
        description: 'Visualizing the interconnected governance structures.',
        sections: [
          {
            id: 'mesh',
            title: 'Interconnected Visualization',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">A graphical representation showing the complex relationships between Models, Risks, Controls, Policies, and Vendors, providing a holistic view of your governance architecture.</p>
          }
        ]
      }
    ]
  },
  {
    id: 'inventory',
    title: 'Model & Asset Inventory',
    description: 'Track the complete lifecycle, BOM, and data provenance of your AI assets.',
    icon: Brain,
    articles: [
      {
        id: 'model-inventory',
        title: 'Model Inventory & Lifecycle',
        description: 'End-to-end tracking of models from development to retirement.',
        sections: [
          {
            id: 'tracking',
            title: 'Lifecycle Management',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">A comprehensive registry for all AI systems. Track a model's journey through ideation, development, testing, deployment, and eventual retirement, enforcing mandatory stage-gate approvals before progression.</p>
          }
        ]
      },
      {
        id: 'ai-bom',
        title: 'AI BOM Registry',
        description: 'AI Bill of Materials tracking.',
        sections: [
          {
            id: 'bom',
            title: 'Dependency Tracking',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Maintain an exhaustive Software Bill of Materials specific to AI (AI BOM). Track foundational model dependencies, open-source libraries, specific weight versions, and underlying architectures.</p>
          }
        ]
      },
      {
        id: 'prompt-registry',
        title: 'Prompt Registry',
        description: 'Version control and risk assessment of LLM prompts.',
        sections: [
          {
            id: 'registry',
            title: 'Version Control',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">A dedicated vault for system prompts and user templates. Version control prompt changes, tag them with risk levels, and track how prompt engineering impacts model output safety and accuracy.</p>
          }
        ]
      },
      {
        id: 'datasets',
        title: 'Datasets & Data Quality',
        description: 'Tracking of training/testing datasets and data quality metrics.',
        sections: [
          {
            id: 'quality',
            title: 'Dataset Tracking',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Inventory the specific datasets used for fine-tuning and evaluation. Monitor data quality metrics, distribution drift, and ensure the data used aligns with the model's intended purpose.</p>
          }
        ]
      },
      {
        id: 'data-lineage',
        title: 'Data Lineage & Provenance Graph',
        description: 'Visual graphing of where data came from and how it moves through models.',
        sections: [
          {
            id: 'lineage',
            title: 'Provenance Tracking',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">A visual mapping tool that traces the exact origin of training data, highlighting its journey through preprocessing pipelines and into the final model, ensuring copyright and licensing compliance.</p>
          }
        ]
      },
      {
        id: 'model-efficiency',
        title: 'Model Efficiency',
        description: 'Tracking model compute and performance metrics.',
        sections: [
          {
            id: 'metrics',
            title: 'Compute Monitoring',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Monitor the operational efficiency of deployed models, tracking metrics such as inference latency, token utilization costs, and GPU compute requirements.</p>
          }
        ]
      }
    ]
  },
  {
    id: 'agents',
    title: 'Autonomous Agents & Automation',
    description: 'Govern non-human identities, agent choreographies, and automated workflows.',
    icon: Robot,
    articles: [
      {
        id: 'agent-registry',
        title: 'Agent Registry',
        description: 'Inventory of all deployed autonomous agents.',
        sections: [
          {
            id: 'registry',
            title: 'Agent Discovery',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Automatically discover and catalog all autonomous, agentic AI systems operating within the enterprise network, preventing the unchecked spread of "Shadow Agents".</p>
          }
        ]
      },
      {
        id: 'agent-iam',
        title: 'Agent IAM',
        description: 'Identity and Access Management specifically for AI agents.',
        sections: [
          {
            id: 'iam',
            title: 'Non-Human Identities',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Manage the specific permissions and API keys granted to autonomous agents. Enforce strict least-privilege access to ensure agents cannot perform unauthorized actions on backend systems.</p>
          }
        ]
      },
      {
        id: 'choreography',
        title: 'Multi-Agent Choreography',
        description: 'Managing workflows that involve multiple interacting agents.',
        sections: [
          {
            id: 'workflows',
            title: 'Agent Interaction',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Design, monitor, and secure complex processes where multiple AI agents collaborate, hand-off tasks, and share context, ensuring there are no security breaks during handovers.</p>
          }
        ]
      },
      {
        id: 'automation-studio',
        title: 'Automation Studio',
        description: 'Workflow builder for governance automations.',
        sections: [
          {
            id: 'studio',
            title: 'No-Code Workflows',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">A drag-and-drop interface to build automated governance workflows. Trigger security scans, send Slack approvals, or update Jira tickets automatically when a model changes stage.</p>
          }
        ]
      },
      {
        id: 'kill-switch',
        title: 'Kill Switch Events',
        description: 'Emergency shutoff tracking and execution for rogue models.',
        sections: [
          {
            id: 'emergency',
            title: 'Emergency Shutoff',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Provides administrators with instant "Kill Switch" capabilities to sever an agent's or model's access to production systems if rogue behavior is detected. Fully tracks who initiated the shutoff and why.</p>
          }
        ]
      }
    ]
  },
  {
    id: 'audit',
    title: 'Audit, Testing & Evidence Management',
    description: 'Maintain immutable logs, collect cryptographic evidence, and run control tests.',
    icon: FileText,
    articles: [
      {
        id: 'audit-trails',
        title: 'Audit Trails & Explorers',
        description: 'Immutable system logs, decision logs, and an Audit Log Explorer to search them.',
        sections: [
          {
            id: 'logs',
            title: 'Immutable Logging',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Maintains a secure, append-only ledger of every critical action taken within the platform. The Explorer interface allows security teams to rapidly search and filter logs during forensic investigations.</p>
          }
        ]
      },
      {
        id: 'incident-logging',
        title: 'Incident Logging & Workflow',
        description: 'End-to-end incident response management and tracking.',
        sections: [
          {
            id: 'response',
            title: 'Incident Management',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">A dedicated workflow for reporting AI-related incidents (e.g., a data leak via an LLM). Track the incident from initial triage through containment, eradication, and post-mortem review.</p>
          }
        ]
      },
      {
        id: 'evidence-vault',
        title: 'Evidence Vault & Chain of Custody',
        description: 'Secure storage for compliance evidence with cryptographic tracking.',
        sections: [
          {
            id: 'vault',
            title: 'Secure Evidence',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Upload and store PDF reports, screenshots, and architecture diagrams. Every uploaded file is cryptographically hashed to prove it has not been tampered with since creation, ensuring a strict chain of custody.</p>
          }
        ]
      },
      {
        id: 'control-testing',
        title: 'Control Testing',
        description: 'Automated and manual testing of governance controls.',
        sections: [
          {
            id: 'testing',
            title: 'Validating Controls',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Schedule and execute tests to verify that required governance controls (e.g., "Is MFA enforced for Model Deployers?") are actually functioning as designed.</p>
          }
        ]
      },
      {
        id: 'examination-manager',
        title: 'Examination Manager',
        description: 'Workflows for managing external audits and regulatory examinations.',
        sections: [
          {
            id: 'manager',
            title: 'Audit Coordination',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">A dedicated portal for coordinating with external auditors or regulators. Securely package and share scoped evidence, policies, and control test results without granting full system access.</p>
          }
        ]
      },
      {
        id: 'tabletop-exercises',
        title: 'Tabletop Exercises',
        description: 'Simulations for incident response preparedness.',
        sections: [
          {
            id: 'simulations',
            title: 'Preparedness Drills',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Run simulated AI catastrophe scenarios (e.g., "Prompt injection leads to PII leak") to test your team's incident response playbooks and identify process gaps.</p>
          }
        ]
      },
      {
        id: 'bias-audits',
        title: 'Bias Audits & Evals',
        description: 'Dedicated modules for fairness testing and model evaluations.',
        sections: [
          {
            id: 'audits',
            title: 'Fairness Testing',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Upload test datasets to evaluate models against protected attributes (Age, Gender, Race), calculating metrics like Disparate Impact to ensure algorithmic fairness.</p>
          }
        ]
      }
    ]
  },
  {
    id: 'tprm',
    title: 'Vendor & Supply Chain Risk',
    description: 'Track third-party AI vendors, assess their security posture, and map dependencies.',
    icon: Buildings,
    articles: [
      {
        id: 'vendor-management',
        title: 'Vendor Management',
        description: 'Tracking third-party AI vendors and tools.',
        sections: [
          {
            id: 'management',
            title: 'Third-Party Oversight',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Maintain a comprehensive registry of all external AI vendors (e.g., OpenAI, Anthropic, HuggingFace). Track active contracts, SLA compliance, and overall vendor risk scores.</p>
          }
        ]
      },
      {
        id: 'supply-chain-graph',
        title: 'Supply Chain Graph',
        description: 'Visual mapping of the AI supply chain and dependencies.',
        sections: [
          {
            id: 'graph',
            title: 'Dependency Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">A dynamic visualization showing exactly which internal applications rely on which external vendor APIs, instantly highlighting cascading risks and single points of failure in your AI supply chain.</p>
          }
        ]
      },
      {
        id: 'supply-chain-attestations',
        title: 'Supply Chain Attestations',
        description: 'Management of vendor security questionnaires and attestations.',
        sections: [
          {
            id: 'attestations',
            title: 'Security Questionnaires',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Dispatch standardized security questionnaires (like the SIG or custom AI-specific templates) to vendors and track their completed compliance attestations.</p>
          }
        ]
      }
    ]
  },
  {
    id: 'privacy-ethics',
    title: 'Privacy, Ethics & ESG',
    description: 'Manage data rights, whistleblower reporting, and carbon footprints.',
    icon: Leaf,
    articles: [
      {
        id: 'consent-management',
        title: 'Consent Management',
        description: 'Tracking user consent for data used in AI training.',
        sections: [
          {
            id: 'consent',
            title: 'Tracking Consent',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Ensure that any personal data utilized in model training or fine-tuning has documented, explicit user consent, mitigating massive GDPR and CCPA violation risks.</p>
          }
        ]
      },
      {
        id: 'dsr-management',
        title: 'DSR Management',
        description: 'Handling Data Subject Rights requests.',
        sections: [
          {
            id: 'dsr',
            title: 'Right to be Forgotten',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Workflows to handle Data Subject Rights (DSR) requests, ensuring that when a user exercises their right to erasure, their data is provably purged from both training datasets and active models.</p>
          }
        ]
      },
      {
        id: 'ropa',
        title: 'RoPA',
        description: 'Records of Processing Activities for GDPR compliance.',
        sections: [
          {
            id: 'processing',
            title: 'GDPR Article 30',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Maintain detailed Records of Processing Activities specifically tailored for complex AI data flows, satisfying the strict documentation requirements of GDPR.</p>
          }
        ]
      },
      {
        id: 'ethics-reporting',
        title: 'Ethics Reporting',
        description: 'Whistleblower and ethics violation submission and tracking.',
        sections: [
          {
            id: 'whistleblower',
            title: 'Anonymous Submissions',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Provide a secure, anonymous portal for internal employees to report potential AI ethics violations, biased model outputs, or unsafe development practices directly to the governance team.</p>
          }
        ]
      },
      {
        id: 'esg-ledger',
        title: 'ESG & Carbon Ledger',
        description: 'Tracking energy efficiency and carbon footprints of AI model training/inference.',
        sections: [
          {
            id: 'carbon',
            title: 'Sustainability Tracking',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Calculate and log the massive energy consumption and carbon emissions resulting from training large language models and daily inference operations, feeding directly into corporate ESG reporting.</p>
          }
        ]
      }
    ]
  },
  {
    id: 'operations',
    title: 'Workflows, Approvals & Operations',
    description: 'High-level dashboards, task tracking, and human-in-the-loop review queues.',
    icon: Clock,
    articles: [
      {
        id: 'executive-center',
        title: 'Executive Center & Overview',
        description: 'High-level dashboards for the C-suite (CRO/CISO).',
        sections: [
          {
            id: 'dashboards',
            title: 'C-Suite Visibility',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Roll-up dashboards designed for Chief Risk Officers and CISOs, providing an instant, high-level view of the organization's total AI risk exposure, compliance readiness, and incident metrics.</p>
          }
        ]
      },
      {
        id: 'model-risk-committee',
        title: 'Model Risk Committee',
        description: 'Dedicated views for committee reviews and voting.',
        sections: [
          {
            id: 'committee',
            title: 'Governance Voting',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">A specialized portal for the Model Risk Committee to review high-risk deployments. Members can view bundled evidence, discuss concerns, and cast cryptographically signed votes to approve or reject a model.</p>
          }
        ]
      },
      {
        id: 'approval-workflows',
        title: 'Approval Workflows',
        description: 'Multi-stage sign-offs for model deployments.',
        sections: [
          {
            id: 'sign-offs',
            title: 'Stage-Gate Controls',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Enforce strict stage-gates requiring multi-departmental sign-off (e.g., Legal, Security, Data Science) before an AI system can be moved from staging into production environments.</p>
          }
        ]
      },
      {
        id: 'tasks-remediation',
        title: 'Tasks & Remediation Tracker',
        description: 'Task management for fixing identified vulnerabilities or gaps.',
        sections: [
          {
            id: 'tasks',
            title: 'Fixing Vulnerabilities',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">A centralized Kanban board and task manager for assigning, tracking, and verifying the remediation of vulnerabilities found during Red Teaming, Bias Audits, or Gap Analyses.</p>
          }
        ]
      },
      {
        id: 'hitl',
        title: 'Human-In-The-Loop (HITL)',
        description: 'Workflows requiring human review of AI decisions.',
        sections: [
          {
            id: 'review',
            title: 'Manual Oversight',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">A dedicated queue for routing low-confidence or highly sensitive AI decisions to human reviewers. Ensures compliance with regulations requiring human oversight for automated decision-making.</p>
          }
        ]
      },
      {
        id: 'marketplace',
        title: 'Marketplace & Integrations',
        description: 'Integration management for external tools.',
        sections: [
          {
            id: 'integrations',
            title: 'Connecting Tools',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Manage API connections and webhooks to external operational tools like Jira, Slack, MLflow, AWS SageMaker, and Azure ML, pulling governance data directly from where development happens.</p>
          }
        ]
      },
      {
        id: 'peer-intelligence',
        title: 'Peer Intelligence',
        description: 'Benchmarking risk posture against industry peers.',
        sections: [
          {
            id: 'benchmarking',
            title: 'Industry Benchmarking',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Opt-in, anonymized data sharing that allows you to benchmark your organization's AI risk posture, control maturity, and incident frequency against peers in the same industry vertical.</p>
          }
        ]
      }
    ]
  }
];

// Mapping routes to specific collections to open by default
export const ROUTE_TO_COLLECTION_MAP: Record<string, string> = {
  '/overview': 'getting-started',
  '/models': 'inventory',
  '/risk': 'risk-management',
  '/compliance': 'governance',
  '/evals': 'audit',
  '/security': 'risk-management',
  '/vendors': 'tprm',
  '/agents': 'agents',
  '/audits': 'audit',
  '/policies': 'governance',
  '/hitl': 'operations',
  '/workflows': 'operations',
  '/tasks': 'operations',
  '/ropa': 'privacy-ethics',
  '/dsr': 'privacy-ethics',
};
