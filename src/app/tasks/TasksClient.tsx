'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Task, type TaskStatus, type TaskPriority } from '@/types/database'
import {
  statusLabel, statusBadgeClass, priorityBadgeClass, priorityLabel,
  isOverdue, formatDate,
} from '@/lib/utils'
import { Plus, Search, X, Filter, AlertTriangle, Edit2, Trash2, MessageSquare, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

const STATUS_OPTIONS: TaskStatus[] = ['not_started', 'in_progress', 'blocked', 'done']
const PRIORITY_OPTIONS: TaskPriority[] = ['critical', 'high', 'med', 'low']

interface Milestone { id: string; title: string; order_index: number }

export default function TasksClient({
  initialTasks,
  milestones,
  projectId,
  currentUserRole = 'stakeholder',
}: {
  initialTasks: Task[]
  milestones: Milestone[]
  projectId: string
  currentUserRole: 'admin' | 'stakeholder'
}) {
  const supabase = createClient()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<TaskStatus | ''>('')
  const [filterPriority, setFilterPriority] = useState<TaskPriority | ''>('')
  const [filterMilestone, setFilterMilestone] = useState<string>('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deletingTask, setDeletingTask] = useState<Task | null>(null)
  const [viewingTask, setViewingTask] = useState<Task | null>(null)

  // Sorting state
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Form state
  const [form, setForm] = useState({
    title: '', description: '', owner: '', status: 'not_started' as TaskStatus,
    priority: 'med' as TaskPriority, start_date: '', due_date: '',
    milestone_id: '', notes: '', task_code: '',
  })

  function openCreate() {
    setEditing(null)
    setForm({ title: '', description: '', owner: '', status: 'not_started', priority: 'med',
      start_date: '', due_date: '', milestone_id: '', notes: '', task_code: '' })
    setShowModal(true)
  }

  function openEdit(task: Task) {
    setEditing(task)
    setForm({
      title: task.title,
      description: task.description ?? '',
      owner: task.owner ?? '',
      status: task.status,
      priority: task.priority,
      start_date: task.start_date ?? '',
      due_date: task.due_date ?? '',
      milestone_id: task.milestone_id ?? '',
      notes: task.notes ?? '',
      task_code: task.task_code ?? '',
    })
    setShowModal(true)
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      title: form.title,
      description: form.description || null,
      owner: form.owner || null,
      status: form.status,
      priority: form.priority,
      start_date: form.start_date || null,
      due_date: form.due_date || null,
      milestone_id: form.milestone_id || null,
      notes: form.notes || null,
      task_code: form.task_code || null,
      project_id: projectId,
    }

    if (editing) {
      const { data } = await supabase.from('tasks').update(payload).eq('id', editing.id).select().single()
      if (data) setTasks(ts => ts.map(t => t.id === editing.id ? data : t))
    } else {
      const { data } = await supabase.from('tasks').insert(payload).select().single()
      if (data) setTasks(ts => [...ts, data])
    }

    setSaving(false)
    setShowModal(false)
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(ts => ts.filter(t => t.id !== id))
    setDeleting(null)
  }

  async function updateStatus(task: Task, status: TaskStatus) {
    const { data } = await supabase.from('tasks').update({ status }).eq('id', task.id).select().single()
    if (data) setTasks(ts => ts.map(t => t.id === task.id ? data : t))
  }

  // Sorting helpers
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const renderSortIndicator = (field: string) => {
    if (sortField !== field) {
      return <span className="sort-indicator"><ArrowUpDown size={11} style={{ opacity: 0.35 }} /></span>
    }
    return (
      <span className="sort-indicator">
        {sortDirection === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
      </span>
    )
  }

  // Filtered and Sorted tasks
  const filtered = useMemo(() => {
    let result = tasks.filter(t => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
          !(t.task_code?.toLowerCase().includes(search.toLowerCase()))) return false
      if (filterStatus && t.status !== filterStatus) return false
      if (filterPriority && t.priority !== filterPriority) return false
      if (filterMilestone && t.milestone_id !== filterMilestone) return false
      return true
    })

    if (sortField) {
      result = [...result].sort((a, b) => {
        let valA: any = ''
        let valB: any = ''

        if (sortField === 'task_code') {
          valA = a.task_code || ''
          valB = b.task_code || ''
        } else if (sortField === 'title') {
          valA = a.title || ''
          valB = b.title || ''
        } else if (sortField === 'milestone') {
          const mA = milestones.find(m => m.id === a.milestone_id)?.title || ''
          const mB = milestones.find(m => m.id === b.milestone_id)?.title || ''
          valA = mA
          valB = mB
        } else if (sortField === 'owner') {
          valA = a.owner || ''
          valB = b.owner || ''
        } else if (sortField === 'priority') {
          const priorityRank = { critical: 4, high: 3, med: 2, low: 1 }
          valA = priorityRank[a.priority] || 0
          valB = priorityRank[b.priority] || 0
        } else if (sortField === 'status') {
          const statusRank = { not_started: 1, in_progress: 2, blocked: 3, done: 4 }
          valA = statusRank[a.status] || 0
          valB = statusRank[b.status] || 0
        } else if (sortField === 'due_date') {
          valA = a.due_date || '9999-12-31'
          valB = b.due_date || '9999-12-31'
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }
    return result
  }, [tasks, search, filterStatus, filterPriority, filterMilestone, sortField, sortDirection, milestones])

  const overdueCount = filtered.filter(t => isOverdue(t.due_date, t.status)).length

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">{filtered.length} tasks{overdueCount > 0 && ` · ${overdueCount} overdue`}</p>
        </div>
        {currentUserRole === 'admin' && (
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={15} /> New Task
          </button>
        )}
      </div>

      <div className="page-body">
        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input"
              placeholder="Search tasks…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 32 }}
            />
          </div>
          <select className="input" style={{ flex: '0 0 140px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value as TaskStatus | '')}>
            <option value="">All Status</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
          </select>
          <select className="input" style={{ flex: '0 0 130px' }} value={filterPriority} onChange={e => setFilterPriority(e.target.value as TaskPriority | '')}>
            <option value="">All Priority</option>
            {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{priorityLabel(p)}</option>)}
          </select>
          <select className="input" style={{ flex: '0 0 180px' }} value={filterMilestone} onChange={e => setFilterMilestone(e.target.value)}>
            <option value="">All Milestones</option>
            {milestones.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
          {(search || filterStatus || filterPriority || filterMilestone) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFilterStatus(''); setFilterPriority(''); setFilterMilestone(''); }}>
              <X size={13} /> Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th className="sort-header" style={{ width: 85 }} onClick={() => handleSort('task_code')}>
                  ID {renderSortIndicator('task_code')}
                </th>
                <th className="sort-header" onClick={() => handleSort('title')}>
                  Task {renderSortIndicator('title')}
                </th>
                <th className="sort-header" onClick={() => handleSort('milestone')}>
                  Milestone {renderSortIndicator('milestone')}
                </th>
                <th className="sort-header" style={{ width: 110 }} onClick={() => handleSort('owner')}>
                  Owner {renderSortIndicator('owner')}
                </th>
                <th className="sort-header" style={{ width: 115 }} onClick={() => handleSort('priority')}>
                  Priority {renderSortIndicator('priority')}
                </th>
                <th className="sort-header" style={{ width: 130 }} onClick={() => handleSort('status')}>
                  Status {renderSortIndicator('status')}
                </th>
                <th className="sort-header" style={{ width: 120 }} onClick={() => handleSort('due_date')}>
                  Due Date {renderSortIndicator('due_date')}
                </th>
                {currentUserRole === 'admin' && <th style={{ width: 80 }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No tasks found
                  </td>
                </tr>
              ) : filtered.map(task => {
                const overdue = isOverdue(task.due_date, task.status)
                return (
                  <tr key={task.id} onClick={() => setViewingTask(task)} style={{ cursor: 'pointer' }}>
                    <td>
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        {task.task_code ?? '—'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                        {task.title}
                      </div>
                      {task.notes && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {task.notes}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {milestones.find(m => m.id === task.milestone_id)?.title ?? '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{task.owner ?? '—'}</span>
                    </td>
                    <td>
                      <span className={priorityBadgeClass(task.priority)}>
                        {priorityLabel(task.priority)}
                      </span>
                    </td>
                    <td>
                      <select
                        value={task.status}
                        onChange={e => updateStatus(task, e.target.value as TaskStatus)}
                        onClick={e => e.stopPropagation()}
                        disabled={currentUserRole !== 'admin'}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: currentUserRole === 'admin' ? 'pointer' : 'default',
                          fontSize: 12,
                          color: task.status === 'done' ? 'var(--status-done)' :
                                 task.status === 'in_progress' ? 'var(--accent)' :
                                 task.status === 'blocked' ? 'var(--status-blocked)' : 'var(--text-muted)',
                          fontWeight: 600,
                          outline: 'none',
                          padding: '4px 0',
                        }}
                      >
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
                      </select>
                    </td>
                    <td>
                      <span style={{
                        fontSize: 12,
                        color: overdue ? 'var(--priority-critical)' : 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}>
                        {overdue && <AlertTriangle size={11} />}
                        {formatDate(task.due_date)}
                      </span>
                    </td>
                    {currentUserRole === 'admin' && (
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={(e) => { e.stopPropagation(); openEdit(task); }}
                            title="Edit"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            className="btn btn-danger btn-icon btn-sm"
                            onClick={(e) => { e.stopPropagation(); setDeletingTask(task); }}
                            disabled={deleting === task.id}
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal fade-in">
            <div className="modal-header">
              <h2 className="modal-title">{editing ? 'Edit Task' : 'New Task'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="label">Code</label>
                  <input className="input" placeholder="T01" value={form.task_code}
                    onChange={e => setForm(f => ({ ...f, task_code: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="label">Title *</label>
                  <input className="input" placeholder="Task title" value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
                </div>
              </div>

              <div className="form-group">
                <label className="label">Description</label>
                <textarea className="input" placeholder="What does this task involve?" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="label">Milestone</label>
                  <select className="input" value={form.milestone_id}
                    onChange={e => setForm(f => ({ ...f, milestone_id: e.target.value }))}>
                    <option value="">No milestone</option>
                    {milestones.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Owner</label>
                  <input className="input" placeholder="e.g. BE + MOB" value={form.owner}
                    onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="label">Status</label>
                  <select className="input" value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as TaskStatus }))}>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Priority</label>
                  <select className="input" value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value as TaskPriority }))}>
                    {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{priorityLabel(p)}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="label">Start Date</label>
                  <input className="input" type="date" value={form.start_date}
                    onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="label">Due Date</label>
                  <input className="input" type="date" value={form.due_date}
                    onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
              </div>

              <div className="form-group">
                <label className="label">Notes</label>
                <textarea className="input" placeholder="Any additional context…" value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ minHeight: 60 }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.title}>
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingTask && (
        <div className="modal-overlay" onClick={() => setDeletingTask(null)}>
          <div className="modal fade-in" style={{ maxWidth: 400, textAlign: 'center', padding: '32px 24px' }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(180, 69, 47, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#B4452F',
              margin: '0 auto 16px',
            }}>
              <Trash2 size={28} />
            </div>
            
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 600, color: 'var(--navy-ink)', marginBottom: 8 }}>
              Delete Task?
            </h2>
            
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 24 }}>
              Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{deletingTask.task_code ? `${deletingTask.task_code}: ` : ''}{deletingTask.title}</strong>? This action is permanent and cannot be undone.
            </p>
            
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button 
                className="btn btn-ghost" 
                onClick={() => setDeletingTask(null)}
                style={{ minWidth: 100 }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={async () => {
                  const id = deletingTask.id
                  setDeletingTask(null)
                  await handleDelete(id)
                }}
                style={{ minWidth: 120 }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingTask && (
        <div className="modal-overlay" onClick={() => setViewingTask(null)}>
          <div className="modal fade-in" style={{ maxWidth: 500, padding: 32 }}>
            <div className="modal-header" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span className="pill-gold" style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>
                  {viewingTask.task_code || 'Task'}
                </span>
                <span className={priorityBadgeClass(viewingTask.priority)} style={{ fontSize: 10.5 }}>
                  {priorityLabel(viewingTask.priority)}
                </span>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setViewingTask(null)} title="Close">
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600, color: 'var(--navy-ink)', lineHeight: 1.3, marginBottom: 8 }}>
                  {viewingTask.title}
                </h2>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span className={statusBadgeClass(viewingTask.status)} style={{ fontSize: 11 }}>
                    {statusLabel(viewingTask.status)}
                  </span>
                  {viewingTask.milestone?.title && (
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      📁 {viewingTask.milestone.title}
                    </span>
                  )}
                </div>
              </div>

              {viewingTask.description && (
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                    Description
                  </div>
                  <div style={{ fontSize: 13.5, color: 'var(--navy-ink)', lineHeight: 1.6, background: 'rgba(14,31,61,0.02)', padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(14,31,61,0.04)' }}>
                    {viewingTask.description}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div>
                  <span style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 2 }}>
                    Owner / Team
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    👤 {viewingTask.owner || 'Unassigned'}
                  </span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 2 }}>
                    Milestone Target
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    📅 {viewingTask.due_date ? formatDate(viewingTask.due_date) : 'No due date'}
                  </span>
                </div>
              </div>

              {viewingTask.start_date && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
                  <span><b>Start Date:</b> {formatDate(viewingTask.start_date)}</span>
                  {viewingTask.due_date && <span><b>Due Date:</b> {formatDate(viewingTask.due_date)}</span>}
                </div>
              )}

              {viewingTask.notes && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                    Implementation Notes
                  </div>
                  <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5, fontStyle: 'italic' }}>
                    {viewingTask.notes}
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setViewingTask(null)} style={{ minWidth: 100 }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
