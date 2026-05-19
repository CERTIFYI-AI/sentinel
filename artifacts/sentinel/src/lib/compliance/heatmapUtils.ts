/**
 * Deterministic score generator using string seed.
 * Produces consistent scores for the same seed across renders.
 */
export function deterministicScore(seed: string, min = 60, max = 99): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const normalized = (((hash < 0 ? -hash : hash) % 1000) / 1000);
  return min + (normalized * (max - min)) | 0;
}

export function scoreColor(score: number): { text: string; bg: string } {
  if (score >= 80) return { text: 'var(--pass)', bg: 'var(--pass-bg)' };
  if (score >= 60) return { text: 'var(--warn)', bg: 'var(--warn-bg)' };
  return { text: 'var(--fail)', bg: 'var(--fail-bg)' };
}

export function scoreLabel(score: number): 'pass' | 'warn' | 'fail' {
  if (score >= 80) return 'pass';
  if (score >= 60) return 'warn';
  return 'fail';
}