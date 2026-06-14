'use client'
import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import CreedsBanner from './CreedsBanner'
import { Menu, X, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'

interface AppLayoutProps {
  role: 'admin' | 'stakeholder'
  userName: string
  children: React.ReactNode
}

function getInitials(name?: string) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  return parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : parts[0].slice(0, 2).toUpperCase()
}

export default function AppLayout({ role, userName, children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [currentName, setCurrentName] = useState(userName)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [email, setEmail] = useState('')
  const [editingName, setEditingName] = useState(userName)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  // Keep state in sync with server props
  useEffect(() => {
    setCurrentName(userName)
    setEditingName(userName)
  }, [userName])

  // Automatically close mobile drawer when route changes
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved === 'true') {
      setCollapsed(true)
      document.documentElement.style.setProperty('--sidebar-width', '68px')
    } else {
      document.documentElement.style.setProperty('--sidebar-width', '256px')
    }
    setMounted(true)
  }, [])

  const toggleCollapse = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setMobileOpen(o => !o)
    } else {
      const next = !collapsed
      setCollapsed(next)
      localStorage.setItem('sidebar-collapsed', String(next))
      document.documentElement.style.setProperty('--sidebar-width', next ? '68px' : '256px')
    }
  }

  const openProfile = async () => {
    setShowProfileModal(true)
    setSaveSuccess(false)
    setEditingName(currentName)
    
    // Fetch email from session on-demand
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email) {
      setEmail(user.email)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingName.trim()) return
    setSaving(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: editingName.trim() })
        .eq('id', user.id)
      
      if (!error) {
        setCurrentName(editingName.trim())
        setSaveSuccess(true)
        setTimeout(() => {
          setShowProfileModal(false)
          setSaveSuccess(false)
        }, 1200)
        router.refresh()
      } else {
        alert("Failed to update profile name: " + error.message)
      }
    }
    setSaving(false)
  }

  // Prevent flash or SSR mismatch by rendering standard wrapper before mount
  const currentSidebarWidth = mounted ? (collapsed ? '68px' : '256px') : '256px'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      {/* Sidebar (Fixed position) */}
      <Sidebar role={role} userName={currentName} collapsed={collapsed} mobileOpen={mobileOpen} />
      
      {/* Click-to-close Overlay for Mobile Drawer */}
      <div 
        className={`sidebar-overlay ${mobileOpen ? 'visible' : ''}`} 
        onClick={() => setMobileOpen(false)}
      />

      {/* Header and Content Wrapper */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        {/* Top Navbar */}
        <header className="top-navbar" style={{ 
          marginLeft: currentSidebarWidth,
          transition: 'margin-left 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          <div className="top-navbar-left">
            <button
              className="sidebar-toggle-btn"
              onClick={toggleCollapse}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Menu size={16} />
            </button>

            {/* Scripture — extreme left of navbar, after the toggle */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              paddingLeft: 14,
              borderLeft: '1.5px solid rgba(201,168,76,0.35)',
              marginLeft: 6,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <p style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 15,
                  fontStyle: 'italic',
                  color: 'rgba(14,31,61,0.75)',
                  margin: 0,
                  lineHeight: 1.5,
                }}>
                  "This is what the LORD spoke, saying: 'By those who come near Me I must be regarded as holy; And before all the people I must be glorified.'"
                </p>
                <span style={{
                  fontSize: 12.5, fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: '#C9A84C',
                }}>
                  Lev 10:3 NKJV
                </span>
              </div>
            </div>
          </div>
          
          <div className="top-navbar-right">
            {/* Interactive User Profile Capsule */}
            <button 
              className="user-badge" 
              onClick={openProfile}
              title="View and Edit Profile"
              style={{
                background: 'rgba(14, 31, 61, 0.04)',
                border: '1px solid rgba(14, 31, 61, 0.08)',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '5px 12px',
                borderRadius: 20,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'rgba(201, 168, 76, 0.08)'
                e.currentTarget.style.borderColor = 'rgba(201, 168, 76, 0.25)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'rgba(14, 31, 61, 0.04)'
                e.currentTarget.style.borderColor = 'rgba(14, 31, 61, 0.08)'
              }}
            >
              <div className="user-badge-avatar">
                {getInitials(currentName)}
              </div>
              <div className="user-badge-info">
                <span className="user-badge-name">{currentName}</span>
                <span className="user-badge-role">{role}</span>
              </div>
            </button>
          </div>
        </header>
        
        {/* Main Content Area */}
        <main className="main-content" style={{ 
          flex: 1, 
          marginLeft: currentSidebarWidth,
          transition: 'margin-left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative'
        }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            {children}
          </div>
        </main>
      </div>

      {/* Interactive Profile Modal */}
      {showProfileModal && (
        <div 
          className="modal-overlay" 
          onClick={e => e.target === e.currentTarget && setShowProfileModal(false)}
          style={{ zIndex: 100 }}
        >
          <div className="modal fade-in" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h2 className="modal-title">Your Profile</h2>
              <button 
                className="btn btn-ghost btn-icon" 
                onClick={() => setShowProfileModal(false)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Profile Avatar Graphic */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '10px 0' }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'rgba(201, 168, 76, 0.15)',
                  border: '2px solid rgba(201, 168, 76, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  fontWeight: 700,
                  color: '#C9A84C',
                  fontFamily: "'Playfair Display', serif",
                  marginBottom: 10
                }}>
                  {getInitials(editingName)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                  Account Details
                </div>
              </div>

              {/* Email Address (Read-only) */}
              <div className="form-group">
                <label className="label">Email address</label>
                <input 
                  className="input" 
                  type="email" 
                  value={email || 'Loading...'} 
                  disabled 
                  style={{ background: 'rgba(14, 31, 61, 0.03)', color: 'rgba(14, 31, 61, 0.5)', cursor: 'not-allowed' }}
                />
              </div>

              {/* Role (Read-only) */}
              <div className="form-group">
                <label className="label">Account Role</label>
                <input 
                  className="input" 
                  type="text" 
                  value={role === 'admin' ? 'Project Administrator' : 'Stakeholder'} 
                  disabled 
                  style={{ background: 'rgba(14, 31, 61, 0.03)', color: 'rgba(14, 31, 61, 0.5)', cursor: 'not-allowed', textTransform: 'capitalize' }}
                />
              </div>

              {/* Full Name (Editable) */}
              <div className="form-group">
                <label className="label">Full Name *</label>
                <input 
                  className="input" 
                  type="text" 
                  placeholder="e.g. John Doe"
                  value={editingName} 
                  onChange={e => setEditingName(e.target.value)}
                  required
                />
              </div>

              {/* Success confirmation */}
              {saveSuccess && (
                <div style={{
                  background: 'rgba(63, 110, 88, 0.08)',
                  border: '1px solid rgba(63, 110, 88, 0.2)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  color: '#3F6E58',
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <Check size={14} /> Profile name updated successfully!
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button 
                  type="button" 
                  className="btn btn-ghost" 
                  onClick={() => setShowProfileModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={saving || !editingName.trim()}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Creeds Banner — fixed bottom-right, global across all pages */}
      <CreedsBanner />
    </div>
  )
}
