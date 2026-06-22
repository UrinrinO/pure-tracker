'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { type TrainingModule, type TrainingModuleNote, type TrainingCourse } from '@/types/database'
import { ArrowLeft, CheckCircle2, Circle, Plus, Trash2, NotebookPen } from 'lucide-react'

type CourseLite = Pick<TrainingCourse, 'id' | 'title' | 'status'> | null

export default function ModuleClient({
  module,
  course,
  initialNotes,
}: {
  module: TrainingModule
  course: CourseLite
  initialNotes: TrainingModuleNote[]
}) {
  const supabase = createClient()
  const router = useRouter()

  const [completed, setCompleted] = useState(module.completed)
  const [busy, setBusy] = useState(false)
  const [notes, setNotes] = useState<TrainingModuleNote[]>(initialNotes)

  async function toggleComplete() {
    if (busy) return
    setBusy(true)
    const next = !completed
    setCompleted(next)
    await supabase
      .from('training_modules')
      .update({ completed: next, completed_at: next ? new Date().toISOString() : null })
      .eq('id', module.id)
    setBusy(false)
    router.refresh() // keep the course progress on the list in sync
  }

  async function addNote() {
    const { data } = await supabase
      .from('training_module_notes')
      .insert({
        module_id: module.id,
        user_id: module.user_id,
        title: '',
        body: '',
        order_index: notes.length,
      })
      .select('*')
      .single<TrainingModuleNote>()
    if (data) setNotes(prev => [...prev, data])
  }

  async function saveNote(id: string, patch: { title?: string; body?: string }) {
    setNotes(prev => prev.map(n => (n.id === id ? { ...n, ...patch } : n)))
    await supabase.from('training_module_notes').update(patch).eq('id', id)
  }

  async function deleteNote(id: string) {
    setNotes(prev => prev.filter(n => n.id !== id))
    await supabase.from('training_module_notes').delete().eq('id', id)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <Link
            href="/training"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--ink-3)', textDecoration: 'none', marginBottom: 8 }}
          >
            <ArrowLeft size={14} /> Back to Training
          </Link>
          {course && (
            <div className="page-eyebrow" style={{ color: '#8B7426' }}>{course.title}</div>
          )}
          <h1 className="page-title">{module.title}</h1>
          <p className="page-subtitle" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <NotebookPen size={12} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
            Your private notes for this module.
          </p>
        </div>

        <button
          onClick={toggleComplete}
          disabled={busy}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 10,
            border: completed ? '1.5px solid var(--line)' : 'none',
            background: completed ? '#fff' : '#3F6E58',
            color: completed ? 'var(--ink-3)' : '#fff',
            fontSize: 13.5, fontWeight: 600, cursor: busy ? 'default' : 'pointer', whiteSpace: 'nowrap',
          }}
        >
          {completed ? <Circle size={15} /> : <CheckCircle2 size={15} />}
          {completed ? 'Mark as not complete' : 'Mark module as completed'}
        </button>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
            Notes ({notes.length})
          </span>
          <button
            onClick={addNote}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: 'none',
              background: 'linear-gradient(160deg, #22406E, #1A335C)', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Plus size={14} /> Add note
          </button>
        </div>

        {notes.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--ink-3)', background: '#fff', borderRadius: 12, border: '1px solid var(--line)' }}>
            <NotebookPen size={28} style={{ color: 'var(--ink-3)', marginBottom: 10, opacity: 0.7 }} />
            <p style={{ fontSize: 14, margin: 0 }}>No notes yet. Add your first one above.</p>
          </div>
        )}

        {notes.map(note => (
          <NoteCard key={note.id} note={note} onSave={saveNote} onDelete={deleteNote} />
        ))}
      </div>
    </div>
  )
}

// ─── Single note: title + body, autosaved on blur ──────────────────────────────

function NoteCard({
  note,
  onSave,
  onDelete,
}: {
  note: TrainingModuleNote
  onSave: (id: string, patch: { title?: string; body?: string }) => void
  onDelete: (id: string) => void
}) {
  const [title, setTitle] = useState(note.title)
  const [body, setBody] = useState(note.body)
  const [confirm, setConfirm] = useState(false)

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--line)', padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={() => { if (title !== note.title) onSave(note.id, { title }) }}
          placeholder="Note title"
          style={{
            flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
            fontSize: 15, fontWeight: 600, color: 'var(--navy-ink)', fontFamily: "'Playfair Display', serif",
          }}
        />
        <button
          onClick={() => setConfirm(true)}
          title="Delete note"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B4452F', padding: 4, flexShrink: 0 }}
        >
          <Trash2 size={15} />
        </button>
      </div>

      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        onBlur={() => { if (body !== note.body) onSave(note.id, { body }) }}
        placeholder="Write your thoughts, takeaways, links…"
        rows={4}
        style={{
          width: '100%', marginTop: 8, border: '1px solid var(--line)', borderRadius: 8, outline: 'none',
          background: 'var(--paper, #FBFAF6)', padding: '10px 12px', resize: 'vertical',
          fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink)', fontFamily: 'inherit',
        }}
      />

      {confirm && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Delete this note?</span>
          <button
            onClick={() => onDelete(note.id)}
            style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#B4452F', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
          >
            Delete
          </button>
          <button
            onClick={() => setConfirm(false)}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1.5px solid var(--line)', background: '#fff', color: 'var(--ink-3)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
