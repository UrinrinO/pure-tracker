// Supabase Edge Function: behind-schedule
// Deploy with: supabase functions deploy behind-schedule
// Set cron in Supabase Dashboard → Database → Cron jobs
// Schedule: "0 7 * * *" (daily at 7am UTC)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PROJECT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const today = new Date().toISOString().split('T')[0]

  // ── Find overdue tasks ──────────────────────────────────
  const { data: overdueTasks } = await supabase
    .from('tasks')
    .select('id, title, task_code, due_date, last_alerted_at, priority')
    .eq('project_id', PROJECT_ID)
    .lt('due_date', today)
    .neq('status', 'done')

  if (!overdueTasks?.length) {
    return new Response(JSON.stringify({ message: 'No overdue tasks', count: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Deduplicate: only alert on tasks not alerted in the last 7 days
  const tasksToAlert = overdueTasks.filter(t => {
    if (!t.last_alerted_at) return true
    const lastAlerted = new Date(t.last_alerted_at)
    const daysSince = (Date.now() - lastAlerted.getTime()) / 86400000
    return daysSince >= 7
  })

  if (!tasksToAlert.length) {
    return new Response(JSON.stringify({ message: 'All overdue tasks already alerted this week' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── Get all users to notify ─────────────────────────────
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, notify_email')

  if (!profiles?.length) {
    return new Response(JSON.stringify({ message: 'No profiles found' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── Insert in-app notifications ─────────────────────────
  const notifications = []
  for (const profile of profiles) {
    for (const task of tasksToAlert) {
      notifications.push({
        user_id: profile.id,
        type: 'behind_schedule',
        title: `⚠️ Overdue: ${task.task_code ?? ''} ${task.title}`,
        body: `This task was due ${task.due_date}. Please update the status or adjust the timeline.`,
        link: `/tasks?id=${task.id}`,
      })
    }
  }

  await supabase.from('notifications').insert(notifications)

  // ── Mark tasks as alerted ───────────────────────────────
  const taskIds = tasksToAlert.map(t => t.id)
  await supabase
    .from('tasks')
    .update({ last_alerted_at: new Date().toISOString() })
    .in('id', taskIds)

  // ── Send email digest via Resend ────────────────────────
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (resendKey) {
    const emailRecipients = profiles.filter(p => p.notify_email && p.email)

    for (const profile of emailRecipients) {
      const taskList = tasksToAlert
        .map(t => `• ${t.task_code ?? ''} ${t.title} (due ${t.due_date}, priority: ${t.priority})`)
        .join('\n')

      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0a0b0f; padding: 24px; border-radius: 12px;">
            <h1 style="color: #f0f1f5; font-size: 18px;">⚠️ Behind Schedule Alert</h1>
            <p style="color: #8b90a0; font-size: 14px;">
              The following Pure White Phase 1 tasks are overdue:
            </p>
            <div style="background: #161820; border-radius: 8px; padding: 16px; margin: 16px 0;">
              ${tasksToAlert.map(t => `
                <div style="padding: 8px 0; border-bottom: 1px solid #1c1f26;">
                  <strong style="color: #f0f1f5; font-size: 13px;">${t.task_code ?? ''} ${t.title}</strong>
                  <br/>
                  <span style="color: #f56565; font-size: 12px;">Due: ${t.due_date} · Priority: ${t.priority}</span>
                </div>
              `).join('')}
            </div>
            <p style="color: #8b90a0; font-size: 13px;">
              Please log in to the tracker to update task status or adjust deadlines.
            </p>
            <a href="${Deno.env.get('APP_URL') ?? 'http://localhost:3000'}/tasks"
               style="display: inline-block; background: #6c8ef5; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 13px; margin-top: 8px;">
              View Tasks →
            </a>
          </div>
        </div>
      `

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Pure White Tracker <tracker@urinrin.com>',
          to: [profile.email],
          subject: `[Pure White] ${tasksToAlert.length} task(s) are overdue`,
          html,
        }),
      })
    }
  }

  return new Response(JSON.stringify({
    message: 'Behind-schedule alerts sent',
    tasksAlerted: tasksToAlert.length,
    recipientCount: profiles.length,
  }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
