# Phase 6 — Reliability, First-run, Hardening (v1 ship)

**SDLC ref:** SDLC.md Phase 6 · **Status:** PLANNED · **Started:** 2026-09-16

## Goal
It never feels broken. Onboarding, full error/offline states everywhere, error logging, PWA install polish, and a performance pass. This is the v1 ship gate.

## Scope (FR)
FR-35 (onboarding), FR-36 (error/offline states), FR-37 (error logging), all NFRs (perf budgets, PWA install).

## Exit criteria
All P0/P1 FRs pass their AC; PRD SC1–SC6 verified as far as headless allows; a device-checklist documents what needs the owner's Android. Build + all self-checks green.

## Tasks
### Batch A — reliability
- **T1** `ErrorBoundary` + typed error/offline UI states (offline banner, MD-unreachable, not-downloaded, image-failed retry). `useOnline` hook.
- **T2** Error logging: Crashlytics-style reporter (Firebase if enabled, else console/local ring buffer). Wrap boundary + key failures.
- **T3** Per-image retry component (used by both renderers).

### Batch B — first-run + PWA
- **T4** 3-slide onboarding (reading modes, bubble zoom, offline) → Popular; skippable; shown once (settings flag). Self-check: onboarding-seen gate.
- **T5** PWA manifest icons + install polish; verify manifest/SW output.

### Batch C — hardening + ship gate
- **T6** Perf: confirm lazy-loads (pdf.js/firebase out of main chunk), bundle report; cover-art rendering; data-saver reader toggle.
- **T7** `docs/DEVICE-CHECKLIST.md` — what the owner must verify on real Android (install, offline airplane-mode, curl 60fps, volume-key turn, push).
- **T8** Verify build + all self-checks; mark v1.

## RESULTS

### Phase 6 — COMPLETE ✅ (2026-09-16) — v1 SHIP GATE
**Built:**
- `reliability/`: `errorReporter` (ring buffer + Firebase hook), `useOnline`, `ErrorBoundary` (wraps App in main.tsx), `OfflineBanner` (in App), `PageImage` retry + inline silent-retry in `ZoomableImage` (FR-36 per-image recovery).
- `onboarding/`: pure seen-gate + `OnboardingScreen` (3 slides, skippable, shown once via settings flag), gated in App.
- PWA: `public/icon.svg` (読 mark) wired into manifest (installable).
- Perf: **manualChunks split firebase into its own chunk → main bundle 940KB→386KB**; pdf.js + jszip already lazy. NFR small-footprint satisfied.
- `docs/DEVICE-CHECKLIST.md` for the owner's on-device verification.
**Verification:** onboarding self-check green; **all 14 project self-checks green**; build clean; manifest + SW generated; bundle report confirms firebase/pdf/jszip are separate lazy chunks.
**Deviations:** icons are a single SVG (installable everywhere; rasterized PNGs only if a launcher demands — noted in checklist). Error logging forwards to console + local ring; live Crashlytics wiring is a one-liner when Firebase analytics is added.
**Gaps carried to device (DEVICE-CHECKLIST.md):** real install, airplane-mode offline, 60fps curl, volume-key turn, live push — all need the owner's Android.

## v1 STATUS
Phases 0–6 complete. All P0/P1 FRs implemented + headless-verified (self-checks + live proxy E2E). PRD SC1–SC6 covered in code; SC1–SC3/SC6 final confirmation is on-device (checklist). Ready for owner device pass + Vercel deploy.
