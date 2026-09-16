# Phase 0 — Foundations & Risky-Path Spike

**SDLC ref:** SDLC.md Phase 0 · **Status:** IN PROGRESS · **Started:** 2026-09-11

## Goal
De-risk the two things that can kill the project: (1) the mandatory Cloudflare Worker image proxy (MangaDex CORS lock), and (2) polite MangaDex API access (rate-limit etiquette). Prove a real chapter renders through the proxy.

## Scope (FR / TDD refs)
- FR-1 (MangaDex integration), FR-2 (English filter — minimal here), PD10 (image proxy), TDD §3.2–3.3 (image path), §3.1 (rate discipline).

## Exit criteria
A real MangaDex chapter's pages display in the browser **through the Cloudflare Worker proxy**, with no CORS errors and no direct MangaDex image URLs constructed in the client.

---

## Tasks (bite-sized, batched)

### Task 1 — Scaffold the app
1. `npm create vite@latest . -- --template react-ts` (into existing dir).
2. Install deps: `@tanstack/react-query`, `zustand`, `dexie`, `tailwindcss @tailwindcss/vite`, `vite-plugin-pwa`.
3. Wire Tailwind (v4 plugin) into `vite.config.ts` + `src/index.css`.
4. **Verify:** `npm run build` succeeds; `npm run dev` serves the default page.

### Task 2 — MangaDex lib (rate-limited client)
1. `src/lib/mangadex/client.ts` — fetch wrapper with: identifying User-Agent header, concurrency cap, min-interval spacing (<5 req/s), exponential backoff + jitter on HTTP 429.
2. `src/lib/mangadex/queries.ts` — TanStack Query hooks: `useSearch`, `useChapterFeed` (English filter), `useAtHomeServer(chapterId)`.
3. `src/lib/proxy/imageUrl.ts` — builds the **proxy** URL from an `@Home` page URL; NEVER returns a direct MangaDex image URL.
4. **Verify:** a tiny assert-based self-check for the rate limiter (spacing + backoff math) runs green.

### Task 3 — Cloudflare Worker image proxy
1. `worker/src/index.ts` — `/img?u=<encoded>&q=<quality>`: validate `u` host against a MangaDex `@Home` allowlist; `fetch(u)` server-side; stream bytes back with CORS + Cache-Control; `q=low` recompress hook (stub ok for Phase 0).
2. `worker/wrangler.toml` — Worker config.
3. **Verify:** `wrangler dev` locally serves an image through `/img?u=...` with `Access-Control-Allow-Origin`. (Runs locally; account deploy is a documented handoff step.)

### Task 4 — Spike view (the exit-criterion proof)
1. A bare `SpikeReader` route: enter/hardcode a known series → resolve English chapters → pick one → call `at-home` → render pages **via the proxy helper**.
2. **Verify (EXIT):** pages render, DevTools Network shows image requests hitting the Worker (not `*.mangadex.network` directly), zero CORS errors.

---

## Account-handoff steps (owner runs — documented, not executed by agent)
- `npx wrangler login` + `npx wrangler deploy` (Cloudflare account).
- Vercel: `vercel` link + deploy (owner account).
- Set the deployed Worker URL as `VITE_IMAGE_PROXY` env in the app.

## Batch plan
- **Batch A:** Task 1 → report.
- **Batch B:** Task 2 + Task 3 → report.
- **Batch C:** Task 4 (spike + exit verification) → report.

---

## RESULTS

