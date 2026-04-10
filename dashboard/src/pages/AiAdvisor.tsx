import { useState, useRef, useEffect } from "react"
import { toast } from 'sonner'
import {
  Brain, PaperPlaneRight, ArrowClockwise, Warning, CheckCircle,
  Clock, Lightbulb, ShieldWarning, ChartBar, X, Funnel,
} from '@phosphor-icons/react'

const SUGGESTIONS = [
  { id: 1, category: "Policy Gap", severity: "Critical", title: "EU AI Act Article 13 — Transparency obligation not met for Credit Scoring Model v2.1", description: "Credit Scoring Model v2.1 lacks human-readable explanations for automated decisions. EU AI Act Article 13 requires high-risk AI systems to be transparent and auditable.", action: "Add SHAP-based explanation layer and update model card documentation by Apr 20.", status: "Open" },
  { id: 2, category: "Bias Risk", severity: "Critical", title: "Demographic parity gap detected in Loan Approval Model across gender groups", description: "Statistical analysis shows 18.3% disparity in approval rates between male and female applicants in Loan Approval Model v3.0.", action: "Initiate bias audit workflow, apply re-weighting techniques, schedule HITL review.", status: "Open" },
  { id: 3, category: "Compliance", severity: "High", title: "SOC 2 Type II evidence collection deadline approaching in 14 days", description: "Annual SOC 2 audit requires updated evidence for CC6.1, CC6.2, CC7.1 controls. Current collection is 43% complete.", action: "Trigger evidence sync for remaining controls and assign to compliance team.", status: "In Progress" },
  { id: 4, category: "Vendor Risk", severity: "High", title: "OpenAI GPT-4 API dependency — no fallback configured for FraudGuard AI", description: "FraudGuard AI v1.5 relies exclusively on OpenAI GPT-4 with no fallback model configured. Single point of failure risk.", action: "Configure Anthropic Claude 3 as fallback, implement circuit breaker pattern.", status: "Open" },
  { id: 5, category: "Incident", severity: "Critical", title: "Model drift: Customer Churn Predictor accuracy dropped below threshold", description: "Customer Churn Predictor v2.3 accuracy dropped from 87.4% to 71.2% over 30 days due to distribution shift.", action: "Initiate emergency retraining pipeline, escalate to ML Engineering.", status: "Escalated" },
  { id: 6, category: "Policy Gap", severity: "Medium", title: "ISO 42001 Section 6.1.2 — Risk treatment plan incomplete for 4 risks", description: "Risk treatment plan for Acme Financial Corp AI governance program missing entries for R-004, R-007, R-009, R-012.", action: "Complete risk treatment plan entries within 7 days.", status: "Open" },
  { id: 7, category: "Data Quality", severity: "High", title: "PII detected in unencrypted training dataset DS-017", description: "Training dataset DS-017 contains unmasked social security numbers and bank account numbers violating GDPR Article 25.", action: "Immediately quarantine dataset, run PII scrubbing pipeline, notify DPO.", status: "Open" },
  { id: 8, category: "Compliance", severity: "Medium", title: "NIST AI RMF GOVERN 1.1 — AI risk policy not reviewed in 18 months", description: "Acme Financial Corp AI Risk Policy was last reviewed January 2025, exceeding the 12-month review cycle requirement.", action: "Schedule policy review for April 25 with CISO and Legal.", status: "Open" },
]

const INITIAL_MESSAGES = [
  {
    role: "assistant",
    text: "Hello! I'm Sentinel AI Advisor — your AI governance co-pilot for Acme Financial Corp. I monitor 12 active AI systems, track 3 compliance frameworks, and surface real-time governance risks.\n\nI can help you with:\n• EU AI Act / ISO 42001 / NIST AI RMF compliance status\n• Bias audit findings and remediation\n• Risk posture and treatment plans\n• Evidence collection status\n• Vendor and model incident analysis\n\nWhat would you like to work on today?",
  },
]

