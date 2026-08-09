import React from 'react';
import { Collection } from '../moduleGuides';
import { 
  BuildingOffice, Database, ChartBar, Lock
} from '@phosphor-icons/react';

export const guides3: Collection[] = [
  {
    id: 'vendors-privacy',
    title: 'Vendors & Privacy',
    description: 'Third-Party Risk Management, privacy rights, and AI supply chains.',
    icon: BuildingOffice,
    articles: [
      {
        id: 'third-party-risk',
        title: 'Third-Party Risk (TPRM)',
        description: 'Vendor registry, assessments, and SLAs.',
        sections: [
          {
            id: 'vendor-reg-core',
            title: 'Vendor Registry - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">System of record for all external AI SaaS vendors, model API providers, cloud hosters, data annotation firms, and AI consultancy partners.</p>
          },
          {
            id: 'vendor-reg-regulatory',
            title: 'Vendor Registry - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 27001 (Control A.15.1 Supplier Relationships); ISO 42001 (Control A.6.2); NIST AI RMF (Govern 5.1).</p>
          },
          {
            id: 'vendor-reg-auditor',
            title: 'Vendor Registry - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Cross-referenced against financial accounts payable records to ensure zero uninventoried AI vendor relationships exist.</p>
          },
          {
            id: 'tprm-assessments-core',
            title: 'TPRM Assessments - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Dynamic assessment engine issuing, scoring, and analyzing AI-specific security and compliance questionnaires sent to external vendors (evaluating data usage policies, zero-retention agreements, model training rights, ISO 42001 certification).</p>
          },
          {
            id: 'tprm-assessments-regulatory',
            title: 'TPRM Assessments - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 27001 (Control A.15.2); NIST AI RMF (Govern 5.1).</p>
          },
          {
            id: 'tprm-assessments-auditor',
            title: 'TPRM Assessments - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Reviewed to verify third-party AI models undergo strict vendor risk assessments before integration into corporate applications.</p>
          },
          {
            id: 'sla-monitoring-core',
            title: 'SLA Monitoring - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Performance tracking layer evaluating vendor compliance with contractual Service Level Agreements regarding availability, response latencies, data privacy guarantees, and notification windows.</p>
          },
          {
            id: 'sla-monitoring-regulatory',
            title: 'SLA Monitoring - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 27001 (Control A.15.2 Management of Supplier Service Delivery).</p>
          },
          {
            id: 'sla-monitoring-auditor',
            title: 'SLA Monitoring - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Checked during operational reviews to confirm vendor SLA failures trigger formal business risk reviews.</p>
          },
          {
            id: 'tprm-workspace-core',
            title: 'TPRM Workspace - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Collaborative portal enabling legal, procurement, security, and vendor teams to evaluate vendor risk findings, negotiate security terms, and store completed assessment artifacts.</p>
          },
          {
            id: 'tprm-workspace-regulatory',
            title: 'TPRM Workspace - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 27001 (Control A.15.1).</p>
          },
          {
            id: 'tprm-workspace-auditor',
            title: 'TPRM Workspace - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Evaluated to ensure complete documentation of the vendor procurement evaluation lifecycle.</p>
          }
        ]
      },
      {
        id: 'privacy-rights',
        title: 'Privacy & Rights',
        description: 'DSR implementation and Consent tracking.',
        sections: [
          {
            id: 'dsr-core',
            title: 'DSR / Rights Management - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Data Subject Request orchestration system executing privacy rights (access, correction, deletion) across AI pipelines—including RAG vector databases, fine-tuning caches, and conversation histories (e.g., executing "Right to be Forgotten" in vector indices).</p>
          },
          {
            id: 'dsr-regulatory',
            title: 'DSR / Rights Management - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">GDPR (Articles 15-22 Data Subject Rights); CCPA/CPRA.</p>
          },
          {
            id: 'dsr-auditor',
            title: 'DSR / Rights Management - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Tested by submitting a mock Data Subject Deletion Request and verifying vector embeddings and cache records derived from that data are purged.</p>
          },
          {
            id: 'consent-core',
            title: 'Consent Registry - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Centralized ledger tracking explicit end-user consent records for data processing, fine-tuning utilization, profiling, and interaction logging.</p>
          },
          {
            id: 'consent-regulatory',
            title: 'Consent Registry - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">GDPR (Article 7 Conditions for Consent); EU AI Act (Article 50).</p>
          },
          {
            id: 'consent-auditor',
            title: 'Consent Registry - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Inspected to confirm user data is excluded from model training pipelines unless explicit, verifiable consent exists.</p>
          }
        ]
      },
      {
        id: 'ai-supply-chain',
        title: 'AI Supply Chain (AIBOM)',
        description: 'Provenance tracking and supply chain attestations.',
        sections: [
          {
            id: 'attestations-core',
            title: 'Supply Chain Attestations - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Verification system validating digital signatures, checksums, and formal compliance attestations provided by upstream model providers, dataset publishers, and software maintainers.</p>
          },
          {
            id: 'attestations-regulatory',
            title: 'Supply Chain Attestations - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">EU AI Act (Article 28 - Obligations of Third Parties); ISO 27001 (Control A.15.1); NIST SP 800-218 (SSDF).</p>
          },
          {
            id: 'attestations-auditor',
            title: 'Supply Chain Attestations - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Verified by inspecting digital signature validation records on incoming model artifacts.</p>
          },
          {
            id: 'provenance-core',
            title: 'Provenance Graph - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">End-to-end visual graph tracking complete data-to-deployment lineages: raw data source -&gt; filtering pipeline -&gt; training run -&gt; base model -&gt; fine-tuned adapter -&gt; container image -&gt; API gateway route.</p>
          },
          {
            id: 'provenance-regulatory',
            title: 'Provenance Graph - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">EU AI Act (Article 10 & 11); ISO 42001 (Control A.7.2 Provenance).</p>
          },
          {
            id: 'provenance-auditor',
            title: 'Provenance Graph - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Examined during audits to confirm complete end-to-end visibility over component data origin and processing transformations.</p>
          },
          {
            id: 'supply-chain-core',
            title: 'Supply Chain Graph - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Dependency mapping engine visualizing multi-tiered relationships between internal applications, external AI platforms, third-party model APIs, vector stores, and external data sources.</p>
          },
          {
            id: 'supply-chain-regulatory',
            title: 'Supply Chain Graph - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">NIST AI RMF (Map 1.5); ISO 27001 (Control A.15.1).</p>
          },
          {
            id: 'supply-chain-auditor',
            title: 'Supply Chain Graph - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Evaluated to confirm quick identification of downstream impacts when an upstream provider experiences a vulnerability or service outage.</p>
          },
          {
            id: 'vendor-upload-core',
            title: 'Vendor Upload - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Secure file ingestion portal allowing external suppliers to submit AI Bill of Materials (AIBOM) files, SOC 2 reports, ISO certificates, and training data summary documentations.</p>
          },
          {
            id: 'vendor-upload-regulatory',
            title: 'Vendor Upload - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 27001 (Control A.15.2).</p>
          },
          {
            id: 'vendor-upload-auditor',
            title: 'Vendor Upload - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Checked to ensure vendor evidence files are uploaded directly into immutable storage for auditor inspection.</p>
          }
        ]
      },
      {
        id: 'marketplace-integrations',
        title: 'Marketplace, Integrations & Export',
        description: 'Connecting Sentinel to external enterprise ecosystems.',
        sections: [
          {
            id: 'marketplace-core',
            title: 'Marketplace - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Internal catalog hosting vetted, pre-approved guardrail definitions, compliance policy templates, synthetic evaluation datasets, and prompt templates ready for deployment.</p>
          },
          {
            id: 'marketplace-regulatory',
            title: 'Marketplace - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Operational governance supporting ISO 42001 (Control A.8.1).</p>
          },
          {
            id: 'marketplace-auditor',
            title: 'Marketplace - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Inspected to verify enterprise reuse of pre-approved, security-cleared AI assets across developer teams.</p>
          },
          {
            id: 'integrations-core',
            title: 'Integrations - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Extensible connector suite providing native data syncing with enterprise tools: Jira, ServiceNow, AWS, Azure, GCP, Datadog, Snowflake, GitHub, Okta, Splunk, and Slack.</p>
          },
          {
            id: 'integrations-regulatory',
            title: 'Integrations - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Supporting infrastructure for ISO 27001 & ISO 42001.</p>
          },
          {
            id: 'integrations-auditor',
            title: 'Integrations - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Verified by confirming automated bi-directional data flow between the governance platform and core IT enterprise infrastructure.</p>
          },
          {
            id: 'export-center-core',
            title: 'Export Center - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Consolidated data extraction center allowing compliance officers to export complete audit bundles, evidence vaults, and framework compliance packages in standardized formats.</p>
          },
          {
            id: 'export-center-regulatory',
            title: 'Export Center - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Clause 7.5); EU AI Act (Article 11).</p>
          },
          {
            id: 'export-center-auditor',
            title: 'Export Center - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Used during audit wrap-up sessions to extract complete, self-contained evidence packages for external review.</p>
          }
        ]
      }
    ]
  },
  {
    id: 'data-sustainability',
    title: 'Data & Sustainability',
    description: 'Data pipelines and environmental ESG tracking.',
    icon: Database,
    articles: [
      {
        id: 'data-trust-gov',
        title: 'Data Trust & Gov',
        description: 'Tracking datasets, quality, and data provenance.',
        sections: [
          {
            id: 'dataset-registry-core',
            title: 'Datasets Registry - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">System of record cataloging all datasets used for model training, fine-tuning, RAG retrieval, and validation testing. Stores metadata including size, license, data owner, retention policy, and classification tier.</p>
          },
          {
            id: 'dataset-registry-regulatory',
            title: 'Datasets Registry - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Control A.7.1 Data Governance); EU AI Act (Article 10 - Data & Data Governance); NIST AI RMF (Map 1.5).</p>
          },
          {
            id: 'dataset-registry-auditor',
            title: 'Datasets Registry - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Cross-referenced against storage repositories (S3 buckets, Snowflake schemas) to ensure zero uninventoried datasets are consumed by AI pipelines.</p>
          },
          {
            id: 'data-gov-core',
            title: 'Data Governance - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Policy engine defining and enforcing data classification, access permissions, allowed use parameters, retention lifetimes, and licensing compliance (e.g., blocking commercial use of non-commercial licensed datasets like CC BY-NC) across dataset assets.</p>
          },
          {
            id: 'data-gov-regulatory',
            title: 'Data Governance - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Control A.7.1); EU AI Act (Article 10.2).</p>
          },
          {
            id: 'data-gov-auditor',
            title: 'Data Governance - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Audited by testing if open-source datasets with restrictive licenses are blocked from ingestion into commercial product models.</p>
          },
          {
            id: 'data-lineage-core',
            title: 'Data Lineage - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Graphical pipeline tracking the origin, transformation steps, filtering scripts, synthetic augmentations, and downstream consumption endpoints for every data asset used across AI workflows.</p>
          },
          {
            id: 'data-lineage-regulatory',
            title: 'Data Lineage - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Control A.7.2 Provenance of Data); EU AI Act (Article 10).</p>
          },
          {
            id: 'data-lineage-auditor',
            title: 'Data Lineage - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Evaluated by picking a RAG data chunk in production and tracing it back through ETL transformations to its raw source document.</p>
          },
          {
            id: 'data-quality-core',
            title: 'Data Quality - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Automated validation suite evaluating datasets for missing values, duplicate records, label noise, representation imbalances, formatting errors, and unverified synthetic records prior to model processing.</p>
          },
          {
            id: 'data-quality-regulatory',
            title: 'Data Quality - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">EU AI Act (Article 10.3 - Data Quality Criteria); ISO 42001 (Control A.7.3).</p>
          },
          {
            id: 'data-quality-auditor',
            title: 'Data Quality - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Reviewed via data quality assessment execution reports required for high-risk system deployments.</p>
          }
        ]
      },
      {
        id: 'sustainability-esg',
        title: 'Sustainability & ESG',
        description: 'Tracking carbon footprints and energy efficiency.',
        sections: [
          {
            id: 'carbon-ledger-core',
            title: 'Carbon Ledger - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Environmental accounting engine calculating CO2 equivalent emissions derived from GPU/TPU cluster hardware usage during model training runs, fine-tuning jobs, and production inference processing.</p>
          },
          {
            id: 'carbon-ledger-regulatory',
            title: 'Carbon Ledger - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Control A.10.2 Environmental Impact); EU Corporate Sustainability Reporting Directive (CSRD); GRI Standards.</p>
          },
          {
            id: 'carbon-ledger-auditor',
            title: 'Carbon Ledger - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Inspected by corporate sustainability teams and external ESG auditors to verify accuracy of carbon disclosure reporting.</p>
          },
          {
            id: 'energy-eff-core',
            title: 'Energy Efficiency - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Operational efficiency metric tracker measuring kilowatt-hours (kWh) consumed per million tokens generated, hardware thermal design power (TDP) efficiency, and datacenter Power Usage Effectiveness (PUE) ratings.</p>
          },
          {
            id: 'energy-eff-regulatory',
            title: 'Energy Efficiency - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Control A.10.1 & A.10.2).</p>
          },
          {
            id: 'energy-eff-auditor',
            title: 'Energy Efficiency - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Evaluated during enterprise sustainability audits to confirm implementation of compute efficiency optimizations.</p>
          },
          {
            id: 'esg-reports-core',
            title: 'ESG Reports - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Automated generation engine producing standardized Environmental, Social, and Governance (ESG) compliance reports documenting total compute energy usage, carbon metrics, and mitigation initiatives for corporate sustainability disclosures.</p>
          },
          {
            id: 'esg-reports-regulatory',
            title: 'ESG Reports - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">EU CSRD (Scope 2 & Scope 3 Emissions Reporting); ISO 42001 (Control A.10.2).</p>
          },
          {
            id: 'esg-reports-auditor',
            title: 'ESG Reports - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Direct artifact provided to institutional investors and regulatory ESG bodies reporting on enterprise tech carbon footprints.</p>
          }
        ]
      }
    ]
  },
  {
    id: 'enterprise-intelligence',
    title: 'Enterprise Intelligence',
    description: 'Benchmarking, autopilot, and semantic compliance mapping.',
    icon: ChartBar,
    articles: [
      {
        id: 'intelligence',
        title: 'Intelligence',
        description: 'Automated compliance intelligence and benchmarking.',
        sections: [
          {
            id: 'benchmarking-core',
            title: 'Peer Benchmarking - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Anonymized benchmarking module aggregating cross-industry compliance performance data, allowing enterprises to compare their risk postures, guardrail trigger rates, and governance maturity against industry peers.</p>
          },
          {
            id: 'benchmarking-regulatory',
            title: 'Peer Benchmarking - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">NIST AI RMF (Govern 1.1); ISO 42001 (Clause 9.3).</p>
          },
          {
            id: 'benchmarking-auditor',
            title: 'Peer Benchmarking - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Used by C-suite executives to validate governance resource allocations against industry norms.</p>
          },
          {
            id: 'autopilot-core',
            title: 'Compliance Autopilot - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">LLM-powered compliance assistant trained on organizational policies, platform telemetry, and regulatory frameworks. Automatically drafts audit responses, populates impact assessments, and identifies missing controls.</p>
          },
          {
            id: 'autopilot-regulatory',
            title: 'Compliance Autopilot - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Clause 7.5 Documented Information).</p>
          },
          {
            id: 'autopilot-auditor',
            title: 'Compliance Autopilot - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">All automated outputs generated by the autopilot are checked to confirm final human compliance officer review and signature verification before submission.</p>
          },
          {
            id: 'narrative-core',
            title: 'Narrative Engine - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Natural language generation tool converting complex technical logs, validation results, and security alerts into clear executive summaries tailored for legal teams, board members, and external non-technical auditors.</p>
          },
          {
            id: 'narrative-regulatory',
            title: 'Narrative Engine - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">EU AI Act (Article 13 - Transparency); NIST AI RMF (Govern 5.2).</p>
          },
          {
            id: 'narrative-auditor',
            title: 'Narrative Engine - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Assessed by evaluating whether executive communications accurately represent underlying technical operational realities without misrepresentation.</p>
          },
          {
            id: 'kg-core',
            title: 'Knowledge Graph - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Semantic graph database linking models, datasets, prompts, agents, risks, controls, policies, vendors, and regulatory articles into a single interconnected web of enterprise dependencies.</p>
          },
          {
            id: 'kg-regulatory',
            title: 'Knowledge Graph - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Clause 4.1 Context of the Organization); NIST AI RMF (Map 1.1).</p>
          },
          {
            id: 'kg-auditor',
            title: 'Knowledge Graph - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Inspected during complex system walkthroughs to demonstrate complete, queryable visibility over cross-system compliance relationships.</p>
          },
          {
            id: 'reg-velocity-core',
            title: 'Regulatory Velocity - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Metrics dashboard measuring the organization's speed in adapting internal policies, controls, and guardrail settings in response to new global regulatory announcements and legal changes.</p>
          },
          {
            id: 'reg-velocity-regulatory',
            title: 'Regulatory Velocity - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Clause 10.2 Continual Improvement).</p>
          },
          {
            id: 'reg-velocity-auditor',
            title: 'Regulatory Velocity - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Reviewed to evaluate organizational agility in maintaining compliance within rapidly evolving international legal environments.</p>
          }
        ]
      }
    ]
  },
  {
    id: 'organization',
    title: 'Organization',
    description: 'IAM, operational resilience, and ethics governance.',
    icon: Lock,
    articles: [
      {
        id: 'iam-roles',
        title: 'IAM & Roles',
        description: 'Access control and identity provisioning.',
        sections: [
          {
            id: 'access-control-core',
            title: 'Access Control - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Unified authorization enforcement engine executing fine-grained Role-Based and Attribute-Based Access Control (RBAC/ABAC) over platform functionalities, administration areas, and API routing permissions.</p>
          },
          {
            id: 'access-control-regulatory',
            title: 'Access Control - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 27001 (Control A.9.1 Access Control Policy); ISO 42001 (Control A.9.1).</p>
          },
          {
            id: 'access-control-auditor',
            title: 'Access Control - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Verified by sampling user accounts and testing access boundaries against assigned authorization privileges.</p>
          },
          {
            id: 'users-registry-core',
            title: 'Users Registry - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Directory service integration module syncing user identities, organizational groups, and status states via SAML/SCIM from enterprise identity providers (Okta, Azure AD/Entra ID, Ping Identity).</p>
          },
          {
            id: 'users-registry-regulatory',
            title: 'Users Registry - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 27001 (Control A.9.2 User Registration and De-registration).</p>
          },
          {
            id: 'users-registry-auditor',
            title: 'Users Registry - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Inspected to verify that terminated employees are instantly de-provisioned from all platform administrative capabilities.</p>
          },
          {
            id: 'roles-mgmt-core',
            title: 'Roles Management - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Custom role definition workspace permitting administrators to construct granular security roles (e.g., Model Auditor, Risk Officer, Data Scientist, Prompt Engineer, External Assessor) with explicit permission matrices.</p>
          },
          {
            id: 'roles-mgmt-regulatory',
            title: 'Roles Management - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 27001 (Control A.9.1); ISO 42001 (Clause 5.3).</p>
          },
          {
            id: 'roles-mgmt-auditor',
            title: 'Roles Management - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Evaluated to ensure clear separation of duties (e.g., the model developer cannot grant deployment sign-off on their own model).</p>
          },
          {
            id: 'departments-core',
            title: 'Departments - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Organizational structure configuration module binding users, assets, budgets, models, and risks directly to specific corporate departments, cost centers, and geographic subsidiaries.</p>
          },
          {
            id: 'departments-regulatory',
            title: 'Departments - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Clause 4.1).</p>
          },
          {
            id: 'departments-auditor',
            title: 'Departments - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Reviewed to ensure localized risk attribution and accurate departmental compliance monitoring.</p>
          },
          {
            id: 'iga-core',
            title: 'Identity Governance - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Periodic access certification workspace initiating automated access review campaigns requiring managers to recertify user permissions on platform capabilities and sensitive model access.</p>
          },
          {
            id: 'iga-regulatory',
            title: 'Identity Governance - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 27001 (Control A.9.2 Review of User Access Rights).</p>
          },
          {
            id: 'iga-auditor',
            title: 'Identity Governance - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Inspected via access recertification campaign reports to confirm management routinely reviews and revokes unnecessary privileges.</p>
          }
        ]
      },
      {
        id: 'operational-resilience',
        title: 'Operational Resilience',
        description: 'Business continuity planning and asset management.',
        sections: [
          {
            id: 'bcp-core',
            title: 'Business Continuity - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Disaster recovery planning, backup orchestration, and failover management engine maintaining continuous operational capability for mission-critical AI services during primary cloud, vendor, or infrastructure failures.</p>
          },
          {
            id: 'bcp-regulatory',
            title: 'Business Continuity - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 27001 (Control A.17 Information Security Aspects of Business Continuity Management); EU AI Act (Article 15.4 Resilience).</p>
          },
          {
            id: 'bcp-auditor',
            title: 'Business Continuity - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Tested by verifying disaster recovery simulation logs and checking backup restore capabilities for vector databases and model registries.</p>
          },
          {
            id: 'bia-core',
            title: 'Business Impact (BIA) - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Assessment engine quantifying potential operational, financial, legal, and reputational impacts resulting from disruption or failure of specific corporate AI services.</p>
          },
          {
            id: 'bia-regulatory',
            title: 'Business Impact (BIA) - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 27001 (Control A.17.1); ISO 22301 (Business Continuity Management).</p>
          },
          {
            id: 'bia-auditor',
            title: 'Business Impact (BIA) - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Examined to verify that service recovery priorities (RTO/RPO targets) are derived from objective business impact evaluations.</p>
          },
          {
            id: 'asset-registry-core',
            title: 'Asset Registry - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Comprehensive inventory tracking physical and logical infrastructure components supporting AI systems (GPU server clusters, vector DB instances, load balancers, storage volumes, edge deployment devices).</p>
          },
          {
            id: 'asset-registry-regulatory',
            title: 'Asset Registry - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 27001 (Control A.8.1 Inventory of Assets); ISO 42001 (Control A.6.2).</p>
          },
          {
            id: 'asset-registry-auditor',
            title: 'Asset Registry - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Reconciled against cloud infrastructure configurations to ensure complete coverage of IT asset inventory.</p>
          }
        ]
      },
      {
        id: 'ethics-governance',
        title: 'Ethics & Governance',
        description: 'Whistleblower portals, training tracking, and GRC maturity.',
        sections: [
          {
            id: 'ethics-reporting-core',
            title: 'Ethics Reporting - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Secure, confidential whistleblower and concern reporting channel permitting employees, vendors, or external parties to submit anonymous reports regarding unethical AI practices, unmitigated bias, or policy bypasses.</p>
          },
          {
            id: 'ethics-reporting-regulatory',
            title: 'Ethics Reporting - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">EU Whistleblower Directive; ISO 42001 (Clause 5.1 & Ethics Guidelines); NIST AI RMF (Govern 1.2).</p>
          },
          {
            id: 'ethics-reporting-auditor',
            title: 'Ethics Reporting - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Inspected to verify existence of accessible ethics reporting channels and documented investigation protocols for raised concerns.</p>
          },
          {
            id: 'training-awareness-core',
            title: 'Training & Awareness - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Educational tracking portal assigning, delivering, and recording employee completion rates for mandatory AI ethics, security awareness, regulatory compliance, and acceptable use policy training courses.</p>
          },
          {
            id: 'training-awareness-regulatory',
            title: 'Training & Awareness - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">EU AI Act (Article 4 - AI Literacy); ISO 27001 (Control A.7.22 Awareness, Education, and Training); ISO 42001 (Clause 7.2 Competence).</p>
          },
          {
            id: 'training-awareness-auditor',
            title: 'Training & Awareness - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Audited by pulling employee completion percentages on mandatory AI literacy training campaigns (EU AI Act mandates AI literacy for workforce personnel operating AI systems).</p>
          },
          {
            id: 'committee-mgmt-core',
            title: 'Committee Management - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Operational hub managing corporate AI Ethics Boards and Steering Committees—scheduling meetings, publishing agendas, distributing review packets, logging attendance, recording votes, and archiving official minutes.</p>
          },
          {
            id: 'committee-mgmt-regulatory',
            title: 'Committee Management - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Clause 5.1); NIST AI RMF (Govern 1.2).</p>
          },
          {
            id: 'committee-mgmt-auditor',
            title: 'Committee Management - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Primary audit inspection target for verifying active, high-level organizational leadership and ethics governance oversight.</p>
          },
          {
            id: 'grc-maturity-core',
            title: 'GRC Maturity - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Capability maturity modeling engine evaluating organizational AI GRC sophistication across standardized maturity levels (Level 1 Initial -&gt; Level 5 Optimized) based on CMMI and ISO benchmarking criteria.</p>
          },
          {
            id: 'grc-maturity-regulatory',
            title: 'GRC Maturity - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 42001 (Clause 10.2 Continual Improvement); NIST AI RMF (Govern 6.1).</p>
          },
          {
            id: 'grc-maturity-auditor',
            title: 'GRC Maturity - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Reviewed during executive strategy meetings to demonstrate progressive improvement in organizational risk management capabilities over time.</p>
          },
          {
            id: 'licensing-core',
            title: 'Licensing - Core Architecture & Functionality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Subscription management, platform entitlement tracker, and software license compliance module governing external software components, platform user seats, commercial feature modules, and third-party software licensing terms within the GRC platform itself.</p>
          },
          {
            id: 'licensing-regulatory',
            title: 'Licensing - Regulatory & Standard Mapping',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">ISO 27001 (Control A.18.1 Compliance with Legal and Contractual Requirements).</p>
          },
          {
            id: 'licensing-auditor',
            title: 'Licensing - Auditor Reality',
            content: <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">Examined during software license compliance audits to confirm platform operations conform to third-party contractual terms and IP law.</p>
          }
        ]
      }
    ]
  }
];
