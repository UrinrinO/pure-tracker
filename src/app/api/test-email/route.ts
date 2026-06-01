import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const to = searchParams.get('to')

  if (!to) {
    return NextResponse.json({ error: 'Pass ?to=your@email.com in the URL' }, { status: 400 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  const { data, error } = await resend.emails.send({
    from: 'Pure White Tracker <onboarding@resend.dev>',
    to: [to],
    subject: '✅ Pure White Tracker — Resend test',
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px;">
        <div style="background: #0a0b0f; border-radius: 12px; padding: 28px; color: #f0f1f5;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
            <div style="width: 36px; height: 36px; border-radius: 8px;
              background: linear-gradient(135deg, #6c8ef5, #a78bfa);
              display: flex; align-items: center; justify-content: center;
              font-size: 18px;">✦</div>
            <strong style="font-size: 16px;">Pure White Tracker</strong>
          </div>
          <h1 style="font-size: 20px; margin: 0 0 12px; color: #f0f1f5;">
            Email delivery is working! 🎉
          </h1>
          <p style="color: #8b90a0; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
            This is a test email from your Pure White project tracker.
            Resend is correctly configured and ready to send behind-schedule
            alerts and stakeholder notifications.
          </p>
          <div style="background: #161820; border-radius: 8px; padding: 16px; font-size: 13px; color: #8b90a0;">
            <div style="margin-bottom: 6px;">
              <strong style="color: #6c8ef5;">API Key:</strong>
              re_****${process.env.RESEND_API_KEY?.slice(-6) ?? '??????'}
            </div>
            <div>
              <strong style="color: #6c8ef5;">Sent at:</strong>
              ${new Date().toUTCString()}
            </div>
          </div>
        </div>
      </div>
    `,
  })

  if (error) {
    return NextResponse.json({ success: false, error }, { status: 400 })
  }

  return NextResponse.json({ success: true, emailId: data?.id, sentTo: to })
}
