-- SPDX-License-Identifier: Apache-2.0
-- Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
--
-- Phase 4 FTS Fix v2: correct column names + remove auth.current_org_id()
-- Fixes:
--   - risks uses `name` not `title`; scoped by `tenant_id` (text) not org_id (uuid)
--   - incidents uses `description`, `incident_type`; scoped by `tenant_id`
--   - vendors uses `vendor_name` not `name`; scoped by `tenant_id`
--   - global_search() parameter changed to p_tenant_id text
--   - notifications/executive_digests RLS: replaced auth.current_org_id() with auth.uid() / service_role
--   - FTS indexes rebuilt on correct columns

BEGIN;

-- ─── Drop old FTS indexes built on wrong columns ──────────────────────────────
DROP INDEX IF EXISTS public.risks_fts_idx;
DROP INDEX IF EXISTS public.incidents_fts_idx;
DROP INDEX IF EXISTS public.vendors_fts_idx;

-- ─── Correct FTS indexes ──────────────────────────────────────────────────────
-- risks: name + description
CREATE INDEX IF NOT EXISTS risks_fts_idx
  ON public.risks USING GIN (
    to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,''))
  );

-- incidents: description + incident_type
CREATE INDEX IF NOT EXISTS incidents_fts_idx
  ON public.incidents USING GIN (
    to_tsvector('english', coalesce(description,'') || ' ' || coalesce(incident_type,''))
  );

-- vendors: vendor_name + what_does_vendor_provide
CREATE INDEX IF NOT EXISTS vendors_fts_idx
  ON public.vendors USING GIN (
    to_tsvector('english', coalesce(vendor_name,'') || ' ' || coalesce(what_does_vendor_provide,''))
  );

-- Keep controls/policies indexes (those use correct columns already)
CREATE INDEX IF NOT EXISTS controls_fts_idx
  ON public.controls USING GIN (
    to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,''))
  );
CREATE INDEX IF NOT EXISTS policies_fts_idx
  ON public.policies USING GIN (
    to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,''))
  );

-- ─── Drop old global_search (wrong signature) ────────────────────────────────
DROP FUNCTION IF EXISTS public.global_search(uuid, text, int);

-- ─── Corrected global_search() — tenant_id scoped ────────────────────────────
CREATE OR REPLACE FUNCTION public.global_search(
  p_tenant_id text,
  p_query     text,
  p_limit     int DEFAULT 20
)
RETURNS TABLE (
  resource_type text,
  resource_id   text,
  title         text,
  excerpt       text,
  url_path      text,
  score         real
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  RETURN QUERY
  -- risks (name column)
  SELECT
    'risk'::text,
    id::text,
    name::text,
    left(coalesce(description,''), 120)::text,
    ('/risk-register/' || id::text)::text,
    ts_rank(
      to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'')),
      plainto_tsquery('english', p_query)
    )::real
  FROM public.risks
  WHERE tenant_id = p_tenant_id
    AND to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,''))
        @@ plainto_tsquery('english', p_query)

  UNION ALL

  -- incidents (description + incident_type)
  SELECT
    'incident'::text,
    id::text,
    coalesce(incident_type, 'Incident')::text,
    left(coalesce(description,''), 120)::text,
    ('/risk/incidents/' || id::text)::text,
    ts_rank(
      to_tsvector('english', coalesce(description,'') || ' ' || coalesce(incident_type,'')),
      plainto_tsquery('english', p_query)
    )::real
  FROM public.incidents
  WHERE tenant_id = p_tenant_id
    AND to_tsvector('english', coalesce(description,'') || ' ' || coalesce(incident_type,''))
        @@ plainto_tsquery('english', p_query)

  UNION ALL

  -- vendors (vendor_name + what_does_vendor_provide)
  SELECT
    'vendor'::text,
    id::text,
    vendor_name::text,
    left(coalesce(what_does_vendor_provide,''), 120)::text,
    ('/vendor/' || id::text)::text,
    ts_rank(
      to_tsvector('english', coalesce(vendor_name,'') || ' ' || coalesce(what_does_vendor_provide,'')),
      plainto_tsquery('english', p_query)
    )::real
  FROM public.vendors
  WHERE tenant_id = p_tenant_id
    AND to_tsvector('english', coalesce(vendor_name,'') || ' ' || coalesce(what_does_vendor_provide,''))
        @@ plainto_tsquery('english', p_query)

  ORDER BY score DESC
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.global_search(text, text, int) FROM public;
GRANT  EXECUTE ON FUNCTION public.global_search(text, text, int) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.global_search(text, text, int) TO service_role;

-- ─── Fix notifications RLS (remove auth.current_org_id()) ────────────────────
-- Drop and recreate only the broken policy; service_role policy is fine
DROP POLICY IF EXISTS notif_owner_all ON public.notifications;
CREATE POLICY notif_owner_all ON public.notifications
  FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── Fix executive_digests RLS (remove auth.current_org_id()) ────────────────
DROP POLICY IF EXISTS exec_digest_org_read ON public.executive_digests;
-- Allow authenticated users to read digests; service role manages writes
CREATE POLICY exec_digest_tenant_read ON public.executive_digests
  FOR SELECT
  USING (auth.role() = 'authenticated');

COMMIT;
