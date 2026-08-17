-- Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
--
-- WS4 — Enterprise RBAC depth.
--
-- Ships:
--   1. org_roles enum expanded to 12 canonical roles
--   2. user_role_bindings (one user can hold multiple roles, per org)
--   3. jit_elevations (just-in-time privileged access with expiry +
--      approver + audit trail)
--   4. mfa_enrollments (per-user factor registry: totp, webauthn, sms)
--   5. permission matrix table + seed
--   6. auth.has_role(role) + auth.has_permission(perm) helpers
--   7. RLS: every table gets org-scoped read; only admins insert/delete
--   8. Trigger: JIT elevation auto-expires
--
-- This migration is idempotent (IF NOT EXISTS everywhere).

BEGIN;

-- ──────────────────────────────────────────────────────────────────────
-- 1. Canonical role enum
-- ──────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_role_enum') THEN
    CREATE TYPE org_role_enum AS ENUM (
      'org_admin',              -- tenant owner, breaks glass
      'security_admin',         -- IAM + MFA + SSO config
      'compliance_officer',     -- frameworks, controls, attestations
      'risk_manager',           -- risk register, KRIs, treatment plans
      'privacy_officer',        -- DSRs, RoPA, DPIA
      'auditor_internal',       -- read all; write findings
      'auditor_external',       -- read-only scoped
      'incident_responder',     -- incidents + forensics
      'control_owner',          -- owns controls + evidence uploads
      'policy_author',          -- governance writes
      'vendor_manager',         -- third-party reviews
      'viewer'                  -- read-only dashboards
    );
  END IF;
END$$;

-- ──────────────────────────────────────────────────────────────────────
-- 2. user_role_bindings
-- ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_role_bindings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL,
  user_id           uuid NOT NULL,
  role              org_role_enum NOT NULL,
  granted_by        uuid,
  granted_reason    text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid,
  updated_by        uuid,
  deleted_at        timestamptz,
  UNIQUE (org_id, user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_role_bindings_org_user
  ON public.user_role_bindings (org_id, user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_role_bindings_role
  ON public.user_role_bindings (org_id, role)
  WHERE deleted_at IS NULL;

ALTER TABLE public.user_role_bindings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ws04_urb_read   ON public.user_role_bindings;
DROP POLICY IF EXISTS ws04_urb_write  ON public.user_role_bindings;

CREATE POLICY ws04_urb_read ON public.user_role_bindings
  FOR SELECT USING (org_id = auth.current_org_id());
CREATE POLICY ws04_urb_write ON public.user_role_bindings
  FOR ALL USING (
    org_id = auth.current_org_id()
    AND EXISTS (
      SELECT 1 FROM public.user_role_bindings urb
      WHERE urb.org_id = org_id
        AND urb.user_id = auth.uid()
        AND urb.role IN ('org_admin', 'security_admin')
        AND urb.deleted_at IS NULL
    )
  );

-- ──────────────────────────────────────────────────────────────────────
-- 3. jit_elevations — just-in-time privileged access
-- ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.jit_elevations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL,
  user_id           uuid NOT NULL,
  elevated_role     org_role_enum NOT NULL,
  reason            text NOT NULL,
  ticket_ref        text,
  requested_at      timestamptz NOT NULL DEFAULT now(),
  approved_at       timestamptz,
  approver_id       uuid,
  expires_at        timestamptz NOT NULL,
  revoked_at        timestamptz,
  revoked_by        uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid,
  updated_by        uuid,
  deleted_at        timestamptz,
  CHECK (expires_at > requested_at),
  CHECK (expires_at <= requested_at + interval '8 hours')
);

CREATE INDEX IF NOT EXISTS idx_jit_elevations_active
  ON public.jit_elevations (org_id, user_id)
  WHERE revoked_at IS NULL AND deleted_at IS NULL;

ALTER TABLE public.jit_elevations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ws04_jit_read   ON public.jit_elevations;
DROP POLICY IF EXISTS ws04_jit_insert ON public.jit_elevations;
DROP POLICY IF EXISTS ws04_jit_update ON public.jit_elevations;

-- Everyone in the org can see their own requests; admins see all.
CREATE POLICY ws04_jit_read ON public.jit_elevations
  FOR SELECT USING (
    org_id = auth.current_org_id()
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.user_role_bindings urb
        WHERE urb.org_id = org_id
          AND urb.user_id = auth.uid()
          AND urb.role IN ('org_admin', 'security_admin')
      )
    )
  );

CREATE POLICY ws04_jit_insert ON public.jit_elevations
  FOR INSERT WITH CHECK (
    org_id = auth.current_org_id() AND user_id = auth.uid()
  );

CREATE POLICY ws04_jit_update ON public.jit_elevations
  FOR UPDATE USING (
    org_id = auth.current_org_id()
    AND EXISTS (
      SELECT 1 FROM public.user_role_bindings urb
      WHERE urb.org_id = org_id
        AND urb.user_id = auth.uid()
        AND urb.role IN ('org_admin', 'security_admin')
    )
  );

