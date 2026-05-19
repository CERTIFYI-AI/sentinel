-- 022_seed.sql: Seed data matching mock data
INSERT INTO public.organizations (id,name,slug,tier) VALUES ('00000000-0000-0000-0000-000000000001','Sentinel Financial Corp','sentinel-financial','enterprise') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id,org_id,email,full_name,role) VALUES ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','admin@sentinel.demo','CISO Admin','admin') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.models (id,org_id,name,version,status,risk_tier,framework) VALUES
('mdl-001','00000000-0000-0000-0000-000000000001','Credit Risk Scorer','v2.3.1','Active','High','EU AI Act'),
('mdl-002','00000000-0000-0000-0000-000000000001','Fraud Detection Engine','v1.8.0','Active','Critical','NIST AI RMF'),
('mdl-003','00000000-0000-0000-0000-000000000001','Customer Churn Predictor','v3.0.0','Under Review','Medium','ISO 42001'),
('mdl-004','00000000-0000-0000-0000-000000000001','Loan Approval Assistant','v1.2.0','Active','High','EU AI Act'),
('mdl-005','00000000-0000-0000-0000-000000000001','AML Transaction Monitor','v4.1.0','Active','Critical','NIST AI RMF')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.risks (id,org_id,title,severity,status,description) VALUES
('rsk-001','00000000-0000-0000-0000-000000000001','Model Drift in Credit Scorer','High','Open','Performance degradation detected'),
('rsk-002','00000000-0000-0000-0000-000000000001','Bias in Loan Approval','Critical','Mitigating','Demographic parity violation'),
('rsk-003','00000000-0000-0000-0000-000000000001','Data Quality Issues','Medium','Open','Missing values in training data'),
('rsk-004','00000000-0000-0000-0000-000000000001','Regulatory Non-Compliance','High','Open','EU AI Act gap analysis pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.guardrails (id,org_id,name,type,enabled,rules) VALUES
('grd-001','00000000-0000-0000-0000-000000000001','PII Filter','input',true,'{"patterns":["SSN","credit_card"]}'),
('grd-002','00000000-0000-0000-0000-000000000001','Toxicity Check','output',true,'{"threshold":0.8}'),
('grd-003','00000000-0000-0000-0000-000000000001','Hallucination Guard','output',true,'{"method":"self_consistency"}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.controls (id,org_id,framework,control_id,title,status,evidence_count) VALUES
('ctl-001','00000000-0000-0000-0000-000000000001','ISO 27001','A.5.1','Information Security Policy','Compliant',3),
('ctl-002','00000000-0000-0000-0000-000000000001','SOC 2','CC6.1','Logical Access Controls','Partial',1),
('ctl-003','00000000-0000-0000-0000-000000000001','EU AI Act','Art.9','Risk Management System','Non-Compliant',0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.vendors (id,org_id,name,tier,status,risk_score) VALUES
('vnd-001','00000000-0000-0000-0000-000000000001','AWS','Tier 1','Approved',85),
('vnd-002','00000000-0000-0000-0000-000000000001','OpenAI','Tier 1','Under Review',72),
('vnd-003','00000000-0000-0000-0000-000000000001','Anthropic','Tier 2','Approved',90)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.incidents (id,org_id,title,severity,status,description) VALUES
('inc-001','00000000-0000-0000-0000-000000000001','Model Output Leak','High','Investigating','PII detected in model output logs'),
('inc-002','00000000-0000-0000-0000-000000000001','Bias Alert Triggered','Medium','Resolved','Fairness score dropped below threshold')
ON CONFLICT (id) DO NOTHING;
