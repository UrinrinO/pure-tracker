import { createClient } from '@/lib/supabase/server'
import DocumentsClient from '../../documents/DocumentsClient'

const PROJECT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

export default async function PortalDocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: documents }, { data: profile }] = await Promise.all([
    supabase
      .from('documents')
      .select('*, author:profiles(id, full_name, email, role)')
      .eq('project_id', PROJECT_ID)
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name, role').eq('id', user!.id).single(),
  ])

  return (
    <DocumentsClient
      initialDocuments={documents ?? []}
      currentUserId={user!.id}
      currentUserRole={profile?.role ?? 'stakeholder'}
      projectId={PROJECT_ID}
    />
  )
}
