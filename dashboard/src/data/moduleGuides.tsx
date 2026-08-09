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
                  Sentinel is an enterprise-grade AI Governance, Risk, and Compliance (GRC) platform. It provides a centralized control plane for organizations to track their AI systems, enforce compliance with global regulations (such as the EU AI Act), and actively manage the risks inherent in developing or procuring AI technologies.
                </p>
                <p className="mb-4 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                  By unifying model inventory, vendor oversight, risk registers, and automated compliance mapping, Sentinel eliminates the siloed approach to AI safety. It is designed to be deployed securely within your own infrastructure, ensuring that sensitive governance data and proprietary model IP never leave your security perimeter.
                </p>
              </>
            )
          },
          {
            id: 'core-capabilities',
            title: 'Core Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-3 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Centralized Model Inventory:</strong> Track every AI asset from development through retirement with mandatory approval gates.</li>
                <li><strong>Dynamic Risk Management:</strong> Automated risk tiering, visual risk matrices, and comprehensive risk registers for both internal models and third-party APIs.</li>
                <li><strong>Automated Compliance:</strong> Map internal controls to frameworks like NIST AI RMF and ISO 42001, utilizing the Compliance Autopilot for gap analysis.</li>
                <li><strong>Agentic Governance:</strong> Discover and apply strict Identity and Access Management (IAM) controls to autonomous AI agents operating within your network.</li>
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
        description: 'Automated classification of AI risks and visual matrix plotting.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">The AI Risk Tiering module automatically categorizes your AI models into distinct risk levels (e.g., Unacceptable, High, Limited, Minimal) based on their intended use case, data inputs, and autonomous capabilities. This tiering dictates the strictness of the governance workflows required before deployment.</p>
          },
          {
            id: 'how-it-works',
            title: 'How It Works in Sentinel',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Data Ingestion:</strong> When a new model is registered, the system ingests its metadata, including data types processed (e.g., PII, PHI) and decision-making authority.</li>
                <li><strong>Automated Classification:</strong> A rules-engine evaluates this metadata against predefined regulatory definitions (like the EU AI Act's high-risk criteria) to assign a baseline tier.</li>
                <li><strong>Visual Matrix:</strong> The Risk Matrix dynamically plots these models on a 5x5 grid based on their calculated Likelihood and Impact scores, instantly drawing attention to critical vulnerabilities in the red zones.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'risk-register',
        title: 'Risk Register',
        description: 'Centralized repository for all identified AI risks.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">The Risk Register is the heart of Sentinel's risk management suite. It serves as a single, immutable ledger where all identified vulnerabilities—whether discovered through red teaming, automated scans, or manual assessments—are documented and tracked through to mitigation.</p>
          },
          {
            id: 'how-it-works',
            title: 'Operational Workflow',
            content: (
              <ul className="list-decimal pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Risk Logging:</strong> Users log a new risk, categorizing it by domain (e.g., Data Privacy, Algorithmic Bias, Model Evasion).</li>
                <li><strong>Scoring:</strong> The user assigns Inherent Risk scores for Likelihood and Impact.</li>
                <li><strong>Mitigation Assignment:</strong> The risk is assigned to a specific owner, and a mitigation plan is documented.</li>
                <li><strong>Residual Tracking:</strong> As compensating controls (like rate limiting or data anonymization) are implemented, the system recalculates the Residual Risk score, demonstrating improved security posture.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'specialized-assessments',
        title: 'Specialized Assessments (DPIA, AIIA)',
        description: 'Conduct deep-dive impact assessments.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Before deploying high-risk systems, organizations must conduct structured assessments to evaluate potential harms. Sentinel digitizes these complex workflows, replacing static spreadsheets with interactive, auditable forms.</p>
          },
          {
            id: 'assessment-types',
            title: 'Supported Assessments',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Data Protection Impact Assessments (DPIA):</strong> Mandated by GDPR, this workflow assesses the privacy risks of models processing sensitive personal data, ensuring data minimization and purpose limitation are enforced.</li>
                <li><strong>AI Impact Assessments (AIIA):</strong> A broader evaluation looking at societal harms, potential for discrimination, and human rights impacts, crucial for compliance with emerging global AI frameworks.</li>
                <li><strong>Business Impact Assessments (BIA):</strong> Evaluates the financial and operational consequences if the AI system experiences downtime or catastrophic failure.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'genai-risks',
        title: 'GenAI Risks & Red Teaming',
        description: 'Track Generative AI vulnerabilities and attack findings.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Generative AI introduces novel attack vectors that traditional risk management tools miss. This module is specifically designed to track vulnerabilities unique to Large Language Models (LLMs) and coordinate adversarial testing efforts.</p>
          },
          {
            id: 'how-it-works',
            title: 'Tracking & Remediation',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>OWASP LLM Integration:</strong> Risks are automatically categorized against the OWASP Top 10 for LLMs (e.g., Prompt Injection, Insecure Output Handling, Training Data Poisoning).</li>
                <li><strong>Red Team Management:</strong> Security teams log the exact prompts, parameters, and successful jailbreaks discovered during Red Teaming exercises.</li>
                <li><strong>Patch Verification:</strong> Developers update system prompts or implement guardrails, and the Red Team re-tests the specific vulnerabilities, closing the loop on the finding.</li>
              </ul>
            )
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
        title: 'Policy Management & Editor',
        description: 'Author and track governance policies with built-in templates.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Policies are the foundation of any governance program. Sentinel replaces fragmented Word documents with a centralized, version-controlled Policy Manager, ensuring everyone in the organization operates under the most current AI guidelines.</p>
          },
          {
            id: 'how-it-works',
            title: 'Authoring & Workflows',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Rich Text Editor:</strong> Draft policies directly in the platform using a collaborative editor.</li>
                <li><strong>Template Library:</strong> Start from scratch or use Sentinel's pre-built templates for Acceptable AI Use, Vendor Risk Thresholds, and Data Handling.</li>
                <li><strong>Approval Workflows:</strong> Policies in 'Draft' state are routed to designated stakeholders (Legal, CISO) for mandatory sign-off before transitioning to 'Published' status.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'framework-mapping',
        title: 'Framework Mapping & Autopilot',
        description: 'Map internal controls directly to external regulatory frameworks.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Navigating overlapping regulations is complex. Sentinel's Framework Mapping allows you to define an internal control once and map it to multiple external requirements, drastically reducing audit fatigue.</p>
          },
          {
            id: 'how-it-works',
            title: 'Mapping & Gap Analysis',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Control Definition:</strong> Define a technical control (e.g., "All LLM inputs must be sanitized for PII").</li>
                <li><strong>Cross-Mapping:</strong> Link this single control to ISO 42001 Clause 8, NIST AI RMF Manage 1.1, and EU AI Act Article 14 simultaneously.</li>
                <li><strong>Compliance Autopilot:</strong> The system constantly scans your mapped controls against newly imported frameworks, instantly generating a Gap Analysis report highlighting areas where you lack coverage.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'regulator-filings',
        title: 'Regulator Filings & Transparency',
        description: 'Automated generation of required external reports.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Laws like the EU AI Act mandate strict public transparency and direct filings to regulatory bodies. This module automates the painstaking process of gathering data to compile these legally binding documents.</p>
          },
          {
            id: 'how-it-works',
            title: 'Automated Generation',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Data Aggregation:</strong> The module pulls live data from the Model Inventory, Risk Register, and Evidence Vault.</li>
                <li><strong>Conformity Declarations:</strong> Automatically formats the data into required structures, such as the EU Declaration of Conformity.</li>
                <li><strong>Transparency Center:</strong> Generates sanitized, public-facing summaries of your AI systems for publication on your corporate website, fulfilling transparency obligations without revealing trade secrets.</li>
              </ul>
            )
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
        title: 'Model Inventory & Lifecycle',
        description: 'End-to-end tracking of models from development to retirement.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">You cannot govern what you cannot see. The Model Inventory is the central repository for every AI system utilized by your organization, providing total visibility into what models exist, what they do, and what stage of the lifecycle they are in.</p>
          },
          {
            id: 'how-it-works',
            title: 'Lifecycle Tracking',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Registration:</strong> Data Scientists register new projects, defining the model architecture, intended use case, and business owner.</li>
                <li><strong>Stage Gates:</strong> Models progress through defined lifecycle stages (Ideation &rarr; Development &rarr; Staging &rarr; Production &rarr; Retired). Moving a model to Production is blocked until all required control tests and DPIAs are signed off.</li>
                <li><strong>Monitoring:</strong> Once in production, the inventory card serves as the central hub linking to active incidents, risk metrics, and performance evaluations.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'ai-bom',
        title: 'AI BOM & Prompt Registry',
        description: 'Track model dependencies, weights, and version-controlled prompts.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Modern AI relies heavily on open-source foundations and complex prompting. Sentinel tracks these deep dependencies through an AI Bill of Materials (AI BOM) and a version-controlled Prompt Registry.</p>
          },
          {
            id: 'how-it-works',
            title: 'Dependency Management',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>AI BOM:</strong> Automatically logs the base foundational models (e.g., Llama-3-8B), the specific dataset versions used for fine-tuning, and the software libraries (PyTorch, Transformers) required for inference. This allows rapid patching if a specific library version is compromised.</li>
                <li><strong>Prompt Versioning:</strong> The Prompt Registry stores all system instructions and guardrail prompts. Changes are versioned, allowing teams to rollback to previous prompts if a new version inadvertently increases hallucination rates or bypasses safety filters.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'data-lineage',
        title: 'Data Lineage & Provenance Graph',
        description: 'Visual tracking of data origins and movement.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Understanding exactly what data trained a model is critical for copyright compliance, bias mitigation, and defending against data poisoning attacks. The Lineage module visually maps this flow.</p>
          },
          {
            id: 'how-it-works',
            title: 'Visual Graphing',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Source Tracking:</strong> Logs the exact origin of datasets (e.g., Internal CRM, Web Scrape, Purchased third-party data).</li>
                <li><strong>Pipeline Visualization:</strong> A nodal graph shows how data flows from the source, through specific preprocessing scripts (anonymization, deduplication), and into the final training run.</li>
                <li><strong>Auditability:</strong> If a copyright claim arises regarding a specific data source, the graph instantly highlights every production model that was trained using that tainted data, enabling surgical remediation.</li>
              </ul>
            )
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
        id: 'agent-iam',
        title: 'Agent Registry & IAM',
        description: 'Identity and Access Management specifically for AI agents.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">As AI shifts from simple chatbots to autonomous agents executing actions (reading emails, updating databases), securing their access is paramount. Sentinel extends traditional IAM principles to Non-Human Identities (NHIs).</p>
          },
          {
            id: 'how-it-works',
            title: 'Securing Agents',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Agent Discovery:</strong> The platform catalogs all autonomous agents operating within the network, capturing their intended function and the backend systems they integrate with.</li>
                <li><strong>Least Privilege:</strong> Security teams use the Agent IAM interface to restrict agent capabilities. An agent designed to draft emails should be strictly denied write access to the central financial database, enforced via API gateways and Sentinel's policy engine.</li>
                <li><strong>Kill Switch:</strong> In the event of rogue behavior (e.g., an agent caught in an infinite loop modifying files), administrators can trigger a tracked Kill Switch event, instantly revoking the agent's API tokens and halting its operations.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'choreography',
        title: 'Multi-Agent Choreography & Automation',
        description: 'Managing workflows involving multiple interacting agents.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Advanced enterprise workflows increasingly involve multiple specialized AI agents handing off tasks to one another. Sentinel provides visibility and governance over these complex, multi-step choreographies.</p>
          },
          {
            id: 'how-it-works',
            title: 'Workflow Management',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Process Mapping:</strong> Visualize the communication pathways between agents (e.g., Agent A extracts invoice data &rarr; passes context to Agent B for fraud detection &rarr; passes to Agent C for payment approval).</li>
                <li><strong>Automation Studio:</strong> Use Sentinel's no-code builder to inject governance checkpoints into these workflows. For example, mandate a Human-In-The-Loop review if Agent B's fraud confidence score drops below 95%.</li>
              </ul>
            )
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
        title: 'Audit Trails & Incident Workflow',
        description: 'Immutable system logs and end-to-end incident response.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">True accountability requires an unbreakable record of actions. Sentinel maintains an immutable ledger of every governance decision and provides robust workflows for managing AI-specific incidents when things go wrong.</p>
          },
          {
            id: 'how-it-works',
            title: 'Forensics and Response',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Audit Log Explorer:</strong> A highly searchable interface querying the append-only ledger. Easily determine exactly who approved a model for production, what evidence they reviewed, and at what timestamp the decision was made.</li>
                <li><strong>Incident Logging:</strong> A dedicated portal for reporting AI failures (e.g., hallucinations in customer support, data leaks). Integrates with Tabletop Exercises to simulate catastrophes and test response playbooks before real incidents occur.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'evidence-vault',
        title: 'Evidence Vault & Control Testing',
        description: 'Secure storage for compliance evidence with cryptographic tracking.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Compliance is only as good as the evidence proving it. Sentinel provides a secure repository and automated testing framework to ensure controls are not just documented, but actively effective.</p>
          },
          {
            id: 'how-it-works',
            title: 'Evidence Management',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Cryptographic Vault:</strong> Users upload artifacts (architecture diagrams, pen-test reports). Sentinel generates a cryptographic hash of the file upon upload, guaranteeing to external auditors that the evidence has not been subsequently altered.</li>
                <li><strong>Control Testing:</strong> Security teams define tests (manual or automated) linked to specific controls. The Examination Manager organizes these test results into neat packages that can be securely exported to external regulators during official audits.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'bias-evals',
        title: 'Bias Audits & LLM Evals',
        description: 'Test models for fairness and generative quality.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Beyond security, AI must be fair and performant. This module provides dedicated testing suites to quantify algorithmic bias and benchmark the linguistic quality of Large Language Models.</p>
          },
          {
            id: 'how-it-works',
            title: 'Testing Methodologies',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Bias Audits:</strong> Upload evaluation datasets containing protected attributes (e.g., race, gender, age). The engine calculates fairness metrics like Disparate Impact and Equal Opportunity, flagging statistically significant discrimination in model outputs.</li>
                <li><strong>LLM Evals:</strong> Run batch prompts through LLMs to score them on qualitative metrics. Evaluate outputs for Faithfulness (preventing hallucinations), Relevance, and Toxicity before deploying generative systems to users.</li>
              </ul>
            )
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
        title: 'Vendor Management & Supply Chain Graph',
        description: 'Oversight for third-party AI providers and dependency mapping.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Organizations rarely build AI entirely in-house. Relying on third-party APIs (OpenAI, Anthropic) introduces significant supply chain risk. Sentinel provides robust Third-Party Risk Management (TPRM) specifically tailored for AI vendors.</p>
          },
          {
            id: 'how-it-works',
            title: 'Mapping & Oversight',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Vendor Registry:</strong> Centralized profiles for all external AI vendors, tracking active service agreements, data processing addendums (DPAs), and historical SLA breaches.</li>
                <li><strong>Supply Chain Attestations:</strong> Sentinel automates the dispatch and tracking of security questionnaires sent to vendors, ensuring they comply with your internal security standards before integration is allowed.</li>
                <li><strong>Supply Chain Graph:</strong> A powerful visualization tool linking your internal applications to the specific external vendor APIs they rely on. If a vendor announces a breach or experiences an outage, the graph instantly highlights which of your internal tools are critically affected.</li>
              </ul>
            )
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
        id: 'privacy-dsr',
        title: 'Privacy, Consent & DSR',
        description: 'GDPR compliance, consent tracking, and Data Subject Rights.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">AI models are notoriously hungry for data, often resulting in privacy violations. Sentinel ensures that data used for training is legally sourced and compliant with regulations like GDPR and CCPA.</p>
          },
          {
            id: 'how-it-works',
            title: 'Data Rights Management',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Consent Management:</strong> Tracks explicit user consent attached to datasets. If consent is revoked, Sentinel flags the datasets and the models trained on them for review.</li>
                <li><strong>DSR Management:</strong> Automates workflows for handling Data Subject Rights requests, such as the 'Right to be Forgotten.' It ensures that when a user requests deletion, their data is provably purged from both raw datasets and active model weights.</li>
                <li><strong>RoPA:</strong> Generates and maintains Records of Processing Activities tailored to complex AI data pipelines, fulfilling mandatory documentation requirements for data protection authorities.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'ethics-esg',
        title: 'Ethics Reporting & ESG Carbon Ledger',
        description: 'Whistleblower workflows and environmental tracking.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Responsible AI extends beyond security; it encompasses social ethics and environmental sustainability. Sentinel provides tools to foster an ethical culture and track the massive carbon footprint of AI compute.</p>
          },
          {
            id: 'how-it-works',
            title: 'Reporting & Tracking',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Ethics Reporting:</strong> An encrypted, anonymous portal allowing employees or users to blow the whistle on unethical AI development practices, biased model deployments, or unsafe data handling.</li>
                <li><strong>ESG Carbon Ledger:</strong> Training large foundational models requires vast amounts of electricity. This module integrates with cloud providers to calculate the kilowatt-hours and carbon tonnage resulting from training runs and daily inference, outputting data formatted for corporate ESG and sustainability reports.</li>
              </ul>
            )
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
        id: 'executive-dashboards',
        title: 'Executive Center & Risk Committee',
        description: 'High-level dashboards for leadership and committee voting.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Governance data is only useful if it's actionable. The Operations suite translates granular technical data into high-level business intelligence and facilitates formal executive decision-making.</p>
          },
          {
            id: 'how-it-works',
            title: 'Executive Visibility',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Executive Center:</strong> Roll-up dashboards tailored for the C-Suite (CISO, CRO) displaying total portfolio risk, compliance burn-down charts, and active severe incidents. It cuts through the technical noise to answer: "Are we safe and compliant?"</li>
                <li><strong>Model Risk Committee:</strong> A dedicated portal for governance boards. Members review comprehensive evidence packages for high-risk models and utilize cryptographic voting mechanisms to officially approve or block deployments, creating an undeniable audit trail of executive accountability.</li>
                <li><strong>Peer Intelligence:</strong> Opt-in benchmarking that compares your organization's AI risk posture, incident rates, and control maturity against anonymized data from industry peers.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'operational-workflows',
        title: 'HITL, Tasks & Integrations',
        description: 'Human-in-the-loop queues, remediation tracking, and marketplace integrations.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">The day-to-day execution of AI governance requires managing tasks, reviewing edge cases, and connecting with the broader tech stack where developers actually work.</p>
          },
          {
            id: 'how-it-works',
            title: 'Daily Operations',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Human-In-The-Loop (HITL):</strong> Automated systems route low-confidence AI decisions (e.g., an automated loan denial) into a centralized queue for manual human review, ensuring compliance with regulations that ban fully automated decisions with legal effects.</li>
                <li><strong>Tasks & Remediation Tracker:</strong> A Kanban-style board for security teams to assign and track the fixing of vulnerabilities identified during audits or red teaming.</li>
                <li><strong>Marketplace & Integrations:</strong> Connect Sentinel directly to operational tools. Sync Jira tickets for remediation tasks, trigger Slack alerts for Kill Switch events, and pull model metadata directly from AWS SageMaker or MLflow registries.</li>
              </ul>
            )
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
