-- ============================================================
-- 002_seed.sql  —  Pure White Phase 1 Data Seed
-- Run AFTER 001_init.sql and after creating admin user in Auth
-- Replace the project_id UUID below after running the INSERT project
-- ============================================================

-- ── Insert project ─────────────────────────────────────────
insert into projects (id, name, description)
values (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Pure White',
  'Phase 1 Foundation Build — Months 1–4, Weeks 1–16. A safe, anonymous Christian wellbeing platform.'
) on conflict (id) do nothing;

-- Shorthand

-- ── Milestones (one per month) ────────────────────────────
insert into milestones (id, project_id, title, description, target_date, order_index) values
  ('10000001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Month 1 — Foundation',      'AWS infra · Auth service · DB schema · Project scaffolds · Design system',                                                   '2026-06-30', 1),
  ('10000001-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Month 2 — Core Features',   'Registration flow · AP system · Content safety pipeline · Prayer & Scripture libraries · Mood log',                         '2026-07-31', 2),
  ('10000001-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Month 3 — Advanced Features','Trustee Board · AP Help Requests · E2EE messaging · AP weekly reports · SOS Panic button · Progress tracker',              '2026-08-31', 3),
  ('10000001-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Month 4 — QA & Launch Prep','E2E testing · Security review · App Store prep · Beta testing · Documentation · Launch readiness',                          '2026-09-30', 4)
on conflict (id) do nothing;

-- ── Tasks from Task List sheet ────────────────────────────
-- status mapping: "Not Started" → not_started, "In Progress" → in_progress, "Blocked" → blocked, "Done" → done
-- priority mapping: "Critical" → critical, "High" → high, "Medium" → med, "Low" → low

insert into tasks (task_code, project_id, milestone_id, title, owner, priority, status, start_date, due_date, notes) values

