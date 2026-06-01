'use client'
import { useState, useMemo, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, Search, X, Upload, Trash2, Send, Check, AlertTriangle, 
  CheckCircle2, HelpCircle, Activity, LifeBuoy, User, Clock, Image as ImageIcon
} from 'lucide-react'
import { formatDate, getInitials, timeAgo } from '@/lib/utils'

interface Profile {
  id: string
  full_name: string
  role: 'admin' | 'stakeholder'
}

interface Ticket {
  id: string
  title: string
  description: string
  type: 'bug' | 'update' | 'query'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  image_path: string | null
  created_by: string
  assigned_to: string | null
  created_at: string
  author?: {
    full_name: string
    email: string
  }
  assignee?: {
    full_name: string
  } | null
}

interface Reply {
  id: string
  ticket_id: string
  author_id: string
  body: string
  created_at: string
  author?: {
    full_name: string
    email: string
    role: string
  }
}

function formatBytes(bytes?: number) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  const k = 1024
  const sizes = ['KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export default function TicketsClient({
  initialTickets,
  currentUserId,
  currentUserName,
  projectId,
  admins,
}: {
  initialTickets: Ticket[]
  currentUserId: string
  currentUserName: string
  projectId: string
  admins: Profile[]
}) {
  const supabase = createClient()
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  
  // Create ticket form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'bug' | 'update' | 'query'>('bug')
  const [assignedTo, setAssignedTo] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Details panel state
  const [replies, setReplies] = useState<Reply[]>([])
  const [newReply, setNewReply] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [imageUrl, setImageUrl] = useState<string>('')
  
  const repliesBottomRef = useRef<HTMLDivElement>(null)

  // Scroll details thread to bottom
  useEffect(() => {
    repliesBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [replies])

  // Count stats
  const stats = useMemo(() => {
    return {
      total: tickets.length,
      bugs: tickets.filter(t => t.type === 'bug' && t.status !== 'resolved').length,
      updates: tickets.filter(t => t.type === 'update' && t.status !== 'resolved').length,
      resolved: tickets.filter(t => t.status === 'resolved').length,
    }
  }, [tickets])

  // Filtered tickets
  const filtered = useMemo(() => {
    return tickets.filter(t => {
      const q = search.toLowerCase()
      if (filterType && t.type !== filterType) return false
      if (filterStatus && t.status !== filterStatus) return false
      return (
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.author?.full_name && t.author.full_name.toLowerCase().includes(q))
      )
    })
  }, [tickets, search, filterType, filterStatus])

  // Select ticket and load details securely
  const selectTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket)
    setNewReply('')
    setReplies([])
    setImageUrl('')

    // Generate secure temporary signed URL for screenshots
    if (ticket.image_path) {
      const { data } = await supabase
        .storage
        .from('ticket-images')
        .createSignedUrl(ticket.image_path, 60)
      if (data?.signedUrl) {
        setImageUrl(data.signedUrl)
      }
    }

    // Load ticket comments thread
    const { data: replyData } = await supabase
      .from('ticket_replies')
      .select('*, author:profiles(id, full_name, email, role)')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true })

    if (replyData) {
      setReplies(replyData)
    }
  }

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  // Create ticket submission
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return
    setUploading(true)

    try {
      let imagePath = null

      // 1. Upload screenshot if present to private 'ticket-images' bucket
      if (selectedFile) {
        const timestamp = Date.now()
        const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9.]/g, '_')
        imagePath = `${projectId}/${timestamp}-${sanitizedName}`
        
        const { error: storageError } = await supabase
          .storage
          .from('ticket-images')
          .upload(imagePath, selectedFile)

        if (storageError) throw storageError
      }

      // 2. Insert ticket metadata
      const { data, error } = await supabase
        .from('tickets')
        .insert({
          title: title.trim(),
          description: description.trim(),
          type,
          status: 'open',
          image_path: imagePath,
          created_by: currentUserId,
          assigned_to: assignedTo || null
        })
        .select('*, author:profiles(full_name, email), assignee:profiles(full_name)')
        .single()

      if (error) {
        if (imagePath) {
          await supabase.storage.from('ticket-images').remove([imagePath])
        }
        throw error
      }

      if (data) {
        setTickets(prev => [data, ...prev])
      }

      // Reset
      setTitle('')
      setDescription('')
      setType('bug')
      setAssignedTo('')
      setSelectedFile(null)
      setShowCreateModal(false)
    } catch (err: any) {
      alert("Failed to report ticket: " + (err.message || err))
    } finally {
      setUploading(false)
    }
  }

  // Update status dropdown
  const updateTicketStatus = async (status: 'open' | 'in_progress' | 'resolved' | 'closed') => {
    if (!selectedTicket) return
    
    const { error } = await supabase
      .from('tickets')
      .update({ status })
      .eq('id', selectedTicket.id)

    if (!error) {
      const updated = { ...selectedTicket, status }
      setSelectedTicket(updated)
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? updated : t))
    } else {
      alert("Failed to update status: " + error.message)
    }
  }

  // Update assignee dropdown
  const updateTicketAssignee = async (assigneeId: string) => {
    if (!selectedTicket) return
    const dbAssigneeId = assigneeId || null
    
    const { error } = await supabase
      .from('tickets')
      .update({ assigned_to: dbAssigneeId })
      .eq('id', selectedTicket.id)

    if (!error) {
      const assigneeRecord = admins.find(a => a.id === assigneeId)
      const updated: Ticket = { 
        ...selectedTicket, 
        assigned_to: dbAssigneeId,
        assignee: assigneeRecord ? { full_name: assigneeRecord.full_name } : null
      }
      setSelectedTicket(updated)
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? updated : t))
    } else {
      alert("Failed to assign developer: " + error.message)
    }
  }

  // Post comment reply
  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newReply.trim() || !selectedTicket) return
    setSendingReply(true)
    const rawReply = newReply.trim()
    setNewReply('')

    try {
      // Local optimistic append for seamless rendering
      const tempId = 'reply-' + Date.now()
      const tempReply: Reply = {
        id: tempId,
        ticket_id: selectedTicket.id,
        author_id: currentUserId,
        body: rawReply,
        created_at: new Date().toISOString(),
        author: {
          full_name: currentUserName,
          email: '',
          role: 'admin'
        }
      }
      setReplies(prev => [...prev, tempReply])

      const { data, error } = await supabase
        .from('ticket_replies')
        .insert({
          ticket_id: selectedTicket.id,
          author_id: currentUserId,
          body: rawReply
        })
        .select('*, author:profiles(id, full_name, email, role)')
        .single()

      if (error) throw error
      if (data) {
        setReplies(prev => prev.map(item => item.id === tempId ? data : item))
      }
    } catch (err: any) {
      alert("Failed to post reply: " + err.message)
    } finally {
      setSendingReply(false)
    }
  }

  // Status badge styling helper
  const getStatusBadgeClass = (status: string) => {
    if (status === 'resolved') return 'badge badge-done'
    if (status === 'in_progress') return 'badge badge-in-progress'
    if (status === 'closed') return 'badge badge-closed'
    return 'badge badge-not-started'
  }

  // Type badge styling helper
  const getTypeBadgeClass = (type: string) => {
    if (type === 'bug') return 'badge badge-critical'
    if (type === 'update') return 'badge badge-in-progress'
    return 'badge badge-dim'
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Testing & Quality Assurance</div>
          <h1 className="page-title">QA Tickets</h1>
          <p className="page-subtitle">Report bugs, request updates, and discuss query fixes — restricted to admins</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={15} /> Create Ticket
        </button>
      </div>

      <div className="page-body">
        {/* Overview Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          <div className="stat-card" style={{ background: '#FBFAF6', border: '1px solid rgba(14,31,61,0.08)' }}>
            <div className="stat-icon" style={{ background: 'rgba(26,51,92,0.05)', color: 'var(--navy-ink)' }}><LifeBuoy size={16} /></div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Tickets</div>
          </div>
          <div className="stat-card" style={{ background: '#FBFAF6', border: '1px solid rgba(14,31,61,0.08)' }}>
            <div className="stat-icon" style={{ background: 'rgba(180,69,47,0.10)', color: '#B4452F' }}><AlertTriangle size={16} /></div>
            <div className="stat-value" style={{ color: '#B4452F' }}>{stats.bugs}</div>
            <div className="stat-label">Open Bugs</div>
          </div>
          <div className="stat-card" style={{ background: '#FBFAF6', border: '1px solid rgba(14,31,61,0.08)' }}>
            <div className="stat-icon" style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C' }}><Activity size={16} /></div>
            <div className="stat-value" style={{ color: '#8B7426' }}>{stats.updates}</div>
            <div className="stat-label">Open Updates</div>
          </div>
          <div className="stat-card" style={{ background: '#FBFAF6', border: '1px solid rgba(14,31,61,0.08)' }}>
            <div className="stat-icon" style={{ background: 'rgba(63,110,88,0.10)', color: 'var(--sage)' }}><CheckCircle2 size={16} /></div>
            <div className="stat-value" style={{ color: 'var(--sage)' }}>{stats.resolved}</div>
            <div className="stat-label">Resolved Fixed</div>
          </div>
        </div>

        {/* Filter controls */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input"
              placeholder="Search tickets…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 32 }}
            />
          </div>
          <select className="input" style={{ width: 140 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            <option value="bug">Bug</option>
            <option value="update">Update</option>
            <option value="query">Query</option>
          </select>
          <select className="input" style={{ width: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {/* Tickets Board */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 110 }}>Type</th>
                <th>Ticket Summary</th>
                <th style={{ width: 130 }}>Assigned To</th>
                <th style={{ width: 130 }}>Reported By</th>
                <th style={{ width: 110 }}>Status</th>
                <th style={{ width: 110 }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                    No tickets reported
                  </td>
                </tr>
              ) : (
                filtered.map(t => (
                  <tr key={t.id} onClick={() => selectTicket(t)} style={{ cursor: 'pointer' }}>
                    <td>
                      <span className={getTypeBadgeClass(t.type)}>{t.type}</span>
                    </td>
                    <td>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy-ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {t.title}
                        {t.image_path && <span title="Has screenshot attached" style={{ display: 'inline-flex' }}><ImageIcon size={12} style={{ color: '#C9A84C' }} /></span>}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 380 }}>
                        {t.description}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {t.assignee?.full_name ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={10} /> {t.assignee.full_name}</span>
                        ) : '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {t.author?.full_name ?? 'Admin'}
                      </span>
                    </td>
                    <td>
                      <span className={getStatusBadgeClass(t.status)}>{t.status.replace(/_/g, ' ')}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {formatDate(t.created_at)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !uploading && setShowCreateModal(false)}>
          <div className="modal fade-in" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h2 className="modal-title">Report New Ticket</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCreateModal(false)} disabled={uploading}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {/* Type selection */}
                <div className="form-group">
                  <label className="label">Ticket Type *</label>
                  <select className="input" value={type} onChange={e => setType(e.target.value as any)} disabled={uploading}>
                    <option value="bug">Bug Report</option>
                    <option value="update">Request Update</option>
                    <option value="query">General Query</option>
                  </select>
                </div>
                {/* Assign to developer */}
                <div className="form-group">
                  <label className="label">Assign To</label>
                  <select className="input" value={assignedTo} onChange={e => setAssignedTo(e.target.value)} disabled={uploading}>
                    <option value="">Select Developer</option>
                    {admins.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                  </select>
                </div>
              </div>

              {/* Title */}
              <div className="form-group">
                <label className="label">Summary / Title *</label>
                <input 
                  className="input"
                  placeholder="e.g. Dashboard charts fail to render on safari"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                  disabled={uploading}
                />
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="label">Description / Reproduction Steps *</label>
                <textarea 
                  className="input"
                  placeholder="What is failing? What steps did you take? What is the expected behavior?"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  required
                  style={{ minHeight: 90 }}
                  disabled={uploading}
                />
              </div>

              {/* Drag/Drop Screen capture */}
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                style={{
                  border: `2px dashed ${dragActive ? '#C9A84C' : 'rgba(14, 31, 61, 0.12)'}`,
                  background: dragActive ? 'rgba(201, 168, 76, 0.05)' : 'rgba(14, 31, 61, 0.02)',
                  borderRadius: 12,
                  padding: '24px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                <input 
                  type="file" 
                  id="screenshot-picker" 
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  disabled={uploading}
                />
                
                <label htmlFor="screenshot-picker" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <ImageIcon size={24} style={{ color: '#C9A84C', marginBottom: 6 }} />
                  {selectedFile ? (
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy-ink)', display: 'block', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedFile.name}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {formatBytes(selectedFile.size)} · Click to replace
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy-ink)', display: 'block' }}>
                        Attach Screenshot (Optional)
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Drag and drop image or click to browse
                      </span>
                    </div>
                  )}
                </label>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button 
                  type="button" 
                  className="btn btn-ghost" 
                  onClick={() => setShowCreateModal(false)}
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={uploading || !title.trim() || !description.trim()}
                >
                  {uploading ? 'Uploading...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Details Panel Modal */}
      {selectedTicket && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelectedTicket(null)}>
          <div className="modal fade-in" style={{ maxWidth: 520, height: '90vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
            {/* Header */}
            <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(14,31,61,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span className={getTypeBadgeClass(selectedTicket.type)}>{selectedTicket.type}</span>
                  <span className={getStatusBadgeClass(selectedTicket.status)}>{selectedTicket.status.replace(/_/g, ' ')}</span>
                </div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 600, color: 'var(--navy-ink)', margin: '4px 0 0' }}>
                  {selectedTicket.title}
                </h2>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelectedTicket(null)} title="Close Panel">
                <X size={16} />
              </button>
            </div>

            {/* Content Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Assignee & Status editor actions */}
              <div style={{ background: 'rgba(14,31,61,0.02)', padding: '14px 18px', borderRadius: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label" style={{ fontSize: 9.5 }}>Update Status</label>
                  <select className="input" style={{ padding: '6px 10px', height: 'auto', fontSize: 12 }} value={selectedTicket.status} onChange={e => updateTicketStatus(e.target.value as any)}>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label" style={{ fontSize: 9.5 }}>Reassign Developer</label>
                  <select className="input" style={{ padding: '6px 10px', height: 'auto', fontSize: 12 }} value={selectedTicket.assigned_to || ''} onChange={e => updateTicketAssignee(e.target.value)}>
                    <option value="">Unassigned</option>
                    {admins.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                  </select>
                </div>
              </div>

              {/* Description details */}
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(14,31,61,0.4)', marginBottom: 6 }}>
                  Reproduction & Description
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--navy-ink)', lineHeight: 1.6, whiteSpace: 'pre-wrap', background: '#FBFAF6', border: '1px solid rgba(14,31,61,0.05)', padding: '14px 16px', borderRadius: 12 }}>
                  {selectedTicket.description}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, display: 'flex', justifyItems: 'center', gap: 6 }}>
                  <span>Reported by: <b>{selectedTicket.author?.full_name ?? 'Admin'}</b></span> · 
                  <span>{formatDate(selectedTicket.created_at)}</span>
                </div>
              </div>

              {/* Screenshot attached if present */}
              {imageUrl && (
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(14,31,61,0.4)', marginBottom: 8 }}>
                    Attached Screenshot
                  </div>
                  <div style={{ border: '1px solid rgba(14,31,61,0.08)', borderRadius: 12, overflow: 'hidden', display: 'flex', justifyContent: 'center', background: '#0E1F3D' }}>
                    <img 
                      src={imageUrl} 
                      alt="Ticket Screenshot capture" 
                      style={{ maxWidth: '100%', maxHeight: 240, objectFit: 'contain' }} 
                    />
                  </div>
                </div>
              )}

              {/* Collaborative replies thread list */}
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(14,31,61,0.4)', borderTop: '1px solid rgba(14,31,61,0.06)', paddingTop: 18, marginBottom: 10 }}>
                  Replies Discussion
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {replies.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--text-muted)', fontSize: 12 }}>
                      No dev replies yet. Type below to write a message or fix status update.
                    </div>
                  ) : (
                    replies.map(reply => {
                      const isOwn = reply.author_id === currentUserId
                      return (
                        <div key={reply.id} style={{ display: 'flex', gap: 8, flexDirection: isOwn ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                          <div style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: isOwn ? 'rgba(201, 168, 76, 0.2)' : 'rgba(14, 31, 61, 0.05)',
                            border: '1px solid rgba(14, 31, 61, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 8.5,
                            fontWeight: 700,
                            color: isOwn ? '#C9A84C' : 'var(--navy)',
                            flexShrink: 0,
                          }}>
                            {getInitials(reply.author?.full_name || 'Admin')}
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 2 }}>
                              <span style={{ fontWeight: 600, color: 'var(--navy-ink)' }}>{isOwn ? 'You' : reply.author?.full_name}</span>
                              <span>{timeAgo(reply.created_at)}</span>
                            </div>
                            <div style={{
                              background: isOwn ? 'rgba(201, 168, 76, 0.06)' : '#fff',
                              border: `1px solid ${isOwn ? 'rgba(201,168,76,0.2)' : 'rgba(14,31,61,0.06)'}`,
                              borderRadius: isOwn ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                              padding: '8px 12px',
                              fontSize: 13,
                              color: 'var(--navy-ink)',
                              lineHeight: 1.4,
                              wordBreak: 'break-word',
                            }}>
                              {reply.body}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={repliesBottomRef} />
                </div>
              </div>
            </div>

            {/* Input area */}
            <div style={{ padding: '14px 28px 24px', borderTop: '1px solid rgba(14,31,61,0.08)', background: '#FBFAF6', flexShrink: 0 }}>
              <form onSubmit={handlePostReply} style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  placeholder="Post comment, status report, or reply fix…"
                  value={newReply}
                  onChange={e => setNewReply(e.target.value)}
                  style={{
                    borderRadius: 20,
                    paddingLeft: 16,
                    background: '#fff',
                    borderColor: 'rgba(14, 31, 61, 0.12)'
                  }}
                  disabled={sendingReply}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={sendingReply || !newReply.trim()}
                  style={{ flexShrink: 0, borderRadius: '50%', width: 34, height: 34, padding: 0, justifyContent: 'center' }}
                >
                  <Send size={12} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