const RESPONSES: { keywords: string[]; text: string }[] = [
  {
    keywords: ['eu ai act', 'eu act', 'article 13', 'high-risk'],
    text: "**EU AI Act Status — Acme Financial Corp**\n\n3 systems classified as High-Risk:\n• Credit Scoring Model v2.1 → Article 13 transparency gap (CRITICAL)\n• Loan Approval Model v3.0 → Article 10 data governance gap (HIGH)\n• Fraud Detection Engine v4.2 → Conformant ✓\n\nOverall EU AI Act readiness: 67%. Deadline for compliance: August 2026.\n\n**Recommended immediate action:** Schedule Article 13 remediation for Credit Scoring Model — estimated 3 engineering sprints.",
  },
  {
    keywords: ['bias', 'fairness', 'demographic', 'parity'],
    text: "**Bias Audit Status — All Models**\n\n🔴 CRITICAL: Loan Approval Model v3.0 — 18.3% demographic parity gap (gender)\n🟡 MONITOR: Credit Scoring Model v2.1 — equalized odds at 91.2% (acceptable)\n🟢 PASSED: Fraud Detection Engine v4.2 — all fairness metrics within threshold\n🔵 SCHEDULED: Customer Churn Predictor v2.3 — audit due April 22\n\nRecommendation: Initiate HITL review for Loan Approval Model immediately. Apply fairness constraints using IBM AIF360 re-weighting technique.",
  },
  {
    keywords: ['risk', 'risks', 'risk posture', 'risk register'],
    text: "**Risk Posture — Acme Financial Corp**\n\nOverall risk level: ELEVATED (Score: 7.2/10)\n\nTop risks:\n1. Model drift — Customer Churn Predictor (CRITICAL, score 20/25)\n2. Demographic bias — Loan Approval Model (CRITICAL, score 20/25)\n3. API single point of failure — FraudGuard AI (HIGH, score 15/25)\n4. PII in training data — Dataset DS-017 (HIGH, score 12/25)\n\n4 risks awaiting treatment plan completion. Risk committee review due April 25.",
  },
  {
    keywords: ['report', 'generate report', 'compliance report', 'summary'],
    text: "**Compliance Summary — Acme Financial Corp (April 2026)**\n\nOverall compliance score: 72%\n• EU AI Act: 67% ↓ (was 71% last quarter)\n• ISO 42001: 78% → stable\n• SOC 2 Type II: 81% ↑ (was 76% last quarter)\n• NIST AI RMF: 69% → stable\n\n3 critical items require attention before April 20 audit:\n1. EU AI Act Article 13 transparency for Credit Scoring Model\n2. Bias remediation for Loan Approval Model\n3. SOC 2 evidence collection (currently 43% complete)\n\nExport full report as PDF?",
  },
  {
    keywords: ['vendor', 'openai', 'anthropic', 'supply chain', 'third-party'],
    text: "**Vendor Risk Summary**\n\n6 AI vendors in scope:\n• OpenAI (Tier 1) — DPA signed, concentration risk HIGH (45% dependency)\n• Anthropic (Tier 1) — DPA signed, security questionnaire in progress\n• Hugging Face (Tier 2) — DPA pending, model provenance unverified\n• AWS Bedrock (Tier 2) — DPA signed, low risk\n\n⚠️ Alert: OpenAI outage on April 7 caused 23-minute FraudGuard AI degradation. No fallback was triggered — circuit breaker configuration needed.\n\nRecommend: Complete vendor concentration risk remediation by April 30.",
  },
  {
    keywords: ['incident', 'incidents', 'drift', 'degradation', 'outage'],
    text: "**Active Incidents — Last 30 Days**\n\n🔴 INC-2026-034: Customer Churn Predictor drift — accuracy at 71.2% (threshold: 80%) — ESCALATED\n🟡 INC-2026-031: OpenAI API degradation — 23-min outage, FraudGuard AI impacted — IN REMEDIATION\n🟢 INC-2026-028: PII exposure in DS-017 — dataset quarantined, DPO notified — RESOLVED\n\nMTTR this month: 4.2 hours (target: <6 hours ✓)\n\nRecommend: Emergency retrain pipeline for Customer Churn Predictor. Estimated time to restore: 48 hours.",
  },
  {
    keywords: ['evidence', 'soc 2', 'audit', 'controls'],
    text: "**Evidence & Audit Status**\n\nSOC 2 Type II audit in 14 days:\n• CC6.1 (Logical Access) — Evidence pending ⚠️\n• CC6.2 (Authentication) — Evidence collected ✓\n• CC7.1 (System Monitoring) — Evidence pending ⚠️\n• CC8.1 (Change Management) — Evidence collected ✓\n\nOverall: 43% evidence complete. At current pace, will be 71% by audit date.\n\nRecommend: Trigger automated evidence sync for CC6.1 and CC7.1 now. Assign to Marcus Johnson (Compliance Analyst).",
  },
]

