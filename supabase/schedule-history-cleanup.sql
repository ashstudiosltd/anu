-- Run after the history migration, as the project database owner.
-- Enable Supabase Cron (pg_cron) in Integrations first if not enabled.
select cron.schedule('anu-history-expiry','20 3 * * *',
  $$delete from public.anu_conversations where updated_at <= now() - interval '45 days'$$);
-- Keep only this job's recent execution logs, not other projects' jobs.
select cron.schedule('anu-history-job-logs','30 3 * * *',
  $$delete from cron.job_run_details where jobid in (select jobid from cron.job where jobname in ('anu-history-expiry','anu-history-job-logs')) and end_time < now() - interval '7 days'$$);
