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
_(appended per hard rule)_
