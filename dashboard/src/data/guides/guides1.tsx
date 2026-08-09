import React from 'react';
import { Collection } from '../moduleGuides';
import { 
  SquaresFour, Robot, Plugs, Database
} from '@phosphor-icons/react';

export const guides1: Collection[] = [
  {
    id: 'overview',
    title: 'Overview',
    description: 'Executive command and enterprise visibility.',
    icon: SquaresFour,
    articles: [
      {
        id: 'dashboard',
        title: 'Dashboard',
        description: 'Single pane of glass for enterprise leadership.',
        sections: [
          {
            id: 'core',
            title: 'Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Aggregates real-time data streams across model endpoints, gateway proxies, validation labs, and runtime agents. It displays active model counts, open compliance gaps, real-time guardrail trigger rates, and system-wide health scores.</p>
          },
          {
            id: 'regulatory',
            title: 'Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">NIST AI RMF (Govern 1.1, Manage 1.1); ISO 42001 (Clause 9.1 Performance Evaluation).</p>
          },
          {
            id: 'auditor',
            title: 'Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Auditors inspect this screen during walkthroughs to verify that management maintains real-time visibility into operational AI assets rather than relying on manual, periodic spreadsheet tracking.</p>
          }
        ]
      },
      {
        id: 'tasks',
        title: 'Tasks',
        description: 'Centralized workflow and remediation tracking.',
        sections: [
          {
            id: 'core',
            title: 'Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">A centralized workflow engine that converts compliance gaps, red-team findings, drift alerts, and pending impact assessments into assigned, trackable work units with SLAs, escalation paths, and status states (Open, In-Review, Mitigated, Exception Granted).</p>
          },
          {
            id: 'regulatory',
            title: 'Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Clause 10.1 Non-conformity and Corrective Action); NIST AI RMF (Manage 2.2).</p>
          },
          {
            id: 'auditor',
            title: 'Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Evaluated during operational effectiveness testing to prove that identified AI risks trigger actionable, trackable remediation workflows rather than unassigned alerts.</p>
          }
        ]
      },
      {
        id: 'notifications',
        title: 'Notifications',
        description: 'Multi-channel alerting infrastructure.',
        sections: [
          {
            id: 'core',
            title: 'Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Multi-channel alerting infrastructure (Webhook, Slack, Teams, PagerDuty, Email) driven by configurable trigger rules (e.g., hallucination rate &gt; 3%, PII leak detected, unauthorized API key attempt, model accuracy drift &gt; 5%).</p>
          },
          {
            id: 'regulatory',
            title: 'Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">EU AI Act (Article 73 - Serious Incident Reporting); NIST AI RMF (Manage 1.3).</p>
          },
          {
            id: 'auditor',
            title: 'Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Verified by sampling historical guardrail breaches and matching them against timestamped notification logs sent to security operations teams.</p>
          }
        ]
      },
      {
        id: 'reporting',
        title: 'Reporting',
        description: 'Automated documentation and export generation.',
        sections: [
          {
            id: 'core',
            title: 'Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Automated document generator that compiles platform telemetry into immutable export formats (PDF, CSV, JSON, SOC 2 Type II evidence packages) formatted for regulators, internal auditors, and external assessment bodies.</p>
          },
          {
            id: 'regulatory',
            title: 'Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">EU AI Act (Article 11 - Technical Documentation); ISO 42001 (Clause 7.5 Documented Information).</p>
          },
          {
            id: 'auditor',
            title: 'Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Tested by verifying that generated documentation matches raw backend telemetry without manual data manipulation or missing model lineage records.</p>
          }
        ]
      },
      {
        id: 'ciso-dashboard',
        title: 'CISO Dashboard & Board Report',
        description: 'High-level security and risk synthesis.',
        sections: [
          {
            id: 'core',
            title: 'Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">High-level dashboard synthesizing technical vulnerabilities, OWASP GenAI Top 10 threat feeds, shadow AI discovery rates, and enterprise risk exposure into executive-level risk indices. Features an automated Board Report generator that translates technical metrics into strategic business risk presentations.</p>
          },
          {
            id: 'regulatory',
            title: 'Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">NIST AI RMF (Govern 1.2 - Executive Leadership Accountability); ISO 42001 (Clause 5.1 Leadership and Commitment).</p>
          },
          {
            id: 'auditor',
            title: 'Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Board reports are inspected by regulatory bodies to confirm that executive leadership and the Board of Directors maintain oversight of material AI liabilities.</p>
          }
        ]
      },
      {
        id: 'executive-center',
        title: 'Executive Center',
        description: 'Cross-departmental posture management.',
        sections: [
          {
            id: 'core',
            title: 'Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Cross-subsidiary and cross-departmental posture management view allowing CEOs, CROs, and General Counsels to evaluate enterprise-wide AI adoption velocity against legal liability thresholds and regional regulatory readiness.</p>
          },
          {
            id: 'regulatory',
            title: 'Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Clause 4.1 Understanding the Organization and its Context).</p>
          },
          {
            id: 'auditor',
            title: 'Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Assessed to ensure governance rules are applied systematically across all operational units, subsidiaries, and geographic locations.</p>
          }
        ]
      },
      {
        id: 'roi',
        title: 'ROI & Value',
        description: 'Quantitative metric engine for AI TRiSM.',
        sections: [
          {
            id: 'core',
            title: 'Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Quantitative engine measuring the business impact of the AI TRiSM program by calculating saved audit hours, avoided regulatory fines (e.g., maximum EU AI Act penalty avoidance modeling), compute cost reductions via gateway routing, and incident prevention metrics.</p>
          },
          {
            id: 'regulatory',
            title: 'Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Strategic business metric supporting ISO 42001 (Clause 6.1 Actions to Address Risks and Opportunities).</p>
          },
          {
            id: 'auditor',
            title: 'Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Reviewed by enterprise buyers and internal audit committees to justify governance overhead against risk-adjusted financial savings.</p>
          }
        ]
      }
    ]
  },
    {
    id: 'ai-governance',
    title: 'AI Governance',
    description: 'Core operational system defining model baselines and assessments.',
    icon: Robot,
    articles: [
      {
        id: 'model-governance',
        title: 'Model Governance',
        description: 'Registry, Lifecycle, DNA Lineage, and Prompt Registry.',
        sections: [
          {
            id: 'registry-overview',
            title: 'Model Registry - Overview',
            content: <div className="space-y-4">
              <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">The Model Inventory serves as the central, authoritative registry for all AI/ML models utilized within the enterprise. It tracks Foundation LLMs, Embedding Models, custom-trained classifiers, and third-party APIs alongside their respective risk tiers and trust scores.</p>
            </div>
          },
          {
            id: 'registry-dashboard',
            title: 'Model Registry - Main Dashboard & Metrics',
            content: <div className="space-y-4">
              <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">The inventory provides a macro-level view of your AI ecosystem:</p>
              <ul className="list-disc pl-5 text-sm text-[hsl(var(--text-2))] space-y-1">
                <li><strong>Total Models:</strong> The complete count of registered assets.</li>
                <li><strong>In Production:</strong> Models actively serving requests.</li>
                <li><strong>High Risk:</strong> Models flagged under the EU AI Act requiring enhanced oversight.</li>
                <li><strong>Avg Trust Score:</strong> Aggregate reliability and safety score across the portfolio.</li>
              </ul>
            </div>
          },
          {
            id: 'registry-list',
            title: 'Model Registry - List View',
            content: <div className="space-y-4">
              <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">The main registry table displays critical telemetry for each model:</p>
              <ul className="list-disc pl-5 text-sm text-[hsl(var(--text-2))] space-y-1">
                <li><strong>Model Details:</strong> Name, version, and unique Model ID.</li>
                <li><strong>Risk Tier:</strong> Visual badges indicating UNACCEPTABLE, HIGH, LIMITED, or MINIMAL risk.</li>
                <li><strong>Status:</strong> The current lifecycle stage.</li>
              </ul>
              <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed mt-2"><strong>Interacting with the Table:</strong> Clicking on a row opens a quick-look detail panel underneath the table. Clicking the External Link icon navigates to the full Model Card.</p>
            </div>
          },
          {
            id: 'lifecycle-overview',
            title: 'Model Lifecycle - Overview',
            content: <div className="space-y-4">
              <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">The Model Lifecycle module manages the formal promotion and deployment governance of your AI models. It acts as an operational pipeline enforcing approval gates before a model can transition from development into production environments.</p>
            </div>
          },
          {
            id: 'lifecycle-pipeline',
            title: 'Model Lifecycle - The Lifecycle Pipeline',
            content: <div className="space-y-4">
              <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">The pipeline consists of strictly defined stages:</p>
              <ol className="list-decimal pl-5 text-sm text-[hsl(var(--text-2))] space-y-1">
                <li><strong>Development:</strong> Model is being built/trained. No production data.</li>
                <li><strong>Testing:</strong> Functional, bias, robustness, and red-team testing phase.</li>
                <li><strong>Staging:</strong> Pre-production validation on prod-like data.</li>
                <li><strong>Production:</strong> Live serving.</li>
                <li><strong>Monitoring:</strong> In production with continuous drift/fairness monitoring.</li>
                <li><strong>Deprecated:</strong> Usage frozen pending retirement.</li>
                <li><strong>Retired:</strong> Fully decommissioned. Endpoints removed.</li>
              </ol>
            </div>
          },
          {
            id: 'lifecycle-transition',
            title: 'Model Lifecycle - Requesting a Transition',
            content: <div className="space-y-4">
              <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">To move a model to the next stage, a formal transition must be requested:</p>
              <ul className="list-disc pl-5 text-sm text-[hsl(var(--text-2))] space-y-1">
                <li><strong>Target Stage:</strong> Select the destination stage.</li>
                <li><strong>Approver / Body:</strong> Define who holds the authority to approve this movement (e.g., Risk Committee, CISO).</li>
                <li><strong>Effective Date:</strong> Specify when the transition should execute.</li>
                <li><strong>Justification:</strong> A mandatory text field explaining why the transition is warranted.</li>
              </ul>
            </div>
          },
          {
            id: 'lifecycle-history',
            title: 'Model Lifecycle - Approval Gate History',
            content: <div className="space-y-4">
              <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Every transition creates an auditable "gate". The history logs the exact stage, the transition kind, the status, and the assigned approver. Approving or rejecting a gate forces the user to input decision remarks. These remarks are permanently appended to the transition log for audit purposes.</p>
            </div>
          },
          {
            id: 'prompt-overview',
            title: 'Prompt Registry - Overview',
            content: <div className="space-y-4">
              <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Version-controlled governance and testing for AI system prompts, ensuring token budgets and safety guardrails are monitored.</p>
            </div>
          },
          {
            id: 'prompt-creating',
            title: 'Prompt Registry - Creating/Initializing',
            content: <div className="space-y-4">
              <ul className="list-disc pl-5 text-sm text-[hsl(var(--text-2))] space-y-1">
                <li><strong>Required Fields:</strong> Prompt Name, Owner, Prompt Content.</li>
                <li><strong>Optional Fields:</strong> Category (System, User, Tool Call, Safety, Chain of Thought), Status, Model (e.g., GPT-4o, Claude-3), Description, Tags, Used By, Initial Version/Change Note.</li>
              </ul>
            </div>
          },
          {
            id: 'prompt-details',
            title: 'Prompt Registry - Inside the module',
            content: <div className="space-y-4">
              <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Prompts open in a detailed right-side sheet with the following tabs:</p>
              <ul className="list-disc pl-5 text-sm text-[hsl(var(--text-2))] space-y-1">
                <li><strong>Content:</strong> Displays raw prompt text, tags, and approval signatures.</li>
                <li><strong>Test:</strong> Allows users to inject variables into templates, view the rendered prompt, and run it against the target model.</li>
                <li><strong>Safety Analysis:</strong> Automated scan results for Prompt Injection Risk, PII Leakage Risk, Jailbreak Resistance, Data Exfiltration Pattern, and a Toxicity Score.</li>
                <li><strong>Version History:</strong> Audit log of all versions, authors, timestamps, and change notes.</li>
              </ul>
            </div>
          }
        ]
      },
      {
        id: 'impact-risk',
        title: 'Impact & Risk (AIIA)',
        description: 'Impact Assessments, Use Cases, Risk Classification, and MRC.',
        sections: [
          {
            id: 'use-case-overview',
            title: 'Use Case Registry - Overview',
            content: <div className="space-y-4">
              <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">A use case is the foundational container that describes an AI system and its business purpose within the organization. It ties together everything from compliance frameworks, linked models, risk registers, and assessments.</p>
            </div>
          },
          {
            id: 'use-case-creating',
            title: 'Use Case Registry - Creating a Use Case',
            content: <div className="space-y-4">
              <p className="text-sm font-semibold text-[hsl(var(--text-1))]">Required Details</p>
              <ul className="list-disc pl-5 text-sm text-[hsl(var(--text-2))] space-y-1">
                <li><strong>Title:</strong> A short, identifiable name for the use case (e.g., "Resume Screening Automation"). Max 64 characters.</li>
                <li><strong>Owner:</strong> The email or name of the primary assignee accountable for the system.</li>
                <li><strong>Goal:</strong> A concise description of what the AI system aims to accomplish.</li>
                <li><strong>AI Risk Classification:</strong> Selected from Prohibited, High risk, Limited risk, or Minimal risk.</li>
                <li><strong>Geography & Industry:</strong> Where the system will operate and its target sector.</li>
              </ul>
            </div>
          },
          {
            id: 'use-case-details',
            title: 'Use Case Registry - Inside a Use Case',
            content: <div className="space-y-4">
              <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Clicking a use case opens its detailed dossier containing multiple tabs:</p>
              <ul className="list-disc pl-5 text-sm text-[hsl(var(--text-2))] space-y-1">
                <li><strong>Overview Tab:</strong> Displays primary properties alongside a visual progress bar for each attached framework.</li>
                <li><strong>Use Case Risks Tab:</strong> A risk register scoped exclusively to this use case.</li>
                <li><strong>Linked Models Tab:</strong> Displays all AI models currently bound to this use case.</li>
                <li><strong>Frameworks & Regulations Tab:</strong> Tracks implementation progress and houses questionnaire-style evaluations.</li>
                <li><strong>CE Marking Tab:</strong> A dedicated compliance checklist for high-risk systems under the EU AI Act.</li>
                <li><strong>Monitoring Tab:</strong> Provides post-market surveillance data for the linked models against defined thresholds.</li>
              </ul>
            </div>
          },
          {
            id: 'aiia-overview',
            title: 'Impact Assessments (AIIA) - Overview',
            content: <div className="space-y-4">
              <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Documents and reviews the impact of AI systems on individuals and society, ensuring compliance with frameworks like EU AI Act Art. 9.</p>
            </div>
          },
          {
            id: 'aiia-details',
            title: 'Impact Assessments (AIIA) - Inside the Module',
            content: <div className="space-y-4">
              <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Assessments open in a side drawer containing:</p>
              <ul className="list-disc pl-5 text-sm text-[hsl(var(--text-2))] space-y-1">
                <li><strong>Header:</strong> Displays Assessment ID, Name, Status Badge, Risk Badge, and Actions (Edit, Submit for Review, Approve, Delete).</li>
                <li><strong>Overview Tab:</strong> Displays metadata (AI System, Dept, Owner, Framework, Version, Dates), Description, Purpose of Use, Data Categories, Affected Groups, Human Oversight details.</li>
                <li><strong>Mitigations & Findings Tab:</strong> Lists risk mitigations (Area, Measure, Status) and specific findings (Severity, Status, Description).</li>
              </ul>
            </div>
          },
          {
            id: 'aiia-workflows',
            title: 'Impact Assessments (AIIA) - Workflows',
            content: <div className="space-y-4">
              <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed"><strong>States:</strong> Draft, In Progress, Pending Review, Approved, Rejected, Completed.</p>
              <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed"><strong>Approval Flow:</strong> Draft -{'>'} Submit for Review -{'>'} Approve (stamps reviewedAt date).</p>
            </div>
          },
          {
            id: 'mrc-overview',
            title: 'Model Risk Committee (MRC) - Overview',
            content: <div className="space-y-4">
              <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Provides model approval governance, voting records, and committee oversight per SR 11-7 and EU AI Act Art. 9.</p>
            </div>
          },
          {
            id: 'mrc-details',
            title: 'Model Risk Committee (MRC) - Inside the Module',
            content: <div className="space-y-4">
              <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Organized through multi-tab navigation:</p>
              <ul className="list-disc pl-5 text-sm text-[hsl(var(--text-2))] space-y-1">
                <li><strong>Current Agenda:</strong> Displays cards of agenda items under review. Members can click Cast Vote on pending items. Voting dialog requires a documented rationale.</li>
                <li><strong>Decision History:</strong> Table of past meetings detailing Date, Type, Items discussed, Outcomes, and Quorum tracking.</li>
                <li><strong>Committee Members:</strong> Grid view of members highlighting their Role, Department, Chair status, and Quorum requirement.</li>
                <li><strong>SR 11-7 Policy Library:</strong> Cards indicating compliance status for various SR 11-7 sections and linked documents.</li>
              </ul>
            </div>
          },
          {
            id: 'mrc-workflows',
            title: 'Model Risk Committee (MRC) - Workflows',
            content: <div className="space-y-4">
              <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed"><strong>Item States:</strong> Pending, Approved, Rejected, Conditional, Deferred.</p>
              <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed"><strong>Governance Flow:</strong> Ensure quorum is met (tracked via a Quorum Progress Bar highlighting present members) before casting binding votes.</p>
            </div>
          }
        ]
      },
      {
        id: 'validation-evals',
        title: 'Validation & Evals',
        description: 'Quantitative testing, explainability, and dataset management.',
        sections: [
          {
            id: 'validation-overview',
            title: 'Validation Lab - Overview',
            content: <div className="space-y-4">
              <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">The Validation Lab provides enterprise-grade independent model validation records compliant with frameworks such as SR 11-7 / OCC 2011-12, EU AI Act, NIST AI RMF, and ISO 42001. Workflow advancements are strictly gated by RBAC and segregation of duties.</p>
            </div>
          },
          {
            id: 'validation-details',
            title: 'Validation Lab - Inside the Module',
            content: <div className="space-y-4">
              <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">The detailed view of a Validation Run includes multiple tabs:</p>
              <ul className="list-disc pl-5 text-sm text-[hsl(var(--text-2))] space-y-1">
                <li><strong>Scope & assumptions:</strong> Displays Scope & intended use and lists Key limitations.</li>
                <li><strong>Coverage matrix:</strong> Test coverage matrix mapping suites against risk dimensions.</li>
                <li><strong>Backtesting:</strong> Challenger comparison and Backtesting suites performance.</li>
                <li><strong>Adversarial:</strong> Adversarial robustness table showing Attack, Success rate, Baseline, and Verdict.</li>
                <li><strong>Residual risk & sign-off:</strong> Residual risk rating with rationale, and Sign-offs from Business, Risk, and Compliance stakeholders.</li>
              </ul>
            </div>
          },
          {
            id: 'bias-overview',
            title: 'Bias Audits - Overview',
            content: <div className="space-y-4">
              <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Bias Audits provide fairness assessments per model, dataset, and framework. It covers intersectional metrics, pre- vs post-deployment drift, counterfactual fairness, remediation plans, and regulatory mapping (EU AI Act, ECOA, NIST MEASURE, ISO 42001, GDPR).</p>
            </div>
          },
          {
            id: 'bias-details',
            title: 'Bias Audits - Inside the Module',
            content: <div className="space-y-4">
              <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">The Bias Audit detail page and Wizard provide deep analytics on model fairness:</p>
              <ul className="list-disc pl-5 text-sm text-[hsl(var(--text-2))] space-y-1">
                <li><strong>Failed Banner:</strong> If an audit fails, a banner indicates model promotion is blocked.</li>
                <li><strong>Fairness metrics:</strong> Group fairness metrics against targets, and the Protected attribute catalog.</li>
                <li><strong>Intersectional:</strong> Heatmap showing fairness scores at attribute intersections (e.g., Race/Ethnicity x Income).</li>
                <li><strong>Counterfactual:</strong> Testing showing if decisions change when only the protected attribute is flipped.</li>
                <li><strong>Remediation / Recommendation Engine:</strong> Remediation plan with specific tasks, owners, and due dates.</li>
              </ul>
            </div>
          }
        ]
      },
      {
        id: 'agent-control',
        title: 'Agent Control',
        description: 'Discovery, IAM, and Kill Switches for autonomous agents.',
        sections: [
          {
            id: 'agent-registry-overview',
            title: 'Agent Registry - Overview',
            content: <div className="space-y-4">
              <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Provides an inventory and observability suite for managing autonomous AI agents. Facilitates agent discovery, tracking of authorized ("confirmed") vs unauthorized ("shadow") agents, real-time observability of telemetry/logs, and detailed risk and IAM assessments.</p>
            </div>
          },
          {
            id: 'agent-registry-details',
            title: 'Agent Registry - Inside the Module',
            content: <div className="space-y-4">
              <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed"><strong>Agent Detail View Tabs:</strong></p>
              <ul className="list-disc pl-5 text-sm text-[hsl(var(--text-2))] space-y-1">
                <li><strong>Risk Assessment:</strong> Displays risk factors with category, description, and risk level.</li>
                <li><strong>IAM & Permissions:</strong> Displays a matrix mapping resources (e.g., Model Registry, Customer PII, Audit Logs) to permissions (Read, Write, Execute, Admin).</li>
                <li><strong>Topology:</strong> Visualizes the agent's communication path using a node graph.</li>
                <li><strong>Live Telemetry Stream:</strong> Displays real-time streaming execution logs.</li>
              </ul>
              <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed mt-2"><strong>Shadow AI Details (Investigate Drawer):</strong> Focuses on unapproved agents, tracking Evidence Collected (Network traffic analysis, Model usage) and Data Categories Accessed.</p>
            </div>
          },
          {
            id: 'choreography-overview',
            title: 'Multi-Agent Choreography - Overview',
            content: <div className="space-y-4">
              <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Provides a live view of multi-agent workflows, orchestration states, and human-in-the-loop (HITL) intervention points. It tracks end-to-end automated pipelines coordinated by orchestrator agents and worker agents.</p>
            </div>
          },
          {
            id: 'choreography-details',
            title: 'Multi-Agent Choreography - Inside the Module',
            content: <div className="space-y-4">
              <ul className="list-disc pl-5 text-sm text-[hsl(var(--text-2))] space-y-1">
                <li><strong>Agents:</strong> Orchestrator details, list of Worker Agents, and an Agent Chain Visualization showing flow from orchestrator to workers.</li>
                <li><strong>Execution:</strong> Progress bar (completed steps vs total steps), Token & Cost Usage, and Timeline.</li>
                <li><strong>HITL (Human-in-the-Loop):</strong> Workflows can pause and enter an "Awaiting Approval" state (e.g., decision score below threshold). Operators review output and can "Approve & Resume" or "Terminate" the workflow.</li>
              </ul>
            </div>
          },
          {
            id: 'killswitch-overview',
            title: 'Emergency Kill Switch - Overview',
            content: <div className="space-y-4">
              <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">An audit log and control center for all agent suspension events—manual, automated, and regulatory. Allows operators to view historical kill switch triggers, assess blast radius, and execute emergency "Kill All Agents" functionality.</p>
            </div>
          },
          {
            id: 'killswitch-details',
            title: 'Emergency Kill Switch - Workflows & Actions',
            content: <div className="space-y-4">
              <ul className="list-disc pl-5 text-sm text-[hsl(var(--text-2))] space-y-1">
                <li><strong>Agent Suspension:</strong> Triggered Manually, Automatically (Trust Score, Error Rate, Bias Threshold), by Regulatory Order, or Security Incident.</li>
                <li><strong>KILL ALL AGENTS:</strong> Emergency shutdown of all active agents with MFA verification. Suspends all active agents, creates an INC-EMERGENCY incident, and queues regulatory notifications.</li>
                <li><strong>Approve Resumption:</strong> Resumes the agent, marks the event as 'Resolved', and sets a resumption timestamp.</li>
                <li><strong>Post-mortem:</strong> Generates a structured report for resolved incidents with Incident Summary, Root Cause Analysis, and Corrective Actions.</li>
              </ul>
            </div>
          }
        ]
      }
    ]
  },

  {
    id: 'ai-gateway',
    title: 'AI Gateway',
    description: 'Operational proxy layer between client apps and models.',
    icon: Plugs,
    articles: [
      {
        id: 'analytics',
        title: 'Analytics',
        description: 'Real-time metrics for gateway traffic.',
        sections: [
          {
            id: 'analytics-core',
            title: 'Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Real-time metrics engine measuring total request volume, token usage breakdown (input vs output), system response latency, active user counts, cost per request, and guardrail interception rates across all gateway traffic.</p>
          },
          {
            id: 'analytics-regulatory',
            title: 'Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Clause 9.1); NIST AI RMF (Measure 1.2).</p>
          },
          {
            id: 'analytics-auditor',
            title: 'Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Inspected to confirm complete traffic visibility across all connected model workloads.</p>
          }
        ]
      },
      {
        id: 'endpoints',
        title: 'Endpoints',
        description: 'Unified API routing management engine.',
        sections: [
          {
            id: 'endpoints-core',
            title: 'Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Unified API routing management engine hosting standardized proxy endpoints (e.g., OpenAI-compatible interfaces) that abstract downstream model implementations (commercial APIs vs self-hosted open-source models).</p>
          },
          {
            id: 'endpoints-regulatory',
            title: 'Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 27001 (Control A.13.1 Systems Network Governance).</p>
          },
          {
            id: 'endpoints-auditor',
            title: 'Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Verified by ensuring developers consume secure gateway endpoints rather than embedding raw, unmonitored vendor API keys in client code.</p>
          }
        ]
      },
      {
        id: 'playground',
        title: 'Playground',
        description: 'Secure internal sandbox for prompt testing.',
        sections: [
          {
            id: 'playground-core',
            title: 'Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Secure internal sandbox allowing developers, prompt engineers, and risk teams to test prompts, models, and guardrail settings without exposing enterprise data to external model training or logging sensitive production interactions.</p>
          },
          {
            id: 'playground-regulatory',
            title: 'Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Control A.8.1 Development Environment Security).</p>
          },
          {
            id: 'playground-auditor',
            title: 'Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Inspected to confirm that development sandbox environments strictly enforce corporate data isolation policies.</p>
          }
        ]
      },
      {
        id: 'prompts',
        title: 'Prompts',
        description: 'Gateway-level prompt orchestration module.',
        sections: [
          {
            id: 'prompts-core',
            title: 'Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Gateway-level prompt orchestration module capable of dynamically prepending system prompts, appending corporate disclaimer rules, injecting security contexts, and performing prompt templating before sending payloads to downstream models.</p>
          },
          {
            id: 'prompts-regulatory',
            title: 'Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">OWASP GenAI Top 10 (LLM01: Prompt Injection Prevention); NIST AI RMF (Manage 2.4).</p>
          },
          {
            id: 'prompts-auditor',
            title: 'Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Tested by verifying that mandatory enterprise system rules cannot be stripped or overridden by end-user input.</p>
          }
        ]
      },
      {
        id: 'guardrails',
        title: 'Guardrails',
        description: 'Inline filtering layer in the proxy pipeline.',
        sections: [
          {
            id: 'guardrails-core',
            title: 'Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">High-performance, millisecond-latency security check engine executing inline regex patterns, PII masking, vector-based semantic blocking, and sentiment/toxicity screening directly inside the proxy pipeline.</p>
          },
          {
            id: 'guardrails-regulatory',
            title: 'Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">EU AI Act (Article 15); OWASP GenAI Top 10 (LLM01, LLM02, LLM06).</p>
          },
          {
            id: 'guardrails-auditor',
            title: 'Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Tested by attempting to pass prohibited strings (SSNs, credit card numbers, system prompt extraction strings) through the gateway to confirm dynamic inline redaction.</p>
          }
        ]
      },
      {
        id: 'logs',
        title: 'Logs',
        description: 'Immutable gateway request/response logging.',
        sections: [
          {
            id: 'logs-core',
            title: 'Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Centralized, immutable log repository recording every gateway request/response pair with automatic PII sanitization, timestamping, user identification, metadata enrichment, and export to enterprise SIEM platforms.</p>
          },
          {
            id: 'logs-regulatory',
            title: 'Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">EU AI Act (Article 12 - Logging); ISO 27001 (Control A.12.4 Logging and Monitoring).</p>
          },
          {
            id: 'logs-auditor',
            title: 'Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Evaluated to ensure log records are tamper-proof and retained for required statutory periods (e.g., EU AI Act 6-month minimum logging requirement).</p>
          }
        ]
      },
      {
        id: 'virtual-keys',
        title: 'Virtual Keys',
        description: 'Scoped API keys for enterprise users.',
        sections: [
          {
            id: 'virtual-keys-core',
            title: 'Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Identity mapping system generating scoped, rate-limited, budget-capped virtual API keys for enterprise users and internal applications. Prevents raw vendor key distribution and enables immediate revocation per consumer.</p>
          },
          {
            id: 'virtual-keys-regulatory',
            title: 'Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 27001 (Control A.9.4 Management of Secret Authentication Information).</p>
          },
          {
            id: 'virtual-keys-auditor',
            title: 'Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Verified by checking that no plain-text vendor keys exist in source code, configuration files, or developer environments.</p>
          }
        ]
      },
      {
        id: 'models-catalog',
        title: 'Models Catalog',
        description: 'Internal marketplace defining approved models.',
        sections: [
          {
            id: 'models-catalog-core',
            title: 'Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Internal marketplace defining approved third-party and first-party models available for gateway routing, including baseline performance profiles, token costs, security clearances, and acceptable use restrictions.</p>
          },
          {
            id: 'models-catalog-regulatory',
            title: 'Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Control A.6.2 Inventory).</p>
          },
          {
            id: 'models-catalog-auditor',
            title: 'Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Assessed to confirm that developer requests routed to unapproved external model APIs are blocked by default.</p>
          }
        ]
      },
      {
        id: 'gateway-settings',
        title: 'Gateway Settings',
        description: 'Administrative configuration for the gateway.',
        sections: [
          {
            id: 'gateway-settings-core',
            title: 'Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Administrative management panel controlling global proxy behavior, TLS certificates, load balancing strategies, circuit breaker thresholds, regional request routing rules, and high-availability cluster setups.</p>
          },
          {
            id: 'gateway-settings-regulatory',
            title: 'Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 27001 (Control A.12.1 Operational Procedures).</p>
          },
          {
            id: 'gateway-settings-auditor',
            title: 'Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Inspected via configuration audits to verify high-availability architecture and secure communication transport protocols.</p>
          }
        ]
      }
    ]
  },
  {
    id: 'mcp-gateway',
    title: 'MCP Gateway',
    description: 'Control plane managing Anthropic\'s Model Context Protocol.',
    icon: Database,
    articles: [
      {
        id: 'overview',
        title: 'Overview',
        description: 'Central dashboard for the MCP ecosystem.',
        sections: [
          {
            id: 'overview-core',
            title: 'Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Centralized dashboard tracking active MCP client connections, connected MCP server processes, total context queries, executed tool calls, active resource subscriptions, and authorization policy violations across the MCP network.</p>
          },
          {
            id: 'overview-regulatory',
            title: 'Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">NIST AI RMF (Govern 4.2); ISO 42001 (Control A.9.1).</p>
          },
          {
            id: 'overview-auditor',
            title: 'Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Evaluated to confirm unified operational visibility over all active Model Context Protocol connections within the corporate network.</p>
          }
        ]
      },
      {
        id: 'mcp-servers',
        title: 'MCP Servers',
        description: 'Lifecycle management for authorized MCP servers.',
        sections: [
          {
            id: 'mcp-servers-core',
            title: 'Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Inventory and lifecycle management hub controlling authorized MCP servers (local processes via stdio or remote servers via SSE). Tracks server health, supported capabilities (prompts, resources, tools), version compliance, and isolation boundaries.</p>
          },
          {
            id: 'mcp-servers-regulatory',
            title: 'Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 27001 (Control A.15 Vendor Relationships); NIST AI RMF (Map 1.5).</p>
          },
          {
            id: 'mcp-servers-auditor',
            title: 'Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Inspected to verify that unvetted, arbitrary MCP servers cannot establish connections with internal production agents.</p>
          }
        ]
      },
      {
        id: 'tool-catalog',
        title: 'Tool Catalog',
        description: 'Searchable index of tools exposed by MCP servers.',
        sections: [
          {
            id: 'tool-catalog-core',
            title: 'Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Searchable index listing all individual tools exposed by registered MCP servers (e.g., filesystem read, database execute, GitHub pull request, Slack post). Categorizes tools by risk level (Read-Only vs State-Changing vs Destructive Execute).</p>
          },
          {
            id: 'tool-catalog-regulatory',
            title: 'Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">OWASP GenAI Top 10 (LLM08 Excessive Agency); ISO 42001 (Control A.9.3).</p>
          },
          {
            id: 'tool-catalog-auditor',
            title: 'Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Checked by testing whether tool capability definitions explicitly flag high-risk state-changing actions for elevated security controls.</p>
          }
        ]
      },
      {
        id: 'agent-keys',
        title: 'Agent Keys',
        description: 'Cryptographic authorization manager for agents.',
        sections: [
          {
            id: 'agent-keys-core',
            title: 'Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Cryptographic authorization manager issuing short-lived, scoped access tokens mapping specific AI agents to authorized subset combinations of MCP servers and tools based on least-privilege principles.</p>
          },
          {
            id: 'agent-keys-regulatory',
            title: 'Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 27001 (Control A.9.2 User Access Management).</p>
          },
          {
            id: 'agent-keys-auditor',
            title: 'Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Verified by attempting to make an unauthorized MCP tool call using an agent key issued for a different tool scope.</p>
          }
        ]
      },
      {
        id: 'audit-log',
        title: 'Audit Log',
        description: 'Structured JSON log stream of MCP protocol messages.',
        sections: [
          {
            id: 'audit-log-core',
            title: 'Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">High-fidelity, structured JSON log stream recording every MCP protocol message, resource fetch, prompt template invocation, tool call request parameter, execution result, and error payload.</p>
          },
          {
            id: 'audit-log-regulatory',
            title: 'Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">EU AI Act (Article 12); ISO 27001 (Control A.12.4).</p>
          },
          {
            id: 'audit-log-auditor',
            title: 'Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Inspected during security investigations to trace the precise sequence of tool execution actions initiated by an autonomous agent.</p>
          }
        ]
      },
      {
        id: 'hitl-approvals',
        title: 'HITL Approvals',
        description: 'Human-In-The-Loop interception engine.',
        sections: [
          {
            id: 'hitl-approvals-core',
            title: 'Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Human-In-The-Loop interception engine requiring real-time human approval (via Slack, portal push notification, or email) before an MCP server executes tool actions flagged as state-changing, high-value, or high-risk (e.g., executing financial transfers or modifying security policies).</p>
          },
          {
            id: 'hitl-approvals-regulatory',
            title: 'Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">EU AI Act (Article 14 - Human Oversight); NIST AI RMF (Govern 4.2).</p>
          },
          {
            id: 'hitl-approvals-auditor',
            title: 'Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Tested by triggering a destructive MCP tool action and confirming execution remains blocked until explicit, authenticated human approval is registered.</p>
          }
        ]
      },
      {
        id: 'mcp-guardrails',
        title: 'MCP Guardrails',
        description: 'Payload validation layer for tool arguments.',
        sections: [
          {
            id: 'mcp-guardrails-core',
            title: 'Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Payload validation layer evaluating parameters passed to MCP tools to prevent command injection, SQL injection, path traversal attacks, unexpected parameter formats, and unauthorized parameter values inside tool arguments.</p>
          },
          {
            id: 'mcp-guardrails-regulatory',
            title: 'Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">OWASP GenAI Top 10 (LLM08 Excessive Agency, LLM02 Insecure Output Handling); ISO 27001 (Control A.14.2 Development Security).</p>
          },
          {
            id: 'mcp-guardrails-auditor',
            title: 'Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Tested by injecting malicious payloads (e.g., ../../etc/passwd or DROP TABLE Users;) into MCP tool parameter inputs to confirm enforcement of input validation rules.</p>
          }
        ]
      }
    ]
  }
];
