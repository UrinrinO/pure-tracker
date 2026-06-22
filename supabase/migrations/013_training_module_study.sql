-- ─── TRAINING MODULE NOTES ────────────────────────────────────────────────────
-- Each module gets its own LMS-style study space: a list of personal notes, each
-- with a title and a free-form body. A module can hold many notes, kept in a
-- user-defined order.
--
-- Module completion itself already lives on public.training_modules.completed
-- (added in 012), so this migration only adds the notes table. Like every other
-- training table, it is strictly private: every policy is a self-check on
-- user_id = auth.uid(). user_id is denormalized onto each note so the RLS check
-- never has to join back to the parent module.

create table if not exists public.training_module_notes (
  id           uuid primary key default gen_random_uuid(),
  module_id    uuid not null references public.training_modules(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  title        text not null default '',
  body         text not null default '',
  order_index  int  not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.training_module_notes enable row level security;

drop policy if exists "Users manage own module notes - select" on public.training_module_notes;
drop policy if exists "Users manage own module notes - insert" on public.training_module_notes;
drop policy if exists "Users manage own module notes - update" on public.training_module_notes;
drop policy if exists "Users manage own module notes - delete" on public.training_module_notes;

create policy "Users manage own module notes - select"
  on public.training_module_notes for select using (auth.uid() = user_id);
create policy "Users manage own module notes - insert"
  on public.training_module_notes for insert with check (auth.uid() = user_id);
create policy "Users manage own module notes - update"
  on public.training_module_notes for update using (auth.uid() = user_id);
create policy "Users manage own module notes - delete"
  on public.training_module_notes for delete using (auth.uid() = user_id);

create index if not exists training_module_notes_module_idx
  on public.training_module_notes (module_id, order_index);

-- Keep updated_at fresh on every edit.
create or replace function public.touch_training_module_notes_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists training_module_notes_set_updated_at on public.training_module_notes;
create trigger training_module_notes_set_updated_at
  before update on public.training_module_notes
  for each row execute function public.touch_training_module_notes_updated_at();
