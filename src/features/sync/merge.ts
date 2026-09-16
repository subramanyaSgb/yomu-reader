// Last-write-wins merge (FR-20 AC3). Single user across devices => LWW by updatedAt is
// correct and simple (no CRDT needed). Pure + hard-tested.

export interface Timestamped {
  updatedAt: number
}

/** Merge two records of the same id: newer updatedAt wins. Ties keep `local` (stable). */
export function mergeRecord<T extends Timestamped>(local: T | undefined, remote: T | undefined): T | undefined {
  if (!local) return remote
  if (!remote) return local
  return remote.updatedAt > local.updatedAt ? remote : local
}

/**
 * Merge two keyed collections by id. Returns the merged map. Deletions are represented by
 * a tombstone (updatedAt set, `deleted: true`) so a delete on one device can win over an
 * older edit on another.
 */
export interface Keyed extends Timestamped {
  id: string
  deleted?: boolean
}

export function mergeCollections<T extends Keyed>(
  local: T[],
  remote: T[],
): T[] {
  const byId = new Map<string, T>()
  for (const r of local) byId.set(r.id, r)
  for (const r of remote) {
    const merged = mergeRecord(byId.get(r.id), r)
    if (merged) byId.set(r.id, merged)
  }
  // Drop tombstones from the live view (callers persist tombstones separately if needed).
  return [...byId.values()].filter((r) => !r.deleted)
}

/** For a single scalar record like progress-per-series, expose which side to keep. */
export function pickNewer<T extends Timestamped>(a: T, b: T): T {
  return b.updatedAt > a.updatedAt ? b : a
}
