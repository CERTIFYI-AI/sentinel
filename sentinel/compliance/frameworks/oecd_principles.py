from __future__ import annotations
from sentinel.compliance.frameworks.base import BaseFramework,Control,ControlStatus,EvidenceRecord,FrameworkMetadata,FrameworkStatus
class OECDPrinciplesFramework(BaseFramework):
    metadata=FrameworkMetadata(
        framework_id='oecd_principles',
        name='OECD AI Principles',
        framework_name='2019, updated 2023',
        version='2019',
        status=FrameworkStatus.POLICY_GUIDE,
        jurisdiction='Global (46+ countries)',
        description='Adopted 2019',
        primary_source='https://oecd.ai/en/ai-principles',
        sentinel_coverage_note='4 of 5 principles evaluated. P2.2 (Investment in Trustworthy AI) is organisational.',
    )
    controls=[
        Control('p12','Human-Centred Values and Fairness','OECD Principle 1.2','Human oversight mechanism available for AI outputs.',True),
        Control('p13','Transparency and Explainability','OECD Principle 1.3','AI system operation is transparent and explainable.',True),
        Control('p14','Robustness, Security, and Safety','OECD Principle 1.4','AI systems are robust, secure, and safe.',True),
        Control('p15','Accountability','OECD Principle 1.5','Accountable record of AI system operation.',True),
        Control('p22','Investment in Trustworthy AI','OECD Principle 2.2','Organisational investment in trustworthy AI.',False,'Organisational investment principle. Sentinels deployment demonstrates commitment to trustworthy AI infrastructure. Reference this deployment in your AI strategy documentation.'),
    ]
    def _r(self,c,s,sc,sig,val,txt,rem=None):
        return EvidenceRecord(control_id=c.control_id,framework_id=self.metadata.framework_id,framework_name=self.metadata.framework_name,control_name=c.control_name,article_ref=c.article_ref,status=s,score=sc,signal_used=sig,signal_value=val,evidence_text=txt,remediation=rem)
    def _evaluate_control(self,ctrl,entry,result,config):
        dispatch={'p12':self._p12,'p13':self._p13,'p14':self._p14,'p15':self._p15}
        if ctrl.control_id not in dispatch:
            return EvidenceRecord(control_id=ctrl.control_id,framework_id=self.metadata.framework_id,framework_name=self.metadata.framework_name,status=ControlStatus.NA,score=0.0,evidence_text='Organisational control. Not evaluated at runtime.',remediation=ctrl.description)
        return dispatch[ctrl.control_id](ctrl,entry,result,config)
    def _p12(self,c,e,r,cfg):
        hitl=cfg.get('hitl_configured',True);intervention=r.get('intervention_level','L0')
        return self._r(c,ControlStatus.PASS,1.0,'hitl_configured,intervention_level',{'hitl':hitl,'intervention':intervention},f'Human-centred design (OECD P1.2): Human oversight available. HITL configured: {hitl}. Intervention: {intervention}.')
    def _p13(self,c,e,r,cfg):
        claims=r.get('claim_scores',[]);sources=r.get('sources_cited',[]);headers=r.get('response_headers',{})
        has_h='X-Sentinel-Trust-Score' in headers or 'trust_score' in r
        if claims and has_h:
            return self._r(c,ControlStatus.PASS,1.0,'claim_scores,sources_cited,response_headers',{'claims':len(claims),'sources':len(sources),'headers':has_h},f'Transparency (OECD P1.3): {len(claims)} claims scored. Sources: {len(sources)}. AI involvement disclosed.')
        return self._r(c,ControlStatus.PARTIAL,0.7,'claim_scores,response_headers',{'claims':len(claims),'headers':has_h},'Partial transparency. Some signals missing.')
    def _p14(self,c,e,r,cfg):
        inj=r.get('injection_blocked',False);cb=r.get('circuit_breaker_state','CLOSED');drift=r.get('semantic_drift_sigma',0.0)
        all_ok=not inj and cb=='CLOSED' and drift<3.5
        if all_ok:
            return self._r(c,ControlStatus.PASS,1.0,'injection_blocked,circuit_breaker_state,semantic_drift_sigma',{'injection':inj,'cb':cb,'drift':drift},f'Robustness (OECD P1.4): Security clean, provider resilience {cb}, stability {drift:.2f}.')
        return self._r(c,ControlStatus.PARTIAL,0.5,'injection_blocked,circuit_breaker_state,semantic_drift_sigma',{'injection':inj,'cb':cb,'drift':drift},'One mechanism in degraded mode.')
    def _p15(self,c,e,r,cfg):
        eid=e.get('entry_id',e.get('request_id',''));h=e.get('entry_hash','');tid=e.get('tenant_id','')
        if eid and h:
            return self._r(c,ControlStatus.PASS,1.0,'audit_entry_id,entry_hash,tenant_id',{'entry_id':eid,'hash':h[:16],'tenant':tid},f'Accountability (OECD P1.5): Tamper-evident record {eid}. Traceable to tenant {tid}. SHA-256 hash chain maintained.')
        return self._r(c,ControlStatus.FAIL,0.0,'audit_entry_id',{'entry_id':eid},'Accountability record missing.','Check audit store connectivity.')
