# Pure White — Task Tracker App: Build Plan

**For:** Handoff to Antigravity (agentic builder)
**Prepared:** June 1, 2026
**Stack:** Next.js (App Router) + Supabase (Postgres, Auth, Realtime, Storage, Edge Functions)
**Notifications:** In-app + Email + Web Push
**Stakeholder access model:** View + Comment (admin owns task management)

---

## 1. Product summary

A lightweight task tracker with an **admin dashboard** for the Director to manage tasks/milestones, and a **stakeholder portal** where invited partners see live progress, message inside the app, and get alerted when work falls behind schedule.

Two roles only:
- **Admin** — creates/edits tasks, milestones, deadlines; invites stakeholders; sees everything.
- **Stakeholder** — read-only on tasks; can comment/message; receives notifications. Cannot edit task state.

Keep the v1 scope tight. The three "must nail" features are: (1) progress visibility, (2) behind-schedule alerts, (3) in-app messaging.

---

## 2. Core features (v1 scope)

### Admin dashboard
- Create / edit / delete **tasks** and group them under **milestones** or **workstreams**.
- Each task: title, description, owner (optional), status, start date, due date, % complete (or status-based), priority.
- Visual overview: counts by status, % complete per milestone, overdue list, upcoming-this-week list.
- Invite stakeholders by email; manage/revoke access.
- See and respond to messages/comments.

### Stakeholder portal
- Read-only progress view: milestones, tasks, status, due dates, overall % complete.
- Weekly snapshot ("what moved, what's blocked, what's coming").
- Comment on a task or post in a general project thread.
- Notification center (bell + unread badge).

### Behind-schedule detection + notifications
- A task is **behind** when `due_date < today` AND status ≠ `done`, or when a milestone's % complete is below an expected pace.
- When detected: in-app notification, email, and (if opted in) web push to the relevant audience.
- A scheduled job runs daily/weekly to evaluate and fire alerts (see §6).

### Messaging
- Two surfaces: **task-level comments** (threaded under a task) and a **project-wide thread** (general updates/announcements).
- Realtime delivery via Supabase Realtime; unread indicators per user.

---

## 3. Data model (Postgres / Supabase)

```
profiles
  id (uuid, = auth.users.id)   role: 'admin' | 'stakeholder'
  full_name, avatar_url, email, created_at
  notify_email (bool), notify_push (bool)

projects
  id, name, description, created_by, created_at
  -- v1 can be single-project; keep table for future multi-project

milestones
  id, project_id, title, description
  target_date, order_index, created_at

tasks
  id, project_id, milestone_id (nullable)
  title, description, owner_id (nullable)
  status: 'not_started' | 'in_progress' | 'blocked' | 'done'
  priority: 'low' | 'med' | 'high'
  start_date, due_date, percent_complete (int 0-100)
  created_at, updated_at

comments               -- task-level + project thread
  id, project_id, task_id (nullable -> null = project thread)
  author_id, body, created_at

notifications
  id, user_id, type ('behind_schedule' | 'message' | 'mention' | 'status')
  title, body, link, read (bool), created_at

push_subscriptions
  id, user_id, endpoint, p256dh, auth, created_at

invitations
  id, project_id, email, role, token, accepted (bool), invited_by, created_at
```

**Status → progress mapping:** either let admin set `percent_complete` directly, or derive milestone % from share of child tasks marked `done`. Recommend deriving milestone % from tasks for less manual upkeep; keep a manual override field.

---

## 4. Roles, auth & security (critical — do not skip)

- **Auth:** Supabase Auth. Email magic-link or email+password. Stakeholders enter via an invitation token tied to their email.
- **Row-Level Security (RLS):** enable on every table. This is the security backbone — Antigravity must write explicit policies, not rely on the anon key being safe.
  - `tasks`, `milestones`, `projects`: stakeholders **SELECT only**; admins full CRUD.
  - `comments`: any project member can INSERT and SELECT; UPDATE/DELETE limited to author (and admin).
  - `notifications` / `push_subscriptions`: a user can only read/write their own rows.
  - `profiles`: user reads/updates own row; admin can read all.
