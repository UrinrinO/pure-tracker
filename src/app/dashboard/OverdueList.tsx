'use client'
import Link from 'next/link'
import { type Task } from '@/types/database'
import { formatDate } from '@/lib/utils'

export default function OverdueList({ tasks }: { tasks: Task[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {tasks.map(t => (
        <Link
          key={t.id}
          href={`/tasks?id=${t.id}`}
          style={{
            padding: '10px 10px',
            borderRadius: 10,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            transition: 'background 0.15s',
            borderBottom: '1px solid var(--line)',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--cream-2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>
              {t.task_code && <span style={{ color: 'var(--ink-3)', marginRight: 6 }}>{t.task_code}</span>}
              {t.title}
            </div>
            <div style={{ fontSize: 11, color: '#B4452F', marginTop: 3 }}>
              Due {formatDate(t.due_date)}
            </div>
          </div>
          <span className={`badge badge-${t.priority}`}>{t.priority}</span>
        </Link>
      ))}
    </div>
  )
}
