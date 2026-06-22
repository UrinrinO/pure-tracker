# Training Feature — Build Guide

A personal training page for the Tracker. Admins and stakeholders add the courses they're
working through (OCCA apologetics, the C.S. Lewis apologetics course, CLI, anything else),
break each one into modules they tick off as they go, and set how often they want a nudge so
the free courses don't quietly fall off the radar.

This guide describes the design and gives you the SQL plus file skeletons. You write the code;
everything here is shaped to match the conventions already in the repo (creeds feature, the
`behind-schedule` Edge Function, the existing RLS style).

## Decisions this is built on

- **Progress = courses with modules.** A course holds an ordered list of modules. You enter the
  modules up front and check them off on completion. Percent complete is derived from
  `modules completed ÷ total modules`, not stored.
- **Private to each user.** Every row is scoped to its owner with `user_id = auth.uid()`. Nobody
  sees anyone else's training, admins included. RLS enforces this at the database.
- **Reminders go out in-app + email.** Each course carries its own reminder frequency. A daily
  cron Edge Function (mirroring `behind-schedule`) inserts an in-app notification and sends a
  Resend email digest, respecting each user's `notify_email` preference.

## Data model

Two new tables, plus one tiny change to an existing CHECK constraint.

### `training_courses`

One row per course a user is taking. Reminder config lives directly on the course so each course
can have its own cadence.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `user_id` | uuid | FK → `profiles(id)`, `on delete cascade`. The owner. |
| `title` | text not null | e.g. "OCCA Apologetics — Foundations" |
| `provider` | text | Free text or a known label: "OCCA", "C.S. Lewis", "CLI", "Other" |
| `url` | text | Link to the course/login page |
| `description` | text | Optional notes |
| `status` | text not null | `not_started` \| `in_progress` \| `completed`, default `not_started` |
| `started_at` | date | Set when the user begins |
| `completed_at` | date | Set when status flips to `completed` |
| `reminder_frequency` | text not null | `none` \| `daily` \| `weekly` \| `biweekly` \| `monthly`, default `none` |
| `reminder_time` | time | Local-ish time of day to fire, default `09:00` |
| `next_reminder_at` | timestamptz | When the next nudge is due. Null = no reminder scheduled. |
| `last_reminded_at` | timestamptz | Dedup guard, like `tasks.last_alerted_at` |
| `order_index` | int not null | Display order, default 0 |
| `created_at` | timestamptz | `default now()` |
| `updated_at` | timestamptz | `default now()`, bump on update |

`next_reminder_at` is the field the cron job keys off — see the reminders section for how it's set
and advanced.

### `training_modules`

One row per module/lesson within a course. `user_id` is denormalized onto the row so the RLS
policy is a simple self-check without a join back to the parent course.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `course_id` | uuid not null | FK → `training_courses(id)`, `on delete cascade` |
| `user_id` | uuid not null | FK → `profiles(id)`, `on delete cascade`. Same owner as the course. |
| `title` | text not null | e.g. "Lecture 3: The Moral Argument" |
| `order_index` | int not null | Order within the course, default 0 |
| `completed` | boolean not null | default false |
| `completed_at` | timestamptz | Set when ticked |
| `created_at` | timestamptz | `default now()` |

### Migration — `012_training.sql`

Drop this in `apps/Tracker/supabase/migrations/`.

```sql
-- ─── TRAINING ───────────────────────────────────────────────────────────────
-- Personal learning tracker. Each user manages their own courses and modules.
-- Strictly private: every policy is a self-check on user_id = auth.uid().

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
  next_reminder_at   timestamptz,
  last_reminded_at   timestamptz,
  order_index        int  not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.training_courses enable row level security;

create policy "Users manage own courses - select"
  on public.training_courses for select using (auth.uid() = user_id);
create policy "Users manage own courses - insert"
  on public.training_courses for insert with check (auth.uid() = user_id);
create policy "Users manage own courses - update"
  on public.training_courses for update using (auth.uid() = user_id);
create policy "Users manage own courses - delete"
  on public.training_courses for delete using (auth.uid() = user_id);

-- Service role (the reminder cron) needs to read across users and write the
-- reminder bookkeeping columns. The service role key bypasses RLS, so no extra
-- policy is required for the Edge Function.

create index if not exists training_courses_user_idx
  on public.training_courses (user_id, order_index);
create index if not exists training_courses_reminder_idx
  on public.training_courses (next_reminder_at)
  where next_reminder_at is not null;

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
```

