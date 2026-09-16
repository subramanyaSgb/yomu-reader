# Phase 13 — Reader overhaul: scroll bug, back-nav crash, exact resume, comix parity

## Plan

Owner reports: (1) cannot scroll the manhwa long-strip; (2) pressing Back while reading
closes the app; (3) wants comix.to reader features, especially exact continue-where-I-left.

## Root causes found

1. **Touch scroll dead:** `ZoomableImage` wrapped every strip image in
   `touch-action: none` — on touch devices every pan gesture was swallowed, so the
   long strip could not be scrolled at all. Desktop wheel worked, phone didn't.
2. **Strip re-based mid-read:** `startIndex={chapterIndex}` echoed the renderer's own
   `onChapterChange` back into it; crossing a chapter boundary reset the strip
   (`loadedCount=1`) with a stale scrollTop → jumps/blank content.
3. **Back closed the PWA:** the SPA never pushed history entries, so hardware Back
   exited the app ("crash").
4. **Exact resume never worked:** a `useEffect` keyed on the unmemoized `chapterRefs`
   array saved `position: 0` on *every render*, overwriting the real position and even
   clobbering saved progress the moment the reader opened.

## Result (commit 5d98d64)

**Fixes:** touch-action is `pan-y` at 1x / `none` only while zoomed; renderer keeps its
own `baseIndex` and only re-bases on external jumps (picker/restore) with echo guard;
overlays are a history-backed stack (Back: reader → detail → shelf; tab switch unwinds
entries); position-0 baseline saves now happen only on real chapter navigation.

**comix.to-style features:**
- Tap anywhere → HUD toggle (auto-hide 3s). Top HUD: back, chapter dropdown, version
  (MD only), settings. Bottom HUD: Prev/Next chapter, `Ch. N · pct% · i/total` pill,
  auto-scroll toggle.
- Chapter picker bottom sheet (jump anywhere).
- Settings sheet: Mode Vertical/Paged, Quality Source/Data-saver, auto-scroll speed
  1–8, plus existing RTL/fit/gap/brightness.
- Keyboard: arrows/space/page keys scroll the strip; paged already had arrows.
- **Exact resume:** vertical saves `{imageIndex, offsetPct}` per *current chapter*
  (anchor computed against that chapter's images so it survives strip re-basing);
  restore re-applies the target scrollTop every 250ms until stable ×3 (max 20s, aborts
  on first user pointer/wheel so it never fights the reader). Paged saves/restores
  `pageIndex`. Saves throttled 3s with flush on `visibilitychange`/`pagehide`/unmount.

**Verification:** build clean; 16/16 self-checks pass (incl. existing resume/scrollAnchor
suites); deployed via push.

**Gaps:** device pass still owner-side (touch gestures can't be verified headlessly);
auto-scroll state is per-session (speed persists, on/off doesn't) by design.

## Addendum — read tracking + sort + Continue (commit 9048bc9)

Owner follow-up: chapter resume visibility, broken sort toggle, no read/unread markers.
- `readTracking.ts`: per-series read-id list; a chapter is marked read the moment it's
  opened in the reader; rows expose a manual check toggle.
- SeriesDetail: rows dim when read, green check, CONTINUE badge on the last-read
  chapter, unread count in header; **Newest/Oldest toggle now actually sorts the
  WeebCentral list** (it previously only touched the unused MD list); the Continue CTA
  reads real saved progress instead of the first list entry.
- App: closing the reader bumps a refresh key so the detail page remounts with fresh
  progress + markers.
