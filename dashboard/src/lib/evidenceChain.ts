/**
 * Cryptographic Evidence Chain
 * Creates SHA-256 hash chain for tamper-proof compliance audit trail.
 * Each entry links to the previous via prevHash, forming an immutable chain.
 */

let chainState: { prevHash: string; entryCount: number } = {
  prevHash: '0'.repeat(64),
  entryCount: 0,
};

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface ChainEntry {
  index: number;
  timestamp: string;
  action: string;
  entityType: string;
  entityId: string;
  actor: string;
  prevHash: string;
  hash: string;
  payload?: Record<string, unknown>;
}

const chainLog: ChainEntry[] = [];

export async function appendToChain(
  action: string,
  entityType: string,
  entityId: string,
  actor: string,
  payload?: Record<string, unknown>
): Promise<ChainEntry> {
  const entry: Omit<ChainEntry, 'hash'> = {
    index: chainState.entryCount,
    timestamp: new Date().toISOString(),
    action,
    entityType,
    entityId,
    actor,
    prevHash: chainState.prevHash,
    payload,
  };
  const hash = await sha256(JSON.stringify(entry));
  const fullEntry: ChainEntry = { ...entry, hash };
  chainLog.push(fullEntry);
  chainState = { prevHash: hash, entryCount: chainState.entryCount + 1 };
  return fullEntry;
}

export async function verifyChain(): Promise<{ valid: boolean; entries: number; brokenAt?: number }> {
  let prevHash = '0'.repeat(64);
  for (let i = 0; i < chainLog.length; i++) {
    const entry = chainLog[i];
    if (entry.prevHash !== prevHash) return { valid: false, entries: chainLog.length, brokenAt: i };
    const checkObj = { ...entry };
    delete (checkObj as any).hash;
    const computed = await sha256(JSON.stringify(checkObj));
    if (computed !== entry.hash) return { valid: false, entries: chainLog.length, brokenAt: i };
    prevHash = entry.hash;
  }
  return { valid: true, entries: chainLog.length };
}

export function getChainLog(): ChainEntry[] {
  return [...chainLog];
}

export function getChainStats() {
  return {
    totalEntries: chainLog.length,
    lastHash: chainState.prevHash,
    firstEntry: chainLog[0]?.timestamp ?? null,
    lastEntry: chainLog[chainLog.length - 1]?.timestamp ?? null,
  };
}
