-- ─── DIRECT MESSAGES ──────────────────────────────────────────
create table if not exists public.direct_messages (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  body        text not null,
  is_read     boolean default false not null,
  created_at  timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.direct_messages enable row level security;

-- RLS Policies for Direct Messages
create policy "Users can read own direct messages"
  on public.direct_messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can send direct messages"
  on public.direct_messages for insert
  with check (auth.uid() = sender_id);

create policy "Receivers can update message read status"
  on public.direct_messages for update
  using (auth.uid() = receiver_id);


-- ─── DOCUMENTS METADATA ───────────────────────────────────────
create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  title       text not null,
  description text,
  file_path   text not null, -- Path inside the storage bucket
  file_size   bigint,        -- In bytes
  mime_type   text,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.documents enable row level security;

-- RLS Policies for Documents Metadata
create policy "Any authenticated user can view document metadata"
  on public.documents for select
  using (auth.role() = 'authenticated');

create policy "Admins can upload document metadata"
  on public.documents for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can update document metadata"
  on public.documents for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can delete document metadata"
  on public.documents for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );


-- ─── STORAGE BUCKET CONFIGURATION ──────────────────────────────────
-- Setup private bucket in storage.buckets
insert into storage.buckets (id, name, public)
values ('project-documents', 'project-documents', false)
on conflict (id) do nothing;

-- RLS Policies for Supabase Storage objects (storage.objects table)
create policy "authenticated_read_documents"
  on storage.objects for select
  using (bucket_id = 'project-documents' and auth.role() = 'authenticated');

create policy "admin_upload_documents"
  on storage.objects for insert
  with check (
    bucket_id = 'project-documents' and
    auth.role() = 'authenticated' and
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "admin_delete_documents"
  on storage.objects for delete
  using (
    bucket_id = 'project-documents' and
    auth.role() = 'authenticated' and
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
