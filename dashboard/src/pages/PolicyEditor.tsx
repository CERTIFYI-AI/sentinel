import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Textarea } from "../components/ui/textarea";
import { ChevronRight, ArrowLeft, Edit3, Eye, Send, CheckCircle, FileDown, Clock, MessageSquare, Shield, Link2, AlertTriangle, XCircle, History, User } from "lucide-react";

const STEPS = ["Draft","In Review","Approved","Published"];

const sections = [
  {title:"1. Purpose & Scope",content:"This policy establishes guidelines for the responsible use of Artificial Intelligence (AI) and Machine Learning (ML) systems across the organization. It defines acceptable use boundaries, risk thresholds, and governance requirements to ensure AI systems are deployed ethically, transparently, and in compliance with applicable regulations including the EU AI Act and NIST AI RMF.\n\nScope: All employees, contractors, vendors, and third parties who develop, deploy, operate, or interact with AI/ML systems owned or managed by the organization."},
  {title:"2. Definitions",content:"AI System: Any software that uses machine learning, deep learning, natural language processing, computer vision, or other AI techniques to make predictions, recommendations, or decisions.\nHigh-Risk AI: Systems classified as Tier 1 or Tier 2 per POL-002 (AI Model Risk Classification Standard), including those affecting health, safety, legal rights, or financial decisions.\nHuman-in-the-Loop (HITL): A design pattern requiring human review and approval before an AI system acts on its output.\nModel Drift: Degradation in model performance over time due to changes in input data distribution or underlying patterns."},
  {title:"3. Policy Statements",content:"3.1 All AI systems must be registered in the AI Model Inventory before deployment to any environment.\n3.2 High-risk AI systems require mandatory bias testing per POL-006 before production release.\n3.3 Automated decisions that materially affect individuals must include an explainability mechanism per POL-010.\n3.4 AI training data must comply with data governance standards defined in POL-009.\n3.5 All production AI systems must implement monitoring and drift detection per POL-011.\n3.6 Third-party AI services must complete vendor assessment per POL-004 before integration.\n3.7 Any AI system failure or bias incident must be reported within 4 hours per POL-005.\n3.8 Generative AI tools must not be used to process classified or restricted data without explicit approval."},
  {title:"4. Roles & Responsibilities",content:"AI Governance Board: Overall policy ownership, exception approvals, and annual review.\nModel Owners: Responsible for ensuring their AI systems comply with this policy and all linked standards.\nData Scientists/Engineers: Must follow approved development practices, document model decisions, and conduct required testing.\nCompliance Team: Monitors adherence, conducts audits, and reports violations.\nCISO Office: Oversees AI security controls and incident response."},
  {title:"5. Compliance Requirements",content:"EU AI Act: High-risk AI systems must implement conformity assessments and maintain technical documentation.\nNIST AI RMF: All AI systems must be mapped to the NIST AI Risk Management Framework categories (Govern, Map, Measure, Manage).\nGDPR: AI systems processing personal data must implement data protection by design and conduct DPIAs where required.\nISO 27001: AI-related information security controls must align with the organizations ISMS."},
  {title:"6. Review & Approval",content:"This policy is reviewed quarterly by the AI Governance Board. Material changes require approval from the Chief AI Ethics Officer and CISO. Non-material updates (formatting, references) may be approved by the Policy Owner.\n\nNext scheduled review: 2026-05-15"},
  {title:"7. Exceptions Process",content:"Exceptions to this policy must be submitted via the GRC platform with justification, risk assessment, compensating controls, and a defined expiration date. Exceptions for high-risk AI systems require board-level approval. All exceptions are logged and audited quarterly."},
];
const initialComments = [
  {author:"Dr. Sarah Mitchell",role:"AI Ethics Officer",date:"2026-02-10",text:"Section 3.8 on generative AI needs tighter language around data classification boundaries."},
  {author:"David Kim",role:"Security Lead",date:"2026-02-12",text:"Approved from security perspective. Recommend linking to OWASP LLM Top 10 in Section 5."},
  {author:"Maria Santos",role:"ML Engineering Lead",date:"2026-02-14",text:"Model inventory registration process is now automated. Section 3.1 compliance is simplified."},
];

