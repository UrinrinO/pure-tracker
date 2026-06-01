-- ============================================================
-- 005_stakeholder_tickets.sql  —  Allow Stakeholders to QA Test
-- ============================================================

-- Drop restrictive admin-only policies
drop policy if exists "Admins can manage tickets" on public.tickets;
drop policy if exists "Admins can manage ticket replies" on public.ticket_replies;
drop policy if exists "admin_read_ticket_images" on storage.objects;
drop policy if exists "admin_upload_ticket_images" on storage.objects;
drop policy if exists "admin_delete_ticket_images" on storage.objects;

-- Create inclusive policies allowing both Admins and Stakeholders (any authenticated user)
create policy "Authenticated users can manage tickets"
  on public.tickets for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "Authenticated users can manage ticket replies"
  on public.ticket_replies for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- Storage bucket policies for ticket screenshots
create policy "authenticated_read_ticket_images"
  on storage.objects for select
  using (bucket_id = 'ticket-images' and auth.role() = 'authenticated');

create policy "authenticated_upload_ticket_images"
  on storage.objects for insert
  with check (bucket_id = 'ticket-images' and auth.role() = 'authenticated');

create policy "authenticated_delete_ticket_images"
  on storage.objects for delete
  using (bucket_id = 'ticket-images' and auth.role() = 'authenticated');
