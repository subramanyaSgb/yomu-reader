# Technical Design Document — Yomu

**Version:** 1.0
**Status:** Approved for development
**Date:** 2026-09-11

Maps FRD requirements to concrete technical design. Read `CLAUDE.md` first for the constraints that shape everything here.

---

## 1. System architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Android device (Chrome PWA)              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Yomu app  (React + TS + Tailwind, Vite PWA)          │  │
│  │   • TanStack Query  (MangaDex metadata cache)         │  │
│  │   • Zustand         (UI state)                        │  │
│  │   • Dexie / IndexedDB  ← source of truth              │  │
│  │   • Service Worker  (Workbox: app shell + image bytes)│  │
│  │   • WebGL curl / pdf.js / jszip / ONNX (lazy)         │  │
│  └───────────────────────────────────────────────────────┘  │
└───────────┬──────────────────┬───────────────────┬──────────┘
            │ metadata (JSON)   │ images            │ auth/sync/push
            ▼                   ▼                   ▼
   ┌────────────────┐  ┌──────────────────┐  ┌──────────────────┐
   │ MangaDex API   │  │ Cloudflare Worker│  │ Firebase          │
   │ api.mangadex   │  │ image proxy      │  │ Auth / Firestore  │
   │ (unauth,cached)│  │ (free egress,    │  │ FCM / Crashlytics │
   │                │  │  CORS, 15-min    │  │ + timed Cloud     │
   │                │◄─┤  URL refresh,    │  │   Function        │
   │  @Home images  │  │  compression)    │  │ (chapter poller)  │
   └────────────────┘  └──────────────────┘  └──────────────────┘
```

**Why three backends:** Vercel hosts the app (static + light routes; 100 GB/mo bandwidth is fine for the app, not for images). Cloudflare Worker proxies all images (free egress — critical for image-heavy reading and the MangaDex CORS lock). Firebase handles all stateful/owner-scoped concerns.

## 2. Tech stack

| Layer | Tech |
|---|---|
| UI | React 18, TypeScript (strict), Tailwind CSS |
| Build/PWA | Vite, `vite-plugin-pwa` (Workbox) |
| Server-state cache | TanStack Query |
| UI state | Zustand |
| Local DB | Dexie.js (IndexedDB) |
| Paged curl | WebGL (custom or a proven curl shader), CSS-slide fallback |
| PDF | pdf.js (dynamic import) |
| CBZ | jszip |
| Bubble detect (v2) | onnxruntime-web |
| Charts (stats) | lightweight (e.g. Recharts or a minimal canvas chart) |
| Auth/DB/Push/Errors | Firebase SDK (Auth, Firestore, Messaging, Crashlytics) |
| Image proxy | Cloudflare Worker (TypeScript) |

## 3. MangaDex data flow

### 3.1 Metadata
- All metadata calls go through TanStack Query hooks (`useSeries`, `useChapterFeed`, `useSearch`, ...). **No ad-hoc fetches** — this enforces caching and rate discipline.
- Query keys are stable and cached with generous `staleTime` (metadata changes slowly). Latest-updates feeds use shorter staleness.
- Rate discipline: a request queue caps concurrency and spaces calls under ~5 req/s; a shared limiter backs off on HTTP 429 with exponential backoff + jitter. All responses cached; repeated views hit cache, not the network.
- Client sends an identifying `User-Agent`. Browsing is unauthenticated (cacheable). Auth only if a feature strictly requires it.

### 3.2 Chapter images (the critical path)
1. Call `GET /at-home/server/{chapterId}` → get `{ baseUrl, chapter.hash, chapter.data[] }`. **Base URL valid ~15 min.**
2. Construct each page URL: `{baseUrl}/data/{hash}/{filename}`.
3. **Do not fetch directly** (CORS-locked). Instead request the **Cloudflare Worker**: `https://proxy.<domain>/img?u=<encoded page URL>&q=<quality>`.
4. Worker fetches from MangaDex `@Home` server-side (no CORS in a Worker), optionally recompresses for data-saver, streams bytes back with permissive CORS headers.
5. Browser caches the returned **bytes** (Cache API / Dexie blob) keyed by `chapterId:pageIndex`. Re-reads and offline use hit the local byte cache — never re-request the Worker unless missing.
6. On a new session, image URLs are re-derived (step 1) because the old base URL expired; cached bytes are reused if present, so expiry is invisible for already-read pages.

