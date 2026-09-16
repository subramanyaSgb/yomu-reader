# Phase 16 — Polish batch: refresh persistence, update toast, downloads mgmt, id migration, auto-download, jump, preload

## Plan
Owner approved the full phase-15 "what's left" list, plus a new bug report mid-build:
refreshing any screen dumped back to the main page.

## Result (commit b386ee8, bundle index-B34-tczn.js)

1. **Refresh persistence (bug fix)** — the overlay stack + active tab are stored in
   `history.state` on every push/switch; App restores them on load and `popstate` reads
   the entry's own state instead of blind-slicing. Reload anywhere → same screen
   (reader included — combined with exact-position resume you land mid-chapter).
2. **Update toast** — `registerType: 'prompt'` + `virtual:pwa-register`; a plain-DOM
   pill ("New version ready — tap to update") appears above the nav when a new build
   is waiting. No more manual hard refreshes after deploys.
3. **Downloads management** — `offline/manage.ts`; OFFLINE tag on downloaded chapter
   rows; gear sheet shows "Offline storage — N chapters · X MB" with Clear all;
   download sheet gains "Remove this series' downloads".
4. **Source-id migration** — `shelf/idMigration.ts` keeps `idmap:v1` (title → id) and
   runs at startup before any state reads: when a title's id changes, shelf/seriesMeta/
   readerMemory/progress are renamed to the new id; read-marks (dead chapter ids)
   regenerate in SeriesDetail from `seriesMeta.lastNumber` via a one-shot
   `migratedFrom:` flag; ReaderShell falls back to restoring by chapter NUMBER when
   the saved chapter id isn't in the list.
5. **Auto-download** — on the Reading shelf, series flagged NEW get their fresh
   chapters (≤3/series, once per session, skipped when `saveData`) downloaded silently.
6. **Jump-to-chapter** — number input + Read button on series pages with >30 chapters.
7. **Preload** — vertical reader mounts the next chapter ~3 viewports early.

## Verification
Build clean; 16/16 self-checks; deployed bundle verified to contain the jump input and
idmap migration. Update-toast behavior takes effect from the NEXT deploy after this one
(this deploy itself still needs one manual reload — the last one ever).

**Gaps:** auto-download caps at 3 newest chapters (older gaps stay streaming-only);
migration regenerates read-marks as "everything up to lastNumber" (manual unmarks
before migration aren't preserved).

## Addendum — deep audit (commits e40d5d0, a432d32)

Owner asked for a no-mistakes deep pass. Line-by-line re-review of the session's code
found and fixed three latent bugs:
1. Paged-mode exact resume never applied — PagedRenderer mounted with page 0 before
   the async restore resolved (`initialPage` read only at mount). Renderers now wait
   for restore; also kills the chapter-0 flash in scroll mode.
2. Tab switches could self-revert with overlays open — `replaceState` raced the async
   `history.go()` and stamped the wrong entry. Tab moved to sessionStorage; history
   carries only the overlay stack.
3. Chapters downloaded in the current session weren't served offline until app
   restart (`staleTime: Infinity` cached the "not downloaded" verdict) — re-checked
   per mount now.

## Addendum 2 — stability & memory pass (commit 30414a4, worker f3bda1ef)

Owner asked to focus stability + peak optimization. Four real items shipped:
1. **Flat reader memory:** `content-visibility: auto` + `contain-intrinsic-size: auto
   600px` on every strip page — offscreen pages skip layout/paint and the browser
   discards their decoded bitmaps (remembered size prevents scroll jumps). This was
   the real long-session jank/crash vector: an hour of reading kept 700+ decoded
   images alive.
2. **Visible tap-to-retry** placeholder for pages that fail after the silent retry
   (was a permanent blank gap). Manual retry remounts with a fresh cache-buster.
3. **`/scrape` img retry:** the cache-busting retry that fixed the MD poisoned-edge
   incident now also covers WeebCentral/Comizy page images.
4. **Reader code-split:** ReaderShell (renderers, zoom, resume, HUD — ~28KB) lazy-
   loads on first open; shelf startup parses less JS; SW runtime cache keeps it
   offline-capable after first use.

Deliberately skipped: manual DOM windowing of the strip (content-visibility delivers
the memory win without the scroll-anchor risk; unmount-behind windowing is the
documented upgrade path if DOM node count ever matters).

Perf: Google Fonts `@import` inside tokens.css was a render-blocking serial chain —
moved to a parallel `<link>` with preconnects (googleapis/gstatic + the worker origin,
so the first API/cover request skips DNS+TLS). Title fixed (was "yomu-scaffold").
Lighthouse holds ~80 (lab range 68–93 across runs; variance dominates at this size).
Build clean, 16/16 self-checks, deploys verified.
