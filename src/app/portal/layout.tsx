import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  return (
    <div style={{ display: 'flex' }}>
      <Sidebar role={profile?.role ?? 'stakeholder'} userName={profile?.full_name ?? user.email ?? 'User'} />
      <main className="main-content" style={{ flex: 1 }}>{children}</main>
    </div>
  )
}
