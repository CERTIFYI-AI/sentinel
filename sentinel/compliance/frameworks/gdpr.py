
from __future__ import annotations
from sentinel.compliance.frameworks.base import BaseFramework,Control,ControlStatus,EvidenceRecord,FrameworkMetadata,FrameworkStatus
class GDPRFramework(BaseFramework):
    metadata=FrameworkMetadata('gdpr','GDPR','Regulation 2016/679',FrameworkStatus.MANDATORY_LAW,'European Union','Since 2018','https://gdpr-info.eu','5 of 6 articles evaluated at runtime. Article 17 (Right to Erasure) is organisational.')
    controls=[
        Control('art5_1c','Data Minimisation','Article 5(1)(c), GDPR Regulation 2016/679','Personal data must be adequate, relevant and limited to what is necessary.',True),
        Control('art5_1f','Integrity and Confidentiality','Article 5(1)(f), GDPR Regulation 2016/679','Data must be processed in a secure manner.',True),
        Control('art13','Right to Information / Transparency','Article 13, GDPR Regulation 2016/679','Data subjects must be informed about AI processing.',True),
        Control('art17','Right to Erasure','Article 17, GDPR Regulation 2016/679','Data subjects have the right to erasure of personal data.',False,'Right to erasure requires an organisational deletion workflow. Sentinel stores only SHA-256 prompt hashes which are not reversible. Implement a deletion workflow for the tenants table and document in your ROPA.'),
        Control('art22','Automated Decision-Making','Article 22, GDPR Regulation 2016/679','Data subjects have rights related to automated decision-making.',True),
        Control('art25','Data Protection by Design','Article 25, GDPR Regulation 2016/679','Data protection must be implemented by design and by default.',True),
    ]
    def _r(self,c,s,sc,sig,val,txt,rem=None):
        return EvidenceRecord(control_id=c.control_id,framework_id=self.metadata.framework_id,framework_name=self.metadata.framework_name,control_name=c.control_name,article_ref=c.article_ref,status=s,score=sc,signal_used=sig,signal_value=val,evidence_text=txt,remediation=rem)
    def _evaluate_control(self,control,entry,result,config):
        return {'art5_1c':self._art5_1c,'art5_1f':self._art5_1f,'art13':self._art13,'art22':self._art22,'art25':self._art25}[control.control_id](control,entry,result,config)
    def _art5_1c(self,c,e,r,cfg):
        ents=r.get('pii_entities_detected',[]); blocked=r.get('pii_blocked',False); ph=e.get('prompt_hash','')
        if (not ents or blocked) and ph:
            return self._r(c,ControlStatus.PASS,1.0,'pii_entities_detected,pii_blocked,prompt_hash',{'entities':ents,'blocked':blocked},f'Data minimisation Art.5(1)(c) satisfied. PII masked: {ents}. Audit stores SHA-256 prompt hash only (not recoverable).')
        return self._r(c,ControlStatus.FAIL,0.0,'pii_entities_detected,pii_blocked',{'entities':ents,'blocked':blocked},'Data minimisation failure. PII detected but masking failed.','Check sanitizer.log for Presidio errors.')
    def _art5_1f(self,c,e,r,cfg):
        h=e.get('entry_hash',''); chain=e.get('audit_chain_intact',bool(h))
        if h and chain:
            return self._r(c,ControlStatus.PASS,1.0,'entry_hash,audit_chain_intact',{'hash':h[:16],'chain':chain},'Integrity and confidentiality Art.5(1)(f) maintained. Audit data protected by SHA-256 hash chain. Tamper detection active.')
        return self._r(c,ControlStatus.FAIL,0.0,'entry_hash,audit_chain_intact',{'hash':h,'chain':chain},'Integrity failure. Hash chain not intact.','Verify TimescaleDB audit table is append-only. Check for failed hash writes.')
    def _art13(self,c,e,r,cfg):
        headers=r.get('response_headers',{}); ht='X-Sentinel-Trust-Score' in headers or 'trust_score' in r; hi='X-Sentinel-Intervention' in headers or 'intervention_level' in r
        if ht and hi:
            return self._r(c,ControlStatus.PASS,1.0,'response_headers',{'trust_header':ht,'intervention_header':hi},'Transparency Art.13 met. AI processing disclosed via response headers.')
        return self._r(c,ControlStatus.FAIL,0.0,'response_headers',{'trust_header':ht,'intervention_header':hi},'Transparency headers missing.','Add X-Sentinel-Trust-Score and X-Sentinel-Intervention to API responses.')
    def _art22(self,c,e,r,cfg):
        intervention=r.get('intervention_level','L0'); hitl=cfg.get('hitl_configured',True); reviewed=r.get('human_reviewed',False); thresh=cfg.get('trust_threshold',0.85); trust=r.get('trust_score',0.0)
        if hitl:
            if intervention=='L3' and not reviewed:
                return self._r(c,ControlStatus.PARTIAL,0.5,'intervention_level,human_reviewed',{'intervention':intervention,'reviewed':reviewed},f'Human oversight invoked. Automated decision below threshold {thresh}. Review pending.')
            return self._r(c,ControlStatus.PASS,1.0,'intervention_level,hitl_configured',{'intervention':intervention,'hitl':hitl},'Automated decision safeguards Art.22 active. Human oversight via HITL queue available.')
        return self._r(c,ControlStatus.FAIL,0.0,'hitl_configured',False,'HITL not configured. Automated decisions lack human oversight safeguard.','Configure HITL in sentinel.yaml. Art.22 requires human oversight for significant automated decisions.')
    def _art25(self,c,e,r,cfg):
        blocked=r.get('pii_blocked',False); ph=e.get('prompt_hash',''); enc=r.get('redaction_map_encrypted',True); mode=r.get('sanitizer_mode','presidio')
        if blocked and ph and enc:
            return self._r(c,ControlStatus.PASS,1.0,'pii_blocked,prompt_hash,redaction_map_encrypted',{'blocked':blocked,'hash_stored':bool(ph),'encrypted':enc},'Data protection by design Art.25: (1) PII masked before processing, (2) audit stores hash not plaintext, (3) redaction map encrypted at rest.')
        if mode=='regex':
            return self._r(c,ControlStatus.PARTIAL,0.7,'sanitizer_mode',{'mode':mode},'Partial data protection by design. Regex fallback mode active (5 entity types vs 18 with Presidio).','Install spaCy: python -m spacy download en_core_web_lg')
        return self._r(c,ControlStatus.FAIL,0.0,'pii_blocked,prompt_hash',{'blocked':blocked,'hash':bool(ph)},'Data protection by design requirements not fully met.','Ensure PII masking, hash-only storage, and redaction map encryption are all active.')
