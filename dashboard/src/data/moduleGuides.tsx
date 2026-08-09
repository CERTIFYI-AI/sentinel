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
                <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">You can also install additional frameworks (SOC 2, GDPR, HIPAA and others) through the plugin system.</p>
              </>
            )
          },
          {
            id: 'other-things-included',
            title: 'Other things included',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li>Policy manager with versioning, approval workflows and status tracking</li>
                <li>Evidence hub for uploading and organizing compliance documentation</li>
                <li>AI trust center that generates a public transparency page</li>
                <li>Training registry to assign courses and track staff completion</li>
                <li>Incident management for logging AI-related incidents and corrective actions</li>
                <li>Role-based access (Admin, Reviewer, Editor, Auditor) with organization-level isolation</li>
                <li>Event tracker with a full audit trail of who did what and when</li>
                <li>Integrations with Slack, MLflow, and custom webhooks via automations</li>
              </ul>
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
                <div>
                  <h4 className="font-semibold text-[hsl(var(--text-1))] text-sm mb-1">Cloud VMs</h4>
                  <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Works on any Linux VM (AWS, GCP, Azure, Render, DigitalOcean).</p>
                </div>
                <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed mt-4">The stack runs on PostgreSQL and Redis. Authentication supports email/password, Google OAuth2 and Microsoft Entra ID.</p>
              </div>
            )
          },
          {
            id: 'next-steps',
            title: 'Where to go from here',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Install</strong> — Get the platform running in your environment (20-30 minutes)</li>
                <li><strong>Dashboard tour</strong> — Understand the layout, sidebar and key metrics</li>
                <li><strong>Quick start</strong> — Create your first AI use case and upload evidence in under 10 minutes</li>
              </ul>
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
        description: 'Automated classification of AI risks.',
        sections: [
          {
            id: 'tiering',
            title: 'Automated Risk Tiering',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Sentinel automatically analyzes model metadata and use cases to assign a risk tier (e.g., Unacceptable, High, Limited, Minimal) based on guidelines like the EU AI Act.</p>
          },
          {
            id: 'matrix',
            title: 'Visual Risk Matrix',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Risks are plotted on a 5x5 matrix comparing Likelihood vs. Impact. This provides a visual heatmap, instantly highlighting critical risks in the top-right quadrant that require immediate mitigation.</p>
          }
        ]
      },
      {
        id: 'risk-register',
        title: 'Risk Register & Intelligence',
        description: 'Centralized repository and insights for AI risks.',
        sections: [
          {
            id: 'register',
            title: 'The Risk Register',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">A central ledger where all identified AI risks are documented. You can score them, assign owners, track mitigations, and monitor the residual risk score over time as controls are applied.</p>
          },
          {
            id: 'intelligence',
            title: 'Risk Intelligence',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Aggregated dashboards that provide insights and scoring on your organization's overall risk posture, helping executives understand exposure trends.</p>
          }
        ]
      },
      {
        id: 'specialized-assessments',
        title: 'Specialized Assessments',
        description: 'Conduct deep-dive impact assessments (DPIA, TIA, BIA, AIIA).',
        sections: [
          {
            id: 'dpia',
            title: 'Data Protection (DPIA)',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Workflows for Data Protection Impact Assessments to ensure compliance with GDPR Article 35 when processing personal data in AI models.</p>
          },
          {
            id: 'aiia',
            title: 'AI Impact Assessments (AIIA)',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Comprehensive evaluations specific to AI systems, assessing potential harms, biases, and operational impacts before a high-risk model is deployed.</p>
          }
        ]
      },
      {
        id: 'genai-financial-risk',
        title: 'GenAI & Financial Risk',
        description: 'Track generative AI vulnerabilities and financial exposure.',
        sections: [
          {
            id: 'genai',
            title: 'GenAI Risks',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Specific tracking for Generative AI vulnerabilities (like the OWASP LLM Top 10), including prompt injection and data leakage, alongside findings from Red Team exercises.</p>
          },
          {
            id: 'financial',
            title: 'Financial Risk Modeling',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Tools to model and track the potential financial exposure or losses related to AI system failures, regulatory fines, or operational downtime.</p>
          }
        ]
      }
    ]
  },
  {
    id: 'governance',
    title: 'Governance & Compliance',
    description: 'Manage policies, map controls to regulatory frameworks, and automate compliance gap analysis.',
    icon: ShieldCheck,
    articles: [
      {
        id: 'policy-management',
        title: 'Policy Management',
        description: 'Author and track governance policies.',
        sections: [
          {
            id: 'editor',
            title: 'Policy Editor & Templates',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Use the built-in rich text Policy Editor and standardized Policy Templates to draft, review, and publish AI governance policies. Track version history and enforce approval workflows before policies go live.</p>
          }
        ]
      },
      {
        id: 'framework-mapping',
        title: 'Frameworks & Gap Analysis',
        description: 'Align internal controls with external regulations.',
        sections: [
          {
            id: 'mapping',
            title: 'Framework Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Directly map your internal controls to requirements in frameworks like the EU AI Act, NIST AI RMF, and ISO 42001.</p>
          },
          {
            id: 'autopilot',
            title: 'Compliance Autopilot & Gap Analysis',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">The Autopilot automatically identifies gaps in your compliance coverage against selected frameworks, highlighting areas where new controls must be implemented to achieve certification.</p>
          }
        ]
      },
      {
        id: 'regulatory',
        title: 'Regulatory Radar & Filings',
        description: 'Monitor regulatory changes and generate required reports.',
        sections: [
          {
            id: 'radar',
            title: 'Regulatory Velocity',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Track upcoming global regulatory changes and measure their velocity and potential impact on your existing control landscape.</p>
          },
          {
            id: 'filings',
            title: 'Filings & Transparency',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Automate the generation of Transparency Reports and official Regulator Filings required by laws like the EU AI Act.</p>
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
        id: 'model-lifecycle',
        title: 'Inventory & Lifecycle',
        description: 'End-to-end tracking of AI models.',
        sections: [
          {
            id: 'tracking',
            title: 'Lifecycle Tracking',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Manage models from initial development through staging, production, and eventual retirement. Progression through stages requires passing specific approval gates.</p>
          }
        ]
      },
      {
        id: 'bom-provenance',
        title: 'BOM & Data Provenance',
        description: 'Track dependencies and data origins.',
        sections: [
          {
            id: 'aibom',
            title: 'AI BOM Registry',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Maintain an AI Bill of Materials (BOM) tracking the foundational models, weights, datasets, and open-source libraries your AI systems depend on.</p>
          },
          {
            id: 'lineage',
            title: 'Data Lineage & Provenance Graph',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Visually graph where training data originated and how it flows through your models, ensuring full traceability and data quality.</p>
          }
        ]
      },
      {
        id: 'prompts-efficiency',
        title: 'Prompts & Efficiency',
        description: 'Manage LLM prompts and track compute metrics.',
        sections: [
          {
            id: 'prompts',
            title: 'Prompt Registry',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Version control your LLM prompts, assign risk tags, and track how prompt engineering changes affect model output and security.</p>
          },
          {
            id: 'efficiency',
            title: 'Model Efficiency',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Monitor compute utilization, token costs, and performance metrics to ensure models are running efficiently in production.</p>
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
        title: 'Agent Registry & IAM',
        description: 'Inventory and access control for AI agents.',
        sections: [
          {
            id: 'registry',
            title: 'Agent Discovery',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Automatically discover and inventory all deployed autonomous agents operating in your environment, flagging unapproved "Shadow AI".</p>
          },
          {
            id: 'iam',
            title: 'Agent IAM',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Manage Identity and Access Management specifically for non-human identities, ensuring agents operate under strict least-privilege principles.</p>
          }
        ]
      },
      {
        id: 'automation',
        title: 'Choreography & Automation',
        description: 'Manage multi-agent workflows and emergency controls.',
        sections: [
          {
            id: 'choreography',
            title: 'Multi-Agent Choreography',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Design and monitor complex workflows that involve multiple autonomous agents interacting with each other.</p>
          },
          {
            id: 'kill-switch',
            title: 'Kill Switch Events',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Emergency shutoff capabilities to halt rogue models or agents, with full tracking of who executed the kill switch and why.</p>
          }
        ]
      }
    ]
  },
  {
    id: 'audit',
    title: 'Audit, Testing & Evidence',
    description: 'Maintain immutable logs, collect cryptographic evidence, and run control tests.',
    icon: FileText,
    articles: [
      {
        id: 'audit-trails',
        title: 'Audit Trails & Incident Logging',
        description: 'System logs and incident response.',
        sections: [
          {
            id: 'trail',
            title: 'Audit Log Explorer',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">An immutable, append-only log of all system and decision events. Use the Explorer to search logs for forensics and chain-of-custody verification.</p>
          },
          {
            id: 'incidents',
            title: 'Incident Workflow',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">End-to-end management of AI incidents, from initial logging through to resolution and post-mortem playbooks.</p>
          }
        ]
      },
      {
        id: 'evidence-testing',
        title: 'Evidence & Control Testing',
        description: 'Secure evidence storage and testing.',
        sections: [
          {
            id: 'vault',
            title: 'Evidence Vault',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">A secure repository for compliance documentation. Every piece of evidence is cryptographically hashed to ensure a verifiable chain of custody.</p>
          },
          {
            id: 'testing',
            title: 'Control Testing & Exams',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Manage automated and manual tests of your governance controls, and use the Examination Manager to coordinate external audits.</p>
          }
        ]
      },
      {
        id: 'evals',
        title: 'Bias Audits & Evals',
        description: 'Test models for fairness and quality.',
        sections: [
          {
            id: 'bias',
            title: 'Bias Audits',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Dedicated modules for testing models against protected attributes to ensure fairness and prevent algorithmic discrimination.</p>
          },
          {
            id: 'quality',
            title: 'Model Evaluations',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Run benchmark datasets to score models on metrics like hallucination rate, relevance, and faithfulness.</p>
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
        id: 'vendors',
        title: 'Vendor Management',
        description: 'Oversight for third-party AI providers.',
        sections: [
          {
            id: 'registry',
            title: 'Vendor Registry',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Maintain a catalog of all third-party AI vendors (e.g., OpenAI, Anthropic), tracking their active contracts, SLA breaches, and overall risk scores.</p>
          },
          {
            id: 'attestations',
            title: 'Supply Chain Attestations',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Dispatch security questionnaires to vendors and track their signed compliance attestations.</p>
          },
          {
            id: 'graph',
            title: 'Supply Chain Graph',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">A visual dependency map showing exactly which internal models rely on which external vendor APIs, highlighting single points of failure.</p>
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
        id: 'privacy',
        title: 'Privacy & Data Rights',
        description: 'GDPR compliance and consent tracking.',
        sections: [
          {
            id: 'consent',
            title: 'Consent & DSR Management',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Track user consent for data used in AI training, and manage Data Subject Rights (DSR) requests like the right to erasure.</p>
          },
          {
            id: 'ropa',
            title: 'RoPA',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Maintain Records of Processing Activities (RoPA) specifically tailored for AI data flows to ensure GDPR Article 30 compliance.</p>
          }
        ]
      },
      {
        id: 'ethics-esg',
        title: 'Ethics & ESG',
        description: 'Whistleblower workflows and environmental tracking.',
        sections: [
          {
            id: 'ethics',
            title: 'Ethics Reporting',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Secure, anonymous submission workflows for internal employees or external users to report AI ethics violations or concerns.</p>
          },
          {
            id: 'esg',
            title: 'ESG & Carbon Ledger',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Track the energy consumption and carbon footprint of massive model training runs and daily inference workloads for sustainability reporting.</p>
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
        id: 'dashboards',
        title: 'Executive Dashboards',
        description: 'Command centers for leadership.',
        sections: [
          {
            id: 'executive',
            title: 'Executive Center',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">High-level, aggregated dashboards designed for the C-suite (CRO/CISO) to instantly understand portfolio risk and compliance health.</p>
          },
          {
            id: 'committee',
            title: 'Model Risk Committee',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Dedicated views for governance committees to review high-risk deployments and cast formal votes of approval.</p>
          }
        ]
      },
      {
        id: 'workflows',
        title: 'Workflows & Tasks',
        description: 'Manage tasks and human reviews.',
        sections: [
          {
            id: 'approvals',
            title: 'Approval Workflows',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Multi-stage sign-off workflows that prevent models from moving to production without required security and compliance checks.</p>
          },
          {
            id: 'tasks',
            title: 'Tasks & Remediation Tracker',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Centralized task management for assigning and tracking the remediation of identified vulnerabilities or compliance gaps.</p>
          },
          {
            id: 'hitl',
            title: 'Human-In-The-Loop (HITL)',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">A queue for managing AI decisions that were flagged (e.g., due to low confidence) and require manual human review and approval before execution.</p>
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
