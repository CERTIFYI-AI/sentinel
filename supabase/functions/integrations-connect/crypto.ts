/*
 * Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
 *
 * AES-256-GCM credential encryption for the integrations-connect edge function,
 * byte-compatible with the Python sync worker (sentinel/integrations/crypto.py).
 *
 * Blob shape: { v: 1, nonce: b64(12 bytes), ciphertext: b64(ciphertext||tag) }.
 * Web Crypto's AES-GCM output already appends the 128-bit tag, exactly like
 * Python's `cryptography` AESGCM, so the worker decrypts this without
 * adaptation. The contract is pinned by crypto_interop_test.ts.
 *
 * This module is deliberately server-free (no serve() call) so it can be
 * imported by the test without starting the HTTP handler.
 */

export function bytesToB64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

export function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export async function encryptCredentials(
  credentials: Record<string, unknown>,
  keyB64: string,
): Promise<{ v: number; nonce: string; ciphertext: string }> {
  const rawKey = b64ToBytes(keyB64)
  if (rawKey.length !== 32) {
    throw new Error('SENTINEL_CREDENTIALS_KEY must decode to exactly 32 bytes')
  }
  const key = await crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt'])
  const nonce = crypto.getRandomValues(new Uint8Array(12))
  const plaintext = new TextEncoder().encode(JSON.stringify(credentials))
  const ctBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, plaintext)
  return { v: 1, nonce: bytesToB64(nonce), ciphertext: bytesToB64(new Uint8Array(ctBuf)) }
}
