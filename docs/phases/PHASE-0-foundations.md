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
