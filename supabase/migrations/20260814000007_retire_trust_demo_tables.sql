-- Retire the doc-jsonb demo tables the trust-engine pages were rewired off of.
-- Zero code references remain (verified). Data was fabricated seed content.
-- Applied live via Supabase MCP on 2026-08-14.
drop table if exists public.trustenginedashboard_table;
drop table if exists public.guardrailactivity_table;
drop table if exists public.livetracefeed_table;
drop table if exists public.fallbacklog_table;
drop table if exists public.trustconfig_table;
