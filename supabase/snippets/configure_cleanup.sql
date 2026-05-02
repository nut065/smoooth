-- One-time configuration for the cleanup-videos cron job.
-- Run this in the Supabase SQL editor (or via psql) once per environment.
-- Never commit real keys — fill in the values from `supabase status` (local)
-- or the Supabase dashboard → Project Settings → API (production).

-- ── Local dev (supabase start) ────────────────────────────────────────────────
alter database postgres
  set "app.cleanup_fn_url"   = 'http://127.0.0.1:54321/functions/v1/cleanup-videos';

alter database postgres
  set "app.service_role_key" = '<service_role_key from supabase status>';

-- ── Production (replace with your real values) ───────────────────────────────
-- alter database postgres
--   set "app.cleanup_fn_url"   = 'https://<project_ref>.supabase.co/functions/v1/cleanup-videos';
-- alter database postgres
--   set "app.service_role_key" = '<production service_role_key>';

-- ── Verify ───────────────────────────────────────────────────────────────────
-- After running the above, confirm with:
-- select current_setting('app.cleanup_fn_url'), current_setting('app.service_role_key');

-- ── Dry-run test ─────────────────────────────────────────────────────────────
-- Alternatively, invoke directly from the CLI without touching the DB at all:
--   supabase functions invoke cleanup-videos --data '{}'
--   supabase functions invoke cleanup-videos --data '{}' -- append ?dry_run=true via URL if supported
