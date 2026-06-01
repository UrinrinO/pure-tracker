-- ============================================================
-- 006_profiles_rls.sql  —  Loosen Profiles SELECT Policy
-- ============================================================

-- Drop restrictive select policies that block stakeholders from viewing team profiles
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;

-- Create an inclusive select policy allowing any authenticated user to view profiles
-- This is necessary for rendering author meta info in public message threads and loading the sidebar DMs list
create policy "Authenticated users can view profiles"
  on public.profiles for select
  using (auth.uid() is not null);