function formatText(text: string) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('**') && line.endsWith('**')) {
      return <p key={i} className="font-semibold text-[hsl(var(--text-1))] mb-1 mt-2 first:mt-0">{line.replace(/\*\*/g, '')}</p>
    }
    if (line.startsWith('•') || line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.') || line.startsWith('4.') || line.startsWith('🔴') || line.startsWith('🟡') || line.startsWith('🟢') || line.startsWith('🔵')) {
      return <p key={i} className="text-[hsl(var(--text-2))] pl-1">{line}</p>
    }
    if (line === '') return <div key={i} className="h-1" />
    return <p key={i} className="text-[hsl(var(--text-2))]">{line}</p>
  })
}

const SEVERITY_STYLES: Record<string, { bg: string; color: string }> = {
  Critical: { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' },
  High: { bg: 'hsl(25 95% 53% / 0.12)', color: 'hsl(var(--s-wn-tx))' },
  Medium: { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(45 85% 40%)' },
  Low: { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
}

const FILTERS = ["All", "Critical", "High", "Medium", "Policy Gap", "Bias Risk", "Compliance", "Vendor Risk", "Incident"]

export default function AiAdvisor() {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState(INITIAL_MESSAGES)
  const [filter, setFilter] = useState("All")
  const [suggestions, setSuggestions] = useState(SUGGESTIONS)
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    const userMsg = { role: "user", text: trimmed }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setLoading(true)

    setTimeout(() => {
      const lower = trimmed.toLowerCase()
      const matched = RESPONSES.find(r => r.keywords.some(k => lower.includes(k)))
      const responseText = matched?.text ||
        "I've analyzed your query against Acme Financial Corp's governance data. For best results, ask about:\n• EU AI Act compliance status\n• Bias and fairness audit results\n• Risk posture and treatment plans\n• Incident status and remediation\n• Vendor risk and supply chain\n• Evidence and audit readiness"

      setMessages(prev => [...prev, { role: "assistant", text: responseText }])
      setLoading(false)
    }, 800)
  }

  const handleDismiss = (id: number) => {
    setSuggestions(prev => prev.filter(s => s.id !== id))
    toast.success('Suggestion dismissed', { description: 'Item removed from your advisory queue.' })
  }

  const handleTakeAction = (s: typeof SUGGESTIONS[0]) => {
    toast.success('Action queued', { description: `Task created: ${s.title.slice(0, 60)}…` })
  }

  const filtered = filter === "All"
    ? suggestions
    : suggestions.filter(s => s.severity === filter || s.category === filter)

  const criticalCount = suggestions.filter(s => s.severity === 'Critical').length
  const highCount = suggestions.filter(s => s.severity === 'High').length

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4">
      {/* Left — Chat */}
      <div className="flex flex-col flex-1 min-w-0 gap-3">
        {/* Header */}
        <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-[hsl(var(--brand))] flex items-center justify-center flex-shrink-0">
            <Brain size={20} weight="fill" className="text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-[hsl(var(--text-1))]">AI Governance Advisor</h1>
            <p className="text-xs text-[hsl(var(--text-4))]">Sentinel AI Co-Pilot · Acme Financial Corp · 12 AI systems monitored</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-[hsl(var(--text-4))]">
            {criticalCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-1" style={{ background: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' }}>
                <Warning size={12} /> {criticalCount} Critical
              </span>
            )}
            {highCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-1" style={{ background: 'hsl(25 95% 53% / 0.12)', color: 'hsl(var(--s-wn-tx))' }}>
                <ShieldWarning size={12} /> {highCount} High
              </span>
            )}
          </div>
        </div>

        {/* Chat history */}
        <div className="flex-1 rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4 overflow-y-auto space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <div className="w-7 h-7 bg-[hsl(var(--brand))] flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                  <Brain size={14} weight="fill" className="text-white" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded px-4 py-3 text-[13px] leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[hsl(var(--brand))] text-white'
                    : 'bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]'
                }`}
              >
                {m.role === 'assistant' ? formatText(m.text) : m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="w-7 h-7 bg-[hsl(var(--brand))] flex items-center justify-center flex-shrink-0 mr-2">
                <Brain size={14} weight="fill" className="text-white" />
              </div>
              <div className="bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] rounded px-4 py-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-[hsl(var(--brand))] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-[hsl(var(--brand))] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-[hsl(var(--brand))] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick prompts */}
        <div className="flex flex-wrap gap-1.5">
          {['EU AI Act status', 'Latest bias audit', 'Top risks today', 'Evidence collection', 'Active incidents'].map(p => (
            <button
              key={p}
              onClick={() => { setInput(p); }}
              className="text-[11px] px-2.5 py-1 border border-[hsl(var(--border))] text-[hsl(var(--text-3))] hover:bg-[hsl(var(--bg-raised))] hover:text-[hsl(var(--text-1))] transition-colors rounded-sm"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            className="flex-1 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] px-4 py-2.5 text-sm text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:outline-none focus:border-[hsl(var(--brand))] rounded"
            placeholder="Ask about compliance, bias, risks, vendors, incidents…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-[hsl(var(--brand))] text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity rounded"
          >
            <PaperPlaneRight size={15} weight="fill" />
            Send
          </button>
        </div>
      </div>

      {/* Right — Advisory Queue */}
      <div className="w-96 flex flex-col gap-3 flex-shrink-0">
        {/* Filter bar */}
        <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] flex items-center gap-1.5">
              <Lightbulb size={14} weight="fill" className="text-[hsl(var(--brand))]" />
              Advisory Queue
              <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-[hsl(var(--brand))] text-white font-bold">
                {suggestions.length}
              </span>
            </h3>
            <button
              onClick={() => setSuggestions(SUGGESTIONS)}
              className="text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))]"
              title="Reset queue"
            >
              <ArrowClockwise size={13} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="text-[10px] px-2 py-0.5 border transition-colors"
                style={
                  filter === f
                    ? { background: 'hsl(var(--brand))', color: 'white', borderColor: 'hsl(var(--brand))' }
                    : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-4))' }
                }
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Suggestion cards */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
          {filtered.length === 0 && (
            <div className="text-center py-10 text-[hsl(var(--text-4))] text-sm">
              <CheckCircle size={24} className="mx-auto mb-2 text-[hsl(var(--s-ok-tx))]" />
              No items in this category
            </div>
          )}
          {filtered.map(s => {
            const sty = SEVERITY_STYLES[s.severity] ?? SEVERITY_STYLES.Medium
            return (
              <div key={s.id} className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5"
                      style={sty}
                    >
                      {s.severity}
                    </span>
                    <span className="text-[10px] text-[hsl(var(--text-4))] border border-[hsl(var(--border))] px-1.5 py-0.5">
                      {s.category}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDismiss(s.id)}
                    className="text-[hsl(var(--text-4))] hover:text-[hsl(var(--destructive))] flex-shrink-0"
                  >
                    <X size={12} />
                  </button>
                </div>
                <p className="text-[12px] font-medium text-[hsl(var(--text-1))] leading-snug">{s.title}</p>
                <p className="text-[11px] text-[hsl(var(--text-4))] leading-relaxed">{s.description}</p>
                <div className="p-2 bg-[hsl(var(--bg-raised))] border-l-2 border-[hsl(var(--brand))]">
                  <p className="text-[10px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-0.5">Recommended Action</p>
                  <p className="text-[11px] text-[hsl(var(--text-2))]">{s.action}</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleTakeAction(s)}
                    className="flex-1 text-[11px] py-1.5 bg-[hsl(var(--brand))] text-white font-medium hover:opacity-90 transition-opacity"
                  >
                    Take Action
                  </button>
                  <button
                    onClick={() => handleDismiss(s.id)}
                    className="text-[11px] px-3 py-1.5 border border-[hsl(var(--border))] text-[hsl(var(--text-3))] hover:bg-[hsl(var(--bg-raised))]"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Stats footer */}
        <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-3 grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Open', value: suggestions.filter(s => s.status === 'Open').length, icon: Clock, color: 'hsl(var(--s-wn-tx))' },
            { label: 'In Progress', value: suggestions.filter(s => s.status === 'In Progress').length, icon: ArrowClockwise, color: 'hsl(var(--s-in-tx))' },
            { label: 'Escalated', value: suggestions.filter(s => s.status === 'Escalated').length, icon: ShieldWarning, color: 'hsl(var(--destructive))' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label}>
              <Icon size={14} className="mx-auto mb-1" style={{ color }} />
              <p className="text-lg font-bold text-[hsl(var(--text-1))]">{value}</p>
              <p className="text-[10px] text-[hsl(var(--text-4))]">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