### Migration — add the notification type

The `notifications.type` column has a CHECK constraint
(`check (type in ('behind_schedule','message','mention','status'))` in `001_init.sql`). The
reminder needs a new value. Add it in the same `012` migration or a small `013`:

```sql
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('behind_schedule','message','mention','status','training_reminder'));
```

## TypeScript types

Add to `src/types/database.ts`, alongside the existing interfaces.

```ts
// Extend the notification union
export type NotificationType =
  | 'behind_schedule' | 'message' | 'mention' | 'status' | 'training_reminder'

// ─── Training ──────────────────────────────────────────────────────────────
export type CourseStatus = 'not_started' | 'in_progress' | 'completed'
export type ReminderFrequency = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly'

export interface TrainingCourse {
  id: string
  user_id: string
  title: string
  provider: string | null
  url: string | null
  description: string | null
  status: CourseStatus
  started_at: string | null
  completed_at: string | null
  reminder_frequency: ReminderFrequency
  reminder_time: string
  next_reminder_at: string | null
  last_reminded_at: string | null
  order_index: number
  created_at: string
  updated_at: string
  // computed / joined
  modules?: TrainingModule[]
  percent_complete?: number
}

export interface TrainingModule {
  id: string
  course_id: string
  user_id: string
  title: string
  order_index: number
  completed: boolean
  completed_at: string | null
  created_at: string
}
```

And register the tables in the `Database` type's `Tables` block:

```ts
training_courses: { Row: TrainingCourse; Insert: Partial<TrainingCourse>; Update: Partial<TrainingCourse> }
training_modules: { Row: TrainingModule; Insert: Partial<TrainingModule>; Update: Partial<TrainingModule> }
```

## Pages and files

Three files under `src/app/training/`, following the creeds layout exactly except that this page
is open to **both** roles (creeds is admin-only and redirects stakeholders to `/portal`).

### `src/app/training/layout.tsx`

Mirror `portal/layout.tsx` — authenticate, load the profile, pass the actual role through. Do
**not** redirect by role.

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/AppLayout'

export default async function TrainingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  return (
    <AppLayout role={profile?.role ?? 'stakeholder'} userName={profile?.full_name ?? user.email ?? 'User'}>
      {children}
    </AppLayout>
  )
}
```

### `src/app/training/page.tsx`

Server component. RLS already scopes to the current user, so you don't filter by `user_id`
yourself — just select and let the policy do its job. Derive `percent_complete` here.

```tsx
import { createClient } from '@/lib/supabase/server'
import { type TrainingCourse } from '@/types/database'
import TrainingClient from './TrainingClient'

