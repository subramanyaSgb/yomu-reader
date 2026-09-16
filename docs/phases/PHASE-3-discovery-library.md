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
_(appended per hard rule)_
