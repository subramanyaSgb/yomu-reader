// Two-tier image byte cache (FR-15). Cache BYTES not URLs (URLs expire in 15 min).
// 'cache' tier = evictable read-cache; 'download' tier = permanent. TDD §7.

import { db, type StorageTier } from '../../lib/db/schema'

function key(chapterId: string, pageIndex: number) {
  return `${chapterId}:${pageIndex}`
}

/** Return a cached blob for a page, or undefined. Touches lastAccess (LRU). */
export async function getCachedBlob(
  chapterId: string,
  pageIndex: number,
): Promise<Blob | undefined> {
  const k = key(chapterId, pageIndex)
  const row = await db.imageBytes.get(k)
  if (!row) return undefined
  // Touch LRU (only meaningful for the evictable tier).
  if (row.tier === 'cache') {
    await db.imageBytes.update(k, { lastAccess: Date.now() })
  }
  return row.blob
}

/** Store page bytes at a tier. 'download' upgrades an existing 'cache' entry (never downgrade). */
export async function putBytes(
  chapterId: string,
  pageIndex: number,
  blob: Blob,
  tier: StorageTier,
  now: number = Date.now(),
) {
  const k = key(chapterId, pageIndex)
  const existing = await db.imageBytes.get(k)
  const finalTier: StorageTier =
    existing?.tier === 'download' || tier === 'download' ? 'download' : 'cache'
  await db.imageBytes.put({
    key: k,
    chapterId,
    pageIndex,
    blob,
    tier: finalTier,
    bytes: blob.size,
    lastAccess: now,
  })
}

/**
 * Fetch a page through the proxy and cache the bytes. Returns the blob.
 * `fetchImpl` is injectable for tests.
 */
export async function fetchAndCache(
  chapterId: string,
  pageIndex: number,
  proxyUrl: string,
  tier: StorageTier = 'cache',
  fetchImpl: typeof fetch = fetch,
): Promise<Blob> {
  const cached = await getCachedBlob(chapterId, pageIndex)
  if (cached) return cached
  const res = await fetchImpl(proxyUrl)
  if (!res.ok) throw new Error(`image fetch ${res.status}`)
  const blob = await res.blob()
  await putBytes(chapterId, pageIndex, blob, tier)
  return blob
}

/** Total bytes currently stored, optionally by tier. */
export async function usage(tier?: StorageTier): Promise<number> {
  const rows = tier
    ? await db.imageBytes.where('tier').equals(tier).toArray()
    : await db.imageBytes.toArray()
  return rows.reduce((sum, r) => sum + r.bytes, 0)
}
