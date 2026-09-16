# SDLC & Build Roadmap — Yomu

**Version:** 1.0
**Date:** 2026-09-11

Phased plan from empty repo to shipped v1, then v2. Each phase has a goal, scope (FR IDs from FRD), and a demo-able exit criterion. Build order is dependency-driven: prove the risky/foundational pieces early.

---

## Phase 0 — Foundations & spike the risky path ✅ COMPLETE (2026-09-11)

**Goal:** de-risk the two things that can kill the project: the image proxy and MangaDex etiquette.

> Done. See `docs/phases/PHASE-0-foundations.md` for plan + results. Exit criterion met: real chapter image rendered through the Cloudflare Worker proxy, no CORS errors.

- Scaffold: Vite + React + TS + Tailwind + `vite-plugin-pwa`. Deploy empty shell to Vercel.
- Build the **Cloudflare Worker image proxy** (host allowlist, CORS, streaming). Deploy.
- MangaDex `lib`: TanStack Query setup, rate limiter (concurrency cap + 429 backoff), identifying User-Agent.
- **Spike:** fetch a real chapter's `@Home` URLs → proxy → render pages in a bare view.

**Exit:** a real MangaDex chapter's pages display in the browser through the Worker proxy, with no CORS errors and no direct image URLs in the client. (Validates PD10, FR-1, §3.2.)

---

## Phase 1 — Core reader (online, happy path) ✅ COMPLETE (2026-09-16)

**Goal:** read online, all three modes, well.

> Done. See `docs/phases/PHASE-1-core-reader.md`. Reader engine (scroll + paged/curl), version resolver + switch, zoom, per-series memory; 7 self-checks + live E2E green.
Scope: FR-6, FR-7, FR-8, FR-9, FR-11, FR-2, FR-3.

- Dexie schema + repositories.
- Version resolver (English-only, prefer-one-group, gap-fill) + in-reader switch.
- VerticalScrollRenderer with seamless chapter transition.
- PagedRenderer with WebGL curl + **CSS-slide fallback + capability check**.
- ZoomController (tap-point, pinch, pan, double-tap levels).
- Reader controls + per-series ReaderMemory.
- Preloader (progressive current + background next).

**Exit:** read a manhwa (seamless scroll) and a manga (RTL curl, or fallback on weak devices) end-to-end from MangaDex, English-only, with version switching.

---

## Phase 2 — Offline & storage ✅ COMPLETE (2026-09-16)

**Goal:** reliable offline reading.
Scope: FR-14, FR-15, FR-16, FR-17, FR-18.

- Byte caching in Dexie keyed by `chapterId:pageIndex`; two-tier (cache/download).
- Download scopes: single / range / series / auto-keep-next-N.
- `navigator.storage.persist()`; LRU eviction over read-cache only.
- Storage management screen.
- Wifi-only guard.
- Exact-position resume (paged index + vertical image-anchor), saved throttled + on background.

**Exit:** download a series, go offline (airplane mode), read it, reopen the app → resume the exact page. Fill storage → read-cache evicts, downloads survive.

---

## Phase 3 — Discovery, library, local files

**Goal:** find, organize, and read own files.
Scope: FR-5, FR-21, FR-22, FR-23, FR-24.

- Home rows (Continue Reading, Popular, Latest, Recommended-by-genre).
- Search (instant + filters + within-library + recent/saved).
- Library shelves + collections + auto-sort + unread badges.
- Duplicate detection.
- Local file import (CBZ/images now; PDF via lazy pdf.js) wired into the reader engine.

**Exit:** search → add to library → organize into shelves/collections; open a local CBZ and a PDF in the reader.

---

## Phase 4 — Auth, sync, notifications ✅ COMPLETE (2026-09-16)

**Goal:** cross-device continuity + new-chapter alerts.
Scope: FR-19, FR-20, FR-29, FR-30.

- Firebase Auth (Google, skippable) + Firestore sync engine (local-first, LWW, offline queue).
- Download-list sync + wifi-guarded refetch on second device.
- Firebase Cloud Function chapter poller → FCM batched digest.
- Local notifications (download-complete, goal/streak).

**Exit:** log in on two devices → progress/library/settings sync; a new chapter on a "notify me" series produces a batched push.

---

## Phase 5 — Stats, comfort, goals, polish ✅ COMPLETE (2026-09-16)

**Goal:** the "premium daily-use" layer.
Scope: FR-12, FR-13, FR-25, FR-26, FR-27, FR-28, FR-31, FR-32, FR-33, FR-34.

- Stats (chapters, streak, time, genres) + charts.
- Reading goals + streak protection.
- Unread feed; export/backup.
- Auto-scroll; data-saver + CSS/canvas sharpening.
- Themes (Dark/Light/Sepia), night warmth schedule, wake lock, immersive + orientation lock.

**Exit:** all comfort/stats features work; export → re-import restores state.

---

## Phase 6 — Reliability, first-run, hardening (v1 ship) ✅ COMPLETE (2026-09-16)

**Goal:** it never feels broken.
Scope: FR-35, FR-36, FR-37, all NFRs.

- 3-slide onboarding → Popular; skippable login.
- Full error/offline states (offline banner, not-downloaded, per-image retry, MD-unreachable).
- Crashlytics-style error logging.
- Performance pass to budgets (60fps reader, lazy-loads, cache-hit ratio, no sustained 429s).
- PWA install/manifest/icons; verify Android home-screen install + offline launch.

**Exit (v1 ship):** all P0/P1 FRs pass their AC; PRD success criteria SC1–SC6 verified on the owner's Android device.

---

## Phase 7 — v2 (experimental / additive)

**Goal:** the ambitious extras, layered without regressing v1.
Scope: FR-4, FR-10, ML upscaling.

- Comick as second source (fuzzy match + manual link; graceful absence). *Tentative — validate Comick availability first.*
- ML bubble auto-detection (onnxruntime-web): detect-once-per-chapter → cache → sequential snap; silent fallback to tap-zoom.
- ML image upscaling (experimental, opt-in).

**Exit:** each v2 feature is toggleable and never degrades the v1 experience when off or when it fails.

---

## Cross-cutting practices

- **Testing:** each non-trivial module leaves one runnable check (version resolver, rate limiter, eviction LRU, resume anchor math, sync merge/LWW are the priority targets).
- **Deploys:** app → Vercel; worker → Cloudflare; functions → Firebase. Keep the three deploy configs in-repo (`/`, `/worker`, `/functions`).
- **Etiquette gate:** before each ship, confirm cache-hit ratio is high and there are no sustained 429s in logs (survival requirement).
- **Definition of done per FR:** acceptance criteria met + one check + wired into the relevant screen's error/offline states.
```
