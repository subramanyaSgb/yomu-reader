# Functional Requirements Document — Yomu

**Version:** 1.0
**Status:** Approved for development
**Date:** 2026-09-11

Each requirement has an ID (`FR-x`), priority (P0 = must for v1, P1 = should for v1, P2 = v2), and acceptance criteria. "The system" = Yomu.

---

## 1. Content & Sources

### FR-1 — MangaDex integration (P0)
The system reads series metadata, chapter lists, and chapter images from the MangaDex API.
- **AC1** All series/chapter browsing uses unauthenticated requests where possible (cacheable).
- **AC2** Requests are cached (TanStack Query + local) and throttled to stay under ~5 req/s; the client backs off on HTTP 429.
- **AC3** The client sends an identifying User-Agent.

### FR-2 — English-only filtering (P0)
Only English chapters are shown.
- **AC1** Chapter feeds are filtered by `translatedLanguage=en` at the chapter level.
- **AC2** Chapters with no English version are hidden; numbering gaps are allowed and displayed as-is (no fake filler).
- **AC3** A series with zero English chapters does not appear in results.

### FR-3 — Chapter-version resolution (comix model) (P0)
For a series, the system aggregates all English versions of each chapter and selects one per chapter.
- **AC1** Default mode "Prefer one group": pick a primary scanlation group/official source and use it wherever available.
- **AC2** Gap-fill: where the preferred group has no upload for a chapter, fall back to the highest-ranked available English version (by likes, then coverage).
- **AC3** The reader shows a "switch version" control listing all English versions of the current chapter (group, source, likes); selecting one reloads that version and remembers the choice.

### FR-4 — Comick as second source (P2, tentative)
- **AC1** A series may be matched to Comick via title+author fuzzy match, with a manual "link these" confirmation.
- **AC2** Comick versions appear in the version list and gap-fill pool alongside MangaDex.
- **AC3** If Comick is unavailable, the app functions normally on MangaDex alone.

### FR-5 — Local file import (P0)
The owner can open local CBZ, PDF, and image files/folders.
- **AC1** CBZ is unpacked with jszip; images displayed in order.
- **AC2** PDF is rendered with pdf.js, lazy-loaded only when a PDF is opened.
- **AC3** Image folders are read in natural sort order.
- **AC4** Local files support the same reader features (curl/zoom/fit) as online content.
- **AC5** Local files are stored/referenced on-device only and do not sync.

---

## 2. Reader

### FR-6 — Reading modes & auto-selection (P0)
- **AC1** Manhwa/manhua default to vertical-scroll mode.
- **AC2** Manga defaults to paged mode, RTL.
- **AC3** Local files auto-route by format; user can override the mode per series.

### FR-7 — Vertical scroll reader with seamless chapter transition (P0)
- **AC1** Images render edge-to-edge, continuous, no inter-page gaps.
- **AC2** Scrolling past the end of a chapter loads the next chapter inline without a tap.
- **AC3** The "current chapter" indicator and mark-as-read update correctly as the boundary is crossed.
- **AC4** A floating, auto-hiding top bar shows back + chapter title; a bottom bar offers prev-chapter / chapter-list / next-chapter.

### FR-8 — Paged reader with 3D page curl (P0)
- **AC1** Pages advance via any enabled input (swipe, edge-tap, on-screen arrows, hardware volume keys) — all configurable.
- **AC2** Direction respects RTL/LTR setting (manga default RTL).
- **AC3** Page turn renders a WebGL finger-following 3D curl with shadow.
- **AC4** On devices without adequate WebGL support, the system falls back to a smooth slide/fade automatically.
- **AC5** A page counter (e.g. 12/48) and progress bar appear in an auto-hiding HUD.

### FR-9 — Zoom & pan (P0)
- **AC1** Tap zooms in at the tap point; tap again zooms out.
- **AC2** Pinch-to-zoom and drag-to-pan while zoomed are supported.
- **AC3** Double-tap cycles zoom levels (1x → 2x → 3x).
- **AC4** In vertical mode, zoom auto-releases as the user scrolls away.

