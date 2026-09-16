# CLAUDE.md — Yomu

Project context for AI-assisted development. Read this first.

## What Yomu is

A **personal-use** manga/manhwa/manhua reader, built as an installable **PWA** for Android. Reads from MangaDex, supports local files (CBZ/PDF/images), works offline, and syncs across the owner's devices via Google login. It is **not** distributed publicly or published to app stores — it is a private client for one user.

Named "Yomu" (Japanese: 読む, "to read").

## CURRENT STATE (2026-09-16) — read this to resume

**Status:** All 7 phases (0–7) built, verified headlessly (15 self-checks + live proxy E2E), merged to `main`. v1 = phases 0–6; v2 experimental behind flags = phase 7.

**Live URLs:**
- App (Vercel): **https://yomu-reader.vercel.app** (clean alias)
- Image proxy (Cloudflare Worker, LIVE): `https://yomu-image-proxy.subramanya-bellary.workers.dev`
- GitHub: https://github.com/subramanyaSgb/yomu-reader (private)

**Accounts:** GitHub `subramanyaSgb`; Cloudflare `subramanya.bellary@deeviasoftware.com` (worker deployed, workers.dev subdomain `subramanya-bellary`, Production+Preview routes ON); Vercel `subramanyasgb` (project `yomu-reader`, GitHub-connected).

**Env vars (Vercel Production+Preview):** `VITE_IMAGE_PROXY` = the worker URL. Firebase vars NOT set (app runs local-only until owner does docs/FIREBASE-SETUP.md).

### KNOWN GOTCHAS (do not re-learn the hard way)
1. **MangaDex CORS preflight = 403.** Never send custom headers (User-Agent, Accept) on browser fetches to `api.mangadex.org` — any custom header forces an OPTIONS preflight that MangaDex's anti-abuse layer 403s, silently blocking ALL calls → empty search/home. Bare `fetch(url)` (simple request) works. Fixed in `src/lib/mangadex/client.ts` (commit 601d378). The rate limiter is our good-citizen mechanism instead.
2. **Vercel deploys from GitHub automatically.** The repo is Git-connected → every push to `main` auto-deploys production. Do NOT run `vercel deploy` via CLI to ship a code change — just `git push origin main`. CLI deploys during this session landed in `UNKNOWN`/stuck state and wasted time; Git-push is the reliable path. `vercel.json` pins buildCommand=`npm run build`, outputDirectory=`dist`, framework=`vite`.
3. **15-min image URLs / cache bytes not URLs** — see MangaDex constraints below.
4. **tsx self-checks:** `import.meta.env` is undefined under tsx — always guard with `?? {}` (see flags.ts, imageUrl.ts, upscale.ts) or the module throws at import.
5. **Windows line endings:** git shows CRLF warnings on commit — harmless.

### PENDING (owner actions, documented — can't be done headlessly)
- **Verify latest Vercel deploy succeeded** (the CORS fix). If deploys show Error, check dashboard build logs → likely Node version or subdir (worker/functions) build interference.
- Device pass: `docs/DEVICE-CHECKLIST.md` (install, offline, curl 60fps, gestures).
- Optional sync/push: `docs/FIREBASE-SETUP.md`.
- Optional v2: supply ONNX bubble/upscale model URLs + flip `VITE_FEAT_*` flags.

### NEW WORK REQUESTED (not yet started)
- **Pixel-perfect UI reskin** per `Yomu manga reader app UI/design_handoff_yomu_reader/PROMPT.md` + its `README.md` (authoritative spec) + interactive prototype `design/Yomu App v2.dc.html`. Implement 1:1: 3 themes as CSS vars, Outfit font, Lucide icons, 390px mobile, exact tokens/motion. Do NOT port `design/support.js`. Start by proposing component/route breakdown + token file, wait for OK, then build screen-by-screen. This is a reskin of the already-built feature layer — map new UI onto existing hooks/logic (reader engine, offline, sync, stats all done).

## HARD RULE — Document every phase (non-negotiable)

Development MUST be fully, professionally documented. This is a hard rule, not a preference.

- **Before starting any phase/task:** write a phase plan to `docs/phases/PHASE-<n>-<name>.md` — goal, scope (FR IDs), approach, files to touch, exit criteria.
- **After completing it:** append the result to the same file — what was built, what deviated from plan and why, test/verification evidence, and known gaps carried forward.
- **Nothing ships undocumented.** No phase is "done" until its plan + result are written. If a decision changes mid-phase, record it there.
- Keep it traceable: link back to the FR IDs (FRD), TDD sections, and SDLC phase.

## Guiding principles

1. **Personal-use tool.** No public distribution. Documented honestly as such. Where a series is officially licensed, we surface "support official release" links.
2. **Be a polite API citizen.** MangaDex turned on anti-scraper enforcement in 2026. Aggressive caching, throttle well under 5 req/s, back off on HTTP 429, identify the client. This is a *survival* requirement, not an optimization — sloppy behavior gets the IP banned and the app dies.
3. **Local-first.** IndexedDB (via Dexie) is the source of truth on each device. The cloud (Firestore) is a sync layer on top, not the primary store. The app must be fully usable offline.
4. **Graceful degradation everywhere.** Every "premium" feature (3D page curl, bubble auto-zoom, image upscaling) has a reliable fallback and never appears broken.
5. **Lazy but not careless.** Reuse before building. Native/stdlib before dependencies. Shortest working diff — but only after understanding the flow.

