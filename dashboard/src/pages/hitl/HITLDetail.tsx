import { useParams, useNavigate } from "react-router-dom";
import { Badge } from "../../components/ui/badge";
import { ArrowLeft, Clock, Shield, AlertTriangle, CheckCircle2, XCircle, MessageSquare, User } from "lucide-react";
import { useState } from "react";

const reviews: Record<string, any> = {
  "HITL-001": { id: "HITL-001", model: "CreditScorer v2.1", type: "Loan Denial", priority: "Critical", status: "Pending Review", sla: "2h 15m", assignee: "Dr. Sarah Chen",
    input: { applicantAge: 34, income: 52000, creditScore: 621, debtRatio: 0.42, employmentYears: 3 },
    decision: "Denied", confidence: 0.87, riskFlags: ["High debt-to-income ratio (0.42 > 0.36 threshold)", "Credit score below 640 minimum", "Short employment history"],
    explanation: [{feature:"debtRatio",impact:0.35},{feature:"creditScore",impact:0.28},{feature:"employmentYears",impact:0.18},{feature:"income",impact:0.12},{feature:"age",impact:0.07}],
    timeline: [{time:"2026-04-04 09:15",event:"Auto-flagged by model confidence threshold",by:"System"},{time:"2026-04-04 09:20",event:"Assigned to Dr. Sarah Chen",by:"System"},{time:"2026-04-04 10:00",event:"Review started",by:"Dr. Sarah Chen"}],
    similar: [{id:"HITL-089",decision:"Override to Approved",date:"2026-03-28"},{id:"HITL-076",decision:"Approved Original",date:"2026-03-22"}] },
  "HITL-002": { id: "HITL-002", model: "HiringFilter v1.3", type: "Resume Screening", priority: "High", status: "In Review", sla: "4h 30m", assignee: "James Park",
    input: { candidateName: "A. Rodriguez", role: "Sr. Engineer", experience: 8, education: "MS CS", skills: ["Python","ML","AWS"] },
    decision: "Rejected", confidence: 0.72, riskFlags: ["Potential gender bias detected in name-based features", "Low confidence score below 0.80 threshold"],
    explanation: [{feature:"experienceMatch",impact:0.30},{feature:"skillOverlap",impact:0.25},{feature:"education",impact:0.20},{feature:"nameFeatures",impact:0.15},{feature:"location",impact:0.10}],
    timeline: [{time:"2026-04-03 14:00",event:"Flagged for bias review",by:"Bias Monitor"},{time:"2026-04-03 14:30",event:"Assigned to James Park",by:"System"}],
    similar: [{id:"HITL-065",decision:"Override to Approved",date:"2026-03-15"}] },
  "HITL-003": { id: "HITL-003", model: "FraudDetector v3.0", type: "Transaction Flag", priority: "Critical", status: "Escalated", sla: "1h 00m", assignee: "Michael Torres",
    input: { amount: 15420, merchant: "Electronics Store", country: "US", timeOfDay: "03:42 AM", cardPresent: false },
    decision: "Flagged Fraud", confidence: 0.94, riskFlags: ["Unusual time of transaction", "High amount for card-not-present", "Velocity: 3 transactions in 10 minutes"],
    explanation: [{feature:"timeOfDay",impact:0.32},{feature:"amount",impact:0.28},{feature:"velocity",impact:0.22},{feature:"cardPresent",impact:0.12},{feature:"merchant",impact:0.06}],
    timeline: [{time:"2026-04-04 03:42",event:"Transaction flagged",by:"System"},{time:"2026-04-04 03:45",event:"Auto-assigned critical priority",by:"System"},{time:"2026-04-04 04:00",event:"Escalated to fraud team",by:"Michael Torres"}],
    similar: [{id:"HITL-091",decision:"Confirmed Fraud",date:"2026-04-01"},{id:"HITL-088",decision:"False Positive",date:"2026-03-30"}] },
};
["HITL-004","HITL-005"].forEach((id,i) => { reviews[id] = {...reviews["HITL-001"], id, model: i===0?"ContentModerator v2.0":"InsuranceRisk v1.5", type: i===0?"Content Removal":"Claim Denial", priority: i===0?"Medium":"High", status: "Pending Review" }; });