-- ──────────────────────────────────────────────────────────────────────
-- 4. mfa_enrollments — per-user factor registry
-- ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.mfa_enrollments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL,
  user_id           uuid NOT NULL,
  factor_type       text NOT NULL CHECK (factor_type IN ('totp', 'webauthn', 'sms', 'email', 'backup_codes')),
  factor_label      text,
  last_used_at      timestamptz,
  verified_at       timestamptz,
  enrolled_at       timestamptz NOT NULL DEFAULT now(),
  -- Secrets live in Supabase Auth's factor tables, NOT here.
  factor_ref        text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid,
  updated_by        uuid,
  deleted_at        timestamptz,
  UNIQUE (org_id, user_id, factor_type, factor_ref)
);

CREATE INDEX IF NOT EXISTS idx_mfa_enrollments_user
  ON public.mfa_enrollments (org_id, user_id)
  WHERE deleted_at IS NULL;

ALTER TABLE public.mfa_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ws04_mfa_read  ON public.mfa_enrollments;
DROP POLICY IF EXISTS ws04_mfa_write ON public.mfa_enrollments;

CREATE POLICY ws04_mfa_read ON public.mfa_enrollments
  FOR SELECT USING (
    org_id = auth.current_org_id()
    AND (user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.user_role_bindings urb
                    WHERE urb.org_id = org_id
                      AND urb.user_id = auth.uid()
                      AND urb.role IN ('org_admin','security_admin')))
  );

CREATE POLICY ws04_mfa_write ON public.mfa_enrollments
  FOR ALL USING (org_id = auth.current_org_id() AND user_id = auth.uid());

-- ──────────────────────────────────────────────────────────────────────
-- 5. Permission matrix
-- ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rbac_permissions (
  role         org_role_enum NOT NULL,
  permission   text NOT NULL,
  PRIMARY KEY (role, permission)
);

INSERT INTO public.rbac_permissions (role, permission) VALUES
  -- Full tenant control
  ('org_admin', '*'),
  -- Security admin
  ('security_admin', 'iam.*'),
  ('security_admin', 'mfa.*'),
  ('security_admin', 'sso.*'),
  ('security_admin', 'audit.read'),
  ('security_admin', 'audit.export'),
  -- Compliance officer
  ('compliance_officer', 'frameworks.*'),
  ('compliance_officer', 'controls.*'),
  ('compliance_officer', 'evidence.*'),
  ('compliance_officer', 'policy.read'),
  ('compliance_officer', 'policy.approve'),
  -- Risk manager
  ('risk_manager', 'risk.*'),
  ('risk_manager', 'controls.read'),
  ('risk_manager', 'evidence.read'),
  ('risk_manager', 'report.export'),
  -- Privacy officer
  ('privacy_officer', 'privacy.*'),
  ('privacy_officer', 'dsr.*'),
  ('privacy_officer', 'ropa.*'),
  ('privacy_officer', 'dpia.*'),
  -- Auditors
  ('auditor_internal', 'read.*'),
  ('auditor_internal', 'findings.create'),
  ('auditor_internal', 'findings.update'),
  ('auditor_internal', 'report.export'),
  ('auditor_external', 'read.*'),
  ('auditor_external', 'report.export'),
  -- Incident responder
  ('incident_responder', 'incidents.*'),
  ('incident_responder', 'forensics.*'),
  ('incident_responder', 'threats.read'),
  -- Control owner
  ('control_owner', 'controls.update'),
  ('control_owner', 'evidence.create'),
  ('control_owner', 'evidence.update'),
  ('control_owner', 'controls.read'),
  -- Policy author
  ('policy_author', 'policy.*'),
  ('policy_author', 'controls.read'),
  -- Vendor manager
  ('vendor_manager', 'vendors.*'),
  ('vendor_manager', 'contracts.read'),
  ('vendor_manager', 'risk.read'),
  -- Viewer
  ('viewer', 'read.*')
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────────────────────────────
-- 6. Helpers
-- ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION auth.has_role(role_name text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_role_bindings urb
    WHERE urb.user_id = auth.uid()
      AND urb.org_id = auth.current_org_id()
      AND urb.role::text = role_name
      AND urb.deleted_at IS NULL
  )
  OR EXISTS (
    SELECT 1 FROM public.jit_elevations jit
    WHERE jit.user_id = auth.uid()
      AND jit.org_id = auth.current_org_id()
      AND jit.elevated_role::text = role_name
      AND jit.approved_at IS NOT NULL
      AND jit.expires_at > now()
      AND jit.revoked_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION auth.has_permission(perm text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_role_bindings urb
    JOIN public.rbac_permissions rp ON rp.role = urb.role
    WHERE urb.user_id = auth.uid()
      AND urb.org_id = auth.current_org_id()
      AND urb.deleted_at IS NULL
      AND (
        rp.permission = '*'
        OR rp.permission = perm
        OR (rp.permission LIKE '%.*' AND perm LIKE replace(rp.permission, '.*', '.%'))
      )
  );
$$;

GRANT EXECUTE ON FUNCTION auth.has_role(text) TO authenticated;
GRANT EXECUTE ON FUNCTION auth.has_permission(text) TO authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- 7. JIT auto-expiry trigger
-- ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.ws04_jit_auto_revoke()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.jit_elevations
     SET revoked_at = now(),
         updated_at = now()
   WHERE expires_at < now()
     AND revoked_at IS NULL
     AND deleted_at IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ws04_jit_auto_revoke_trg ON public.jit_elevations;
CREATE TRIGGER ws04_jit_auto_revoke_trg
  AFTER INSERT OR UPDATE ON public.jit_elevations
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.ws04_jit_auto_revoke();

COMMIT;
