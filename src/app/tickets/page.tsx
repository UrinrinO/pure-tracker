import { createClient } from '@/lib/supabase/server'
import TicketsClient from './TicketsClient'

export default async function TicketsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: tickets }, { data: profile }, { data: admins }] = await Promise.all([
    supabase
      .from('tickets')
      .select('*, author:profiles(id, full_name, email, role), assignee:profiles(id, full_name)')
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name, role').eq('id', user!.id).single(),
    supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('role', 'admin')
      .order('full_name'),
  ])

  return (
    <TicketsClient
      initialTickets={tickets ?? []}
      currentUserId={user!.id}
      currentUserName={profile?.full_name ?? user!.email ?? 'Admin'}
      projectId="a1b2c3d4-e5f6-7890-abcd-ef1234567890" // Standard default project ID
      admins={admins ?? []}
    />
  )
}
