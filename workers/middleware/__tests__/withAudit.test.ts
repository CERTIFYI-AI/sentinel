/*
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { withAudit, emitAuditEvent, type AuditContext } from '../withAudit'

const OPTS = {
  supabaseUrl: 'https://example.supabase.co',
  serviceRoleKey: 'svc-key',
  timeoutMs: 100,
}

const CTX: AuditContext = {
  userId: 'user-1',
  orgId: '00000000-0000-0000-0000-000000000000',
  email: 'alice@example.com',
  roles: [],
  tokenExpiresAt: Math.floor(Date.now() / 1000) + 3600,
  ip: '1.2.3.4',
  userAgent: 'vitest',
  traceId: 'trace-1',
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('emitAuditEvent', () => {
  it('POSTs to audit_log_append with service-role bearer', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }))
    await emitAuditEvent(OPTS, CTX, {
      action: 'risk.update',
      resourceType: 'risk',
      resourceId: 'R-1',
      outcome: 'success',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://example.supabase.co/rest/v1/rpc/audit_log_append')
    const headers = init.headers as Record<string, string>
    expect(headers.apikey).toBe('svc-key')
    expect(headers.authorization).toBe('Bearer svc-key')
    const body = JSON.parse(init.body as string)
    expect(body.p_org_id).toBe(CTX.orgId)
    expect(body.p_action).toBe('risk.update')
    expect(body.p_outcome).toBe('success')
  })

  it('never throws on fetch errors (fire-and-forget)', async () => {
    fetchMock.mockRejectedValue(new TypeError('net'))
    const onError = vi.fn()
    await emitAuditEvent({ ...OPTS, onError }, CTX, {
      action: 'risk.update',
      resourceType: 'risk',
      outcome: 'success',
    })
    expect(onError).toHaveBeenCalled()
  })

  it('never throws on non-2xx', async () => {
    fetchMock.mockResolvedValue(new Response('err', { status: 500 }))
    const onError = vi.fn()
    await emitAuditEvent({ ...OPTS, onError }, CTX, {
      action: 'risk.update',
      resourceType: 'risk',
      outcome: 'success',
    })
    expect(onError).toHaveBeenCalled()
  })
})

describe('withAudit()', () => {
  it('emits "success" when handler returns 2xx', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }))
    const handler = vi.fn(async () => new Response('ok', { status: 200 }))
    const audited = withAudit(OPTS, { action: 'risk.read', resourceType: 'risk' }, handler)

    const resp = await audited(new Request('https://e/x'), CTX)
    expect(resp.status).toBe(200)
    // Wait a microtask for the fire-and-forget.
    await new Promise((r) => setTimeout(r, 10))
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string)
    expect(body.p_outcome).toBe('success')
  })

  it('emits "denied" when handler returns 403', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }))
    const handler = vi.fn(async () => new Response('nope', { status: 403 }))
    const audited = withAudit(OPTS, { action: 'risk.update', resourceType: 'risk' }, handler)

    await audited(new Request('https://e/x'), CTX)
    await new Promise((r) => setTimeout(r, 10))
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string)
    expect(body.p_outcome).toBe('denied')
  })

  it('emits "failure" when handler throws', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }))
    const handler = vi.fn(async () => {
      throw new Error('boom')
    })
    const audited = withAudit(OPTS, { action: 'risk.update', resourceType: 'risk' }, handler)

    const resp = await audited(new Request('https://e/x'), CTX)
    expect(resp.status).toBe(500)
    await new Promise((r) => setTimeout(r, 10))
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string)
    expect(body.p_outcome).toBe('failure')
  })

  it('handler failure does not turn success into failure', async () => {
    // Audit write errors must not affect the response.
    fetchMock.mockRejectedValue(new Error('audit down'))
    const handler = vi.fn(async () => new Response('ok', { status: 200 }))
    const audited = withAudit(
      { ...OPTS, onError: vi.fn() },
      { action: 'x.y', resourceType: 'x' },
      handler,
    )
    const resp = await audited(new Request('https://e/x'), CTX)
    expect(resp.status).toBe(200)
  })
})
