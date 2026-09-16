# Phase 17 — Push notifications, history, bookmarks, per-series prefs, chapter-level downloads

## Plan
Owner picked features 2/3/4/6 from the gap analysis (dropped cross-device sync, local
files, reader cosmetics), then added: per-chapter download buttons + all/unread bulk
download options.

## Result (commit e58f585, worker a66694bb, cron `0 */2 * * *`)

**Push (no Firebase).** Worker cron every 2h; KV (`PUSH_KV`, id 50b2b64c…) holds
`sub:/state:/notified:/pending:{endpointHash}`. Client uploads its Reading-list state
(id/title/lastNumber, per-series notify honored) on shelf loads (30-min throttle).
Cron compares each series' latest chapter (WC fragment regex / Comizy API — edge-
cached) against max(lastRead, lastNotified) → queues pending messages → sends a
**payload-free VAPID tickle** (ES256 JWT via WebCrypto — no RFC8291 encryption needed
for empty pushes). `push-sw.js` (workbox `importScripts`) wakes on push, POSTs
`/push/pending` with its own subscription endpoint, shows one notification per series
(or a combined one), click focuses/opens the app. Gone subs (404/410) auto-pruned.
VAPID public key in wrangler `[vars]`; private via `wrangler secret`. Enable/disable
toggle in the settings sheet — requires the PWA to be installed on Android.

**History.** `history:v1` capped log (500), appended on chapter change with 10-min
same-chapter dedupe; HistoryScreen (clock icon on shelves) grouped Today/Yesterday/date
with per-entry time, clear-all, tap → series page.

**Bookmarks.** Reader HUD 🔖 captures the live position ref (scroll anchor or page).
`bookmarks:v1` (capped 300). Series page lists them ("Ch 57 · 40% into panel 12 ·
date"); tap reopens the reader at that EXACT spot via a new `startPosition` field
threaded through the overlay → ReaderShell initialAnchor/initialPage; × removes.

**Per-series prefs.** `seriesMeta.notify` / `.autoDl` (default true) — toggle chips on
the series page; auto-download loop and push-state upload respect them.

**Chapter-level downloads.** Every chapter row: ⬇ downloads that chapter, ⬇✓ removes
it (busy state while working). Download sheet: next 10/25/50 + **All unread (N)** +
**All chapters (N)**, all idempotent.

## Verification
Worker deployed with schedule + `/push/vapid` returns the key; app build clean;
16/16 self-checks; deployed bundle contains history/bookmark/download strings;
`push-sw.js` serves 200 and the generated SW importScripts it.

**Gaps:** push requires at least one shelf visit per device so lastNumbers are
current (30-min throttle); cron granularity 2h; bookmark positions survive source
migration only at chapter-number precision.

## Addendum — professional icon pass (commit 609e0b6)

Owner flagged the glyph buttons (⬇ ✓ 🔖 ⚙ ‹ › ▾ ▶⏸) as unprofessional. Replaced across
every component with Lucide icons in consistent containers: chapter-row actions are
34px circles (`RowIconBtn`: outline idle → green fill active → spinner busy), reader
HUD uses uniform 42px circles/21px pills (ArrowLeft, Bookmark→Check flash,
ChevronDown picker, Settings, ChevronLeft/Right, Play/Pause), paged arrows are blurred
circles, bookmark rows use Bookmark/X. Redundant OFFLINE chip dropped (the row icon
conveys the state). Global CSS: tap-highlight removed + subtle press-dim on all
buttons; aria-labels on every icon-only control.
