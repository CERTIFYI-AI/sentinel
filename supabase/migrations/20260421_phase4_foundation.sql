-- Licensed to Apache-2.0.
-- Phase 4 foundation: org_id enforcement + webhook delivery tables.
BEGIN;

-- webhook_deliveries already handled by WS8 migration.
-- This migration adds any missing indexes + utility functions.

-- Full-text search indexes for D-01 federated search
CREATE INDEX IF NOT EXISTS risks_fts_idx         ON public.risks         USING GIN (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'')));
CREATE INDEX IF NOT EXISTS incidents_fts_idx     ON public.incidents     USING GIN (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'')));
CREATE INDEX IF NOT EXISTS vendors_fts_idx       ON public.vendors       USING GIN (to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'')));
CREATE INDEX IF NOT EXISTS controls_fts_idx      ON public.controls      USING GIN (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'')));
CREATE INDEX IF NOT EXISTS policies_fts_idx      ON public.policies      USING GIN (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,'')));

-- Unified global search function
CREATE OR REPLACE FUNCTION public.global_search(
  p_org_id uuid,
  p_query  text,
  p_limit  int DEFAULT 20
)
RETURNS TABLE (
  resource_type text,
  resource_id   text,
  title         text,
  excerpt       text,
  url_path      text,
  score         real
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT 'risk'::text, id::text, title,
         left(description, 120), '/risk-register/' || id::text,
         ts_rank(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'')), plainto_tsquery('english', p_query))
  FROM public.risks WHERE org_id = p_org_id
    AND to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'')) @@ plainto_tsquery('english', p_query)
  UNION ALL
  SELECT 'incident', id::text, title,
         left(description, 120), '/risk/incidents/' || id::text,
         ts_rank(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'')), plainto_tsquery('english', p_query))
  FROM public.incidents WHERE org_id = p_org_id
    AND to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'')) @@ plainto_tsquery('english', p_query)
  UNION ALL
  SELECT 'vendor', id::text, name,
         left(description, 120), '/vendor/' || id::text,
         ts_rank(to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'')), plainto_tsquery('english', p_query))
  FROM public.vendors WHERE org_id = p_org_id
    AND to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'')) @@ plainto_tsquery('english', p_query)
  ORDER BY score DESC
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.global_search(uuid,text,int) FROM public;
GRANT EXECUTE ON FUNCTION public.global_search(uuid,text,int) TO authenticated;

-- notifications table (N-14 fix)
CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  title       text NOT NULL,
  body        text NOT NULL,
  type        text NOT NULL DEFAULT 'info' CHECK (type IN ('info','warning','error','success')),
  resource_type text,
  resource_id text,
  url_path    text,
  is_read     boolean NOT NULL DEFAULT false,
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notif_user_unread_idx ON public.notifications (user_id, org_id, is_read, created_at DESC);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notif_owner_all ON public.notifications FOR ALL USING (user_id = auth.uid() AND org_id = auth.current_org_id()) WITH CHECK (user_id = auth.uid() AND org_id = auth.current_org_id());
CREATE POLICY notif_svc_all   ON public.notifications FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- executive_digests table (N-11 fix)
CREATE TABLE IF NOT EXISTS public.executive_digests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  content      text NOT NULL,
  model_used   text NOT NULL DEFAULT 'gpt-4o',
  token_count  int,
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL DEFAULT now() + interval '2 hours'
);
CREATE INDEX IF NOT EXISTS exec_digest_org_latest ON public.executive_digests (org_id, generated_at DESC);
ALTER TABLE public.executive_digests ENABLE ROW LEVEL SECURITY;
CREATE POLICY exec_digest_org_read ON public.executive_digests FOR SELECT USING (org_id = auth.current_org_id());
CREATE POLICY exec_digest_svc_all  ON public.executive_digests FOR ALL   USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- trend_direction column on risks (N-13 fix)
ALTER TABLE public.risks ADD COLUMN IF NOT EXISTS trend_direction text CHECK (trend_direction IN ('improving','worsening','stable','new'));
ALTER TABLE public.risks ADD COLUMN IF NOT EXISTS trend_delta numeric(5,2);

COMMIT;
