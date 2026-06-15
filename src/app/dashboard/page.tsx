import { createClient } from '@/lib/supabase/server'
import { getMilestoneProgress, isOverdue, formatDate, formatDateShort } from '@/lib/utils'
import { type Task, type Milestone } from '@/types/database'
import DashboardCharts from '@/components/DashboardCharts'
import OverdueList from './OverdueList'
import Link from 'next/link'
import { AlertTriangle, Clock, CheckCircle2, ListTodo, TrendingUp, ChevronRight } from 'lucide-react'

const PROJECT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [{ data: tasks }, { data: milestones }] = await Promise.all([
    supabase.from('tasks').select('*').eq('project_id', PROJECT_ID).order('due_date'),
    supabase.from('milestones').select('*').eq('project_id', PROJECT_ID).order('order_index'),
  ])

  const allTasks: Task[] = tasks ?? []
  const allMilestones: Milestone[] = milestones ?? []

  const total      = allTasks.length
  const done       = allTasks.filter(t => t.status === 'done').length
  const inProgress = allTasks.filter(t => t.status === 'in_progress').length
  const blocked    = allTasks.filter(t => t.status === 'blocked').length
  const overdue    = allTasks.filter(t => isOverdue(t.due_date, t.status))
  const notStarted = allTasks.filter(t => t.status === 'not_started').length
  const overallPct = total ? Math.round((done / total) * 100) : 0

  const milestonesWithPct = allMilestones.map(m => {
    const mTasks = allTasks.filter(t => t.milestone_id === m.id)
    return { ...m, tasks: mTasks, percent_complete: getMilestoneProgress(mTasks) }
  })

  const today = new Date()
  const in7   = new Date(today.getTime() + 7 * 86400000)
  const upcoming = allTasks.filter(t => {
    if (!t.due_date || t.status === 'done') return false
    const d = new Date(t.due_date)
    return d >= today && d <= in7
  }).slice(0, 6)

  // Chart data — spec colours
  const statusData = [
    { name: 'Not Started', value: notStarted, color: '#6C7791' },
    { name: 'In Progress', value: inProgress, color: '#1A335C' },
    { name: 'Blocked',     value: blocked,    color: '#B4452F' },
    { name: 'Done',        value: done,       color: '#3F6E58' },
  ]

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Phase 1 Foundation Build</div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Pure White Sanctuary · project overview</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 36,
            fontWeight: 600,
            color: overallPct === 0 ? 'var(--ink-3)' : 'var(--navy-ink)',
            lineHeight: 1,
          }}>
            {overallPct}<span style={{ fontSize: 18, fontWeight: 400, color: 'var(--ink-3)' }}>%</span>
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>
            Overall progress
          </div>
          <div className="progress-bar" style={{ width: 120, marginTop: 4 }}>
            <div className="progress-fill" style={{ width: `${overallPct}%` }} />
          </div>
        </div>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── Stat cards ── */}
        <div className="responsive-grid grid-4" style={{ gap: 14 }}>

          <div className="stat-card">
            <div className="stat-icon">
              <ListTodo size={16} />
            </div>
            <div className="stat-value">{total}</div>
            <div className="stat-label">Total Tasks</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(63,110,88,0.10)', color: 'var(--sage)' }}>
              <CheckCircle2 size={16} />
            </div>
            <div className="stat-value" style={{ color: 'var(--sage)' }}>{done}</div>
            <div className="stat-label">Completed</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(26,51,92,0.08)', color: 'var(--navy)' }}>
              <TrendingUp size={16} />
            </div>
            <div className="stat-value" style={{ color: 'var(--navy)' }}>{inProgress}</div>
            <div className="stat-label">In Progress</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(180,69,47,0.10)', color: '#B4452F' }}>
              <AlertTriangle size={16} />
            </div>
            <div className="stat-value" style={{ color: overdue.length > 0 ? '#B4452F' : 'var(--ink-3)' }}>
              {overdue.length}
            </div>
            <div className="stat-label">Overdue</div>
          </div>
        </div>

        {/* ── Charts ── */}
        <div className="responsive-grid grid-2" style={{ gap: 16 }}>
          <DashboardCharts statusData={statusData} milestonesWithPct={milestonesWithPct} />
        </div>

        {/* ── Milestone Progress ── */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold-deep)', marginBottom: 4 }}>
                Build Roadmap
              </div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 600, color: 'var(--navy-ink)', margin: 0 }}>
                Milestone Progress
              </h2>
            </div>
            <Link href="/milestones" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--gold-deep)', fontWeight: 500 }}>
              View all <ChevronRight size={13} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {milestonesWithPct.map((m, idx) => (
              <div key={m.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{
                        fontFamily: "'Playfair Display', serif",
                        fontStyle: 'italic',
                        fontSize: 12,
                        color: 'var(--gold-deep)',
                        fontWeight: 500,
                      }}>
                        0{idx + 1}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy-ink)' }}>{m.title}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                      {m.tasks?.length ?? 0} tasks · due {formatDateShort(m.target_date)}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 16,
                    fontWeight: 700,
                    fontFamily: "'Playfair Display', serif",
                    color: m.percent_complete === 100 ? 'var(--sage)' : 'var(--gold-deep)',
                  }}>
                    {m.percent_complete}%
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className={`progress-fill${m.percent_complete === 100 ? ' sage' : ''}`}
                    style={{ width: `${m.percent_complete}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Overdue + Upcoming ── */}
        <div className="responsive-grid grid-2" style={{ gap: 16 }}>

          {/* Overdue */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 600, color: 'var(--navy-ink)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                <AlertTriangle size={15} style={{ color: '#B4452F' }} />
                Overdue
              </h2>
              {overdue.length > 0 && (
                <span className="badge badge-critical">{overdue.length}</span>
              )}
            </div>

            {overdue.length === 0 ? (
              <div className="empty-state" style={{ padding: '28px 16px' }}>
                <CheckCircle2 size={28} style={{ color: 'var(--sage)', opacity: 0.5 }} />
                <h3 style={{ fontSize: 15 }}>All tasks on track</h3>
                <p style={{ fontSize: 12.5, margin: 0 }}>No overdue items — well done.</p>
              </div>
            ) : (
              <>
                <OverdueList tasks={overdue.slice(0, 6)} />
                {overdue.length > 6 && (
                  <Link href="/tasks" style={{ fontSize: 12, color: 'var(--gold-deep)', padding: '8px 10px', fontWeight: 500 }}>
                    +{overdue.length - 6} more →
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Due this week */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 600, color: 'var(--navy-ink)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                <Clock size={15} style={{ color: 'var(--gold-deep)' }} />
                Due This Week
              </h2>
              <Link href="/tasks" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: 'var(--gold-deep)', fontWeight: 500 }}>
                All tasks <ChevronRight size={13} />
              </Link>
            </div>

            {upcoming.length === 0 ? (
              <div className="empty-state" style={{ padding: '28px 16px' }}>
                <Clock size={28} style={{ opacity: 0.25 }} />
                <h3 style={{ fontSize: 15 }}>Clear week ahead</h3>
                <p style={{ fontSize: 12.5, margin: 0 }}>Nothing due in the next 7 days.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {upcoming.map(t => (
                  <div key={t.id} style={{
                    padding: '10px 10px',
                    borderRadius: 10,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--line)',
                  }}>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>
                        {t.task_code && <span style={{ color: 'var(--ink-3)', marginRight: 6 }}>{t.task_code}</span>}
                        {t.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }}>
                        {formatDate(t.due_date)} · {t.owner ?? 'Unassigned'}
                      </div>
                    </div>
                    <span className={`badge badge-${t.status.replace(/_/g, '-')}`} style={{ whiteSpace: 'nowrap' }}>
                      {t.status.replace(/_/g, ' ')}
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
