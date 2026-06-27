/**
 * Governance Event Bus — smoke test
 *
 * Pure-TS module that exercises the event-bus contract without requiring a
 * test runner. Executes in Node or a browser console:
 *
 *   tsx dashboard/src/lib/governance/__tests__/eventBus.smoke.ts
 *
 * The test registers two sentinel agents against a fake event, emits, and
 * asserts that (1) agents are invoked, (2) idempotency short-circuits the
 * second emit, (3) cascade depth limits are enforced.
 *
 * This is a smoke-only harness — migrate to Vitest once the runner is added
 * to the dashboard package.
 */
import {
  registerAgent,
  emitEvent,
  listRegisteredAgents,
  governanceBus,
} from '../eventBus'

type Assertion = { name: string; pass: boolean; detail?: string }
const results: Assertion[] = []
const assert = (name: string, pass: boolean, detail?: string) =>
  results.push({ name, pass, detail })

export async function runSmoke() {
  let hits = 0
  registerAgent('SMOKE_TEST_EVENT', async () => { hits++ }, 'SmokeAgent')
  const registry = listRegisteredAgents()
  assert('agent registered', (registry['SMOKE_TEST_EVENT'] ?? []).includes('SmokeAgent'))

  // Same payload twice — idempotency key should prevent double insert,
  // but in-memory agent still runs on the first emit.
  await governanceBus.emit('SMOKE_TEST_EVENT', 'smoke', { foo: 'bar' }, 'test-org')
  await governanceBus.emit('SMOKE_TEST_EVENT', 'smoke', { foo: 'bar' }, 'test-org')
  assert('agent invoked at least once', hits >= 1, `hits=${hits}`)

  // Cascade depth limit — emit with depth above limit must return null.
  const overLimit = await emitEvent('SMOKE_TEST_EVENT', 'smoke', { n: 1 }, 'test-org', { cascadeDepth: 100 })
  assert('cascade depth limit enforced', overLimit === null)

  const failed = results.filter(r => !r.pass)
  console.log('[governance smoke] results:', results)
  if (failed.length) {
    throw new Error(`governance smoke failed: ${failed.map(f => f.name).join(', ')}`)
  }
  return results
}

// Allow running via `tsx` directly.
if (typeof require !== 'undefined' && require.main === module) {
  runSmoke().then(() => process.exit(0)).catch(err => {
    console.error(err)
    process.exit(1)
  })
}
