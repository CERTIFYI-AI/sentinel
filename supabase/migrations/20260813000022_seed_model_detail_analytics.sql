-- REPLAY NOTE: the April-era unify loops drop bias_audits.tenant_id on a
-- from-zero replay, but the live table carries it today (re-added when the
-- module was consolidated). Heal before seeding — no-op live.
ALTER TABLE bias_audits ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='bias_audits' AND column_name='org_id' AND is_nullable='NO') THEN
    ALTER TABLE bias_audits ALTER COLUMN org_id DROP NOT NULL;
  END IF;
END $$;

-- Idempotent demo analytics for the Model Detail tabs, keyed to the registry
-- uuid of "CreditScore AI v3" (+ a FraudShield ML performance series). These are
-- real rows in real tables read by the dashboard's analytics service; production
-- data arrives via the proxy telemetry emit / POST /api/models/metrics.
-- Applied live via Supabase MCP on 2026-08-13.

-- Performance time-series (8 monthly points) for two demo models.
insert into public.model_performance_metrics
  (org_id, model_id, model_name, recorded_at, latency_p50, latency_p99, throughput, accuracy, error_rate, drift_score, cost_per_inference, request_count, metadata)
select
  '00000000-0000-0000-0000-000000000001'::uuid, m.model_id, m.model_name,
  now() - (g || ' months')::interval,
  m.base_p50 + (g*2), m.base_p99 + (g*6), m.base_tput - (g*40),
  round((m.base_acc - g*0.003)::numeric, 4), round((0.004 + g*0.0006)::numeric, 4),
  round((3.0 + g*0.5)::numeric, 2), m.base_cost, m.base_reqs - (g*1200), '{"source":"seed"}'::jsonb
from (values
  ('820f578e-713b-498d-b36e-ddace8dde1dd','CreditScore AI v3', 42, 120, 1450, 0.947, 0.00023, 82000),
  ('f1b405e7-2da5-402a-a807-7f40898b3ff5','FraudShield ML',    31,  96, 2100, 0.972, 0.00018, 141000)
) as m(model_id, model_name, base_p50, base_p99, base_tput, base_acc, base_cost, base_reqs)
cross join generate_series(0,7) as g
where not exists (
  select 1 from public.model_performance_metrics x
  where x.model_id = m.model_id and x.metadata->>'source' = 'seed'
);

-- Bias audits keyed to the registry uuid (CreditScore AI v3).
insert into public.bias_audits (id, tenant_id, model_id, dataset_id, framework, bias_dimensions, fairness_metric, threshold, overall_score, status, results, is_deleted, created_at, updated_at)
values
('ba-cs3-002','00000000-0000-0000-0000-000000000001','820f578e-713b-498d-b36e-ddace8dde1dd','DS-CREDIT-2026Q2','EU AI Act Art.10 + Fairlearn',
 ARRAY['gender','age','ethnicity'],'Equalized Odds',0.80,0.86,'Completed',
 '{"auditor":"Fairness Guild","technique":"Fairlearn ThresholdOptimizer","protectedAttributes":[{"name":"gender"},{"name":"age"},{"name":"ethnicity"}],"dimensions":[{"attribute":"gender","score":0.90,"threshold":0.80,"pass":true},{"attribute":"age","score":0.83,"threshold":0.80,"pass":true},{"attribute":"ethnicity","score":0.85,"threshold":0.80,"pass":true}],"recommendations":["Maintain quarterly re-audit cadence.","Monitor age-band drift on the 55+ segment."]}'::jsonb,
 false, now() - interval '20 days', now() - interval '20 days'),
('ba-cs3-001','00000000-0000-0000-0000-000000000001','820f578e-713b-498d-b36e-ddace8dde1dd','DS-CREDIT-2026Q1','EU AI Act Art.10 + Fairlearn',
 ARRAY['gender','age','ethnicity'],'Equalized Odds',0.80,0.74,'Completed',
 '{"auditor":"Fairness Guild","technique":"Fairlearn GridSearch","protectedAttributes":[{"name":"gender"},{"name":"age"},{"name":"ethnicity"}],"dimensions":[{"attribute":"gender","score":0.88,"threshold":0.80,"pass":true},{"attribute":"age","score":0.71,"threshold":0.80,"pass":false},{"attribute":"ethnicity","score":0.79,"threshold":0.80,"pass":false}],"recommendations":["Rebalance training data for the 55+ age band.","Add post-processing calibration for ethnicity parity."]}'::jsonb,
 false, now() - interval '110 days', now() - interval '110 days')
on conflict (id) do nothing;

-- Explainability (SHAP+LIME) for CreditScore AI v3.
insert into public.model_explanations (org_id, model_id, model_version, method, shap, lime, sample_size, computed_at)
select '00000000-0000-0000-0000-000000000001','820f578e-713b-498d-b36e-ddace8dde1dd','v3.0','SHAP+LIME',
 '[{"feature":"credit_score","importance":0.38},{"feature":"income_ratio","importance":0.24},{"feature":"employment_years","importance":0.17},{"feature":"debt_to_income","importance":0.12},{"feature":"payment_history","importance":0.09}]'::jsonb,
 '[{"feature":"credit_score","impact":0.31},{"feature":"income_ratio","impact":-0.14},{"feature":"employment_years","impact":0.11},{"feature":"debt_to_income","impact":-0.08},{"feature":"payment_history","impact":0.06}]'::jsonb,
 1000, now() - interval '12 days'
where not exists (select 1 from public.model_explanations where model_id='820f578e-713b-498d-b36e-ddace8dde1dd');

-- DNA lineage for CreditScore AI v3 (feeds the Data Lineage tab).
insert into public.model_dna (org_id, model_id, model_name, base_model, training_dataset, training_method, fine_tuning_method, parameters_count, context_window, fingerprint_hash, lineage, metadata)
select '00000000-0000-0000-0000-000000000001'::uuid,'820f578e-713b-498d-b36e-ddace8dde1dd','CreditScore AI v3','XGBoost 2.0',
 'DS-CREDIT-2026Q2 (890k applications)','Gradient-boosted trees','Bayesian hyperparameter search',2400000,0,
 'sha256:9f3ab7c1d2e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0',
 '[{"stage":"Source datasets","dataset":"DS-CREDIT-2026Q2","hash":"sha256:11ab…","date":"2026-05-02","by":"Data Eng"},{"stage":"Preprocessing","dataset":"clean+scale+SMOTE","hash":"sha256:22cd…","date":"2026-05-04","by":"ML Platform"},{"stage":"Training","dataset":"XGBoost 2.0","hash":"sha256:33ef…","date":"2026-05-06","by":"ML Platform"},{"stage":"Validation","dataset":"hold-out 20%","hash":"sha256:44ab…","date":"2026-05-07","by":"Risk"},{"stage":"Deployment","dataset":"prod-inference","hash":"sha256:55cd…","date":"2026-05-10","by":"CISO"}]'::jsonb,
 '{"framework":"XGBoost","department":"Credit Risk","featureCount":47}'::jsonb
where not exists (select 1 from public.model_dna where model_id='820f578e-713b-498d-b36e-ddace8dde1dd');
