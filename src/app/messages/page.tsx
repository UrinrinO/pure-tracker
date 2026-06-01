import { createClient } from '@/lib/supabase/server'
import MessagesClient from './MessagesClient'

const PROJECT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: comments }, { data: profile }] = await Promise.all([
    supabase
      .from('comments')
      .select('*, author:profiles(id, full_name, email, role)')
      .eq('project_id', PROJECT_ID)
      .is('task_id', null) // project-wide thread
      .order('created_at', { ascending: true }),
    supabase.from('profiles').select('id, full_name, role').eq('id', user!.id).single(),
  ])

  return (
    <MessagesClient
      initialComments={comments ?? []}
      currentUserId={user!.id}
      currentUserName={profile?.full_name ?? user!.email ?? 'User'}
      currentUserRole={profile?.role ?? 'stakeholder'}
      projectId={PROJECT_ID}
    />
  )
}
