from __future__ import annotations
from sentinel.compliance.frameworks.base import BaseFramework,Control,ControlStatus,EvidenceRecord,FrameworkMetadata,FrameworkStatus
class GDPRFramework(BaseFramework):
    metadata=FrameworkMetadata(
        framework_id='gdpr',
        name='GDPR',
        framework_name='Regulation 2016/679',
        version='2016/679',
        status=FrameworkStatus.MANDATORY_LAW,
        jurisdiction='European Union',
        description='Since 2018',
        primary_source='https://gdpr-info.eu',
        sentinel_coverage_note='5 of 6 articles evaluated at runtime. Article 17 (Right to Erasure) is organisational.',
    )
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
        intervention=r.get('intervention_level','L0'); hitl=cfg.get('hitl_configured',True); reviewed=r.get('human_reviewed',False)
        if intervention in ('L0','L1'):
            return self._r(c,ControlStatus.PASS,1.0,'intervention_level,hitl_configured',{'intervention':intervention,'hitl':hitl},'Automated decision-making Art.22: Low-risk intervention. Human oversight available.')
        if intervention == 'L3' and reviewed:
            return self._r(c,ControlStatus.PASS,1.0,'intervention_level,human_reviewed',{'intervention':intervention,'reviewed':reviewed},'Art.22: Human reviewed and approved the response.')
        if intervention == 'L3':
            return self._r(c,ControlStatus.PARTIAL,0.5,'intervention_level,human_reviewed',{'intervention':intervention,'reviewed':reviewed},'Art.22: High-risk decision pending human review.','Complete HITL review for this request.')
        return self._r(c,ControlStatus.PASS,0.9,'intervention_level',{'intervention':intervention},'Automated intervention applied. Human oversight configured.')
    def _art25(self,c,e,r,cfg):
        pii_blocked=r.get('pii_blocked',False); minimised=r.get('data_minimisation_applied',False); purpose=r.get('purpose_limitation_enforced',False)
        score=sum([pii_blocked,minimised,purpose])/3.0
        if score>=0.66:
            return self._r(c,ControlStatus.PASS,score,'pii_blocked,data_minimisation_applied,purpose_limitation_enforced',{'pii_blocked':pii_blocked,'minimised':minimised,'purpose':purpose},'Data protection by design Art.25 satisfied.')
        return self._r(c,ControlStatus.FAIL,score,'pii_blocked,data_minimisation_applied,purpose_limitation_enforced',{'pii_blocked':pii_blocked,'minimised':minimised,'purpose':purpose},'Data protection by design insufficient.','Enable PII masking, data minimisation, and purpose limitation.')
