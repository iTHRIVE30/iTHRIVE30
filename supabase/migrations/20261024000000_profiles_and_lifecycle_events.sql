-- Thriver sign-in and lifecycle events.
--
-- What leaves the phone is STRUCTURE ONLY: who signed up, which challenge day and level were
-- completed, purchases, and who has gone quiet. Daily habit logs, moods, notes, gratitude,
-- intentions, challenge answers and photos stay in AsyncStorage on the device.
--
-- Every row belongs to one auth user. Row level security means a Thriver can only ever
-- insert and read their own rows. Bondi Project Global reads everything from the Supabase
-- dashboard (or the service role, server side only) - never from the app.

-- ---------- profiles ----------

create table public.profiles (
  id            uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  -- Updated by the app at most once a day when it opens. pg_cron reads it for inactive_5d.
  last_seen_at  timestamptz not null default now(),
  app_version   text,
  platform      text
);

alter table public.profiles enable row level security;

create policy "Thrivers read their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "Thrivers create their own profile"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

-- Needed so the app can keep last_seen_at current. No delete policy: deleting the auth user
-- cascades instead.
create policy "Thrivers update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------- lifecycle_events ----------

create table public.lifecycle_events (
  id               bigint generated always as identity primary key,
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  event            text not null check (event in (
                     'signup_completed',
                     'day_completed',
                     'level_completed',
                     'purchase_completed',
                     'inactive_5d'
                   )),
  -- Which challenge (internal level number) and day, where the event has one.
  level            smallint,
  day              smallint,
  -- Small structural extras only (e.g. a product sku). Never answers or personal writing.
  data             jsonb not null default '{}'::jsonb,
  -- When it happened on the phone. Events queue offline and can arrive later.
  occurred_at      timestamptz not null default now(),
  received_at      timestamptz not null default now(),
  -- Generated on the phone, so a retried upload is ignored rather than counted twice.
  client_event_id  uuid,
  unique (user_id, client_event_id)
);

create index lifecycle_events_user_event_idx on public.lifecycle_events (user_id, event, occurred_at desc);
create index lifecycle_events_event_idx on public.lifecycle_events (event, occurred_at desc);

alter table public.lifecycle_events enable row level security;

create policy "Thrivers read their own events"
  on public.lifecycle_events for select to authenticated
  using (user_id = (select auth.uid()));

-- inactive_5d is written only by the scheduled job below, never by the app.
create policy "Thrivers record their own events"
  on public.lifecycle_events for insert to authenticated
  with check (user_id = (select auth.uid()) and event <> 'inactive_5d');

-- ---------- inactive_5d (pg_cron) ----------

create extension if not exists pg_cron;

-- Marks every Thriver who has not opened the app for 5 days. One row per quiet spell: a
-- Thriver who comes back and goes quiet again gets a new row, but not one every night.
create or replace function public.record_inactive_5d()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted integer;
begin
  insert into public.lifecycle_events (user_id, event, occurred_at)
  select p.id, 'inactive_5d', now()
  from public.profiles p
  where p.last_seen_at < now() - interval '5 days'
    and not exists (
      select 1 from public.lifecycle_events e
      where e.user_id = p.id
        and e.event = 'inactive_5d'
        and e.occurred_at >= p.last_seen_at
    );
  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

revoke execute on function public.record_inactive_5d() from public, anon, authenticated;

-- Every day at 02:00 UTC (midday-ish in Australia, after everyone's local day has rolled).
select cron.schedule('record-inactive-5d', '0 2 * * *', $$select public.record_inactive_5d();$$);