### FR-10 — Bubble auto-zoom (P2, additive)
- **AC1** On opening/downloading a chapter, an on-device ONNX model detects speech-bubble regions per page and caches their coordinates with the chapter.
- **AC2** Tapping near a detected bubble snaps the zoom to that bubble.
- **AC3** Volume key / tap / swipe advances to the next bubble in reading sequence.
- **AC4** Where detection is absent or low-confidence, the system silently falls back to FR-9 tap-zoom. The feature never blocks reading.

### FR-11 — Reader controls (P0/P1)
- **AC1 (P0)** RTL/LTR toggle.
- **AC2 (P1)** Single vs double-page in landscape.
- **AC3 (P0)** Fit width / fit height / original.
- **AC4 (P1)** In-app brightness dim.
- **AC5 (P1)** Page-gap color (white/black) for paged mode.
- **AC6 (P0)** All reader settings persist per series (reader memory).

### FR-12 — Auto-scroll (manhwa) (P1)
- **AC1** Toggle starts hands-free scrolling at an adjustable speed.
- **AC2** Any manual interaction pauses it; it can be resumed.

### FR-13 — Data-saver & sharpening (P1)
- **AC1** On mobile data, images are served at reduced resolution via the proxy; on wifi, full-res.
- **AC2** Low-res images can be sharpened via CSS/canvas filter (v1). ML upscaling is P2/experimental.

---

## 3. Offline & Storage

### FR-14 — Download scopes (P0)
- **AC1** Download a single chapter.
- **AC2** Download a chapter range (e.g. 10–30).
- **AC3** Download an entire series.
- **AC4** Auto-keep the next N unread chapters downloaded ahead of the reader (configurable N).

### FR-15 — Two-tier storage (P0)
- **AC1** Chapters viewed online are stored as *temporary read-cache*.
- **AC2** Explicitly downloaded chapters are *permanent* and protected via `navigator.storage.persist()`.
- **AC3** Image **bytes** are cached (never URLs, which expire in 15 min).

### FR-16 — Storage management (P0)
- **AC1** When storage is low, the system auto-evicts oldest read-cache first, silently.
- **AC2** The system never deletes downloads without warning the user.
- **AC3** A storage screen shows usage per series and total, and allows manual deletion.

### FR-17 — Wifi-only download guard (P1)
- **AC1** Downloads (including auto-refetch of the synced download list on another device) run over wifi by default.
- **AC2** The user may override to allow mobile-data downloads.

---

## 4. Continuity & Sync

### FR-18 — Exact-position resume (P0)
- **AC1** Series-level: "Continue Reading" resumes the correct chapter.
- **AC2** Paged mode: resume restores the exact page index.
- **AC3** Vertical mode: resume restores position via an image anchor + intra-image offset (survives re-loading and variable image load timing).
- **AC4** Position is saved continuously while reading (throttled) and on app background/close.

### FR-19 — Google login (optional) (P0)
- **AC1** Google login via Firebase Auth is offered but skippable at first run and anytime later.
- **AC2** The app is fully usable logged-out (local-only).

### FR-20 — Cloud sync (P0)
- **AC1** When logged in, the system syncs library/follows, reading progress, bookmarks/history, and settings to Firestore.
- **AC2** IndexedDB is the source of truth; writes queue offline and flush when online.
- **AC3** Conflicts resolve last-write-wins by timestamp.
- **AC4** The download *list* syncs; downloaded *images* do not. Another logged-in device auto-refetches the list over wifi (FR-17).

---

## 5. Discovery & Library

### FR-21 — Home / discovery (P0)
- **AC1** Rows: Continue Reading, Popular/Trending, Latest Updates, Recommended-by-genre.
- **AC2** Recommended-by-genre derives from the owner's most-read genres (stats).