### 3.3 Cloudflare Worker (image proxy) design
- Route: `/img?u=<url>&q=<quality>`.
- Validates `u` is a MangaDex `@Home` host (allowlist) to prevent open-proxy abuse.
- `fetch(u)` server-side; on `q=low`, transform/recompress (Worker + `cf.image` or a wasm codec) for data-saver.
- Returns with `Access-Control-Allow-Origin` for the app origin, `Cache-Control` for edge caching.
- Free-tier note: 100k requests/day. Local byte-caching (§3.2.5) keeps re-reads off the Worker; a heavy day stays well under for one user.

### 3.4 Chapter-version resolution (FR-3)
- For a series, fetch the full English chapter feed (all groups).
- Group by chapter number; within each number, collect versions `{ id, group, source, likes, coverage }`.
- Selection: user's preferred group first; else highest `likes`, then `coverage`.
- The resolved list is one continuous English chapter list (with gaps where no English exists).
- In-reader "switch version" reads the version pool for the current chapter number and lets the user override; the override is persisted per series.

## 4. Local data model (Dexie / IndexedDB)

Tables:
- `series` — id, source, title, cover, type (manga/manhwa/manhua/local), genres, status, addedAt, updatedAt.
- `chapters` — id, seriesId, number, versions[], selectedVersionId, language, publishedAt.
- `progress` — seriesId, lastChapterId, mode, position { pageIndex | { imageIndex, offsetPct } }, updatedAt.
- `library` — seriesId, shelf, collections[], sort metadata, unreadCount.
- `downloads` — chapterId, seriesId, scope, status, bytesSize, isPermanent, createdAt.
- `imageBytes` — key (`chapterId:pageIndex`), blob, tier ('cache' | 'download'), lastAccess.
- `bookmarks` — id, seriesId, chapterId, position, note.
- `settings` — key/value (theme, reader defaults, data-saver, goals, night schedule).
- `stats` — daily rollups { date, chaptersRead, secondsRead, genres{} }.
- `bubbles` (v2) — chapterId, pageIndex, regions[] (bbox + order).

`imageBytes.tier` drives eviction: LRU eviction over `tier='cache'` only; `tier='download'` never auto-evicted.

## 5. Sync (Firebase)

- **Auth:** Firebase Google sign-in. Logged-out = local-only; login backfills from local then merges.
- **Firestore layout:** `users/{uid}/{library|progress|bookmarks|settings|downloadList}`.
- **Engine:** local writes update Dexie immediately + enqueue a sync op. A background flusher pushes to Firestore when online; a listener pulls remote changes.
- **Conflict:** last-write-wins by `updatedAt`. Single-user multi-device makes this safe.
- **Download list:** the *list* of downloaded chapters syncs; on another device, a wifi-guarded job refetches those chapters' bytes locally. Images themselves never traverse Firestore.

## 6. Reader engine

One engine, three renderers selected by mode:

- **VerticalScrollRenderer** (manhwa/manhua): virtualized list of full-width images; prefetches ahead; seamlessly appends the next chapter's images at the boundary; updates `progress` via an IntersectionObserver anchor (`imageIndex` + `offsetPct`).
- **PagedRenderer** (manga): current/next page as WebGL textures; finger-follow curl shader with dynamic shadow; input adapters for swipe / edge-tap / arrows / volume keys (all configurable); RTL/LTR aware; **capability check** at init → fall back to CSS slide if WebGL/perf insufficient.
- **LocalFileRenderer**: routes CBZ (jszip) / images (folder) to a paged or scroll view; PDF via lazily-imported pdf.js.

