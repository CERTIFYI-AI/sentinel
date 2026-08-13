import { useLocation } from 'react-router-dom'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './sheet'
import { 
  BookOpenText, Info, 
  ShieldCheck, Robot, ChartBar, Warning, 
  ShieldWarning, Brain, UserCircleCheck, Buildings, FileText 
} from '@phosphor-icons/react'
import React from 'react'

export interface UserGuideDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface GuideFeature {
  title: string
  description: string
  icon: React.ElementType
}

interface GuideContent {
  title: string
  description: string
  features: GuideFeature[]
}

const DEFAULT_GUIDE: GuideContent = {
  title: 'Sentinel AI GRC Overview',
  description: 'Welcome to Sentinel AI GRC. This platform provides continuous governance, risk, and compliance monitoring for your AI models and agents.',
  features: [
    {
      title: 'Global Navigation',
      description: 'Use the sidebar to jump between modules. Use the top command palette (press "/") for quick actions.',
      icon: Info,
    },
    {
      title: 'Contextual Actions',
      description: 'Most tables and grids support actions like exporting to CSV/PDF, filtering, and bulk operations.',
      icon: ChartBar,
    }
  ]
}

const MODULE_GUIDES: Record<string, GuideContent> = {
  '/overview': {
    title: 'Executive Dashboard',
    description: 'This is the main command center providing a high-level view of your AI portfolio\'s health.',
    features: [
      {
        title: 'KPI Cards',
        description: 'Track the total number of models, open high-severity risks, and compliance gaps across the organization.',
        icon: ChartBar,
      },
      {
        title: 'Risk Posture',
        description: 'Monitor the aggregated risk score and trend line over time to gauge organizational risk exposure.',
        icon: Warning,
      }
    ]
  },
  '/models': {
    title: 'Model Governance',
    description: 'Model Governance is the system of record for every AI/ML model in your organisation — the foundation the rest of the platform builds on. It answers the questions a regulator, an auditor, or your own board will ask: which models are in production, who owns them, how risky are they, how were they built, and can you prove it? It is organised into four connected areas — Model Registry (what you have), Model Lifecycle (how it moves to production), Model DNA & Lineage (how it was built and that it hasn\'t been tampered with), and Prompt Registry (the versioned instructions your models run on).',
    features: [
      {
        title: 'Why it matters',
        description: 'The EU AI Act, ISO 42001 and NIST AI RMF all require a maintained inventory, documented risk classification, human-oversight evidence and traceable provenance. Model Governance turns those obligations into living records instead of a spreadsheet you scramble to rebuild at audit time.',
        icon: ShieldCheck,
      },
      {
        title: 'How it works',
        description: 'Each area is backed by its own governed, tenant-isolated database table. Registering a model creates the authoritative record; promoting it through the lifecycle attaches approval gates; its DNA record fingerprints the build; and every prompt it uses is version-controlled — so the four views always agree.',
        icon: ChartBar,
      },
      {
        title: 'How to use it',
        description: 'Start in Model Registry — register your models and classify their risk. Move each through Model Lifecycle with the right approvals. Capture a DNA/provenance record for high-risk models, and register the production prompts. Revisit as models change; the records are your audit trail.',
        icon: BookOpenText,
      }
    ]
  },
  '/models/inventory': {
    title: 'Model Registry',
    description: 'The Model Registry is the single, authoritative inventory of every AI/ML model your organisation builds, buys, or embeds — foundation LLMs, fine-tunes, classifiers and third-party APIs alike. If a model is not in the Registry, from a governance standpoint it does not exist. It is the entry point for the whole Model Governance workflow and the source the KPIs, drift alerts and EU AI Act risk counts are computed from.',
    features: [
      {
        title: 'Why it matters',
        description: 'You cannot govern what you cannot see. Regulators expect a complete, current inventory with a documented risk tier, an accountable owner and evidence of human oversight for high-risk systems. The Registry is that inventory, and the red "Art. 9 obligations" banner flags models that legally require review.',
        icon: ShieldCheck,
      },
      {
        title: 'How it works',
        description: 'Every model is a governed record (name, type, version, provider, risk tier, fairness %, drift status, owner, EU AI Act class). Records are tenant-isolated and persisted — create, edit and delete write straight to the registry, and the KPI cards (Total / Production / Drift / High-Risk) recompute live.',
        icon: Robot,
      },
      {
        title: 'Model detail & evidence',
        description: 'Opening a model reveals its full passport across tabs: performance and drift charts, bias-audit history, an illustrative explainability view, data lineage, and two live evidence stores — Technical Documents (link artifacts from your DMS; persisted per model) and an Activity log that records every governance action. Configure drift/fairness alert thresholds and channels (saved to the model), export a Model Card or EU AI Act Annex IV package as JSON, and "Initiate Review" logs the request to the model\'s activity trail.',
        icon: FileText,
      },
      {
        title: 'How to use it',
        description: 'Click "Register Model" and complete the EU AI Act-aligned form (high-risk automatically forces human oversight). Use the filters and search to triage, open a row for the full passport, link technical documents and configure alerts on the detail page, and "Export CSV" to hand a snapshot to auditors. Editing a model preserves its governance fields; keep versions and owners current — everything downstream keys off this record.',
        icon: BookOpenText,
      }
    ]
  },
  '/models/lifecycle': {
    title: 'Model Lifecycle',
    description: 'Model Lifecycle is the controlled pathway a model travels from Development to Production and, eventually, Retirement. Rather than letting models slip into production informally, it enforces approval "gates" at each stage transition — each requiring an accountable reviewer and a recorded justification — so promotion becomes a documented, defensible decision, not a deployment accident.',
    features: [
      {
        title: 'Why it matters',
        description: 'EU AI Act Article 9 and sound MRM practice require that high-risk models are reviewed and signed off before deployment. The gate history is the evidence that the right people approved the right model at the right time — the first thing an examiner asks to see.',
        icon: ShieldCheck,
      },
      {
        title: 'How it works',
        description: 'Each tracked model has a current stage and an append-only trail of gates (promotion / rollback / decommission) with approver, date, decision and notes. Requesting a transition opens a pending gate but does NOT move the model — only approving that gate advances it to the new stage; rejecting it leaves the model where it is. Every decision is written to the audit trail.',
        icon: ChartBar,
      },
      {
        title: 'How to use it',
        description: 'Pick a model, then "Request Transition" to the target stage with a justification. The model stays put until an accountable reviewer approves the pending gate (recording remarks); rejection returns control without moving it. Use "Track a model" to onboard a model, and resolve the pending gate before requesting another transition.',
        icon: BookOpenText,
      }
    ]
  },
  '/models/dna': {
    title: 'Model DNA & Lineage',
    description: 'Model DNA & Lineage is the tamper-evident "birth certificate" of a model. It captures the cryptographic fingerprint of the model and its training data, the full provenance chain of how it was built (data → preprocessing → training → validation → deployment), and a hash-linked audit chain of every governance event. Together they let you prove a production model is exactly the one that was reviewed and approved.',
    features: [
      {
        title: 'Why it matters',
        description: 'Reproducibility and provenance are explicit expectations of the EU AI Act (Annex IV technical documentation) and ISO 42001. If a model drifts, is retrained, or is silently swapped, the fingerprint changes — giving you tamper-evidence and a defensible chain of custody for regulators and incident response.',
        icon: ShieldCheck,
      },
      {
        title: 'How it works',
        description: 'Each DNA record stores a SHA-256 fingerprint, training-data hash, base/parent model, a provenance timeline and a blockchain-style audit chain (each block references the previous hash). Records are persisted per model, and the integrity status flags any tampering.',
        icon: Brain,
      },
      {
        title: 'How to use it',
        description: 'Select a model to inspect its fingerprint, training lineage, and audit chain — the integrity banners, verification schedule and certificate reflect the record\'s real verification status (they turn red if tampering is flagged). Use "Register DNA" to create or update a provenance record (re-registering an existing model updates it rather than duplicating), and "Export Certificate" / "Download Certificate (JSON)" to hand an integrity certificate to an auditor.',
        icon: BookOpenText,
      }
    ]
  },
  '/prompt-registry': {
    title: 'Prompt Registry',
    description: 'The Prompt Registry brings version control and governance to the prompts that drive your LLM systems. In production AI, the system prompt is as consequential as model weights — it defines behaviour, guardrails and compliance posture — yet it is often edited ad hoc with no history. The Registry makes every prompt a governed, versioned, reviewable asset.',
    features: [
      {
        title: 'Why it matters',
        description: 'A single prompt change can introduce bias, leak PII, or break a regulatory control. Version history, approvals and ownership give you change control and an audit trail over the instructions your models actually run — closing a gap most GRC programmes miss entirely.',
        icon: ShieldCheck,
      },
      {
        title: 'How it works',
        description: 'Each prompt is a governed record with a category, status (draft / under review / active / deprecated), owner, token count, linked models and a full version history — every save creates a new immutable version with an author and change note. Records are tenant-isolated and persisted.',
        icon: FileText,
      },
      {
        title: 'How to use it',
        description: 'Use "New Prompt" to register a prompt (v1.0.0). Edit to publish a new version with a change note. Open a prompt and use Submit for Review, then Approve or Reject — each persists a real status transition (approval records the reviewer and date), moving it through draft → under review → active. The Safety tab shows a static heuristic pre-screen; connect a classifier in Settings for scored analysis. Search by name, content, owner or tag before promotion.',
        icon: BookOpenText,
      }
    ]
  },
  '/risk': {
    title: 'Risk Management',
    description: 'Identify, classify, and mitigate risks associated with your AI deployments.',
    features: [
      {
        title: 'Risk Register',
        description: 'The central ledger for all documented risks. Log new risks, assign owners, and track mitigation efforts.',
        icon: Warning,
      },
      {
        title: 'Risk Matrix',
        description: 'Visualize risks on a 5x5 matrix comparing likelihood vs. impact to prioritize mitigation strategies.',
        icon: ChartBar,
      },
      {
        title: 'Incident Log',
        description: 'Track and respond to AI-related incidents and operational failures as they occur.',
        icon: ShieldWarning,
      }
    ]
  },
  '/compliance': {
    title: 'Compliance & Controls',
    description: 'Map internal controls to external regulatory frameworks and monitor compliance gaps.',
    features: [
      {
        title: 'Control Library',
        description: 'Define internal governance controls and link them to specific risks and frameworks.',
        icon: ShieldCheck,
      },
      {
        title: 'Framework Mapping',
        description: 'Map controls to standards like the EU AI Act, NIST AI RMF, and ISO 42001 to identify compliance coverage.',
        icon: ChartBar,
      },
      {
        title: 'Evidence Hub',
        description: 'Store and link cryptographic evidence verifying that controls are operating effectively.',
        icon: FileText,
      }
    ]
  },
  '/security': {
    title: 'Security Center',
    description: 'Monitor the cybersecurity posture and adversarial vulnerabilities of your AI systems.',
    features: [
      {
        title: 'Threat Feed',
        description: 'Real-time intelligence on emerging threats and adversarial campaigns targeting AI systems.',
        icon: ShieldWarning,
      },
      {
        title: 'Attack Surface',
        description: 'Visualize the exploitable attack vectors and pathways into your AI infrastructure.',
        icon: ChartBar,
      },
      {
        title: 'Red Team Lab',
        description: 'Manage adversarial testing exercises and track vulnerabilities discovered during red teaming.',
        icon: ShieldCheck,
      }
    ]
  },
  '/agents': {
    title: 'Agentic Governance',
    description: 'Discover, monitor, and govern autonomous AI agents operating within your environment.',
    features: [
      {
        title: 'Agent Discovery',
        description: 'Automatically detect and inventory active AI agents and their capabilities.',
        icon: Brain,
      },
      {
        title: 'Shadow AI Detection',
        description: 'Identify unauthorized or unapproved AI agents operating outside of standard governance guardrails.',
        icon: ShieldWarning,
      },
      {
        title: 'Agent IAM',
        description: 'Manage Identity and Access Management specifically tailored for non-human autonomous agents.',
        icon: UserCircleCheck,
      }
    ]
  },
  '/trust-engine': {
    title: 'Trust Engine',
    description: 'Live observability and guardrail enforcement for AI inference traffic.',
    features: [
      {
        title: 'Guardrail Activity',
        description: 'Monitor real-time triggers, blocks, and warnings enforced by policy guardrails on AI outputs.',
        icon: ShieldCheck,
      },
      {
        title: 'Live Trace Feed',
        description: 'Inspect full request and response payloads for AI interactions to debug trust issues.',
        icon: ChartBar,
      },
      {
        title: 'Cost & Tokens',
        description: 'Track token consumption and infrastructure costs associated with model inference.',
        icon: FileText,
      }
    ]
  },
  '/vendors': {
    title: 'Vendor Risk Management',
    description: 'Assess and monitor the risk of third-party AI vendors and supply chains.',
    features: [
      {
        title: 'Vendor Registry',
        description: 'Maintain a catalog of all third-party AI providers and their current risk status.',
        icon: Buildings,
      },
      {
        title: 'Vendor Assessments',
        description: 'Dispatch and score security questionnaires to evaluate vendor compliance.',
        icon: FileText,
      }
    ]
  },
  '/evals': {
    title: 'Model Evaluations',
    description: 'Run automated evaluations, benchmark metrics, and inspect multi-turn session traces.',
    features: [
      {
        title: 'Quality Metrics',
        description: 'Track and score models across key quality and performance dimensions.',
        icon: ChartBar,
      },
      {
        title: 'Session Traces',
        description: 'View full conversation logs and traces to debug specific interactions.',
        icon: Info,
      }
    ]
  },
  '/hitl': {
    title: 'Human-In-The-Loop (HITL)',
    description: 'Review and approve AI decisions that require manual human oversight.',
    features: [
      {
        title: 'Review Queue',
        description: 'Manage pending AI decisions escalated for human review.',
        icon: UserCircleCheck,
      }
    ]
  },
  '/bias-audits': {
    title: 'Bias Auditing',
    description: 'Test models for algorithmic bias and unfairness across protected attributes.',
    features: [
      {
        title: 'Bias Metrics',
        description: 'Analyze fairness scores to ensure models do not discriminate.',
        icon: ShieldCheck,
      }
    ]
  },
  '/access-control': {
    title: 'Access Control (RBAC)',
    description: 'Manage users, roles, and identity governance for the platform.',
    features: [
      {
        title: 'Role Management',
        description: 'Assign granular permissions and scope access for human users.',
        icon: UserCircleCheck,
      }
    ]
  }
}

