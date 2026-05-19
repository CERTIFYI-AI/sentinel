/*
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
 *
 * withRBAC — middleware tests. Covers:
 *   - 403 when Authorization header is missing (missing_token)
 *   - 200 when PostgREST returns `true`
 *   - 403 when PostgREST returns `false` (policy_denied)
 *   - 403 when PostgREST returns non-2xx (policy_denied)
 *   - 403 when the check times out (check_timeout)
 *   - Opaque error codes — the missing permission is NEVER leaked
 *   - fetch() receives correct URL, headers, and JSON body
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { withRBAC } from '../withRBAC'
import type { TenantContext } from '../withTenant'

const OPTS = {
  supabaseUrl: 'https://example.supabase.co',
  anonKey: 'anon-key',
  timeoutMs: 150, // keep tests fast
}

const CTX: TenantContext = {
  // Minimal shape — withRBAC does not read ctx, but we stay type-safe.
  userId: 'user-123',
  orgId: '00000000-0000-0000-0000-000000000000',
  email: 'alice@example.com',
  roles: [],
  tokenExpiresAt: Math.floor(Date.now() / 1000) + 3600,
}

function reqWith(auth?: string): Request {
  const headers: Record<string, string> = {}
  if (auth) headers.authorization = auth
  return new Request('https://edge.example.com/api/thing', { headers })
}

// --- fetch mock ------------------------------------------------------------
let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('withRBAC — request invariants', () => {
  it('returns 403 missing_token when Authorization header is absent', async () => {
    const check = withRBAC(OPTS)
    const { ok, response } = await check(reqWith(), CTX, 'risk.update')

    expect(ok).toBe(false)
    expect(response).not.toBeNull()
    expect(response!.status).toBe(403)
    const body = (await response!.json()) as { code: string; error: string; message: string }
    expect(body.code).toBe('missing_token')
    // The required permission must NEVER be echoed back.
    expect(JSON.stringify(body)).not.toContain('risk.update')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('allows the request when PostgREST returns true', async () => {
    fetchMock.mockResolvedValue(new Response('true', { status: 200 }))

    const check = withRBAC(OPTS)
    const { ok, response } = await check(reqWith('Bearer abc.def.ghi'), CTX, 'risk.update')

    expect(ok).toBe(true)
    expect(response).toBeNull()
  })

  it('calls PostgREST with the canonical URL, headers, and body', async () => {
    fetchMock.mockResolvedValue(new Response('true', { status: 200 }))

    const check = withRBAC(OPTS)
    await check(reqWith('Bearer abc.def.ghi'), CTX, 'iam.users.create')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://example.supabase.co/rest/v1/rpc/has_permission')
    expect(init.method).toBe('POST')
    const headers = init.headers as Record<string, string>
    expect(headers['content-type']).toBe('application/json')
    expect(headers.apikey).toBe('anon-key')
    expect(headers.authorization).toBe('Bearer abc.def.ghi')
    expect(init.body).toBe(JSON.stringify({ perm: 'iam.users.create' }))
  })

  it('honours a custom rpcName', async () => {
    fetchMock.mockResolvedValue(new Response('true', { status: 200 }))

    const check = withRBAC({ ...OPTS, rpcName: 'my_permission_check' })
    await check(reqWith('Bearer abc.def.ghi'), CTX, 'risk.read')

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://example.supabase.co/rest/v1/rpc/my_permission_check')
  })
})

describe('withRBAC — denial paths', () => {
  it('returns 403 policy_denied when PostgREST returns false', async () => {
    fetchMock.mockResolvedValue(new Response('false', { status: 200 }))

    const check = withRBAC(OPTS)
    const { ok, response } = await check(reqWith('Bearer abc'), CTX, 'risk.delete')

    expect(ok).toBe(false)
    expect(response!.status).toBe(403)
    const body = (await response!.json()) as { code: string }
    expect(body.code).toBe('policy_denied')
  })

  it('returns 403 policy_denied when PostgREST returns non-2xx', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 500 }))

    const check = withRBAC(OPTS)
    const { ok, response } = await check(reqWith('Bearer abc'), CTX, 'risk.delete')

    expect(ok).toBe(false)
    expect(response!.status).toBe(403)
    const body = (await response!.json()) as { code: string }
    expect(body.code).toBe('policy_denied')
  })

  it('returns 403 check_timeout when the call exceeds timeoutMs', async () => {
    // fetch that respects the AbortSignal → rejects with AbortError.
    fetchMock.mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('aborted', 'AbortError'))
          })
        }),
    )

    const check = withRBAC({ ...OPTS, timeoutMs: 20 })
    const { ok, response } = await check(reqWith('Bearer abc'), CTX, 'risk.delete')

    expect(ok).toBe(false)
    expect(response!.status).toBe(403)
    const body = (await response!.json()) as { code: string }
    expect(body.code).toBe('check_timeout')
  })

  it('returns 403 check_error on unexpected fetch rejection', async () => {
    fetchMock.mockRejectedValue(new TypeError('network down'))

    const check = withRBAC(OPTS)
    const { ok, response } = await check(reqWith('Bearer abc'), CTX, 'risk.delete')

    expect(ok).toBe(false)
    expect(response!.status).toBe(403)
    const body = (await response!.json()) as { code: string }
    expect(body.code).toBe('check_error')
  })

  it('never leaks the required permission in denial payloads', async () => {
    fetchMock.mockResolvedValue(new Response('false', { status: 200 }))

    const check = withRBAC(OPTS)
    const { response } = await check(reqWith('Bearer abc'), CTX, 'internal.secret.flag')

    const text = await response!.text()
    expect(text).not.toContain('internal.secret.flag')
    expect(text).not.toContain('secret')
  })
})
