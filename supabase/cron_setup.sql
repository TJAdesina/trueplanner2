-- =====================================================================
-- TruePlanner: schedule the check-in sweep (free, no extra services)
--
-- Why this exists: suggestions and start reminders must arrive even when
-- the app is closed, so something has to call /api/checkin/cron every
-- 5 minutes. Vercel's free (Hobby) plan only allows daily cron jobs, so we
-- use Supabase's built-in scheduler instead.
--
-- Before you run this:
--   1. Replace YOUR-APP-DOMAIN with your deployed domain (no https://,
--      no trailing slash), e.g. trueplanner.vercel.app
--   2. Replace YOUR_CRON_SECRET with the exact CRON_SECRET value you set
--      in your hosting environment variables.
--   3. Paste into the Supabase SQL editor and run.
--
-- The secret is stored inside the job definition, which only database
-- admins can read. Use a long random value that is used nowhere else.
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Safe to re-run: replace any previous version of the job.
select cron.unschedule('trueplanner-checkins')
 where exists (select 1 from cron.job where jobname = 'trueplanner-checkins');

select cron.schedule(
  'trueplanner-checkins',
  '*/5 * * * *',
  $$
  select net.http_get(
    url := 'https://YOUR-APP-DOMAIN/api/checkin/cron',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET'),
    timeout_milliseconds := 30000
  );
  $$
);

-- ---------------------------------------------------------------------
-- Check that it is working (run these a few minutes later):
--
--   select status, return_message, start_time
--     from cron.job_run_details
--    order by start_time desc limit 5;
--
--   select status_code, content, created
--     from net._http_response
--    order by created desc limit 5;
--
-- A healthy run returns status_code 200 and JSON such as
--   {"scanned":3,"created":0,"reminders":0,"failed":0}
-- A 401 means the secret doesn't match. A 500 usually means a missing
-- environment variable (CRON_SECRET or SUPABASE_SERVICE_ROLE_KEY).
--
-- To stop the job:  select cron.unschedule('trueplanner-checkins');
-- ---------------------------------------------------------------------
