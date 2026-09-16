# Phase 9 — Replace dead Mangakakalot scraper with Mangapill

## Plan

**Goal:** Restore the fallback reading source. Full-stack verification (2026-09-16) found the
Mangakakalot network (mangakakalot.gg + mirrors natomanga.com / nelomanga.com / manganato.gg)
put Cloudflare **managed challenges** on all `/search/story/*`, `/manga/*` and chapter pages.
Worker fetches get 403 + `_cf_chl_opt` challenge HTML (verified via a Worker-side `probe`
action, not just from a local IP). Only the homepage and (intermittently) `/home/search/json`
pass. Kakalot is dead as a scrape source.

**Approach (lazy, contract-preserving):** keep the entire `/scrape?site=kakalot` wire
interface, the frontend `source: 'kakalot'` key, and all response shapes — swap only the
Worker's upstream to **Mangapill** (mangapill.com), which serves plain server-rendered HTML
with no challenge and a Referer-locked image CDN (`cdn.readdetectiveconan.com`) that the
existing `img` Referer-spoof action handles.

**Scope:**
- `worker/src/index.ts` — rewrite scraper helpers (regex over HTML instead of HTMLRewriter;
  simpler and the markup is trivial). Search/chapters/pages/img + keep `probe` diagnostic.
- Frontend — user-visible label strings only ("Mangakakalot"/"Kakalot"/"KK" → "Mangapill"/"MP").
  No logic changes.

**ID scheme:** series id = Mangapill path after `/manga/` (e.g. `3069/naruto`); chapter id =
full chapter URL (unchanged convention). Covers are returned **pre-proxied** through the
worker's img action because the frontend renders `m.cover` raw and the CDN 403s hotlinks.

**Exit criteria:** live Worker E2E — search returns results, chapters ascend from Ch. 1,
pages return CDN URLs, img action returns 200 image bytes; app builds; worker typechecks.

## Result

**Built as planned.** Worker deployed (version `138cb9c0`). Live E2E against the deployed
Worker:

- `search q=naruto` → 11 results, proxied cover URLs
- `chapters id=3069/naruto` → 701 chapters, title "Naruto", ascending (Ch. 1 first, 700.5 last)
- `pages id=<ch 700.5 URL>` → 51 pages
- `img` → 200, `image/jpeg`, 243 910 bytes

App `npm run build` clean; `worker npx tsc --noEmit` clean; all 16 `*.selfcheck.ts` pass.

**Deviations:**
- Kept the `probe` diagnostic action (host-allowlisted) — it's what proved the challenge was
  Worker-side and will shortcut the next source death.
- Old Kakalot ids stored in library/progress will fail gracefully (empty chapter list) —
  no migration; the fallback source re-resolves by title search anyway.

**Known gaps carried forward:**
- Mangapill has no publish dates on series pages → `publishAt` is always `''` (UI shows title only).
- Legacy `site=kakalot` wire key / `'kakalot'` source value now mean "fallback source
  (Mangapill)" — renaming would touch stored data for zero user value.