export function UserGuideDrawer({ open, onOpenChange }: UserGuideDrawerProps) {
  const location = useLocation()
  
  // Determine which guide to show based on URL prefix matching
  let activeGuide = DEFAULT_GUIDE
  
  // Find the longest matching route prefix
  const matchedPrefix = Object.keys(MODULE_GUIDES)
    .filter(prefix => location.pathname.startsWith(prefix))
    .sort((a, b) => b.length - a.length)[0]
    
  if (matchedPrefix) {
    activeGuide = MODULE_GUIDES[matchedPrefix]
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side='right'
        className='w-[380px] sm:w-[420px] p-0 flex flex-col bg-surface border-[hsl(var(--border))]'
      >
        {/* Header */}
        <SheetHeader className='px-5 py-4 border-b border-[hsl(var(--border))] flex-shrink-0 bg-raised'>
          <div className='flex items-center gap-3'>
            <div className='w-8 h-8 rounded-full bg-[hsl(var(--brand-subtle))] flex items-center justify-center text-[hsl(var(--brand))]'>
              <BookOpenText size={18} weight='duotone' />
            </div>
            <div>
              <p className='text-[10px] font-bold tracking-wider text-[hsl(var(--brand))] uppercase mb-0.5'>Module Guide</p>
              <SheetTitle className='text-lg font-semibold text-[hsl(var(--text-1))] leading-tight'>
                {activeGuide.title}
              </SheetTitle>
            </div>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className='flex-1 overflow-y-auto p-5'>
          <p className='text-sm text-[hsl(var(--text-2))] leading-relaxed mb-8'>
            {activeGuide.description}
          </p>

          <h3 className='text-xs font-bold uppercase tracking-wider text-[hsl(var(--text-4))] mb-4'>
            Key Features
          </h3>
          
          <div className='space-y-4'>
            {activeGuide.features.map((feature, idx) => {
              const Icon = feature.icon
              return (
                <div key={idx} className='flex gap-3 items-start group'>
                  <div className='mt-0.5 flex-shrink-0 w-7 h-7 flex items-center justify-center bg-[hsl(var(--bg-raised))] rounded text-[hsl(var(--text-3))] group-hover:text-[hsl(var(--brand))] group-hover:bg-[hsl(var(--brand-subtle))] transition-colors'>
                    <Icon size={16} />
                  </div>
                  <div>
                    <h4 className='text-sm font-semibold text-[hsl(var(--text-1))] mb-1'>
                      {feature.title}
                    </h4>
                    <p className='text-[13px] text-[hsl(var(--text-3))] leading-relaxed'>
                      {feature.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className='border-t border-[hsl(var(--border))] px-5 py-4 flex-shrink-0 bg-surface'>
          <a 
            href="https://docs.certifyi.ai" 
            target="_blank" 
            rel="noreferrer"
            className='flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-subtle))] transition-colors rounded'
          >
            View Full Documentation
          </a>
        </div>
      </SheetContent>
    </Sheet>
  )
}
