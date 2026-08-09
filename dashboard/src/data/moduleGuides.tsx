import React from 'react';
import { 
  RocketLaunch, Brain, Warning, ShieldCheck, 
  Flask, Graph, BookOpen
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
      },
      {
        id: 'installing',
        title: 'Installing Sentinel',
        description: 'Step-by-step guide to deploy Sentinel in your environment.',
        sections: [
          {
            id: 'requirements',
            title: 'System Requirements',
            content: <p className="text-sm text-[hsl(var(--text-2))]">Minimum 4GB RAM, 2 vCPUs, Docker installed.</p>
          }
        ]
      },
      {
        id: 'dashboard-tour',
        title: 'Navigating the dashboard',
        description: 'Understand the main dashboard and how to find what you need.',
        sections: [
          {
            id: 'layout',
            title: 'Layout Overview',
            content: <p className="text-sm text-[hsl(var(--text-2))]">The left sidebar contains all operational modules. The top bar contains global search.</p>
          }
        ]
      },
      {
        id: 'quick-start',
        title: 'Quick start guide',
        description: 'Get your first project configured in under 10 minutes.',
        sections: [
          {
            id: 'first-model',
            title: 'Register a model',
            content: <p className="text-sm text-[hsl(var(--text-2))]">Navigate to AI Inventory and click New Model.</p>
          }
        ]
      }
    ]
  },
  {
    id: 'ai-governance',
    title: 'AI governance',
    description: 'Manage your AI models, track their lifecycle, and maintain comprehensive documentation.',
    icon: Brain,
    articles: [
      {
        id: 'model-inventory',
        title: 'Model Inventory',
        description: 'How to register and manage AI models.',
        sections: [
          {
            id: 'registering',
            title: 'Registering a Model',
            content: <p className="text-sm text-[hsl(var(--text-2))]">Detailed steps for registering a model...</p>
          }
        ]
      }
    ]
  },
  {
    id: 'risk-management',
    title: 'Risk management',
    description: 'Identify, assess, and mitigate risks across your AI systems and vendors.',
    icon: Warning,
    articles: [
      {
        id: 'risk-register',
        title: 'Using the Risk Register',
        description: 'Log and score AI risks.',
        sections: [
          {
            id: 'scoring',
            title: 'Risk Scoring Matrix',
            content: <p className="text-sm text-[hsl(var(--text-2))]">Risks are scored by multiplying Likelihood and Impact.</p>
          }
        ]
      }
    ]
  },
  {
    id: 'compliance',
    title: 'Compliance frameworks',
    description: 'Stay compliant with AI regulations including EU AI Act, ISO 42001, and more.',
    icon: ShieldCheck,
    articles: [
      {
        id: 'framework-mapping',
        title: 'Framework Mapping',
        description: 'Map internal controls to standard regulations.',
        sections: [
          {
            id: 'mapping',
            title: 'Mapping Controls',
            content: <p className="text-sm text-[hsl(var(--text-2))]">Use the framework mapping tool to link controls.</p>
          }
        ]
      }
    ]
  },
  {
    id: 'evals',
    title: 'LLM Evals',
    description: 'Evaluate and benchmark your LLM applications for quality, safety, and performance.',
    icon: Flask,
    articles: [
      {
        id: 'running-evals',
        title: 'Running Evaluations',
        description: 'Configure and run metric profiles.',
        sections: [
          {
            id: 'metrics',
            title: 'Quality Metrics',
            content: <p className="text-sm text-[hsl(var(--text-2))]">Evaluate models on faithfulness, relevance, and hallucination rate.</p>
          }
        ]
      }
    ]
  }
];

// Mapping routes to specific collections to open by default
export const ROUTE_TO_COLLECTION_MAP: Record<string, string> = {
  '/overview': 'getting-started',
  '/models': 'ai-governance',
  '/risk': 'risk-management',
  '/compliance': 'compliance',
  '/evals': 'evals',
  '/security': 'ai-governance',
  '/vendors': 'risk-management',
};
