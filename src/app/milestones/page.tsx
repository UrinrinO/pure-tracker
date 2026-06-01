import { createClient } from '@/lib/supabase/server'
import { getMilestoneProgress, formatDate, statusBadgeClass, statusLabel, priorityBadgeClass, priorityLabel, isOverdue } from '@/lib/utils'
import { type Task, type Milestone } from '@/types/database'
import { Target, AlertTriangle } from 'lucide-react'

const PROJECT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

export default async function MilestonesPage() {
  const supabase = await createClient()

  const [{ data: milestones }, { data: tasks }] = await Promise.all([
    supabase.from('milestones').select('*').eq('project_id', PROJECT_ID).order('order_index'),
    supabase.from('tasks').select('*').eq('project_id', PROJECT_ID),
  ])

  const allMilestones: Milestone[] = milestones ?? []
  const allTasks: Task[] = tasks ?? []

  const milestonesWithData = allMilestones.map(m => {
    const mTasks = allTasks.filter(t => t.milestone_id === m.id)
    const overdueTasks = mTasks.filter(t => isOverdue(t.due_date, t.status))
    return {
      ...m,
      tasks: mTasks,
      percent_complete: getMilestoneProgress(mTasks),
      overdue: overdueTasks.length,
    }
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Milestones</h1>
          <p className="page-subtitle">{allMilestones.length} milestones · Phase 1 Foundation Build</p>
        </div>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {milestonesWithData.map(m => (
          <div key={m.id} className="card">
            {/* Milestone header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: 'var(--accent-dim)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Target size={16} style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{m.title}</h2>
                  {m.description && (
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{m.description}</p>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: m.percent_complete === 100 ? 'var(--status-done)' : 'var(--accent)',
                  fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {m.percent_complete}%
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {m.tasks.filter((t: Task) => t.status === 'done').length}/{m.tasks.length} done
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="progress-bar" style={{ marginBottom: 12 }}>
              <div className="progress-fill" style={{ width: `${m.percent_complete}%` }} />
            </div>

            {/* Meta */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 12, color: 'var(--text-muted)' }}>
              <span>Target: {formatDate(m.target_date)}</span>
              <span>{m.tasks.length} tasks</span>
              {m.overdue > 0 && (
                <span style={{ color: 'var(--priority-critical)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertTriangle size={11} /> {m.overdue} overdue
                </span>
              )}
            </div>

            {/* Task rows */}
            {m.tasks.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <table className="data-table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 50 }}>ID</th>
                      <th>Task</th>
                      <th style={{ width: 90 }}>Owner</th>
                      <th style={{ width: 80 }}>Priority</th>
                      <th style={{ width: 110 }}>Status</th>
                      <th style={{ width: 90 }}>Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.tasks.map((t: Task) => (
                      <tr key={t.id}>
                        <td><span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{t.task_code ?? '—'}</span></td>
                        <td>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{t.title}</span>
                        </td>
                        <td><span style={{ color: 'var(--text-muted)' }}>{t.owner ?? '—'}</span></td>
                        <td><span className={priorityBadgeClass(t.priority)}>{priorityLabel(t.priority)}</span></td>
                        <td><span className={statusBadgeClass(t.status)}>{statusLabel(t.status)}</span></td>
                        <td>
                          <span style={{ color: isOverdue(t.due_date, t.status) ? 'var(--priority-critical)' : 'var(--text-muted)' }}>
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
        ))}
      </div>
    </div>
  )
}
