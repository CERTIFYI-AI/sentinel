import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { ChevronRight, ArrowLeft, Edit3, Eye, Send, CheckCircle, FileDown, Clock, MessageSquare, Shield, Link2 } from "lucide-react";

const STEPS = ["Draft","Review","Approved","Published"];
const sections = [
  {title:"1. Purpose & Scope",content:"This policy establishes guidelines for the responsible use of Artificial Intelligence (AI) and Machine Learning (ML) systems across the organization. It defines acceptable use boundaries, risk thresholds, and governance requirements to ensure AI systems are deployed ethically, transparently, and in compliance with applicable regulations including the EU AI Act and NIST AI RMF.\n\nScope: All employees, contractors, vendors, and third parties who develop, deploy, operate, or interact with AI/ML systems owned or managed by the organization."},
  {title:"2. Definitions",content:"AI System: Any software that uses machine learning, deep learning, natural language processing, computer vision, or other AI techniques to make predictions, recommendations, or decisions.\nHigh-Risk AI: Systems classified as Tier 1 or Tier 2 per POL-002 (AI Model Risk Classification Standard), including those affecting health, safety, legal rights, or financial decisions.\nHuman-in-the-Loop (HITL): A design pattern requiring human review and approval before an AI system acts on its output.\nModel Drift: Degradation in model performance over time due to changes in input data distribution or underlying patterns."},
  {title:"3. Policy Statements",content:"3.1 All AI systems must be registered in the AI Model Inventory before deployment to any environment.\n3.2 High-risk AI systems require mandatory bias testing per POL-006 before production release.\n3.3 Automated decisions that materially affect individuals must include an explainability mechanism per POL-010.\n3.4 AI training data must comply with data governance standards defined in POL-009.\n3.5 All production AI systems must implement monitoring and drift detection per POL-011.\n3.6 Third-party AI services must complete vendor assessment per POL-004 before integration.\n3.7 Any AI system failure or bias incident must be reported within 4 hours per POL-005.\n3.8 Generative AI tools must not be used to process classified or restricted data without explicit approval."},
  {title:"4. Roles & Responsibilities",content:"AI Governance Board: Overall policy ownership, exception approvals, and annual review.\nModel Owners: Responsible for ensuring their AI systems comply with this policy and all linked standards.\nData Scientists/Engineers: Must follow approved development practices, document model decisions, and conduct required testing.\nCompliance Team: Monitors adherence, conducts audits, and reports violations.\nCISO Office: Oversees AI security controls and incident response."},
  {title:"5. Compliance Requirements",content:"EU AI Act: High-risk AI systems must implement conformity assessments and maintain technical documentation.\nNIST AI RMF: All AI systems must be mapped to the NIST AI Risk Management Framework categories (Govern, Map, Measure, Manage).\nGDPR: AI systems processing personal data must implement data protection by design and conduct DPIAs where required.\nISO 27001: AI-related information security controls must align with the organizations ISMS."},
  {title:"6. Review & Approval",content:"This policy is reviewed quarterly by the AI Governance Board. Material changes require approval from the Chief AI Ethics Officer and CISO. Non-material updates (formatting, references) may be approved by the Policy Owner.\n\nNext scheduled review: 2026-05-15"},
  {title:"7. Exceptions Process",content:"Exceptions to this policy must be submitted via the GRC platform with justification, risk assessment, compensating controls, and a defined expiration date. Exceptions for high-risk AI systems require board-level approval. All exceptions are logged and audited quarterly."},
];

const comments = [
  {author:"Dr. Sarah Mitchell",role:"AI Ethics Officer",date:"2026-02-10",text:"Section 3.8 on generative AI needs tighter language around classified data. Consider adding specific examples."},
  {author:"David Kim",role:"Security Lead",date:"2026-02-12",text:"Approved from security perspective. Recommend linking to OWASP LLM Top 10 in section 5."},
  {author:"Maria Santos",role:"ML Engineering Lead",date:"2026-02-14",text:"Model inventory registration process is now automated. Updated section 3.1 reference."},
];

const relatedPolicies = [
  {id:"POL-002",name:"AI Model Risk Classification Standard"},
  {id:"POL-006",name:"Bias Testing & Fairness Standard"},
  {id:"POL-009",name:"AI Training Data Governance Standard"},
];

