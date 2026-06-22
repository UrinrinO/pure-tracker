-- ─── TRAINING ───────────────────────────────────────────────────────────────
-- Personal learning tracker. Each user manages their own courses and modules.
-- Strictly private: every policy is a self-check on user_id = auth.uid().
-- Admins and stakeholders both use this page; nobody (admins included) sees
-- anyone else's training.

create table if not exists public.training_courses (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  title              text not null,
  provider           text,
  url                text,
  description        text,
  status             text not null default 'not_started'
                       check (status in ('not_started','in_progress','completed')),
  started_at         date,
  completed_at       date,
  reminder_frequency text not null default 'none'
                       check (reminder_frequency in ('none','daily','weekly','biweekly','monthly')),
  reminder_time      time not null default '09:00',
  reminder_dow       smallint check (reminder_dow between 0 and 6),   -- 0=Sun..6=Sat, for weekly/biweekly
  reminder_dom       smallint check (reminder_dom between 1 and 31),  -- day of month, for monthly
  next_reminder_at   timestamptz,
  last_reminded_at   timestamptz,
  order_index        int  not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Backfill the reminder anchor columns in case an earlier version of this
-- migration created the table before they existed.
alter table public.training_courses
  add column if not exists reminder_dow smallint,
  add column if not exists reminder_dom smallint;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'training_courses_reminder_dow_check') then
    alter table public.training_courses
      add constraint training_courses_reminder_dow_check check (reminder_dow between 0 and 6);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'training_courses_reminder_dom_check') then
    alter table public.training_courses
      add constraint training_courses_reminder_dom_check check (reminder_dom between 1 and 31);
  end if;
end $$;

alter table public.training_courses enable row level security;

drop policy if exists "Users manage own courses - select" on public.training_courses;
drop policy if exists "Users manage own courses - insert" on public.training_courses;
drop policy if exists "Users manage own courses - update" on public.training_courses;
drop policy if exists "Users manage own courses - delete" on public.training_courses;

create policy "Users manage own courses - select"
  on public.training_courses for select using (auth.uid() = user_id);
create policy "Users manage own courses - insert"
  on public.training_courses for insert with check (auth.uid() = user_id);
create policy "Users manage own courses - update"
  on public.training_courses for update using (auth.uid() = user_id);
create policy "Users manage own courses - delete"
  on public.training_courses for delete using (auth.uid() = user_id);

-- The reminder cron uses the service role key, which bypasses RLS, so no
-- additional cross-user policy is required for the Edge Function.

create index if not exists training_courses_user_idx
  on public.training_courses (user_id, order_index);
create index if not exists training_courses_reminder_idx
  on public.training_courses (next_reminder_at)
  where next_reminder_at is not null;

-- ─── TRAINING MODULES ─────────────────────────────────────────────────────────
-- One row per module / lesson within a course. user_id is denormalized so the
-- RLS policy is a simple self-check without joining back to the parent course.

create table if not exists public.training_modules (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid not null references public.training_courses(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  title        text not null,
  order_index  int  not null default 0,
  completed    boolean not null default false,
  completed_at timestamptz,
  created_at   timestamptz not null default now()
);

alter table public.training_modules enable row level security;

drop policy if exists "Users manage own modules - select" on public.training_modules;
drop policy if exists "Users manage own modules - insert" on public.training_modules;
drop policy if exists "Users manage own modules - update" on public.training_modules;
drop policy if exists "Users manage own modules - delete" on public.training_modules;

create policy "Users manage own modules - select"
  on public.training_modules for select using (auth.uid() = user_id);
create policy "Users manage own modules - insert"
  on public.training_modules for insert with check (auth.uid() = user_id);
create policy "Users manage own modules - update"
  on public.training_modules for update using (auth.uid() = user_id);
create policy "Users manage own modules - delete"
  on public.training_modules for delete using (auth.uid() = user_id);

create index if not exists training_modules_course_idx
  on public.training_modules (course_id, order_index);

-- ─── NOTIFICATION TYPE ──────────────────────────────────────────────────────
-- Allow the training reminder notification type.

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('behind_schedule','message','mention','status','training_reminder'));
