import {
  RocketLaunch,
  Brain,
  ShieldWarning,
  Warning,
  ShieldCheck,
  Robot,
  ChartBar,
  FileText,
  UserCircleCheck,
  Buildings,
  Flask,
  Scales,
  Target,
  FileCode,
  Users,
  Eye,
  Graph,
  Key,
  Database,
  Lightning,
  MagnifyingGlass,
  Checks
} from '@phosphor-icons/react'
import React from 'react'

export interface DetailedFeature {
  title: string
  description: string
  howItWorks: string
  icon: React.ElementType
}

export interface ModuleDocumentation {
  title: string
  overview: string
  features: DetailedFeature[]
}

// A fallback guide for any unmapped routes
export const DEFAULT_GUIDE: ModuleDocumentation = {
  title: 'Platform Overview',
  overview: 'Welcome to Sentinel AI GRC. This platform provides continuous governance, risk, and compliance monitoring for your AI models and agents.',
  features: [
    {
      title: 'Global Navigation',
      description: 'Use the left sidebar to jump between modules. Use the top command palette (press "/") for quick actions.',
      howItWorks: 'The platform is divided into major domains: Risk, Compliance, Security, AI Governance, and Trust Engine. Navigate between them to manage different aspects of your AI portfolio.',
      icon: Graph,
    },
    {
      title: 'Contextual Actions',
      description: 'Most tables and grids support actions like exporting to CSV/PDF, filtering, and bulk operations.',
      howItWorks: 'Look for the action menus (usually three dots or export buttons) at the top right of data tables to interact with the data.',
      icon: ChartBar,
    }
  ]
}

