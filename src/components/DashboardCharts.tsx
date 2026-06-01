'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { Milestone } from '@/types/database'

interface StatusData { name: string; value: number; color: string }

export default function DashboardCharts({
  statusData,
  milestonesWithPct,
}: {
  statusData: StatusData[]
  milestonesWithPct: (Milestone & { percent_complete: number; tasks: unknown[] })[]
}) {
  const total = statusData.reduce((s, d) => s + d.value, 0)

  return (
    <>
      {/* Donut chart */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Status Breakdown</h2>
        <div style={{ flex: 1, minHeight: 220 }}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={statusData.filter(d => d.value > 0)}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {statusData.filter(d => d.value > 0).map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: 'var(--text-primary)' }}
                itemStyle={{ color: 'var(--text-secondary)' }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ textAlign: 'center', marginTop: -8 }}>
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--accent)' }}>
            {total}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Tasks
          </div>
        </div>
      </div>

      {/* Priority breakdown */}
      <div className="card">
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>By Status (detail)</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {statusData.map(item => (
            <div key={item.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.name}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: item.color }}>
                  {item.value} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                    ({total ? Math.round(item.value / total * 100) : 0}%)
                  </span>
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${total ? (item.value / total * 100) : 0}%`,
                    background: item.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
