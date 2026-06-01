import { createClient } from '@/lib/supabase/server'
import TasksClient from './TasksClient'

const PROJECT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: tasks }, { data: milestones }, { data: profile }] = await Promise.all([
    supabase
      .from('tasks')
      .select('*, milestone:milestones(id,title)')
      .eq('project_id', PROJECT_ID)
      .order('due_date', { nullsFirst: false }),
    supabase
      .from('milestones')
      .select('id, title, order_index')
      .eq('project_id', PROJECT_ID)
      .order('order_index'),
    supabase.from('profiles').select('role').eq('id', user!.id).single(),
  ])

  return (
    <TasksClient
      initialTasks={tasks ?? []}
      milestones={milestones ?? []}
      projectId={PROJECT_ID}
      currentUserRole={(profile?.role || 'stakeholder') as 'admin' | 'stakeholder'}
    />
  )
}
