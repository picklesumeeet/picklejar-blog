-- Scheduled maintenance jobs via pg_cron.
-- Assumes the `pg_cron` and `pg_net` extensions were enabled manually via the
-- Supabase dashboard (Database → Extensions), which is required on hosted
-- projects — the postgres role can't `CREATE EXTENSION` those itself.

------------------------------------------------------------
-- 1. Trending recompute
--
-- Every 3 hours, aggregates the last 48 hours of post_views by post_id and
-- writes a fresh row into trending_snapshots with the top 10 post ids
-- ordered by view count. The homepage reads the newest snapshot.
------------------------------------------------------------

create or replace function public.compute_trending_snapshot()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ids uuid[];
begin
  select array_agg(post_id order by view_count desc)
    into ids
  from (
    select post_id, count(*) as view_count
    from post_views
    where timestamp > now() - interval '48 hours'
    group by post_id
    order by view_count desc
    limit 10
  ) t;

  -- Only record a snapshot when there's real traffic to summarise.
  if ids is not null and array_length(ids, 1) > 0 then
    insert into trending_snapshots (post_ids) values (ids);
  end if;
end;
$$;

------------------------------------------------------------
-- 2. Cron schedules
--
-- `cron.unschedule` before `cron.schedule` makes this migration idempotent —
-- re-running it re-creates the jobs cleanly instead of stacking duplicates.
------------------------------------------------------------

-- Trending: every 3 hours on the hour.
select cron.unschedule(jobid) from cron.job where jobname = 'trending-recompute';
select cron.schedule(
  'trending-recompute',
  '0 */3 * * *',
  $$ select public.compute_trending_snapshot(); $$
);

-- Expired ads: hourly. Physically removes ads whose end_date has passed.
select cron.unschedule(jobid) from cron.job where jobname = 'expired-ads-cleanup';
select cron.schedule(
  'expired-ads-cleanup',
  '0 * * * *',
  $$ delete from ads where end_date is not null and end_date < now(); $$
);

-- Ticker refresh: daily at 6am UTC. Invokes the ticker-refresh Edge Function
-- via pg_net's async http_post. CRON_SECRET is hardcoded here — it matches
-- the value set as a Supabase function secret and is only reachable via
-- direct DB access, which requires the DB password anyway.
select cron.unschedule(jobid) from cron.job where jobname = 'ticker-refresh-daily';
select cron.schedule(
  'ticker-refresh-daily',
  '0 6 * * *',
  $$
    select net.http_post(
      url     := 'https://dvvfigfqnctvosmfphia.supabase.co/functions/v1/ticker-refresh',
      headers := jsonb_build_object(
        'Authorization', 'Bearer d895cfcc71707e37f9df635a6ff0f721c6ac9aed1979c0770ac57ebb66badc6a',
        'Content-Type',  'application/json'
      )
    );
  $$
);
