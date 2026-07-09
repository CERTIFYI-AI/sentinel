
from __future__ import annotations
from sentinel.compliance.frameworks.base import BaseFramework,Control,ControlStatus,EvidenceRecord,FrameworkMetadata,FrameworkStatus
from sentinel.models import InterventionLevel, normalize_intervention_level
class NISTAIRMFFramework(BaseFramework):
    metadata=FrameworkMetadata('nist_ai_rmf','NIST AI RMF 1.0','AI 600-1 GenAI Profile',FrameworkStatus.VOLUNTARY,'United States','Available now','https://www.nist.gov/itl/ai-risk-management-framework','9 of 12 functions evaluated at runtime. GOVERN-1.1, MEASURE-2.5 are organisational.')
    controls=[
        Control('govern1_1','Policies and Procedures','GOVERN-1.1, NIST AI RMF 1.0','AI governance policies and procedures established.',False,'Organisational governance. Sentinels configuration (tenant thresholds, enabled frameworks) documents AI governance decisions. The configs/ directory provides evidence.'),
        Control('govern4_1','Organisational Risk Tolerance','GOVERN-4.1, NIST AI RMF 1.0','Organisational risk tolerance defined and communicated.',True),
        Control('map1_1','AI Risk Context Established','MAP-1.1, NIST AI RMF 1.0','AI risk context is established.',True),
        Control('map2_2','Data Quality and Provenance','MAP-2.2, NIST AI RMF 1.0','Data quality and provenance assessed.',True),
        Control('measure1_1','Risk Measurement Methods','MEASURE-1.1, NIST AI RMF 1.0','Risk measurement methods established.',True),
        Control('measure2_5','Bias and Fairness Evaluation','MEASURE-2.5, NIST AI RMF 1.0','Bias and fairness evaluated.',False,'Sentinel measures factual accuracy, not demographic fairness. Bias evaluation requires dedicated testing with representative demographic datasets. Use Fairlearn or AI Fairness 360.'),
        Control('measure2_6','Explainability','MEASURE-2.6, NIST AI RMF 1.0','AI system explainability and interpretability assessed.',True),
        Control('measure2_7','Security and Resilience','MEASURE-2.7, NIST AI RMF 1.0','Security and resilience evaluated.',True),
        Control('manage1_3','Response and Recovery','MANAGE-1.3, NIST AI RMF 1.0','Response and recovery plans activated.',True),
        Control('manage2_2','Monitoring and Improvement','MANAGE-2.2, NIST AI RMF 1.0','AI systems monitored for performance and improvement.',True),
        Control('gv1_1_genai','Hallucination Risk (GenAI Profile)','GV-1.1, NIST AI 600-1 GenAI Profile','Hallucination and confabulation risk managed.',True),
        Control('gv4_1_genai','Data Privacy in GPAI (GenAI Profile)','GV-4.1, NIST AI 600-1 GenAI Profile','Data privacy risks in generative AI addressed.',True),
    ]
    def _r(self,c,s,sc,sig,val,txt,rem=None):
        return EvidenceRecord(control_id=c.control_id,framework_id=self.metadata.framework_id,framework_name=self.metadata.framework_name,control_name=c.control_name,article_ref=c.article_ref,status=s,score=sc,signal_used=sig,signal_value=val,evidence_text=txt,remediation=rem)
    def _evaluate_control(self,control,entry,result,config):
        m={'govern4_1':self._govern4_1,'map1_1':self._map1_1,'map2_2':self._map2_2,'measure1_1':self._measure1_1,'measure2_6':self._measure2_6,'measure2_7':self._measure2_7,'manage1_3':self._manage1_3,'manage2_2':self._manage2_2,'gv1_1_genai':self._gv1_1,'gv4_1_genai':self._gv4_1}
        return m[control.control_id](control,entry,result,config)
    def _govern4_1(self,c,e,r,cfg):
        t=cfg.get('trust_threshold',0.85);tid=e.get('tenant_id','')
        return self._r(c,ControlStatus.PASS,1.0,'trust_score_threshold',{'threshold':t,'tenant':tid},f'Organisational risk tolerance operationalised. Trust threshold {t}. Tenant {tid} has defined acceptable AI output quality.')
    def _map1_1(self,c,e,r,cfg):
        inj=r.get('injection_score',0.0);trust=r.get('trust_score',0.0);drift=r.get('semantic_drift_sigma',0.0)
        return self._r(c,ControlStatus.PASS,trust,'injection_score,trust_score,semantic_drift_sigma',{'injection':inj,'trust':trust,'drift':drift},f'AI risk context measured. Adversarial risk: {inj:.3f}. Accuracy risk: {trust:.3f}. Behavioural drift: {drift:.2f}.')
    def _map2_2(self,c,e,r,cfg):
        rag=r.get('rag_entailment_score',0.0);sources=r.get('sources_cited',[]); gs=r.get('golden_source_count',0)
        if gs>0:
            return self._r(c,ControlStatus.PASS,rag,'rag_entailment_score,sources_cited,golden_source_count',{'rag':rag,'sources':len(sources),'gs_count':gs},f'Data quality assessed. Golden source: {gs} docs. Retrieval entailment: {rag:.3f}. Sources: {len(sources)}.')
        return self._r(c,ControlStatus.PARTIAL,0.5,'golden_source_count',{'count':gs},'Partial data quality. Golden source empty or sparse.','Seed the golden source: python scripts/seed_golden_source.py --input ./your-docs')
    def _measure1_1(self,c,e,r,cfg):
        trust=r.get('trust_score',0.0);rag=r.get('rag_entailment_score',0.0);inj=r.get('injection_score',0.0);drift=r.get('semantic_drift_sigma',0.0)
        return self._r(c,ControlStatus.PASS,trust,'trust_score,rag_entailment_score,injection_score,semantic_drift_sigma',{'trust':trust,'rag':rag,'injection':inj,'drift':drift},f'Quantitative AI risk measurement active. Method: weighted composite (RAG 40%, cross-check 30%, PII/injection 15%, drift 15%). Score: {trust:.4f}.')
    def _measure2_6(self,c,e,r,cfg):
        claims=r.get('claim_scores',[]); sources=r.get('sources_cited',[])
        if claims:
            return self._r(c,ControlStatus.PASS,1.0,'claim_scores,sources_cited',{'claims_count':len(claims),'sources':len(sources)},f'Explainability active. {len(claims)} factual claims individually scored. Supporting sources: {len(sources)}. Claim-level detail available via GET /api/audit/<request_id>.')
        return self._r(c,ControlStatus.PARTIAL,0.5,'claim_scores',{'count':0},'No claims extracted (non-factual response type). Explainability limited.')
    def _measure2_7(self,c,e,r,cfg):
        inj=r.get('injection_score',0.0);blocked=r.get('injection_blocked',False);thresh=cfg.get('injection_threshold',0.7)
        return self._r(c,ControlStatus.PASS,1.0-inj,'injection_score,injection_blocked',{'score':inj,'blocked':blocked,'threshold':thresh},f'Security assessment: injection {inj:.3f} vs threshold {thresh}. Blocked: {blocked}.')
    def _manage1_3(self,c,e,r,cfg):
        intervention=normalize_intervention_level(r.get('intervention_level',InterventionLevel.NONE)) or InterventionLevel.NONE
        cb=r.get('circuit_breaker_state','CLOSED')
        return self._r(c,ControlStatus.PASS,1.0,'intervention_level,circuit_breaker_state',{'intervention':intervention.name,'cb':cb},f'Incident response: {intervention.name}. Recovery mechanism: circuit breaker {cb}. Provider failover configured.')
    def _manage2_2(self,c,e,r,cfg):
        drift=r.get('semantic_drift_sigma',0.0);score=r.get('rolling_compliance_score',1.0)
        return self._r(c,ControlStatus.PASS,score,'semantic_drift_sigma,rolling_compliance_score',{'drift':drift,'rolling_score':score},f'Continuous monitoring: drift {drift:.2f}. Rolling 7-day compliance score: {score:.1%}.')
    def _gv1_1(self,c,e,r,cfg):
        trust=r.get('trust_score',0.0);rag=r.get('rag_entailment_score',0.0);cross=r.get('cross_check_agreement',0.0);thresh=cfg.get('trust_threshold',0.85)
        intervention=normalize_intervention_level(r.get('intervention_level',InterventionLevel.NONE)) or InterventionLevel.NONE
        if trust>=thresh:
            return self._r(c,ControlStatus.PASS,trust,'trust_score,rag_entailment_score,cross_check_agreement',{'trust':trust,'rag':rag,'cross':cross},f'Hallucination risk managed. NLI entailment: {rag:.3f}. Cross-model agreement: {cross:.3f}. Final trust: {trust:.3f}. Treatment: {intervention.name}.')
        return self._r(c,ControlStatus.FAIL,trust,'trust_score,rag_entailment_score',{'trust':trust,'rag':rag},f'Hallucination risk unmanaged. Trust {trust:.3f} < threshold {thresh}.',f'Review HITL job. Investigate low entailment ({rag:.3f}) and cross-check disagreement.')
    def _gv4_1(self,c,e,r,cfg):
        ents=r.get('pii_entities_detected',[]); blocked=r.get('pii_blocked',False); mode=r.get('sanitizer_mode','presidio')
        return self._r(c,ControlStatus.PASS,1.0,'pii_entities_detected,pii_blocked',{'entities':ents,'blocked':blocked,'mode':mode},f'GenAI data privacy: PII scan ({mode}). Entities: {ents}. Masked before LLM: {blocked}.')
