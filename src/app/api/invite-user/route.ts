import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(request: Request) {
  try {
    const { email, inviteLink } = await request.json()

    if (!email || !inviteLink) {
      return NextResponse.json({ error: 'Missing email or inviteLink' }, { status: 400 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    const { data, error } = await resend.emails.send({
      from: 'Pure White Tracker <onboarding@resend.dev>',
      to: [email],
      subject: '✨ You are invited to join the Pure White Tracker',
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #F7F4EC;">
          <div style="background: #FBFAF6; border: 1px solid rgba(26,51,92,0.10); border-radius: 16px; padding: 36px; color: #0E1F3D; box-shadow: 0 12px 28px -16px rgba(14,31,61,0.12);">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 24px;">
              <div style="width: 36px; height: 36px; border-radius: 8px;
                background: linear-gradient(135deg, #1A335C, #C9A84C);
                display: flex; align-items: center; justify-content: center;
                color: #FFFFFF;
                font-size: 18px; font-weight: bold;">✦</div>
              <strong style="font-size: 16px; color: #0E1F3D; letter-spacing: 0.05em;">PURE WHITE</strong>
            </div>
            
            <h1 style="font-family: serif; font-size: 22px; margin: 0 0 12px; color: #0E1F3D; font-weight: 600;">
              You have been invited!
            </h1>
            
            <p style="color: #3B4A66; font-size: 14.5px; line-height: 1.6; margin: 0 0 24px;">
              You have been invited to join the <strong>Pure White Phase 1</strong> tracker as a project stakeholder. 
              You will be able to review project milestones, check task progress, download project documents, and communicate securely with the development team.
            </p>
            
            <div style="margin-bottom: 28px; text-align: center;">
              <a href="${inviteLink}"
                 style="display: inline-block; background: linear-gradient(160deg, #22406E, #1A335C); color: #ffffff; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-size: 14px; font-weight: 600; box-shadow: 0 4px 12px rgba(26, 51, 92, 0.15); transition: background 0.15s;">
                Accept Invitation & Join
              </a>
            </div>
            
            <div style="background: #F1ECDF; border-radius: 8px; padding: 14px; font-size: 12.5px; color: #6C7791;">
              <div>
                <strong>Verify Email:</strong> ${email}
              </div>
              <div style="margin-top: 6px; word-break: break-all;">
                <strong>Direct Link:</strong> <a href="${inviteLink}" style="color: #C9A84C; text-decoration: underline;">${inviteLink}</a>
              </div>
            </div>
          </div>
        </div>
      `,
    })

    if (error) {
      return NextResponse.json({ success: false, error }, { status: 400 })
    }

    return NextResponse.json({ success: true, emailId: data?.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || err }, { status: 500 })
  }
}