export default async function TrainingPage() {
  const supabase = await createClient()

  const { data: courses } = await supabase
    .from('training_courses')
    .select('*, modules:training_modules(*)')
    .order('order_index', { ascending: true })

  const withProgress: TrainingCourse[] = (courses ?? []).map((c: TrainingCourse) => {
    const modules = [...(c.modules ?? [])].sort((a, b) => a.order_index - b.order_index)
    const done = modules.filter(m => m.completed).length
    return {
      ...c,
      modules,
      percent_complete: modules.length ? Math.round((done / modules.length) * 100) : 0,
    }
  })

  return <TrainingClient initialCourses={withProgress} />
}
```

### `src/app/training/TrainingClient.tsx`

The interactive part. Use `CreedsClient.tsx` as your reference for structure, styling tokens
(the navy/gold palette), and the create/edit/delete modal pattern. What it needs to do:

- **List courses** as cards: title, provider badge, a progress bar from `percent_complete`,
  status pill, and the reminder cadence ("Weekly" / "Off").
- **Add / edit a course** in a modal: title, provider, url, description, reminder frequency
  (dropdown), reminder time. On create, also let the user type the module list — one per line is
  the quickest input; split on newline and insert `training_modules` rows with incrementing
  `order_index`.
- **Tick modules.** A checkbox per module. On toggle, update `completed` + `completed_at`.
  Recompute the visible percent client-side; optimistic update is fine.
- **Auto-advance status.** When the first module is ticked, set the course to `in_progress` and
  stamp `started_at` if empty. When all modules are ticked, offer "Mark course complete" (sets
  `status='completed'`, `completed_at`, and clears `next_reminder_at` so reminders stop).
- **Set `next_reminder_at` whenever the frequency changes** — see the helper below. Saving a
  course with a non-`none` frequency should compute the first `next_reminder_at`.

Mutations use the browser client (`@/lib/supabase/client`), same as the creeds store. Keep it as
local component state or add a small Zustand store like `src/stores/creedStore.ts` if it gets
busy.

### `next_reminder_at` helper

Compute this client-side when a course is created or its frequency changes, and let the cron
advance it after each send.

```ts
function computeNextReminder(freq: ReminderFrequency, time: string): string | null {
  if (freq === 'none') return null
  const [h, m] = time.split(':').map(Number)
  const next = new Date()
  next.setHours(h, m ?? 0, 0, 0)
  if (next <= new Date()) next.setDate(next.getDate() + 1) // first fire tomorrow if today's time passed
  return next.toISOString()
}
```

The interval between fires (daily/weekly/biweekly/monthly) is applied by the cron when it advances
the field, so you only need the *first* occurrence here.

## Sidebar nav

In `src/components/Sidebar.tsx`, add a Training item to **both** `adminNav` and `stakeholderNav`.
There's a `GraduationCap` icon in lucide-react that fits:

```tsx
import { /* …existing… */ GraduationCap } from 'lucide-react'

