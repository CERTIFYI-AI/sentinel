// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
// N-11 — Hourly LLM Executive Digest generation.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  const sb = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  )
  const { org_id } = await req.json().catch(() => ({}))
  if (!org_id) return new Response(JSON.stringify({ error: 'org_id required' }), { status: 400 })

  // Gather live data for digest
  const [risks, incidents, controls] = await Promise.all([
    sb.from('risks').select('severity,status').eq('org_id', org_id),
    sb.from('incidents').select('severity,status').eq('org_id', org_id),
    sb.from('controls').select('status').eq('org_id', org_id).limit(1000),
  ])

  const openCritical = (risks.data ?? []).filter(r => r.severity === 'CRITICAL' && r.status === 'OPEN').length
  const openHigh = (risks.data ?? []).filter(r => r.severity === 'HIGH' && r.status === 'OPEN').length
  const openP0 = (incidents.data ?? []).filter(i => i.severity === 'P0' && i.status !== 'CLOSED').length
  const controlsPassing = (controls.data ?? []).filter(c => c.status === 'PASSING').length
  const controlsTotal = (controls.data ?? []).length

  const apiKey = Deno.env.get('OPENAI_API_KEY')
  let content = `**AI Governance Executive Digest** (auto-generated)\n\n`
  content += `**Risk Posture:** ${openCritical} critical + ${openHigh} high open risks\n`
  content += `**Incidents:** ${openP0} active P0/P1 incidents under investigation\n`
  content += `**Controls:** ${controlsPassing}/${controlsTotal} controls passing (${controlsTotal ? Math.round(100*controlsPassing/controlsTotal) : 0}%)\n\n`

  if (apiKey) {
    try {
      const llmResp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 300,
          messages: [
            { role: 'system', content: 'You are a Chief Risk Officer writing a 3-sentence board-level AI governance summary. Be direct, no jargon.' },
            { role: 'user', content: `Generate a board digest from: ${content}` }
          ]
        })
      })
      const llmData = await llmResp.json()
      const aiText = llmData.choices?.[0]?.message?.content ?? ''
      if (aiText) content = aiText + '\n\n---\n' + content
    } catch { /* fallback to metrics-only digest */ }
  }

  await sb.from('executive_digests').insert({
    org_id, content, model_used: apiKey ? 'gpt-4o-mini' : 'metrics-only',
    generated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7200000).toISOString(),
  })

  return new Response(JSON.stringify({ success: true, preview: content.slice(0, 200) }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
