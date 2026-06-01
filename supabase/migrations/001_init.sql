-- ============================================================
-- 001_init.sql  —  Pure White Tracker: Full Schema + RLS
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- ─── Enable UUID extension ────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── PROFILES ────────────────────────────────────────────
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  email         text,
  avatar_url    text,
  role          text not null default 'stakeholder' check (role in ('admin','stakeholder')),
  notify_email  boolean not null default true,
  notify_push   boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── PROJECTS ────────────────────────────────────────────
create table if not exists projects (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  description text,
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now()
);

-- ─── MILESTONES ──────────────────────────────────────────
create table if not exists milestones (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references projects(id) on delete cascade,
  title       text not null,
  description text,
  target_date date,
  order_index int not null default 0,
  created_at  timestamptz not null default now()
);

-- ─── TASKS ───────────────────────────────────────────────
create table if not exists tasks (
  id                uuid primary key default uuid_generate_v4(),
  project_id        uuid not null references projects(id) on delete cascade,
  milestone_id      uuid references milestones(id) on delete set null,
  title             text not null,
  description       text,
  owner             text,                         -- free-text owner label (e.g. "BE + MOB")
  owner_id          uuid references profiles(id),  -- optional linked user
  status            text not null default 'not_started'
                      check (status in ('not_started','in_progress','blocked','done')),
  priority          text not null default 'med'
                      check (priority in ('low','med','high','critical')),
  start_date        date,
  due_date          date,
  percent_complete  int not null default 0 check (percent_complete between 0 and 100),
  task_code         text,                          -- original ID from xlsx (T01, D01, etc.)
  notes             text,
  last_alerted_at   timestamptz,                  -- dedup: avoid re-alerting same overdue task daily
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger tasks_updated_at before update on tasks
  for each row execute function update_updated_at();

-- ─── COMMENTS ────────────────────────────────────────────
create table if not exists comments (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references projects(id) on delete cascade,
  task_id     uuid references tasks(id) on delete cascade,  -- null = project-wide thread
  author_id   uuid not null references profiles(id),
  body        text not null,
  created_at  timestamptz not null default now()
);

-- ─── NOTIFICATIONS ───────────────────────────────────────
create table if not exists notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  type        text not null check (type in ('behind_schedule','message','mention','status')),
  title       text not null,
  body        text,
  link        text,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ─── PUSH SUBSCRIPTIONS ──────────────────────────────────
create table if not exists push_subscriptions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);

-- ─── INVITATIONS ─────────────────────────────────────────
create table if not exists invitations (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references projects(id) on delete cascade,
  email       text not null,
  role        text not null default 'stakeholder' check (role in ('admin','stakeholder')),
  token       uuid not null default uuid_generate_v4(),
  accepted    boolean not null default false,
  invited_by  uuid references profiles(id),
  created_at  timestamptz not null default now()
);

-- ─── HELPER: is_admin() ──────────────────────────────────
create or replace function is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ─── HELPER: is_project_member(project_id) ───────────────
create or replace function is_project_member(p_project_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from profiles where id = auth.uid()
  );
$$;

-- ─── ROW LEVEL SECURITY ──────────────────────────────────
alter table profiles          enable row level security;
alter table projects          enable row level security;
alter table milestones        enable row level security;
alter table tasks             enable row level security;
alter table comments          enable row level security;
alter table notifications     enable row level security;
alter table push_subscriptions enable row level security;
alter table invitations       enable row level security;

-- PROFILES
create policy "Users can view own profile"       on profiles for select using (auth.uid() = id);
create policy "Admins can view all profiles"     on profiles for select using (is_admin());
create policy "Users can update own profile"     on profiles for update using (auth.uid() = id);

-- PROJECTS
create policy "Any member can view projects"     on projects for select using (auth.uid() is not null);
create policy "Admins can manage projects"       on projects for all using (is_admin());

-- MILESTONES
create policy "Any member can view milestones"   on milestones for select using (auth.uid() is not null);
create policy "Admins can manage milestones"     on milestones for all using (is_admin());

-- TASKS
create policy "Any member can view tasks"        on tasks for select using (auth.uid() is not null);
create policy "Admins can manage tasks"          on tasks for all using (is_admin());

-- COMMENTS
create policy "Any member can view comments"     on comments for select using (auth.uid() is not null);
create policy "Any member can post comments"     on comments for insert with check (auth.uid() = author_id);
create policy "Author or admin can delete"       on comments for delete using (auth.uid() = author_id or is_admin());

-- NOTIFICATIONS
create policy "Users see own notifications"      on notifications for select using (auth.uid() = user_id);
create policy "Users can update own notifs"      on notifications for update using (auth.uid() = user_id);
create policy "Service role inserts notifs"      on notifications for insert with check (true);

-- PUSH SUBSCRIPTIONS
create policy "Users manage own push subs"       on push_subscriptions for all using (auth.uid() = user_id);

-- INVITATIONS (only admins + Edge Functions via service role)
create policy "Admins can manage invitations"    on invitations for all using (is_admin());
create policy "Anyone can view invite by token"  on invitations for select using (true);

-- ─── OVERDUE TASKS HELPER FUNCTION ───────────────────────
create or replace function get_overdue_tasks(p_project_id uuid)
returns setof tasks language sql security definer stable as $$
  select * from tasks
  where project_id = p_project_id
    and due_date < current_date
    and status != 'done';
$$;

-- ─── REALTIME ────────────────────────────────────────────
-- Enable Realtime on comments and notifications in the Supabase dashboard:
-- Database → Replication → enable for: comments, notifications
