-- ─── TICKET TYPES & STATUSES ─────────────────────────────────
create type public.ticket_type as enum ('bug', 'update', 'query');
create type public.ticket_status as enum ('open', 'in_progress', 'resolved', 'closed');

-- ─── TICKETS TABLE ───────────────────────────────────────────
create table if not exists public.tickets (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text not null,
  type        public.ticket_type not null default 'bug',
  status      public.ticket_status not null default 'open',
  image_path  text, -- Path in Supabase Storage bucket 'ticket-images'
  created_by  uuid not null references public.profiles(id) on delete cascade,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at  timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ─── TICKET REPLIES TABLE ────────────────────────────────────
create table if not exists public.ticket_replies (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.tickets(id) on delete cascade,
  author_id   uuid not null references public.profiles(id) on delete cascade,
  body        text not null,
  created_at  timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.tickets enable row level security;
alter table public.ticket_replies enable row level security;

-- Postgres RLS Policies (strictly restricted to admins!)
create policy "Admins can manage tickets"
  on public.tickets for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can manage ticket replies"
  on public.ticket_replies for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );


-- ─── STORAGE BUCKET CONFIGURATION ──────────────────────────────────
-- Setup private bucket for ticket screenshots
insert into storage.buckets (id, name, public)
values ('ticket-images', 'ticket-images', false)
on conflict (id) do nothing;

-- RLS Policies for Supabase Storage objects (storage.objects table)
create policy "admin_read_ticket_images"
  on storage.objects for select
  using (
    bucket_id = 'ticket-images' and
    auth.role() = 'authenticated' and
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "admin_upload_ticket_images"
  on storage.objects for insert
  with check (
    bucket_id = 'ticket-images' and
    auth.role() = 'authenticated' and
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "admin_delete_ticket_images"
  on storage.objects for delete
  using (
    bucket_id = 'ticket-images' and
    auth.role() = 'authenticated' and
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
