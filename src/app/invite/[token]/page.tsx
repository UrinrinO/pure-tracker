'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, AlertTriangle } from 'lucide-react'

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  const supabase = createClient()

  const [invitation, setInvitation] = useState<{ id: string; email: string; project_id: string; accepted: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ fullName: '', password: '', confirmPassword: '' })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token)
        .single()

      if (error || !data) {
        setError('This invitation link is invalid or has expired.')
      } else if (data.accepted) {
        setError('This invitation has already been accepted. Please log in.')
      } else {
        setInvitation(data)
      }
      setLoading(false)
    }
    load()
  }, [token, supabase])

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setSaving(true)
    setError('')

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: invitation!.email,
      password: form.password,
      options: {
        data: { full_name: form.fullName },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setSaving(false)
      return
    }

    // Mark invitation as accepted
    await supabase.from('invitations').update({ accepted: true }).eq('token', token)

    // Update profile name
    if (data.user) {
      await supabase.from('profiles').update({ full_name: form.fullName, role: 'stakeholder' }).eq('id', data.user.id)
    }

    setDone(true)
    setTimeout(() => router.push('/portal'), 2500)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading invitation…</div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base)',
      padding: 24,
    }}>
      <div className="card fade-in" style={{ width: '100%', maxWidth: 420, padding: 36 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg, var(--accent), #a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: 22,
          }}>✦</div>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 20, fontWeight: 700 }}>
            You're invited
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 6 }}>
            Join the Pure White project tracker as a stakeholder
          </p>
        </div>

        {error ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <AlertTriangle size={32} style={{ color: 'var(--priority-critical)', margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--priority-critical)', fontSize: 13 }}>{error}</p>
            {error.includes('log in') && (
              <a href="/login" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>Go to Login</a>
            )}
          </div>
        ) : done ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <CheckCircle size={40} style={{ color: 'var(--status-done)', margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Welcome aboard!</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>Redirecting to the portal…</p>
          </div>
        ) : (
          <form onSubmit={handleAccept} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'var(--accent-dim)', border: '1px solid rgba(108,142,245,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)' }}>
              You're accepting an invitation for <strong style={{ color: 'var(--accent)' }}>{invitation?.email}</strong>
            </div>
            <div className="form-group">
              <label className="label">Full Name</label>
              <input className="input" placeholder="Your name" value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="label">Password</label>
              <input className="input" type="password" placeholder="Choose a password" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={8} />
            </div>
            <div className="form-group">
              <label className="label">Confirm Password</label>
              <input className="input" type="password" placeholder="Repeat password" value={form.confirmPassword}
                onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} required />
            </div>
            {error && <p style={{ color: 'var(--priority-critical)', fontSize: 12 }}>{error}</p>}
            <button className="btn btn-primary" type="submit" disabled={saving} style={{ justifyContent: 'center', padding: 11 }}>
              {saving ? 'Creating account…' : 'Accept Invitation & Join'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
