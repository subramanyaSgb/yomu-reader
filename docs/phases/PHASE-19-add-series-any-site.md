# Phase 19 — Add series in-app, from any site

## Plan

**Goal.** The owner must never edit `src/catalog.ts` (or ask for a commit) to add a
series again, and a series that only exists on a site outside the two scraped sources
must still be readable inside Yomu. "Everything I read lives in one place."

**Scope.** Extends FR-3 (sources / version fallback), the Phase 12 three-shelf model
and the Phase 18 source-switching mechanism. PWA only — the Android wrapper with a
built-in browser (needed for sites that block the worker) is a later phase.

**Approach.**

1. **User catalog.** `src/catalog.ts` gains a `yomu:user-catalog` list in
   `localStorage` (same synchronous-at-import pattern as `yomu:src-overrides`).
   `CATALOG = (BASE_CATALOG + user entries) with overrides applied`. Add / remove
   reload the app, as source switching already does. The backup file carries the
   user catalog and the source overrides so they survive a device move.
2. **Add sheet** (`+` on the shelf header). One input that takes a title or a link.
   - *Title:* searches WeebCentral and Comizy in parallel. To survive title
     mismatches it also asks MangaDex (already proxied at `/api`) for the series'
     alternate English titles and repeats the search with those. Results are merged,
     de-duplicated, ranked by title similarity, and shown with cover + source so the
     owner picks by eye. MangaDex genres are attached when the match is confident.
   - *Link:* WeebCentral / Comizy links resolve straight to their ids. Any other
     link goes to the worker's new `resolve` action, which decides the reading mode.
3. **Three reading modes for linked sites** (id family `web:<series url>`, carried on
   the existing `site=kakalot` wire protocol exactly like `buddy:` ids are):
   - **reader** — a generic extractor finds the chapter list and the page images;
     the series behaves like any other (Yomu reader, resume, downloads, read marks).
   - **site** — extraction fails but the worker can fetch the site: the page is
     served through the worker (`/web`) with every site script, frame and form
     blocked by CSP (that removes the ads), images routed through the image proxy,
     links rewritten to stay inside the proxy, and a small injected script that
     reports the current page + scroll anchor to the app. Shown in a full-screen
     frame inside Yomu; tapping the series reopens the last page at the last spot.
   - **external** — the site refuses the worker (Cloudflare challenge etc.). The
     series page offers "Open site"; Yomu cannot observe it, so the resume point is
     the last link Yomu was given (see share target).
4. **Share target.** The manifest registers Yomu as a share target. Sharing a link
   to Yomu saves it as the resume point of the matching `web:` series, or opens the
   add sheet pre-filled when no series matches.
5. **Lock.** `resolve`, `web:` chapters/pages, non-allowlisted image hosts and
   `/web` require `k=<WEB_KEY>` (worker secret; frontend `VITE_WEB_KEY`). Unset on
   the worker ⇒ those routes answer 503 (fail closed). The key ships in the public
   bundle, so it is a deterrent against drive-by abuse of an open proxy, not real
   authentication.

**Files to touch.**
- `worker/src/generic.ts` (new, pure extraction + selfcheck), `worker/src/index.ts`
- `src/catalog.ts`, `src/lib/kakalot/client.ts`
- `src/features/shelf/AddSeriesSheet.tsx` (new), `addSeries.ts` (new, pure ranking +
  selfcheck), `ShelfScreen.tsx`, `UpcomingScreen.tsx`
- `src/features/site/SiteView.tsx` (new), `src/App.tsx`
- `src/features/discovery/SeriesDetail.tsx`, `src/features/push/push.ts`,
  `src/features/backup/backup.ts`, `vite.config.ts`, `.env.example`

**Exit criteria.**
- A series is added from the app by title and by link, with no code change.
- A `web:` series in reader mode opens in the Yomu reader end to end.
- A `web:` series in site mode opens inside Yomu and resumes page + position.
- Blocked sites degrade to "Open site" with a clear message, never a broken screen.
- Without `WEB_KEY` the generic routes are closed; existing routes are unchanged.
- Build clean, self-checks pass, flows exercised in a browser at 390px.

## Result

Built as planned. What exists now:

1. **User catalog** — `src/catalog.ts`: `yomu:user-catalog` in `localStorage`, merged
   into `CATALOG` at import (a user entry never shadows a built-in one, by id or
   title). `addUserSeries` / `updateUserSeries` / `removeUserSeries`; entries carry
   `user: true` and, for outside sites, `mode: 'site' | 'external'`. `hasChapterFeed()`
   keeps NEW badges, auto-download, Upcoming and push away from series that have no
   chapter list. The backup file now carries `userCatalog` + `srcOverrides`.
2. **Add sheet** — `+` in the shelf header (`AddSeriesSheet.tsx`, pure logic in
   `addSeries.ts`). Title search hits WeebCentral + Comizy, then repeats under the
   alternate English names MangaDex lists for the matched series; hits are merged,
   de-duplicated and ranked by word overlap (WeebCentral first on ties). MangaDex
   genres are attached only when the picked hit is a confident match. Closing the
   sheet after an add reloads onto Want to Read.
