-- Phase 5: Daily cleanup-videos cron job
-- Fires the cleanup-videos Edge Function every day at 03:00 ICT (= 20:00 UTC).
--
-- One-time setup required PER ENVIRONMENT before this takes effect
-- (run the snippet in supabase/snippets/configure_cleanup.sql):
--
--   alter database postgres
--     set "app.cleanup_fn_url"    = 'https://<ref>.supabase.co/functions/v1/cleanup-videos';
--   alter database postgres
--     set "app.service_role_key"  = '<your-service-role-key>';
--
-- For local dev use `supabase functions invoke cleanup-videos` instead of waiting for cron.

-- ── Extensions ────────────────────────────────────────────────────────────────
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net  with schema extensions;

-- ── Internal schema (not exposed via PostgREST) ───────────────────────────────
create schema if not exists _internal;

-- ── Wrapper function ──────────────────────────────────────────────────────────
-- Reads URL + key at call-time so secrets are never baked into the schedule SQL.
create or replace function _internal.invoke_cleanup_videos()
  returns void
  language plpgsql
  security definer
  set search_path = ''          -- guard against search_path injection
as $$
declare
  v_url text := current_setting('app.cleanup_fn_url',   true);
  v_key text := current_setting('app.service_role_key', true);
begin
  if v_url is null or v_key is null then
    raise warning
      'cleanup-videos cron: app.cleanup_fn_url or app.service_role_key not configured — skipping this run';
    return;
  end if;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body    := '{}'::jsonb
  );
end;
$$;

-- ── Schedule ─────────────────────────────────────────────────────────────────
-- '0 20 * * *'  =  20:00 UTC  =  03:00 ICT (UTC+7)
-- on conflict: if the job already exists (e.g. migration run twice), skip silently.
do $$
begin
  if not exists (
    select 1 from cron.job where jobname = 'cleanup-videos-daily'
  ) then
    perform cron.schedule(
      'cleanup-videos-daily',
      '0 20 * * *',
      $cron$ select _internal.invoke_cleanup_videos(); $cron$
    );
  end if;
end;
$$;
