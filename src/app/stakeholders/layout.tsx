import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/AppLayout'

export default async function StakeholdersLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  const role = (profile?.role || 'stakeholder') as 'admin' | 'stakeholder'

  return (
    <AppLayout role={role} userName={profile?.full_name ?? user.email ?? 'User'}>
      {children}
    </AppLayout>
  )
}
