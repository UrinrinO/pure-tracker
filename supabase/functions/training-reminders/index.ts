// Supabase Edge Function: training-reminders
// Deploy with: supabase functions deploy training-reminders
// Set cron in Supabase Dashboard → Database → Cron jobs
// Schedule: "0 8 * * *" (daily at 8am UTC)
//
// Finds courses whose reminder is due, sends an in-app notification + an email
// digest (respecting notify_email), then advances next_reminder_at by the
// course's cadence. Uses the service role key, so it reads/writes across users
// and bypasses RLS.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function advance(iso: string, freq: string, dom: number | null): string {
  const d = new Date(iso)
  if (freq === 'daily')    d.setDate(d.getDate() + 1)
  if (freq === 'weekly')   d.setDate(d.getDate() + 7)   // weekday preserved
  if (freq === 'biweekly') d.setDate(d.getDate() + 14)  // weekday preserved
  if (freq === 'monthly') {
    // Jump to the same day-of-month next month, clamped to that month's length
    d.setDate(1)
    d.setMonth(d.getMonth() + 1)
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    d.setDate(Math.min(dom ?? 1, last))
  }
  return d.toISOString()
}

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const nowIso = new Date().toISOString()

  // ── Find courses whose reminder is due ──────────────────
  const { data: due } = await supabase
    .from('training_courses')
    .select('id, user_id, title, provider, reminder_frequency, reminder_dom, next_reminder_at')
    .lte('next_reminder_at', nowIso)
    .neq('reminder_frequency', 'none')
    .neq('status', 'completed')

  if (!due?.length) {
    return new Response(JSON.stringify({ message: 'No reminders due', count: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── Owners involved ─────────────────────────────────────
  const userIds = [...new Set(due.map(c => c.user_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, notify_email')
    .in('id', userIds)
  const profileById = new Map((profiles ?? []).map(p => [p.id, p]))

  // ── In-app notifications ────────────────────────────────
  const notifications = due.map(c => ({
    user_id: c.user_id,
    type: 'training_reminder',
    title: `📚 Keep going: ${c.title}`,
    body: `Time for your ${c.reminder_frequency} session${c.provider ? ` (${c.provider})` : ''}. Open Training to tick off your next module.`,
    link: '/training',
  }))
  await supabase.from('notifications').insert(notifications)

  // ── Advance next_reminder_at per course ─────────────────
  for (const c of due) {
    await supabase
      .from('training_courses')
      .update({
        next_reminder_at: advance(c.next_reminder_at!, c.reminder_frequency, c.reminder_dom),
        last_reminded_at: nowIso,
      })
      .eq('id', c.id)
  }

  // ── Email digest (one per user) ─────────────────────────
  const resendKey = Deno.env.get('RESEND_API_KEY')
  let emailsSent = 0
  if (resendKey) {
    for (const uid of userIds) {
      const p = profileById.get(uid)
      if (!p?.notify_email || !p.email) continue
      const courses = due.filter(c => c.user_id === uid)
      const list = courses
        .map(c => `• ${c.title}${c.provider ? ` — ${c.provider}` : ''}`)
        .join('<br/>')

      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background:#0E1F3D; padding:24px; border-radius:12px;">
            <h1 style="color:#FBFAF6; font-size:18px;">📚 Time to study</h1>
            <p style="color:#C9A84C; font-size:14px;">Your scheduled training for today:</p>
            <div style="background:#16294a; border-radius:8px; padding:16px; margin:16px 0; color:#FBFAF6; font-size:13px; line-height:1.7;">
              ${list}
            </div>
            <a href="${Deno.env.get('APP_URL') ?? 'http://localhost:3000'}/training"
               style="display:inline-block; background:#C9A84C; color:#0E1F3D; padding:10px 20px; border-radius:8px; text-decoration:none; font-size:13px; font-weight:600; margin-top:8px;">
              Open Training →
            </a>
          </div>
        </div>`

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Pure White Tracker <tracker@urinrin.com>',
          to: [p.email],
          subject: `[Pure White] ${courses.length} training reminder(s)`,
          html,
        }),
      })
      emailsSent++
    }
  }

  return new Response(JSON.stringify({
    message: 'Training reminders sent',
    coursesReminded: due.length,
    emailsSent,
  }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
