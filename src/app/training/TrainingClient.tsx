'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  type TrainingCourse, type TrainingModule,
  type CourseStatus, type ReminderFrequency,
} from '@/types/database'
import {
  Plus, Trash2, X, GraduationCap, ExternalLink, Bell, BellOff,
  ChevronDown, ChevronUp, ChevronRight, Pencil, CheckCircle2, Circle, RotateCcw, Lock,
} from 'lucide-react'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'

const FREQ_OPTIONS: { value: ReminderFrequency; label: string }[] = [
  { value: 'none',     label: 'No reminders' },
  { value: 'daily',    label: 'Daily' },
  { value: 'weekly',   label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly',  label: 'Monthly' },
]

const FREQ_LABEL: Record<ReminderFrequency, string> = {
  none: 'Off', daily: 'Daily', weekly: 'Weekly', biweekly: 'Every 2 weeks', monthly: 'Monthly',
}

const DOW_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]
const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

const STATUS_STYLE: Record<CourseStatus, { label: string; bg: string; color: string }> = {
  not_started: { label: 'Not started', bg: 'rgba(14,31,61,0.06)',  color: 'var(--ink-3)' },
  in_progress: { label: 'In progress', bg: 'rgba(201,168,76,0.14)', color: '#8B7426' },
  completed:   { label: 'Completed',   bg: 'rgba(63,110,88,0.12)',  color: '#3F6E58' },
}

// ── First reminder occurrence; the cron advances it after each send ──────────
function computeNextReminder(
  freq: ReminderFrequency,
  time: string,
  dow: number | null,
  dom: number | null,
): string | null {
  if (freq === 'none') return null
  const [h, m] = (time || '09:00').split(':').map(Number)
  const now = new Date()
  const next = new Date()
  next.setHours(h || 0, m || 0, 0, 0)

  if (freq === 'daily') {
    if (next <= now) next.setDate(next.getDate() + 1)
    return next.toISOString()
  }

  if (freq === 'weekly' || freq === 'biweekly') {
    const target = dow ?? 1
    const diff = (target - next.getDay() + 7) % 7
    next.setDate(next.getDate() + diff)
    if (next <= now) next.setDate(next.getDate() + 7)
    return next.toISOString()
  }

  // monthly — clamp to the last day of the month (e.g. 31st in February)
  const target = dom ?? 1
  const clamp = (d: Date) => {
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    d.setDate(Math.min(target, last))
  }
  clamp(next)
  if (next <= now) {
    next.setDate(1)
    next.setMonth(next.getMonth() + 1)
    clamp(next)
  }
  return next.toISOString()
}

function reminderSummary(c: TrainingCourse): string {
  switch (c.reminder_frequency) {
    case 'none':     return 'Off'
    case 'daily':    return `Daily · ${c.reminder_time?.slice(0, 5) ?? ''}`
    case 'weekly':   return `Weekly · ${DOW_SHORT[c.reminder_dow ?? 1]}`
    case 'biweekly': return `Every 2 wks · ${DOW_SHORT[c.reminder_dow ?? 1]}`
    case 'monthly':  return `Monthly · ${ordinal(c.reminder_dom ?? 1)}`
    default:         return FREQ_LABEL[c.reminder_frequency]
  }
}

function percentOf(modules: TrainingModule[] = []) {
  if (!modules.length) return 0
  return Math.round((modules.filter(m => m.completed).length / modules.length) * 100)
}

// ─── Drawer (add + edit) ──────────────────────────────────────────────────────

interface DraftModule { id?: string; title: string; completed: boolean }

