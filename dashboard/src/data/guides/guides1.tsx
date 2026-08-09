import React from 'react';
import { Collection } from '../moduleGuides';
import { 
  SquaresFour, Robot, Plugs, Database
} from '@phosphor-icons/react';

export const guides1: Collection[] = [
  {
    id: 'overview',
    title: 'Overview',
    description: 'High-level dashboards and reporting for enterprise visibility.',
    icon: SquaresFour,
    articles: [
      {
        id: 'dashboard',
        title: 'Dashboard',
        description: 'Your central command center for AI governance.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">The main Dashboard provides an aggregated, real-time view of your entire AI portfolio. It is designed to surface immediate action items, critical alerts, and high-level metrics so that governance teams can assess the platform's overall health at a single glance.</p>
          },
          {
            id: 'capabilities',
            title: 'Key Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Portfolio Metrics:</strong> Instantly view the total number of deployed models, active agents, and pending approvals.</li>
                <li><strong>Active Alerts:</strong> Highlights recent policy violations, failed guardrails, or newly discovered vulnerabilities in the AI supply chain.</li>
                <li><strong>Quick Actions:</strong> Direct deep-links to jump immediately into pending HITL reviews or critical risk assessments.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'tasks',
        title: 'Tasks',
        description: 'Centralized task management and workflow tracking.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">The Tasks module serves as a unified inbox for all governance-related actions required by the user, ensuring that critical compliance steps (like approving a DPIA or reviewing a model) are never missed.</p>
          },
          {
            id: 'capabilities',
            title: 'Key Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Unified Inbox:</strong> Aggregates tasks from across all Sentinel modules (Risk, Compliance, Security) into one centralized queue.</li>
                <li><strong>SLA Tracking:</strong> Monitors the time-to-completion for required actions, escalating overdue tasks to managers or the CISO.</li>
                <li><strong>Direct Execution:</strong> Users can click into a task and complete the required form or approval directly from the task view without navigating away.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'notifications',
        title: 'Notifications',
        description: 'System-wide alerts and communication center.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Keeps stakeholders informed of critical events in real-time. Whether an automated guardrail blocked an injection attack or a model transitioned to production, the Notifications engine ensures the right people know instantly.</p>
          },
          {
            id: 'capabilities',
            title: 'Key Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Event Routing:</strong> Granular controls to route specific alert types to specific roles (e.g., Security alerts go to the CISO, Operational alerts go to the Model Owner).</li>
                <li><strong>Integration Hooks:</strong> Seamlessly pushes notifications out to external tools like Slack, Microsoft Teams, or Jira for immediate triage.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'reporting',
        title: 'Reporting',
        description: 'Custom report generation and data exports.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">The Reporting suite enables users to extract raw data and formatted insights from the platform to share with external stakeholders, regulators, or internal board members.</p>
          },
          {
            id: 'capabilities',
            title: 'Key Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Custom Builder:</strong> Select specific datasets (e.g., all high-risk models missing a DPIA) and generate custom tabular or graphical reports.</li>
                <li><strong>Scheduled Delivery:</strong> Automate the generation and email delivery of weekly compliance summaries to department heads.</li>
                <li><strong>Format Export:</strong> Export capabilities to PDF, CSV, and secure Excel formats for downstream processing.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'ciso-dashboard',
        title: 'CISO Dashboard & Board Report',
        description: 'Executive-level security visibility.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Designed specifically for the Chief Information Security Officer, this dashboard cuts through the operational noise to present the true security posture of the enterprise's AI ecosystem.</p>
          },
          {
            id: 'capabilities',
            title: 'Key Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Risk Rollup:</strong> Aggregates vulnerabilities across all models, agents, and vendors into a single enterprise risk score.</li>
                <li><strong>Board Report Generator:</strong> One-click generation of board-ready presentations that translate technical AI risks into financial and operational business impacts.</li>
                <li><strong>Incident Velocity:</strong> Tracks the frequency and resolution speed of AI-related security incidents over time.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'executive-center',
        title: 'Executive Center',
        description: 'Strategic oversight for business leaders.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Provides business leaders (CEO, CRO, Legal) with visibility into how AI is being utilized across different business units, ensuring strategic alignment and regulatory safety.</p>
          },
          {
            id: 'capabilities',
            title: 'Key Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Departmental Breakdown:</strong> View AI adoption rates and compliance scores split by department or geographic region.</li>
                <li><strong>Strategic Alignment:</strong> Tracks whether deployed models map to approved enterprise use cases and business goals.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'roi',
        title: 'ROI & Value',
        description: 'Track the financial return of AI deployments.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">AI initiatives are expensive. This module tracks the compute costs, API fees, and development hours against the estimated business value generated by each model to calculate true ROI.</p>
          },
          {
            id: 'capabilities',
            title: 'Key Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Cost Ingestion:</strong> Integrates with AWS, Azure, and API gateways to pull live token/compute costs for specific models.</li>
                <li><strong>Value Tracking:</strong> Allows business owners to input estimated time-savings or revenue generated by the AI system.</li>
                <li><strong>Profitability Matrix:</strong> Visualizes which models are generating the most value relative to their operational and risk costs.</li>
              </ul>
            )
          }
        ]
      }
    ]
  },
  {
    id: 'ai-governance',
    title: 'AI Governance',
    description: 'End-to-end governance for models, evaluations, and autonomous agents.',
    icon: Robot,
    articles: [
      {
        id: 'model-governance',
        title: 'Model Governance (Registry, Lifecycle, DNA, Prompts)',
        description: 'Complete lifecycle tracking for AI assets.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">The core of Sentinel's capability. This suite tracks every AI model from its initial conception to its final retirement, ensuring that no model enters production without strict documentation and approval.</p>
          },
          {
            id: 'capabilities',
            title: 'Key Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Model Registry:</strong> A centralized database of all internal and external models, tracking owners, versions, and statuses.</li>
                <li><strong>Model Lifecycle:</strong> Enforces stage-gates. A model cannot move from 'Development' to 'Staging' until designated tasks (like security scans) are completed and signed off.</li>
                <li><strong>Model DNA & Lineage:</strong> Visually traces the exact datasets used to train a model, ensuring copyright compliance and identifying tainted data sources.</li>
                <li><strong>Prompt Registry:</strong> Version controls system prompts. Roll back to previous prompts instantly if a new instruction causes increased hallucinations or safety violations.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'impact-risk',
        title: 'Impact & Risk (AIIA, Use Cases, MRC)',
        description: 'Structured risk assessments and committee oversight.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Mandates the evaluation of potential harms before deployment. It digitizes the complex assessment workflows required by the EU AI Act and NIST AI RMF.</p>
          },
          {
            id: 'capabilities',
            title: 'Key Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Impact Assessments (AIIA):</strong> Step-by-step workflows to evaluate fundamental rights impacts, algorithmic bias, and societal harms.</li>
                <li><strong>Risk Classification:</strong> Automatically tiers models (Minimal, High, Unacceptable) based on the ingested Use Case Registry data.</li>
                <li><strong>Model Risk Committee (MRC):</strong> A dedicated portal where executives review high-risk deployments, view attached evidence, and cast cryptographically secured votes for approval or rejection.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'validation-evals',
        title: 'Validation & Evals (Bias, Metrics, Datasets)',
        description: 'Quantitative testing for fairness and performance.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Provides the tools necessary to quantitatively prove that a model is safe, fair, and performant before it goes live. Shifts governance from policy documents to mathematical proofs.</p>
          },
          {
            id: 'capabilities',
            title: 'Key Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Bias Audits:</strong> Upload evaluation datasets to measure Disparate Impact and Equal Opportunity across protected attributes (age, race, gender).</li>
                <li><strong>Metric Studio & Explainability:</strong> Track model drift over time and utilize SHAP/LIME integrations to understand exactly why a model made a specific decision.</li>
                <li><strong>Scenario Editor & Session Viewer:</strong> Replay multi-turn LLM conversations to debug complex agent behaviors and identify exactly where a model deviated from instructions.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'agent-control',
        title: 'Agent Control (Shadow AI, IAM, Kill Switch)',
        description: 'Governance for autonomous, non-human identities.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">As AI transitions from static chatbots to autonomous agents taking actions in enterprise systems, Agent Control enforces strict Identity and Access Management (IAM) for non-human entities.</p>
          },
          {
            id: 'capabilities',
            title: 'Key Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Shadow AI Discovery:</strong> Scans network traffic and API logs to identify unauthorized AI tools or agents operating without oversight.</li>
                <li><strong>Agent Permissions (IAM):</strong> Applies strict least-privilege access rules to agents. (e.g., An agent reading emails cannot execute database writes).</li>
                <li><strong>Choreography Canvas & Kill Switch:</strong> Map out how multiple agents interact. If an agent goes rogue or gets trapped in a loop, the one-click Emergency Kill Switch immediately revokes its API keys and halts execution.</li>
              </ul>
            )
          }
        ]
      },
      {
        id: 'runtime-trust',
        title: 'Runtime Trust (Guardrails, Traces, Config)',
        description: 'Live monitoring and intervention during inference.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Governance doesn't stop at deployment. Runtime Trust actively monitors models in production, intervening in real-time to block malicious inputs or unsafe outputs.</p>
          },
          {
            id: 'capabilities',
            title: 'Key Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Active Guardrails:</strong> Sits in front of the model to intercept and block prompt injections, PII leakage, or toxic outputs before they are processed.</li>
                <li><strong>Live Inference Traces & Tools:</strong> View real-time logs of the model's "thought process" and tool utilization.</li>
                <li><strong>Fallback Failovers:</strong> Automatically routes traffic to a backup model (e.g., falling back from GPT-4 to Claude 3) if the primary model degrades in performance or fails a guardrail check.</li>
              </ul>
            )
          }
        ]
      }
    ]
  },
  {
    id: 'ai-gateway',
    title: 'AI Gateway',
    description: 'Centralized routing, security, and logging for AI APIs.',
    icon: Plugs,
    articles: [
      {
        id: 'gateway-features',
        title: 'Endpoints, Playgrounds & Routing',
        description: 'Manage API traffic and test models interactively.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">The AI Gateway acts as a secure proxy between your internal applications and external LLM providers (like OpenAI or Anthropic). It centralizes API keys, enforces rate limits, and standardizes logs.</p>
          },
          {
            id: 'capabilities',
            title: 'Key Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Endpoints & Virtual Keys:</strong> Developers use Sentinel Virtual Keys instead of real OpenAI keys. Sentinel routes the traffic, allowing security teams to instantly revoke access without rotating upstream provider keys.</li>
                <li><strong>Playground & Prompts:</strong> An interactive environment to test prompts against multiple models simultaneously before committing them to code.</li>
                <li><strong>Guardrails & Logs:</strong> Inspects all traffic passing through the gateway. Blocks restricted terms and logs full request/response pairs for compliance auditing.</li>
              </ul>
            )
          }
        ]
      }
    ]
  },
  {
    id: 'mcp-gateway',
    title: 'MCP Gateway',
    description: 'Manage Model Context Protocol servers and tools.',
    icon: Database,
    articles: [
      {
        id: 'mcp-servers',
        title: 'MCP Servers & Tool Catalog',
        description: 'Secure context delivery for LLMs.',
        sections: [
          {
            id: 'overview',
            title: 'Overview & Purpose',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">The Model Context Protocol (MCP) standardizes how AI models access external data. The MCP Gateway governs these connections, ensuring models only access the specific context they are authorized to see.</p>
          },
          {
            id: 'capabilities',
            title: 'Key Capabilities',
            content: (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[hsl(var(--text-2))] leading-relaxed">
                <li><strong>Server Management:</strong> Register and monitor the health of internal MCP servers exposing enterprise data (e.g., Jira tickets, Confluence docs) to your agents.</li>
                <li><strong>Tool Catalog & Guardrails:</strong> Define exactly which tools an agent is allowed to invoke. Apply strict guardrails to prevent an agent from invoking destructive actions (like deleting a database record) without explicit permission.</li>
                <li><strong>HITL Approvals:</strong> Certain high-risk MCP tool calls can be configured to pause execution and request a Human-In-The-Loop approval before proceeding.</li>
              </ul>
            )
          }
        ]
      }
    ]
  }
];
