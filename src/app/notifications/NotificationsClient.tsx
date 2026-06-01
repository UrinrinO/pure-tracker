'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Notification } from '@/types/database'
import { timeAgo } from '@/lib/utils'
import { Bell, AlertTriangle, MessageSquare, Tag, CheckCircle, CheckCheck } from 'lucide-react'
import Link from 'next/link'

const ICON_MAP = {
  behind_schedule: <AlertTriangle size={14} style={{ color: 'var(--priority-critical)' }} />,
  message:         <MessageSquare size={14} style={{ color: 'var(--accent)' }} />,
  mention:         <Tag size={14} style={{ color: 'var(--priority-high)' }} />,
  status:          <CheckCircle size={14} style={{ color: 'var(--status-done)' }} />,
}

export default function NotificationsClient({
  initialNotifications,
  userId,
}: {
  initialNotifications: Notification[]
  userId: string
}) {
  const supabase = createClient()
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [markingAll, setMarkingAll] = useState(false)

  const unread = notifications.filter(n => !n.read).length

  // Realtime: new notifications
  useEffect(() => {
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        payload => {
          setNotifications(ns => [payload.new as Notification, ...ns])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, supabase])

  async function markRead(id: string) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function markAllRead() {
    setMarkingAll(true)
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    setNotifications(ns => ns.map(n => ({ ...n, read: true })))
    setMarkingAll(false)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">
            {unread > 0 ? `${unread} unread` : 'All caught up'}
          </p>
        </div>
        {unread > 0 && (
          <button className="btn btn-ghost" onClick={markAllRead} disabled={markingAll}>
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      <div className="page-body">
        {notifications.length === 0 ? (
          <div className="empty-state">
            <Bell size={40} />
            <h3>No notifications yet</h3>
            <p style={{ fontSize: 13 }}>You'll be alerted here when tasks fall behind schedule or someone messages you.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {notifications.map(n => (
              <div
                key={n.id}
                onClick={() => !n.read && markRead(n.id)}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '14px 20px',
                  borderBottom: '1px solid var(--border)',
                  background: n.read ? 'transparent' : 'rgba(108,142,245,0.04)',
                  cursor: n.read ? 'default' : 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'var(--bg-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 2,
                }}>
                  {ICON_MAP[n.type]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ fontWeight: n.read ? 400 : 600, fontSize: 13, color: 'var(--text-primary)' }}>
                      {n.title}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(n.created_at)}</span>
                      {!n.read && (
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
                      )}
                    </div>
                  </div>
                  {n.body && (
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.5 }}>{n.body}</p>
                  )}
                  {n.link && (
                    <Link href={n.link} style={{ fontSize: 12, color: 'var(--accent)', marginTop: 4, display: 'inline-block' }}>
                      View →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
