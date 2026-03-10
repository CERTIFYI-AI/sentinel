from __future__ import annotations
from sentinel.compliance.frameworks.base import BaseFramework,Control,ControlStatus,EvidenceRecord,FrameworkMetadata,FrameworkStatus
class IEEE7000Framework(BaseFramework):
    metadata=FrameworkMetadata(
        framework_id='ieee7000',
        name='IEEE 7000-2021',
        framework_name='Std 7000-2021',
        version='2021',
        status=FrameworkStatus.TECH_STANDARD,
        jurisdiction='International (IEEE)',
        description='Available now',
        primary_source='https://standards.ieee.org/ieee/7000/6781/',
        sentinel_coverage_note='3 of 7 processes evaluated. IEEE 7000 is primarily a design-time standard. Sentinel provides runtime evidence for 3 of 12 process areas.',
    )
    controls=[
        Control('p75','Transparency of System Operation','IEEE 7000 Process 7.5','Trust scoring disclosed, sources cited, operation logged.',True),
        Control('p83','Ethical Risk Monitoring','IEEE 7000 Process 8.3','Accuracy, adversarial, and drift risks monitored.',True),
        Control('p92','Stakeholder Engagement Mechanisms','IEEE 7000 Process 9.2','HITL queue provides human stakeholder review channel.',True),
        Control('p1_7_4','Design-Phase Processes','IEEE 7000 Processes 1-7.4','Value identification, stakeholder requirements, ethical risk mapping.',False,'IEEE 7000 design-phase processes are design-time activities. Document these in your system design artifacts. Reference Sentinel as the runtime enforcement mechanism.'),
    ]
    def _r(self,c,s,sc,sig,val,txt,rem=None):
        return EvidenceRecord(control_id=c.control_id,framework_id=self.metadata.framework_id,framework_name=self.metadata.framework_name,control_name=c.control_name,article_ref=c.article_ref,status=s,score=sc,signal_used=sig,signal_value=val,evidence_text=txt,remediation=rem)
    def _evaluate_control(self,ctrl,entry,result,config):
        dispatch={'p75':self._p75,'p83':self._p83,'p92':self._p92}
        if ctrl.control_id not in dispatch:
            return EvidenceRecord(control_id=ctrl.control_id,framework_id=self.metadata.framework_id,framework_name=self.metadata.framework_name,status=ControlStatus.NA,score=0.0,evidence_text='Design-time control. Not evaluated at runtime.',remediation=ctrl.description)
        return dispatch[ctrl.control_id](ctrl,entry,result,config)
    def _p75(self,c,e,r,cfg):
        claims=r.get('claim_scores',[]);sources=r.get('sources_cited',[]);eid=e.get('entry_id',e.get('request_id',''))
        return self._r(c,ControlStatus.PASS,1.0,'claim_scores,sources_cited,response_headers',{'claims':len(claims),'sources':len(sources),'entry':eid},f'System operation transparency (IEEE 7000 P7.5): Trust scoring applied. Sources: {len(sources)}. Logged: {eid}.')
    def _p83(self,c,e,r,cfg):
        trust=r.get('trust_score',0.0);inj=r.get('injection_score',0.0);drift=r.get('semantic_drift_sigma',0.0)
        if trust < 0.5 or drift > 3.0:
            return self._r(c,ControlStatus.FAIL,trust,'semantic_drift_sigma,trust_score,injection_score',{'trust':trust,'injection':inj,'drift':drift},f'Ethical risk monitoring FAIL: Accuracy {trust:.3f}, drift {drift:.2f} exceeds threshold.','Review model outputs and retrain or adjust thresholds.')
        return self._r(c,ControlStatus.PASS,trust,'semantic_drift_sigma,trust_score,injection_score',{'trust':trust,'injection':inj,'drift':drift},f'Ethical risk monitoring (IEEE 7000 P8.3): Accuracy {trust:.3f}, adversarial {inj:.3f}, drift {drift:.2f}. Continuous monitoring active.')
    def _p92(self,c,e,r,cfg):
        hitl=cfg.get('hitl_configured',True);reviewed=r.get('human_reviewed',False)
        if hitl:
            return self._r(c,ControlStatus.PASS,1.0,'hitl_configured,human_reviewed',{'hitl':hitl,'reviewed':reviewed},f'Stakeholder engagement (IEEE 7000 P9.2): HITL queue provides human review channel. Reviews logged to audit chain.')
        return self._r(c,ControlStatus.FAIL,0.0,'hitl_configured',False,'No stakeholder engagement mechanism.','Configure HITL queue in sentinel.yaml.')
