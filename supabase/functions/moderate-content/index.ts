// Supabase Edge Function: moderate-content
// Deploy with: supabase functions deploy moderate-content
// Required secrets:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// Called by: Web App (ask questions), Tracker (future content writes)
// Flow: content → Claude Haiku classification → CLEAN/FLAGGED/BLOCK
//   CLEAN   → insert to target table, return 200
//   FLAGGED → insert to flagged_content for Trustee review, return 200
//   BLOCK   → insert to flagged_content (silent), return 422

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

async function classify(content: string): Promise<'CLEAN' | 'FLAGGED' | 'BLOCK'> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'anthropic-version': '2023-06-01',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [{
        role: 'user',
        content: `You are a content moderator for a Christian faith sanctuary app.
Classify the message below. Reply with exactly one word — nothing else.

CLEAN   = appropriate faith content: scripture questions, prayer, personal struggle, theology
FLAGGED = unclear intent, off-topic, or mildly inappropriate — needs a human Trustee to review
BLOCK   = explicit content, hate speech, slurs, harassment, spam, or clearly abusive

Message:
"""
${content.slice(0, 2000)}
"""`,
      }],
    }),
  })

  if (!res.ok) return 'FLAGGED' // fail safe — don't block on API error

  const data = await res.json()
  const raw = (data.content?.[0]?.text ?? '').trim().toUpperCase()
  if (['CLEAN', 'FLAGGED', 'BLOCK'].includes(raw)) return raw as 'CLEAN' | 'FLAGGED' | 'BLOCK'
  return 'FLAGGED'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { content, alias, content_type, source_app } = await req.json()

    if (!content?.trim()) return json({ error: 'content is required' }, 400)

    const verdict = await classify(content)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ── BLOCK — log silently, reject ──────────────────────────────────
    if (verdict === 'BLOCK') {
      await supabase.from('flagged_content').insert({
        source_app: source_app ?? 'unknown',
        content_type: content_type ?? 'unknown',
        content,
        verdict: 'BLOCK',
        reason: 'AI: content blocked at submission',
        user_alias: alias ?? 'Anonymous',
      })
      return json({ verdict: 'BLOCK', message: 'Content could not be submitted.' }, 422)
    }

    // ── FLAGGED — queue for Trustee review ────────────────────────────
    if (verdict === 'FLAGGED') {
      await supabase.from('flagged_content').insert({
        source_app: source_app ?? 'unknown',
        content_type: content_type ?? 'unknown',
        content,
        verdict: 'FLAGGED',
        reason: 'AI: needs Trustee review',
        user_alias: alias ?? 'Anonymous',
      })
      return json({ verdict: 'FLAGGED', message: 'Your message is under review.' })
    }

    // ── CLEAN — write to intended table ───────────────────────────────
    if (content_type === 'ask_question') {
      await supabase.from('ask_questions').insert({
        question: content,
        alias: alias ?? 'Anonymous',
        source: source_app ?? 'web',
      })
    }
    // Future content types (tasks, creeds, etc.) added here

    return json({ verdict: 'CLEAN', message: 'Received.' })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