Shared services: ZoomController (tap-point zoom, pinch, pan, double-tap levels; bubble-snap in v2), BrightnessOverlay, ReaderMemory (persists per-series settings), Preloader (current progressive + next background).

### 6.1 Bubble zoom (v2)
- On chapter open/download, a worker runs onnxruntime-web bubble detection per page → store `regions` in `bubbles` table.
- ZoomController: tap near a region → animate to its bbox; volume/tap/swipe → next region by reading order; missing/low-confidence → tap-point zoom fallback.
- Detection runs off the main thread; never blocks rendering.

## 7. Offline & Service Worker

- Workbox precache: app shell (HTML/JS/CSS).
- Runtime caching: MangaDex metadata (StaleWhileRevalidate, short TTL); Worker images handled by app-level byte cache in Dexie (not SW, so we control tiers/eviction).
- `navigator.storage.persist()` requested on first explicit download → protects `tier='download'`.
- Eviction job: on quota pressure / periodic, LRU-evict `tier='cache'` by `lastAccess` until under budget; never touch downloads; warn before any download-affecting action.

## 8. Notifications

- **Poller:** a scheduled Firebase Cloud Function (every 30–60 min) reads each user's "notify me" follows, checks MangaDex latest-chapter feeds (server-side, cached, rate-limited), diffs against last-seen, and enqueues FCM messages.
- **Delivery:** FCM → service worker `push` handler → **batched** system notification ("N series updated"). Tapping deep-links into the unread feed / series.
- **Local notifications:** download-complete and goal/streak reminders fire client-side via the SW.

## 9. Performance budgets (NFR)

- Reader interaction (curl/scroll): target 60fps; PagedRenderer falls back if it can't hold frame budget.
- Current chapter: progressive image load (skeletons); next chapter: background preload (throttled, wifi-aware).
- Initial JS payload kept small; **lazy-load** pdf.js, ONNX, charts, WebGL curl module only when needed.
- Network minimization via TanStack Query cache + Dexie byte cache; success metric = high cache-hit ratio, no sustained 429s.
- Data-saver: `q=low` through the proxy on metered connections (Network Information API where available; manual toggle otherwise).

## 10. Error handling & logging

- Central error boundary + query error states → typed UI states (offline / MD-unreachable / not-downloaded / image-failed).
- Per-image retry with backoff; page-level retry affordance.
- Firebase Crashlytics-style reporting for uncaught errors and key failure events; strips content specifics, keeps diagnostics.

## 11. Security & etiquette

- Worker is a *restricted* proxy (MangaDex host allowlist) — not an open proxy.
- No secrets in the client; Firebase config is public-by-design, protected by Firestore security rules scoping `users/{uid}` to the authenticated owner.
- Personal-use posture; "support official release" links surfaced where a series is licensed.
- Respect MangaDex ToS operationally (unauth browsing, caching, throttling, identification, backoff).

## 12. Project structure

```
/                      app root (Vercel)
  CLAUDE.md
  docs/                PRD, FRD, TDD, SDLC
  src/
    app/               routing, providers, error boundary
    features/
      reader/          engine, renderers, zoom, curl(webgl)
      library/         shelves, collections, badges
      discovery/       home rows, search, filters
      offline/         downloads, storage manager, eviction
      sync/            firebase auth + firestore sync engine
      stats/           tracking, goals, charts
      notifications/   fcm + local notifs
      localfiles/      cbz/pdf/image import
      settings/        themes, reader defaults, night mode
    lib/
      mangadex/        query hooks, rate limiter, version resolver
      proxy/           image URL builder → worker
      db/              dexie schema + repositories
    sw/                workbox config, push handler
  worker/              cloudflare image proxy (separate deploy)
  functions/           firebase cloud functions (chapter poller)
```
