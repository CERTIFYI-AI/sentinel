// SPDX-License-Identifier: Apache-2.0
// LCS line diff for policy version comparison. Pure and dependency-free:
// given two plain-text projections (see lib/richtext contentToPlainText),
// returns the per-line edit script. Rendering maps 'added' to the --s-ok-*
// tokens and 'removed' to --s-er-*.

export interface DiffLine {
  type: 'same' | 'added' | 'removed'
  text: string
}

/** Longest-common-subsequence diff over lines. O(n·m) — policy texts are
 *  small (hundreds of lines), so the quadratic table is fine. */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = before === '' ? [] : before.split('\n')
  const b = after === '' ? [] : after.split('\n')
  const n = a.length
  const m = b.length

  // lcs[i][j] = LCS length of a[i..] and b[j..]
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j]
        ? lcs[i + 1][j + 1] + 1
        : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }

  const out: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: 'same', text: a[i] })
      i++; j++
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push({ type: 'removed', text: a[i] })
      i++
    } else {
      out.push({ type: 'added', text: b[j] })
      j++
    }
  }
  while (i < n) { out.push({ type: 'removed', text: a[i] }); i++ }
  while (j < m) { out.push({ type: 'added', text: b[j] }); j++ }
  return out
}

/** Summary counts for a diff — drives the "+n −m" badge. */
export function diffStats(lines: DiffLine[]): { added: number; removed: number } {
  let added = 0
  let removed = 0
  for (const l of lines) {
    if (l.type === 'added') added++
    else if (l.type === 'removed') removed++
  }
  return { added, removed }
}
