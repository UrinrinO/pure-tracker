'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Comment } from '@/types/database'
import { getInitials, timeAgo } from '@/lib/utils'
import { Send, MessageSquare } from 'lucide-react'

export default function MessagesClient({
  initialComments,
  currentUserId,
  currentUserName,
  currentUserRole,
  projectId,
}: {
  initialComments: Comment[]
  currentUserId: string
  currentUserName: string
  currentUserRole: string
  projectId: string
}) {
  const supabase = createClient()
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('project-thread')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `project_id=eq.${projectId}`,
        },
        async (payload) => {
          // Fetch with author join
          const { data } = await supabase
            .from('comments')
            .select('*, author:profiles(id, full_name, email, role)')
            .eq('id', payload.new.id)
            .single()
          if (data && !data.task_id) {
            setComments(c => [...c, data])
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [projectId, supabase])

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setSending(true)

    await supabase.from('comments').insert({
      project_id: projectId,
      task_id: null,
      author_id: currentUserId,
      body: body.trim(),
    })

    setBody('')
    setSending(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Project Thread</h1>
          <p className="page-subtitle">General updates and announcements — visible to all members</p>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}>
        {comments.length === 0 ? (
          <div className="empty-state" style={{ flex: 1 }}>
            <MessageSquare size={36} />
            <h3>No messages yet</h3>
            <p style={{ fontSize: 13 }}>Be the first to post an update or announcement.</p>
          </div>
        ) : (
          comments.map((c, i) => {
            const isOwn = c.author_id === currentUserId
            const author = (c as Comment & { author?: { full_name?: string; role?: string } }).author
            const name = author?.full_name ?? 'User'
            const role = author?.role ?? 'stakeholder'

            return (
              <div key={c.id} className="comment" style={{
                flexDirection: isOwn ? 'row-reverse' : 'row',
                borderBottom: 'none',
                padding: '8px 0',
              }}>
                <div className="comment-avatar">
                  {getInitials(name)}
                </div>
                <div style={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', gap: 4 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{isOwn ? 'You' : name}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{role}</span>
                    <span className="comment-meta">{timeAgo(c.created_at)}</span>
                  </div>
                  <div style={{
                    background: isOwn ? 'var(--accent-dim)' : 'var(--bg-card)',
                    border: `1px solid ${isOwn ? 'rgba(108,142,245,0.25)' : 'var(--border)'}`,
                    borderRadius: isOwn ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    padding: '10px 14px',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                  }}>
                    {c.body}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '16px 32px 24px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-surface)',
      }}>
        <form onSubmit={sendMessage} style={{ display: 'flex', gap: 10 }}>
          <input
            className="input"
            placeholder="Write a message…"
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage(e as unknown as React.FormEvent))}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={sending || !body.trim()}
            style={{ flexShrink: 0 }}
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  )
}
