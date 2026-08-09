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
    title: 'AI Model Governance',
    description: 'Manage the complete lifecycle, inventory, and architectural DNA of your AI models.',
    features: [
      {
        title: 'Model Inventory',
        description: 'A centralized registry of all deployed AI models, tracking ownership, risk tiers, and deployment status.',
        icon: Robot,
      },
      {
        title: 'Model Lifecycle',
        description: 'Track a model\'s progression from Development to Staging, Production, and eventual Retirement.',
        icon: ChartBar,
      },
      {
        title: 'AI Bill of Materials (BOM)',
        description: 'Manage the supply chain dependencies, weights, and foundational models underlying your deployments.',
        icon: FileText,
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