function CourseDrawer({
  userId, editCourse, onClose, onDone,
}: {
  userId: string
  editCourse?: TrainingCourse
  onClose: () => void
  onDone: (course: TrainingCourse) => void
}) {
  const supabase = createClient()
  const isEditing = !!editCourse

  const [title, setTitle]             = useState(editCourse?.title ?? '')
  const [provider, setProvider]       = useState(editCourse?.provider ?? '')
  const [url, setUrl]                 = useState(editCourse?.url ?? '')
  const [description, setDescription] = useState(editCourse?.description ?? '')
  const [frequency, setFrequency]     = useState<ReminderFrequency>(editCourse?.reminder_frequency ?? 'none')
  const [time, setTime]               = useState(editCourse?.reminder_time?.slice(0, 5) ?? '09:00')
  const [dow, setDow]                 = useState<number>(editCourse?.reminder_dow ?? 1)   // Monday default
  const [dom, setDom]                 = useState<number>(editCourse?.reminder_dom ?? 1)   // 1st default
  const [modules, setModules]         = useState<DraftModule[]>(
    (editCourse?.modules ?? []).map(m => ({ id: m.id, title: m.title, completed: m.completed }))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  function setModule(idx: number, val: string) {
    setModules(prev => prev.map((m, i) => i === idx ? { ...m, title: val } : m))
  }

  async function save() {
    if (!title.trim()) { setError('A course title is required.'); return }
    const cleanModules = modules
      .map(m => ({ ...m, title: m.title.trim() }))
      .filter(m => m.title.length > 0)

    setSaving(true)
    setError(null)

    const coursePayload = {
      user_id: userId,
      title: title.trim(),
      provider: provider.trim() || null,
      url: url.trim() || null,
      description: description.trim() || null,
      reminder_frequency: frequency,
      reminder_time: time,
      reminder_dow: (frequency === 'weekly' || frequency === 'biweekly') ? dow : null,
      reminder_dom: frequency === 'monthly' ? dom : null,
      next_reminder_at: editCourse?.status === 'completed'
        ? null
        : computeNextReminder(frequency, time, dow, dom),
      updated_at: new Date().toISOString(),
    }

    let courseId: string

    if (isEditing) {
      const { error: updErr } = await supabase
        .from('training_courses').update(coursePayload).eq('id', editCourse!.id)
      if (updErr) { setError(updErr.message); setSaving(false); return }
      courseId = editCourse!.id
    } else {
      const { data: created, error: insErr } = await supabase
        .from('training_courses').insert({ ...coursePayload, status: 'not_started' }).select().single()
      if (insErr || !created) { setError(insErr?.message ?? 'Failed to create course.'); setSaving(false); return }
      courseId = created.id
    }

    // ── Reconcile modules (preserve completed state via id) ──
    const origIds = new Set((editCourse?.modules ?? []).map(m => m.id))
    const keptIds = new Set(cleanModules.filter(m => m.id).map(m => m.id!))
    const toDelete = [...origIds].filter(id => !keptIds.has(id))

    if (toDelete.length) {
      await supabase.from('training_modules').delete().in('id', toDelete)
    }
    for (let i = 0; i < cleanModules.length; i++) {
      const m = cleanModules[i]
      if (m.id) {
        await supabase.from('training_modules')
          .update({ title: m.title, order_index: i }).eq('id', m.id)
      } else {
        await supabase.from('training_modules')
          .insert({ course_id: courseId, user_id: userId, title: m.title, order_index: i })
      }
    }

    const { data: fresh } = await supabase
      .from('training_courses')
      .select('*, modules:training_modules(*)')
      .eq('id', courseId)
      .single()

    if (fresh) {
      const sorted = [...(fresh.modules ?? [])].sort((a, b) => a.order_index - b.order_index)
      onDone({ ...fresh, modules: sorted, percent_complete: percentOf(sorted) })
    }
    setSaving(false)
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6,
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--line)',
    fontSize: 14, background: '#fff', color: 'var(--navy-ink)', boxSizing: 'border-box',
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(14,31,61,0.3)', zIndex: 50 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 480,
        background: '#FBFAF6', boxShadow: '-8px 0 32px rgba(14,31,61,0.12)',
        zIndex: 51, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold-deep)', marginBottom: 2 }}>Training</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 600, color: 'var(--navy-ink)', margin: 0 }}>
              {isEditing ? 'Edit Course' : 'Add a Course'}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={labelStyle}>Course title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. OCCA Apologetics — Foundations" style={inputStyle} />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Provider</label>
              <input value={provider} onChange={e => setProvider(e.target.value)}
                placeholder="e.g. OCCA, C.S. Lewis Institute, CLI, your church…" style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Course link</label>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Notes (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              placeholder="Anything worth remembering about this course…"
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
          </div>

          {/* Reminders */}
          <div style={{ background: 'var(--cream-2)', borderRadius: 12, padding: '14px 14px 16px' }}>
            <label style={labelStyle}>Reminder</label>
            <select value={frequency} onChange={e => setFrequency(e.target.value as ReminderFrequency)}
              style={{ ...inputStyle, cursor: 'pointer' }}>
              {FREQ_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            {/* Anchor + time, depending on cadence */}
            {frequency !== 'none' && (
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                {(frequency === 'weekly' || frequency === 'biweekly') && (
                  <select value={dow} onChange={e => setDow(Number(e.target.value))}
                    style={{ ...inputStyle, flex: 2, cursor: 'pointer' }}>
                    {DOW_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                )}
                {frequency === 'monthly' && (
                  <select value={dom} onChange={e => setDom(Number(e.target.value))}
                    style={{ ...inputStyle, flex: 2, cursor: 'pointer' }}>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                      <option key={d} value={d}>{ordinal(d)} of the month</option>
                    ))}
                  </select>
                )}
                <input type="time" value={time} onChange={e => setTime(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }} />
              </div>
            )}

            <p style={{ fontSize: 11.5, color: 'var(--ink-3)', margin: '8px 2px 0', lineHeight: 1.5 }}>
              {frequency === 'none' && 'No nudges — track this one manually.'}
              {frequency === 'daily' && `You'll get an in-app and email nudge every day at ${time}.`}
              {(frequency === 'weekly' || frequency === 'biweekly') &&
                `You'll get a nudge ${frequency === 'weekly' ? 'every' : 'every other'} ${DOW_OPTIONS[dow]?.label} at ${time}.`}
              {frequency === 'monthly' &&
                `You'll get a nudge on the ${ordinal(dom)} of each month at ${time}.${dom > 28 ? ' (On shorter months, it fires on the last day.)' : ''}`}
            </p>
          </div>

          {/* Modules */}
          <div>
            <label style={labelStyle}>Modules</label>
            <p style={{ fontSize: 11.5, color: 'var(--ink-3)', margin: '0 0 10px', lineHeight: 1.5 }}>
              List the modules or lessons up front. Tick them off from the course card as you complete them.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {modules.map((m, idx) => (
                <div key={m.id ?? `new-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-3)', width: 18, textAlign: 'right', flexShrink: 0 }}>{idx + 1}</span>
                  <input value={m.title} onChange={e => setModule(idx, e.target.value)} placeholder="Module title"
                    style={{ ...inputStyle, padding: '8px 10px', fontSize: 13 }} />
                  <button onClick={() => setModules(prev => prev.filter((_, i) => i !== idx))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B4452F', padding: 2, flexShrink: 0 }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button onClick={() => setModules(prev => [...prev, { title: '', completed: false }])}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
                  border: '1.5px dashed rgba(26,51,92,0.20)', background: 'transparent', color: 'var(--ink-3)',
                  fontSize: 12.5, fontWeight: 500, cursor: 'pointer', width: 'fit-content' }}>
                <Plus size={13} /> Add module
              </button>
            </div>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(180,69,47,0.08)', border: '1px solid rgba(180,69,47,0.20)', color: '#B4452F', fontSize: 13 }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--line)', display: 'flex', gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} disabled={saving}
            style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: '1.5px solid var(--line)', background: '#fff', color: 'var(--ink-3)', fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={save} disabled={saving}
            style={{ flex: 2, padding: '11px 0', borderRadius: 10, border: 'none', background: saving ? 'var(--ink-3)' : 'linear-gradient(160deg, #22406E, #1A335C)', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: saving ? 'default' : 'pointer' }}>
            {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Save Course'}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Course Card ────────────────────────────────────────────────────────────

function CourseCard({ course, onEdit, onChange, onDelete }: {
  course: TrainingCourse
  onEdit: (c: TrainingCourse) => void
  onChange: (c: TrainingCourse) => void
  onDelete: (id: string) => Promise<void>
}) {
  const supabase = createClient()
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  const modules = course.modules ?? []
  const percent = course.percent_complete ?? percentOf(modules)
  const status = STATUS_STYLE[course.status]

  // Opening a module takes the user into its own page, where notes live and
  // completion is toggled. Completion is no longer changed by clicking the row.
  function openModule(m: TrainingModule) {
    router.push(`/training/modules/${m.id}`)
  }

  async function markComplete() {
    setBusy(true)
    const patch = { status: 'completed' as CourseStatus, completed_at: new Date().toISOString().slice(0, 10), next_reminder_at: null }
    await supabase.from('training_courses').update(patch).eq('id', course.id)
    onChange({ ...course, ...patch })
    setBusy(false)
  }

  async function reopen() {
    setBusy(true)
    const patch = { status: 'in_progress' as CourseStatus, completed_at: null, next_reminder_at: computeNextReminder(course.reminder_frequency, course.reminder_time, course.reminder_dow, course.reminder_dom) }
    await supabase.from('training_courses').update(patch).eq('id', course.id)
    onChange({ ...course, ...patch })
    setBusy(false)
  }

  const allDone = modules.length > 0 && percent === 100

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--line)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ padding: '2px 9px', borderRadius: 999, fontSize: 10.5, fontWeight: 600, background: status.bg, color: status.color }}>
                {status.label}
              </span>
              {course.provider && (
                <span style={{ padding: '2px 9px', borderRadius: 999, fontSize: 10.5, fontWeight: 600, background: 'rgba(26,51,92,0.07)', color: '#1A335C' }}>
                  {course.provider}
                </span>
              )}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--ink-3)' }}>
                {course.reminder_frequency === 'none' ? <BellOff size={11} /> : <Bell size={11} />}
                {reminderSummary(course)}
              </span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--navy-ink)', fontFamily: "'Playfair Display', serif" }}>
              {course.title}
            </div>
            {course.url && (
              <a href={course.url} target="_blank" rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#22406E', textDecoration: 'none', marginTop: 3 }}>
                Open course <ExternalLink size={11} />
              </a>
            )}
          </div>

          <button onClick={() => onEdit(course)} title="Edit"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4 }}>
            <Pencil size={14} />
          </button>
          <button onClick={() => setConfirmDelete(true)} title="Delete"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B4452F', padding: 4 }}>
            <Trash2 size={15} />
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 7, borderRadius: 999, background: 'rgba(14,31,61,0.07)', overflow: 'hidden' }}>
            <div style={{ width: `${percent}%`, height: '100%', borderRadius: 999, background: percent === 100 ? '#3F6E58' : 'linear-gradient(90deg, #C9A84C, #8B7426)', transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-3)', minWidth: 64, textAlign: 'right' }}>
            {modules.filter(m => m.completed).length}/{modules.length} · {percent}%
          </span>
          {modules.length > 0 && (
            <button onClick={() => setExpanded(e => !e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 2 }}>
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </div>
      </div>

      {/* Module checklist */}
      {expanded && modules.length > 0 && (
        <div style={{ borderTop: '1px solid var(--line)', padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {modules.map(m => (
            <button key={m.id} onClick={() => openModule(m)}
              title="Open module — add notes & mark complete"
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', width: '100%' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--cream-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {m.completed ? <CheckCircle2 size={17} style={{ color: '#3F6E58', flexShrink: 0 }} /> : <Circle size={17} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />}
              <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: m.completed ? 'var(--ink-3)' : 'var(--ink)', textDecoration: m.completed ? 'line-through' : 'none' }}>
                {m.title}
              </span>
              <ChevronRight size={15} style={{ color: 'var(--ink-3)', flexShrink: 0, opacity: 0.7 }} />
            </button>
          ))}

          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            {course.status !== 'completed' && allDone && (
              <button onClick={markComplete} disabled={busy}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 'none', background: '#3F6E58', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
                <CheckCircle2 size={14} /> Mark course complete
              </button>
            )}
            {course.status === 'completed' && (
              <button onClick={reopen} disabled={busy}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1.5px solid var(--line)', background: '#fff', color: 'var(--ink-3)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
                <RotateCcw size={14} /> Reopen course
              </button>
            )}
          </div>
        </div>
      )}

      {confirmDelete && (
        <DeleteConfirmModal
          title="Delete Course?"
          message={<>Are you sure you want to delete <strong>{course.title}</strong> and its modules? This cannot be undone.</>}
          onConfirm={async () => { setConfirmDelete(false); await onDelete(course.id) }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TrainingClient({ initialCourses, userId }: { initialCourses: TrainingCourse[]; userId: string }) {
  const supabase = createClient()
  const [courses, setCourses] = useState<TrainingCourse[]>(initialCourses)
  const [showAdd, setShowAdd] = useState(false)
  const [editCourse, setEditCourse] = useState<TrainingCourse | null>(null)

  const active   = courses.filter(c => c.status !== 'completed')
  const finished = courses.filter(c => c.status === 'completed')

  function upsert(course: TrainingCourse) {
    setCourses(prev => prev.find(c => c.id === course.id)
      ? prev.map(c => c.id === course.id ? course : c)
      : [...prev, course])
    setShowAdd(false)
    setEditCourse(null)
  }

  async function handleDelete(id: string) {
    await supabase.from('training_courses').delete().eq('id', id)
    setCourses(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Personal</div>
          <h1 className="page-title">Training</h1>
          <p className="page-subtitle" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Lock size={12} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
            Private to you — your personal Christian training and reminders. No one else can see this section.
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 10, border: 'none',
          background: 'linear-gradient(160deg, #22406E, #1A335C)', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
        }}>
          <Plus size={15} /> Add Course
        </button>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {courses.length === 0 && (
          <div style={{ textAlign: 'center', padding: '56px 20px', color: 'var(--ink-3)' }}>
            <GraduationCap size={32} style={{ color: 'var(--ink-3)', marginBottom: 12, opacity: 0.7 }} />
            <p style={{ fontSize: 14, margin: 0 }}>No courses yet. Add the first one you&apos;re working through.</p>
          </div>
        )}

        {active.length > 0 && (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <GraduationCap size={14} style={{ color: '#8B7426' }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>In progress ({active.length})</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {active.map(c => <CourseCard key={c.id} course={c} onEdit={setEditCourse} onChange={upsert} onDelete={handleDelete} />)}
            </div>
          </section>
        )}

        {finished.length > 0 && (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <CheckCircle2 size={14} style={{ color: '#3F6E58' }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Completed ({finished.length})</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {finished.map(c => <CourseCard key={c.id} course={c} onEdit={setEditCourse} onChange={upsert} onDelete={handleDelete} />)}
            </div>
          </section>
        )}
      </div>

      {(showAdd || editCourse) && (
        <CourseDrawer
          userId={userId}
          editCourse={editCourse ?? undefined}
          onClose={() => { setShowAdd(false); setEditCourse(null) }}
          onDone={upsert}
        />
      )}
    </div>
  )
}
