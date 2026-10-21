-- =====================================================================
-- TruePlanner v2 migration: simple to-do list + smart recovery nudges
--
-- Existing project?  Paste this whole file into the Supabase SQL editor
-- and run it once. It is safe to run more than once and keeps your data.
-- New project?       schema.sql already contains everything below.
-- =====================================================================

-- ---------------------------------------------------------------------
-- tasks: times become optional, add day / completion / checklist / repeat
-- ---------------------------------------------------------------------
alter table public.tasks alter column start_time drop not null;
alter table public.tasks alter column end_time drop not null;

alter table public.tasks add column if not exists task_date date;
alter table public.tasks add column if not exists completed_at timestamptz;
alter table public.tasks add column if not exists checklist jsonb not null default '[]'::jsonb;
alter table public.tasks add column if not exists recurrence text;
alter table public.tasks add column if not exists remind_at_start boolean not null default false;
alter table public.tasks add column if not exists reminded_at timestamptz;
alter table public.tasks add column if not exists snoozed_until timestamptz;

-- Backfill the calendar day each existing task belongs to.
update public.tasks t
   set task_date = (t.start_time at time zone coalesce(p.timezone, 'UTC'))::date
  from public.profiles p
 where p.id = t.user_id and t.task_date is null and t.start_time is not null;

update public.tasks
   set task_date = (created_at at time zone 'UTC')::date
 where task_date is null;

alter table public.tasks alter column task_date set not null;
alter table public.tasks alter column task_date set default current_date;

update public.tasks set completed_at = updated_at
 where status = 'completed' and completed_at is null;

-- The old Start / Pause / Shrunk / Moved states are gone: a task is now
-- simply to-do or completed. Anything that was in-flight is to-do again.
update public.tasks
   set status = 'not_started'
 where status in ('in_progress', 'paused', 'shrunk', 'moved', 'overdue');

do $$ begin
  alter table public.tasks
    add constraint tasks_times_together_chk
    check ((start_time is null) = (end_time is null));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.tasks
    add constraint tasks_recurrence_chk
    check (recurrence is null or recurrence in ('daily', 'weekdays', 'weekly'));
exception when duplicate_object then null; end $$;

create index if not exists tasks_user_date_idx on public.tasks (user_id, task_date);

-- ---------------------------------------------------------------------
-- tags (replace the old free-text "category")
-- ---------------------------------------------------------------------
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#65B891',
  created_at timestamptz not null default now()
);

create unique index if not exists tags_user_name_idx on public.tags (user_id, lower(name));

create table if not exists public.task_tags (
  task_id uuid not null references public.tasks(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (task_id, tag_id)
);

create index if not exists task_tags_tag_idx on public.task_tags (tag_id);

alter table public.tags enable row level security;
alter table public.task_tags enable row level security;

drop policy if exists "tags_all_own" on public.tags;
create policy "tags_all_own" on public.tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "task_tags_all_own" on public.task_tags;
create policy "task_tags_all_own" on public.task_tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Turn every distinct old category into a tag and attach it to its tasks.
insert into public.tags (user_id, name, color)
select distinct on (user_id, lower(trim(category)))
       user_id,
       trim(category),
       (array['#3F8F86','#65B891','#D9B65D','#F4B183','#C9735A','#C77D96','#8A6FB3','#6F8FB3'])
         [1 + abs(hashtext(lower(trim(category)))) % 8]
  from public.tasks
 where category is not null and trim(category) <> ''
 order by user_id, lower(trim(category))
on conflict do nothing;

insert into public.task_tags (task_id, tag_id, user_id)
select t.id, g.id, t.user_id
  from public.tasks t
  join public.tags g
    on g.user_id = t.user_id and lower(g.name) = lower(trim(t.category))
 where t.category is not null and trim(t.category) <> ''
on conflict do nothing;

-- ---------------------------------------------------------------------
-- profiles: the one new setting (gap between notifications) + the
-- "end of day prompt already shown" marker
-- ---------------------------------------------------------------------
do $$ begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'profiles'
       and column_name = 'checkin_gap_minutes'
  ) then
    alter table public.profiles
      add column checkin_gap_minutes int not null default 30
      check (checkin_gap_minutes between 10 and 240);

    -- Carry over the old sensitivity choice once.
    update public.profiles
       set checkin_gap_minutes = case checkin_sensitivity
             when 'gentle' then 60
             when 'proactive' then 15
             else 30
           end;
  end if;
end $$;

alter table public.profiles add column if not exists eod_prompted_on date;

-- ---------------------------------------------------------------------
-- checkins: store the concrete suggestion that goes with each prompt
-- ---------------------------------------------------------------------
alter table public.checkins add column if not exists suggestion jsonb;

create or replace function public.create_checkin_v2(
  p_checkin_id uuid,
  p_user_id uuid,
  p_task_id uuid,
  p_headline text,
  p_message text,
  p_source text,
  p_suggestion jsonb,
  p_gap_minutes int,
  p_daily_cap int,
  p_day_start timestamptz
)
returns setof public.checkins
language plpgsql
set search_path = public
as $$
declare
  pending_checkin public.checkins%rowtype;
begin
  if auth.uid() is distinct from p_user_id and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Not authorized to create a check-in for this user';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  -- Only ever one open suggestion at a time.
  select * into pending_checkin
    from public.checkins
   where user_id = p_user_id and status = 'pending'
   order by created_at desc
   limit 1;

  if found then
    return next pending_checkin;
    return;
  end if;

  -- Respect the user's chosen gap between notifications.
  if p_gap_minutes > 0 and exists (
    select 1 from public.checkins
     where user_id = p_user_id
       and created_at >= now() - make_interval(mins => p_gap_minutes)
  ) then
    return;
  end if;

  -- Daily safety cap.
  if (select count(*) from public.checkins
       where user_id = p_user_id and created_at >= p_day_start) >= p_daily_cap then
    return;
  end if;

  return query
  insert into public.checkins (
    id, user_id, task_id, trigger_type, headline, message, source, suggestion
  ) values (
    p_checkin_id, p_user_id, p_task_id, 'overrun', p_headline, p_message, p_source, p_suggestion
  )
  returning *;
end;
$$;

revoke all on function public.create_checkin_v2(uuid, uuid, uuid, text, text, text, jsonb, int, int, timestamptz) from public, anon;
grant execute on function public.create_checkin_v2(uuid, uuid, uuid, text, text, text, jsonb, int, int, timestamptz) to authenticated, service_role;

-- =====================================================================
-- Done.
-- =====================================================================
