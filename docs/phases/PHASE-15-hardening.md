# Phase 15 — Hardening: backup, offline, health, NEW badges (+ minor fixes)

## Plan
Owner approved the full improvement list from the phase-14 assessment: (1) backup
export/import, (2) offline downloads, (3) source health monitoring, (4) new-chapter
signal, plus minor items (PNG icons, ToG override-key collision).

## Result (commit be9d6c1, worker 5924db25)

1. **Backup** — `features/backup/backup.ts` + gear icon on shelf header → sheet with
   Export (downloads `yomu-backup-YYYY-MM-DD.json`: full settings + progress tables —
   shelves, read marks, exact positions, series meta, reader prefs) and Import
   (bulkPut merge + reload). Image bytes deliberately excluded (re-downloadable).
2. **Offline downloads** — wired the dormant phase-2 plumbing (Dexie `imageBytes`
   two-tier store, `downloads` table, `downloadChapter`, `navigator.storage.persist`):
   - SeriesDetail download button → sheet: next 10/25/50 chapters after the continue
     point, sequential with progress bar, idempotent (skips already-downloaded).
   - `useChapterPages` checks the downloads table first and serves object URLs from
     stored blobs — a downloaded chapter renders with zero network.
   - SW runtime caching: NetworkFirst for scrape/API JSON (14d fallback — chapter
     lists and navigation survive offline), CacheFirst for covers (30d).
3. **Source health** — worker `/health` live-checks WeebCentral (ORV chapter fragment)
   and Comizy (Super Gene chapters API) with 5-min edge cache; shelf screens query it
   (5-min staleTime) and show a warning banner naming any down source.
4. **NEW badges** — Reading shelf compares each series' latest chapter number
   (10-min-cached lists, ≤20 series) with the locally-stored last-read number →
   "NEW" chip on cards + red dot on the Upcoming calendar icon.

Minor: reader version-override map keyed by chapter index (season-style numbering
collided per-number); generated real 192/512 PNG maskable icons (System.Drawing) and
added them to the manifest ahead of the SVG.

## Verification
`/health` → `{"weebcentral":true,"comizy":true}`; build clean; 16/16 self-checks;
deployed bundle `index-BsYAGe-F.js` verified to contain backup + download sheets;
`icon-192.png` serves 200 image/png.

**Gaps:** downloads require keeping the app open (no background fetch); NEW detection
needs the series opened once (lastNumber source); backup is manual — no reminder.
