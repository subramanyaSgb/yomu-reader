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