const relatedPolicies = [
  {id:"POL-002",name:"AI Model Risk Classification Standard"},
  {id:"POL-004",name:"Third-Party AI Vendor Assessment"},
  {id:"POL-005",name:"AI Incident Response Protocol"},
  {id:"POL-006",name:"Algorithmic Bias Testing Standard"},
];

const linkedControls = [
  {id:"CTRL-AI-001",name:"Model Registration Gate",status:"Implemented"},
  {id:"CTRL-AI-007",name:"Bias Testing Automation",status:"Implemented"},
  {id:"CTRL-AI-012",name:"Drift Detection Alert",status:"Partial"},
  {id:"CTRL-AI-015",name:"HITL Override Logging",status:"Planned"},
];

const initialAuditLog = [
  {timestamp:"2026-02-14 09:32",actor:"Maria Santos",action:"Added comment",detail:"Model inventory registration automation note"},
  {timestamp:"2026-02-12 14:15",actor:"David Kim",action:"Added comment",detail:"Security approval with OWASP recommendation"},
  {timestamp:"2026-02-10 11:00",actor:"Dr. Sarah Mitchell",action:"Added comment",detail:"Generative AI language review"},
  {timestamp:"2026-02-01 08:00",actor:"System",action:"Policy created",detail:"Initial draft of POL-001 v3.2"},
];

