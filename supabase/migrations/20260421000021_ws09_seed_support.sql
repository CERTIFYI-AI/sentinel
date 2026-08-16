-- SPDX-License-Identifier: Apache-2.0
-- Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
-- WS9 — Supporting tables required by the admin seed (idempotent).
-- Every table: org_id, created_at/updated_at, created_by/updated_by,
-- soft-delete (deleted_at), RLS policies, indexes on (org_id, …).

BEGIN;

-- ============================================================
-- demo_users  (distinct from auth.users to support seeded data)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.demo_users (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  primary_role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS ix_demo_users_org ON public.demo_users (org_id);
CREATE INDEX IF NOT EXISTS ix_demo_users_org_role ON public.demo_users (org_id, primary_role);
ALTER TABLE public.demo_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ws09_demo_users_read ON public.demo_users;
CREATE POLICY ws09_demo_users_read ON public.demo_users
  FOR SELECT USING (org_id = auth.current_org_id());

-- ============================================================
-- framework_bindings (which frameworks an org has in scope)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.framework_bindings (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  framework_slug text NOT NULL,
  framework_name text NOT NULL,
  scope text NOT NULL DEFAULT 'in_scope',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  UNIQUE (org_id, framework_slug)
);
CREATE INDEX IF NOT EXISTS ix_framework_bindings_org ON public.framework_bindings (org_id);
ALTER TABLE public.framework_bindings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ws09_framework_bindings_read ON public.framework_bindings;
CREATE POLICY ws09_framework_bindings_read ON public.framework_bindings
  FOR SELECT USING (org_id = auth.current_org_id());

-- ============================================================
-- training_assignments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.training_assignments (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  user_id uuid NOT NULL,
  course_slug text NOT NULL,
  status text NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS ix_training_org_user ON public.training_assignments (org_id, user_id);
CREATE INDEX IF NOT EXISTS ix_training_org_course ON public.training_assignments (org_id, course_slug);
ALTER TABLE public.training_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ws09_training_read ON public.training_assignments;
CREATE POLICY ws09_training_read ON public.training_assignments
  FOR SELECT USING (org_id = auth.current_org_id());

COMMIT;
