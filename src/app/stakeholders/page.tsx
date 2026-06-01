import { createClient } from '@/lib/supabase/server'
import StakeholdersClient from './StakeholdersClient'

const PROJECT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

export default async function StakeholdersPage() {
  const supabase = await createClient()

  const [{ data: stakeholders }, { data: invitations }] = await Promise.all([
    supabase.from('profiles').select('*').eq('role', 'stakeholder').order('created_at'),
    supabase.from('invitations').select('*').eq('project_id', PROJECT_ID).order('created_at', { ascending: false }),
  ])

  return (
    <StakeholdersClient
      stakeholders={stakeholders ?? []}
      invitations={invitations ?? []}
      projectId={PROJECT_ID}
    />
  )
}
