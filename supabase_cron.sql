-- SAENAGA Reminder v0.3
-- Scheduling is handled by Supabase Cron so Vercel Hobby does not need
-- multiple Vercel Cron jobs.
--
-- 1) Enable pg_cron and pg_net in Supabase Dashboard if needed.
-- 2) Replace the two placeholders below.
-- 3) Run this SQL in Supabase SQL Editor.
--
-- The job runs every 15 minutes. The Vercel endpoint itself decides whether
-- the current WIB time is one of the configured reminder times.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Store secrets in Supabase Vault.
-- Do NOT put the CRON_SECRET directly in the cron command.
select vault.create_secret(
  'https://YOUR-PROJECT.vercel.app',
  'saenaga_vercel_url'
);

select vault.create_secret(
  'YOUR_CRON_SECRET',
  'saenaga_cron_secret'
);

-- Remove an older job with the same name if it exists.
select cron.unschedule(jobid)
from cron.job
where jobname = 'saenaga-reminder-every-15-min';

select cron.schedule(
  'saenaga-reminder-every-15-min',
  '*/15 * * * *',
  $$
  select net.http_get(
    url := (select decrypted_secret from vault.decrypted_secrets
            where name = 'saenaga_vercel_url') || '/api/cron/check',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets
                    where name = 'saenaga_cron_secret')
    ),
    timeout_milliseconds := 10000
  ) as request_id;
  $$
);

-- Optional: inspect the job
-- select jobid, jobname, schedule, active from cron.job;
