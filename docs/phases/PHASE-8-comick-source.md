# PHASE 8 — Comick as a discovery source

**SDLC phase:** v2 experimental (source expansion). Relates to FRD "provider fallback at the chapter-version level" and the v2 "Comick as second source" plan in CLAUDE.md.

## Goal

Add Comick (comick.dev) as a manga source. The original request was to use **comix.to** as the main source; that proved infeasible (see Investigation), and Comick was selected as the best practical alternative for English coverage.

## Investigation — why not comix.to

comix.to was requested as the primary source. It was ruled out after direct testing:

- Its API (`/api/v1/manga/{hid}`, `.../chapters`) returns `{"message":"Missing token."}` (HTTP 403) to any unsigned request.
- Passing requires: scrape a per-page `cfg` token from `<meta name="cfg">`, run comix's obfuscated `secure-*.js` **in a browser** to compute a `_` signature query param, then run the same script's response interceptor to **decrypt** the (encrypted) response.
- The `secure-*.js` is a **fully virtualized VM obfuscator** (custom bytecode interpreter + encrypted string pool) with browser-only anti-tampering self-checks (patches `Object.prototype`, verifies `globalThis` identity, `throw ""` on failure). It cannot be run in a Node `vm`/`new Function` sandbox — both probe harnesses crashed in the dispatcher before exposing any signing function.
- The reference implementation (`yurtzy/comix-api`) is already stale against live comix (its expected exports `to`/`Qa` no longer exist; current build exports mangled names).
- The public aggregator (`comick-source-api.notaspider.dev`) also returns 403 for comix.
- Verdict: comix requires a persistent headless-browser host (won't run on Vercel functions or the Cloudflare Worker) and breaks on every comix build. Rejected.

Alternatives benchmarked: MangaDex (current), Kakalot (current), Comick, MangaPark/Bato (GraphQL + JS anti-bot interstitial). **Comick won**: clean token-free JSON API, best English coverage (aggregates many scanlation groups), Worker-compatible.

## Key constraint discovered

Comick's public API exposes **metadata only** — search, comic detail, chapter lists, and covers are open, but **page-image keys (`b2key`) are NOT returned** by `/chapter/{hid}` regardless of User-Agent (`?tachiyomi=true` included). Page images are gated.

**Decision (user-confirmed):** use Comick for **discovery + chapter listings**; reading resolves through the already-working **Kakalot** pipeline (match by title). No image scraping of comick.dev.

## API shapes (verified live against api.comick.dev)

- `GET /comick/v1.0/search?q=&limit=24&t=false` → `ComickSearchItem[]` (`hid`, `slug`, `title`, `md_covers[0].b2key`, `rating`, `status`).
- `GET /comick/v1.0/search?type=comic&sort=follow&limit=24` → discovery lists.
- `GET /comick/comic/{slug|hid}/` → `{ comic: ComickComic }` (`desc`, `md_comic_md_genres[].md_genres.name`, `md_covers`, `status`, `bayesian_rating`).
- `GET /comick/comic/{hid}/chapters?lang=en&limit=60&page=` → `{ chapters: ComickChapter[], total }`.
- Covers: `https://meo.comick.pictures/{b2key}` — serves `Access-Control-Allow-Origin: *`, loaded **directly** (no proxy).

Status codes: `1 ongoing, 2 completed, 3 cancelled, 4 hiatus`.

## Files touched

- `worker/src/index.ts` — added `COMICK_API` const + `/comick/*` pass-through proxy route (api.comick.dev is CORS-locked from the browser). Cache 300s. Mirrors the `/api` MangaDex proxy.
- `src/lib/comick/client.ts` — typed client (search, top, comic, chapters) + `comickCoverUrl`/`comickCoverFrom`. Routes through Worker `/comick`; covers direct.
- `src/lib/comick/queries.ts` — TanStack Query hooks.
- `src/lib/comick/client.selfcheck.ts` — assert-based check for cover URL builders.
- `src/App.tsx` — `SeriesSource` now includes `'comick'`.
- `src/features/discovery/SearchScreen.tsx` — added Comick results section (2-col grid, rating badge, Comick badge). Opens `onOpen(slug, 'comick')`.
- `src/features/discovery/SeriesDetail.tsx` — source-aware: renders Comick metadata (title/cover/synopsis/genres/status/rating) + Comick chapter list; auto-runs a Kakalot title match so the CTA / chapter taps open the readable Kakalot series. CTA disabled with "No readable source found" when no Kakalot match.

## Exit criteria

- [x] Worker `/comick/*` compiles (`tsc --noEmit` clean) and proxies api.comick.dev.
- [x] App builds clean (`tsc -b && vite build`).
- [x] Comick client self-check passes.
- [x] Search shows a Comick section; tapping opens SeriesDetail in comick mode.
- [x] SeriesDetail (comick) shows metadata + chapters and a Kakalot-backed read CTA.

## Known gaps carried forward

- Reading a Comick series depends on a **Kakalot title match**; if Kakalot has no match, the CTA shows "No readable source found" (graceful, but that series isn't readable).
- Comick chapters read as the whole Kakalot series (no chapter-to-chapter mapping between providers) — reader resumes at the Kakalot series' remembered position.
- Comick is **not** yet added to the Home rails; only Search + SeriesDetail. Add `useComickTop` rails later if desired.
- Original ask was comix.to *primary*; delivered Comick as an *additional discovery source* alongside MangaDex/Kakalot (fallback preserved), which the user approved after the comix feasibility finding.
