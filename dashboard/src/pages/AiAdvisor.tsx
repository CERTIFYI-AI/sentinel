import { useState } from "react"
import { toast } from 'sonner'

const SUGGESTIONS = [
  { id: 1, category: "Policy Gap", severity: "High", title: "EU AI Act Article 13 - Transparency obligation not met for Credit Scoring Model v2.1", description: "Your Credit Scoring Model v2.1 lacks human-readable explanations for automated decisions. EU AI Act Article 13 requires high-risk AI systems to be transparent.", action: "Add SHAP-based explanation layer and update model card documentation.", status: "Open" },
  { id: 2, category: "Bias Risk", severity: "Critical", title: "Demographic parity gap detected in Loan Approval Model across gender groups", description: "Statistical analysis shows 18.3% disparity in approval rates between male and female applicants in the Loan Approval Model v3.0.", action: "Initiate bias audit workflow, apply re-weighting techniques, schedule HITL review.", status: "Open" },
  { id: 3, category: "Compliance", severity: "Medium", title: "SOC 2 Type II evidence collection deadline approaching in 14 days", description: "Annual SOC 2 audit requires updated evidence for CC6.1, CC6.2, CC7.1 controls. Current collection is 43% complete.", action: "Trigger evidence sync for remaining controls and assign to compliance team.", status: "In Progress" },
  { id: 4, category: "Vendor Risk", severity: "High", title: "OpenAI GPT-4 API dependency - no fallback configured", description: "FraudGuard AI v1.5 relies exclusively on OpenAI GPT-4 with no fallback model configured. Single point of failure risk.", action: "Configure Anthropic Claude 3 as fallback, implement circuit breaker pattern.", status: "Open" },
  { id: 5, category: "Incident", severity: "Critical", title: "Model drift detected: Customer Churn Predictor accuracy dropped below threshold", description: "Customer Churn Predictor v2.3 accuracy has dropped from 87.4% to 71.2% over the last 30 days due to data distribution shift.", action: "Initiate emergency retraining pipeline, escalate to ML Engineering team.", status: "Escalated" },
  { id: 6, category: "Policy Gap", severity: "Low", title: "ISO 42001 Section 6.1.2 - Risk treatment plan incomplete", description: "Risk treatment plan for Acme Financial Corp AI governance program is missing treatment options for 4 identified risks.", action: "Complete risk treatment plan entries for R-004, R-007, R-009, R-012.", status: "Open" },
]

CHAT_SAMPLES = [
  { role: "assistant", text: "Hello! I am Sentinel AI Advisor, your AI governance co-pilot for Acme Financial Corp. I can help you navigate EU AI Act compliance, analyze model risks, review policy gaps, and generate audit-ready reports. What would you like to work on today?" }
]

export default function AiAdvisor() {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState(CHAT_SAMPLES)
  const [filter, setFilter] = useState("All")
  const [suggestions, setSuggestions] = useState(SUGGESTIONS)

  const handleSend = () => {
    const userMsg = { role: "user", text: input }
    const responses: Record<string, string> = {
      "eu ai act": "Acme Financial Corp has 3 high-risk AI systems under EU AI Act: Credit Scoring Model v2.1, Loan Approval Model v3.0, and Fraud Detection Engine v4.2. Article 13 transparency requirements need attention for Credit Scoring Model. I recommend scheduling a compliance review this week.",
      "bias": "Current bias audit status: Loan Approval Model v3.0 has CRITICAL demographic parity gap (18.3%). Customer Churn Predictor v2.3 passed last audit. Fraud Detection Engine v4.2 audit scheduled for next week. Recommend immediate HITL review for Loan Approval Model.",
      "risk": "Top 3 risks for Acme Financial Corp: 1) Model drift in Customer Churn Predictor (CRITICAL), 2) OpenAI API single point of failure (HIGH), 3) SOC 2 evidence collection deadline (MEDIUM). Overall risk posture: ELEVATED.",
      "report": "Generating compliance summary report for Acme Financial Corp... Overall compliance score: 72%. EU AI Act: 65% compliant. ISO 42001: 78% compliant. SOC 2: 81% compliant. 3 critical items require immediate attention."
    }
    const lower = input.toLowerCase()
    const responseText = Object.entries(responses).find(([k]) => lower.includes(k))?.[1] ||
      
    setMessages(prev => [...prev, userMsg, { role: "assistant", text: responseText }])
    setInput("")
  }

  const handleDismiss = (id: number) => {
    setSuggestions(prev => prev.filter(s => s.id !== id))
    toast('Suggestion dismissed', { description: 'Item removed from your advisory queue.' })
  }

  const severityColor = (s: string) => s === "Critical" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : s === "High" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" : s === "Medium" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"

  const filtered = filter === "All" ? suggestions : suggestions.filter(s => s.severity === filter || s.category === filter)

  return (
    <div className="flex h-full gap-4 p-4 bg-background text-foreground">
      <div className="flex flex-col flex-1 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-lg font-semibold mb-1">AI Governance Advisor</h2>
          <p className="text-sm text-muted-foreground">Powered by Sentinel AI - Real-time GRC co-pilot for Acme Financial Corp</p>
        </div>
        <div className="flex-1 rounded-lg border border-border bg-card p-4 flex flex-col gap-3 overflow-y-auto min-h-[300px] max-h-[400px]">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className={m.role === "user" ? "max-w-xl rounded-lg px-4 py-2 text-sm bg-primary text-primary-foreground" : "max-w-xl rounded-lg px-4 py-2 text-sm bg-muted text-foreground"}>
                {m.text}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Ask about EU AI Act compliance, bias risks, policy gaps..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
          />
          <button onClick={handleSend} className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90">Send</button>
        </div>
      </div>
      <div className="w-96 flex flex-col gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <h3 className="font-semibold text-sm mb-2">Active Suggestions ({suggestions.length})</h3>
          <div className="flex flex-wrap gap-1">
            {["All", "Critical", "High", "Medium", "Policy Gap", "Bias Risk", "Compliance"].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`text-xs px-2 py-0.5 rounded-full border ${ filter === f ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>{f}</button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 overflow-y-auto max-h-[600px]">
          {filtered.map(s => (
            <div key={s.id} className="rounded-lg border border-border bg-card p-3 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className={severityColor(s.severity)}>{s.severity}</span>
                <span className="text-xs text-muted-foreground">{s.category}</span>
              </div>
              <p className="text-sm font-medium">{s.title}</p>
              <p className="text-xs text-muted-foreground">{s.description}</p>
              <div className="mt-1 p-2 bg-muted rounded text-xs text-foreground">
                <span className="font-medium">Recommended: </span>{s.action}
              </div>
              <div className="flex gap-1 mt-1">
                <button className="flex-1 text-xs bg-primary text-primary-foreground rounded px-2 py-1 hover:bg-primary/90">Take Action</button>
                <button onClick={() => handleDismiss(s.id)} className="text-xs border border-border rounded px-2 py-1 hover:bg-muted">Dismiss</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
