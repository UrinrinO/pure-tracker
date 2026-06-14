-- ─── DOCUMENT CATEGORIES ──────────────────────────────────────
create table if not exists public.document_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  order_index int  not null default 0,
  created_at  timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.document_categories enable row level security;

-- All authenticated users can read categories
create policy "Any authenticated user can view categories"
  on public.document_categories for select
  using (auth.role() = 'authenticated');

-- Only admins can create categories
create policy "Admins can insert categories"
  on public.document_categories for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Only admins can update categories
create policy "Admins can update categories"
  on public.document_categories for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Only admins can delete categories
create policy "Admins can delete categories"
  on public.document_categories for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ─── ADD CATEGORY FK TO DOCUMENTS ─────────────────────────────
alter table public.documents
  add column if not exists category_id uuid
    references public.document_categories(id) on delete set null;
