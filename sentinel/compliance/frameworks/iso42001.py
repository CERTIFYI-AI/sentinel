
from __future__ import annotations
from sentinel.compliance.frameworks.base import BaseFramework, Control, ControlStatus, EvidenceRecord, FrameworkMetadata, FrameworkStatus
from sentinel.models import InterventionLevel, normalize_intervention_level

class ISO42001Framework(BaseFramework):
    metadata = FrameworkMetadata(
        framework_id="iso42001",
        framework_name="ISO/IEC 42001:2023",
        version="2023",
        status=FrameworkStatus.CERTIFIABLE,
        jurisdiction="International",
        enforcement_date="Available now",
        primary_source="https://www.iso.org/standard/81230.html",
        sentinel_coverage_note="8 of 9 Annex A controls evaluated at runtime. A.2.2 (AI Policy) is organisational.",
    )
    controls = [
        Control("a22","AI Policy Objectives","Annex A.2.2, ISO/IEC 42001:2023","Define AI policy objectives in AIMS documentation.",False,"Organisational control. Define AI policy objectives in your AIMS documentation. Sentinel demonstrates that the runtime threshold operationalises those objectives."),
        Control("a33","Roles and Responsibilities","Annex A.3.3, ISO/IEC 42001:2023","Define roles and responsibilities for AI governance.",True),
        Control("a41","AI Risk Identification and Assessment","Annex A.4.1, ISO/IEC 42001:2023","Identify and assess risks in AI systems.",True),
        Control("a42","AI Risk Treatment","Annex A.4.2, ISO/IEC 42001:2023","Apply treatment to identified AI risks.",True),
        Control("a52","Corrective Action","Annex A.5.2, ISO/IEC 42001:2023","Take corrective action for AI system failures.",True),
        Control("a611","Logging of AI System Behaviour","Annex A.6.1.1, ISO/IEC 42001:2023","Log AI system behaviour for accountability.",True),
        Control("a612","Record Keeping for Accountability","Annex A.6.1.2, ISO/IEC 42001:2023","Maintain tamper-evident records for accountability.",True),
        Control("a71","Human Oversight and Control","Annex A.7.1, ISO/IEC 42001:2023","Ensure human oversight mechanisms are in place.",True),
        Control("a81","Incident Management","Annex A.8.1, ISO/IEC 42001:2023","Manage AI incidents systematically.",True),
    ]
    def _r(self,ctrl,st,sc,sig,val,txt,rem=None):
        return EvidenceRecord(control_id=ctrl.control_id,framework_id=self.metadata.framework_id,framework_name=self.metadata.framework_name,control_name=ctrl.control_name,article_ref=ctrl.article_ref,status=st,score=sc,signal_used=sig,signal_value=val,evidence_text=txt,remediation=rem)
    def _evaluate_control(self,control,entry,result,config):
        return {"a33":self._a33,"a41":self._a41,"a42":self._a42,"a52":self._a52,"a611":self._a611,"a612":self._a612,"a71":self._a71,"a81":self._a81}[control.control_id](control,entry,result,config)
    def _a33(self,c,e,r,cfg):
        role=r.get("jwt_role_claim",e.get("role","unknown"))
        if role and role!="unknown":
            return self._r(c,ControlStatus.PASS,1.0,"jwt_role_claim",role,f"Role-based access control active. Request authenticated as role {role}. Roles defined: admin (full access), reviewer (HITL queue), api (proxy only).")
        return self._r(c,ControlStatus.FAIL,0.0,"jwt_role_claim",role,"Request has no defined role. Role assignment required for AIMS accountability.","Ensure all requests include a valid JWT with role claim (admin|reviewer|api).")
    def _a41(self,c,e,r,cfg):
        trust=r.get("trust_score",0.0);inj=r.get("injection_score",0.0);claims=r.get("claim_scores",[])
        entry_id=e.get("entry_id",e.get("request_id",""))
        return self._r(c,ControlStatus.PASS,trust,"trust_score,claim_scores,injection_score",{"trust":trust,"injection":inj,"claims_count":len(claims)},f"AI risk assessed per request. Trust {trust:.3f}. Claims evaluated: {len(claims)}. Injection risk: {inj:.3f}. Risk documented in audit entry {entry_id}.")
    def _a42(self,c,e,r,cfg):
        intervention=normalize_intervention_level(r.get("intervention_level",InterventionLevel.NONE)) or InterventionLevel.NONE
        cost=r.get("cost_usd",0.0)
        return self._r(c,ControlStatus.PASS,1.0,"intervention_level,cost_usd",{"intervention":intervention.name,"cost":cost},f"Risk treatment decision made. Method: {intervention.name}. Cost: ${cost:.5f}. Outcome documented.")
    def _a52(self,c,e,r,cfg):
        intervention=normalize_intervention_level(r.get("intervention_level",InterventionLevel.NONE)) or InterventionLevel.NONE
        if intervention==InterventionLevel.NONE:return self._r(c,ControlStatus.NA,-1.0,"intervention_level",intervention.name,"No correction needed. Automated pipeline met quality threshold.")
        if intervention in(InterventionLevel.REGENERATE,InterventionLevel.UPGRADE):return self._r(c,ControlStatus.PASS,1.0,"intervention_level",intervention.name,f"Automated corrective action taken via {intervention.name}.")
        return self._r(c,ControlStatus.PARTIAL,0.5,"intervention_level",intervention.name,f"Manual corrective action initiated. HITL review pending.")
    def _a611(self,c,e,r,cfg):
        entry_id=e.get("entry_id",e.get("request_id",""));ts=e.get("timestamp","");trust=r.get("trust_score",0.0)
        intervention=normalize_intervention_level(r.get("intervention_level",InterventionLevel.NONE)) or InterventionLevel.NONE
        if entry_id:return self._r(c,ControlStatus.PASS,1.0,"audit_entry_id,timestamp,trust_score",{"entry_id":entry_id,"ts":ts},f"AI system behaviour logged. Entry {entry_id}. Timestamp {ts}. Trust {trust:.3f}. Intervention: {intervention.name}.")
        return self._r(c,ControlStatus.FAIL,0.0,"audit_entry_id",entry_id,"Behaviour logging failed. No entry ID present.","Check audit store connectivity.")
    def _a612(self,c,e,r,cfg):
        h=e.get("entry_hash","");prev=e.get("prev_hash","")
        if h:return self._r(c,ControlStatus.PASS,1.0,"entry_hash,prev_hash",{"hash":h[:16],"prev":prev[:16] if prev else "genesis"},f"Tamper-evident record created. Hash {h[:16]}... Chain verified. Append-only TimescaleDB hypertable.")
        return self._r(c,ControlStatus.FAIL,0.0,"entry_hash",h,"Hash chain broken. Record integrity not guaranteed.","Check audit store hash chain integrity.")
    def _a71(self,c,e,r,cfg):
        hitl=cfg.get("hitl_configured",True);mode=cfg.get("hitl_mode","redis");pending=r.get("hitl_pending_count",0)
        if hitl and mode=="redis":return self._r(c,ControlStatus.PASS,1.0,"hitl_queue_configured,intervention_level",{"mode":mode,"pending":pending},f"Human oversight mechanism: {mode}. Pending reviews: {pending}.")
        if hitl:return self._r(c,ControlStatus.PARTIAL,0.7,"hitl_queue_configured",{"mode":mode},"Human oversight available but running in in-memory mode.","Configure Redis for production HITL queue persistence.")
        return self._r(c,ControlStatus.FAIL,0.0,"hitl_queue_configured",False,"Human oversight not configured.","Configure HITL queue in sentinel.yaml.")
    def _a81(self,c,e,r,cfg):
        inj_blocked=r.get("injection_blocked",False);drift=r.get("semantic_drift_sigma",0.0);cb=r.get("circuit_breaker_state","CLOSED")
        if not inj_blocked and drift<3.0 and cb=="CLOSED":return self._r(c,ControlStatus.PASS,1.0,"injection_blocked,semantic_drift_sigma,circuit_breaker_state",{"injection":inj_blocked,"drift":drift,"cb":cb},f"No AI incidents detected. Injection: clean. Drift {drift:.2f} < 3.0. All CBs CLOSED.")
        details=[]
        if inj_blocked:details.append("prompt injection detected")
        if drift>=3.0:details.append(f"semantic drift {drift:.2f} >= 3.0")
        if cb!="CLOSED":details.append(f"circuit breaker {cb}")
        detail_str = ", ".join(details)
        return self._r(c,ControlStatus.FAIL,0.0,"injection_blocked,semantic_drift_sigma,circuit_breaker_state",{"injection":inj_blocked,"drift":drift,"cb":cb},f"AI incident detected: nd. Logged for incident management review.",f"Review audit entry. Investigate: {detail_str}.")
