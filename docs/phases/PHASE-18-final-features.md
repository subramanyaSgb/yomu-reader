# Phase 18 — Final feature set: source switching, reader comfort, stats, genres

## Plan
Owner approved the full remaining gap list except local files: (1) per-series source
switching, (2) desktop strip width, (3) tint / double-page / mark-on-finish,
(5) stats dashboard, (6) genre filtering.

## Result (commit c7e448f, worker c836c57d)

1. **Source switching.** Worker gains `action=search&src=buddy` (Comizy search via
   NEXT_DATA `ssrItems`). Series page shows a `Source: X ↔` chip → sheet searches the
   other source by title, lists candidates with covers; picking one runs
   `migrateSeries(oldId→newId)` (shelf/meta/prefs/progress follow; read-marks regen by
   number via the migratedFrom flag; reader restores by chapter number) and stores a
   localStorage override (`yomu:src-overrides`) that catalog.ts applies synchronously
   at import (BASE_CATALOG → CATALOG), then reloads. Switching back to the base id
   clears the override.
2. **Strip width.** `mem.stripWidth` 100/70/50% — centered max-width wrapper in the
   vertical renderer. Desktop panels stop stretching edge-to-edge.
3. **Reader comfort.** `mem.tint` none/warm/sepia multiply overlays; `mem.spread`
   double-page mode in paged (rtl-aware pair order, two-page turns, `12–13/45`
   counter); `mem.markOn` open/end — 'end' marks the previous chapter when moving on
   and the current one at ≥97% scrolled. Controls sheet is now scrollable.
4. *(skipped by owner: local files)*
5. **Stats.** StatsScreen (settings sheet → Reading stats): today / this-week /
   day-streak / ch-per-day(30d) tiles + top-5 most-read, computed from the history log.
6. **Genres.** One-time enrichment script matched all 101 titles against Comizy search
   metadata (exact normalized-title match preferred, top hit fallback) → `genres` on
   every catalog entry (`scripts/genres.json` kept). Shelves show top-10 genre chips
   that filter the grid alongside title search.

## Verification
Buddy search live-tested (ORV → `buddy:RO1qa8Oa:…`); build clean; 16/16 self-checks;
deployed bundle verified to contain Switch source / Reading stats / Strip width.

**Gaps:** genre data is aggregator-quality (fuzzy matches possible on obscure titles);
source-switch candidates on WC for buddy-only titles may be unrelated (user picks
visually); downloads don't migrate across a source switch (old-source files remain
until cleared).