3. **Any-site ids** — `web:<series url>` / `web:<chapter url>` on the existing
   `/scrape?site=kakalot` protocol. Worker: `generic.ts` (pure extraction),
   `action=resolve`, `web:` branches in `chapters` / `pages` / the push cron, keyed
   image proxying for non-allowlisted hosts, and `/web` (HTMLRewriter + CSP).
   No frontend reader change was needed: a reader-mode `web:` series flows through
   `useKakalotChapters` / `useChapterPages` like a `buddy:` one.
4. **Site view** — `features/site/SiteView.tsx`. Position reports from the cleaned
   page are stored as an ordinary `Progress` row (`lastChapterId` = page URL,
   position = image anchor), so shelves order, backup and resume need nothing new.
   Tapping a site-mode series opens it straight at the saved page and spot.
5. **Share target** — manifest `share_target` (GET `/?share_url|share_text|share_title`),
   consumed by `ShareIntake.tsx`.
6. **Series page** — source label is the real source (it said "WeebCentral" for
   Comizy series before), `Remove from my list` for in-app entries, and for `web:`
   series a panel with the resume point, "Check the site again" (re-runs `resolve`
   and flips the mode) and, when a reader-mode site stops loading, "Open on site
   instead".

**Deviations from the plan.**
- In-frame links call `location.replace` (injected script) instead of navigating
  normally. Found in browser testing: normal navigation stacks joint session history,
  so Back walked the site's pages instead of leaving the site view.
- The in-app catalog is backed up through two new fields on the backup file rather
  than mirrored into Dexie — less moving state, same result.
- WeebCentral series links are recognised in the client, so they add without the key.
- Image proxy now names the content type from the file extension when a CDN answers
  `application/octet-stream` (met on a token CDN during testing).

## Verification (2026-11-10)

- Self-checks: 18/18 (`find src worker/src -name '*.selfcheck.ts'`), two new:
  `worker/src/generic.selfcheck.ts`, `src/features/shelf/addSeries.selfcheck.ts`.
- `tsc -b` + `vite build` clean; worker `tsc --noEmit` clean; no new lint warnings.
- Worker run locally (`wrangler dev`, real upstream fetches) against live sites:
  | Link | Result |
  |---|---|
  | mangapill.com series | reader, 701 chapters, 59 pages in ch. 1 |
  | mangaread.org series | reader, 77 chapters, 26 pages |
  | mangakatana.com series | reader, 113 chapters (pages come from an inline JS array) |
  | toonily.com series | external (Cloudflare challenge) |
  | comizy.io series | resolved to its `buddy:` id |
  | weebcentral.com series | resolved to its WC id |
  | dead series link | clear error (404 / redirected to home) |
  Without `WEB_KEY`: `resolve` and `web:` chapters → 503, outside image → 403,
  `/web` → "locked" page; WeebCentral search unaffected. Wrong key → 403.
- App driven in Chromium at 390×844 against that worker: add by title (found
  "Kaiju No. 8" under WeebCentral's `Monster-8` id, genres from MangaDex), add by
  link, blocked-link and dead-link messages, reload onto Want to Read; `web:` series
  listed 701 chapters and rendered pages in the Yomu reader; site-mode series opened
  in-app with 0 site scripts / 0 frames, navigated to a chapter, Back left the view,
  reopening resumed the same chapter at the same image anchor (3 / 0.048 → 3 / 0.048)
  and the shelf card showed `Ch. 3`; external series saved a pasted place; remove
  worked; shared link saved a place / opened the add sheet; backup round-trip
  restored the in-app catalog.

## Owner actions (one-time, to switch on other sites)

1. Pick a long random key. On the worker: `cd worker && npx wrangler secret put WEB_KEY`
   (paste the key), then `npx wrangler deploy`.
2. Vercel → Project → Settings → Environment Variables: `VITE_WEB_KEY` = the same key
   (Production + Preview), then redeploy.
3. Until both are done, adding by title and by WeebCentral link works; other links
   answer "need a one-time setup".

## Gaps carried forward

- **Not tested on a phone.** Share target, the installed-PWA behaviour of "Open
  site" (`window.open`), and iframe scrolling feel need the device pass.
- **The key is a deterrent, not authentication** — it ships in the public bundle.
  Real protection needs sign-in (Firebase is not set up).
- **Extraction is heuristic.** Three plain sites passed; script-rendered sites that
  hide their chapter list, and sites needing login, fall to site mode or fail.
- **Site view has no site scripts**, so script-driven menus, chapter dropdowns and
  logins inside it do not work; pages that need scripts to show images will be empty.
- **Blocked sites** cannot be tracked or cleaned in a PWA — that is the case for the
  planned Android wrapper with a built-in browser.
- In-app catalog is per-device (backup carries it; no cloud sync).
- Site-mode pages are not available offline and are not downloadable.
- A web: series' chapters have no dates, so Upcoming predictions skip them.