// in adminNav and stakeholderNav, e.g. after Documents:
{ href: '/training', label: 'Training', icon: <GraduationCap size={16} /> },
```

The active-state styling is handled generically by the `navItems.map(...)` block, so no other
changes are needed.

## Reminder Edge Function

New function `apps/Tracker/supabase/functions/training-reminders/index.ts`, modeled on
`behind-schedule`. It uses the **service role key**, so it reads and writes across all users and
bypasses RLS. Schedule it daily in Supabase → Database → Cron jobs, e.g. `0 8 * * *`.

Flow:

1. Find courses where `next_reminder_at <= now()`, `reminder_frequency <> 'none'`, and
   `status <> 'completed'`.
2. For each, look up the owner's profile (`id`, `full_name`, `email`, `notify_email`).
3. Insert an in-app notification (`type: 'training_reminder'`) for the owner, linking to
   `/training`.
4. Advance `next_reminder_at` by the course's interval and stamp `last_reminded_at`.
5. Batch the due courses per user and send one Resend email digest to users with
   `notify_email = true`, reusing the HTML style from `behind-schedule`.

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const nowIso = new Date().toISOString()

  const { data: due } = await supabase
    .from('training_courses')
    .select('id, user_id, title, provider, reminder_frequency, reminder_time, next_reminder_at')
    .lte('next_reminder_at', nowIso)
    .neq('reminder_frequency', 'none')
    .neq('status', 'completed')

  if (!due?.length) {
    return new Response(JSON.stringify({ message: 'No reminders due', count: 0 }),
      { headers: { 'Content-Type': 'application/json' } })
  }

  // Owners involved
  const userIds = [...new Set(due.map(c => c.user_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, notify_email')
    .in('id', userIds)
  const profileById = new Map((profiles ?? []).map(p => [p.id, p]))

  // 1) In-app notifications
  const notifications = due.map(c => ({
    user_id: c.user_id,
    type: 'training_reminder',
    title: `📚 Keep going: ${c.title}`,
    body: `Time for your ${c.reminder_frequency} session${c.provider ? ` (${c.provider})` : ''}. Open Training to tick off your next module.`,
    link: '/training',
  }))
  await supabase.from('notifications').insert(notifications)

  // 2) Advance next_reminder_at per course
  const advance = (iso: string, freq: string) => {
    const d = new Date(iso)
    if (freq === 'daily')    d.setDate(d.getDate() + 1)
    if (freq === 'weekly')   d.setDate(d.getDate() + 7)
    if (freq === 'biweekly') d.setDate(d.getDate() + 14)
    if (freq === 'monthly')  d.setMonth(d.getMonth() + 1)
    return d.toISOString()
  }
  for (const c of due) {
    await supabase.from('training_courses')
      .update({
        next_reminder_at: advance(c.next_reminder_at!, c.reminder_frequency),
        last_reminded_at: nowIso,
      })
      .eq('id', c.id)
  }

  // 3) Email digest (one per user), reusing the behind-schedule HTML style
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (resendKey) {
    for (const uid of userIds) {
      const p = profileById.get(uid)
      if (!p?.notify_email || !p.email) continue
      const courses = due.filter(c => c.user_id === uid)
      const list = courses.map(c => `• ${c.title}${c.provider ? ` — ${c.provider}` : ''}`).join('<br/>')
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background:#0E1F3D; padding:24px; border-radius:12px;">
            <h1 style="color:#FBFAF6; font-size:18px;">📚 Time to study</h1>
            <p style="color:#C9A84C; font-size:14px;">Your scheduled training:</p>
            <div style="background:#16294a; border-radius:8px; padding:16px; margin:16px 0; color:#FBFAF6; font-size:13px;">
              ${list}
            </div>
            <a href="${Deno.env.get('APP_URL') ?? 'http://localhost:3000'}/training"
               style="display:inline-block; background:#C9A84C; color:#0E1F3D; padding:10px 20px; border-radius:8px; text-decoration:none; font-size:13px; font-weight:600;">
              Open Training →
            </a>
          </div>
        </div>`
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Pure White Tracker <tracker@urinrin.com>',
          to: [p.email],
          subject: `[Pure White] ${courses.length} training reminder(s)`,
          html,
        }),
      })
    }
  }

  return new Response(JSON.stringify({ message: 'Training reminders sent', courses: due.length }),
    { headers: { 'Content-Type': 'application/json' } })
})
```

Deploy and schedule exactly like `behind-schedule`:

```
supabase functions deploy training-reminders
# then Supabase Dashboard → Database → Cron jobs → schedule "0 8 * * *"
```

## Build order

1. Write and apply `012_training.sql` (tables + RLS) and the notification-type constraint change.
2. Add the types to `src/types/database.ts`.
3. Build `layout.tsx` → `page.tsx` → `TrainingClient.tsx` (start read-only: list + progress).
4. Add create/edit/delete + module ticking, with optimistic updates.
5. Wire `next_reminder_at` on save; add the Sidebar nav item.
6. Write, deploy, and schedule the `training-reminders` Edge Function.
7. Test end to end: add a course with three modules, tick one (status → in_progress), set it to
   `daily`, set `next_reminder_at` to a minute out, run the function manually, confirm the in-app
   notification and the email land, and confirm `next_reminder_at` advanced.

## Notes and edge cases

- **Completing a course** should clear `next_reminder_at` so a finished course stops nudging.
- **Editing modules after the fact** is fine — percent always derives from the current module set,
  so adding a module mid-course just lowers the percentage until it's ticked.
- **Time zones**: `reminder_time` is naive. The cron runs in UTC. If precise local-time delivery
  matters later, store the user's tz on `profiles` and offset when computing `next_reminder_at`.
  For a small known team this is usually fine to leave as-is at first.
- **Privacy holds across the board**: because every policy is `auth.uid() = user_id`, even an
  admin opening `/training` sees only their own courses. That's the intended behaviour per the
  decision above; if you ever want admin oversight, it'd be a deliberate added policy.
