// Evidence chain with SHA-256 integrity hashing

export async function sha256(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256File(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface EvidenceRecord {
  entityType: string;
  entityId: string;
  action: string;
  payload: string;
  sha256: string;
  previousHash: string | null;
  timestamp: string;
}

let lastHash: string | null = null;

export async function createEvidenceRecord(
  entityType: string,
  entityId: string,
  action: string,
  payload: Record<string, unknown>
): Promise<EvidenceRecord> {
  const payloadStr = JSON.stringify(payload);
  const chainContent = [entityType, entityId, action, payloadStr, lastHash ?? 'GENESIS', new Date().toISOString()].join('|');
  const hash = await sha256(chainContent);
  const record: EvidenceRecord = {
    entityType,
    entityId,
    action,
    payload: payloadStr,
    sha256: hash,
    previousHash: lastHash,
    timestamp: new Date().toISOString(),
  };
  lastHash = hash;
  return record;
}
