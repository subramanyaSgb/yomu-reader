// Comick second-source matching (FR-4, tentative/v2). Pure fuzzy match of a MangaDex series
// to a Comick candidate by normalized title (+ optional author), with a manual-link override.
// Reuses the Jaccard from duplicateDetection. Comick instability is why this is opt-in.

import { normalizeTitle, jaccard } from '../library/duplicateDetection'

export interface Candidate {
  id: string
  title: string
  author?: string
}

export interface MatchResult {
  candidate: Candidate
  score: number
}

function tokens(s: string): Set<string> {
  return new Set(normalizeTitle(s).split(' ').filter(Boolean))
}

/** Best fuzzy match above threshold, else null. Author agreement boosts score. */
export function bestMatch(
  sourceTitle: string,
  sourceAuthor: string | undefined,
  candidates: Candidate[],
  threshold = 0.6,
): MatchResult | null {
  const st = tokens(sourceTitle)
  let best: MatchResult | null = null
  for (const c of candidates) {
    let score = jaccard(st, tokens(c.title))
    if (sourceAuthor && c.author && normalizeTitle(sourceAuthor) === normalizeTitle(c.author)) {
      score = Math.min(1, score + 0.15) // author agreement boost
    }
    if (score >= threshold && (!best || score > best.score)) {
      best = { candidate: c, score }
    }
  }
  return best
}

/** Manual link always wins over fuzzy match (user is authoritative). */
export function resolveMatch(
  manualLinkId: string | undefined,
  candidates: Candidate[],
  fuzzy: MatchResult | null,
): Candidate | null {
  if (manualLinkId) {
    return candidates.find((c) => c.id === manualLinkId) ?? null
  }
  return fuzzy?.candidate ?? null
}
