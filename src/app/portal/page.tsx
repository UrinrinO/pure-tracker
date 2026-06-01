import { createClient } from '@/lib/supabase/server'
import { getMilestoneProgress, isOverdue, formatDate, statusBadgeClass, statusLabel, priorityBadgeClass, priorityLabel } from '@/lib/utils'
import { type Task, type Milestone } from '@/types/database'
import { CheckCircle2, AlertTriangle, Clock, TrendingUp, Target } from 'lucide-react'
import { startOfWeek, endOfWeek } from 'date-fns'

const PROJECT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

export default async function PortalPage() {
  const supabase = await createClient()

  const [{ data: project }, { data: milestones }, { data: tasks }] = await Promise.all([
    supabase.from('projects').select('*').eq('id', PROJECT_ID).single(),
    supabase.from('milestones').select('*').eq('project_id', PROJECT_ID).order('order_index'),
    supabase.from('tasks').select('*').eq('project_id', PROJECT_ID).order('due_date'),
  ])

  const allMilestones: Milestone[] = milestones ?? []
  const allTasks: Task[] = tasks ?? []

  const total = allTasks.length
  const done  = allTasks.filter(t => t.status === 'done').length
  const overallPct = total ? Math.round((done / total) * 100) : 0
  const overdue = allTasks.filter(t => isOverdue(t.due_date, t.status))
  const inProgress = allTasks.filter(t => t.status === 'in_progress')

  // This week
  const now = new Date()
  const weekStart = startOfWeek(now)
  const weekEnd = endOfWeek(now)
  const dueThisWeek = allTasks.filter(t => {
    if (!t.due_date || t.status === 'done') return false
    const d = new Date(t.due_date)
    return d >= weekStart && d <= weekEnd
  })

  // Recently moved (updated in last 7 days, now done)
  const recentlyDone = allTasks
    .filter(t => t.status === 'done')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5)

  const blocked = allTasks.filter(t => t.status === 'blocked')

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Project Overview</h1>
          <p className="page-subtitle">{project?.name} — Phase 1 Foundation Build</p>
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 4,
        }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {overallPct}%
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Overall Complete
          </div>
        </div>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Overall progress bar */}
        <div className="card">
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Phase 1 Progress</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{done} of {total} tasks complete</span>
          </div>
          <div className="progress-bar" style={{ height: 10 }}>
            <div className="progress-fill" style={{ width: `${overallPct}%` }} />
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <div className="stat-card">
            <CheckCircle2 size={18} style={{ color: 'var(--status-done)' }} />
            <div className="stat-value" style={{ color: 'var(--status-done)' }}>{done}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-card">
            <TrendingUp size={18} style={{ color: 'var(--accent)' }} />
            <div className="stat-value" style={{ color: 'var(--accent)' }}>{inProgress.length}</div>
            <div className="stat-label">In Progress</div>
          </div>
          <div className="stat-card">
            <AlertTriangle size={18} style={{ color: overdue.length > 0 ? 'var(--priority-critical)' : 'var(--text-muted)' }} />
            <div className="stat-value" style={{ color: overdue.length > 0 ? 'var(--priority-critical)' : 'var(--text-primary)' }}>
              {overdue.length}
            </div>
            <div className="stat-label">Overdue</div>
          </div>
          <div className="stat-card">
            <Clock size={18} style={{ color: 'var(--priority-high)' }} />
            <div className="stat-value" style={{ color: 'var(--priority-high)' }}>{blocked.length}</div>
            <div className="stat-label">Blocked</div>
          </div>
        </div>

        {/* Weekly Snapshot */}
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(108,142,245,0.06), rgba(167,139,250,0.06))', borderColor: 'rgba(108,142,245,0.15)' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            📋 Weekly Snapshot
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--status-done)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                ✓ What Moved
              </div>
              {recentlyDone.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nothing completed yet</p>
              ) : recentlyDone.map(t => (
                <div key={t.id} style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                  {t.task_code && <span style={{ color: 'var(--text-muted)', marginRight: 4 }}>{t.task_code}</span>}
                  {t.title}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--priority-critical)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                ✗ What's Blocked
              </div>
              {blocked.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nothing blocked 🎉</p>
              ) : blocked.slice(0, 4).map(t => (
                <div key={t.id} style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                  {t.task_code && <span style={{ color: 'var(--text-muted)', marginRight: 4 }}>{t.task_code}</span>}
                  {t.title}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                → What's Coming
              </div>
              {dueThisWeek.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nothing due this week</p>
              ) : dueThisWeek.map(t => (
                <div key={t.id} style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                  {t.task_code && <span style={{ color: 'var(--text-muted)', marginRight: 4 }}>{t.task_code}</span>}
                  {t.title}
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>· due {formatDate(t.due_date)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Milestones */}
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Milestones</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {allMilestones.map(m => {
              const mTasks = allTasks.filter(t => t.milestone_id === m.id)
              const pct = getMilestoneProgress(mTasks)
              const mOverdue = mTasks.filter(t => isOverdue(t.due_date, t.status)).length

              return (
                <div key={m.id} className="card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <Target size={15} style={{ color: 'var(--accent)' }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{m.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {mTasks.filter(t => t.status === 'done').length}/{mTasks.length} tasks · due {formatDate(m.target_date)}
                          {mOverdue > 0 && <span style={{ color: 'var(--priority-critical)', marginLeft: 8 }}>· {mOverdue} overdue</span>}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: 20, fontWeight: 800, color: pct === 100 ? 'var(--status-done)' : 'var(--accent)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {pct}%
                    </span>
                  </div>
                  <div className="progress-bar" style={{ marginBottom: 12 }}>
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>

                  {/* Task list (read-only) */}
                  {mTasks.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th style={{ width: 50 }}>ID</th>
                            <th>Task</th>
                            <th style={{ width: 80 }}>Priority</th>
                            <th style={{ width: 110 }}>Status</th>
                            <th style={{ width: 90 }}>Due</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mTasks.map((t: Task) => (
                            <tr key={t.id}>
                              <td><span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{t.task_code ?? '—'}</span></td>
                              <td>{t.title}</td>
                              <td><span className={priorityBadgeClass(t.priority)}>{priorityLabel(t.priority)}</span></td>
                              <td><span className={statusBadgeClass(t.status)}>{statusLabel(t.status)}</span></td>
                              <td>
                                <span style={{ fontSize: 12, color: isOverdue(t.due_date, t.status) ? 'var(--priority-critical)' : 'var(--text-muted)' }}>
                                  {formatDate(t.due_date)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
