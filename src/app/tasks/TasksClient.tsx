'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Task, type TaskStatus, type TaskPriority } from '@/types/database'
import {
  statusLabel, statusBadgeClass, priorityBadgeClass, priorityLabel,
  isOverdue, formatDate,
} from '@/lib/utils'
import { Plus, Search, X, Filter, AlertTriangle, Edit2, Trash2, MessageSquare } from 'lucide-react'

const STATUS_OPTIONS: TaskStatus[] = ['not_started', 'in_progress', 'blocked', 'done']
const PRIORITY_OPTIONS: TaskPriority[] = ['critical', 'high', 'med', 'low']

interface Milestone { id: string; title: string; order_index: number }

export default function TasksClient({
  initialTasks,
  milestones,
  projectId,
}: {
  initialTasks: Task[]
  milestones: Milestone[]
  projectId: string
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

  // Filtered tasks
  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
          !(t.task_code?.toLowerCase().includes(search.toLowerCase()))) return false
      if (filterStatus && t.status !== filterStatus) return false
      if (filterPriority && t.priority !== filterPriority) return false
      if (filterMilestone && t.milestone_id !== filterMilestone) return false
      return true
    })
  }, [tasks, search, filterStatus, filterPriority, filterMilestone])

  const overdueCount = filtered.filter(t => isOverdue(t.due_date, t.status)).length

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">{filtered.length} tasks{overdueCount > 0 && ` · ${overdueCount} overdue`}</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={15} /> New Task
        </button>
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
                <th style={{ width: 60 }}>ID</th>
                <th>Task</th>
                <th>Milestone</th>
                <th style={{ width: 100 }}>Owner</th>
                <th style={{ width: 100 }}>Priority</th>
                <th style={{ width: 120 }}>Status</th>
                <th style={{ width: 100 }}>Due Date</th>
                <th style={{ width: 80 }}>Actions</th>
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
                  <tr key={task.id}>
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
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
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
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => openEdit(task)}
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          className="btn btn-danger btn-icon btn-sm"
                          onClick={() => handleDelete(task.id)}
                          disabled={deleting === task.id}
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
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
    </div>
  )
}