export const MODULE_GUIDES: Record<string, ModuleDocumentation> = {
  '/overview': {
    title: 'Executive Dashboard',
    overview: 'The Executive Dashboard is the main command center providing a high-level, aggregated view of your entire AI portfolio\'s health, risk posture, and compliance gaps.',
    features: [
      {
        title: 'KPI Metrics',
        description: 'Track the total number of models, open high-severity risks, and compliance gaps across the organization.',
        howItWorks: 'Metrics are calculated in real-time by aggregating data from the Model Inventory, Risk Register, and Compliance Gap Analysis engines. Clicking a KPI card will drill down into the specific records making up that number.',
        icon: ChartBar,
      },
      {
        title: 'Risk Posture Trend',
        description: 'Monitor the aggregated risk score and trend line over time to gauge organizational risk exposure.',
        howItWorks: 'The Risk Posture chart plots historical risk data by capturing a daily snapshot of all Open and Critical risks in the Risk Register. A downward trend indicates successful mitigation efforts.',
        icon: Warning,
      },
      {
        title: 'Recent Activity Feed',
        description: 'A chronological feed of the most critical events happening across the platform.',
        howItWorks: 'The activity feed aggregates high-priority events from the Audit Trail, Trust Engine alerts, and newly logged security vulnerabilities to give executives immediate context.',
        icon: Eye,
      }
    ]
  },
  '/models': {
    title: 'AI Model Governance',
    overview: 'Manage the complete lifecycle, inventory, and architectural DNA of your AI models from development through retirement.',
    features: [
      {
        title: 'Model Inventory',
        description: 'A centralized registry of all deployed AI models, tracking ownership, risk tiers, and deployment status.',
        howItWorks: 'When registering a new model, you must provide its metadata, business purpose, and owner. The system then calculates an initial risk tier (e.g., Minimal, High, Unacceptable) based on EU AI Act guidelines.',
        icon: Robot,
      },
      {
        title: 'Model Lifecycle Tracking',
        description: 'Track a model\'s progression from Development to Staging, Production, and eventual Retirement.',
        howItWorks: 'Transitioning a model to "Production" requires passing an Approval Workflow. You cannot promote a high-risk model without an approved AI Impact Assessment (AIIA) attached.',
        icon: RocketLaunch,
      },
      {
        title: 'AI Bill of Materials (BOM)',
        description: 'Manage the supply chain dependencies, weights, and foundational models underlying your deployments.',
        howItWorks: 'The AI BOM automatically parses linked repositories (or accepts manual uploads) to map exactly which foundational models (e.g., Llama-3, GPT-4), datasets, and open-source libraries your model depends on.',
        icon: FileCode,
      }
    ]
  },
  '/risk': {
    title: 'Risk Management',
    overview: 'Identify, classify, and mitigate risks associated with your AI deployments, calculating aggregate exposure.',
    features: [
      {
        title: 'Risk Register',
        description: 'The central ledger for all documented risks. Log new risks, assign owners, and track mitigation efforts.',
        howItWorks: 'Each risk is assigned a Likelihood and Impact score (1-5). The system multiplies these to generate a Inherent Risk Score. As mitigating controls are applied, a Residual Risk Score is calculated.',
        icon: Warning,
      },
      {
        title: 'Risk Matrix Heatmap',
        description: 'Visualize risks on a 5x5 matrix comparing likelihood vs. impact to prioritize mitigation strategies.',
        howItWorks: 'The matrix plots all active risks dynamically. Risks in the top-right red zone require immediate remediation or executive exception approval before the associated model can go live.',
        icon: Graph,
      },
      {
        title: 'Incident Logging',
        description: 'Track and respond to AI-related incidents and operational failures as they occur.',
        howItWorks: 'Incidents can be manually logged or auto-created via Trust Engine alerts. Each incident triggers a workflow requiring root-cause analysis and the implementation of a new preventative control.',
        icon: ShieldWarning,
      }
    ]
  },
  '/compliance': {
    title: 'Compliance & Controls',
    overview: 'Map internal controls to external regulatory frameworks (like EU AI Act, ISO 42001) and monitor compliance gaps.',
    features: [
      {
        title: 'Control Library',
        description: 'Define internal governance controls and link them to specific risks and frameworks.',
        howItWorks: 'Controls are the operational rules your company follows (e.g., "All models must have a bias audit"). You define the control, assign an owner, and specify the testing frequency (Monthly, Quarterly, Annually).',
        icon: ShieldCheck,
      },
      {
        title: 'Framework Mapping',
        description: 'Map internal controls to standard regulatory requirements to identify compliance coverage.',
        howItWorks: 'Select a framework (e.g., NIST AI RMF). The Gap Analysis engine cross-references your active controls against the framework\'s requirements, highlighting missing controls as red "Gaps" that need to be addressed.',
        icon: Target,
      },
      {
        title: 'Evidence Hub',
        description: 'Store and link cryptographic evidence verifying that controls are operating effectively.',
        howItWorks: 'When a control is tested, the auditor uploads evidence (PDFs, logs, screenshots). The system hashes this evidence for immutability and attaches it to the control record for external audit readiness.',
        icon: FileText,
      }
    ]
  },
  '/security': {
    title: 'Security Center',
    overview: 'Monitor the cybersecurity posture, track adversarial vulnerabilities, and manage red-teaming exercises.',
    features: [
      {
        title: 'Threat Feed',
        description: 'Real-time intelligence on emerging threats and adversarial campaigns targeting AI systems.',
        howItWorks: 'The feed ingests data from external threat intelligence sources (like MITRE ATLAS) and highlights which of your internal models might be susceptible based on their AI BOM dependencies.',
        icon: ShieldWarning,
      },
      {
        title: 'Attack Surface',
        description: 'Visualize the exploitable attack vectors and pathways into your AI infrastructure.',
        howItWorks: 'By analyzing API endpoints, model inputs, and access logs, the system maps potential entry points (e.g., Prompt Injection vectors) and scores their current defensive posture.',
        icon: Graph,
      },
      {
        title: 'Red Team Lab',
        description: 'Manage adversarial testing exercises and track vulnerabilities discovered during red teaming.',
        howItWorks: 'Create a Red Team Campaign targeting a specific model. Log findings (e.g., "Data Exfiltration via indirect prompt injection") and assign them as remediation tasks to the engineering team.',
        icon: Flask,
      }
    ]
  },
  '/agents': {
    title: 'Agentic Governance',
    overview: 'Discover, monitor, and govern autonomous AI agents operating within your environment.',
    features: [
      {
        title: 'Agent Discovery',
        description: 'Automatically detect and inventory active AI agents and their capabilities.',
        howItWorks: 'The platform integrates with your infrastructure (via API or network scanning) to identify active agent instances (e.g., AutoGPT, custom LangChain agents) and logs their core capabilities and tools.',
        icon: Brain,
      },
      {
        title: 'Shadow AI Detection',
        description: 'Identify unauthorized or unapproved AI agents operating outside of standard governance guardrails.',
        howItWorks: 'If an agent is detected in the environment that does not exist in the official Agent Registry, it is flagged as "Shadow AI", triggering a Critical Security Alert.',
        icon: Lightning,
      },
      {
        title: 'Agent IAM',
        description: 'Manage Identity and Access Management specifically tailored for non-human autonomous agents.',
        howItWorks: 'Assign specific roles and permissions to Agents (just like human users). For example, restrict an agent from accessing the `ExecuteSQL` tool unless it explicitly requires it.',
        icon: Key,
      }
    ]
  },
  '/trust-engine': {
    title: 'Trust Engine Observability',
    overview: 'Live observability and guardrail enforcement for real-time AI inference traffic.',
    features: [
      {
        title: 'Guardrail Activity',
        description: 'Monitor real-time triggers, blocks, and warnings enforced by policy guardrails on AI outputs.',
        howItWorks: 'When an AI model generates text, it passes through the Trust Engine. If the text violates a policy (e.g., contains PII or toxicity), the guardrail triggers, either redacting the text, blocking the request, or logging a warning.',
        icon: ShieldCheck,
      },
      {
        title: 'Live Trace Feed',
        description: 'Inspect full request and response payloads for AI interactions to debug trust issues.',
        howItWorks: 'Click into any trace to see the exact JSON payload sent to the LLM, the exact response received, the latency, and which guardrails evaluated the payload.',
        icon: MagnifyingGlass,
      },
      {
        title: 'Cost & Token Tracking',
        description: 'Track token consumption and infrastructure costs associated with model inference.',
        howItWorks: 'The engine parses token usage headers from providers (like OpenAI or Anthropic) and multiplies them by configured cost rates to generate real-time spend analytics.',
        icon: Database,
      }
    ]
  },
  '/vendors': {
    title: 'Third-Party Risk Management',
    overview: 'Assess and monitor the risk of third-party AI vendors and supply chains.',
    features: [
      {
        title: 'Vendor Registry',
        description: 'Maintain a catalog of all third-party AI providers and their current risk status.',
        howItWorks: 'Log vendors (e.g., OpenAI, HuggingFace). The system aggregates their security scores, active DPAs, and associated models to generate a Vendor Risk Score.',
        icon: Buildings,
      },
      {
        title: 'Vendor Assessments',
        description: 'Dispatch and score security questionnaires to evaluate vendor compliance.',
        howItWorks: 'Send automated questionnaires to vendors. Once they respond, the system scores their answers against your internal security baselines and highlights critical deficiencies.',
        icon: Checks,
      }
    ]
  },
  '/evals': {
    title: 'Model Evaluations',
    overview: 'Run automated evaluations, benchmark metrics, and inspect multi-turn session traces to ensure model quality.',
    features: [
      {
        title: 'Quality Metrics',
        description: 'Track and score models across key quality and performance dimensions.',
        howItWorks: 'Configure metric profiles (e.g., Relevance, Hallucination Rate, Faithfulness). The eval engine runs benchmark datasets through the model and uses LLM-as-a-judge techniques to score the outputs.',
        icon: Target,
      },
      {
        title: 'Session Traces',
        description: 'View full conversation logs and traces to debug specific interactions.',
        howItWorks: 'For chatbot models, view the entire multi-turn conversation history. This allows you to pinpoint exactly where a conversation derailed or a hallucination was introduced.',
        icon: Eye,
      }
    ]
  },
  '/hitl': {
    title: 'Human-In-The-Loop (HITL)',
    overview: 'Review and approve AI decisions that require manual human oversight due to high risk or low confidence.',
    features: [
      {
        title: 'Review Queue',
        description: 'Manage pending AI decisions escalated for human review.',
        howItWorks: 'When a model\'s confidence score falls below a threshold (e.g., 80%), the decision is routed to this queue. A human reviewer must examine the context and click "Approve" or "Reject" before the action executes.',
        icon: UserCircleCheck,
      }
    ]
  },
  '/bias-audits': {
    title: 'Bias Auditing',
    overview: 'Test models for algorithmic bias and unfairness across protected attributes.',
    features: [
      {
        title: 'Bias Metrics',
        description: 'Analyze fairness scores to ensure models do not discriminate.',
        howItWorks: 'Upload a test dataset containing protected attributes (e.g., Gender, Race). The audit engine calculates Disparate Impact and Equal Opportunity rates to flag statistically significant bias.',
        icon: Scales,
      }
    ]
  },
  '/access-control': {
    title: 'Access Control (RBAC)',
    overview: 'Manage users, roles, and identity governance to enforce least-privilege access across the platform.',
    features: [
      {
        title: 'Role Management',
        description: 'Assign granular permissions and scope access for human users.',
        howItWorks: 'Create custom roles (e.g., "Auditor", "Model Owner"). Map these roles to specific permissions (like `read:models`, `write:risks`) to ensure users can only modify assets they own.',
        icon: Users,
      }
    ]
  },
  '/audits': {
    title: 'Audit Management',
    overview: 'Plan, schedule, and track formal internal and external compliance audits.',
    features: [
      {
        title: 'Audit Planning',
        description: 'Scope the timeline and objectives for upcoming formal audits.',
        howItWorks: 'Create a new Audit Record, assign a lead auditor, select the target framework (e.g., ISO 42001), and link the specific controls that will be tested during the engagement.',
        icon: FileText,
      }
    ]
  },
  '/exceptions': {
    title: 'Exception Management',
    overview: 'Manage formal requests to bypass standard policies or risk controls temporarily.',
    features: [
      {
        title: 'Exception Workflows',
        description: 'Route policy bypass requests to the appropriate executives for sign-off.',
        howItWorks: 'If an engineering team needs to deploy a model without a completed Bias Audit, they file an Exception. It routes to the CISO for approval, with a strict expiration date.',
        icon: ShieldWarning,
      }
    ]
  },
  '/tasks': {
    title: 'Task & Remediation Tracking',
    overview: 'Manage operational GRC tasks and track the remediation of identified risks and vulnerabilities.',
    features: [
      {
        title: 'Remediation SLAs',
        description: 'Track task completion against strict Service Level Agreement deadlines.',
        howItWorks: 'When a critical vulnerability is found, a task is auto-generated and assigned to the model owner. If the task is not closed within the SLA window (e.g., 48 hours), it escalates to management.',
        icon: Checks,
      }
    ]
  }
}
