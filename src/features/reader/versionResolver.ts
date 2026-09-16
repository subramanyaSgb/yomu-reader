// Chapter-version resolver — the comix model (FR-3, TDD §3.4).
// Input: raw English chapter feed (all scanlation groups). Output: one continuous
// English chapter list, one selected version per chapter NUMBER, plus the full version
// pool per number (for the in-reader switcher).
//
// Selection rules:
//   1. "Prefer one group": if a preferred group is set and has a version for this number,
//      use it.
//   2. Gap-fill: otherwise pick the best available by likes desc, then pages (coverage) desc,
//      then most recent as a stable tiebreaker.
// Chapters with no English version simply don't appear (gaps allowed — accepted per PD3).

export interface RawChapter {
  id: string
  number: string | null // attributes.chapter
  group: string // scanlation group name (or 'unknown')
  likes: number
  pages: number
  publishAt: string
}

export interface ResolvedVersion {
  id: string
  group: string
  likes: number
  pages: number
}

export interface ResolvedChapter {
  number: string | null
  selectedVersionId: string
  versions: ResolvedVersion[] // full pool for this number, best-first
  publishedAt: string
}

function bestOf(pool: RawChapter[], preferredGroup?: string): RawChapter {
  if (preferredGroup) {
    const preferred = pool.filter((c) => c.group === preferredGroup)
    if (preferred.length > 0) return rank(preferred)[0]
  }
  return rank(pool)[0]
}

/** Rank by likes desc, then pages (coverage) desc, then newest — deterministic. */
function rank(pool: RawChapter[]): RawChapter[] {
  return [...pool].sort((a, b) => {
    if (b.likes !== a.likes) return b.likes - a.likes
    if (b.pages !== a.pages) return b.pages - a.pages
    return b.publishAt.localeCompare(a.publishAt)
  })
}

/** Numeric-aware chapter sort (so "10" > "9", and null/oneshot sinks to the end). */
function byChapterNumber(a: string | null, b: string | null): number {
  const na = a === null ? Infinity : Number(a)
  const nb = b === null ? Infinity : Number(b)
  if (Number.isNaN(na) && Number.isNaN(nb)) return (a ?? '').localeCompare(b ?? '')
  if (Number.isNaN(na)) return 1
  if (Number.isNaN(nb)) return -1
  return na - nb
}

export function resolveChapters(
  feed: RawChapter[],
  preferredGroup?: string,
): ResolvedChapter[] {
  // Group by chapter number.
  const byNumber = new Map<string, RawChapter[]>()
  for (const ch of feed) {
    const key = ch.number ?? '__null__'
    const arr = byNumber.get(key)
    if (arr) arr.push(ch)
    else byNumber.set(key, [ch])
  }

  const resolved: ResolvedChapter[] = []
  for (const pool of byNumber.values()) {
    const chosen = bestOf(pool, preferredGroup)
    resolved.push({
      number: chosen.number,
      selectedVersionId: chosen.id,
      versions: rank(pool).map((c) => ({
        id: c.id,
        group: c.group,
        likes: c.likes,
        pages: c.pages,
      })),
      publishedAt: chosen.publishAt,
    })
  }

  resolved.sort((a, b) => byChapterNumber(a.number, b.number))
  return resolved
}

/**
 * Infer a sensible preferred group: the group that covers the most chapter numbers.
 * Used as the default for "prefer one group" when the user hasn't picked one.
 */
export function inferPreferredGroup(feed: RawChapter[]): string | undefined {
  const coverage = new Map<string, Set<string>>()
  for (const ch of feed) {
    const set = coverage.get(ch.group) ?? new Set()
    set.add(ch.number ?? '__null__')
    coverage.set(ch.group, set)
  }
  let best: string | undefined
  let bestCount = 0
  for (const [group, set] of coverage) {
    if (set.size > bestCount) {
      bestCount = set.size
      best = group
    }
  }
  return best
}
