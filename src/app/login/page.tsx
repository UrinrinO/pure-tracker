'use client'
import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F7F4EC',
      // Premium ambient gradients matching design spec
      backgroundImage: `
        radial-gradient(1000px 600px at 15% 15%, #EFE9D9 0%, transparent 60%),
        radial-gradient(800px 500px at 85% 85%, #E7E1F0 0%, transparent 55%)
      `,
      padding: '24px',
    }}>
      {/* Centered Premium Login Card */}
      <div className="fade-in" style={{
        width: '100%',
        maxWidth: 440,
        background: '#FBFAF6', // --paper background from spec
        border: '1px solid rgba(14, 31, 61, 0.08)', // navy-tinted hairline
        borderRadius: 16,
        padding: '48px 40px',
        boxShadow: '0 20px 40px rgba(14, 31, 61, 0.05)', // navy-tinted shadow
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Ambient gold glow inside card */}
        <div style={{
          position: 'absolute',
          top: '-100px',
          right: '-100px',
          width: 250,
          height: 250,
          background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }} />

        {/* Snowflake SVG watermark in card background */}
        <div style={{
          position: 'absolute',
          bottom: '-30px',
          left: '-30px',
          opacity: 0.03,
          pointerEvents: 'none',
          transform: 'rotate(15deg)',
        }}>
          <svg width="200" height="200" viewBox="0 0 100 100">
            <defs>
              <symbol id="arm-login-watermark" overflow="visible">
                <line x1="50" y1="50" x2="50" y2="11" stroke="#1A335C" strokeWidth="2.6" strokeLinecap="round"/>
                <line x1="50" y1="32" x2="45" y2="27" stroke="#1A335C" strokeWidth="2.6" strokeLinecap="round"/>
                <line x1="50" y1="32" x2="55" y2="27" stroke="#1A335C" strokeWidth="2.6" strokeLinecap="round"/>
                <line x1="50" y1="18" x2="46" y2="14" stroke="#1A335C" strokeWidth="2.6" strokeLinecap="round"/>
                <line x1="50" y1="18" x2="54" y2="14" stroke="#1A335C" strokeWidth="2.6" strokeLinecap="round"/>
              </symbol>
            </defs>
            <use href="#arm-login-watermark"/>
            <use href="#arm-login-watermark" transform="rotate(60 50 50)"/>
            <use href="#arm-login-watermark" transform="rotate(120 50 50)"/>
            <use href="#arm-login-watermark" transform="rotate(180 50 50)"/>
            <use href="#arm-login-watermark" transform="rotate(240 50 50)"/>
            <use href="#arm-login-watermark" transform="rotate(300 50 50)"/>
            <circle cx="50" cy="50" r="3.4" fill="#C9A84C"/>
          </svg>
        </div>

        {/* Brand Logo & Header Area */}
        <div style={{ textAlign: 'center', marginBottom: 32, position: 'relative', zIndex: 1 }}>
          {/* Centered and scaled up logo-stacked */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <Image
              src="/logo-stacked.png"
              alt="Pure White Sanctuary"
              width={220}
              height={180}
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>

          {/* Gold hairline divider */}
          <div style={{
            width: 32,
            height: 1.5,
            background: '#C9A84C',
            margin: '0 auto 20px',
            borderRadius: 1,
          }} />

          {/* Scripture Verse */}
          <div style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: 'italic',
            fontSize: 14.5,
            color: '#1A335C', // Navy text
            lineHeight: 1.6,
            maxWidth: 280,
            margin: '0 auto 8px',
          }}>
            "Though your sins be as scarlet, they shall be as white as snow."
          </div>
          <div style={{
            fontSize: 9.5,
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#8B7426', // Gold deep
            marginBottom: 24,
          }}>
            Isaiah 1:18
          </div>

          {/* Welcome Text */}
          <div style={{ borderTop: '1px solid rgba(14, 31, 61, 0.06)', paddingTop: 20 }}>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 24,
              fontWeight: 600,
              color: '#0E1F3D',
              margin: 0,
              letterSpacing: '-0.01em',
            }}>
              Welcome back
            </h1>
            <p style={{ color: '#6C7791', fontSize: 13, marginTop: 6, lineHeight: 1.5, margin: '6px 0 0' }}>
              Sign in to access the Phase 1 project tracker.
            </p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative', zIndex: 1 }}>
          <div className="form-group">
            <label className="label" htmlFor="email">Email address</label>
            <input
              className="input"
              type="email"
              id="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="password">Password</label>
            <input
              className="input"
              type="password"
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(180,69,47,0.08)',
              border: '1px solid rgba(180,69,47,0.2)',
              borderRadius: 10,
              padding: '11px 14px',
              color: '#B4452F',
              fontSize: 13,
              marginBottom: 14,
            }}>
              {error}
            </div>
          )}

          <button
            className="btn btn-primary"
            type="submit"
            id="login-btn"
            disabled={loading}
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '13px',
              fontSize: 14,
              marginTop: 8,
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* Footer */}
        <p style={{
          textAlign: 'center',
          fontSize: 11.5,
          color: '#6C7791',
          marginTop: 28,
          lineHeight: 1.6,
          position: 'relative',
          zIndex: 1,
          margin: '28px 0 0',
        }}>
          Don't have access?{' '}
          <span style={{ color: '#8B7426', fontWeight: 500 }}>
            Contact the project admin for an invite.
          </span>
        </p>
      </div>
    </div>
  )
}
