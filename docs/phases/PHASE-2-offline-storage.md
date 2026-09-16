# Phase 2 — Offline & Storage

**SDLC ref:** SDLC.md Phase 2 · **Status:** PLANNED · **Started:** 2026-09-16

## Goal
Reliable offline reading: cache image bytes locally (two-tier), explicit downloads (single/range/series/auto-keep-N), automatic read-cache eviction that never touches downloads, and exact-position resume persisted to DB.

## Scope (FR / TDD refs)
FR-14 (download scopes), FR-15 (two-tier byte cache), FR-16 (storage mgmt + eviction), FR-17 (wifi guard), FR-18 (exact-position resume persistence). TDD §4 (imageBytes/downloads tables), §7 (SW + eviction).

## Exit criteria
Download a chapter → read it offline (simulated: serve from byte cache, network blocked) → reopen → resume exact page. Eviction frees read-cache under pressure but keeps downloads. Self-checks: eviction LRU, tier protection, resume persistence.

## Tasks
### Batch A — byte cache + tiers
- **T1** Dexie v2: add `imageBytes` (key `chapterId:pageIndex`, blob, tier, lastAccess) + `downloads` tables. Repo helpers.
- **T2** `imageCache.ts`: get-or-fetch bytes (fetch via proxy → store blob → return objectURL); tier param. Self-check with fake-indexeddb + stubbed fetch.
- **T3** Wire reader to prefer cached bytes (useChapterPages returns cached objectURLs when present).

### Batch B — downloads + eviction
- **T4** `downloads.ts`: enqueue single/range/series/auto-next-N; mark permanent; `navigator.storage.persist()` on first download. Progress tracking.
- **T5** `eviction.ts`: LRU over tier='cache' by lastAccess until under budget; never evict tier='download'. **Hard self-check.**
- **T6** `wifiGuard.ts`: gate downloads to wifi (Network Information API) with override.

### Batch C — resume persistence
- **T7** Persist progress on scroll/page change (throttled) + on visibilitychange/pagehide; restore on open. Self-check: throttle + restore anchor.
- **T8** Storage management UI (usage per series/total, delete). Verify build + all self-checks.

## Notes
- Real Cache API vs Dexie blobs: use **Dexie blobs** (TDD §7) so we control tiers/eviction (SW cache can't tier). 
- Offline test is simulated headlessly (block network, read from cache); true airplane-mode is a device check (Phase 6).

## RESULTS

### Phase 2 — COMPLETE ✅ (2026-09-16)
**Built:**
- DB v2: `imageBytes` (key/chapterId/tier/lastAccess) + `downloads` tables + migration.
- `imageCache.ts`: get-or-fetch bytes via proxy, tier-aware (`cache`/`download`), upgrade-only tier, `usage()`. Byte cache = both offline + proxy-rate protection.
- `eviction.ts`: LRU over `cache` tier by lastAccess to a budget; `evictIfPressured` via Storage API. **Never** evicts `download`.
- `downloads.ts`: single/range/series/auto-next-N; permanent tier; `navigator.storage.persist()` on first download; idempotent; progress rows.
- `wifiGuard.ts`: NetInfo-based gate, allow-on-unknown, user override.
- `resume.ts`: leading+trailing throttle + persist/restore; wired into ReaderShell (restore last chapter on open, save on change, flush on visibilitychange/pagehide).
**Verification (self-checks, all green):**
- offline: tier upgrade-only, eviction LRU keeps downloads, fetchAndCache dedups (no re-hit to proxy).
- downloads: permanent-tier storage + progress, nextN skips downloaded & keeps order.
- resume: throttle leading/trailing/interval + persist+restore. **(Caught a real leading-edge bug — fixed: init `last=-Infinity`.)**
- build clean.
**Deviations:** byte-cache-in-*reader* render path is wired via the download flow (downloaded pages populate the cache; the reader resolver reads cache for downloaded chapters). Full cache-preferring objectURL resolution for *online* reads is a small follow-up (documented) — offline reading of downloaded chapters works now.
**Gaps carried:** true airplane-mode + persistent-storage-permission UX is a device check (Phase 6); storage-management UI is minimal (surfaced in settings in Phase 5).
**Caveat:** offline verified headlessly (network-blocked cache reads via fake-indexeddb + stubbed fetch), not real airplane mode.
