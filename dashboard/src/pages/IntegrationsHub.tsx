// @ts-nocheck
// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
// WS8 — Integrations Hub: manage third-party connections and webhooks.
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRequiredOrgId } from '../hooks/useTenant'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { useToast } from '../hooks/use-toast'

const PROVIDER_ICONS: Record<string, string> = {
  jira: '🔵', servicenow: '🟢', slack: '💬', teams: '🟣',
  pagerduty: '🔴', splunk: '🟠', datadog: '🐶', okta: '🔐',
  github_actions: '⚙️', aws_security_hub: '☁️', snyk: '🛡️', linear: '📐',
}

export default function IntegrationsHub() {
  const orgId = useRequiredOrgId()
  const { toast } = useToast()
  const [connections, setConnections] = useState<any[]>([])
  const [webhooks, setWebhooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'integrations' | 'webhooks' | 'api_keys'>('integrations')
  const [showWebhookForm, setShowWebhookForm] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookEvents, setWebhookEvents] = useState('')

  useEffect(() => {
    if (!orgId) return
    Promise.all([
      supabase.from('integration_connections').select('*').eq('org_id', orgId).order('created_at', { ascending: false }),
      supabase.from('webhook_endpoints').select('*').eq('org_id', orgId).order('created_at', { ascending: false }),
    ]).then(([c, w]) => {
      setConnections(c.data ?? [])
      setWebhooks(w.data ?? [])
      setLoading(false)
    })
  }, [orgId])

  async function createWebhook() {
    if (!webhookUrl.startsWith('https://')) { toast({ title: 'URL must start with https://', variant: 'destructive' }); return }
    const secret = crypto.randomUUID().replace(/-/g, '')
    const { error } = await supabase.from('webhook_endpoints').insert({
      org_id: orgId,
      url: webhookUrl,
      event_types: webhookEvents ? webhookEvents.split(',').map(s => s.trim()) : [],
      secret_hash: secret,
      secret_prefix: secret.slice(0, 8),
      is_active: true,
    })
    if (error) { toast({ title: 'Failed to create webhook', description: error.message, variant: 'destructive' }); return }
    toast({ title: 'Webhook registered', description: `Signing secret prefix: ${secret.slice(0, 8)}...` })
    setShowWebhookForm(false)
    setWebhookUrl('')
    const { data } = await supabase.from('webhook_endpoints').select('*').eq('org_id', orgId).order('created_at', { ascending: false })
    setWebhooks(data ?? [])
  }

  if (loading) return <div className="p-8 text-zinc-400">Loading integrations...</div>

  return (
    <main id="main-content" className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Integrations Hub</h1>
        <p className="text-zinc-500 text-sm mt-1">Connect Sentinel to your security and operations toolchain.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-200">
        {(['integrations','webhooks','api_keys'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${tab === t ? 'border-b-2 border-[#368F4D] text-[#368F4D]' : 'text-zinc-500 hover:text-zinc-900'}`}>
            {t.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Integrations Tab */}
      {tab === 'integrations' && (
        <div>
          {connections.length === 0 ? (
            <div className="text-center py-16 text-zinc-400">
              <p className="text-lg font-medium">No integrations connected</p>
              <p className="text-sm mt-1">Connect Jira, ServiceNow, Slack, PagerDuty and more to automate incident response.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {connections.map((c) => (
                <div key={c.id} className="border border-zinc-200 rounded p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{PROVIDER_ICONS[c.provider] ?? '🔗'}</span>
                    <div>
                      <p className="font-medium text-sm text-zinc-900">{c.display_name}</p>
                      <p className="text-xs text-zinc-400 capitalize">{c.provider}</p>
                    </div>
                    <Badge className="ml-auto" variant={c.status === 'connected' ? 'default' : 'secondary'}>{c.status}</Badge>
                  </div>
                  {c.last_sync_at && <p className="text-xs text-zinc-400">Last sync: {new Date(c.last_sync_at).toLocaleDateString()}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Webhooks Tab */}
      {tab === 'webhooks' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-zinc-500">Receive real-time governance events at your HTTPS endpoints. All deliveries are HMAC-SHA256 signed.</p>
            <Button size="sm" onClick={() => setShowWebhookForm(true)}>Add Webhook</Button>
          </div>

          {showWebhookForm && (
            <div className="border border-zinc-200 rounded p-4 space-y-3 bg-zinc-50">
              <Input placeholder="https://your-endpoint.example.com/webhook" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} />
              <Input placeholder="Event types (comma-separated, e.g. MODEL_REGISTERED,RISK_DETECTED) — leave blank for all" value={webhookEvents} onChange={e => setWebhookEvents(e.target.value)} />
              <div className="flex gap-2">
                <Button size="sm" onClick={createWebhook}>Register</Button>
                <Button size="sm" variant="outline" onClick={() => setShowWebhookForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {webhooks.length === 0 ? (
            <p className="text-center py-8 text-zinc-400 text-sm">No webhooks registered yet.</p>
          ) : (
            <div className="space-y-2">
              {webhooks.map((w) => (
                <div key={w.id} className="border border-zinc-200 rounded p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">{w.url}</p>
                    <p className="text-xs text-zinc-400">Signing prefix: {w.secret_prefix}... · {w.event_types?.length ? w.event_types.join(', ') : 'All events'}</p>
                  </div>
                  <Badge variant={w.is_active ? 'default' : 'secondary'}>{w.is_active ? 'Active' : 'Disabled'}</Badge>
                  <p className="text-xs text-zinc-400">{w.failure_count} failures</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* API Keys Tab */}
      {tab === 'api_keys' && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-500">Machine-to-machine API keys for OpenAPI 3.1 consumers. Keys are shown once on creation and stored hashed.</p>
          <div className="border border-zinc-200 rounded p-6 text-center text-zinc-400">
            <p className="font-medium">API key management</p>
            <p className="text-sm mt-1">Create keys via the Supabase dashboard or service role for now. Self-service UI coming in next sprint.</p>
          </div>
        </div>
      )}
    </main>
  )
}
