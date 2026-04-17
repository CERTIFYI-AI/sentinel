-- 020_rls.sql: Row Level Security for all tables
CREATE OR REPLACE FUNCTION public.get_my_org_id() RETURNS uuid AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;
CREATE OR REPLACE FUNCTION public.get_my_role() RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "models_org_read" ON public.models;
CREATE POLICY "models_org_read" ON public.models FOR SELECT USING (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "models_org_insert" ON public.models;
CREATE POLICY "models_org_insert" ON public.models FOR INSERT WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "models_org_update" ON public.models;
CREATE POLICY "models_org_update" ON public.models FOR UPDATE USING (org_id = public.get_my_org_id()) WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "models_org_delete" ON public.models;
CREATE POLICY "models_org_delete" ON public.models FOR DELETE USING (org_id = public.get_my_org_id() AND public.get_my_role() IN ('admin','ciso'));

ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "risks_org_read" ON public.risks;
CREATE POLICY "risks_org_read" ON public.risks FOR SELECT USING (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "risks_org_insert" ON public.risks;
CREATE POLICY "risks_org_insert" ON public.risks FOR INSERT WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "risks_org_update" ON public.risks;
CREATE POLICY "risks_org_update" ON public.risks FOR UPDATE USING (org_id = public.get_my_org_id()) WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "risks_org_delete" ON public.risks;
CREATE POLICY "risks_org_delete" ON public.risks FOR DELETE USING (org_id = public.get_my_org_id() AND public.get_my_role() IN ('admin','ciso'));

ALTER TABLE public.controls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "controls_org_read" ON public.controls;
CREATE POLICY "controls_org_read" ON public.controls FOR SELECT USING (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "controls_org_insert" ON public.controls;
CREATE POLICY "controls_org_insert" ON public.controls FOR INSERT WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "controls_org_update" ON public.controls;
CREATE POLICY "controls_org_update" ON public.controls FOR UPDATE USING (org_id = public.get_my_org_id()) WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "controls_org_delete" ON public.controls;
CREATE POLICY "controls_org_delete" ON public.controls FOR DELETE USING (org_id = public.get_my_org_id() AND public.get_my_role() IN ('admin','ciso'));

ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "evidence_org_read" ON public.evidence;
CREATE POLICY "evidence_org_read" ON public.evidence FOR SELECT USING (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "evidence_org_insert" ON public.evidence;
CREATE POLICY "evidence_org_insert" ON public.evidence FOR INSERT WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "evidence_org_update" ON public.evidence;
CREATE POLICY "evidence_org_update" ON public.evidence FOR UPDATE USING (org_id = public.get_my_org_id()) WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "evidence_org_delete" ON public.evidence;
CREATE POLICY "evidence_org_delete" ON public.evidence FOR DELETE USING (org_id = public.get_my_org_id() AND public.get_my_role() IN ('admin','ciso'));

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_log_org_read" ON public.audit_log;
CREATE POLICY "audit_log_org_read" ON public.audit_log FOR SELECT USING (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "audit_log_org_insert" ON public.audit_log;
CREATE POLICY "audit_log_org_insert" ON public.audit_log FOR INSERT WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "audit_log_org_update" ON public.audit_log;
CREATE POLICY "audit_log_org_update" ON public.audit_log FOR UPDATE USING (org_id = public.get_my_org_id()) WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "audit_log_org_delete" ON public.audit_log;
CREATE POLICY "audit_log_org_delete" ON public.audit_log FOR DELETE USING (org_id = public.get_my_org_id() AND public.get_my_role() IN ('admin','ciso'));

ALTER TABLE public.bias_audits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bias_audits_org_read" ON public.bias_audits;
CREATE POLICY "bias_audits_org_read" ON public.bias_audits FOR SELECT USING (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "bias_audits_org_insert" ON public.bias_audits;
CREATE POLICY "bias_audits_org_insert" ON public.bias_audits FOR INSERT WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "bias_audits_org_update" ON public.bias_audits;
CREATE POLICY "bias_audits_org_update" ON public.bias_audits FOR UPDATE USING (org_id = public.get_my_org_id()) WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "bias_audits_org_delete" ON public.bias_audits;
CREATE POLICY "bias_audits_org_delete" ON public.bias_audits FOR DELETE USING (org_id = public.get_my_org_id() AND public.get_my_role() IN ('admin','ciso'));

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_org_read" ON public.notifications;
CREATE POLICY "notifications_org_read" ON public.notifications FOR SELECT USING (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "notifications_org_insert" ON public.notifications;
CREATE POLICY "notifications_org_insert" ON public.notifications FOR INSERT WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "notifications_org_update" ON public.notifications;
CREATE POLICY "notifications_org_update" ON public.notifications FOR UPDATE USING (org_id = public.get_my_org_id()) WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "notifications_org_delete" ON public.notifications;
CREATE POLICY "notifications_org_delete" ON public.notifications FOR DELETE USING (org_id = public.get_my_org_id() AND public.get_my_role() IN ('admin','ciso'));

ALTER TABLE public.guardrails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "guardrails_org_read" ON public.guardrails;
CREATE POLICY "guardrails_org_read" ON public.guardrails FOR SELECT USING (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "guardrails_org_insert" ON public.guardrails;
CREATE POLICY "guardrails_org_insert" ON public.guardrails FOR INSERT WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "guardrails_org_update" ON public.guardrails;
CREATE POLICY "guardrails_org_update" ON public.guardrails FOR UPDATE USING (org_id = public.get_my_org_id()) WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "guardrails_org_delete" ON public.guardrails;
CREATE POLICY "guardrails_org_delete" ON public.guardrails FOR DELETE USING (org_id = public.get_my_org_id() AND public.get_my_role() IN ('admin','ciso'));

ALTER TABLE public.hitl_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hitl_queue_org_read" ON public.hitl_queue;
CREATE POLICY "hitl_queue_org_read" ON public.hitl_queue FOR SELECT USING (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "hitl_queue_org_insert" ON public.hitl_queue;
CREATE POLICY "hitl_queue_org_insert" ON public.hitl_queue FOR INSERT WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "hitl_queue_org_update" ON public.hitl_queue;
CREATE POLICY "hitl_queue_org_update" ON public.hitl_queue FOR UPDATE USING (org_id = public.get_my_org_id()) WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "hitl_queue_org_delete" ON public.hitl_queue;
CREATE POLICY "hitl_queue_org_delete" ON public.hitl_queue FOR DELETE USING (org_id = public.get_my_org_id() AND public.get_my_role() IN ('admin','ciso'));

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vendors_org_read" ON public.vendors;
CREATE POLICY "vendors_org_read" ON public.vendors FOR SELECT USING (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "vendors_org_insert" ON public.vendors;
CREATE POLICY "vendors_org_insert" ON public.vendors FOR INSERT WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "vendors_org_update" ON public.vendors;
CREATE POLICY "vendors_org_update" ON public.vendors FOR UPDATE USING (org_id = public.get_my_org_id()) WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "vendors_org_delete" ON public.vendors;
CREATE POLICY "vendors_org_delete" ON public.vendors FOR DELETE USING (org_id = public.get_my_org_id() AND public.get_my_role() IN ('admin','ciso'));

ALTER TABLE public.use_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "use_cases_org_read" ON public.use_cases;
CREATE POLICY "use_cases_org_read" ON public.use_cases FOR SELECT USING (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "use_cases_org_insert" ON public.use_cases;
CREATE POLICY "use_cases_org_insert" ON public.use_cases FOR INSERT WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "use_cases_org_update" ON public.use_cases;
CREATE POLICY "use_cases_org_update" ON public.use_cases FOR UPDATE USING (org_id = public.get_my_org_id()) WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "use_cases_org_delete" ON public.use_cases;
CREATE POLICY "use_cases_org_delete" ON public.use_cases FOR DELETE USING (org_id = public.get_my_org_id() AND public.get_my_role() IN ('admin','ciso'));

ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prompts_org_read" ON public.prompts;
CREATE POLICY "prompts_org_read" ON public.prompts FOR SELECT USING (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "prompts_org_insert" ON public.prompts;
CREATE POLICY "prompts_org_insert" ON public.prompts FOR INSERT WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "prompts_org_update" ON public.prompts;
CREATE POLICY "prompts_org_update" ON public.prompts FOR UPDATE USING (org_id = public.get_my_org_id()) WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "prompts_org_delete" ON public.prompts;
CREATE POLICY "prompts_org_delete" ON public.prompts FOR DELETE USING (org_id = public.get_my_org_id() AND public.get_my_role() IN ('admin','ciso'));

ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "evaluations_org_read" ON public.evaluations;
CREATE POLICY "evaluations_org_read" ON public.evaluations FOR SELECT USING (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "evaluations_org_insert" ON public.evaluations;
CREATE POLICY "evaluations_org_insert" ON public.evaluations FOR INSERT WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "evaluations_org_update" ON public.evaluations;
CREATE POLICY "evaluations_org_update" ON public.evaluations FOR UPDATE USING (org_id = public.get_my_org_id()) WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "evaluations_org_delete" ON public.evaluations;
CREATE POLICY "evaluations_org_delete" ON public.evaluations FOR DELETE USING (org_id = public.get_my_org_id() AND public.get_my_role() IN ('admin','ciso'));

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "incidents_org_read" ON public.incidents;
CREATE POLICY "incidents_org_read" ON public.incidents FOR SELECT USING (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "incidents_org_insert" ON public.incidents;
CREATE POLICY "incidents_org_insert" ON public.incidents FOR INSERT WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "incidents_org_update" ON public.incidents;
CREATE POLICY "incidents_org_update" ON public.incidents FOR UPDATE USING (org_id = public.get_my_org_id()) WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "incidents_org_delete" ON public.incidents;
CREATE POLICY "incidents_org_delete" ON public.incidents FOR DELETE USING (org_id = public.get_my_org_id() AND public.get_my_role() IN ('admin','ciso'));

ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "policies_org_read" ON public.policies;
CREATE POLICY "policies_org_read" ON public.policies FOR SELECT USING (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "policies_org_insert" ON public.policies;
CREATE POLICY "policies_org_insert" ON public.policies FOR INSERT WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "policies_org_update" ON public.policies;
CREATE POLICY "policies_org_update" ON public.policies FOR UPDATE USING (org_id = public.get_my_org_id()) WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "policies_org_delete" ON public.policies;
CREATE POLICY "policies_org_delete" ON public.policies FOR DELETE USING (org_id = public.get_my_org_id() AND public.get_my_role() IN ('admin','ciso'));

ALTER TABLE public.training ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "training_org_read" ON public.training;
CREATE POLICY "training_org_read" ON public.training FOR SELECT USING (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "training_org_insert" ON public.training;
CREATE POLICY "training_org_insert" ON public.training FOR INSERT WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "training_org_update" ON public.training;
CREATE POLICY "training_org_update" ON public.training FOR UPDATE USING (org_id = public.get_my_org_id()) WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "training_org_delete" ON public.training;
CREATE POLICY "training_org_delete" ON public.training FOR DELETE USING (org_id = public.get_my_org_id() AND public.get_my_role() IN ('admin','ciso'));

ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "datasets_org_read" ON public.datasets;
CREATE POLICY "datasets_org_read" ON public.datasets FOR SELECT USING (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "datasets_org_insert" ON public.datasets;
CREATE POLICY "datasets_org_insert" ON public.datasets FOR INSERT WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "datasets_org_update" ON public.datasets;
CREATE POLICY "datasets_org_update" ON public.datasets FOR UPDATE USING (org_id = public.get_my_org_id()) WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "datasets_org_delete" ON public.datasets;
CREATE POLICY "datasets_org_delete" ON public.datasets FOR DELETE USING (org_id = public.get_my_org_id() AND public.get_my_role() IN ('admin','ciso'));

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agents_org_read" ON public.agents;
CREATE POLICY "agents_org_read" ON public.agents FOR SELECT USING (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "agents_org_insert" ON public.agents;
CREATE POLICY "agents_org_insert" ON public.agents FOR INSERT WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "agents_org_update" ON public.agents;
CREATE POLICY "agents_org_update" ON public.agents FOR UPDATE USING (org_id = public.get_my_org_id()) WITH CHECK (org_id = public.get_my_org_id());
DROP POLICY IF EXISTS "agents_org_delete" ON public.agents;
CREATE POLICY "agents_org_delete" ON public.agents FOR DELETE USING (org_id = public.get_my_org_id() AND public.get_my_role() IN ('admin','ciso'));

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_read" ON public.organizations FOR SELECT USING (id = public.get_my_org_id());
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_org_read" ON public.profiles FOR SELECT USING (org_id = public.get_my_org_id() OR id = auth.uid());
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE USING (id = auth.uid());
DROP POLICY IF EXISTS "audit_log_org_update" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_org_delete" ON public.audit_log;