### FR-22 — Search (P0/P1)
- **AC1 (P0)** Instant search-as-you-type, debounced and cached.
- **AC2 (P1)** Advanced filters: genre, status, year, content rating.
- **AC3 (P1)** Search within the owner's library separately from global search.
- **AC4 (P1)** Recent and saved searches.

### FR-23 — Library (P0/P1)
- **AC1 (P0)** Status shelves: Reading, Completed, On-hold, Dropped, Plan-to-read.
- **AC2 (P1)** Custom collections/folders.
- **AC3 (P1)** Auto-sort within shelves: recently read, A–Z, last updated.
- **AC4 (P0)** Unread-chapter count badges per series.

### FR-24 — Duplicate detection (P1)
- **AC1** The system warns when a series appears under multiple titles/sources to prevent double-tracking.

---

## 6. Tracking, Stats & Goals

### FR-25 — Reading stats (P1)
- **AC1** Track total chapters read, daily streak, time spent, and genre breakdown.
- **AC2** Stats display on a profile/stats screen with a genre chart.

### FR-26 — Reading goals (P1)
- **AC1** The owner sets a target (e.g. chapters/day).
- **AC2** The system tracks progress and offers streak protection / gentle reminders (see FR-30).

### FR-27 — Unread feed (P1)
- **AC1** A single feed lists new chapters across all followed series.

### FR-28 — Export/backup (P1)
- **AC1** The owner can export library + progress to a downloadable file.
- **AC2** The file can be re-imported to restore state.

---

## 7. Notifications

### FR-29 — New-chapter push (P0/P1)
- **AC1 (P0)** A timed Firebase Cloud Function polls followed series (every 30–60 min).
- **AC2 (P0)** Push is sent only for series flagged "notify me" (per-series opt-in).
- **AC3 (P0)** Notifications are batched into a digest ("N series updated"), not one-per-chapter.
- **AC4 (P0)** Delivered via FCM to the installed Android PWA.

### FR-30 — Local notifications (P1)
- **AC1** Download-complete notification.
- **AC2** Reading-goal / streak reminders.

---

## 8. Comfort & Accessibility

### FR-31 — Themes (P0)
- **AC1** Dark / Light / Sepia, switchable in settings, synced.

### FR-32 — Night comfort (P1)
- **AC1** Blue-light/warmth filter with a schedule (auto-warm at night), applied in-app.

### FR-33 — Screen wake lock (P1)
- **AC1** Optionally keep the screen awake while reading (Wake Lock API; Android-supported). Gracefully no-ops where unsupported.

### FR-34 — Immersive mode (P1)
- **AC1** Full-screen immersive reading (hide system chrome) with optional orientation lock.

---

## 9. First-run & Reliability

### FR-35 — Onboarding (P1)
- **AC1** A 3-slide intro (reading modes, bubble zoom, offline) shows on first run, then lands on Popular.
- **AC2** Login is offered but skippable.

### FR-36 — Error & offline states (P0)
- **AC1** A persistent offline banner appears when offline.
- **AC2** Tapping a non-downloaded chapter while offline shows a clear "not downloaded" prompt, not a crash.
- **AC3** Failed images retry individually; a failed page shows a retry affordance.
- **AC4** When MangaDex is unreachable, a clear "MangaDex unreachable — retry" state is shown.

### FR-37 — Error logging (P0)
- **AC1** Runtime errors are reported to Firebase (Crashlytics-style) so the owner can diagnose remotely.
- **AC2** Logging respects the local-only mode (no error reporting requires content data).

---

## 10. Non-functional (summarized; detail in TDD §Performance)

- **NFR-1** Manga curl/scroll target ~60fps on the owner's device.
- **NFR-2** Fast image loading: progressive load of the current chapter + background preload of the next.
- **NFR-3** Small install footprint; pdf.js and ML models are lazy-loaded on demand.
- **NFR-4** Minimal battery/data: respect data-saver; efficient background polling.
- **NFR-5** MangaDex etiquette: cache-hit-driven request minimization; no sustained 429s.
