'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  CheckSquare,
  Milestone,
  Users,
  MessageSquare,
  Bell,
  LogOut,
  Layers,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

interface SidebarProps {
  role: 'admin' | 'stakeholder'
  userName?: string
}

const adminNav: NavItem[] = [
  { href: '/dashboard',    label: 'Dashboard',    icon: <LayoutDashboard size={16} /> },
  { href: '/tasks',        label: 'Tasks',         icon: <CheckSquare size={16} /> },
  { href: '/milestones',   label: 'Milestones',    icon: <Milestone size={16} /> },
  { href: '/stakeholders', label: 'Stakeholders',  icon: <Users size={16} /> },
  { href: '/messages',     label: 'Messages',      icon: <MessageSquare size={16} /> },
]

const stakeholderNav: NavItem[] = [
  { href: '/portal',           label: 'Overview',   icon: <Layers size={16} /> },
  { href: '/portal/messages',  label: 'Messages',   icon: <MessageSquare size={16} /> },
]

export default function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const navItems = role === 'admin' ? adminNav : stakeholderNav

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'linear-gradient(135deg, var(--accent), #a78bfa)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            flexShrink: 0,
          }}>✦</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Pure White
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
              PHASE 1 TRACKER
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">
          {role === 'admin' ? 'Admin' : 'Stakeholder'}
        </div>

        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${pathname === item.href || pathname.startsWith(item.href + '/') ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}

        <div className="nav-section-label" style={{ marginTop: 16 }}>Account</div>

        <Link
          href="/notifications"
          className={`nav-item ${pathname === '/notifications' ? 'active' : ''}`}
        >
          <span className="nav-icon"><Bell size={16} /></span>
          Notifications
        </Link>
      </nav>

      {/* User footer */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border)' }}>
        <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'var(--accent-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--accent)',
            flexShrink: 0,
          }}>
            {userName?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userName ?? 'User'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              {role}
            </div>
          </div>
        </div>
        <button
          onClick={signOut}
          className="nav-item"
          style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
        >
          <span className="nav-icon"><LogOut size={16} /></span>
          Sign out
        </button>
      </div>
    </aside>
  )
}
