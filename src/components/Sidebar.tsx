'use client'
import Link from 'next/link'
import Image from 'next/image'
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
  FileText,
  LifeBuoy,
  BookHeart,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

interface SidebarProps {
  role: 'admin' | 'stakeholder'
  userName?: string
  collapsed?: boolean
  mobileOpen?: boolean
}

const adminNav: NavItem[] = [
  { href: '/dashboard',    label: 'Dashboard',    icon: <LayoutDashboard size={16} /> },
  { href: '/tasks',        label: 'Tasks',         icon: <CheckSquare size={16} /> },
  { href: '/milestones',   label: 'Milestones',    icon: <Milestone size={16} /> },
  { href: '/documents',    label: 'Documents',     icon: <FileText size={16} /> },
  { href: '/creeds',       label: 'Our Creeds',    icon: <BookHeart size={16} /> },
  { href: '/stakeholders', label: 'Stakeholders',  icon: <Users size={16} /> },
  { href: '/messages',     label: 'Messages',      icon: <MessageSquare size={16} /> },
]

const stakeholderNav: NavItem[] = [
  { href: '/portal',       label: 'Overview',      icon: <Layers size={16} /> },
  { href: '/tasks',        label: 'Tasks',         icon: <CheckSquare size={16} /> },
  { href: '/milestones',   label: 'Milestones',    icon: <Milestone size={16} /> },
  { href: '/documents',    label: 'Documents',     icon: <FileText size={16} /> },
  { href: '/stakeholders', label: 'Stakeholders',  icon: <Users size={16} /> },
  { href: '/messages',     label: 'Messages',      icon: <MessageSquare size={16} /> },
]