- **Role checks** enforced in RLS policies via a helper that reads `profiles.role` for `auth.uid()` — never trust a role passed from the client.
- Server-side actions (invites, sending email/push) run in **Edge Functions** with the service role key, never exposed to the browser.

---

## 5. App structure (Next.js App Router)

```
/app
  /(auth)/login, /invite/[token]
  /(admin)/dashboard            -- overview cards, charts
  /(admin)/tasks                -- CRUD table + create/edit modal
  /(admin)/milestones
  /(admin)/stakeholders         -- invite / manage
  /(admin)/messages
  /(portal)/overview            -- stakeholder progress view
  /(portal)/messages
  /(shared)/notifications
/components  -- TaskTable, MilestoneCard, ProgressBar, StatusBadge,
               OverdueList, CommentThread, NotificationBell, InviteForm
/lib         -- supabase client (server + browser), auth helpers, rls-safe queries
/supabase    -- migrations (SQL), edge functions
```

- Use Supabase **server components** for protected reads; **Realtime** subscriptions (client) for comments and the notification bell.
- Charts: a light lib (Recharts or Chart.js) for status breakdown + milestone progress.
- Role-based routing: middleware redirects stakeholders away from `/(admin)/*`.

---

## 6. Behind-schedule engine + notification delivery

**Detection (scheduled):**
- A **Supabase Edge Function** runs on a cron schedule (daily, e.g. 7am; plus a weekly Monday digest).
- Logic: find tasks where `due_date < today AND status != 'done'`; find milestones past `target_date` under 100%. Build a per-recipient summary.
- Write a `notifications` row per recipient; dedupe so the same overdue task doesn't re-alert daily (track "last alerted" or only alert on transition into behind state + weekly digest).

**Delivery channels:**
- **In-app:** insert into `notifications`; client subscribes via Realtime → bell badge updates live.
- **Email:** send via Resend or Postmark (simple API, good deliverability). Trigger from the Edge Function. Templates: behind-schedule alert + weekly digest.
- **Web Push:** service worker + VAPID keys; store subscriptions in `push_subscriptions`; Edge Function sends push to opted-in users. (Most setup effort — can be a fast-follow if timeline is tight.)

**Recipients:** admin always; stakeholders per their notify preferences. Weekly digest goes to all members regardless of whether anything is behind.

---

## 7. Build order (suggested for Antigravity)

1. Scaffold Next.js + Supabase, env wiring, base layout.
2. DB migrations: all tables + RLS policies. **Test RLS before building UI.**
3. Auth + invitation flow (admin invites → stakeholder accepts via token).
4. Admin task/milestone CRUD + dashboard overview.
5. Stakeholder read-only portal + progress visualization.
6. Comments / messaging (task-level + project thread) with Realtime.
7. Notification center (in-app) + bell.
8. Behind-schedule Edge Function + email digest.
9. Web push (opt-in).
10. Polish: empty states, loading, mobile responsiveness.

---

## 8. Environment / secrets checklist

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server/Edge only — never client)
- Email provider key (`RESEND_API_KEY` or Postmark token)
- Web Push `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`
- App base URL for invite/notification links

---

## 9. Acceptance criteria (definition of done for v1)

- Admin can create milestones + tasks with due dates and see an accurate overview.
- Admin can invite a stakeholder by email; stakeholder accepts and lands in the read-only portal.
- Stakeholder **cannot** edit or delete any task (verified by attempting a write — RLS blocks it).
- Comments post and appear in realtime for both roles.
- An overdue task generates an in-app notification + email; opted-in users get push.
- A weekly digest email sends on schedule.

---

## 10. Deliberately out of scope for v1 (note for later)

Multi-project switching, file attachments on tasks, Gantt/timeline view, mobile native app, granular per-stakeholder visibility (which stakeholder sees which workstream), audit log. Architect the schema so these don't require rewrites.
