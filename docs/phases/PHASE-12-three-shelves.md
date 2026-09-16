# Phase 12 — Three-shelf app (Reading / Want to Read / Completed)

## Plan

**Goal (owner):** the app is a personal tracker+reader with exactly three sections —
Reading, Want to Read, Completed. Nothing else. New series are added by the assistant
into Want to Read on request.

**Approach:** shelf state over the curated catalog; delete all other navigation.

## Result (commit af67763)

- `src/features/shelf/shelf.ts` — shelf map in Dexie settings (`shelves:v1`), default
  `want`. `markReadingIfWanted()` runs in `openReader` so a series moves
  Want to Read → Reading the first time it's opened. Completed is manual.
- `src/features/shelf/ShelfScreen.tsx` — one 3-column grid per shelf, empty-state hints.
- `BottomNav` — 3 tabs. `App.tsx` — only routes are the shelves + detail + reader.
- `SeriesDetail` — dead Follow/Reading buttons replaced with working shelf chips;
  notification bell removed.
- Deleted routes/UI: Home rails, Search, Library, Storage, Profile/sync, local files,
  unread. `HomeScreen.tsx`/`SearchScreen.tsx` deleted (superseded); other feature files
  remain on disk but unrouted — tree-shaking removes them from the bundle.

**Size effect:** bundle 4 chunks (~1.5MB total) → single 413KB chunk (131KB gz);
SW precache 984KB → **423KB**. Firebase/pdf.js/jszip no longer ship at all.

**Consequences accepted by design:** no Google sync UI, no local CBZ/PDF reading, no
storage screen, no notifications — all restorable from git if ever wanted.

**Verification:** build clean; 16/16 self-checks pass; deployed via git push.
