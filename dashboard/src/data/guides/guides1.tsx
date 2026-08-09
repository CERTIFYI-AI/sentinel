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
            id: 'registry-core',
            title: 'Model Registry - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">System of record for all first-party, fine-tuned, and third-party AI models deployed across the enterprise. Captures metadata including model owner, framework, version history, deployment environment, hardware allocation, and API bindings.</p>
          },
          {
            id: 'registry-regulatory',
            title: 'Model Registry - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Control A.6.2 Inventory of AI Systems); EU AI Act (Article 49 - EU Database Registration for High-Risk Systems); NIST AI RMF (Map 1.1).</p>
          },
          {
            id: 'registry-auditor',
            title: 'Model Registry - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Auditors cross-reference active cloud infrastructure (AWS SageMaker, Azure AI, GCP Vertex) against the Model Registry to ensure zero uninventoried models exist in production.</p>
          },
          {
            id: 'lifecycle-core',
            title: 'Model Lifecycle - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">State machine enforcing formal promotion gates (Idea -&gt; Assessment -&gt; Development -&gt; Validation -&gt; MRC Approval -&gt; Production -&gt; Deprecation -&gt; Sunset). Models cannot progress to production without satisfying automated governance policy checks.</p>
          },
          {
            id: 'lifecycle-regulatory',
            title: 'Model Lifecycle - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Control A.8 AI System Lifecycle Management); NIST AI RMF (Govern 4.1).</p>
          },
          {
            id: 'lifecycle-auditor',
            title: 'Model Lifecycle - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Inspected via audit logs to verify that production deployments were preceded by authorized stage transitions and signed digital approvals.</p>
          },
          {
            id: 'dna-core',
            title: 'Model DNA & Lineage - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Deep dependency graph recording base model weights, fine-tuning techniques (LoRA, QLoRA, RLHF), hyperparameter configurations, exact training dataset hashes, dependency libraries, and parent-child model relationships.</p>
          },
          {
            id: 'dna-regulatory',
            title: 'Model DNA & Lineage - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">EU AI Act (Article 10 - Data and Data Governance & Article 11 Technical Documentation); ISO 42001 (Control A.7.2 Provenance of Data).</p>
          },
          {
            id: 'dna-auditor',
            title: 'Model DNA & Lineage - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Evaluated by tracing a production model back to its exact training data commit hash, base model release, and data cleaning pipeline logs.</p>
          },
          {
            id: 'prompt-core',
            title: 'Prompt Registry - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Version-controlled database storing, managing, and auditing system prompts, task prompts, and RAG templates. Tracks prompt history, embedded variables, safety instruction additions, and approval signatures.</p>
          },
          {
            id: 'prompt-regulatory',
            title: 'Prompt Registry - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">NIST AI RMF (Measure 2.6); OWASP GenAI Top 10 (LLM01: Prompt Injection Controls).</p>
          },
          {
            id: 'prompt-auditor',
            title: 'Prompt Registry - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Tested by reviewing prompt change logs to ensure system prompts containing enterprise security instructions cannot be updated without formal review.</p>
          }
        ]
      },
      {
        id: 'impact-risk',
        title: 'Impact & Risk (AIIA)',
        description: 'Impact Assessments, Use Cases, Risk Classification, and MRC.',
        sections: [
          {
            id: 'aiia-core',
            title: 'Impact Assessments (AIIA) - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Dynamic questionnaire and analytical workflow system executing Algorithmic and AI Impact Assessments (AIIA). Evaluates fundamental rights impacts, privacy considerations, health and safety risks, societal harm, and business operational impacts.</p>
          },
          {
            id: 'aiia-regulatory',
            title: 'Impact Assessments (AIIA) - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">EU AI Act (Article 27 - Fundamental Rights Impact Assessment for High-Risk AI); ISO 42001 (Control A.5 AI Impact Assessment); NIST AI RMF (Map 2.1).</p>
          },
          {
            id: 'aiia-auditor',
            title: 'Impact Assessments (AIIA) - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">A primary artifact request during regulatory audits; must demonstrate completed, signed impact assessments conducted prior to model deployment.</p>
          },
          {
            id: 'use-case-core',
            title: 'Use Case Registry - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Central catalog documenting intended business outcomes, target user groups, operational contexts, and restricted deployment boundaries for every proposed AI application.</p>
          },
          {
            id: 'use-case-regulatory',
            title: 'Use Case Registry - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Control A.6.1 Intended Use Definition); NIST AI RMF (Map 1.2).</p>
          },
          {
            id: 'use-case-auditor',
            title: 'Use Case Registry - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Examined to verify that models are operating strictly within their documented scope and not being repurposed for unassessed, high-risk operational contexts.</p>
          },
          {
            id: 'risk-class-core',
            title: 'Risk Classification - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Automated classification engine that evaluates model use-case parameters against legal criteria (e.g., EU AI Act Annex III high-risk domains: critical infrastructure, employment, credit scoring, law enforcement) to automatically tier systems into Unacceptable, High, Limited, or Minimal Risk.</p>
          },
          {
            id: 'risk-class-regulatory',
            title: 'Risk Classification - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">EU AI Act (Articles 5, 6, & Annex III); NIST AI RMF (Map 2.2).</p>
          },
          {
            id: 'risk-class-auditor',
            title: 'Risk Classification - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Tested by feeding edge-case scenarios into the system to confirm accurate automated categorization into correct regulatory risk tiers.</p>
          },
          {
            id: 'mrc-core',
            title: 'Model Risk Committee (MRC) - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Governance portal for cross-functional governance review boards (Legal, Risk, CISO, Ethics, Engineering). Facilitates agenda management, digital voting, risk sign-offs, conditional approvals, and formal dissent recording.</p>
          },
          {
            id: 'mrc-regulatory',
            title: 'Model Risk Committee (MRC) - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">NIST AI RMF (Govern 1.2); ISO 42001 (Clause 5.3 Organizational Roles, Responsibilities, and Authorities).</p>
          },
          {
            id: 'mrc-auditor',
            title: 'Model Risk Committee (MRC) - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Reviewed via meeting minutes, digital signature records, and decision logs to prove effective human oversight over AI deployment decisions.</p>
          }
        ]
      },
      {
        id: 'validation-evals',
        title: 'Validation & Evals',
        description: 'Quantitative testing, explainability, and dataset management.',
        sections: [
          {
            id: 'val-lab-core',
            title: 'Validation Lab - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Automated testing environment where models undergo pre-deployment verification across performance benchmarks, safety suites, edge-case evaluations, and robustness testing under simulated operational noise.</p>
          },
          {
            id: 'val-lab-regulatory',
            title: 'Validation Lab - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">EU AI Act (Article 15 - Accuracy, Robustness, and Cybersecurity); NIST AI RMF (Measure 2.1).</p>
          },
          {
            id: 'val-lab-auditor',
            title: 'Validation Lab - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Evaluated by reviewing execution logs of test suites run against candidate models prior to production release authorization.</p>
          },
          {
            id: 'explain-core',
            title: 'Explainability Center - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Suite of model interpretability tools generating feature importance scores, SHAP/LIME visualizers, integrated gradients, and chain-of-thought rationale extraction for black-box model decisions.</p>
          },
          {
            id: 'explain-regulatory',
            title: 'Explainability Center - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">EU AI Act (Article 13 - Transparency and Provision of Information); ISO 42001 (Control A.9.3 Explainability of AI Systems); NIST AI RMF (Measure 2.4).</p>
          },
          {
            id: 'explain-auditor',
            title: 'Explainability Center - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Crucial for credit, hiring, and insurance models; auditors review explainability outputs generated for flagged or rejected end-user decisions.</p>
          },
          {
            id: 'bias-core',
            title: 'Bias Audits - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Statistical engine running disparate impact analyses, equalized odds metrics, demographic parity checks, and toxic stereotyped response evaluations across protected demographic classes (gender, race, age, disability status).</p>
          },
          {
            id: 'bias-regulatory',
            title: 'Bias Audits - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">EU AI Act (Article 10 - Data Quality and Bias Mitigation); NIST AI RMF (Measure 2.5); EEOC AI Guidance.</p>
          },
          {
            id: 'bias-auditor',
            title: 'Bias Audits - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Inspected for evidence that quantitative bias testing is routinely performed on both base models and RAG data pipelines.</p>
          },
          {
            id: 'metric-core',
            title: 'Metric Studio - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Custom metric configuration builder allowing risk teams to define domain-specific evaluation metrics (e.g., medical term accuracy, financial regulatory compliance score, brand-tone adherence rate).</p>
          },
          {
            id: 'metric-regulatory',
            title: 'Metric Studio - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">NIST AI RMF (Measure 1.1); ISO 42001 (Clause 9.1).</p>
          },
          {
            id: 'metric-auditor',
            title: 'Metric Studio - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Assessed to confirm that performance evaluations reflect domain-specific requirements rather than generic public benchmarks.</p>
          },
          {
            id: 'dataset-core',
            title: 'Dataset Wizard - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Tooling for constructing gold-standard evaluation datasets, generating synthetic test edge cases, and managing ground-truth benchmark versioning.</p>
          },
          {
            id: 'dataset-regulatory',
            title: 'Dataset Wizard - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Control A.7.3 Data Quality for AI Systems); EU AI Act (Article 10.3).</p>
          },
          {
            id: 'dataset-auditor',
            title: 'Dataset Wizard - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Evaluated to ensure that validation datasets are independent of training datasets and free of ground-truth bias.</p>
          },
          {
            id: 'explorer-core',
            title: 'Data Explorer - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Data inspection interface enabling auditors and validation engineers to query, slice, visualize, and inspect raw evaluation pairs, embedding spaces, and data distribution maps.</p>
          },
          {
            id: 'explorer-regulatory',
            title: 'Data Explorer - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Control A.7.1 Data Governance); NIST AI RMF (Map 1.5).</p>
          },
          {
            id: 'explorer-auditor',
            title: 'Data Explorer - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Used during live audit sessions to manually inspect flagged data records and verify edge-case annotations.</p>
          },
          {
            id: 'scenario-core',
            title: 'Scenario Editor - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Visual suite for authoring complex multi-turn conversation flows, adversarial interaction scenarios, and stress-test suites designed to probe model boundaries.</p>
          },
          {
            id: 'scenario-regulatory',
            title: 'Scenario Editor - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">NIST AI RMF (Measure 2.7 - Adversarial Robustness); OWASP GenAI Top 10.</p>
          },
          {
            id: 'scenario-auditor',
            title: 'Scenario Editor - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Reviewed to ensure that testing includes realistic, multi-step attack vectors rather than static single-prompt checks.</p>
          },
          {
            id: 'trace-viewer-core',
            title: 'Session Trace Viewer - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Granular execution inspector providing step-by-step breakdown of LLM reasoning loops, tool call invocations, context retrieval scores, and raw prompt/completion payloads for specific sessions.</p>
          },
          {
            id: 'trace-viewer-regulatory',
            title: 'Session Trace Viewer - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">EU AI Act (Article 12 - Record-Keeping); ISO 42001 (Control A.9.2 Logging).</p>
          },
          {
            id: 'trace-viewer-auditor',
            title: 'Session Trace Viewer - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Used to conduct root-cause analysis on anomalous or harmful outputs reported in production environments.</p>
          }
        ]
      },
      {
        id: 'agent-control',
        title: 'Agent Control',
        description: 'Discovery, IAM, and Kill Switches for autonomous agents.',
        sections: [
          {
            id: 'shadow-core',
            title: 'Shadow AI Discovery - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Network traffic monitoring agent, API gateway scanner, and CASB integration module that detects unauthorized employee usage of external LLM endpoints, unvetted AI Chrome extensions, and unapproved internal models.</p>
          },
          {
            id: 'shadow-regulatory',
            title: 'Shadow AI Discovery - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Control A.6.2 Inventory); NIST AI RMF (Govern 1.1); ISO 27001 (Control A.8.7 Protection Against Malware/Unauthorized Software).</p>
          },
          {
            id: 'shadow-auditor',
            title: 'Shadow AI Discovery - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Auditors inspect discovery logs to confirm the platform detects and alerts on unapproved AI usage across enterprise networks.</p>
          },
          {
            id: 'agent-reg-core',
            title: 'Agent Registry - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Specialized catalog detailing autonomous AI agents, their underlying system prompts, accessible tools/APIs, allowed operational memory boundaries, and assigned deployment tiers.</p>
          },
          {
            id: 'agent-reg-regulatory',
            title: 'Agent Registry - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Control A.6.2); NIST AI RMF (Govern 4.2 - Autonomous Decision-Making).</p>
          },
          {
            id: 'agent-reg-auditor',
            title: 'Agent Registry - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Examined to ensure that every autonomous agent operating in production has defined limits and clear human ownership.</p>
          },
          {
            id: 'agent-iam-core',
            title: 'Agent Permissions (IAM) - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Fine-grained access control engine enforcing Role-Based and Attribute-Based Access Control (RBAC/ABAC) over agent tool execution, API calls, database read/write capabilities, and system modification rights.</p>
          },
          {
            id: 'agent-iam-regulatory',
            title: 'Agent Permissions (IAM) - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 27001 (Control A.9 Access Control); OWASP GenAI Top 10 (LLM08: Excessive Agency).</p>
          },
          {
            id: 'agent-iam-auditor',
            title: 'Agent Permissions (IAM) - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Assessed by testing whether an agent can perform unpermitted actions (e.g., executing a database DELETE or calling an unauthorized third-party API) outside its assigned permission boundary.</p>
          },
          {
            id: 'choreography-core',
            title: 'Choreography Canvas - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Visual orchestration map depicting multi-agent interactions, communication channels, state handoffs, and feedback loops to prevent infinite logic loops, cascading errors, and unauthorized inter-agent task delegation.</p>
          },
          {
            id: 'choreography-regulatory',
            title: 'Choreography Canvas - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">NIST AI RMF (Manage 1.2 - System Interdependencies).</p>
          },
          {
            id: 'choreography-auditor',
            title: 'Choreography Canvas - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Evaluated during system safety assessments to verify that complex agent workflows contain systemic circuit breakers.</p>
          },
          {
            id: 'kill-switch-core',
            title: 'Emergency Kill Switch - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Immediate operational control mechanism providing instant programmatic revocation of agent execution rights, API access, system credentials, and active process execution across cloud environments.</p>
          },
          {
            id: 'kill-switch-regulatory',
            title: 'Emergency Kill Switch - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">EU AI Act (Article 14.4 - Human Oversight Kill Switch); ISO 42001 (Control A.9.1 Operational Control).</p>
          },
          {
            id: 'kill-switch-auditor',
            title: 'Emergency Kill Switch - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Tested via live exercises to verify that pressing the kill switch instantly terminates agent actions without leaving hanging process states.</p>
          }
        ]
      },
      {
        id: 'runtime-trust',
        title: 'Runtime Trust',
        description: 'Performance monitoring, active guardrails, and fallback management.',
        sections: [
          {
            id: 'perf-mon-core',
            title: 'Performance Monitoring - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Real-time telemetry dashboard tracking model responsiveness, throughput, token generation speed, HTTP status codes, and service availability SLAs.</p>
          },
          {
            id: 'perf-mon-regulatory',
            title: 'Performance Monitoring - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Clause 9.1); NIST AI RMF (Manage 1.1).</p>
          },
          {
            id: 'perf-mon-auditor',
            title: 'Performance Monitoring - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Verified to ensure model operational disruptions do not cause downstream compliance failures or safety hazards.</p>
          },
          {
            id: 'model-eff-core',
            title: 'Model Efficiency - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Analytics engine calculating compute density, hardware deployment efficiency, parameter utilization ratios, and inference optimization metrics.</p>
          },
          {
            id: 'model-eff-regulatory',
            title: 'Model Efficiency - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Control A.10.1 Resource Utilization).</p>
          },
          {
            id: 'model-eff-auditor',
            title: 'Model Efficiency - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Evaluated to ensure production models operate within sustainable, optimized hardware profiles.</p>
          },
          {
            id: 'genai-risk-core',
            title: 'GenAI Risk Profiles - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Dynamic risk score calculation engine updating real-time risk scores for deployed models based on live hallucination rates, toxicity scores, PII leakage events, and user feedback signals.</p>
          },
          {
            id: 'genai-risk-regulatory',
            title: 'GenAI Risk Profiles - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">NIST AI RMF (Measure 2.2, Manage 2.1).</p>
          },
          {
            id: 'genai-risk-auditor',
            title: 'GenAI Risk Profiles - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Reviewed to confirm that live risk scores accurately reflect changes in operational risk context.</p>
          },
          {
            id: 'active-guard-core',
            title: 'Active Guardrails - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Low-latency inline filtering layer evaluating incoming user prompts and outgoing model responses against regex patterns, semantic vector classifiers, toxicity models, and custom business logic rules.</p>
          },
          {
            id: 'active-guard-regulatory',
            title: 'Active Guardrails - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">EU AI Act (Article 15); OWASP GenAI Top 10 (LLM01, LLM02, LLM06); NIST AI RMF (Manage 2.4).</p>
          },
          {
            id: 'active-guard-auditor',
            title: 'Active Guardrails - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Auditors run jailbreak attempts against live endpoints to confirm active guardrails catch and block malicious inputs before model processing.</p>
          },
          {
            id: 'live-trace-core',
            title: 'Live Inference Traces - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Distributed tracing infrastructure (OpenTelemetry-compliant) capturing end-to-end execution paths of every request—including raw input, system prompt state, retrieved RAG context vectors, model completions, guardrail interventions, and latency metrics.</p>
          },
          {
            id: 'live-trace-regulatory',
            title: 'Live Inference Traces - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">EU AI Act (Article 12 - Automatic Record-Keeping); ISO 42001 (Control A.9.2).</p>
          },
          {
            id: 'live-trace-auditor',
            title: 'Live Inference Traces - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Evaluated by pulling historical trace logs for specific user requests to verify complete end-to-end auditability.</p>
          },
          {
            id: 'trust-costs-core',
            title: 'Trust Costs & Tokens - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Financial tracking system mapping token consumption rates, model API expenditures, and trust infrastructure costs (guardrail processing, evaluation calls) directly to business units, models, and applications.</p>
          },
          {
            id: 'trust-costs-regulatory',
            title: 'Trust Costs & Tokens - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Operational governance supporting ISO 42001 (Clause 6.2 Objectives and Planning).</p>
          },
          {
            id: 'trust-costs-auditor',
            title: 'Trust Costs & Tokens - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Reviewed to verify that financial expenditures align with authorized enterprise budget limits.</p>
          },
          {
            id: 'fallback-core',
            title: 'Fallback Failovers - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Automated routing engine that redirects incoming traffic to secondary models, cached responses, or safe rule-based defaults when primary models experience drift, high latency, guardrail triggers, or service outages.</p>
          },
          {
            id: 'fallback-regulatory',
            title: 'Fallback Failovers - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">EU AI Act (Article 15.4 - Resilience); NIST AI RMF (Manage 1.3 - Reliability).</p>
          },
          {
            id: 'fallback-auditor',
            title: 'Fallback Failovers - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Tested by simulating primary model endpoint failures to verify graceful degradation without service interruption or security compromise.</p>
          },
          {
            id: 'tool-monitor-core',
            title: 'Tool Monitor - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Interception proxy tracking all third-party API calls, database queries, code execution environments, and external web searches initiated by model tool calls during inference.</p>
          },
          {
            id: 'tool-monitor-regulatory',
            title: 'Tool Monitor - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">OWASP GenAI Top 10 (LLM08 Excessive Agency); ISO 27001 (Control A.13.1 Network Controls).</p>
          },
          {
            id: 'tool-monitor-auditor',
            title: 'Tool Monitor - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Examined to ensure model tool execution cannot bypass enterprise firewall rules or execute unauthorized remote procedures.</p>
          },
          {
            id: 'config-core',
            title: 'Configuration - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Centralized admin portal for configuring runtime trust parameters, adjusting guardrail strictness thresholds, setting token limits, and tuning alert criteria across operational model endpoints.</p>
          },
          {
            id: 'config-regulatory',
            title: 'Configuration - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Control A.9.1); NIST AI RMF (Govern 5.1).</p>
          },
          {
            id: 'config-auditor',
            title: 'Configuration - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Audited via change logs to verify that changes to security thresholds follow formal change control procedures.</p>
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
