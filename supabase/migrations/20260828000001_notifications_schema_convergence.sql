-- 20260828000001_notifications_schema_convergence.sql
--
-- WHY: the Notifications drawer fails outright with
--
--     Could not load notifications: column notifications.notification_type does not exist
--
-- `public.notifications` was created twice, in two eras with different column
-- names, and the second CREATE is `IF NOT EXISTS` — so whichever era reached a
-- given database first silently won, and different databases ended up with
-- different shapes:
--
--   era 1  20260418000002_core_grc_tables   tenant_id, notification_type,
--                                           message, entity_type, entity_id
--   era 2  20260421000006_phase4_foundation org_id, type, body,
--                                           resource_type, resource_id, url_path
--
-- The phase-4 migration heals era-1 databases *forward* (it adds org_id,
-- url_path, resource_*), but nothing heals an era-2 database *back*. The app
-- reads era-1 names, so on an era-2 database every read throws — which is the
-- reported failure.
--
-- The application is split the same way. Readers and two of three writers use
-- era-1 names; `governance-dispatcher` writes era-2 names plus a `severity`
-- column that has never existed in either era, and does not check its insert
-- for an error, so those notifications were being dropped in silence.
--
-- FIX: converge on ONE vocabulary — the era-1 semantic names the reader already
-- uses, plus the phase-4 additions — and carry any data written under era-2
-- names across to it.
--
-- This migration is deliberately ADDITIVE ONLY. It never drops a column,
-- because we cannot see which shape a given deployment is in and a dropped
-- column is unrecoverable. Legacy era-2 columns are left in place, empty and
-- harmless, for a later cleanup once every deployment is confirmed converged.
--
-- Idempotent: re-running is a no-op.

-- 1. Ensure every column the application contract needs exists, whichever era
--    this database started in.
DO $$
BEGIN
  IF to_regclass('public.notifications') IS NULL THEN
    RAISE NOTICE 'notifications table absent; nothing to converge';
    RETURN;
  END IF;

  ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS tenant_id         text,
    ADD COLUMN IF NOT EXISTS org_id            uuid,
    ADD COLUMN IF NOT EXISTS user_id           text,
    ADD COLUMN IF NOT EXISTS title             text,
    ADD COLUMN IF NOT EXISTS message           text,
    ADD COLUMN IF NOT EXISTS notification_type text,
    ADD COLUMN IF NOT EXISTS entity_type       text,
    ADD COLUMN IF NOT EXISTS entity_id         text,
    ADD COLUMN IF NOT EXISTS is_read           boolean,
    ADD COLUMN IF NOT EXISTS read_at           timestamptz,
    ADD COLUMN IF NOT EXISTS url_path          text,
    ADD COLUMN IF NOT EXISTS created_at        timestamptz;
END $$;

-- 2. Sensible defaults, applied only where the column has none. `is_read` in
--    particular must never read NULL — an unread flag that is neither true nor
--    false makes the unread count meaningless.
DO $$
BEGIN
  IF to_regclass('public.notifications') IS NULL THEN RETURN; END IF;

  ALTER TABLE public.notifications
    ALTER COLUMN is_read           SET DEFAULT false,
    ALTER COLUMN notification_type SET DEFAULT 'info',
    ALTER COLUMN created_at        SET DEFAULT now();

  UPDATE public.notifications SET is_read    = false WHERE is_read    IS NULL;
  UPDATE public.notifications SET created_at = now() WHERE created_at IS NULL;
END $$;

-- 3. Carry across anything written under the era-2 names, so no notification is
--    lost in the convergence. Each column is copied only if it actually exists
--    on this database, and only where the canonical column is still empty —
--    canonical data always wins.
DO $$
DECLARE
  pairs  constant text[][] := ARRAY[
    ['notification_type', 'type'],
    ['message',           'body'],
    ['entity_type',       'resource_type'],
    ['entity_id',         'resource_id']
  ];
  pair   text[];
  moved  bigint;
BEGIN
  IF to_regclass('public.notifications') IS NULL THEN RETURN; END IF;

  FOREACH pair SLICE 1 IN ARRAY pairs LOOP
    CONTINUE WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'notifications'
         AND column_name = pair[2]
    );

    EXECUTE format(
      'UPDATE public.notifications SET %I = %I::text WHERE %I IS NULL AND %I IS NOT NULL',
      pair[1], pair[2], pair[1], pair[2]
    );
    GET DIAGNOSTICS moved = ROW_COUNT;
    IF moved > 0 THEN
      RAISE NOTICE 'notifications: carried % row(s) from % to %', moved, pair[2], pair[1];
    END IF;
  END LOOP;
END $$;

-- 4. Keep the two scoping columns consistent with each other. Both exist on
--    this table for historical reasons; neither is dropped here, so a row
--    written by an org_id-era writer is still visible to a tenant_id-era
--    reader and vice versa.
DO $$
BEGIN
  IF to_regclass('public.notifications') IS NULL THEN RETURN; END IF;

  UPDATE public.notifications SET tenant_id = org_id::text
   WHERE tenant_id IS NULL AND org_id IS NOT NULL;

  UPDATE public.notifications SET org_id = tenant_id::uuid
   WHERE org_id IS NULL
     AND tenant_id IS NOT NULL
     AND tenant_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
END $$;

-- 5. Proof: the exact column set the Notifications drawer selects must now be
--    present. Fails loudly rather than letting the page break again at runtime.
DO $$
DECLARE
  required constant text[] := ARRAY[
    'id', 'title', 'message', 'notification_type',
    'entity_type', 'entity_id', 'is_read', 'url_path', 'created_at'
  ];
  missing  text[];
BEGIN
  IF to_regclass('public.notifications') IS NULL THEN RETURN; END IF;

  SELECT array_agg(c) INTO missing
    FROM unnest(required) AS c
   WHERE NOT EXISTS (
     SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = c
   );

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'notifications is still missing the columns the app reads: %',
      array_to_string(missing, ', ');
  END IF;

  RAISE NOTICE 'notifications: converged — all % columns the drawer reads are present',
    array_length(required, 1);
END $$;
