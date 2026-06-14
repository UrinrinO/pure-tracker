-- Migration 011: Ask questions + AI content moderation tables

-- ── ask_questions ──────────────────────────────────────────────────────────
-- Stores clean, Trustee-ready questions submitted via the web app.
-- Status lifecycle: pending → answered → published (appears on /ask page)

create table if not exists ask_questions (
  id          uuid primary key default gen_random_uuid(),
  question    text not null,
  alias       text not null default 'Anonymous',
  source      text not null default 'web',
  status      text not null default 'pending'
                check (status in ('pending', 'answered', 'published', 'archived')),
  answer      text,
  answered_by uuid references auth.users(id),
  answered_at timestamptz,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at  timestamptz not null default now()
);

-- Only Trustees (authenticated users) can read/write ask_questions
alter table ask_questions enable row level security;

create policy "Trustees can manage ask_questions"
  on ask_questions for all
  to authenticated
  using (true)
  with check (true);

-- Public can read published questions (for the /ask glossary)
create policy "Public can read published questions"
  on ask_questions for select
  to anon
  using (status = 'published');


-- ── flagged_content ────────────────────────────────────────────────────────
-- Receives anything the AI classifies as FLAGGED or BLOCK.
-- Trustees review this queue and approve/dismiss each item.

create table if not exists flagged_content (
  id            uuid primary key default gen_random_uuid(),
  source_app    text not null,
  content_type  text not null,
  content       text not null,
  verdict       text not null check (verdict in ('FLAGGED', 'BLOCK')),
  reason        text,
  user_alias    text default 'Anonymous',
  reviewed      boolean not null default false,
  reviewed_by   uuid references auth.users(id),
  reviewed_at   timestamptz,
  review_action text check (review_action in ('approved', 'dismissed')),
  created_at    timestamptz not null default now()
);

-- Only authenticated Trustees can access flagged content
alter table flagged_content enable row level security;

create policy "Trustees can manage flagged_content"
  on flagged_content for all
  to authenticated
  using (true)
  with check (true);

-- Indexes for the Trustee review queue
create index flagged_content_unreviewed_idx on flagged_content (created_at desc)
  where reviewed = false;

create index ask_questions_status_idx on ask_questions (status, created_at desc);
