-- SPDX-License-Identifier: Apache-2.0
-- Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
--
-- Phase 4 FTS Fix — correct column names, tenant_id scoping, ORDER BY subquery
-- Applied to Supabase as: phase4_fts_fix_v5_order_by_subquery
-- Fixes:
--   - risks.name (not title), tenant_id (not org_id)
--   - incidents.description + incident_type, tenant_id
--   - vendors.vendor_name + what_does_vendor_provide, tenant_id
--   - controls.name + description (not title)
--   - policies.title only (content is jsonb)
--   - global_search() param: p_tenant_id text (not p_org_id uuid)
--   - UNION ORDER BY wrapped in subquery (plpgsql RETURN QUERY fix)
--   - notifications RLS: auth.uid() only (removed auth.current_org_id())
--   - executive_digests RLS: authenticated SELECT (removed auth.current_org_id())

-- Drop old FTS indexes
DROP INDEX IF EXISTS public.risks_fts_idx;
DROP INDEX IF EXISTS public.incidents_fts_idx;
DROP INDEX IF EXISTS public.vendors_fts_idx;
DROP INDEX IF EXISTS public.controls_fts_idx;
DROP INDEX IF EXISTS public.policies_fts_idx;

-- Correct FTS indexes
CREATE INDEX IF NOT EXISTS risks_fts_idx
  ON public.risks USING GIN (
    to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,''))
  );
CREATE INDEX IF NOT EXISTS incidents_fts_idx
  ON public.incidents USING GIN (
    to_tsvector('english', coalesce(description,'') || ' ' || coalesce(incident_type,''))
  );
CREATE INDEX IF NOT EXISTS vendors_fts_idx
  ON public.vendors USING GIN (
    to_tsvector('english', coalesce(vendor_name,'') || ' ' || coalesce(what_does_vendor_provide,''))
  );
CREATE INDEX IF NOT EXISTS controls_fts_idx
  ON public.controls USING GIN (
    to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,''))
  );
CREATE INDEX IF NOT EXISTS policies_fts_idx
  ON public.policies USING GIN (
    to_tsvector('english', coalesce(title,''))
  );

-- Drop old signatures
DROP FUNCTION IF EXISTS public.global_search(uuid, text, int);
DROP FUNCTION IF EXISTS public.global_search(text, text, int);

-- Corrected global_search()
CREATE FUNCTION public.global_search(
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
  SELECT * FROM (
    SELECT
      'risk'::text AS resource_type,
      r.id::text   AS resource_id,
      r.name::text AS title,
      left(coalesce(r.description,''), 120)::text AS excerpt,
      ('/risk-register/' || r.id::text)::text     AS url_path,
      ts_rank(
        to_tsvector('english', coalesce(r.name,'') || ' ' || coalesce(r.description,'')),
        plainto_tsquery('english', p_query)
      )::real AS score
    FROM public.risks r
    WHERE r.tenant_id = p_tenant_id
      AND to_tsvector('english', coalesce(r.name,'') || ' ' || coalesce(r.description,''))
          @@ plainto_tsquery('english', p_query)

    UNION ALL

    SELECT
      'incident'::text,
      i.id::text,
      coalesce(i.incident_type, 'Incident')::text,
      left(coalesce(i.description,''), 120)::text,
      ('/risk/incidents/' || i.id::text)::text,
      ts_rank(
        to_tsvector('english', coalesce(i.description,'') || ' ' || coalesce(i.incident_type,'')),
        plainto_tsquery('english', p_query)
      )::real
    FROM public.incidents i
    WHERE i.tenant_id = p_tenant_id
      AND to_tsvector('english', coalesce(i.description,'') || ' ' || coalesce(i.incident_type,''))
          @@ plainto_tsquery('english', p_query)

    UNION ALL

    SELECT
      'vendor'::text,
      v.id::text,
      v.vendor_name::text,
      left(coalesce(v.what_does_vendor_provide,''), 120)::text,
      ('/vendor/' || v.id::text)::text,
      ts_rank(
        to_tsvector('english', coalesce(v.vendor_name,'') || ' ' || coalesce(v.what_does_vendor_provide,'')),
        plainto_tsquery('english', p_query)
      )::real
    FROM public.vendors v
    WHERE v.tenant_id = p_tenant_id
      AND to_tsvector('english', coalesce(v.vendor_name,'') || ' ' || coalesce(v.what_does_vendor_provide,''))
          @@ plainto_tsquery('english', p_query)
  ) sub
  ORDER BY sub.score DESC
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.global_search(text, text, int) FROM public;
GRANT  EXECUTE ON FUNCTION public.global_search(text, text, int) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.global_search(text, text, int) TO service_role;

-- Fix notifications RLS
DROP POLICY IF EXISTS notif_owner_all  ON public.notifications;
DROP POLICY IF EXISTS notif_owner_rls  ON public.notifications;
CREATE POLICY notif_owner_rls ON public.notifications
  FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Fix executive_digests RLS
DROP POLICY IF EXISTS exec_digest_org_read           ON public.executive_digests;
DROP POLICY IF EXISTS exec_digest_tenant_read        ON public.executive_digests;
DROP POLICY IF EXISTS exec_digest_authenticated_read ON public.executive_digests;
CREATE POLICY exec_digest_authenticated_read ON public.executive_digests
  FOR SELECT
  USING (auth.role() = 'authenticated');