export default function HITLDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [comment, setComment] = useState("");
  const r = reviews[id || ""] || reviews["HITL-001"];
  const pColor = r.priority==="Critical"?"destructive":r.priority==="High"?"default":"secondary";
  return (
    <div className="p-6 space-y-6">
      <button onClick={() => nav("/hitl")} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"><ArrowLeft className="h-4 w-4"/>Back to HITL Reviews</button>
      <div className="flex items-start justify-between">
        <div><h1 className="text-2xl font-bold text-white">{r.id}</h1><p className="text-sm text-gray-400 mt-1">{r.model} — {r.type}</p></div>
        <div className="flex gap-2 items-center"><Badge variant={pColor}>{r.priority}</Badge><Badge variant="outline">{r.status}</Badge><div className="flex items-center gap-1 text-amber-400 text-sm"><Clock className="h-4 w-4"/>SLA: {r.sla}</div></div>
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-[#12121a] border border-gray-800 rounded-xl p-5"><h3 className="text-sm font-medium text-gray-300 mb-3">Input Data</h3><div className="space-y-2">{Object.entries(r.input).map(([k,v]) => <div key={k} className="flex justify-between border-b border-gray-800/50 pb-2"><span className="text-sm text-gray-400 capitalize">{k.replace(/([A-Z])/g," $1")}</span><span className="text-sm text-white font-mono">{Array.isArray(v)?v.join(", "):String(v)}</span></div>)}</div></div>
          <div className="bg-[#12121a] border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Model Decision</h3>
            <div className="flex items-center gap-4 mb-4"><span className="text-xl font-bold text-white">{r.decision}</span><div className="flex items-center gap-2"><div className="w-24 h-2 bg-gray-700 rounded-full"><div className="h-2 bg-emerald-500 rounded-full" style={{width:`${r.confidence*100}%`}}/></div><span className="text-sm text-gray-400">{(r.confidence*100).toFixed(0)}%</span></div></div>
            <h4 className="text-xs text-gray-500 mb-2">Feature Importance (SHAP)</h4>
            <div className="space-y-2">{r.explanation.map((e: any) => <div key={e.feature} className="flex items-center gap-3"><span className="text-xs text-gray-400 w-32 truncate">{e.feature}</span><div className="flex-1 h-2 bg-gray-700 rounded-full"><div className="h-2 bg-blue-500 rounded-full" style={{width:`${e.impact*100}%`}}/></div><span className="text-xs text-gray-500">{(e.impact*100).toFixed(0)}%</span></div>)}</div>
          </div>
          <div className="bg-[#12121a] border border-gray-800 rounded-xl p-5"><h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-400"/>Risk Flags</h3><ul className="space-y-2">{r.riskFlags.map((f: string, i: number) => <li key={i} className="flex items-start gap-2 text-sm"><XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0"/><span className="text-gray-300">{f}</span></li>)}</ul></div>
          <div className="bg-[#12121a] border border-gray-800 rounded-xl p-5"><h3 className="text-sm font-medium text-gray-300 mb-3">Activity Timeline</h3><div className="space-y-3">{r.timeline.map((t: any, i: number) => <div key={i} className="flex gap-3 items-start"><div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"/><div><p className="text-sm text-white">{t.event}</p><p className="text-xs text-gray-500">{t.time} — {t.by}</p></div></div>)}</div></div>
        </div>
        <div className="space-y-6">
          <div className="bg-[#12121a] border border-gray-800 rounded-xl p-5"><h3 className="text-sm font-medium text-gray-300 mb-3">Reviewer</h3><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center"><User className="h-5 w-5 text-emerald-400"/></div><div><p className="text-sm text-white">{r.assignee}</p><p className="text-xs text-gray-400">Assigned Reviewer</p></div></div></div>
          <div className="bg-[#12121a] border border-gray-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-medium text-gray-300">Actions</h3>
            <button className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm flex items-center justify-center gap-2"><CheckCircle2 className="h-4 w-4"/>Approve Original</button>
            <button className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm flex items-center justify-center gap-2"><Shield className="h-4 w-4"/>Override Decision</button>
            <button className="w-full py-2 border border-red-500 text-red-400 hover:bg-red-500/10 rounded-lg text-sm flex items-center justify-center gap-2"><AlertTriangle className="h-4 w-4"/>Escalate</button>
            <button className="w-full py-2 border border-gray-600 text-gray-300 hover:bg-gray-800 rounded-lg text-sm flex items-center justify-center gap-2"><MessageSquare className="h-4 w-4"/>Request Info</button>
          </div>
          <div className="bg-[#12121a] border border-gray-800 rounded-xl p-5"><h3 className="text-sm font-medium text-gray-300 mb-3">Comment</h3><textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add review notes (required for overrides)..." className="w-full h-24 px-3 py-2 bg-[#0a0a0f] border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 resize-none"/></div>
          <div className="bg-[#12121a] border border-gray-800 rounded-xl p-5"><h3 className="text-sm font-medium text-gray-300 mb-3">Similar Decisions</h3><div className="space-y-2">{r.similar.map((s: any) => <div key={s.id} className="flex justify-between border-b border-gray-800/50 pb-2"><span className="text-sm text-emerald-400 font-mono">{s.id}</span><span className="text-xs text-gray-400">{s.decision}</span></div>)}</div></div>
        </div>
      </div>
    </div>
  );
}
