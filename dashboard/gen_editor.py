import os

def w(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        f.write(content)
    print(f'Written: {path} ({len(content)} bytes)')


editor_tsx = r'''import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { ChevronRight, ArrowLeft, Edit3, Eye, Send, CheckCircle, FileDown, Clock, MessageSquare, Shield, Link2, XCircle, AlertTriangle, History, User } from "lucide-react";
import { getAvailableActions, type PolicyLifecycleState, type PolicyTransition } from "../lib/policyStateMachine";
import { usePolicyStore } from "../stores/policyStore";

const POLICIES: Record<string, {name:string;category:string;version:string;owner:string;framework:string;status:PolicyLifecycleState;riskLevel:string;approver:string;description:string;scope:string;sections:{title:string;content:string}[];relatedPolicies:string[];reviewComments:{author:string;role:string;text:string;date:string}[]}> = {
  "POL-001": { name:"Acceptable AI Use Policy", category:"AI Usage", version:"v3.2", owner:"Emma Wilson", framework:"EU AI Act", status:"Published", riskLevel:"High", approver:"Dr. Sarah Mitchell", description:"Guidelines for responsible AI use.", scope:"All departments using AI/ML systems",
    sections:[{title:"1. Purpose & Scope",content:"This policy establishes guidelines for the responsible development, deployment, and use of artificial intelligence and machine learning systems across the organization, ensuring compliance with the EU AI Act and internal governance standards."},{title:"2. Definitions",content:"AI System: Any software that uses machine learning, deep learning, or rule-based approaches to make decisions or generate outputs. High-Risk AI: Systems that impact health, safety, fundamental rights, or critical infrastructure."},{title:"3. Policy Statements",content:"3.1 All AI systems must be registered in the Model Inventory before deployment.\n3.2 High-risk AI systems require a mandatory impact assessment.\n3.3 Automated decisions affecting individuals must include human oversight.\n3.4 AI training data must be validated for bias and quality."},{title:"4. Roles & Responsibilities",content:"AI Governance Board: Oversees policy compliance and risk.\nModel Owners: Ensure documentation and monitoring.\nData Scientists: Follow bias testing protocols.\nCISO: Ensures security of AI systems."},{title:"5. Compliance Requirements",content:"EU AI Act Articles 9, 13, 14, 52.\nNIST AI RMF Core Functions.\nGDPR Articles 22, 35 for automated decision-making.\nISO 27001 Annex A controls for information security."},{title:"6. Review & Approval",content:"This policy is reviewed quarterly by the AI Governance Board. Major revisions require approval from the Chief Risk Officer and CISO."},{title:"7. Exceptions Process",content:"Exceptions must be submitted via the GRC portal with business justification and risk mitigation plan. All exceptions expire after 90 days."}],
    relatedPolicies:["POL-002","POL-005","POL-007","POL-010"],
    reviewComments:[{author:"Dr. Sarah Mitchell",role:"Chief Risk Officer",text:"Approved with minor revisions to section 3.4 regarding training data governance.",date:"2026-02-10"},{author:"David Kim",role:"CISO",text:"Security controls alignment verified. Recommend adding LLM-specific guidelines.",date:"2026-02-08"},{author:"Maria Santos",role:"DPO",text:"GDPR automated decision-making requirements adequately addressed.",date:"2026-02-05"}]
  },
  "POL-002": { name:"AI Model Risk Classification Standard", category:"AI Usage", version:"v2.1", owner:"James Chen", framework:"NIST AI RMF", status:"Published", riskLevel:"Critical", approver:"Chief Risk Officer", description:"Risk classification framework for AI models.", scope:"ML Engineering, Data Science",
    sections:[{title:"1. Purpose",content:"Establishes a standardized framework for classifying AI models by risk tier to ensure proportionate governance controls."},{title:"2. Risk Tiers",content:"Tier 1 (Critical): Autonomous decisions on human safety or rights.\nTier 2 (High): Financial or legal impact decisions.\nTier 3 (Medium): Process optimization with human oversight.\nTier 4 (Low): Internal analytics and reporting."},{title:"3. Assessment Criteria",content:"Impact scope, data sensitivity, autonomy level, reversibility of decisions, regulatory requirements."}],
    relatedPolicies:["POL-001","POL-004"], reviewComments:[{author:"James Chen",role:"AI Lead",text:"Risk tiers aligned with NIST AI RMF categories.",date:"2026-01-15"}]
  },
};
const DEFAULT_POLICY = { name:"Policy", category:"General", version:"v1.0", owner:"Admin", framework:"ISO 27001", status:"Draft" as PolicyLifecycleState, riskLevel:"Medium", approver:"Reviewer", description:"Policy description.", scope:"Organization-wide", sections:[{title:"1. Purpose",content:"This policy establishes guidelines for the topic covered."},{title:"2. Scope",content:"Applies to all relevant departments and personnel."},{title:"3. Requirements",content:"Detailed requirements and procedures."}], relatedPolicies:[], reviewComments:[] };

const STATUS_COLORS: Record<string,string> = { Published:"bg-emerald-400/10 text-emerald-400 border-emerald-400/30", Draft:"bg-slate-400/10 text-slate-400 border-slate-400/30", "In Review":"bg-blue-400/10 text-blue-400 border-blue-400/30", "Pending Review":"bg-amber-400/10 text-amber-400 border-amber-400/30", Expired:"bg-red-400/10 text-red-400 border-red-400/30", Archived:"bg-gray-500/10 text-gray-500 border-gray-500/30", "Changes Requested":"bg-orange-400/10 text-orange-400 border-orange-400/30", Approved:"bg-teal-400/10 text-teal-400 border-teal-400/30", "Under Review":"bg-blue-400/10 text-blue-400 border-blue-400/30" };

const STEPS = ["Draft","Pending Review","Under Review","Approved","Published"];

export default function PolicyEditor() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const store = usePolicyStore();
  const policyId = params.get("id") || "POL-001";
  const pData = POLICIES[policyId] || { ...DEFAULT_POLICY, name: `Policy ${policyId}` };
  const currentStatus = store.statusOverrides[policyId] || pData.status;
  const [editing, setEditing] = useState(false);
  const [sections, setSections] = useState(pData.sections);
  const [toast, setToast] = useState<{msg:string;type:string}|null>(null);
  const [showTransitionDialog, setShowTransitionDialog] = useState(false);
  const [activeTransition, setActiveTransition] = useState<PolicyTransition|null>(null);
  const [transitionComment, setTransitionComment] = useState("");
  const [newComment, setNewComment] = useState("");

  const showToast = (msg:string, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };
  const availableActions = getAvailableActions(currentStatus as PolicyLifecycleState);
  const stepIdx = STEPS.indexOf(currentStatus) >= 0 ? STEPS.indexOf(currentStatus) : 0;
  const storeComments = store.reviewComments[policyId] || [];
  const auditTrail = store.auditTrail[policyId] || [];

  const executeTransition = (t: PolicyTransition, comment: string) => {
    const result = store.transitionPolicy(policyId, t.action, "Bhaskar Admin", comment || undefined);
    if (result.success) { showToast(`Policy transitioned to ${t.to}`); } else { showToast(result.error||"Transition failed","error"); }
    setShowTransitionDialog(false); setTransitionComment(""); setActiveTransition(null);
  };

  const addComment = () => {
    if (!newComment.trim()) return;
    store.addReviewComment(policyId, { author:"Bhaskar Admin", role:"CISO", text:newComment, resolved:false });
    setNewComment("");
    showToast("Comment added");
  };