-- ── MONTH 1 — Foundation (Weeks 1–4: ~2026-06-01 to 2026-06-28) ──
('T01', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000001', 'AWS infrastructure setup (VPC, ALB, multi-region)',        'BE',        'critical', 'not_started', '2026-06-01', '2026-06-14', 'Multi-region for GDPR compliance'),
('T02', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000001', 'PostgreSQL + Redis setup (encrypted at rest)',              'BE',        'critical', 'not_started', '2026-06-01', '2026-06-14', 'AES-256-GCM; separate email hash table'),
('T03', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000001', 'CI/CD pipeline (GitHub Actions + Snyk)',                   'BE',        'high',     'not_started', '2026-06-01', '2026-06-14', 'Automated security scanning from Day 1'),
('T04', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000001', 'Auth service (JWT, UUID, email hash, role model)',         'BE',        'critical', 'not_started', '2026-06-08', '2026-06-21', 'Anonymous-first; email SHA-256 hashed'),
('T05', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000001', 'API gateway + rate limiting',                              'BE',        'high',     'not_started', '2026-06-08', '2026-06-21', 'Protect all endpoints from abuse'),
('T06', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000001', 'React Native project scaffold (iOS + Android)',            'MOB',       'critical', 'not_started', '2026-06-01', '2026-06-14', 'Expo or bare RN with navigation shell'),
('T07', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000001', 'Design system + component library (Figma → code)',         'DES + FE',  'high',     'not_started', '2026-06-01', '2026-06-21', 'Tokens, typography, dark/light mode'),
('T08', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000001', 'Web admin dashboard scaffold (Next.js)',                   'FE',        'high',     'not_started', '2026-06-08', '2026-06-28', 'Auth-gated; Trustee Board views'),
('T09', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000001', 'QA test framework setup (Detox / Playwright)',             'QA',        'high',     'not_started', '2026-06-15', '2026-06-28', 'E2E from Week 2; security scans integrated'),
('T10', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000001', 'Monitoring + alerting (CloudWatch / Sentry)',              'BE',        'med',      'not_started', '2026-06-15', '2026-06-28', 'Error budgets; PagerDuty on-call'),

-- ── MONTH 2 — Core Features (Weeks 5–8: ~2026-07-01 to 2026-07-28) ──
('T11', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000002', 'Registration flow (anon UUID + alias, no real name)',      'MOB + BE',  'critical', 'not_started', '2026-07-01', '2026-07-14', 'No PII stored; alias self-chosen'),
('T12', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000002', 'Login / session management (biometric + PIN fallback)',    'MOB + BE',  'critical', 'not_started', '2026-07-01', '2026-07-14', 'Face ID / Touch ID; encrypted keychain'),
('T13', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000002', 'AP invite flow (up to 5 APs, per-AP sharing toggles)',    'MOB + BE',  'critical', 'not_started', '2026-07-01', '2026-07-21', 'Per-AP granular share controls'),
('T14', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000002', 'AP sharing preferences UI',                               'MOB + FE',  'high',     'not_started', '2026-07-08', '2026-07-21', 'Toggle per data category per AP'),
('T15', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000002', 'Content safety pipeline (5-stage sanitisation)',          'BE + AI',   'critical', 'not_started', '2026-07-01', '2026-07-28', 'Must pass before AP reports enabled'),
('T16', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000002', 'AI content moderation model (fine-tuned)',                'AI',        'critical', 'not_started', '2026-07-01', '2026-07-28', 'Christian-context sensitivity'),
('T17', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000002', 'Prayer library (100 prayers, 3 categories)',              'FE + DES',  'high',     'not_started', '2026-07-08', '2026-07-28', 'Trustee-reviewed before publish'),
('T18', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000002', 'Scripture library (300 key verses, semantic search)',     'FE + BE',   'high',     'not_started', '2026-07-08', '2026-07-28', 'Mood-matched verse recommender'),
('T19', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000002', 'Scripture recommender (embeddings / vector search)',      'AI',        'high',     'not_started', '2026-07-15', '2026-07-28', 'pgvector; mood → verse mapping'),
('T20', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000002', 'Mood log UI + data model',                                'MOB + FE',  'high',     'not_started', '2026-07-15', '2026-07-28', 'Mood journal; private by default'),

-- ── MONTH 3 — Advanced Features (Weeks 9–12: ~2026-08-01 to 2026-08-28) ──
('T21', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000003', 'Trustee Board dashboard (web admin)',                     'FE + BE',   'high',     'not_started', '2026-08-01', '2026-08-14', 'Admin-only routes; role-based access'),
('T22', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000003', 'AP help-request flow + Trustee review queue',             'MOB + BE',  'high',     'not_started', '2026-08-01', '2026-08-14', 'Request → review → respond workflow'),
('T23', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000003', 'E2EE messaging (Signal Protocol, AP ↔ user)',            'BE',        'critical', 'not_started', '2026-08-01', '2026-08-28', 'No server-readable messages'),
('T24', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000003', 'AP weekly report (auto-generated + curated)',             'BE + FE',   'high',     'not_started', '2026-08-08', '2026-08-21', 'Pass through safety pipeline first'),
('T25', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000003', 'SOS / Panic button (worship + scripture + AP alert)',    'MOB + BE',  'critical', 'not_started', '2026-08-08', '2026-08-21', 'Worship auto-plays; AP alert deliberate'),
('T26', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000003', 'Progress tracker + streak (opt-in only)',                 'MOB',       'med',      'not_started', '2026-08-15', '2026-08-28', 'Streak strictly opt-in; never front-and-centre'),
('T27', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000003', 'Push notification service (FCM + APNs)',                  'MOB + BE',  'high',     'not_started', '2026-08-01', '2026-08-21', 'Encrypted payload; opt-in prompts'),
('T28', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000003', 'AP in-app messaging UI (read + compose)',                 'MOB',       'high',     'not_started', '2026-08-15', '2026-08-28', 'E2EE wire; no message preview in notif'),

-- ── MONTH 4 — QA & Launch Prep (Weeks 13–16: ~2026-09-01 to 2026-09-28) ──
('T29', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000004', 'End-to-end test suite (Detox + Playwright)',              'QA',        'critical', 'not_started', '2026-09-01', '2026-09-14', 'All critical user journeys covered'),
('T30', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000004', 'Penetration test + security review',                     'QA + BE',   'critical', 'not_started', '2026-09-01', '2026-09-14', 'OWASP top 10; third-party pentest'),
('T31', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000004', 'Performance testing + load testing',                     'QA + BE',   'high',     'not_started', '2026-09-01', '2026-09-14', '10k concurrent users baseline'),
('T32', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000004', 'App Store submission prep (iOS + Android)',               'MOB',       'critical', 'not_started', '2026-09-08', '2026-09-21', 'Privacy labels; content rating; metadata'),
('T33', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000004', 'Beta programme (TestFlight + Play Store internal)',       'QA + MOB',  'high',     'not_started', '2026-09-08', '2026-09-21', 'Closed beta: 20–50 trusted testers'),
('T34', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000004', 'Technical documentation (API + architecture)',            'BE',        'med',      'not_started', '2026-09-01', '2026-09-28', 'Docs site; Swagger for API'),
('T35', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000004', 'User documentation + onboarding copy',                   'DES + URI', 'med',      'not_started', '2026-09-08', '2026-09-28', 'In-app tooltips + help centre'),
('T36', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000004', 'GDPR / data privacy review + DPA',                       'URI + BE',  'critical', 'not_started', '2026-09-01', '2026-09-21', 'DPA signed; privacy policy live'),
('T37', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000004', 'Launch readiness review + sign-off',                     'URI',       'critical', 'not_started', '2026-09-22', '2026-09-30', 'All critical items green before go-live'),

-- ── DELIVERABLES (D-series from Phase 1 Overview sheet) ──
('D01', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000001', 'Anonymous account registration (UUID + alias)',           'BE + MOB',  'critical', 'not_started', '2026-06-01', '2026-06-30', 'No real name; email SHA-256 hashed'),
('D02', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000003', 'System Trustee Board dashboard & vetting workflow',       'FE + BE',   'high',     'not_started', '2026-08-01', '2026-08-31', 'Admin-only routes; role-based access'),
('D03', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000002', 'AP system: invite flow & sharing preferences',           'MOB + BE',  'critical', 'not_started', '2026-07-01', '2026-07-31', 'Per-AP sharing toggles; up to 5 APs'),
('D04', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000002', 'Content safety pipeline (5-stage sanitisation)',         'BE + AI',   'critical', 'not_started', '2026-07-01', '2026-07-31', 'Must pass before AP reports enabled'),
('D05', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000003', 'Panic/SOS button (worship + scripture + AP alert)',      'MOB + BE',  'critical', 'not_started', '2026-08-01', '2026-08-31', 'Worship auto-plays; AP alert is deliberate'),
('D06', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000002', 'Prayer library (100 prayers, 3 categories)',             'FE + DES',  'high',     'not_started', '2026-07-01', '2026-07-31', 'Trustee-reviewed before publish'),
('D07', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000002', 'Scripture library (300 key verses, searchable)',         'FE + BE',   'high',     'not_started', '2026-07-01', '2026-07-31', 'Semantic search; mood-matched verses'),
('D08', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000003', 'Progress tracker (streak OFF by default, mood log)',     'MOB',       'med',      'not_started', '2026-08-01', '2026-08-31', 'Streak strictly opt-in; never front-and-centre'),
('D09', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000001', 'iOS + Android apps (React Native)',                      'MOB',       'critical', 'not_started', '2026-06-01', '2026-06-30', 'Expo-managed or bare; both stores'),
('D10', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000003', 'E2EE messaging (Signal Protocol)',                       'BE',        'critical', 'not_started', '2026-08-01', '2026-08-31', 'No server-readable messages'),
('D11', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000003', 'AP weekly report (automated + safe)',                    'BE + FE',   'high',     'not_started', '2026-08-01', '2026-08-31', 'Pass through safety pipeline'),
('D12', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000004', 'Beta programme (TestFlight + Play Store internal)',       'QA + MOB',  'high',     'not_started', '2026-09-01', '2026-09-30', 'Closed beta; 20–50 testers'),
('D13', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000004', 'App Store submission (iOS + Android)',                   'MOB',       'critical', 'not_started', '2026-09-01', '2026-09-30', 'Privacy labels; age rating; metadata'),
('D14', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000004', 'GDPR / data privacy compliance + DPA',                  'URI + BE',  'critical', 'not_started', '2026-09-01', '2026-09-30', 'DPA signed; privacy policy live'),

-- ── GANTT tasks (T38–T52 from Gantt Chart sheet) ──────────
('T38', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000001', 'Figma design handoff & component tokens',               'DES',       'high',     'not_started', '2026-06-01', '2026-06-14', 'Colour, type, spacing tokens exported'),
('T39', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000001', 'Database schema v1 (all tables + indexes)',             'BE',        'critical', 'not_started', '2026-06-01', '2026-06-14', 'Including encrypted email hash table'),
('T40', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000002', 'Mood check-in UI (daily prompt, categories)',           'MOB + DES', 'high',     'not_started', '2026-07-15', '2026-07-28', 'Gentle; not gamified'),
('T41', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000002', 'AP dashboard (web view of shared data)',                'FE + BE',   'high',     'not_started', '2026-07-15', '2026-07-28', 'Read-only; respects sharing toggles'),
('T42', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000003', 'In-app notification system (bell + feed)',              'MOB + BE',  'med',      'not_started', '2026-08-01', '2026-08-14', 'Digest mode option'),
('T43', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000003', 'AP report generation cron job',                        'BE',        'high',     'not_started', '2026-08-08', '2026-08-21', 'Weekly; safety-checked before delivery'),
('T44', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000003', 'Biometric re-auth for sensitive screens',              'MOB',       'high',     'not_started', '2026-08-01', '2026-08-21', 'Panic screen, messaging, AP data'),
('T45', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000004', 'Accessibility audit (WCAG 2.1 AA)',                    'QA + DES',  'high',     'not_started', '2026-09-01', '2026-09-14', 'Screen reader + contrast checks'),
('T46', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000004', 'Data export / account deletion flow',                  'BE + MOB',  'critical', 'not_started', '2026-09-01', '2026-09-14', 'GDPR right to erasure; full data export'),
('T47', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000004', 'Content moderation review process (Trustee)',          'URI + QA',  'high',     'not_started', '2026-09-08', '2026-09-28', 'Final review of all library content'),
('T48', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000004', 'Crash + error monitoring (Sentry live)',               'BE + MOB',  'high',     'not_started', '2026-09-08', '2026-09-21', 'Alerts set up; dashboards ready'),
('T49', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000004', 'Infrastructure scaling review',                        'BE',        'high',     'not_started', '2026-09-15', '2026-09-28', 'Auto-scaling configured; cost review'),
('T50', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000004', 'Go-live cutover plan + rollback procedure',            'BE + URI',  'critical', 'not_started', '2026-09-22', '2026-09-30', 'DNS, CDN, zero-downtime deploy'),
('T51', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000004', 'Stakeholder demo + sign-off presentation',             'URI',       'high',     'not_started', '2026-09-22', '2026-09-30', 'All workstreams present'),
('T52', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000004', 'Phase 1 sign-off review',                              'URI',       'critical', 'not_started', '2026-09-29', '2026-09-30', 'Final go / no-go decision')

on conflict do nothing;
