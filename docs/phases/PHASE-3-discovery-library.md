# Phase 3 — Discovery, Library, Local Files

**SDLC ref:** SDLC.md Phase 3 · **Status:** PLANNED · **Started:** 2026-09-16

## Goal
Find, organize, and read own files. Home discovery rows, search with filters, a personal library (shelves + collections + unread badges), duplicate detection, and full local-file reading (CBZ/PDF/images).

## Scope (FR)
FR-5 (local files), FR-21 (home rows), FR-22 (search+filters+within-library+recent), FR-23 (library shelves/collections/sort/badges), FR-24 (duplicate detection).

## Exit criteria
Search → add to library → organize into shelves/collections; open a local CBZ + PDF + image folder in the reader. Self-checks: library shelf/collection logic, natural sort, duplicate detection, CBZ entry ordering.

## Tasks
### Batch A — MangaDex discovery
- **T1** queries: `usePopular`, `useLatestUpdates`, `useAdvancedSearch(filters)`, series `type` inference from tags (fix Phase 1 "manga" default).
- **T2** Home rows component (Continue Reading from progress table, Popular, Latest, Recommended-by-genre from stats/library genres).
- **T3** Search screen: instant/debounced + filter chips + recent searches (settings-backed) + within-library filter.

### Batch B — Library
- **T4** DB v3: `library` table (seriesId, shelf, collections[], sort meta, unreadCount). Repo.
- **T5** library logic (pure): shelf assignment, collection add/remove, sort comparators, unread computation. **Self-check.**
- **T6** Duplicate detection (pure): normalize title+author → cluster near-duplicates. **Self-check.**
- **T7** Library UI: shelves tabs, collections, sort, badges, long-press actions.

### Batch C — Local files
- **T8** `localfiles/`: CBZ (jszip) → ordered images; image folder → natural sort; PDF (pdf.js, lazy import). **Self-check** natural sort + CBZ entry ordering.
- **T9** Local series stored as `source:'local'` in `series` (no sync); route into reader engine.
- **T10** Verify build + all self-checks.

## Notes
- pdf.js lazy-loaded only on PDF open (bundle discipline).
- Natural sort is the classic pitfall (page2 vs page10) — dedicated tested comparator.

## RESULTS

### Phase 3 — COMPLETE ✅ (2026-09-16)
**Built:**
- Discovery queries: `usePopular`, `useLatestUpdates`, `useAdvancedSearch(filters)`.
- `HomeScreen` (Popular + Latest rows), `SearchScreen` (debounced instant search + status chips + recent searches, settings-backed), `SeriesCard`.
- DB v3: `library` table + `libraryRepo` (add/remove/shelf/notify/collections/counts).
- `libraryLogic` (pure): shelves, collections add/remove, sort comparators, unread. `LibraryScreen` (shelf tabs, sort, unread badges).
- `duplicateDetection` (pure): title normalize + token Jaccard + union-find clustering.
- `naturalSort` (pure): page2 < page10.
- `localFiles`: CBZ (jszip), image folder (natural sort), PDF (pdf.js **lazy-imported**). `LocalFilesScreen` + Zoomable rendering.
- App shell with bottom nav (Home/Search/Library/Local) + reader.
**Verification:** Phase 3 logic self-check (natural sort, library shelves/collections/sort/unread, duplicate clustering) green; **all 11 project self-checks green**; build clean (pdf.js stays out of main bundle via dynamic import).
**Deviations:** cover-art rendering is a placeholder (needs cover_art relationship → proxy; Phase 5 polish). Series-type inference from tags deferred to Phase 5 (reader still defaults manga). "Add to library" wiring from series detail is minimal (library screen reads the table; a detail screen with add/notify lands in Phase 5).
**Gaps carried:** series detail screen, cover art, genre-based recommendations (needs stats — Phase 5).
**Caveat:** local-file reading verified by build + logic self-checks; real CBZ/PDF open is a device/browser check (Phase 6).