export default function PolicyEditor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const policyId = searchParams.get("id") || "POL-001";
  const [editMode, setEditMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState("");
  const [auditLog, setAuditLog] = useState(initialAuditLog);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [sectionEdits, setSectionEdits] = useState<Record<number,string>>({});

  const statusLabel = STEPS[currentStep];
  const statusColor = currentStep === 0 ? "bg-yellow-500/20 text-yellow-400" : currentStep === 1 ? "bg-blue-500/20 text-blue-400" : currentStep === 2 ? "bg-emerald-500/20 text-emerald-400" : "bg-green-500/20 text-green-400";

  const handleSubmitForReview = () => {
    if (currentStep === 0) {
      setCurrentStep(1);
      const entry = {timestamp:new Date().toISOString().slice(0,16).replace("T"," "),actor:"Current User",action:"Submitted for review",detail:`Policy ${policyId} moved from Draft to In Review`};
      setAuditLog(prev => [entry, ...prev]);
    }
  };

  const handleApprove = () => {
    if (currentStep === 1) {
      setCurrentStep(2);
      const entry = {timestamp:new Date().toISOString().slice(0,16).replace("T"," "),actor:"Current User",action:"Approved",detail:`Policy ${policyId} approved`};
      setAuditLog(prev => [entry, ...prev]);
    } else if (currentStep === 2) {
      setCurrentStep(3);
      const entry = {timestamp:new Date().toISOString().slice(0,16).replace("T"," "),actor:"Current User",action:"Published",detail:`Policy ${policyId} published`};
      setAuditLog(prev => [entry, ...prev]);
    }
  };

  const handleReject = () => {
    if (currentStep === 1 && rejectReason.trim()) {
      setCurrentStep(0);
      const comment = {author:"Current User",role:"Reviewer",date:new Date().toISOString().slice(0,10),text:`[REJECTION] ${rejectReason}`};
      setComments(prev => [comment, ...prev]);
      const entry = {timestamp:new Date().toISOString().slice(0,16).replace("T"," "),actor:"Current User",action:"Rejected",detail:`Sent back to Draft: ${rejectReason}`};
      setAuditLog(prev => [entry, ...prev]);
      setRejectReason("");
      setShowRejectDialog(false);
    }
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      const comment = {author:"Current User",role:"Policy Reviewer",date:new Date().toISOString().slice(0,10),text:newComment};
      setComments(prev => [comment, ...prev]);
      const entry = {timestamp:new Date().toISOString().slice(0,16).replace("T"," "),actor:"Current User",action:"Added comment",detail:newComment.slice(0,80)};
      setAuditLog(prev => [entry, ...prev]);
      setNewComment("");
    }
  };

  const handleExport = () => {
    const blob = new Blob([sections.map(s => `${s.title}\n${s.content}`).join("\n\n")], {type:"text/plain"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${policyId}-policy.txt`; a.click();
    URL.revokeObjectURL(url);
    const entry = {timestamp:new Date().toISOString().slice(0,16).replace("T"," "),actor:"Current User",action:"Exported",detail:`Policy ${policyId} exported as text`};
    setAuditLog(prev => [entry, ...prev]);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-zinc-400 mb-6">
        <button onClick={() => navigate("/compliance/policies")} className="hover:text-white flex items-center gap-1"><ArrowLeft className="w-4 h-4"/> Back</button>
        <ChevronRight className="w-4 h-4"/>
        <span>Policy Manager</span>
        <ChevronRight className="w-4 h-4"/>
        <span className="text-white">{policyId}</span>
      </div>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">Responsible AI Use Policy</h1>
          <p className="text-zinc-400 text-sm mt-1">{policyId} &middot; Version 3.2 &middot; AI Governance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAuditLog(!showAuditLog)}><History className="w-4 h-4 mr-1"/>{showAuditLog ? "Hide" : "Show"} Audit Log</Button>
          <Button variant="outline" size="sm" onClick={handleExport}><FileDown className="w-4 h-4 mr-1"/>Export</Button>
          <Button variant="outline" size="sm" onClick={() => setEditMode(!editMode)}>{editMode ? <><Eye className="w-4 h-4 mr-1"/>View</> : <><Edit3 className="w-4 h-4 mr-1"/>Edit</>}</Button>
        </div>
      </div>

      {/* Audit Log Panel */}
      {showAuditLog && (
        <Card className="bg-zinc-900 border-zinc-800 p-4 mb-6">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><History className="w-4 h-4"/>Audit Trail</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {auditLog.map((entry,i) => (
              <div key={i} className="flex items-start gap-3 text-sm border-l-2 border-zinc-700 pl-3 py-1">
                <span className="text-zinc-500 whitespace-nowrap w-36 shrink-0">{entry.timestamp}</span>
                <span className="text-zinc-300 w-28 shrink-0">{entry.actor}</span>
                <Badge className="bg-zinc-800 text-zinc-300 shrink-0">{entry.action}</Badge>
                <span className="text-zinc-400 truncate">{entry.detail}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Reject Dialog */}
      {showRejectDialog && (
        <Card className="bg-zinc-900 border-red-800 p-4 mb-6">
          <h3 className="text-red-400 font-semibold mb-2 flex items-center gap-2"><XCircle className="w-4 h-4"/>Reject / Request Changes</h3>
          <Textarea placeholder="Reason for rejection (required)..." value={rejectReason} onChange={(e:React.ChangeEvent<HTMLTextAreaElement>) => setRejectReason(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white mb-2"/>
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={handleReject} disabled={!rejectReason.trim()}>Confirm Rejection</Button>
            <Button size="sm" variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content - Policy Sections */}
        <div className="col-span-2 space-y-4">
          {sections.map((s,i) => (
            <Card key={i} className="bg-zinc-900 border-zinc-800 p-4">
              <h3 className="text-white font-semibold mb-2">{s.title}</h3>
              {editMode ? (
                <Textarea value={sectionEdits[i] !== undefined ? sectionEdits[i] : s.content} onChange={(e:React.ChangeEvent<HTMLTextAreaElement>) => setSectionEdits(prev => ({...prev,[i]:e.target.value}))} className="bg-zinc-800 border-zinc-700 text-zinc-300 min-h-[120px]"/>
              ) : (
                <p className="text-zinc-400 text-sm whitespace-pre-line">{sectionEdits[i] !== undefined ? sectionEdits[i] : s.content}</p>
              )}
            </Card>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status & Metadata */}
          <Card className="bg-zinc-900 border-zinc-800 p-4">
            <h3 className="text-white font-semibold text-sm mb-3">Policy Metadata</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-zinc-400">Status</span><Badge className={statusColor}>{statusLabel}</Badge></div>
              <div className="flex justify-between"><span className="text-zinc-400">Category</span><span className="text-zinc-200">AI Governance</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Risk Level</span><Badge className="bg-red-500/20 text-red-400">Critical</Badge></div>
              <div className="flex justify-between"><span className="text-zinc-400">Owner</span><span className="text-zinc-200">Dr. Sarah Mitchell</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Framework</span><span className="text-zinc-200">EU AI Act, NIST AI RMF</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Last Updated</span><span className="text-zinc-200">2026-03-15</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Next Review</span><span className="text-zinc-200">2026-05-15</span></div>
            </div>
          </Card>

          {/* Review Status Stepper */}
          <Card className="bg-zinc-900 border-zinc-800 p-4">
            <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2"><Shield className="w-4 h-4"/>Review Status</h3>
            <div className="space-y-2">
              {STEPS.map((step,i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${i <= currentStep ? "bg-emerald-500 text-white" : "bg-zinc-700 text-zinc-400"}`}>{i < currentStep ? <CheckCircle className="w-3 h-3"/> : i+1}</div>
                  <span className={i <= currentStep ? "text-white" : "text-zinc-500"}>{step}</span>
                </div>
              ))}
            </div>
            <Separator className="my-3 bg-zinc-800"/>
            <div className="space-y-2">
              {currentStep === 0 && <Button size="sm" className="w-full" onClick={handleSubmitForReview}><Send className="w-3 h-3 mr-1"/>Submit for Review</Button>}
              {currentStep === 1 && (
                <>
                  <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleApprove}><CheckCircle className="w-3 h-3 mr-1"/>Approve</Button>
                  <Button size="sm" variant="outline" className="w-full border-red-700 text-red-400 hover:bg-red-900/30" onClick={() => setShowRejectDialog(true)}><XCircle className="w-3 h-3 mr-1"/>Reject / Request Changes</Button>
                </>
              )}
              {currentStep === 2 && <Button size="sm" className="w-full bg-green-600 hover:bg-green-700" onClick={handleApprove}><CheckCircle className="w-3 h-3 mr-1"/>Publish</Button>}
              {currentStep === 3 && <p className="text-emerald-400 text-sm text-center">Policy is published and active.</p>}
            </div>
          </Card>

          {/* Related Policies */}
          <Card className="bg-zinc-900 border-zinc-800 p-4">
            <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2"><Link2 className="w-4 h-4"/>Related Policies</h3>
            <div className="space-y-2">
              {relatedPolicies.map((p) => (
                <button key={p.id} onClick={() => navigate(`/policy-editor?id=${p.id}`)} className="w-full text-left flex items-center justify-between p-2 rounded hover:bg-zinc-800 transition-colors">
                  <div>
                    <span className="text-blue-400 text-xs">{p.id}</span>
                    <p className="text-zinc-300 text-sm">{p.name}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500"/>
                </button>
              ))}
            </div>
          </Card>

          {/* Linked Controls */}
          <Card className="bg-zinc-900 border-zinc-800 p-4">
            <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2"><Shield className="w-4 h-4"/>Linked Controls</h3>
            <div className="space-y-2">
              {linkedControls.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <div><span className="text-zinc-500">{c.id}</span><span className="text-zinc-300 ml-2">{c.name}</span></div>
                  <Badge className={c.status==="Implemented"?"bg-emerald-500/20 text-emerald-400":c.status==="Partial"?"bg-yellow-500/20 text-yellow-400":"bg-zinc-700 text-zinc-400"}>{c.status}</Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Review Comments */}
          <Card className="bg-zinc-900 border-zinc-800 p-4">
            <h3 className="text-white font-semibold text-sm mb-3"><MessageSquare className="w-4 h-4 inline mr-1"/>Review Comments ({comments.length})</h3>
            <div className="mb-3">
              <Textarea placeholder="Add a review comment..." value={newComment} onChange={(e:React.ChangeEvent<HTMLTextAreaElement>) => setNewComment(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white text-sm mb-2" rows={2}/>
              <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim()} className="w-full"><Send className="w-3 h-3 mr-1"/>Add Comment</Button>
            </div>
            <Separator className="mb-3 bg-zinc-800"/>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {comments.map((c,i) => (
                <div key={i} className="bg-zinc-800/30 rounded-lg p-3">
                  <div className="flex justify-between items-start"><div><p className="text-white text-xs font-medium">{c.author}</p><p className="text-zinc-500 text-xs">{c.role} &middot; {c.date}</p></div></div>
                  <p className="text-zinc-300 text-xs mt-2">{c.text}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
