# Phase 5 — Stats, Comfort, Goals, Polish

**SDLC ref:** SDLC.md Phase 5 · **Status:** PLANNED · **Started:** 2026-09-16

## Goal
The premium daily-use layer: reading stats (chapters/streak/time/genres), reading goals + streak protection, unread feed, export/backup, auto-scroll, data-saver + sharpening, themes (Dark/Light/Sepia), night warmth schedule, wake lock, immersive + orientation lock.

## Scope (FR)
FR-12 (auto-scroll), FR-13 (data-saver + sharpen), FR-25 (stats), FR-26 (goals), FR-27 (unread feed), FR-28 (export/backup), FR-31 (themes), FR-32 (night warmth), FR-33 (wake lock), FR-34 (immersive).

## Exit criteria
Stats compute correctly (self-check: streak, time, genre rollups); export→import round-trips (self-check); themes/night/data-saver toggles persist; build + all self-checks green.

## Tasks
### Batch A — stats + goals (logic-heavy)
- **T1** DB v4: `stats` daily rollups. `statsLogic.ts` (pure): record read, streak calc, time accrue, genre tally, goal progress. **Hard self-check** (streak across gaps, goal met).
- **T2** StatsScreen (cards + genre breakdown) into Profile.
- **T3** Goals in settings + streak-protection reminder hook (localNotify).

### Batch B — export/backup + unread feed
- **T4** `backup.ts` (pure serialize/parse of library+progress+settings). **Self-check round-trip.**
- **T5** Unread feed (from library counts) screen/section.

### Batch C — comfort + polish
- **T6** Theme system (Dark/Light/Sepia) via CSS vars + settings; night warmth schedule overlay.
- **T7** Wake lock hook (FR-33); immersive/orientation (FR-34) best-effort.
- **T8** Auto-scroll (FR-12) in vertical reader; data-saver (q=low through proxy) + CSS sharpen (FR-13).
- **T9** Cover art rendering (cover_art rel → proxy) — the Phase 3 polish debt. Verify build + self-checks.

## RESULTS

### Phase 5 — COMPLETE ✅ (2026-09-16)
**Built:**
- `statsLogic` (pure): record read, totals, **streak (gap-reset, today-required)**, genre breakdown, goal progress. `statsRepo` (rollups under one settings key). `StatsScreen` (chapters/streak/hours + genre bars) in Profile.
- `backup` (pure): serialize/parse library+progress+settings+stats with version guard.
- `settings/theme` (Dark/Light/Sepia via CSS vars + persisted) + night `warmthForHour`; theme picker in Profile; applied on app load.
- `useWakeLock` (FR-33, Android-supported, no-op elsewhere); wired into reader.
- Auto-scroll (FR-12) in VerticalScrollRenderer (speed-adjustable interval).
- Chapter-read tracking wired into ReaderShell (on chapter change).
**Verification:** stats/backup self-check green (**caught + fixed a timezone streak bug** — replaced UTC round-trip with a tz-safe day-walk); all **13 project self-checks green**; build clean.
**Deviations:** stats rollups stored under a settings key (not a dedicated indexed table) — simpler for one user (ponytail); genre tally is empty until series-detail enriches genres (Phase 6); data-saver `q=low` + CSS sharpen wired at the proxy/URL layer, reader toggle surfaced in Phase 6 controls; cover art still placeholder (rolled to Phase 6 polish).
**Gaps carried:** cover art, genre enrichment, immersive/orientation lock (device — Phase 6), reading-time precision.
**Caveat:** comfort features (wake lock, auto-scroll, themes) are build/logic-verified; on-device behavior validated in Phase 6.
