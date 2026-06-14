'use client'
import { Trash2 } from 'lucide-react'

interface Props {
  title: string
  message: React.ReactNode
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteConfirmModal({
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div
      className="modal-overlay"
      onClick={e => e.target === e.currentTarget && onCancel()}
      style={{ zIndex: 200 }}
    >
      <div className="modal fade-in" style={{ maxWidth: 400, textAlign: 'center', padding: '32px 24px' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(180,69,47,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#B4452F', margin: '0 auto 16px',
        }}>
          <Trash2 size={28} />
        </div>

        <h2 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 20, fontWeight: 600,
          color: 'var(--navy-ink)', marginBottom: 8,
        }}>
          {title}
        </h2>

        <p style={{
          fontSize: 13.5, color: 'var(--text-secondary)',
          lineHeight: 1.6, marginBottom: 24,
        }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            className="btn btn-ghost"
            onClick={onCancel}
            style={{ minWidth: 100 }}
          >
            Cancel
          </button>
          <button
            className="btn btn-danger"
            onClick={onConfirm}
            style={{ minWidth: 120 }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
