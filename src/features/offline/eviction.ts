// Read-cache eviction (FR-16): when storage is under pressure, evict OLDEST 'cache'-tier
// bytes by lastAccess until under budget. NEVER evict 'download'-tier (permanent).
// ponytail: simple LRU by lastAccess — good enough; upgrade to size-weighted only if a
// real workload shows thrashing.

import { db } from '../../lib/db/schema'
import { usage } from './imageCache'

/**
 * Evict evictable read-cache until total cache-tier usage <= budgetBytes.
 * Returns bytes freed. Downloads are untouched.
 */
export async function evictToBudget(budgetBytes: number): Promise<number> {
  let cacheUsage = await usage('cache')
  if (cacheUsage <= budgetBytes) return 0

  // Oldest first.
  const evictable = await db.imageBytes
    .where('tier')
    .equals('cache')
    .sortBy('lastAccess')

  let freed = 0
  for (const row of evictable) {
    if (cacheUsage - freed <= budgetBytes) break
    await db.imageBytes.delete(row.key)
    freed += row.bytes
  }
  return freed
}

/**
 * Estimate quota pressure via the Storage API and evict if we're above `highWater`
 * fraction of the quota. Returns bytes freed (0 if API unavailable or fine).
 */
export async function evictIfPressured(
  highWater = 0.9,
  estimateImpl?: () => Promise<StorageEstimate>,
): Promise<number> {
  const est = estimateImpl
    ? await estimateImpl()
    : typeof navigator !== 'undefined' && navigator.storage?.estimate
      ? await navigator.storage.estimate()
      : null
  if (!est?.quota || !est.usage) return 0
  if (est.usage < est.quota * highWater) return 0
  // Free down to 70% of quota worth of cache (rough target).
  const target = Math.max(0, est.quota * 0.7 - (await usage('download')))
  return evictToBudget(target)
}
