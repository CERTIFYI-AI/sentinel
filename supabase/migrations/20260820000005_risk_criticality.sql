-- 20260820000005_risk_criticality.sql
--
-- Risk & Incidents criticality elevation (2026-08-16 re-audit):
--   * approvals could not represent multi-step decisions (step_index was
--     never advanced; one click approved a two-step workflow) — per-step
--     decisions ledger + a persisted due date so an approval can be overdue
--   * audit_findings had no risk seam — a major nonconformity could not
--     reference a register risk
--   * notifications written by the mesh (user_id defaults to 'system') were
--     unreadable under the owner-only RLS policy — org-broadcast read policy
-- Idempotent; safe to re-run.

ALTER TABLE public.approvals
  ADD COLUMN IF NOT EXISTS decisions jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{step, name, approver, decision, at}]
  ADD COLUMN IF NOT EXISTS due_at timestamptz;

ALTER TABLE public.audit_findings
  -- text: risks.id is TEXT. A uuid column here cannot take a risks.id value
  -- ("column linked_risk_id is of type uuid but expression is of type text")
  -- and aborted the seed that populates it (audit F1).
  ADD COLUMN IF NOT EXISTS linked_risk_id text;   -- → risks.id (text)

DO $$
BEGIN
  IF to_regclass('public.notifications') IS NOT NULL THEN
    -- heal-before-police: era replays may lack tenant_id
    EXECUTE $h$ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default'$h$;
    EXECUTE 'DROP POLICY IF EXISTS notifications_org_broadcast_read ON public.notifications';
    -- Rows addressed to a specific user stay owner-scoped (existing policy);
    -- mesh broadcasts (user_id = ''system'' or null) are readable org-wide.
    EXECUTE 'CREATE POLICY notifications_org_broadcast_read ON public.notifications '
         || 'FOR SELECT TO authenticated '
         || 'USING (tenant_id = (current_user_org_id())::text '
         || '       AND (user_id IS NULL OR user_id::text = ''system''))';
  END IF;
END $$;
