# Phase 1 — Core Reader (online, happy path)

**SDLC ref:** SDLC.md Phase 1 · **Status:** PLANNED · **Started:** 2026-09-16

## Goal
Read online, all three modes, well. Replace the Phase 0 spike with a real reader: manhwa (seamless vertical scroll), manga (RTL paged with WebGL curl + fallback), driven by MangaDex English chapters with chapter-version resolution and an in-reader version switch.

## Scope (FR / TDD refs)
- FR-2 (English filter), FR-3 (chapter-version resolution + switch), FR-6 (modes + auto-select), FR-7 (vertical + seamless transition), FR-8 (paged + curl + fallback), FR-9 (zoom/pan), FR-11 (reader controls + per-series memory). TDD §3.4 (resolver), §6 (reader engine).
- **Deferred to later phases (explicitly out of scope here):** offline byte-cache & downloads (Phase 2), exact-position *persistence* to DB/sync (Phase 2/4), discovery/library/search (Phase 3), bubble ML zoom (Phase 7).

## Exit criteria
Read a manhwa end-to-end (seamless scroll across a chapter boundary) and a manga (RTL curl, or auto-fallback slide on weak WebGL) from MangaDex, English-only, with a working "switch version" control. Build green + self-checks green.

---

## Tasks (bite-sized, batched)

### Batch A — Data foundation

**Task 1 — Dexie schema + repositories**
1. `src/lib/db/schema.ts` — Dexie tables from TDD §4 that Phase 1 needs now: `series`, `chapters`, `progress`, `settings` (others stubbed/added when their phase arrives — YAGNI).
2. `src/lib/db/repo.ts` — thin repository helpers (get/put series, progress read/write, settings get/put).
3. **Verify:** self-check puts+reads a series and a progress row via fake-indexeddb.

**Task 2 — Chapter-version resolver (FR-2, FR-3)**
1. `src/features/reader/versionResolver.ts` — pure function: raw English chapter feed → grouped-by-number → select one version per number ("prefer one group", gap-fill by likes then coverage) → continuous list with gaps. Return the per-number version pool too (for the switcher).
2. **Verify:** self-check with a synthetic feed (multi-group, missing chapters, competing likes) asserts selection + gap behavior. **This is the highest-logic module — test it hard.**

### Batch B — Reader engine core

**Task 3 — Reader shell + mode routing + ZoomController (FR-6, FR-9)**
1. `src/features/reader/ReaderShell.tsx` — loads a series' resolved chapters, picks mode (manhwa/manhua→scroll, manga→paged RTL), holds current chapter + HUD.
2. `src/features/reader/zoom/ZoomController.ts(x)` — tap-point zoom, pinch, pan, double-tap levels (1x→2x→3x). Reusable across renderers.
3. **Verify:** zoom transform math self-check (tap point maps to correct translate at each level).

**Task 4 — VerticalScrollRenderer + seamless transition (FR-7)**
1. Full-width continuous images; prefetch ahead; append next chapter inline at boundary; IntersectionObserver updates current-chapter + in-memory position anchor (imageIndex + offsetPct). (Persistence is Phase 2 — keep the anchor in memory/state now.)
2. **Verify:** anchor math self-check (scroll offset ↔ {imageIndex, offsetPct} round-trip).

### Batch C — Paged reader + controls

**Task 5 — PagedRenderer: curl + fallback + capability check (FR-8)**
1. WebGL finger-follow curl module (lazy-loaded); CSS-slide fallback; capability check at init chooses. RTL/LTR aware. Input adapters: swipe, edge-tap, arrows (volume-key adapter stubbed — needs device, wire in Phase 6).
2. Page counter + progress in auto-hiding HUD.
3. **Verify:** capability-check + direction (RTL next/prev index math) self-check; curl module falls back cleanly when WebGL unavailable.

**Task 6 — Reader controls + per-series memory + version switch (FR-11, FR-3)**
1. Controls: RTL/LTR, fit width/height/original, brightness overlay, page-gap color, single/double (landscape). Persist per series via `settings` repo (ReaderMemory).
2. In-reader "switch version" sheet: lists version pool for current chapter, swaps + remembers.
3. Replace the Phase 0 spike route with the real reader.
4. **Verify:** ReaderMemory round-trip self-check; manual E2E against live MangaDex (manhwa scroll + manga curl + version switch) with build green.

## Batch plan
- **Batch A:** Task 1 + Task 2 → report.
- **Batch B:** Task 3 + Task 4 → report.
- **Batch C:** Task 5 + Task 6 → report → Phase 1 complete.

## Risks / notes
- **WebGL curl is the hardest thing in the app** (per TDD). Fallback-first: get slide working, then layer curl. Never block reading on curl.
- Keep persistence OUT of Phase 1 (in-memory position only) — resume-to-DB + sync is Phase 2/4. Avoids rework.
- Volume-key page-turn + true device perf need a real Android device → validated in Phase 6.

---

## RESULTS
_(appended as batches complete — per the documentation hard rule)_