export default function Sidebar({ role, userName, collapsed = false, mobileOpen = false }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const navItems = role === 'admin' ? adminNav : stakeholderNav

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside 
      className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
      style={{
        width: collapsed ? 68 : 256,
        minHeight: '100vh',
        background: '#FBFAF6', // Light spec card surface
        borderRight: '1px solid rgba(14, 31, 61, 0.08)', // Navy-tinted hairline border
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, 
        left: 0, 
        bottom: 0,
        zIndex: 40,
        transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Logo area */}
      <div 
        className="sidebar-logo"
        style={{
          padding: collapsed ? '20px 10px' : '24px 20px',
          borderBottom: '1px solid rgba(14, 31, 61, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: collapsed ? 'center' : 'stretch',
          justifyContent: 'center',
          transition: 'all 0.2s',
          height: 98,
        }}
      >
        <Link href={role === 'admin' ? '/dashboard' : '/portal'} style={{ display: 'block' }}>
          {collapsed ? (
            /* Collapsed view: Show neat logo-favicon.png centered */
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Image
                src="/logo-favicon.png"
                alt="Pure White"
                width={30}
                height={30}
                style={{ objectFit: 'contain' }}
                priority
              />
            </div>
          ) : (
            /* Expanded view: Use the original logo-horizontal.png on light background */
            <Image
              src="/logo-horizontal.png"
              alt="Pure White Sanctuary"
              width={160}
              height={40}
              style={{ objectFit: 'contain', objectPosition: 'left center' }}
              priority
            />
          )}
        </Link>

        {!collapsed && (
          <div style={{
            marginTop: 10,
            paddingTop: 8,
            borderTop: '1px solid rgba(14, 31, 61, 0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <div style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: '#C9A84C',
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#8B7426', // Gold deep from spec
            }}>
              Phase 1 Tracker
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav
        className="sidebar-nav" 
        style={{ 
          flex: 1, 
          padding: collapsed ? '16px 8px' : '16px 12px', 
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {!collapsed && (
          <div 
            className="nav-section-label"
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: 'rgba(14, 31, 61, 0.35)',
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              padding: '10px 12px 4px',
            }}
          >
            {role === 'admin' ? 'Admin' : 'Stakeholder'}
          </div>
        )}

        {navItems.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
              title={collapsed ? item.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: collapsed ? 0 : 10,
                padding: '10px 12px',
                borderRadius: 8,
                color: isActive ? '#1A335C' : 'rgba(14, 31, 61, 0.6)',
                background: isActive ? 'rgba(201, 168, 76, 0.12)' : 'transparent',
                fontWeight: isActive ? 600 : 500,
                fontSize: 13,
                textDecoration: 'none',
                transition: 'all 0.15s',
                borderLeft: isActive ? '3px solid #C9A84C' : '3px solid transparent',
              }}
            >
              <span className="nav-icon" style={{ 
                width: 18, 
                height: 18, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: isActive ? '#C9A84C' : 'inherit'
              }}>
                {item.icon}
              </span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}

        {!collapsed && (
          <div 
            className="nav-section-label" 
            style={{ 
              marginTop: 14,
              fontSize: 9,
              fontWeight: 700,
              color: 'rgba(14, 31, 61, 0.35)',
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              padding: '10px 12px 4px',
            }}
          >
            Account
          </div>
        )}

        <Link
          href="/notifications"
          className={`nav-item ${pathname === '/notifications' ? 'active' : ''}`}
          title={collapsed ? "Notifications" : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: collapsed ? 0 : 10,
            padding: '10px 12px',
            borderRadius: 8,
            color: pathname === '/notifications' ? '#1A335C' : 'rgba(14, 31, 61, 0.6)',
            background: pathname === '/notifications' ? 'rgba(201, 168, 76, 0.12)' : 'transparent',
            fontWeight: pathname === '/notifications' ? 600 : 500,
            fontSize: 13,
            textDecoration: 'none',
            transition: 'all 0.15s',
            borderLeft: pathname === '/notifications' ? '3px solid #C9A84C' : '3px solid transparent',
          }}
        >
          <span className="nav-icon" style={{ 
            width: 18, 
            height: 18, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: pathname === '/notifications' ? '#C9A84C' : 'inherit'
          }}>
            <Bell size={16} />
          </span>
          {!collapsed && <span>Notifications</span>}
        </Link>

        <Link
          href="/tickets"
          className={`nav-item ${pathname === '/tickets' || pathname.startsWith('/tickets/') ? 'active' : ''}`}
          title={collapsed ? "Tickets" : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: collapsed ? 0 : 10,
            padding: '10px 12px',
            borderRadius: 8,
            color: (pathname === '/tickets' || pathname.startsWith('/tickets/')) ? '#1A335C' : 'rgba(14, 31, 61, 0.6)',
            background: (pathname === '/tickets' || pathname.startsWith('/tickets/')) ? 'rgba(201, 168, 76, 0.12)' : 'transparent',
            fontWeight: (pathname === '/tickets' || pathname.startsWith('/tickets/')) ? 600 : 500,
            fontSize: 13,
            textDecoration: 'none',
            transition: 'all 0.15s',
            borderLeft: (pathname === '/tickets' || pathname.startsWith('/tickets/')) ? '3px solid #C9A84C' : '3px solid transparent',
            marginTop: 4,
          }}
        >
          <span className="nav-icon" style={{ 
            width: 18, 
            height: 18, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: (pathname === '/tickets' || pathname.startsWith('/tickets/')) ? '#C9A84C' : 'inherit'
          }}>
            <LifeBuoy size={16} />
          </span>
          {!collapsed && <span>Tickets</span>}
        </Link>
      </nav>

      {/* Sleek expanded logout action in sidebar footer */}
      {!collapsed && (
        <div style={{
          padding: '12px 14px 20px',
          borderTop: '1px solid rgba(14, 31, 61, 0.05)',
        }}>
          <button
            onClick={signOut}
            className="nav-item"
            style={{ 
              width: '100%', 
              background: 'none', 
              border: 'none', 
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 8,
              color: '#B4452F', // Red blocked color from spec
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(180, 69, 47, 0.06)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center' }}><LogOut size={16} /></span>
            <span>Sign out</span>
          </button>
        </div>
      )}
    </aside>
  )
}
