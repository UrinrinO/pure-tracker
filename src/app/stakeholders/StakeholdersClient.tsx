'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Profile, type Invitation } from '@/types/database'
import { formatDate, getInitials } from '@/lib/utils'
import { UserPlus, Mail, CheckCircle, Clock, X, Trash2, Copy, Check } from 'lucide-react'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'

export default function StakeholdersClient({
  stakeholders: initial,
  invitations: initialInvites,
  projectId,
  currentUserRole = 'stakeholder',
}: {
  stakeholders: Profile[]
  invitations: Invitation[]
  projectId: string
  currentUserRole: 'admin' | 'stakeholder'
}) {
  const supabase = createClient()
  const [stakeholders, setStakeholders] = useState<Profile[]>(initial)
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvites)
  const [showModal, setShowModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [revokingInvite, setRevokingInvite] = useState<Invitation | null>(null)

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setError('')

    // Insert invitation record
    const { data, error: err } = await supabase
      .from('invitations')
      .insert({ project_id: projectId, email: inviteEmail, role: 'stakeholder' })
      .select()
      .single()

    if (err) {
      setError(err.message)
      setSending(false)
      return
    }

    if (data) {
      setInvitations(inv => [data, ...inv])
      try {
        const link = getInviteLink(data.token)
        await fetch('/api/invite-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: inviteEmail, inviteLink: link })
        })
      } catch (e) {
        console.error("Failed to automatically send invitation email:", e)
      }
    }

    setSent(true)
    setSending(false)
    setTimeout(() => {
      setShowModal(false)
      setSent(false)
      setInviteEmail('')
    }, 2000)
  }

  function getInviteLink(token: string) {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
    return `${base}/invite/${token}`
  }

  async function copyLink(token: string) {
    await navigator.clipboard.writeText(getInviteLink(token))
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  async function revokeInvitation(id: string) {
    await supabase.from('invitations').delete().eq('id', id)
    setInvitations(inv => inv.filter(i => i.id !== id))
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Stakeholders</h1>
          <p className="page-subtitle">
            {stakeholders.length} active · {invitations.filter(i => !i.accepted).length} pending invitations
          </p>
        </div>
        {currentUserRole === 'admin' && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <UserPlus size={15} /> Invite Stakeholder
          </button>
        )}
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Active stakeholders */}
        <div className="card">
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
            Active Stakeholders
          </h2>
          {stakeholders.length === 0 ? (
            <div className="empty-state">
              <UserPlus size={32} />
              <h3>No stakeholders yet</h3>
              <p style={{ fontSize: 13 }}>Invite someone to give them read-only access to the tracker.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Joined</th>
                  <th>Notifications</th>
                </tr>
              </thead>
              <tbody>
                {stakeholders.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="comment-avatar" style={{ width: 28, height: 28, fontSize: 10 }}>
                          {getInitials(s.full_name)}
                        </div>
                        <span>{s.full_name ?? '—'}</span>
                      </div>
                    </td>
                    <td>{s.email}</td>
                    <td>{formatDate(s.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                        {s.notify_email && <span style={{ color: 'var(--accent)' }}>Email</span>}
                        {s.notify_push && <span style={{ color: 'var(--accent)' }}>Push</span>}
                        {!s.notify_email && !s.notify_push && '—'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pending invitations */}
        {invitations.length > 0 && (
          <div className="card">
            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Invitations</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Sent</th>
                  <th>Invite Link</th>
                  {currentUserRole === 'admin' && <th style={{ width: 60 }}></th>}
                </tr>
              </thead>
              <tbody>
                {invitations.map(inv => (
                  <tr key={inv.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Mail size={13} style={{ color: 'var(--text-muted)' }} />
                        {inv.email}
                      </div>
                    </td>
                    <td>
                      {inv.accepted ? (
                        <span className="badge badge-done">
                          <CheckCircle size={10} /> Accepted
                        </span>
                      ) : (
                        <span className="badge badge-in-progress">
                          <Clock size={10} /> Pending
                        </span>
                      )}
                    </td>
                    <td>{formatDate(inv.created_at)}</td>
                    <td>
                      {!inv.accepted && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => copyLink(inv.token)}
                        >
                          {copied === inv.token ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy link</>}
                        </button>
                      )}
                    </td>
                    {currentUserRole === 'admin' && (
                      <td>
                        {!inv.accepted && (
                          <button
                            className="btn btn-danger btn-icon btn-sm"
                            onClick={() => setRevokingInvite(inv)}
                            title="Revoke invitation"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal fade-in" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2 className="modal-title">Invite Stakeholder</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                <X size={16} />
              </button>
            </div>

            {sent ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <CheckCircle size={40} style={{ color: 'var(--status-done)', margin: '0 auto 12px' }} />
                <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Invitation created!</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
                  Copy the invite link from the table and share it with {inviteEmail}.
                </p>
              </div>
            ) : (
              <form onSubmit={sendInvite} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  The stakeholder will get read-only access to project progress and will be able to post comments.
                </p>
                <div className="form-group">
                  <label className="label">Email address *</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="stakeholder@example.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <div style={{ color: 'var(--priority-critical)', fontSize: 12, background: 'rgba(245,101,101,0.08)', padding: '8px 10px', borderRadius: 6 }}>
                    {error}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={sending}>
                    {sending ? 'Creating…' : 'Create Invitation'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {revokingInvite && (
        <DeleteConfirmModal
          title="Revoke Invitation?"
          message={<>Are you sure you want to revoke the invitation for <strong>{revokingInvite.email}</strong>? The recipient will no longer be able to accept it.</>}
          confirmLabel="Revoke"
          onConfirm={async () => { const id = revokingInvite.id; setRevokingInvite(null); await revokeInvitation(id) }}
          onCancel={() => setRevokingInvite(null)}
        />
      )}
    </div>
  )
}
