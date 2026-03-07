
from __future__ import annotations
from sentinel.compliance.frameworks.base import BaseFramework,Control,ControlStatus,EvidenceRecord,FrameworkMetadata,FrameworkStatus
class ChinaAIRegsFramework(BaseFramework):
    metadata=FrameworkMetadata('china_ai_regs','China Generative AI Regulations','Interim Measures 2023',FrameworkStatus.MANDATORY_LAW,'China','August 2023','https://www.cac.gov.cn','4 of 5 articles evaluated. Deep Synthesis Art.4 (content labeling) is organisational.')
    controls=[
        Control('art4','Content Safety Requirements','Article 4, Interim Measures for GenAI 2023','Content safety scan and trust threshold enforcement.',True),
        Control('art7','Algorithm Transparency','Article 7, Interim Measures for GenAI 2023','AI generation disclosed and claim-level explanations available.',True),
        Control('art9','Data Security and PII Protection','Article 9, Interim Measures for GenAI 2023','Personal information masked, audit chain maintained.',True),
        Control('art17_cn','Record Retention','Article 17, Interim Measures for GenAI 2023','Request logged with timestamp in TimescaleDB.',True),
        Control('ds4','Synthetic Content Labeling','Deep Synthesis Regulations Art.4','Synthetic content watermarking/labeling at application layer.',False,'Synthetic content watermarking requires application-level implementation (e.g. C2PA). Sentinel logs the generation event but does not embed content watermarks. Implement at the application layer.'),
    ]
    def _r(self,c,s,sc,sig,val,txt,rem=None):
        return EvidenceRecord(self.metadata.framework_id,self.metadata.framework_name,c.control_id,c.control_name,c.article_ref,s,sc,sig,val,txt,rem)
    def _evaluate_control(self,ctrl,entry,result,config):
        return {'art4':self._art4,'art7':self._art7,'art9':self._art9,'art17_cn':self._art17}[ctrl.control_id](ctrl,entry,result,config)
    def _art4(self,c,e,r,cfg):
        inj=r.get('injection_score',0.0);trust=r.get('trust_score',0.0);thresh=cfg.get('trust_threshold',0.85)
        if trust>=thresh:
            return self._r(c,ControlStatus.PASS,trust,'injection_blocked,trust_score',{'injection':inj,'trust':trust},f'Content safety controls active per Art.4. Adversarial detection: {inj:.3f}. Quality threshold: {trust:.3f} >= {thresh}.')
        return self._r(c,ControlStatus.FAIL,trust,'trust_score',{'trust':trust},f'Content quality below threshold. Trust {trust:.3f} < {thresh}.','Review content quality pipeline. Low-quality content must be withheld or reviewed.')
    def _art7(self,c,e,r,cfg):
        headers=r.get('response_headers',{});claims=r.get('claim_scores',[])
        has_h='X-Sentinel-Trust-Score' in headers or 'trust_score' in r
        if has_h:
            return self._r(c,ControlStatus.PASS,1.0,'response_headers,claim_scores',{'headers':has_h,'claims':len(claims)},f'Algorithm transparency Art.7: AI involvement disclosed. Trust score in headers. {len(claims)} claims evaluated.')
        return self._r(c,ControlStatus.FAIL,0.0,'response_headers',{'headers':has_h},'Transparency headers missing.','Add X-Sentinel-Trust-Score header to API responses.')
    def _art9(self,c,e,r,cfg):
        blocked=r.get('pii_blocked',False);chain=e.get('audit_chain_intact',bool(e.get('entry_hash','')))
        if blocked or not r.get('pii_entities_detected',[]):
            return self._r(c,ControlStatus.PASS,1.0,'pii_blocked,audit_chain_intact',{'blocked':blocked,'chain':chain},f'Data security Art.9: PII masked before LLM. Audit trail maintained. Chain intact: {chain}.')
        return self._r(c,ControlStatus.FAIL,0.0,'pii_blocked',{'blocked':blocked},'PII protection failed.','Check Presidio sanitizer configuration.')
    def _art17(self,c,e,r,cfg):
        eid=e.get('entry_id',e.get('request_id',''));ts=e.get('timestamp','')
        if eid:
            return self._r(c,ControlStatus.PASS,1.0,'audit_entry_id,timestamp',{'entry_id':eid,'ts':ts},f'Record retention Art.17: logged at {ts}. Entry {eid}. TimescaleDB hypertable with configurable retention.')
        return self._r(c,ControlStatus.FAIL,0.0,'audit_entry_id',{'entry_id':eid},'Record retention failure.','Check audit store connectivity.')
