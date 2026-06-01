'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Comment } from '@/types/database'
import { getInitials, timeAgo } from '@/lib/utils'
import { Send, MessageSquare, User, Lock, CheckCheck } from 'lucide-react'

interface Profile {
  id: string
  full_name: string
  role: 'admin' | 'stakeholder'
  email: string
}

interface DirectMessage {
  id: string
  sender_id: string
  receiver_id: string
  body: string
  is_read: boolean
  created_at: string
}

export default function MessagesClient({
  initialComments,
  currentUserId,
  currentUserName,
  currentUserRole,
  projectId,
  profiles,
}: {
  initialComments: Comment[]
  currentUserId: string
  currentUserName: string
  currentUserRole: string
  projectId: string
  profiles: Profile[]
}) {
  const supabase = createClient()
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [dmMessages, setDmMessages] = useState<DirectMessage[]>([])
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [mode, setMode] = useState<'thread' | 'dm'>('thread')
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [unreadDms, setUnreadDms] = useState<Record<string, number>>({})
  
  const bottomRef = useRef<HTMLDivElement>(null)
  const selectedUserRef = useRef<Profile | null>(null)

  // Sync ref with state for realtime listener closure access
  useEffect(() => {
    selectedUserRef.current = selectedUser
  }, [selectedUser])

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments, dmMessages, mode])

  // Load unread message counts on mount
  useEffect(() => {
    async function loadUnreadCounts() {
      const { data } = await supabase
        .from('direct_messages')
        .select('sender_id')
        .eq('receiver_id', currentUserId)
        .eq('is_read', false)
      
      if (data) {
        const counts: Record<string, number> = {}
        data.forEach(msg => {
          counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1
        })
        setUnreadDms(counts)
      }
    }
    loadUnreadCounts()
  }, [currentUserId, supabase])

  // Realtime subscription for Project General Thread
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
          const { data } = await supabase
            .from('comments')
            .select('*, author:profiles(id, full_name, email, role)')
            .eq('id', payload.new.id)
            .single()
          if (data && !data.task_id) {
            setComments(c => {
              if (c.some(item => item.id === data.id)) return c
              return [...c, data]
            })
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [projectId, supabase])

  // Realtime subscription for Direct Messages
  useEffect(() => {
    const channel = supabase
      .channel('direct-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
        },
        async (payload) => {
          const newMsg = payload.new as DirectMessage
          
          // Verify if message belongs to current user (either sender or receiver)
          if (newMsg.sender_id === currentUserId || newMsg.receiver_id === currentUserId) {
            
            // If we are currently active on DMs with the sender of this message
            if (
              selectedUserRef.current && 
              (newMsg.sender_id === selectedUserRef.current.id || newMsg.receiver_id === selectedUserRef.current.id)
            ) {
              setDmMessages(m => {
                if (m.some(item => item.id === newMsg.id)) return m
                return [...m, newMsg]
              })
              
              // Mark as read immediately on display if we are the receiver
              if (newMsg.receiver_id === currentUserId) {
                await supabase
                  .from('direct_messages')
                  .update({ is_read: true })
                  .eq('id', newMsg.id)
              }
            } else if (newMsg.receiver_id === currentUserId) {
              // Increment unread count badge
              setUnreadDms(prev => ({
                ...prev,
                [newMsg.sender_id]: (prev[newMsg.sender_id] || 0) + 1
              }))
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'direct_messages',
        },
        (payload) => {
          const updatedMsg = payload.new as DirectMessage
          // Sync read status checks in real-time
          if (updatedMsg.sender_id === currentUserId && updatedMsg.is_read) {
            setDmMessages(msgs => msgs.map(m => m.id === updatedMsg.id ? { ...m, is_read: true } : m))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentUserId, supabase])

  // Select a private DM conversation
  const selectUser = async (user: Profile) => {
    setSelectedUser(user)
    setMode('dm')
    setDmMessages([]) // Reset feed while loading
    
    // Clear unread counts locally
    setUnreadDms(prev => ({
      ...prev,
      [user.id]: 0
    }))

    // Load past private DMs
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${currentUserId})`)
      .order('created_at', { ascending: true })
    
    if (data) {
      setDmMessages(data)
    }

    // Mark incoming messages as read in the database
    await supabase
      .from('direct_messages')
      .update({ is_read: true })
      .eq('sender_id', user.id)
      .eq('receiver_id', currentUserId)
      .eq('is_read', false)
  }

  // Send a comment or DM message
  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setSending(true)
    const rawBody = body.trim()
    setBody('')

    if (mode === 'thread') {
      await supabase.from('comments').insert({
        project_id: projectId,
        task_id: null,
        author_id: currentUserId,
        body: rawBody,
      })
    } else if (selectedUser) {
      // Local immediate render for zero-lag feeling
      const tempId = 'temp-' + Date.now()
      const tempMsg: DirectMessage = {
        id: tempId,
        sender_id: currentUserId,
        receiver_id: selectedUser.id,
        body: rawBody,
        is_read: false,
        created_at: new Date().toISOString()
      }
      setDmMessages(m => [...m, tempMsg])

      const { data } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: currentUserId,
          receiver_id: selectedUser.id,
          body: rawBody,
        })
        .select()
        .single()
      
      // Swap temp message with real database row
      if (data) {
        setDmMessages(m => m.map(item => item.id === tempId ? data : item))
      }
    }
    setSending(false)
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
      
      {/* LEFT PANE: Conversation list */}
      <div style={{
        width: 280,
        background: 'rgba(251, 250, 246, 0.45)', // Sleek cream-dim surface
        borderRight: '1px solid rgba(14, 31, 61, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>
        <div style={{ padding: '24px 20px 12px', borderBottom: '1px solid rgba(14, 31, 61, 0.05)' }}>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--navy-ink)',
            margin: 0,
          }}>
            Conversations
          </h2>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Project-Wide General Thread selector */}
          <button
            onClick={() => { setMode('thread'); setSelectedUser(null); }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 8,
              background: mode === 'thread' ? 'rgba(201, 168, 76, 0.12)' : 'transparent',
              color: mode === 'thread' ? '#1A335C' : 'rgba(14, 31, 61, 0.65)',
              border: 'none',
              borderLeft: mode === 'thread' ? '3px solid #C9A84C' : '3px solid transparent',
              textAlign: 'left',
              fontSize: 13,
              fontWeight: mode === 'thread' ? 600 : 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <MessageSquare size={16} style={{ color: mode === 'thread' ? '#C9A84C' : 'inherit' }} />
            <span>Project Thread</span>
          </button>

          <div style={{
            fontSize: 9,
            fontWeight: 700,
            color: 'rgba(14, 31, 61, 0.35)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            padding: '16px 12px 6px 12px',
            borderTop: '1px solid rgba(14, 31, 61, 0.04)',
            marginTop: 8,
          }}>
            Direct Messages
          </div>

          {/* Members list */}
          {profiles.map(user => {
            const isSelected = mode === 'dm' && selectedUser?.id === user.id
            const unreadCount = unreadDms[user.id] || 0
            
            return (
              <button
                key={user.id}
                onClick={() => selectUser(user)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: isSelected ? 'rgba(201, 168, 76, 0.12)' : 'transparent',
                  color: isSelected ? '#1A335C' : 'rgba(14, 31, 61, 0.65)',
                  border: 'none',
                  borderLeft: isSelected ? '3px solid #C9A84C' : '3px solid transparent',
                  textAlign: 'left',
                  fontSize: 13,
                  fontWeight: isSelected ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: isSelected ? 'rgba(201, 168, 76, 0.2)' : 'rgba(14, 31, 61, 0.06)',
                  border: '1px solid rgba(14, 31, 61, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  fontWeight: 700,
                  color: isSelected ? '#C9A84C' : 'var(--navy)',
                  flexShrink: 0,
                }}>
                  {getInitials(user.full_name)}
                </div>
                
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <span style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.2
                  }}>
                    {user.full_name}
                  </span>
                  <span style={{ fontSize: 9, color: 'rgba(14, 31, 61, 0.4)', textTransform: 'capitalize' }}>
                    {user.role}
                  </span>
                </div>

                {unreadCount > 0 && (
                  <span style={{
                    background: '#C9A84C',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    borderRadius: 10,
                    padding: '2px 6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* RIGHT PANE: Selected conversation chat space */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--cream)', position: 'relative' }}>
        
        {/* Dynamic header */}
        <div className="page-header" style={{ borderBottom: '1px solid rgba(14, 31, 61, 0.06)', padding: '20px 32px' }}>
          {mode === 'thread' ? (
            <div>
              <h1 className="page-title" style={{ fontSize: 20 }}>Project Thread</h1>
              <p className="page-subtitle">General updates and announcements — visible to all members</p>
            </div>
          ) : (
            selectedUser && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(201, 168, 76, 0.15)',
                  border: '1px solid rgba(201, 168, 76, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#C9A84C',
                  fontFamily: "'Playfair Display', serif",
                }}>
                  {getInitials(selectedUser.full_name)}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <h1 className="page-title" style={{ fontSize: 18, margin: 0 }}>{selectedUser.full_name}</h1>
                    <span style={{
                      fontSize: 8.5,
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                      borderRadius: 10,
                      background: 'rgba(14, 31, 61, 0.05)',
                      color: 'var(--navy-ink)',
                    }}>
                      {selectedUser.role}
                    </span>
                  </div>
                  <p className="page-subtitle" style={{ margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Lock size={10} style={{ opacity: 0.6 }} /> Secure private conversation · {selectedUser.email}
                  </p>
                </div>
              </div>
            )
          )}
        </div>

        {/* Chat feeds */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          {mode === 'thread' ? (
            /* PROJECT THREAD COMMENTS FEED */
            comments.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(14, 31, 61, 0.35)' }}>
                <MessageSquare size={36} style={{ marginBottom: 12 }} />
                <h3 style={{ fontSize: 15, margin: 0 }}>No thread updates yet</h3>
                <p style={{ fontSize: 12, margin: '4px 0 0' }}>Be the first to post a team update.</p>
              </div>
            ) : (
              comments.map((comment) => {
                const isOwn = comment.author_id === currentUserId
                const author = (comment as any).author
                const name = author?.full_name ?? 'User'
                const role = author?.role ?? 'stakeholder'

                return (
                  <div 
                    key={comment.id} 
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      alignSelf: isOwn ? 'flex-end' : 'flex-start',
                      flexDirection: isOwn ? 'row-reverse' : 'row',
                      maxWidth: '70%',
                    }}
                  >
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: isOwn ? 'rgba(201, 168, 76, 0.2)' : 'rgba(14, 31, 61, 0.05)',
                      border: '1px solid rgba(14, 31, 61, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      fontWeight: 700,
                      color: isOwn ? '#C9A84C' : 'var(--navy)',
                      flexShrink: 0,
                    }}>
                      {getInitials(name)}
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', gap: 3 }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11 }}>
                        <span style={{ fontWeight: 600, color: 'var(--navy-ink)' }}>{isOwn ? 'You' : name}</span>
                        <span style={{ color: 'rgba(14, 31, 61, 0.4)', fontSize: 9, textTransform: 'capitalize' }}>{role}</span>
                        <span style={{ color: 'rgba(14, 31, 61, 0.35)' }}>{timeAgo(comment.created_at)}</span>
                      </div>
                      
                      <div style={{
                        background: isOwn ? 'rgba(201, 168, 76, 0.08)' : '#FBFAF6',
                        border: `1px solid ${isOwn ? 'rgba(201,168,76,0.25)' : 'rgba(14, 31, 61, 0.06)'}`,
                        borderRadius: isOwn ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                        padding: '10px 14px',
                        fontSize: 13.5,
                        color: 'var(--navy-ink)',
                        lineHeight: 1.5,
                        wordBreak: 'break-word',
                        boxShadow: '0 1px 2px rgba(14,31,61,0.02)',
                      }}>
                        {comment.body}
                      </div>
                    </div>
                  </div>
                )
              })
            )
          ) : (
            /* DIRECT PRIVATE MESSAGES FEED */
            dmMessages.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(14, 31, 61, 0.35)' }}>
                <Lock size={36} style={{ marginBottom: 12 }} />
                <h3 style={{ fontSize: 15, margin: 0 }}>Secure DM with {selectedUser?.full_name}</h3>
                <p style={{ fontSize: 12, margin: '4px 0 0' }}>Say hello! Private conversations are fully encrypted in transit.</p>
              </div>
            ) : (
              dmMessages.map((msg) => {
                const isOwn = msg.sender_id === currentUserId
                return (
                  <div 
                    key={msg.id} 
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isOwn ? 'flex-end' : 'flex-start',
                      alignSelf: isOwn ? 'flex-end' : 'flex-start',
                      maxWidth: '70%',
                      gap: 2
                    }}
                  >
                    <div style={{
                      background: isOwn ? 'rgba(201, 168, 76, 0.08)' : '#FBFAF6',
                      border: `1px solid ${isOwn ? 'rgba(201,168,76,0.25)' : 'rgba(14, 31, 61, 0.06)'}`,
                      borderRadius: isOwn ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      padding: '10px 14px',
                      fontSize: 13.5,
                      color: 'var(--navy-ink)',
                      lineHeight: 1.5,
                      wordBreak: 'break-word',
                      boxShadow: '0 1px 2px rgba(14,31,61,0.02)',
                    }}>
                      {msg.body}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: 'rgba(14, 31, 61, 0.35)' }}>
                      <span>{timeAgo(msg.created_at)}</span>
                      {isOwn && (
                        <span style={{ color: msg.is_read ? '#3F6E58' : 'rgba(14, 31, 61, 0.35)', display: 'flex', alignItems: 'center' }}>
                          · {msg.is_read ? <CheckCheck size={10} style={{ color: '#3F6E58' }} /> : 'Sent'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input box */}
        <div style={{
          padding: '16px 32px 24px',
          borderTop: '1px solid rgba(14, 31, 61, 0.08)',
          background: 'rgba(251, 250, 246, 0.85)',
          backdropFilter: 'blur(8px)',
        }}>
          <form onSubmit={sendMessage} style={{ display: 'flex', gap: 10 }}>
            <input
              className="input"
              placeholder={mode === 'thread' ? "Write an announcement or thread post…" : `Type a private message to ${selectedUser?.full_name}…`}
              value={body}
              onChange={e => setBody(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage(e as unknown as React.FormEvent))}
              style={{
                borderRadius: 20,
                paddingLeft: 18,
                background: '#fff',
                borderColor: 'rgba(14, 31, 61, 0.12)'
              }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={sending || !body.trim()}
              style={{ flexShrink: 0, borderRadius: '50%', width: 38, height: 38, padding: 0, justifyContent: 'center' }}
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
