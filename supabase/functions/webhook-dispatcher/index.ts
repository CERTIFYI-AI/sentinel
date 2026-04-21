// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
// WS8 — Webhook Dispatcher Edge Function
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

async function hmacSign(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return 'sha256=' + Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2,'0')).join('')
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })
  const sb = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  )
  const body = await req.json().catch(() => ({}))
  const event = body.record ?? body
  if (!event?.id || !event?.org_id) return new Response(JSON.stringify({ error: 'invalid-event' }), { status: 400 })

  const { data: endpoints } = await sb.from('webhook_endpoints').select('*').eq('org_id', event.org_id).eq('is_active', true)
  if (!endpoints?.length) return new Response(JSON.stringify({ dispatched: 0 }))

  const matching = endpoints.filter((ep: any) => ep.event_types.length === 0 || ep.event_types.includes(event.event_type))
  const results = await Promise.allSettled(matching.map(async (ep: any) => {
    const payload = JSON.stringify({ id: event.id, event_type: event.event_type, org_id: event.org_id, payload: event.payload, created_at: event.created_at, sentinel_version: '1.0.0' })
    const signature = await hmacSign(ep.secret_hash, payload)
    const started = Date.now()
    let httpStatus = 0, responseBody = ''
    try {
      const resp = await fetch(ep.url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Sentinel-Signature': signature, 'X-Sentinel-Event': event.event_type, 'X-Sentinel-Delivery': event.id, 'User-Agent': 'Sentinel-Webhooks/1.0' }, body: payload, signal: AbortSignal.timeout(ep.timeout_sec * 1000) })
      httpStatus = resp.status; responseBody = await resp.text().catch(() => '')
    } catch (e) { responseBody = (e as Error).message }
    const success = httpStatus >= 200 && httpStatus < 300
    await sb.from('webhook_deliveries').insert({ org_id: event.org_id, endpoint_id: ep.id, governance_event_id: event.id, event_type: event.event_type, payload: JSON.parse(payload), signature, status: success ? 'delivered' : 'failed', http_status: httpStatus, response_body: responseBody.slice(0, 500), latency_ms: Date.now() - started, delivered_at: success ? new Date().toISOString() : null })
    return { endpoint_id: ep.id, status: success ? 'delivered' : 'failed', http_status: httpStatus }
  }))
  return new Response(JSON.stringify({ dispatched: matching.length, results }), { headers: { 'Content-Type': 'application/json' } })
})
