-- ─── CREEDS ─────────────────────────────────────────────────────────────────
-- A "Creed" is either a Hymn or a Scripture passage, split verse by verse.
-- Admins add them; all authenticated users can view active ones on the dashboard.

create table if not exists public.creeds (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('hymn', 'scripture')),
  title       text not null,          -- hymn title or scripture reference e.g. "Luke 10:18-19"
  author      text,                   -- hymn author (null for scripture)
  translation text,                   -- null for hymns; "NKJV" / "KJV" / "NIV" / "ESV" for scripture
  active      boolean not null default true,
  order_index int not null default 0,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default timezone('utc'::text, now())
);

alter table public.creeds enable row level security;

-- Authenticated users see active creeds; admins see all
create policy "Authenticated users can view active creeds"
  on public.creeds for select
  using (
    auth.role() = 'authenticated'
    and (
      active = true
      or exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin'
      )
    )
  );

create policy "Admins can insert creeds"
  on public.creeds for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can update creeds"
  on public.creeds for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can delete creeds"
  on public.creeds for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ─── CREED VERSES ────────────────────────────────────────────────────────────
-- Each row is one stanza (hymn) or one verse number (scripture).

create table if not exists public.creed_verses (
  id          uuid primary key default gen_random_uuid(),
  creed_id    uuid not null references public.creeds(id) on delete cascade,
  verse_index int not null default 0,  -- display order within the creed
  verse_label text,                    -- "1" / "2" for stanzas; "18" / "19" for scripture verse numbers
  content     text not null,
  created_at  timestamptz not null default timezone('utc'::text, now())
);

alter table public.creed_verses enable row level security;

create policy "Authenticated users can view creed verses"
  on public.creed_verses for select
  using (auth.role() = 'authenticated');

create policy "Admins can insert creed verses"
  on public.creed_verses for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can update creed verses"
  on public.creed_verses for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can delete creed verses"
  on public.creed_verses for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
