-- =====================================================================
-- TruePlanner v3 migration: feedback + high-priority deadline warnings
-- Safe to run more than once. Additive only.
-- =====================================================================

-- ---------- Feedback ----------
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('problem', 'idea', 'confusing', 'praise')),
  message text not null check (char_length(message) between 3 and 4000),
  rating smallint check (rating between 1 and 5),
  contact_ok boolean not null default false,
  email text,
  screenshot_path text,
  context jsonb not null default '{}'::jsonb,
  status text not null default 'new'
    check (status in ('new', 'reviewing', 'planned', 'done', 'wontfix')),
  created_at timestamptz not null default now()
);

create index if not exists feedback_created_idx on public.feedback (created_at desc);
create index if not exists feedback_user_idx on public.feedback (user_id, created_at desc);

alter table public.feedback enable row level security;

drop policy if exists "feedback_insert_own" on public.feedback;
create policy "feedback_insert_own" on public.feedback
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "feedback_select_own" on public.feedback;
create policy "feedback_select_own" on public.feedback
  for select to authenticated using (auth.uid() = user_id);

-- ---------- Screenshot storage (private bucket) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feedback-screenshots', 'feedback-screenshots', false, 5242880,
        array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "feedback_screenshots_insert_own" on storage.objects;
create policy "feedback_screenshots_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'feedback-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------- High-priority deadline warnings ----------
alter table public.profiles
  add column if not exists deadline_warning_minutes int not null default 15
  check (deadline_warning_minutes in (0, 5, 10, 15, 30));

alter table public.tasks
  add column if not exists deadline_warned_at timestamptz;

create index if not exists tasks_deadline_idx
  on public.tasks (user_id, end_time)
  where priority = 'high' and deadline_warned_at is null;