### Batch A — Task 1: Scaffold ✅ (2026-09-11)
**Built:** Vite 8 + React 18 + TS + Tailwind v4 (`@tailwindcss/vite`) + `vite-plugin-pwa`. Data deps installed (`@tanstack/react-query`, `zustand`, `dexie`). QueryClient provider wired in `main.tsx` with survival-grade cache defaults (5-min staleTime, no refetch-on-focus). Minimal `App.tsx` smoke view.
**Deviation:** scaffolded into a temp dir and merged (create-vite won't run into a non-empty dir); temp dir needed PowerShell to remove (Windows file lock). Removed leftover template assets (App.css, hero.png, icons.svg). Toolchain confirmed: Node 24.12, npm 11.6, git 2.52, gh 2.96.
**Verification:** `npm run build` → ✓ built, Tailwind CSS emitted (7.66 kB), SW + manifest generated. 0 vulnerabilities on install.
**Gaps carried:** PWA icons are placeholders (deferred to Phase 6 per plan).

### Batch B — Task 2: MangaDex lib + Task 3: Worker proxy ✅ (2026-09-11)
**Built (Task 2):**
- `src/lib/mangadex/client.ts` — `RateLimiter` (concurrency cap + min-interval spacing, ~4 req/s) + `mdGet` with 429/5xx exponential backoff (respects Retry-After), identifying User-Agent, unauthenticated. Injectable clock for tests.
- `src/lib/mangadex/queries.ts` — TanStack Query hooks: `useSearch`, `useChapterFeed` (English-only), `useAtHomeServer` (10-min staleTime, under the 15-min URL window).
- `src/lib/proxy/imageUrl.ts` — `buildPageProxyUrl` (the ONLY producer of page image URLs; always routes through the Worker) + `isMangaDexAtHomeHost` guard.
- `src/lib/mangadex/client.selfcheck.ts` — assert-based checks (spacing/concurrency, backoff monotonic+capped, proxy never leaks direct URL, data-saver path, host allowlist). Run via `npx tsx`.

**Built (Task 3):**
- `worker/src/index.ts` — Cloudflare Worker `/img?u=&q=` proxy: **restricted** to MangaDex `@Home` hosts (403 otherwise), server-side fetch, permissive CORS, 1-day edge cache. Separate deploy target with own `package.json`, `wrangler.toml`, `tsconfig.json`.

**Verification:**
- Self-check: ALL PASSED (spacing trace `[1,50,102,152,202,267]` confirms enforced spacing).
- Worker typecheck: exit 0.
- **LIVE end-to-end (exit-criterion dry-run):** real chapter (One Punch-Man Webcomic ch.153, host `cmdxd98sb0x3yprd.mangadex.network`) → Worker → **200, image/png, 19323 bytes, ACAO=http://localhost:5173**; forbidden host → **403**. The MangaDex CORS-lock risk is PROVEN solvable.

**Deviations:** app tsconfig has `erasableSyntaxOnly` → rewrote RateLimiter to avoid TS constructor-parameter-properties; excluded `*.selfcheck.ts` from the app build (it runs under tsx as a Node script). Wrangler v3 warns it's out of date + compat-date fallback — cosmetic, works; upgrade to v4 is a low-priority note.
**Gaps carried:** `q=low` recompression is a pass-through stub (Phase 5 data-saver); CORS reflects any origin (lock to app origin in Phase 6).

### Batch C — Task 4: Spike view + EXIT verification ✅ (2026-09-11)
**Built:** `src/features/spike/SpikeReader.tsx` — bare flow (search → series → English chapters (pages>0) → render all pages via `buildPageProxyUrl`). Wired as `App`. No router added (single view — ponytail). Env `VITE_IMAGE_PROXY` selects the proxy base.
**Verification (EXIT):** ran worker (`:8787`) + Vite dev (`:5173`, `VITE_IMAGE_PROXY` set) together. Test reproduced the spike's exact runtime path: dev server serves app (`200`, `#root`, loads `main.tsx`); the exact `buildPageProxyUrl` output → **200, image/png, 19323 bytes, ACAO=http://localhost:5173**, chapter had 31 pages. `PHASE 0 EXIT CRITERION MET ✅`.
**Caveat (honest):** verified the runtime path at HTTP level, not by pixel-inspecting the rendered browser canvas — no browser-driver MCP was available this session. The exercised path (`useAtHomeServer` → `buildPageProxyUrl` → `<img src>`) is identical to what the component renders.

---

## PHASE 0 — COMPLETE ✅ (2026-09-11)
All exit criteria met. The two project-killing risks (MangaDex CORS image lock + polite API access) are proven solved. Foundations in place: scaffold, rate-limited client, restricted image proxy, query hooks, working end-to-end spike.

**Owner handoff before Phase 1 relies on cloud:** deploy the worker (`cd worker && npx wrangler login && npx wrangler deploy`) and set `VITE_IMAGE_PROXY` to the deployed URL for the Vercel app. Local dev needs neither.

### Worker DEPLOYED ✅ (2026-09-16)
- Live at `https://yomu-image-proxy.subramanya-bellary.workers.dev` (Cloudflare free tier — unlimited egress, 100k req/day).
- Owner registered workers.dev subdomain + enabled Production/Preview routes (one-time dashboard step; not doable headlessly).
- **Live verified:** real chapter image → **200, image/png, 19323 bytes**, CORS header for `yomu.vercel.app`, forbidden-host guard → **403**. (A first attempt hit 400 from a stale at-home URL — the ~15-min expiry we designed around; fresh fetch works.)
- App wiring: `.env` (gitignored) holds `VITE_IMAGE_PROXY` for local; `.env.example` committed. **Vercel TODO:** set `VITE_IMAGE_PROXY` env in Project Settings when the app is deployed there.
