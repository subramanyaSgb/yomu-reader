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
_(appended per hard rule)_