## Architecture at a glance

| Concern | Choice | Why |
|---|---|---|
| App shell | React + TypeScript + Tailwind + Vite | Best PWA + Vercel combo; TS prevents whole bug classes |
| PWA/offline | `vite-plugin-pwa` (Workbox) | Installable, service-worker caching |
| Hosting (app) | **Vercel** | Great DX for the static app + light API routes |
| **Image proxy** | **Cloudflare Worker** | **Free unlimited egress** — mandatory because MangaDex image servers are CORS-locked to MD domains + localhost |
| Auth / Sync / Push / Errors | **Firebase** (Auth + Firestore + FCM + Crashlytics + a timed Cloud Function) | Native Google login; single ecosystem |
| Content source | MangaDex API (v1); Comick (v2, tentative) | Free official API, rich metadata, English filter |
| Local DB | Dexie.js over IndexedDB | Source of truth, offline |
| Server cache | TanStack Query | Required caching to respect rate limits |
| UI state | Zustand | Lightweight |
| Local files | jszip (CBZ), pdf.js (PDF, lazy-loaded) | Full local-file reading |

### The three deployment targets and why they're split
- **Vercel** hosts the app (static + light API). Free tier is 100 GB/mo bandwidth — fine for the *app*, NOT for image proxying.
- **Cloudflare Worker** proxies every chapter image. Egress is structurally free on Cloudflare, so image-heavy reading doesn't blow a bandwidth cap. Handles CORS, refreshes MangaDex's 15-minute image URLs, and does data-saver compression.
- **Firebase** does everything stateful: Google Auth, Firestore sync, FCM push, Crashlytics error reporting, and one timed Cloud Function that polls followed series for new chapters.

## The critical MangaDex constraints (do not forget these)

1. **Image CORS lock.** The `@Home` image URLs only work from MangaDex-owned domains + `localhost`. Our PWA **cannot** fetch chapter images directly — every image MUST route through the Cloudflare Worker proxy.
2. **15-minute image URLs.** The `GET /at-home/server/{chapterId}` base URL is only guaranteed valid for 15 minutes. **Cache image *bytes*, never image *URLs*.** Re-request fresh URLs per session.
3. **Rate limit ~5 req/s per IP**, enforced at the load balancer with HTTP 429. Cache hard; batch requests; back off.
4. **Auth is OAuth2; public clients not yet available.** Browse **unauthenticated** wherever possible (authenticated requests can't be cached). Use a personal API client only if strictly required.
5. **Language is per-chapter, not per-series.** English filtering happens at the chapter level.

## Key product decisions (the "why" behind features)

- **Provider fallback is at the *chapter-version* level, not the provider level** (mirrors comix.to). A series aggregates every version of every chapter across sources/scanlation groups; the app auto-selects the best version per chapter using a "prefer one group" preference with gap-filling by likes/coverage. An in-reader "switch version" button gives manual override.
- **English-only hides non-English chapters entirely.** Consequence: visible gaps in chapter numbering, and series with zero English chapters don't appear. This is accepted.
- **Bubble zoom replicates Google Books' real architecture** (detect-once-per-chapter → cache coordinates → replay), done on-device with an ONNX model. v1 ships flawless tap-to-zoom-at-point; v2 layers ML bubble-snap with silent fallback.
- **Two-tier storage:** read-cache is *temporary* (auto-evicted when space is low); explicit downloads are *permanent* (protected via `navigator.storage.persist()`).
- **Resume is two-level:** series-level (last chapter) + within-chapter exact position (page index for paged; image-anchor + offset for vertical scroll, so it survives re-loading).
- **Sync scope:** library/follows, reading progress, bookmarks/history, settings. Download *images* stay per-device; the download *list* syncs and auto-refetches over **wifi only**.
- **Notifications:** one timed Firebase Cloud Function polls followed series flagged "notify me", sends **batched** FCM digests.

## Versioning

- **v1:** MangaDex only (English-only, group-preference), full reader (3 modes, WebGL curl + fallback, tap-zoom), offline (2-tier), local files (CBZ/PDF/images), Firebase login+sync, notifications, full library/discovery, stats, comfort features, error handling + Crashlytics.
- **v2 (tentative/experimental):** Comick as second source (fuzzy match + manual link), ML bubble auto-detection, ML image upscaling.

## Code conventions

- TypeScript strict mode.
- Feature-folder structure (`src/features/reader`, `src/features/library`, ...).
- Server data through TanStack Query hooks; never fetch MangaDex ad hoc (breaks caching/rate-limit discipline).
- All MangaDex image URLs go through the proxy helper — never construct a direct image URL in a component.
- Every non-trivial module leaves one runnable check behind (assert-based self-check or a small `*.test.ts`).

## Docs

- `docs/PRD.md` — product requirements (what & why)
- `docs/FRD.md` — functional requirements (feature behavior, per-feature)
- `docs/TDD.md` — technical design (how it's built)
- `docs/SDLC.md` — phased build roadmap
