// Duplicate/similar detection (FR-24): warn when a series appears under multiple titles so
// the user doesn't double-track. Normalize titles, then cluster by normalized-title equality
// plus a light similarity (token Jaccard) for near-matches.

export interface TitledSeries {
  seriesId: string
  title: string
}

/** Lowercase, strip punctuation, collapse whitespace, drop common noise words. */
export function normalizeTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\b(the|a|an|manga|manhwa|manhua|webtoon|official|colored?)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokens(t: string): Set<string> {
  return new Set(normalizeTitle(t).split(' ').filter(Boolean))
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  const union = a.size + b.size - inter
  return union === 0 ? 0 : inter / union
}

/** Cluster series whose titles are equal-normalized OR similar (Jaccard >= threshold). */
export function findDuplicates(
  series: TitledSeries[],
  threshold = 0.8,
): TitledSeries[][] {
  const toks = series.map((s) => tokens(s.title))
  const parent = series.map((_, i) => i)
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  const union = (i: number, j: number) => {
    parent[find(i)] = find(j)
  }

  for (let i = 0; i < series.length; i++) {
    for (let j = i + 1; j < series.length; j++) {
      if (jaccard(toks[i], toks[j]) >= threshold) union(i, j)
    }
  }

  const groups = new Map<number, TitledSeries[]>()
  series.forEach((s, i) => {
    const root = find(i)
    const arr = groups.get(root) ?? []
    arr.push(s)
    groups.set(root, arr)
  })
  // Only clusters with >1 member are "duplicates".
  return [...groups.values()].filter((g) => g.length > 1)
}
