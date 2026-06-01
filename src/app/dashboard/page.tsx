import { createClient } from '@/lib/supabase/server'
import { getMilestoneProgress, isOverdue, formatDate, formatDateShort } from '@/lib/utils'
import { type Task, type Milestone } from '@/types/database'
import DashboardCharts from '@/components/DashboardCharts'
import Link from 'next/link'
import { AlertTriangle, Clock, CheckCircle2, ListTodo, TrendingUp, ChevronRight } from 'lucide-react'

const PROJECT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch tasks and milestones in parallel
  const [{ data: tasks }, { data: milestones }] = await Promise.all([
    supabase.from('tasks').select('*').eq('project_id', PROJECT_ID).order('due_date'),
    supabase.from('milestones').select('*').eq('project_id', PROJECT_ID).order('order_index'),
  ])

  const allTasks: Task[] = tasks ?? []
  const allMilestones: Milestone[] = milestones ?? []

  // Stats
  const total      = allTasks.length
  const done       = allTasks.filter(t => t.status === 'done').length
  const inProgress = allTasks.filter(t => t.status === 'in_progress').length
  const blocked    = allTasks.filter(t => t.status === 'blocked').length
  const overdue    = allTasks.filter(t => isOverdue(t.due_date, t.status))
  const notStarted = allTasks.filter(t => t.status === 'not_started').length

  // Overall progress
  const overallPct = total ? Math.round((done / total) * 100) : 0

  // Milestone progress
  const milestonesWithPct = allMilestones.map(m => {
    const mTasks = allTasks.filter(t => t.milestone_id === m.id)
    return { ...m, tasks: mTasks, percent_complete: getMilestoneProgress(mTasks) }
  })

  // Upcoming this week (due within 7 days, not done)
  const today = new Date()
  const in7 = new Date(today.getTime() + 7 * 86400000)
  const upcoming = allTasks.filter(t => {
    if (!t.due_date || t.status === 'done') return false
    const d = new Date(t.due_date)
    return d >= today && d <= in7
  }).slice(0, 6)

  // Chart data
  const statusData = [
    { name: 'Not Started', value: notStarted, color: '#555a6a' },
    { name: 'In Progress', value: inProgress, color: '#6c8ef5' },
    { name: 'Blocked',     value: blocked,    color: '#f56565' },
    { name: 'Done',        value: done,       color: '#48bb78' },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Pure White — Phase 1 Foundation Build</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Overall progress</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {overallPct}%
          </span>
        </div>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <div className="stat-card">
            <ListTodo size={18} style={{ color: 'var(--text-muted)' }} />
            <div className="stat-value">{total}</div>
            <div className="stat-label">Total Tasks</div>
          </div>
          <div className="stat-card">
            <CheckCircle2 size={18} style={{ color: 'var(--status-done)' }} />
            <div className="stat-value" style={{ color: 'var(--status-done)' }}>{done}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-card">
            <TrendingUp size={18} style={{ color: 'var(--accent)' }} />
            <div className="stat-value" style={{ color: 'var(--accent)' }}>{inProgress}</div>
            <div className="stat-label">In Progress</div>
          </div>
          <div className="stat-card">
            <AlertTriangle size={18} style={{ color: 'var(--priority-critical)' }} />
            <div className="stat-value" style={{ color: overdue.length > 0 ? 'var(--priority-critical)' : 'var(--text-primary)' }}>
              {overdue.length}
            </div>
            <div className="stat-label">Overdue</div>
          </div>
        </div>

        {/* Charts + Overdue */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <DashboardCharts statusData={statusData} milestonesWithPct={milestonesWithPct} />
        </div>

        {/* Milestone Progress */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700 }}>Milestone Progress</h2>
            <Link href="/milestones" style={{ fontSize: 12, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4 }}>
              View all <ChevronRight size={12} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {milestonesWithPct.map(m => (
              <div key={m.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{m.title}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                      {m.tasks?.length ?? 0} tasks · due {formatDateShort(m.target_date)}
                    </span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: m.percent_complete === 100 ? 'var(--status-done)' : 'var(--accent)' }}>
                    {m.percent_complete}%
                  </span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${m.percent_complete}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Two-column: Overdue + Upcoming */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Overdue */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={14} style={{ color: 'var(--priority-critical)' }} /> Overdue
              </h2>
              {overdue.length > 0 && (
                <span className="badge badge-critical">{overdue.length}</span>
              )}
            </div>
            {overdue.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px' }}>
                <CheckCircle2 size={24} style={{ color: 'var(--status-done)', opacity: 0.6 }} />
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>All tasks on track 🎉</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {overdue.slice(0, 6).map(t => (
                  <Link key={t.id} href={`/tasks?id=${t.id}`} style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {t.task_code && <span style={{ color: 'var(--text-muted)', marginRight: 6 }}>{t.task_code}</span>}
                        {t.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--priority-critical)', marginTop: 2 }}>
                        Due {formatDate(t.due_date)}
                      </div>
                    </div>
                    <span className={`badge badge-${t.priority}`}>{t.priority}</span>
                  </Link>
                ))}
                {overdue.length > 6 && (
                  <Link href="/tasks" style={{ fontSize: 12, color: 'var(--accent)', padding: '6px 10px' }}>
                    +{overdue.length - 6} more
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Upcoming this week */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} style={{ color: 'var(--accent)' }} /> Due This Week
              </h2>
              <Link href="/tasks" style={{ fontSize: 12, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4 }}>
                All tasks <ChevronRight size={12} />
              </Link>
            </div>
            {upcoming.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px' }}>
                <Clock size={24} style={{ opacity: 0.3 }} />
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Nothing due this week</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {upcoming.map(t => (
                  <div key={t.id} style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {t.task_code && <span style={{ color: 'var(--text-muted)', marginRight: 6 }}>{t.task_code}</span>}
                        {t.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        Due {formatDate(t.due_date)} · {t.owner ?? 'Unassigned'}
                      </div>
                    </div>
                    <span className={`badge badge-${t.status.replace('_', '-')}`} style={{ whiteSpace: 'nowrap' }}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