export default function PolicyEditor() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const policyId = params.get("id") || "POL-001";
  const [editMode, setEditMode] = useState(false);
  const [editSections, setEditSections] = useState(sections.map(s=>s.content));
  const currentStep = 3; // Published

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Left Panel - Document */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-zinc-400 mb-4">
          <button className="hover:text-emerald-400" onClick={()=>nav("/compliance/policies")}>Policy Manager</button>
          <ChevronRight className="w-3 h-3"/><span className="text-zinc-500">{policyId}</span>
          <ChevronRight className="w-3 h-3"/><span className="text-white">Acceptable AI Use Policy</span>
        </div>
        {/* Title */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={()=>nav("/compliance/policies")} className="p-2 hover:bg-zinc-800 rounded-lg"><ArrowLeft className="w-5 h-5 text-zinc-400"/></button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Acceptable AI Use Policy</h1>
            <div className="flex items-center gap-2 mt-1"><Badge className="bg-emerald-500/20 text-emerald-400">active</Badge><Badge variant="outline" className="border-zinc-600 text-zinc-300">v3.2</Badge><span className="text-zinc-500 text-sm">EU AI Act</span></div>
          </div>
          <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={()=>setEditMode(!editMode)}>{editMode?<><Eye className="w-4 h-4 mr-2"/>View</>:<><Edit3 className="w-4 h-4 mr-2"/>Edit</>}</Button>
        </div>
        <Separator className="bg-zinc-800 mb-6"/>
        {/* Document Sections */}
        <div className="space-y-6 max-w-4xl">
          {sections.map((sec,i)=>(
            <Card key={i} className="bg-[#1a1a2e] border-zinc-800 p-6">
              <h2 className="text-lg font-semibold text-white mb-3">{sec.title}</h2>
              {editMode ? <textarea className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-zinc-300 text-sm min-h-[120px] resize-y" value={editSections[i]} onChange={e=>{const n=[...editSections];n[i]=e.target.value;setEditSections(n);}}/> : <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">{sec.content}</p>}
            </Card>
          ))}
        </div>
      </div>
      {/* Right Sidebar */}
      <div className="w-[340px] border-l border-zinc-800 bg-[#111122] p-5 overflow-y-auto space-y-5">
        {/* Metadata */}
        <Card className="bg-[#1a1a2e] border-zinc-800 p-4">
          <h3 className="text-white font-semibold text-sm mb-3">Policy Metadata</h3>
          <div className="space-y-2 text-sm">
            {[["Owner","Emma Wilson"],["Status","Published"],["Version","v3.2"],["Framework","EU AI Act"],["Category","AI Usage"],["Risk Level","High"]].map(([k,v],i)=>(
              <div key={i} className="flex justify-between"><span className="text-zinc-500">{k}</span><span className={v==="High"?"text-red-400":v==="Published"?"text-emerald-400":"text-white"}>{v}</span></div>
            ))}
          </div>
        </Card>
        {/* Review Progress */}
        <Card className="bg-[#1a1a2e] border-zinc-800 p-4">
          <h3 className="text-white font-semibold text-sm mb-3">Review Status</h3>
          <div className="flex items-center gap-1">
            {STEPS.map((s,i)=>(
              <div key={i} className="flex-1 flex flex-col items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${i<=currentStep?"bg-emerald-500 text-white":"bg-zinc-700 text-zinc-400"}`}>{i<currentStep?<CheckCircle className="w-3 h-3"/>:i+1}</div>
                <span className="text-[10px] text-zinc-400 mt-1">{s}</span>
                {i<3&&<div className={`h-0.5 w-full mt-1 ${i<currentStep?"bg-emerald-500":"bg-zinc-700"}`}/>}
              </div>
            ))}
          </div>
        </Card>
        {/* Related Policies */}
        <Card className="bg-[#1a1a2e] border-zinc-800 p-4">
          <h3 className="text-white font-semibold text-sm mb-3">Related Policies</h3>
          <div className="space-y-2">
            {relatedPolicies.map(rp=>(
              <button key={rp.id} className="w-full text-left p-2 rounded-lg hover:bg-zinc-800/50 flex items-center gap-2" onClick={()=>nav(`/policy-editor?id=${rp.id}`)}>
                <Link2 className="w-3 h-3 text-emerald-500"/><div><p className="text-zinc-300 text-xs">{rp.id}</p><p className="text-zinc-400 text-xs">{rp.name}</p></div>
              </button>
            ))}
          </div>
        </Card>
        {/* Linked Controls */}
        <Card className="bg-[#1a1a2e] border-zinc-800 p-4">
          <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-500"/><h3 className="text-white font-semibold text-sm">Linked Controls</h3></div>
          <p className="text-zinc-400 text-sm mt-2">3 controls linked (2 implemented, 1 partial)</p>
        </Card>
        {/* Actions */}
        <div className="space-y-2">
          <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"><Send className="w-4 h-4 mr-2"/>Submit for Review</Button>
          <Button variant="outline" className="w-full border-zinc-700 text-zinc-300"><CheckCircle className="w-4 h-4 mr-2"/>Approve</Button>
          <Button variant="outline" className="w-full border-zinc-700 text-zinc-300"><FileDown className="w-4 h-4 mr-2"/>Export PDF</Button>
          <Button variant="outline" className="w-full border-zinc-700 text-zinc-300"><Clock className="w-4 h-4 mr-2"/>Version History</Button>
        </div>
        {/* Comments */}
        <Card className="bg-[#1a1a2e] border-zinc-800 p-4">
          <h3 className="text-white font-semibold text-sm mb-3"><MessageSquare className="w-4 h-4 inline mr-2"/>Review Comments</h3>
          <div className="space-y-3">
            {comments.map((c,i)=>(
              <div key={i} className="bg-zinc-800/30 rounded-lg p-3">
                <div className="flex justify-between items-start"><div><p className="text-white text-xs font-medium">{c.author}</p><p className="text-zinc-500 text-[10px]">{c.role}</p></div><span className="text-zinc-500 text-[10px]">{c.date}</span></div>
                <p className="text-zinc-300 text-xs mt-2">{c.text}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
